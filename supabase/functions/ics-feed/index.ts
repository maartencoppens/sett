import { createClient } from 'npm:@supabase/supabase-js@2'

// Least privilege: the publishable key plus a narrow SQL function. No secret key needed.
const publishableKeys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}')
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  publishableKeys.default ?? Deno.env.get('SUPABASE_ANON_KEY')!,
  { auth: { persistSession: false } },
)

type FeedEvent = {
  id: string
  type: string
  title: string | null
  notes: string | null
  venue: string | null
  address: string | null
  starts_at: string
  ends_at: string
  load_in_at: string | null
  soundcheck_at: string | null
}

const TYPE_LABELS: Record<string, string> = { rehearsal: 'Rehearsal', jam: 'Jam', gig: 'Gig' }

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 })
  }

  // URL: /ics-feed/<token>.ics
  const lastSegment = new URL(req.url).pathname.split('/').pop() ?? ''
  const token = lastSegment.replace(/\.ics$/, '')
  if (!/^[a-f0-9]{48}$/.test(token)) return new Response('Not found', { status: 404 })

  const { data, error } = await supabase.rpc('calendar_feed', { p_token: token })
  if (error) {
    console.error(error)
    return new Response('Something went wrong', { status: 500 })
  }
  if (!data) return new Response('Not found', { status: 404 })

  return new Response(buildCalendar(data.group_name, data.events), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="sett.ics"',
      'Cache-Control': 'private, max-age=300',
    },
  })
})

function buildCalendar(groupName: string, events: FeedEvent[]) {
  const stamp = toIcsDate(new Date().toISOString())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sett//Group calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(`${groupName} · Sett`)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H', // a hint; Apple uses it, Google ignores it
    'X-PUBLISHED-TTL:PT1H',
  ]

  for (const e of events) {
    const label = TYPE_LABELS[e.type] ?? e.type
    const summary = e.title ? (e.type === 'gig' ? `Gig: ${e.title}` : e.title) : label
    const location = [e.venue, e.address].filter(Boolean).join(', ')
    const description = [
      e.load_in_at && `Load-in: ${beforeShow(e.load_in_at, e.starts_at)}`,
      e.soundcheck_at && `Soundcheck: ${beforeShow(e.soundcheck_at, e.starts_at)}`,
      e.notes,
    ]
      .filter(Boolean)
      .join('\n')

    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@sett.maartencoppens.be`, // stable ID → updates instead of duplicates
      `DTSTAMP:${stamp}`,
      `DTSTART:${toIcsDate(e.starts_at)}`,
      `DTEND:${toIcsDate(e.ends_at)}`,
      `SUMMARY:${escapeText(summary)}`,
    )
    if (location) lines.push(`LOCATION:${escapeText(location)}`)
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

/** "2026-10-21T17:00:00.000Z" → "20261021T170000Z" (UTC; the calendar app shows local time) */
function toIcsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Relative time, so the description is right in every time zone: "1 h 30 min before the show" */
function beforeShow(fromIso: string, showIso: string) {
  const minutes = Math.round((new Date(showIso).getTime() - new Date(fromIso).getTime()) / 60_000)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const parts = [h && `${h} h`, m && `${m} min`].filter(Boolean)
  return parts.length ? `${parts.join(' ')} before the show` : 'at show time'
}

/** RFC 5545 text escaping: backslash, semicolon, comma and newlines */
function escapeText(text: string) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** RFC 5545 line folding: max 75 bytes per line, continuation lines start with a space */
function fold(line: string) {
  const encoder = new TextEncoder()
  let result = ''
  let current = ''
  let bytes = 0
  for (const char of line) {
    const size = encoder.encode(char).length
    if (bytes + size > 74) {
      result += current + '\r\n '
      current = ''
      bytes = 1
    }
    current += char
    bytes += size
  }
  return result + current
}