import { NextRequest } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function GET(request: NextRequest) {
  // Set up Server-Sent Events
  const responseStream = new TransformStream()
  const writer = responseStream.writable.getWriter()
  const encoder = new TextEncoder()

  // Function to send SSE event
  const sendEvent = (event: string, data: any) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    writer.write(encoder.encode(message))
  }

  // Start Python monitoring process and stream its output
  const pythonPath = path.join(process.cwd(), '..', 'agentic-ai')
  
  try {
    // Start the test_continuous_monitoring.py process with virtual environment
    const monitoringProcess = spawn('bash', ['-c', 'source venv/bin/activate && python test_continuous_monitoring.py'], {
      cwd: pythonPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    })

    // Send initial connection event
    sendEvent('connected', { 
      message: 'Connected to test continuous monitoring stream',
      timestamp: new Date().toISOString()
    })

    // Stream all stdout output directly (test_continuous_monitoring.py output)
    monitoringProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      const lines = output.split('\n').filter(line => line.trim())
      
      lines.forEach(line => {
        // Send all output as raw messages to show exactly what terminal shows
        sendEvent('raw', {
          message: line,
          timestamp: new Date().toISOString(),
          level: 'info'
        })
      })
    })

    // Parse and stream stderr
    monitoringProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString()
      const lines = output.split('\n').filter(line => line.trim())
      
      lines.forEach(line => {
        sendEvent('error', {
          message: line,
          timestamp: new Date().toISOString(),
          level: 'error'
        })
      })
    })

    // Handle process events
    monitoringProcess.on('exit', (code) => {
      sendEvent('process_exit', {
        code,
        message: `Monitoring process exited with code ${code}`,
        timestamp: new Date().toISOString()
      })
      writer.close()
    })

    monitoringProcess.on('error', (error) => {
      sendEvent('error', {
        message: error.message,
        timestamp: new Date().toISOString(),
        level: 'error'
      })
    })

    // Cleanup on client disconnect
    request.signal.addEventListener('abort', () => {
      monitoringProcess.kill('SIGTERM')
      writer.close()
    })

  } catch (error) {
    sendEvent('error', {
      message: `Failed to start monitoring: ${error}`,
      timestamp: new Date().toISOString(),
      level: 'error'
    })
    writer.close()
  }

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

function parseAgentLog(line: string) {
  try {
    // Parse different types of agent logs
    const timestamp = new Date().toISOString()
    
    // Supervisor agent patterns
    if (line.includes('Supervisor diagnosis:')) {
      const statusMatch = line.match(/(UP|DOWN)/)
      const confidenceMatch = line.match(/confidence: ([\d.]+)/)
      
      return {
        agent: 'supervisor',
        type: 'diagnosis',
        message: line,
        status: statusMatch?.[1] || 'UNKNOWN',
        confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0,
        timestamp,
        level: 'info'
      }
    }
    
    // Executor agent patterns
    if (line.includes('Executor:') || line.includes('PM2') || line.includes('restart')) {
      return {
        agent: 'executor',
        type: 'repair',
        message: line,
        timestamp,
        level: line.includes('success') ? 'success' : 'info'
      }
    }
    
    // Evaluator agent patterns
    if (line.includes('Evaluator:') || line.includes('Flashcard written')) {
      return {
        agent: 'evaluator',
        type: 'evaluation',
        message: line,
        timestamp,
        level: 'success'
      }
    }
    
    // Workflow status
    if (line.includes('Starting monitoring cycle') || 
        line.includes('MONITORING CYCLE SUMMARY') ||
        line.includes('Server is DOWN') ||
        line.includes('Server appears to be UP')) {
      return {
        agent: 'system',
        type: 'workflow',
        message: line,
        timestamp,
        level: line.includes('DOWN') ? 'warn' : 'info'
      }
    }
    
    // LLM diagnostics
    if (line.includes('LLM diagnosis:')) {
      return {
        agent: 'supervisor',
        type: 'llm_diagnosis',
        message: line,
        timestamp,
        level: 'info'
      }
    }
    
    // Error patterns
    if (line.includes('ERROR') || line.includes('Failed')) {
      return {
        agent: 'system',
        type: 'error',
        message: line,
        timestamp,
        level: 'error'
      }
    }
    
    // General log entry
    if (line.trim()) {
      return {
        agent: 'system',
        type: 'general',
        message: line,
        timestamp,
        level: 'info'
      }
    }
    
  } catch (error) {
    return {
      agent: 'system',
      type: 'parse_error',
      message: `Failed to parse log: ${line}`,
      timestamp: new Date().toISOString(),
      level: 'error'
    }
  }
  
  return null
}