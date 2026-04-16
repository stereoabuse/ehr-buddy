/**
 * Google Calendar API wrapper.
 * - List events for a date range (agenda view)
 * - Create events when saving a session
 */

import { google } from 'googleapis'
import { getAuthClient, isConnected } from './auth'

export interface CalendarEvent {
  id: string
  summary: string
  start: string      // ISO datetime or date
  end: string        // ISO datetime or date
  allDay: boolean
}

/**
 * Fetch events from the user's primary calendar for a given date range.
 */
export async function listEvents(fromDate: string, toDate: string): Promise<CalendarEvent[]> {
  if (!isConnected()) return []

  const auth = getAuthClient()
  const cal = google.calendar({ version: 'v3', auth })

  const res = await cal.events.list({
    calendarId: 'primary',
    timeMin: `${fromDate}T00:00:00Z`,
    timeMax: `${toDate}T23:59:59Z`,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100
  })

  return (res.data.items ?? []).map((e) => ({
    id: e.id ?? '',
    summary: e.summary ?? '(No title)',
    start: e.start?.dateTime ?? e.start?.date ?? '',
    end: e.end?.dateTime ?? e.end?.date ?? '',
    allDay: !e.start?.dateTime
  }))
}

/**
 * Create a calendar event for a session.
 * Returns the Google event ID (stored on the session row).
 */
export async function createSessionEvent(opts: {
  clientFirstName: string
  sessionDate: string   // YYYY-MM-DD
  startTime: string     // HH:MM
  endTime: string       // HH:MM
  cptCode: string
}): Promise<string | null> {
  if (!isConnected()) return null

  const auth = getAuthClient()
  const cal = google.calendar({ version: 'v3', auth })

  const res = await cal.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: `Session — ${opts.clientFirstName}`,
      description: `CPT: ${opts.cptCode}\nSession note in EHR Buddy`,
      start: { dateTime: `${opts.sessionDate}T${opts.startTime}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      end: { dateTime: `${opts.sessionDate}T${opts.endTime}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
    }
  })

  return res.data.id ?? null
}

/**
 * Delete a calendar event (when a session is deleted).
 */
export async function deleteSessionEvent(eventId: string): Promise<void> {
  if (!isConnected() || !eventId) return

  const auth = getAuthClient()
  const cal = google.calendar({ version: 'v3', auth })

  try {
    await cal.events.delete({ calendarId: 'primary', eventId })
  } catch {
    // Event may already be deleted — swallow
    console.warn(`[google/calendar] failed to delete event ${eventId}`)
  }
}
