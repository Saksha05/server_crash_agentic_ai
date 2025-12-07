import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { FlashcardIncident, SystemStats } from '@/types'

export async function GET() {
  try {
    // Read incidents from flashcards file
    const incidents = await readIncidents()
    
    // Calculate statistics
    const stats = calculateStats(incidents)
    
    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error calculating stats:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to calculate system statistics',
        data: {
          uptimePercentage: 0,
          averageRepairTime: 0,
          incidentsLast24h: 0,
          averageConfidence: 0
        }
      },
      { status: 500 }
    )
  }
}

async function readIncidents(): Promise<FlashcardIncident[]> {
  try {
    const flashcardsPath = path.join(
      process.cwd(),
      '..',
      'agentic-ai',
      'agent_flashcards.jsonl'
    )
    
    const fileContent = await readFile(flashcardsPath, 'utf-8')
    
    return fileContent
      .trim()
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => JSON.parse(line))
  } catch (error) {
    // File might not exist yet
    return []
  }
}

function calculateStats(incidents: FlashcardIncident[]): SystemStats {
  if (incidents.length === 0) {
    return {
      uptimePercentage: 100,
      averageRepairTime: 0,
      incidentsLast24h: 0,
      averageConfidence: 0
    }
  }

  // Calculate incidents in last 24 hours
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  const incidentsLast24h = incidents.filter(incident => 
    new Date(incident.detected_at) >= oneDayAgo
  ).length

  // Calculate uptime percentage (assume DOWN incidents represent downtime)
  const downIncidents = incidents.filter(incident => 
    incident.diagnosis.status === 'DOWN'
  )
  
  // Simple uptime calculation: assume each incident represents 1 minute of downtime
  const totalDowntimeMinutes = downIncidents.length * 1 // 1 minute per incident
  const totalPeriodMinutes = 30 * 24 * 60 // Last 30 days in minutes
  const uptimePercentage = Math.max(0, 100 - (totalDowntimeMinutes / totalPeriodMinutes * 100))

  // Calculate average repair time (simplified - using confidence as proxy for speed)
  const repairedIncidents = incidents.filter(incident => 
    incident.action.repair_attempted && incident.action.repair_success
  )
  
  const averageRepairTime = repairedIncidents.length > 0 
    ? repairedIncidents.reduce((sum, incident) => 
        sum + (1 - incident.diagnosis.confidence) * 30, 0 // Higher confidence = faster repair
      ) / repairedIncidents.length
    : 0

  // Calculate average confidence
  const averageConfidence = incidents.length > 0
    ? incidents.reduce((sum, incident) => sum + incident.diagnosis.confidence, 0) / incidents.length
    : 0

  return {
    uptimePercentage,
    averageRepairTime,
    incidentsLast24h,
    averageConfidence
  }
}