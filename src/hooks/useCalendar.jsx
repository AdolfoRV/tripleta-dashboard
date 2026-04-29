import { useState, useEffect, useCallback } from 'react';

function getWeekStart(date) {
	const d = new Date(date);
	const day = d.getDay();
	const mondayOffset = day === 0 ? -6 : 1 - day;
	d.setDate(d.getDate() + mondayOffset);
	d.setHours(0, 0, 0, 0);
	return d;
}

function toRFC3339(date) {
	return date.toISOString();
}

export function useCalendar(isAuthenticated) {
	const [events, setEvents] = useState([]);
	const [calendars, setCalendars] = useState([]);
	const [selectedIds, setSelectedIds] = useState(null); // null = not yet initialized
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));

	// ── Fetch calendar list ───────────────────────────────────────────────────
	const fetchCalendars = useCallback(async () => {
		if (!isAuthenticated) return;
		try {
			const resp = await window.gapi.client.calendar.calendarList.list({ minAccessRole: 'reader' });
			const items = resp.result.items || [];
			setCalendars(items);
			// Initialize all calendars as selected on first load
			setSelectedIds(prev => prev ?? new Set(items.map(c => c.id)));
		} catch (err) {
			console.error('Error al cargar la lista de calendarios:', err);
		}
	}, [isAuthenticated]);

	useEffect(() => {
		fetchCalendars();
	}, [fetchCalendars]);

	// ── Fetch events from all selected calendars ──────────────────────────────
	const fetchEvents = useCallback(async () => {
		if (!isAuthenticated || !selectedIds || selectedIds.size === 0) {
			setEvents([]);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const timeMin = new Date(weekStart);
			const timeMax = new Date(weekStart);
			timeMax.setDate(timeMax.getDate() + 7);

			const results = await Promise.all(
				[...selectedIds].map(calendarId =>
					window.gapi.client.calendar.events.list({
						calendarId,
						timeMin: toRFC3339(timeMin),
						timeMax: toRFC3339(timeMax),
						singleEvents: true,
						orderBy: 'startTime',
						maxResults: 250,
					})
					.then(r => (r.result.items || []).map(ev => ({ ...ev, _calendarId: calendarId })))
					.catch(() => [])
				)
			);

			// Merge, deduplicate by id, sort by start
			const merged = results.flat();
			const seen = new Set();
			const unique = merged.filter(ev => {
				if (seen.has(ev.id)) return false;
				seen.add(ev.id);
				return true;
			});
			unique.sort((a, b) => {
				const aTime = new Date(a.start?.dateTime || a.start?.date);
				const bTime = new Date(b.start?.dateTime || b.start?.date);
				return aTime - bTime;
			});

			setEvents(unique);
		} catch (err) {
			setError('Error al cargar los eventos del calendario.');
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, [isAuthenticated, selectedIds, weekStart]);

	useEffect(() => {
		if (selectedIds !== null) fetchEvents();
	}, [fetchEvents, selectedIds]);

	// ── Toggle a calendar on/off ──────────────────────────────────────────────
	const toggleCalendar = useCallback((id) => {
		setSelectedIds(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	// ── Save / delete events ──────────────────────────────────────────────────
	const saveEvent = useCallback(async (eventData) => {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		try {
			if (eventData.id) {
				await window.gapi.client.calendar.events.update({
					calendarId: eventData._calendarId || 'primary',
					eventId: eventData.id,
					resource: {
						summary: eventData.summary,
						description: eventData.description || '',
						start: { dateTime: eventData.start, timeZone: tz },
						end:   { dateTime: eventData.end,   timeZone: tz },
					},
				});
			} else {
				await window.gapi.client.calendar.events.insert({
					calendarId: 'primary',
					resource: {
						summary: eventData.summary,
						description: eventData.description || '',
						start: { dateTime: eventData.start, timeZone: tz },
						end:   { dateTime: eventData.end,   timeZone: tz },
					},
				});
			}
			await fetchEvents();
		} catch (err) {
			console.error('Error guardando evento:', err);
			throw err;
		}
	}, [fetchEvents]);

	const deleteEvent = useCallback(async (eventId, calendarId = 'primary') => {
		try {
			await window.gapi.client.calendar.events.delete({ calendarId, eventId });
			await fetchEvents();
		} catch (err) {
			console.error('Error eliminando evento:', err);
			throw err;
		}
	}, [fetchEvents]);

	// ── Week navigation ───────────────────────────────────────────────────────
	const goToPreviousWeek = useCallback(() =>
		setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; }), []);

	const goToNextWeek = useCallback(() =>
		setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; }), []);

	// Group for UI
	const myCalendars    = calendars.filter(c => c.accessRole === 'owner');
	const otherCalendars = calendars.filter(c => c.accessRole !== 'owner');

	return {
		events,
		loading,
		error,
		weekStart,
		calendars,
		myCalendars,
		otherCalendars,
		selectedIds: selectedIds ?? new Set(),
		toggleCalendar,
		saveEvent,
		deleteEvent,
		goToPreviousWeek,
		goToNextWeek,
		refetch: fetchEvents,
	};
}
