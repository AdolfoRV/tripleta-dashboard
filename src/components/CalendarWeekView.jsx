import { useState, useRef, useCallback } from 'react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HOUR_HEIGHT = 60; // px per hour

function getDayLabel(date) {
	return DAYS[(date.getDay() + 6) % 7];
}

function formatHour(h) {
	if (h === 0) return '12 AM';
	if (h < 12) return `${h} AM`;
	if (h === 12) return '12 PM';
	return `${h - 12} PM`;
}

function toLocalISO(date) {
	const pad = n => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getEventPosition(event) {
	const startStr = event.start?.dateTime || event.start?.date;
	const endStr = event.end?.dateTime || event.end?.date;
	if (!startStr || !endStr) return null;
	const start = new Date(startStr);
	const end = new Date(endStr);
	const startMinutes = start.getHours() * 60 + start.getMinutes();
	const durationMinutes = (end - start) / 60000;
	return {
		top: (startMinutes / 60) * HOUR_HEIGHT,
		height: Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20),
		dayIndex: start.getDay(),
		startDate: start,
		endDate: end,
	};
}

function buildDayEventLayout(dayEvents) {
	const sortedEvents = [...dayEvents].sort((a, b) => a.pos.startDate - b.pos.startDate || a.pos.endDate - b.pos.endDate);
	const clusters = [];
	let currentCluster = [];
	let currentClusterEnd = null;
	let columnEnds = [];

	const closeCluster = () => {
		if (currentCluster.length === 0) return;
		const totalColumns = Math.max(1, columnEnds.length);
		clusters.push(
			...currentCluster.map(item => ({
				...item,
				totalColumns,
			}))
		);
		currentCluster = [];
		currentClusterEnd = null;
		columnEnds = [];
	};

	for (const item of sortedEvents) {
		if (currentClusterEnd && item.pos.startDate >= currentClusterEnd) {
			closeCluster();
		}

		let column = 0;
		while (columnEnds[column] && columnEnds[column] > item.pos.startDate) {
			column += 1;
		}
		columnEnds[column] = item.pos.endDate;
		currentCluster.push({ ...item, column });
		currentClusterEnd = currentClusterEnd ? new Date(Math.max(currentClusterEnd.getTime(), item.pos.endDate.getTime())) : item.pos.endDate;
	}

	closeCluster();
	return clusters;
}

