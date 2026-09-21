/**
 * iCalendar (.ics) Obligation & Deadline Exporter.
 *
 * Implements TECH.md §2:
 * Generates an RFC 5545 compliant calendar export of key contractual dates,
 * lock-in expirations, renewal notices, and payment reminders.
 */

export interface CalendarEvent {
  title: string;
  description: string;
  startDate: string; // YYYYMMDD or YYYYMMDDTHHMMSSZ
  endDate?: string;
  recurrenceRule?: string; // e.g. RRULE:FREQ=MONTHLY;BYMONTHDAY=5
}

export function generateIcs(events: CalendarEvent[], docTitle = 'Contract Deadlines'): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PlainClause//Legal Assistant//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${docTitle}`,
  ];

  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const uid = `plainclause-${Date.now()}-${i}@plainclause.local`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`DTSTART:${ev.startDate}`);
    if (ev.endDate) {
      lines.push(`DTEND:${ev.endDate}`);
    }
    lines.push(`SUMMARY:${ev.title.replace(/\n/g, ' ')}`);
    lines.push(`DESCRIPTION:${ev.description.replace(/\n/g, '\\n')}`);
    if (ev.recurrenceRule) {
      lines.push(ev.recurrenceRule);
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
