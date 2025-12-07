'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// Custom animation styles
const customStyles = `
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
    50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.6); }
  }
  .glow-animation {
    animation: glow 2s ease-in-out infinite;
  }
  @keyframes workingPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.8; }
  }
  .working-pulse {
    animation: workingPulse 1.5s ease-in-out infinite;
  }
`

import { 
  Play, 
  Square, 
  Activity, 
  Brain, 
  Wrench, 
  CheckCircle, 
  AlertTriangle, 
  Server, 
  Terminal,
  Clock,
  Zap,
  Eye,
  RefreshCw
} from 'lucide-react'

interface AgentStatus {
  id: string
  name: string
  status: 'idle' | 'working' | 'completed' | 'error'
  currentTask?: string
  lastUpdate?: string
  output?: string[]
}

interface ServerLog {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
  agent?: string
}

interface FlashcardEntry {
  detected_at: string
  diagnosis: {
    status: string
    reason: string
    detailed_diagnosis: string
    confidence: number
  }
  action: {
    repair_attempted: boolean
    repair_action: string
    repair_success: boolean
    repair_output: string
  }
  verification: {
    verified: boolean
    verification_response: string
    post_repair_status: string
  }
}

export default function AgentWorkflowDashboard() {
  const [agents, setAgents] = useState<AgentStatus[]>([
    {
      id: 'supervisor',
      name: 'Supervisor Agent',
      status: 'idle',
      currentTask: 'Monitoring server health...',
      output: []
    },
    {
      id: 'executor',
      name: 'Executor Agent', 
      status: 'idle',
      currentTask: 'Awaiting repair instructions...',
      output: []
    },
    {
      id: 'evaluator',
      name: 'Evaluator Agent',
      status: 'idle',
      currentTask: 'Ready to verify repairs...',
      output: []
    }
  ])
  
  const [serverLogs, setServerLogs] = useState<ServerLog[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [serverStatus, setServerStatus] = useState<'up' | 'down' | 'unknown'>('unknown')
  const [flashcards, setFlashcards] = useState<FlashcardEntry[]>([])
  const [currentWorkflow, setCurrentWorkflow] = useState<string | null>(null)


  const logsEndRef = useRef<HTMLDivElement>(null)  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [serverLogs])

  // Poll for agent status and logs
  useEffect(() => {
    const interval = setInterval(async () => {
      await fetchMonitoringStatus()
      await fetchFlashcards()
      
      // Don't add system logs when monitoring is running (real-time stream handles it)
      if (!isMonitoring) {
        // Only poll for logs when not actively monitoring
      }
    }, 5000) // Reduced frequency since we have real-time logs

    return () => clearInterval(interval)
  }, [isMonitoring])

  // Real-time log streaming with Server-Sent Events
  useEffect(() => {
    let eventSource: EventSource | null = null

    if (isMonitoring) {
      eventSource = new EventSource('/api/logs/stream')
      
      eventSource.onopen = () => {
        addServerLog('success', 'Connected to real-time log stream')
      }

      eventSource.addEventListener('log', (event) => {
        const logData = JSON.parse(event.data)
        
        // Update agent status based on log type
        updateAgentFromLog(logData)
        
        // Add to server logs
        addServerLog(logData.level, logData.message, logData.agent)
      })

      // Handle raw output from test_continuous_monitoring.py
      eventSource.addEventListener('raw', (event) => {
        const rawData = JSON.parse(event.data)
        const message = rawData.message
        
        // Enhanced agent activity detection from raw output
        detectAgentFromRawMessage(message)
        
        addServerLog(rawData.level, rawData.message)
      })

      eventSource.addEventListener('error', (event) => {
        const errorData = JSON.parse(event.data)
        addServerLog('error', errorData.message)
      })

      eventSource.addEventListener('process_exit', (event) => {
        const exitData = JSON.parse(event.data)
        addServerLog('warn', exitData.message)
        setIsMonitoring(false)
        setCurrentWorkflow(null)
      })

      eventSource.onerror = () => {
        addServerLog('error', 'Lost connection to log stream')
        eventSource?.close()
      }
    }

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [isMonitoring])

  const fetchMonitoringStatus = async () => {
    try {
      const response = await fetch('/api/monitoring')
      const result = await response.json()
      
      if (result.success) {
        setIsMonitoring(result.data.isRunning)
        
        // Don't add system logs when monitoring is running (real-time stream handles it)
        if (!isMonitoring && result.data.lastActivity) {
          addServerLog('info', result.data.lastActivity, 'system')
        }
      }
    } catch (error) {
      console.error('Failed to fetch monitoring status:', error)
    }
  }

  const fetchFlashcards = async () => {
    try {
      const response = await fetch('/api/incidents')
      const result = await response.json()
      
      if (result.success) {
        setFlashcards(result.data.slice(0, 5)) // Show latest 5
      }
    } catch (error) {
      console.error('Failed to fetch flashcards:', error)
    }
  }

  const simulateAgentActivity = async () => {
    // Real-time agent detection handles all activity - no simulation needed
    // This function is kept for compatibility but does nothing
  }

  const getRandomTask = (agentId: string): string => {
    const tasks = {
      supervisor: [
        'Analyzing nginx logs...',
        'Checking server health endpoints...',
        'Running LLM diagnostics...',
        'Evaluating system metrics...'
      ],
      executor: [
        'Executing PM2 restart command...',
        'Applying configuration fixes...',
        'Restarting nginx service...',
        'Deploying repair scripts...'
      ],
      evaluator: [
        'Verifying server response...',
        'Testing endpoint availability...',
        'Creating incident flashcard...',
        'Updating repair logs...'
      ]
    }
    
    const agentTasks = tasks[agentId as keyof typeof tasks] || []
    return agentTasks[Math.floor(Math.random() * agentTasks.length)]
  }

  const getIdleTask = (agentId: string): string => {
    const idleTasks = {
      supervisor: 'Monitoring server health...',
      executor: 'Awaiting repair instructions...',
      evaluator: 'Ready to verify repairs...'
    }
    
    return idleTasks[agentId as keyof typeof idleTasks] || 'Idle'
  }

  const updateAgentStatus = (agentId: string, updates: Partial<AgentStatus>) => {
    setAgents(prev => prev.map(agent => 
      agent.id === agentId 
        ? { ...agent, ...updates, lastUpdate: new Date().toISOString() }
        : agent
    ))
  }

  const addServerLog = (level: ServerLog['level'], message: string, agent?: string) => {
    const log: ServerLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      agent
    }
    
    setServerLogs(prev => [...prev.slice(-50), log]) // Keep last 50 logs
  }

  const detectAgentFromRawMessage = (message: string) => {
    // Real-time detection of agent activity from test script output
    if (message.includes('🤖') && message.includes('STARTING')) {
      setCurrentWorkflow('Continuous monitoring initiated')
      updateAgentStatus('supervisor', {
        status: 'working',
        currentTask: 'Initializing monitoring cycle...'
      })
    }
    
    // Supervisor patterns
    else if (message.includes('Supervisor:') || message.includes('Starting monitoring cycle') || message.includes('Analyzing')) {
      updateAgentStatus('supervisor', {
        status: 'working',
        currentTask: 'Analyzing server health...'
      })
    }
    
    // LLM diagnosis patterns  
    else if (message.includes('LLM diagnosis:') || message.includes('confidence:')) {
      updateAgentStatus('supervisor', {
        status: 'working',
        currentTask: message.includes('DOWN') ? '🚨 Server DOWN detected!' : '✅ Server UP confirmed'
      })
      
      if (message.includes('DOWN')) {
        setServerStatus('down')
        // Prepare executor for repair
        setTimeout(() => {
          updateAgentStatus('executor', {
            status: 'working',
            currentTask: 'Preparing repair strategy...'
          })
        }, 1500)
      } else if (message.includes('UP')) {
        setServerStatus('up')
      }
    }
    
    // Executor patterns
    else if (message.includes('Executor:') || message.includes('PM2') || message.includes('restart') || message.includes('repair')) {
      updateAgentStatus('executor', {
        status: 'working',
        currentTask: message.includes('success') ? '✅ Repair completed!' : '🔧 Executing repair...'
      })
      
      // Complete supervisor as executor takes over
      updateAgentStatus('supervisor', {
        status: 'completed',
        currentTask: 'Analysis complete - repair needed'
      })
    }
    
    // Verification patterns
    else if (message.includes('POST-REPAIR') || message.includes('Verification') || message.includes('Testing endpoint')) {
      updateAgentStatus('evaluator', {
        status: 'working',
        currentTask: 'Verifying repair success...'
      })
      
      // Complete executor
      setTimeout(() => {
        updateAgentStatus('executor', {
          status: 'completed',
          currentTask: 'Repair execution complete'
        })
      }, 1000)
    }
    
    // Final verification and flashcard creation
    else if (message.includes('PASSED') || message.includes('Flashcard created') || message.includes('SUMMARY')) {
      updateAgentStatus('evaluator', {
        status: 'completed',
        currentTask: '✅ Verification complete!'
      })
      
      // Complete workflow
      setTimeout(() => {
        setCurrentWorkflow('Monitoring cycle complete')
        setTimeout(() => {
          setCurrentWorkflow(null)
          // Reset all agents after workflow completion
          setAgents(prev => prev.map(agent => ({
            ...agent,
            status: 'idle' as const,
            currentTask: getIdleTask(agent.id)
          })))
        }, 2000)
      }, 1500)
    }
    
    // Server crash detection
    else if (message.includes('💥') || message.includes('CRASH') || message.includes('Stopping server')) {
      addServerLog('warn', `💥 ${message}`)
      setServerStatus('down')
    }
    
    // Agent process detection
    else if (message.includes('Agent PID:') || message.includes('monitoring started')) {
      addServerLog('success', `✅ ${message}`)
    }
  }

  const updateAgentFromLog = (logData: any) => {
    const agentId = logData.agent
    const message = logData.message
    
    // Enhanced agent detection from actual log patterns
    if (message.includes('Supervisor:') || message.includes('Analyzing') || message.includes('LLM diagnosis:')) {
      updateAgentStatus('supervisor', {
        status: 'working',
        currentTask: message.includes('DOWN') ? 'Server issues detected!' : 'Analyzing server health...'
      })
      
      // Update server status from diagnosis
      if (message.includes('UP')) setServerStatus('up')
      if (message.includes('DOWN')) setServerStatus('down')
      
    } else if (message.includes('Executor:') || message.includes('PM2') || message.includes('restart') || message.includes('repair')) {
      // Activate executor when repair actions are happening
      updateAgentStatus('executor', {
        status: 'working',
        currentTask: message.includes('success') ? 'Repair completed!' : 'Executing repair commands...'
      })
      
      // Complete supervisor as executor takes over
      updateAgentStatus('supervisor', {
        status: 'completed',
        currentTask: 'Analysis complete - repair needed'
      })
      
    } else if (message.includes('Verification') || message.includes('verified') || message.includes('POST-REPAIR')) {
      // Activate evaluator for verification
      updateAgentStatus('evaluator', {
        status: 'working',
        currentTask: 'Verifying repair success...'
      })
      
      // Complete executor
      updateAgentStatus('executor', {
        status: 'completed',
        currentTask: 'Repair actions executed'
      })
      
    } else if (message.includes('PASSED') || message.includes('Flashcard')) {
      // Complete evaluator
      updateAgentStatus('evaluator', {
        status: 'completed',
        currentTask: 'Verification complete!'
      })
      
      // Reset all agents after workflow completion
      setTimeout(() => {
        setAgents(prev => prev.map(agent => ({
          ...agent,
          status: 'idle' as const,
          currentTask: getIdleTask(agent.id)
        })))
      }, 3000)
      
    } else if (message.includes('Starting monitoring cycle') || message.includes('🤖')) {
      // Workflow started - activate supervisor
      setCurrentWorkflow('AI monitoring cycle initiated')
      updateAgentStatus('supervisor', {
        status: 'working',
        currentTask: 'Starting health check...'
      })
    }
    
    // Legacy handling for structured log data
    if (!agentId || agentId === 'system') return
    
    // Update agent status based on log content
    if (logData.type === 'diagnosis') {
      updateAgentStatus('supervisor', {
        status: 'working',
        currentTask: `Diagnosing server (${logData.status})`
      })
      
      // Update server status
      setServerStatus(logData.status === 'UP' ? 'up' : 'down')
      
      // Move to next agent after delay
      setTimeout(() => {
        if (logData.status === 'DOWN') {
          updateAgentStatus('executor', {
            status: 'working',
            currentTask: 'Preparing repair action...'
          })
        } else {
          updateAgentStatus('evaluator', {
            status: 'working',
            currentTask: 'Verifying system health...'
          })
        }
      }, 2000)
      
    } else if (logData.type === 'repair') {
      updateAgentStatus('executor', {
        status: 'working',
        currentTask: 'Executing repair commands...'
      })
      
      // Complete executor and move to evaluator
      setTimeout(() => {
        updateAgentStatus('executor', {
          status: 'completed',
          currentTask: 'Repair commands executed'
        })
        
        updateAgentStatus('evaluator', {
          status: 'working',
          currentTask: 'Verifying repair success...'
        })
        
        // Reset executor after 3 seconds
        setTimeout(() => {
          updateAgentStatus('executor', {
            status: 'idle',
            currentTask: 'Awaiting repair instructions...'
          })
        }, 3000)
      }, 1500)
      
    } else if (logData.type === 'evaluation') {
      updateAgentStatus('evaluator', {
        status: 'working',
        currentTask: 'Creating flashcard record...'
      })
      
      // Complete evaluator
      setTimeout(() => {
        updateAgentStatus('evaluator', {
          status: 'completed',
          currentTask: 'Flashcard created successfully'
        })
        
        // Complete supervisor
        updateAgentStatus('supervisor', {
          status: 'completed',
          currentTask: 'Monitoring cycle complete'
        })
        
        // Reset all agents after 3 seconds
        setTimeout(() => {
          setAgents(prev => prev.map(agent => ({
            ...agent,
            status: 'idle' as const,
            currentTask: getIdleTask(agent.id)
          })))
        }, 3000)
      }, 1000)
      
    } else if (logData.type === 'workflow') {
      if (logData.message.includes('Starting monitoring cycle')) {
        setCurrentWorkflow('Monitoring cycle initiated')
        
        updateAgentStatus('supervisor', {
          status: 'working',
          currentTask: 'Collecting system metrics...'
        })
      } else if (logData.message.includes('MONITORING CYCLE SUMMARY')) {
        setCurrentWorkflow(null)
        
        // Refresh flashcards
        setTimeout(() => {
          fetchFlashcards()
        }, 1000)
      }
    }
  }

  const handleStartMonitoring = async () => {
    try {
      const response = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      })
      
      const result = await response.json()
      if (result.success) {
        setIsMonitoring(true)
        addServerLog('success', 'Continuous monitoring started')
        setCurrentWorkflow('Continuous monitoring active')
      } else {
        addServerLog('error', `Failed to start monitoring: ${result.error}`)
      }
    } catch (error) {
      addServerLog('error', 'Failed to start monitoring')
    }
  }

  const handleStopMonitoring = async () => {
    try {
      const response = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      })
      
      const result = await response.json()
      if (result.success) {
        setIsMonitoring(false)
        addServerLog('info', 'Monitoring stopped')
        setCurrentWorkflow(null)
        
        // Reset all agents to idle
        setAgents(prev => prev.map(agent => ({
          ...agent,
          status: 'idle' as const,
          currentTask: getIdleTask(agent.id)
        })))
      }
    } catch (error) {
      addServerLog('error', 'Failed to stop monitoring')
    }
  }

  const handleTriggerCheck = async () => {
    try {
      setCurrentWorkflow('Single check in progress...')
      addServerLog('info', 'Triggering single agentic check')
      
      const response = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'single-check' })
      })
      
      const result = await response.json()
      if (result.success) {
        addServerLog('success', 'Single check completed successfully')
        setCurrentWorkflow(null)
        
        // Refresh data
        await fetchFlashcards()
      } else {
        addServerLog('error', `Single check failed: ${result.error}`)
        setCurrentWorkflow(null)
      }
    } catch (error) {
      addServerLog('error', 'Single check failed')
      setCurrentWorkflow(null)
    }
  }

  const getAgentIcon = (agentId: string) => {
    switch (agentId) {
      case 'supervisor': return <Eye className="w-5 h-5" />
      case 'executor': return <Wrench className="w-5 h-5" />
      case 'evaluator': return <CheckCircle className="w-5 h-5" />
      default: return <Activity className="w-5 h-5" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'bg-blue-500 animate-pulse'
      case 'completed': return 'bg-green-500'
      case 'error': return 'bg-red-500 animate-bounce'
      default: return 'bg-gray-400'
    }
  }

  const getAgentCardClass = (status: string) => {
    switch (status) {
      case 'working': return 'ring-2 ring-blue-400 ring-opacity-50 shadow-lg transform scale-105 transition-all duration-300 glow-animation working-pulse'
      case 'completed': return 'ring-2 ring-green-400 ring-opacity-50 shadow-lg transition-all duration-500 bg-gradient-to-br from-green-50 to-white'
      case 'error': return 'ring-2 ring-red-400 ring-opacity-50 shadow-lg transition-all duration-300 bg-gradient-to-br from-red-50 to-white'
      default: return 'transition-all duration-300 hover:shadow-md hover:scale-102'
    }
  }

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      default: return <Activity className="w-4 h-4 text-blue-600" />
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            🤖 Agentic AI Server Monitor
          </h1>
          <p className="text-lg text-gray-700">
            Real-time LangGraph workflow monitoring with Supervisor → Executor → Evaluator agents
          </p>
          
          {/* Control Panel */}
          <div className="flex justify-center gap-4 flex-wrap">
            <Button
              onClick={handleStartMonitoring}
              disabled={isMonitoring}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Continuous Monitoring
            </Button>
            
            <Button
              onClick={handleStopMonitoring}
              disabled={!isMonitoring}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              Stop Monitoring
            </Button>
            
            <Button
              onClick={handleTriggerCheck}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Trigger Single Check
            </Button>


          </div>



          {/* Workflow Status */}
          {currentWorkflow && (
            <div className="flex items-center justify-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span className="font-medium text-blue-800">{currentWorkflow}</span>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          )}
          
          {/* Server Status Indicator */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">
              <Server className="w-4 h-4" />
              <span className="text-sm font-medium">Server Status:</span>
              <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${
                serverStatus === 'up' ? 'bg-green-100 text-green-800' :
                serverStatus === 'down' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  serverStatus === 'up' ? 'bg-green-500 animate-pulse' :
                  serverStatus === 'down' ? 'bg-red-500 animate-bounce' :
                  'bg-gray-400'
                }`} />
                {serverStatus.toUpperCase()}
              </div>
            </div>
            
            {isMonitoring && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800">
                <Activity className="w-4 h-4 animate-bounce" />
                <span className="text-sm font-medium">MONITORING ACTIVE</span>
              </div>
            )}
          </div>


        </div>

        {/* Agent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card key={agent.id} className={`relative ${getAgentCardClass(agent.status)}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={agent.status === 'working' ? 'animate-spin' : ''}>
                      {getAgentIcon(agent.id)}
                    </div>
                    <CardTitle className="text-lg text-gray-900">
                      {agent.name}
                    </CardTitle>
                    {agent.status === 'working' && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="text-xs font-medium">ACTIVE</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div 
                      className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`}
                    />
                    <Badge 
                      variant={agent.status === 'working' ? 'default' : 
                              agent.status === 'completed' ? 'secondary' : 
                              agent.status === 'error' ? 'destructive' : 'outline'}
                      className={agent.status === 'working' ? 'animate-pulse' : ''}
                    >
                      {agent.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-800 font-medium">
                    Current Task:
                  </p>
                  <p className={`text-sm ${
                    agent.status === 'working' ? 'text-blue-700 font-medium animate-pulse' :
                    agent.status === 'completed' ? 'text-green-700 font-medium' :
                    agent.status === 'error' ? 'text-red-700 font-medium' :
                    'text-gray-700'
                  }`}>
                    {agent.status === 'working' && '⚡ '}{agent.currentTask}
                  </p>
                </div>
                
                {agent.status === 'working' && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-blue-700">RUNNING</span>
                  </div>
                )}
                
                {agent.lastUpdate && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Clock className="w-3 h-3" />
                    <span>
                      Last update: {new Date(agent.lastUpdate).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Server Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Terminal className="w-5 h-5" />
                Live Server Logs
              </CardTitle>
              <CardDescription>
                Real-time agent activity and system events
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="h-80 overflow-y-auto bg-black rounded-lg p-4 font-mono text-sm">
                {serverLogs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Start monitoring to see live logs...
                  </p>
                ) : (
                  <div className="space-y-1">
                    {serverLogs.map((log, index) => (
                      <div key={index} className="flex items-start gap-2">
                        {getLogIcon(log.level)}
                        <span className="text-gray-400 text-xs w-16">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        {log.agent && (
                          <span className="text-blue-400 text-xs font-medium w-20">
                            [{log.agent}]
                          </span>
                        )}
                        <span className={
                          log.level === 'error' ? 'text-red-400' :
                          log.level === 'success' ? 'text-green-400' :
                          log.level === 'warn' ? 'text-yellow-400' :
                          'text-white'
                        }>
                          {log.message}
                        </span>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Flashcard History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Brain className="w-5 h-5" />
                Recent Flashcards
              </CardTitle>
              <CardDescription>
                Incident learning records created by the Evaluator Agent
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="h-80 overflow-y-auto space-y-3">
                {flashcards.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">
                    No flashcards yet. Run a check to generate incident records.
                  </p>
                ) : (
                  flashcards.map((card, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <Badge 
                          variant={card.diagnosis.status === 'UP' ? 'secondary' : 'destructive'}
                        >
                          {card.diagnosis.status}
                        </Badge>
                        <span className="text-xs text-gray-600">
                          {new Date(card.detected_at).toLocaleString()}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-800 font-medium mb-1">
                        {card.diagnosis.reason}
                      </p>
                      
                      {card.action.repair_attempted && (
                        <div className="text-xs text-gray-700">
                          <p className="font-medium">Repair: {card.action.repair_action}</p>
                          <p className={card.action.repair_success ? 'text-green-700' : 'text-red-700'}>
                            {card.action.repair_success ? '✅ Success' : '❌ Failed'}
                          </p>
                        </div>
                      )}
                      
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-gray-600">
                          Confidence: {Math.round(card.diagnosis.confidence * 100)}%
                        </span>
                        {card.verification.verified && (
                          <span className="text-xs text-green-700">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Footer */}
        <div className="text-center text-sm text-gray-600">
          <p>
            💡 <strong>How it works:</strong> The Supervisor monitors server health → 
            Executor performs repairs when needed → Evaluator verifies and creates flashcards
          </p>
          <p className="mt-1">
            🔥 <strong>To test:</strong> Start monitoring, then run <code className="bg-gray-200 px-1 rounded">npm run dev</code> 
            in another terminal to simulate server activity
          </p>
        </div>
      </div>
    </div>
    </>
  )
}