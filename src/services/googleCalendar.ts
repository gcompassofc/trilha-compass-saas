export interface CalendarEvent {
  id: string;
  summary: string;
  start: string; // ISO string
  end: string;
  htmlLink: string;
  allDay: boolean;
  colorId?: string;
}

export class CalendarAuthExpired extends Error {
  constructor() {
    super('Google Calendar access expired or missing');
    this.name = 'CalendarAuthExpired';
  }
}

const weekIdToRange = (weekId: string): { timeMin: string; timeMax: string } => {
  const [year, month, day] = weekId.split('-').map(Number);
  const monday = new Date(year, month - 1, day, 0, 0, 0, 0);
  const sundayEnd = new Date(monday);
  sundayEnd.setDate(monday.getDate() + 7);
  return {
    timeMin: monday.toISOString(),
    timeMax: sundayEnd.toISOString(),
  };
};

export const fetchEventsForWeek = async (
  weekId: string,
  accessToken: string
): Promise<CalendarEvent[]> => {
  const { timeMin, timeMax } = weekIdToRange(weekId);
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401 || res.status === 403) {
    throw new CalendarAuthExpired();
  }
  if (!res.ok) {
    throw new Error(`Google Calendar API error: ${res.status}`);
  }
  const data = await res.json();
  const items: any[] = data.items || [];
  return items.map(item => {
    const allDay = !!item.start?.date && !item.start?.dateTime;
    return {
      id: item.id,
      summary: item.summary || '(sem título)',
      start: item.start?.dateTime || item.start?.date,
      end: item.end?.dateTime || item.end?.date,
      htmlLink: item.htmlLink || '',
      allDay,
      colorId: item.colorId,
    } as CalendarEvent;
  });
};