// ── Event Modal ──────────────────────────────────────────────────────────────
function EventModal({ event, onClose, onSave, onDelete, defaultStart }) {
	const isNew = !event?.id;
	const initialStart = event?.start?.dateTime
		? toLocalISO(new Date(event.start.dateTime))
		: defaultStart || toLocalISO(new Date());
	const initialEnd = event?.end?.dateTime
		? toLocalISO(new Date(event.end.dateTime))
		: (() => { const d = new Date(initialStart); d.setHours(d.getHours() + 1); return toLocalISO(d); })();

	const [form, setForm] = useState({ summary: event?.summary || '', description: event?.description || '', start: initialStart, end: initialEnd });
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const handleSave = async () => {
		if (!form.summary.trim()) return;
		setSaving(true);
		try {
			await onSave({ id: event?.id, _calendarId: event?._calendarId, summary: form.summary, description: form.description, start: new Date(form.start).toISOString(), end: new Date(form.end).toISOString() });
			onClose();
		} finally { setSaving(false); }
	};

	const handleDelete = async () => {
		if (!event?.id) return;
		setDeleting(true);
		try { await onDelete(event.id, event._calendarId); onClose(); }
		finally { setDeleting(false); }
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} onClick={onClose}>
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()} style={{ fontFamily: "'Google Sans', Roboto, sans-serif" }}>
				<div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
					<h2 className="text-lg font-semibold text-gray-800">{isNew ? 'Nuevo evento' : 'Editar evento'}</h2>
					<button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
					</button>
				</div>
				<div className="px-6 py-5 space-y-4">
					<input type="text" placeholder="Agregar título" value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} className="w-full text-xl font-medium border-0 border-b-2 border-blue-500 outline-none pb-1 placeholder-gray-300 text-gray-800 bg-transparent" />
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-medium text-gray-500 mb-1">Inicio</label>
							<input type="datetime-local" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
						</div>
						<div>
							<label className="block text-xs font-medium text-gray-500 mb-1">Fin</label>
							<input type="datetime-local" value={form.end} onChange={e => setForm(f => ({ ...f, end: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
						</div>
					</div>
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
						<textarea placeholder="Agregar descripción" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
					</div>
				</div>
				<div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
					<div>
						{!isNew && (
							<button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
								{deleting ? 'Eliminando…' : 'Eliminar'}
							</button>
						)}
					</div>
					<div className="flex gap-3">
						<button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">Cancelar</button>
						<button onClick={handleSave} disabled={saving || !form.summary.trim()} className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors shadow-sm">
							{saving ? 'Guardando…' : 'Guardar'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

// ── Calendar Selector Dropdown ────────────────────────────────────────────────
function CalendarSelector({ myCalendars, otherCalendars, selectedIds, onToggle }) {
	const [open, setOpen] = useState(false);

	const CalGroup = ({ title, items }) => (
		items.length > 0 && (
			<div className="mb-2">
				<p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 pt-2 pb-1">{title}</p>
				{items.map(cal => {
					const checked = selectedIds.has(cal.id);
					const color = cal.backgroundColor || '#4285f4';
					return (
						<label key={cal.id} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors">
							<span
								className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors"
								style={{ backgroundColor: checked ? color : 'transparent', borderColor: color }}
								onClick={() => onToggle(cal.id)}
							>
								{checked && (
									<svg width="10" height="10" viewBox="0 0 12 12" fill="white">
										<path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								)}
							</span>
							<span className="text-sm text-gray-700 truncate max-w-[180px]" onClick={() => onToggle(cal.id)}>
								{cal.summary}
							</span>
						</label>
					);
				})}
			</div>
		)
	);

	return (
		<div className="relative">
			<button
				onClick={() => setOpen(o => !o)}
				className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
			>
				<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-gray-500">
					<path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
				</svg>
				Calendarios
				<span className="text-xs bg-blue-100 text-blue-700 rounded-full px-1.5 font-semibold">
					{selectedIds.size}
				</span>
				<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
					<path d="M7 10l5 5 5-5z" />
				</svg>
			</button>

			{open && (
				<>
					<div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
					<div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-64 py-1">
						<CalGroup title="Mis calendarios" items={myCalendars} />
						<CalGroup title="Otros calendarios" items={otherCalendars} />
						{myCalendars.length === 0 && otherCalendars.length === 0 && (
							<p className="text-xs text-gray-400 px-3 py-2">Cargando calendarios…</p>
						)}
					</div>
				</>
			)}
		</div>
	);
}

// ── CalendarWeekView ─────────────────────────────────────────────────────────
export function CalendarWeekView({ events, loading, error, weekStart, onPrevious, onNext, onSaveEvent, onDeleteEvent, myCalendars, otherCalendars, selectedIds, onToggleCalendar }) {
	const [selectedEvent, setSelectedEvent] = useState(null);
	const [modalOpen, setModalOpen] = useState(false);
	const [newEventStart, setNewEventStart] = useState(null);

	const today = new Date();

	const days = Array.from({ length: 7 }, (_, i) => {
		const d = new Date(weekStart);
		d.setDate(d.getDate() + i);
		return d;
	});

	const monthYear = days[3].toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

	const isToday = (date) =>
		date.getDate() === today.getDate() &&
		date.getMonth() === today.getMonth() &&
		date.getFullYear() === today.getFullYear();

	const handleGridClick = useCallback((e, dayIndex) => {
		if (e.target.closest('[data-event]')) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const y = e.clientY - rect.top;
		const minutesFromTop = (y / HOUR_HEIGHT) * 60;
		const hours = Math.floor(minutesFromTop / 60);
		const minutes = Math.round((minutesFromTop % 60) / 15) * 15;
		const clickedDay = new Date(days[dayIndex]);
		clickedDay.setHours(Math.min(hours, 23), minutes, 0, 0);
		setNewEventStart(toLocalISO(clickedDay));
		setSelectedEvent(null);
		setModalOpen(true);
	}, [days]);

	const handleEventClick = useCallback((e, event) => {
		e.stopPropagation();
		setSelectedEvent(event);
		setNewEventStart(null);
		setModalOpen(true);
	}, []);

	// Group events by day column
	const eventsByDay = {};
	for (let i = 0; i < 7; i++) eventsByDay[i] = [];

	events.forEach(event => {
		const pos = getEventPosition(event);
		if (!pos) return;
		const dayOffset = days.findIndex(d =>
			d.getDate() === pos.startDate.getDate() &&
			d.getMonth() === pos.startDate.getMonth() &&
			d.getFullYear() === pos.startDate.getFullYear()
		);
		if (dayOffset >= 0) eventsByDay[dayOffset].push({ event, pos });
	});

	const layoutByDay = {};
	for (let i = 0; i < 7; i++) {
		layoutByDay[i] = buildDayEventLayout(eventsByDay[i] || []);
	}

	// Current time
	const nowMinutes = today.getHours() * 60 + today.getMinutes();
	const nowTop = (nowMinutes / 60) * HOUR_HEIGHT;
	const todayOffset = days.findIndex(d => isToday(d));

	// Resolve event color from its calendar
	const allCalendars = [...(myCalendars || []), ...(otherCalendars || [])];
	function getEventColor(event) {
		const cal = allCalendars.find(c => c.id === event._calendarId);
		return cal?.backgroundColor || event.colorId || '#4285f4';
	}

	return (
		<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden" style={{ fontFamily: "'Google Sans', Roboto, sans-serif" }}>
			{/* Toolbar */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 gap-3 flex-wrap">
				<div className="flex items-center gap-3">
					<div className="flex items-center">
						<button onClick={onPrevious} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
						</button>
						<button onClick={onNext} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
						</button>
					</div>
					<span className="text-base font-semibold text-gray-800 capitalize">{monthYear}</span>
					{loading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
				</div>

				<div className="flex items-center gap-2">
					<CalendarSelector
						myCalendars={myCalendars || []}
						otherCalendars={otherCalendars || []}
						selectedIds={selectedIds || new Set()}
						onToggle={onToggleCalendar}
					/>
					<button
						onClick={() => { setSelectedEvent(null); setNewEventStart(null); setModalOpen(true); }}
						className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
						Nuevo
					</button>
					<a
						href="https://calendar.google.com"
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs text-blue-600 hover:underline font-medium"
					>
						Abrir Calendar →
					</a>
				</div>
			</div>

			{error && <div className="px-4 py-2 bg-red-50 text-red-600 text-sm border-b border-red-100">{error}</div>}

			{/* Day headers */}
			<div className="flex border-b border-gray-200 bg-white">
				<div className="w-14 flex-shrink-0" />
				{days.map((day, i) => {
					const todayFlag = isToday(day);
					return (
						<div key={i} className="flex-1 flex flex-col items-center py-2">
							<span className={`text-xs font-medium uppercase tracking-wide ${todayFlag ? 'text-blue-600' : 'text-gray-500'}`}>
								{getDayLabel(day)}
							</span>
							<span className={`text-xl font-medium mt-0.5 w-9 h-9 flex items-center justify-center rounded-full ${todayFlag ? 'bg-blue-600 text-white' : 'text-gray-800'}`}>
								{day.getDate()}
							</span>
						</div>
					);
				})}
			</div>

			{/* Time grid */}
			<div className="flex overflow-y-auto" style={{ height: '520px' }}>
				{/* Hour labels */}
				<div className="w-14 flex-shrink-0 relative bg-white">
					{HOURS.map(h => (
						<div key={h} className="absolute w-full flex items-start justify-end pr-2" style={{ top: h * HOUR_HEIGHT - 8, height: HOUR_HEIGHT }}>
							{h > 0 && <span className="text-xs text-gray-400 font-medium">{formatHour(h)}</span>}
						</div>
					))}
				</div>

				{/* Day columns */}
				<div className="flex flex-1 relative">
					{/* Grid lines */}
					<div className="absolute inset-0 pointer-events-none">
						{HOURS.map(h => (
							<div key={h} className="absolute w-full border-t border-gray-100" style={{ top: h * HOUR_HEIGHT }} />
						))}
					</div>

					{days.map((day, dayOffset) => (
						<div
							key={dayOffset}
							className="flex-1 relative border-l border-gray-100 cursor-pointer"
							style={{ minHeight: 24 * HOUR_HEIGHT }}
							onClick={e => handleGridClick(e, dayOffset)}
						>
							{/* Now indicator */}
							{todayOffset === dayOffset && (
								<div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowTop - 1 }}>
									<div className="relative flex items-center">
										<div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5 flex-shrink-0" />
										<div className="flex-1 h-0.5 bg-red-500" />
									</div>
								</div>
							)}

							{/* Events */}
							{(layoutByDay[dayOffset] || []).map(({ event, pos, column, totalColumns }) => {
								const color = getEventColor(event);
								const gap = 4;
								const columnWidth = `calc((100% - ${(totalColumns - 1) * gap}px) / ${totalColumns})`;
								return (
									<div
										key={event.id}
										data-event="true"
										onClick={e => handleEventClick(e, event)}
										className="absolute rounded overflow-hidden cursor-pointer hover:brightness-90 transition-all"
										style={{ top: pos.top + 1, height: pos.height - 2, left: `calc(${column} * (${columnWidth} + ${gap}px) + 2px)`, width: columnWidth, backgroundColor: color, zIndex: 5 }}
									>
										<div className="px-1.5 py-0.5">
											<p className="text-xs font-semibold text-white leading-tight truncate">
												{event.summary || '(Sin título)'}
											</p>
											{pos.height > 36 && (
												<p className="text-xs text-white/80 leading-tight truncate">
													{new Date(event.start.dateTime || event.start.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
												</p>
											)}
										</div>
									</div>
								);
							})}
						</div>
					))}
				</div>
			</div>

			{modalOpen && (
				<EventModal
					event={selectedEvent}
					defaultStart={newEventStart}
					onClose={() => setModalOpen(false)}
					onSave={onSaveEvent}
					onDelete={onDeleteEvent}
				/>
			)}
		</div>
	);
}