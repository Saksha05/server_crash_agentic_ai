'use client'

import { useState, useEffect } from 'react'
import { Activity, Server, AlertTriangle, CheckCircle, Clock, Wrench, Database, Zap, RefreshCw, BarChart3, Settings } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FlashcardIncident, MonitoringStatus, SSHConnectionStatus, SystemStats } from '@/types'
import { formatTimestamp, getStatusColor, getConfidenceColor } from '@/lib/utils'
import DataVisualization from './DataVisualization'

interface TabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
  tabs: Array<{
    id: string
    label: string
    icon: React.ReactNode
  }>
}

function Tabs({ activeTab, onTabChange, tabs }: TabsProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-800 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

interface StatusCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color?: 'green' | 'red' | 'yellow' | 'blue'
  description?: string
  loading?: boolean
}

function StatusCard({ title, value, icon, color = 'blue', description, loading }: StatusCardProps) {
  const colorClasses = {
    green: 'text-green-600 bg-green-50 border-green-200',
    red: 'text-red-600 bg-red-50 border-red-200',
    yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`p-2 rounded-md ${colorClasses[color]}`}>
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{loading ? '...' : value}</div>
        {description && (
          <p className="text-xs text-gray-800">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

interface ServerStatusProps {
  status: MonitoringStatus
  sshStatus: SSHConnectionStatus
  onStartMonitoring: () => void
  onStopMonitoring: () => void
  onTriggerCheck: () => void
  onManualRepair: () => void
  loading: boolean
}

function ServerStatus({ 
  status, 
  sshStatus, 
  onStartMonitoring, 
  onStopMonitoring, 
  onTriggerCheck,
  onManualRepair,
  loading
}: ServerStatusProps) {
  const statusColor = status.currentStatus === 'UP' ? 'green' : 
                     status.currentStatus === 'DOWN' ? 'red' : 'yellow'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="w-5 h-5" />
          Server Status
        </CardTitle>
        <CardDescription>
          Current monitoring status and server health
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={statusColor === 'green' ? 'success' : statusColor === 'red' ? 'danger' : 'warning'}>
              {status.currentStatus}
            </Badge>
            <span className="text-sm text-gray-800">
              {status.lastCheck ? `Last checked: ${formatTimestamp(status.lastCheck)}` : 'No checks yet'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${sshStatus.connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-gray-800">
            SSH: {sshStatus.connected ? 'Connected' : 'Disconnected'}
            {sshStatus.host && ` to ${sshStatus.host}`}
          </span>
        </div>

        {status.isRunning && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-gray-800">
              Next check in {status.nextCheckIn}s
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-800">Total Incidents</div>
            <div className="font-semibold">{status.totalIncidents}</div>
          </div>
          <div>
            <div className="text-gray-800">Successful Repairs</div>
            <div className="font-semibold">{status.successfulRepairs}</div>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          {status.isRunning ? (
            <Button onClick={onStopMonitoring} variant="destructive" size="sm" disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : null}
              Stop Monitoring
            </Button>
          ) : (
            <Button onClick={onStartMonitoring} size="sm" disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : null}
              Start Monitoring
            </Button>
          )}
          <Button onClick={onTriggerCheck} variant="outline" size="sm" disabled={loading}>
            {loading ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : null}
            Trigger Check
          </Button>
          <Button onClick={onManualRepair} variant="outline" size="sm" disabled={loading}>
            <Wrench className="w-4 h-4 mr-1" />
            Manual Repair
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface IncidentLogProps {
  incidents: FlashcardIncident[]
  maxItems?: number
  loading?: boolean
}

function IncidentLog({ incidents, maxItems = 10, loading }: IncidentLogProps) {
  const recentIncidents = incidents.slice(0, maxItems)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Recent Incidents
          {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
        </CardTitle>
        <CardDescription>
          Latest server incidents and repair actions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-800">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading incidents...
            </div>
          ) : recentIncidents.length === 0 ? (
            <div className="text-center py-8 text-gray-800">
              No incidents recorded yet
            </div>
          ) : (
            recentIncidents.map((incident, index) => (
              <div key={index} className="border-l-4 border-l-blue-200 pl-4 py-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={incident.diagnosis.status === 'UP' ? 'success' : 'danger'}>
                      {incident.diagnosis.status}
                    </Badge>
                    <span className="text-sm font-medium">
                      {formatTimestamp(incident.detected_at)}
                    </span>
                  </div>
                  <div className={`text-xs ${getConfidenceColor(incident.diagnosis.confidence)}`}>
                    {Math.round(incident.diagnosis.confidence * 100)}% confidence
                  </div>
                </div>
                
              <div className="text-sm text-gray-800 mb-2">
                {incident.diagnosis.reason}
              </div>                {incident.action.repair_attempted && (
                  <div className="flex items-center gap-2 text-xs">
                    <Wrench className="w-3 h-3" />
                    <span>Repair: {incident.action.repair_action}</span>
                    <Badge 
                      variant={incident.action.repair_success ? 'success' : 'danger'}
                      className="text-xs"
                    >
                      {incident.action.repair_success ? 'Success' : 'Failed'}
                    </Badge>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus>({
    isRunning: false,
    lastCheck: null,
    currentStatus: 'UNKNOWN',
    nextCheckIn: 0,
    totalIncidents: 0,
    successfulRepairs: 0,
  })

  const [sshStatus] = useState<SSHConnectionStatus>({
    connected: true, // Assume connected for now
    host: '98.70.43.91',
    lastConnected: new Date().toISOString(),
    errorMessage: null,
  })

  const [systemStats, setSystemStats] = useState<SystemStats>({
    uptimePercentage: 0,
    averageRepairTime: 0,
    incidentsLast24h: 0,
    averageConfidence: 0,
  })

  const [incidents, setIncidents] = useState<FlashcardIncident[]>([])
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [incidentsLoading, setIncidentsLoading] = useState(false)

  // Tab configuration
  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <Activity className="w-4 h-4" />
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-4 h-4" />
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />
    }
  ]

  // Load initial data
  useEffect(() => {
    fetchIncidents()
    fetchStats()
    fetchMonitoringStatus()
  }, [])

  const fetchIncidents = async () => {
    setIncidentsLoading(true)
    try {
      const response = await fetch('/api/incidents')
      const result = await response.json()
      
      if (result.success) {
        setIncidents(result.data)
        // Update monitoring status based on incidents
        setMonitoringStatus(prev => ({
          ...prev,
          totalIncidents: result.count,
          successfulRepairs: result.data.filter((i: FlashcardIncident) => 
            i.action.repair_attempted && i.action.repair_success
          ).length,
          lastCheck: result.data[0]?.detected_at || null,
          currentStatus: result.data[0]?.verification.post_repair_status || 'UNKNOWN'
        }))
      }
    } catch (error) {
      console.error('Failed to fetch incidents:', error)
    }
    setIncidentsLoading(false)
  }

  const fetchStats = async () => {
    setStatsLoading(true)
    try {
      const response = await fetch('/api/stats')
      const result = await response.json()
      
      if (result.success) {
        setSystemStats(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
    setStatsLoading(false)
  }

  const fetchMonitoringStatus = async () => {
    try {
      const response = await fetch('/api/monitoring')
      const result = await response.json()
      
      if (result.success) {
        setMonitoringStatus(prev => ({
          ...prev,
          isRunning: result.data.isRunning
        }))
      }
    } catch (error) {
      console.error('Failed to fetch monitoring status:', error)
    }
  }

  const handleStartMonitoring = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      })
      
      const result = await response.json()
      if (result.success) {
        setMonitoringStatus(prev => ({
          ...prev,
          isRunning: true,
          nextCheckIn: 60
        }))
      } else {
        alert(`Failed to start monitoring: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to start monitoring:', error)
      alert('Failed to start monitoring')
    }
    setLoading(false)
  }

  const handleStopMonitoring = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      })
      
      const result = await response.json()
      if (result.success) {
        setMonitoringStatus(prev => ({
          ...prev,
          isRunning: false,
          nextCheckIn: 0
        }))
      } else {
        alert(`Failed to stop monitoring: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to stop monitoring:', error)
      alert('Failed to stop monitoring')
    }
    setLoading(false)
  }

  const handleTriggerCheck = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'single-check' })
      })
      
      const result = await response.json()
      if (result.success) {
        // Refresh data after check
        await fetchIncidents()
        await fetchStats()
        alert('Single check completed successfully')
      } else {
        alert(`Single check failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Single check failed:', error)
      alert('Single check failed')
    }
    setLoading(false)
  }

  const handleManualRepair = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/repair', {
        method: 'POST'
      })
      
      const result = await response.json()
      if (result.success) {
        // Refresh data after repair
        await fetchIncidents()
        await fetchStats()
        alert(`Manual repair completed. Repair attempted: ${result.repairAttempted ? 'Yes' : 'No'}`)
      } else {
        alert(`Manual repair failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Manual repair failed:', error)
      alert('Manual repair failed')
    }
    setLoading(false)
  }

  // Countdown timer
  useEffect(() => {
    if (monitoringStatus.isRunning && monitoringStatus.nextCheckIn > 0) {
      const timer = setTimeout(() => {
        setMonitoringStatus(prev => ({
          ...prev,
          nextCheckIn: Math.max(0, prev.nextCheckIn - 1)
        }))
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [monitoringStatus.isRunning, monitoringStatus.nextCheckIn])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatusCard
                title="Server Status"
                value={monitoringStatus.currentStatus}
                icon={<Server className="w-4 h-4" />}
                color={monitoringStatus.currentStatus === 'UP' ? 'green' : 
                       monitoringStatus.currentStatus === 'DOWN' ? 'red' : 'yellow'}
                description="Current server health"
                loading={statsLoading}
              />
              <StatusCard
                title="Uptime"
                value={`${systemStats.uptimePercentage.toFixed(1)}%`}
                icon={<CheckCircle className="w-4 h-4" />}
                color="green"
                description="Last 30 days"
                loading={statsLoading}
              />
              <StatusCard
                title="Incidents (24h)"
                value={systemStats.incidentsLast24h}
                icon={<AlertTriangle className="w-4 h-4" />}
                color={systemStats.incidentsLast24h === 0 ? 'green' : 'yellow'}
                description="Detected issues"
                loading={statsLoading}
              />
              <StatusCard
                title="Avg Confidence"
                value={`${(systemStats.averageConfidence * 100).toFixed(0)}%`}
                icon={<Zap className="w-4 h-4" />}
                color="blue"
                description="AI diagnosis accuracy"
                loading={statsLoading}
              />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Server Status */}
              <div className="lg:col-span-2">
                <ServerStatus
                  status={monitoringStatus}
                  sshStatus={sshStatus}
                  onStartMonitoring={handleStartMonitoring}
                  onStopMonitoring={handleStopMonitoring}
                  onTriggerCheck={handleTriggerCheck}
                  onManualRepair={handleManualRepair}
                  loading={loading}
                />
              </div>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    System Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-800">Total Repairs</span>
                      <span className="font-semibold">{monitoringStatus.successfulRepairs}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-800">Success Rate</span>
                      <span className="font-semibold">
                        {monitoringStatus.totalIncidents > 0 
                          ? `${Math.round((monitoringStatus.successfulRepairs / monitoringStatus.totalIncidents) * 100)}%`
                          : '100%'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-800">Avg Repair Time</span>
                      <span className="font-semibold">{systemStats.averageRepairTime.toFixed(1)}s</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-800">SSH Connection</span>
                      <Badge variant={sshStatus.connected ? 'success' : 'danger'} className="text-xs">
                        {sshStatus.connected ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Incident Log */}
            <IncidentLog incidents={incidents} loading={incidentsLoading} />
          </div>
        )

      case 'analytics':
        return (
          <DataVisualization 
            incidents={incidents} 
            loading={incidentsLoading}
          />
        )

      case 'settings':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Configuration Settings</CardTitle>
              <CardDescription>
                Manage monitoring settings and system configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-800">
                Settings panel coming soon...
              </div>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Agentic AI Server Monitor
            </h1>
            <p className="text-gray-900">
              Intelligent server monitoring and automated repair system
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                fetchIncidents()
                fetchStats()
              }}
              disabled={incidentsLoading || statsLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${(incidentsLoading || statsLoading) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Badge variant="outline" className="text-sm">
              <Activity className="w-4 h-4 mr-1" />
              Live Dashboard
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
        />

        {/* Tab Content */}
        <div className="mt-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}