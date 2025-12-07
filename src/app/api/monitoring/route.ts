import { NextRequest, NextResponse } from 'next/server'
import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { readFile, stat, access } from 'fs/promises'

const execAsync = promisify(exec)

// Store monitoring process state
let monitoringProcess: any = null
let isMonitoring = false
let processStartTime: string | null = null

export async function GET() {
  try {
    // Get real backend status
    const pythonPath = path.join(process.cwd(), '..', 'agentic-ai')
    const agentLogPath = path.join(pythonPath, 'agent.log')
    
    let lastLogEntry = null
    let logSize = 0
    
    // Don't read agent.log when running test_continuous_monitoring.py to avoid mixing system logs
    // The real-time streaming handles all the output display
    if (!isMonitoring) {
      try {
        const logStats = await stat(agentLogPath)
        logSize = logStats.size
        
        // Read last few lines for recent activity
        const logContent = await readFile(agentLogPath, 'utf-8')
        const lines = logContent.trim().split('\n')
        if (lines.length > 0) {
          lastLogEntry = lines[lines.length - 1]
        }
      } catch (logError) {
        // Log file doesn't exist or can't be read
      }
    }
    
    const status = {
      isRunning: isMonitoring && monitoringProcess !== null,
      processId: monitoringProcess?.pid || null,
      startTime: processStartTime,
      lastActivity: lastLogEntry,
      logSize: logSize,
      backendPath: pythonPath
    }
    
    return NextResponse.json({
      success: true,
      data: status
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get monitoring status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    switch (action) {
      case 'start':
        return await startMonitoring()
      case 'stop':
        return await stopMonitoring()
      case 'single-check':
        return await triggerSingleCheck()
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Monitoring API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function startMonitoring() {
  if (isMonitoring) {
    return NextResponse.json({
      success: false,
      error: 'Monitoring is already running'
    })
  }

  try {
    const pythonPath = path.join(process.cwd(), '..', 'agentic-ai')
    
    // Start the test_continuous_monitoring.py process with virtual environment
    monitoringProcess = spawn('bash', ['-c', 'source venv/bin/activate && python test_continuous_monitoring.py'], {
      cwd: pythonPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    })
    
    processStartTime = new Date().toISOString()
    monitoringProcess.startTime = processStartTime
    isMonitoring = true
    
    // Log all output to console and optionally to file
    monitoringProcess.stdout?.on('data', (data) => {
      const output = data.toString()
      console.log('Test Output:', output)
    })
    
    monitoringProcess.stderr?.on('data', (data) => {
      const output = data.toString()
      console.error('Test Error:', output)
    })
    
    // Handle process exit
    monitoringProcess.on('exit', (code: number) => {
      console.log(`Test continuous monitoring process exited with code ${code}`)
      isMonitoring = false
      monitoringProcess = null
    })
    
    // Handle errors
    monitoringProcess.on('error', (error: Error) => {
      console.error('Test continuous monitoring process error:', error)
      isMonitoring = false
      monitoringProcess = null
    })
    
    return NextResponse.json({
      success: true,
      message: 'Monitoring started successfully',
      processId: monitoringProcess.pid
    })
    
  } catch (error) {
    console.error('Failed to start monitoring:', error)
    isMonitoring = false
    monitoringProcess = null
    
    return NextResponse.json(
      { success: false, error: 'Failed to start monitoring process' },
      { status: 500 }
    )
  }
}

async function stopMonitoring() {
  if (!isMonitoring || !monitoringProcess) {
    return NextResponse.json({
      success: false,
      error: 'Monitoring is not running'
    })
  }

  try {
    // Kill the monitoring process
    monitoringProcess.kill('SIGTERM')
    
    // Wait a bit for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    if (monitoringProcess && !monitoringProcess.killed) {
      monitoringProcess.kill('SIGKILL')
    }
    
    isMonitoring = false
    monitoringProcess = null
    
    return NextResponse.json({
      success: true,
      message: 'Monitoring stopped successfully'
    })
    
  } catch (error) {
    console.error('Failed to stop monitoring:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to stop monitoring process' },
      { status: 500 }
    )
  }
}

async function triggerSingleCheck() {
  try {
    const pythonPath = path.join(process.cwd(), '..', 'agentic-ai')
    
    // Check for virtual environment
    const venvPath = path.join(pythonPath, 'venv')
    let pythonCmd = 'python3'
    
    try {
      await access(path.join(venvPath, 'bin', 'python'))
      pythonCmd = path.join(venvPath, 'bin', 'python')
    } catch {
      // Use system python
    }
    
    console.log('Triggering single agentic AI check...')
    
    // Run single check with proper Python environment
    const { stdout, stderr } = await execAsync(`"${pythonCmd}" main.py --once`, {
      cwd: pythonPath,
      timeout: 120000, // 2 minute timeout for AI processing
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    })
    
    // Parse the output for structured data
    let parsedResult = null
    const outputLines = stdout.split('\n')
    
    // Look for cycle summary information
    const summaryStart = outputLines.findIndex(line => line.includes('MONITORING CYCLE SUMMARY'))
    if (summaryStart !== -1) {
      const summaryLines = outputLines.slice(summaryStart)
      parsedResult = {
        summaryFound: true,
        summaryLines: summaryLines.slice(0, 10) // First 10 lines of summary
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Single agentic AI check completed successfully',
      output: stdout,
      error: stderr || null,
      parsed: parsedResult,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Single agentic AI check failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Single check failed',
      output: error.stdout || null,
      errorDetails: error.stderr || error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}