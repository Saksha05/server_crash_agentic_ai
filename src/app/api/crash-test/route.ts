import { NextRequest, NextResponse } from 'next/server'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'

// Store active test process
let activeTestProcess: ChildProcess | null = null
let testStartTime: number | null = null

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    if (action === 'start') {
      // Stop any existing test
      if (activeTestProcess) {
        activeTestProcess.kill('SIGTERM')
        activeTestProcess = null
      }

      // Path to the agentic-ai directory where test_continuous_monitoring.py is located
      const agenticAiPath = path.join(process.cwd(), '..', 'agentic-ai')
      
      console.log('Starting crash test from:', agenticAiPath)
      
      // Start the crash test script
      activeTestProcess = spawn('python3', ['test_continuous_monitoring.py'], {
        cwd: agenticAiPath,
        stdio: ['pipe', 'pipe', 'pipe']
      })

      testStartTime = Date.now()

      // Handle process output
      activeTestProcess.stdout?.on('data', (data) => {
        console.log('Crash Test Output:', data.toString())
      })

      activeTestProcess.stderr?.on('data', (data) => {
        console.error('Crash Test Error:', data.toString())
      })

      activeTestProcess.on('close', (code) => {
        console.log(`Crash test process exited with code ${code}`)
        activeTestProcess = null
        testStartTime = null
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Crash test started successfully',
        pid: activeTestProcess.pid
      })
    }
    
    if (action === 'stop') {
      if (activeTestProcess) {
        activeTestProcess.kill('SIGTERM')
        activeTestProcess = null
        testStartTime = null
        
        return NextResponse.json({ 
          success: true, 
          message: 'Crash test stopped successfully' 
        })
      } else {
        return NextResponse.json({ 
          success: false, 
          message: 'No active crash test to stop' 
        })
      }
    }
    
    if (action === 'status') {
      const isRunning = activeTestProcess !== null && !activeTestProcess.killed
      const elapsedTime = testStartTime ? Math.floor((Date.now() - testStartTime) / 1000) : 0
      
      // Crash schedule from test_continuous_monitoring.py
      const crashSchedule = [
        { time: 15, method: 'stop', description: 'PM2 Stop' },
        { time: 60, method: 'kill', description: 'Process Kill' }, 
        { time: 120, method: 'stop', description: 'PM2 Stop' }
      ]
      
      // Determine next crash
      let nextCrash = null
      let completedCrashes = []
      
      for (const crash of crashSchedule) {
        if (elapsedTime >= crash.time) {
          completedCrashes.push(crash)
        } else if (!nextCrash) {
          nextCrash = crash
        }
      }
      
      return NextResponse.json({
        success: true,
        data: {
          isRunning,
          elapsedTime,
          nextCrash: nextCrash ? {
            ...nextCrash,
            timeUntil: nextCrash.time - elapsedTime
          } : null,
          completedCrashes,
          totalDuration: 150, // 120s + 30s buffer
          pid: activeTestProcess?.pid || null
        }
      })
    }
    
    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 })
    
  } catch (error) {
    console.error('Crash test API error:', error)
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  // Return status by default
  const isRunning = activeTestProcess !== null && !activeTestProcess.killed
  const elapsedTime = testStartTime ? Math.floor((Date.now() - testStartTime) / 1000) : 0
  
  return NextResponse.json({
    success: true,
    data: {
      isRunning,
      elapsedTime,
      pid: activeTestProcess?.pid || null
    }
  })
}