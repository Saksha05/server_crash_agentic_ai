export interface Diagnosis {
  status: 'UP' | 'DOWN' | 'UNKNOWN'
  reason: string
  detailed_diagnosis?: string
  confidence: number
}

export interface Action {
  repair_attempted: boolean
  repair_action: string
  repair_success: boolean
  repair_output: string
}

export interface Verification {
  verified: boolean
  verification_response: string
  post_repair_status: 'UP' | 'DOWN' | 'UNKNOWN'
}

export interface Metadata {
  nginx_logs_length: number
  health_check_successful: boolean
  workflow_completed: boolean
}

export interface FlashcardIncident {
  detected_at: string
  diagnosis: Diagnosis
  action: Action
  verification: Verification
  metadata: Metadata
}

export interface MonitoringStatus {
  isRunning: boolean
  lastCheck: string | null
  currentStatus: 'UP' | 'DOWN' | 'UNKNOWN'
  nextCheckIn: number
  totalIncidents: number
  successfulRepairs: number
}

export interface SSHConnectionStatus {
  connected: boolean
  host: string
  lastConnected: string | null
  errorMessage: string | null
}

export interface SystemStats {
  uptimePercentage: number
  averageRepairTime: number
  incidentsLast24h: number
  averageConfidence: number
}