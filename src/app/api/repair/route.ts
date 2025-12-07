import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

export async function POST() {
  try {
    // Path to the Python script directory
    const pythonPath = path.join(process.cwd(), '..', 'agentic-ai')
    
    // Execute manual repair by running a single check that will trigger repair if needed
    const { stdout, stderr } = await execAsync('python3 main.py --once', {
      cwd: pythonPath,
      timeout: 60000 // 60 second timeout
    })
    
    // Parse the output to determine if repair was attempted
    const output = stdout.toString()
    const isRepairAttempted = output.includes('repair') || output.includes('PM2') || output.includes('restart')
    
    return NextResponse.json({
      success: true,
      message: 'Manual repair completed',
      repairAttempted: isRepairAttempted,
      output: output,
      error: stderr || null
    })
    
  } catch (error: any) {
    console.error('Manual repair failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Manual repair failed',
      output: error.stdout || null,
      errorDetails: error.stderr || error.message
    }, { status: 500 })
  }
}