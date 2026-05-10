import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarAuthExpired, CalendarEvent, fetchEventsForWeek } from '../services/googleCalendar';
import { CALENDAR_TOKEN_KEY, requestGoogleCalendarAccess } from '../components/Login';

interface State {
  events: CalendarEvent[];
  loading: boolean;
  needsReconnect: boolean;
}

export function useGoogleCalendar(weekId: string) {
  const [state, setState] = useState<State>({ events: [], loading: false, needsReconnect: false });
  const cacheRef = useRef<Map<string, CalendarEvent[]>>(new Map());

  const load = useCallback(async (force = false) => {
    const token = sessionStorage.getItem(CALENDAR_TOKEN_KEY);
    if (!token) {
      setState({ events: [], loading: false, needsReconnect: true });
      return;
    }

    if (!force && cacheRef.current.has(weekId)) {
      setState({ events: cacheRef.current.get(weekId)!, loading: false, needsReconnect: false });
      return;
    }

    setState(s => ({ ...s, loading: true }));
    try {
      const events = await fetchEventsForWeek(weekId, token);
      cacheRef.current.set(weekId, events);
      setState({ events, loading: false, needsReconnect: false });
    } catch (e) {
      if (e instanceof CalendarAuthExpired) {
        sessionStorage.removeItem(CALENDAR_TOKEN_KEY);
        setState({ events: [], loading: false, needsReconnect: true });
      } else {
        console.error('Calendar load failed', e);
        setState({ events: [], loading: false, needsReconnect: false });
      }
    }
  }, [weekId]);

  useEffect(() => {
    load();
  }, [load]);

  const reconnect = useCallback(async () => {
    const token = await requestGoogleCalendarAccess();
    if (token) {
      cacheRef.current.clear();
      await load(true);
    }
  }, [load]);

  return { ...state, reconnect };
}
