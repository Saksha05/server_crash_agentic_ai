'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Bomb, 
  Shield, 
  Timer, 
  Activity,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

interface CrashTestStatus {
  isRunning: boolean
  elapsedTime: number
  nextCrash: {
    time: number
    method: string
    description: string
    timeUntil: number
  } | null
  completedCrashes: Array<{
    time: number
    method: string
    description: string
  }>
  totalDuration: number
  pid: number | null
}

interface CrashTestControlsProps {
  onLog: (type: 'info' | 'success' | 'error' | 'warn', message: string, agentId?: string) => void
  onWorkflowChange: (workflow: string | null) => void
}

export default function CrashTestControls({ onLog, onWorkflowChange }: CrashTestControlsProps) {
  const [crashTestStatus, setCrashTestStatus] = useState<CrashTestStatus>({ 
    isRunning: false, 
    elapsedTime: 0, 
    nextCrash: null, 
    completedCrashes: [], 
    totalDuration: 150, 
    pid: null 
  })

  // Poll for crash test status
  useEffect(() => {
    const interval = setInterval(async () => {
      if (crashTestStatus.isRunning) {
        await fetchCrashTestStatus()
      }
    }, 1000) // Poll every second during active test
    
    return () => clearInterval(interval)
  }, [crashTestStatus.isRunning])

  const fetchCrashTestStatus = async () => {
    try {
      const response = await fetch('/api/crash-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' })
      })
      const result = await response.json()
      if (result.success) {
        setCrashTestStatus(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch crash test status:', error)
    }
  }

  const handleStartCrashTest = async () => {
    try {
      onLog('info', '🔥 Starting crash test with scheduled crashes (15s, 60s, 120s)')
      onWorkflowChange('Crash test initializing...')
      
      const response = await fetch('/api/crash-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      })
      
      const result = await response.json()
      if (result.success) {
        onLog('success', `🚀 Crash test started (PID: ${result.pid})`)
        onWorkflowChange('🤖 Crash test active - Agents will respond to scheduled crashes')
        setCrashTestStatus(prev => ({ ...prev, isRunning: true }))
        
        // Start polling immediately
        await fetchCrashTestStatus()
      } else {
        onLog('error', `Failed to start crash test: ${result.message}`)
        onWorkflowChange(null)
      }
    } catch (error) {
      onLog('error', 'Failed to start crash test')
      onWorkflowChange(null)
    }
  }

  const handleStopCrashTest = async () => {
    try {
      const response = await fetch('/api/crash-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      })
      
      const result = await response.json()
      if (result.success) {
        onLog('info', '🛑 Crash test stopped')
        onWorkflowChange(null)
        setCrashTestStatus(prev => ({ ...prev, isRunning: false }))
      } else {
        onLog('error', `Failed to stop crash test: ${result.message}`)
      }
    } catch (error) {
      onLog('error', 'Failed to stop crash test')
    }
  }

  return (
    <>
      {/* Crash Testing Controls */}
      <div className="border-l pl-4 flex gap-2">
        <Button
          onClick={handleStartCrashTest}
          disabled={crashTestStatus.isRunning}
          variant="outline"
          className="flex items-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
        >
          <Bomb className="w-4 h-4" />
          Start Crash Test
        </Button>
        
        <Button
          onClick={handleStopCrashTest}
          disabled={!crashTestStatus.isRunning}
          variant="outline"
          className="flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
        >
          <Shield className="w-4 h-4" />
          Stop Crash Test
        </Button>
      </div>

      {/* Crash Test Status Display */}
      {crashTestStatus.isRunning && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 max-w-2xl mx-auto mt-4">
          <div className="flex items-center justify-center gap-2 text-orange-700 mb-3">
            <Timer className="w-5 h-5" />
            <span className="font-semibold">🔥 Crash Test Active</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-gray-600">Elapsed Time</div>
              <div className="font-mono text-lg">
                {Math.floor(crashTestStatus.elapsedTime / 60)}:{(crashTestStatus.elapsedTime % 60).toString().padStart(2, '0')}
              </div>
            </div>
            
            {crashTestStatus.nextCrash ? (
              <div className="text-center">
                <div className="text-gray-600">Next Crash</div>
                <div className="font-semibold text-red-600">{crashTestStatus.nextCrash.description}</div>
                <div className="font-mono text-sm">in {crashTestStatus.nextCrash.timeUntil}s</div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-gray-600">Status</div>
                <div className="text-green-600 font-semibold">All crashes completed</div>
              </div>
            )}
            
            <div className="text-center">
              <div className="text-gray-600">Progress</div>
              <Progress 
                value={(crashTestStatus.elapsedTime / crashTestStatus.totalDuration) * 100} 
                className="mt-1" 
              />
              <div className="text-xs mt-1">{crashTestStatus.completedCrashes.length}/3 crashes</div>
            </div>
          </div>
          
          {crashTestStatus.completedCrashes.length > 0 && (
            <div className="mt-3 pt-3 border-t border-orange-200">
              <div className="text-xs text-gray-600 mb-1">Completed Crashes:</div>
              <div className="flex gap-2 flex-wrap">
                {crashTestStatus.completedCrashes.map((crash, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {crash.time}s: {crash.description}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-4 pt-3 border-t border-orange-200 text-xs text-gray-600">
            <div className="mb-2">
              <strong>What's happening:</strong> The test_continuous_monitoring.py script is running, which will:
            </div>
            <ul className="space-y-1 ml-4 list-disc">
              <li>Start the Python monitoring agent (main.py)</li>
              <li>Introduce server crashes at 15s, 60s, and 120s</li>
              <li>Watch AI agents detect and repair in real-time</li>
              <li>Show agent workflow in the cards above</li>
            </ul>
          </div>
        </div>
      )}
    </>
  )
}