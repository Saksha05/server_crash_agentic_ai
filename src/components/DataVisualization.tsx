'use client'

import { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon, Calendar, RefreshCw } from 'lucide-react'
import { FlashcardIncident } from '@/types'
import { formatTimestamp } from '@/lib/utils'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

interface ChartData {
  date: string
  incidents: number
  repairs: number
  successRate: number
  confidence: number
}

interface StatusDistribution {
  name: string
  value: number
  color: string
}

interface VisualizationProps {
  incidents: FlashcardIncident[]
  loading?: boolean
}

export default function DataVisualization({ incidents, loading = false }: VisualizationProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  // Memoized chart data to avoid recalculation on every render
  const chartData = useMemo(() => {
    if (!incidents.length) return []

    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    const dateRange = Array.from({ length: days }, (_, i) => {
      const date = subDays(new Date(), days - 1 - i)
      return {
        date: format(date, 'yyyy-MM-dd'),
        displayDate: format(date, 'MMM dd'),
        incidents: 0,
        repairs: 0,
        successfulRepairs: 0,
        totalConfidence: 0,
        confidenceCount: 0
      }
    })

    // Process incidents
    incidents.forEach(incident => {
      const incidentDate = format(new Date(incident.detected_at), 'yyyy-MM-dd')
      const dayData = dateRange.find(d => d.date === incidentDate)
      
      if (dayData) {
        dayData.incidents++
        dayData.totalConfidence += incident.diagnosis.confidence
        dayData.confidenceCount++
        
        if (incident.action.repair_attempted) {
          dayData.repairs++
          if (incident.action.repair_success) {
            dayData.successfulRepairs++
          }
        }
      }
    })

    // Calculate derived metrics
    return dateRange.map(day => ({
      date: day.displayDate,
      incidents: day.incidents,
      repairs: day.repairs,
      successRate: day.repairs > 0 ? (day.successfulRepairs / day.repairs) * 100 : 0,
      confidence: day.confidenceCount > 0 ? (day.totalConfidence / day.confidenceCount) * 100 : 0
    }))
  }, [incidents, timeRange])

  const statusDistribution = useMemo(() => {
    const distribution = incidents.reduce((acc, incident) => {
      const status = incident.diagnosis.status
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const colors = {
      UP: '#22c55e',
      DOWN: '#ef4444',
      UNKNOWN: '#6b7280'
    }

    return Object.entries(distribution).map(([status, count]) => ({
      name: status,
      value: count,
      color: colors[status as keyof typeof colors] || '#6b7280'
    }))
  }, [incidents])

  const confidenceDistribution = useMemo(() => {
    const ranges = [
      { name: '90-100%', min: 0.9, max: 1.0, color: '#22c55e' },
      { name: '70-89%', min: 0.7, max: 0.89, color: '#84cc16' },
      { name: '50-69%', min: 0.5, max: 0.69, color: '#eab308' },
      { name: '<50%', min: 0, max: 0.49, color: '#ef4444' }
    ]

    return ranges.map(range => {
      const count = incidents.filter(incident => 
        incident.diagnosis.confidence >= range.min && 
        incident.diagnosis.confidence <= range.max
      ).length
      
      return {
        name: range.name,
        value: count,
        color: range.color
      }
    }).filter(range => range.value > 0)
  }, [incidents])

  // Recent trends
  const recentTrend = useMemo(() => {
    if (chartData.length < 2) return { trend: 'stable', change: 0 }
    
    const recent = chartData.slice(-7) // Last 7 days
    const earlier = chartData.slice(-14, -7) // Previous 7 days
    
    const recentAvg = recent.reduce((sum, d) => sum + d.incidents, 0) / recent.length
    const earlierAvg = earlier.reduce((sum, d) => sum + d.incidents, 0) / earlier.length
    
    if (earlierAvg === 0) return { trend: 'stable', change: 0 }
    
    const change = ((recentAvg - earlierAvg) / earlierAvg) * 100
    const trend = Math.abs(change) < 10 ? 'stable' : change > 0 ? 'increasing' : 'decreasing'
    
    return { trend, change: Math.abs(change) }
  }, [chartData])

  const averageSuccessRate = useMemo(() => {
    const validData = chartData.filter(d => d.repairs > 0)
    if (validData.length === 0) return 100
    
    return validData.reduce((sum, d) => sum + d.successRate, 0) / validData.length
  }, [chartData])

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader>
              <div className="animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse">
                <div className="h-48 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics & Insights</h2>
          <p className="text-gray-900">Historical performance and trends</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeRange === range 
                    ? 'bg-white shadow-sm text-gray-900' 
                    : 'text-gray-800 hover:text-gray-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trend Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-800">Incident Trend</p>
                <div className="flex items-center gap-2">
                  {recentTrend.trend === 'increasing' ? (
                    <TrendingUp className="w-4 h-4 text-red-500" />
                  ) : recentTrend.trend === 'decreasing' ? (
                    <TrendingDown className="w-4 h-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4 bg-gray-400 rounded-full" />
                  )}
                  <span className={`text-sm font-medium ${
                    recentTrend.trend === 'increasing' ? 'text-red-600' :
                    recentTrend.trend === 'decreasing' ? 'text-green-600' :
                    'text-gray-800'
                  }`}>
                    {recentTrend.change.toFixed(1)}% {recentTrend.trend}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-800">Avg Success Rate</p>
              <p className="text-2xl font-bold text-green-600">
                {averageSuccessRate.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-800">Total Incidents</p>
              <p className="text-2xl font-bold text-gray-900">
                {incidents.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Incidents & Repairs Timeline
            </CardTitle>
            <CardDescription>
              Daily incident count and repair success over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  fontSize={12}
                  tick={{ fontSize: 10 }}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  labelFormatter={(value) => `Date: ${value}`}
                  formatter={(value, name) => [
                    typeof value === 'number' ? value.toFixed(name === 'successRate' ? 1 : 0) : value,
                    name === 'incidents' ? 'Incidents' :
                    name === 'repairs' ? 'Repairs' :
                    name === 'successRate' ? 'Success Rate (%)' : name
                  ]}
                />
                <Legend />
                <Bar dataKey="incidents" fill="#3b82f6" name="Incidents" />
                <Bar dataKey="repairs" fill="#10b981" name="Repairs" />
                <Line 
                  type="monotone" 
                  dataKey="successRate" 
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Success Rate (%)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Confidence Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5" />
              AI Confidence Distribution
            </CardTitle>
            <CardDescription>
              Distribution of diagnosis confidence levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={confidenceDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value, percent }) => 
                    `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {confidenceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>
              Breakdown of incident statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value, percent }) => 
                    `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Repair Success Rate Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Repair Success Rate Trend</CardTitle>
            <CardDescription>
              Success rate of automated repairs over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.filter(d => d.repairs > 0)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  fontSize={12}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  domain={[0, 100]}
                  fontSize={12}
                />
                <Tooltip 
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Success Rate']}
                />
                <Line 
                  type="monotone" 
                  dataKey="successRate" 
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}