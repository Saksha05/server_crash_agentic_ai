import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { FlashcardIncident } from '@/types'

export async function GET() {
  try {
    // Path to the flashcards file in the Python backend
    const flashcardsPath = path.join(
      process.cwd(),
      '..',
      'agentic-ai',
      'agent_flashcards.jsonl'
    )
    
    // Read the JSONL file
    const fileContent = await readFile(flashcardsPath, 'utf-8')
    
    // Parse each line as JSON
    const incidents: FlashcardIncident[] = fileContent
      .trim()
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => JSON.parse(line))
      .sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime())
    
    return NextResponse.json({
      success: true,
      data: incidents,
      count: incidents.length
    })
  } catch (error) {
    console.error('Error reading flashcards:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to read incident history',
        data: [],
        count: 0
      },
      { status: 500 }
    )
  }
}