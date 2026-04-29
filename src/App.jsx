import { useState, useEffect } from 'react';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { useCalendar } from './hooks/useCalendar';
import { CalendarWeekView } from './components/CalendarWeekView';
import { GmailSection } from './components/GmailSection';
import { DriveSection } from './components/DriveSection';
import { TasksPanel } from './components/TasksPanel';

function App() {
	const { isAuthenticated, handleAuthClick, handleSignoutClick } = useGoogleAuth();
	const {
		events, loading, error, weekStart,
		myCalendars, otherCalendars, selectedIds, toggleCalendar,
		saveEvent, deleteEvent, goToPreviousWeek, goToNextWeek,
	} = useCalendar(isAuthenticated);

	const [tasksOpen, setTasksOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : true));

	// Ensure initial state respects small-screen default, but let the user control afterwards
	useEffect(() => {
		// no-op on client mount; state already initialized from window width
	}, []);

	return (
		<div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Google Sans', Roboto, Arial, sans-serif" }}>
			{/* AppBar */}
			<header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
				<div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="flex gap-0.5">
							<div className="w-2 h-2 rounded-full bg-blue-500" />
							<div className="w-2 h-2 rounded-full bg-red-500" />
							<div className="w-2 h-2 rounded-full bg-yellow-400" />
							<div className="w-2 h-2 rounded-full bg-green-500" />
						</div>
						<span className="text-xl font-semibold text-gray-700 tracking-tight">Mi Dashboard</span>
					</div>
					{isAuthenticated && (
						<button
							onClick={handleSignoutClick}
							className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors"
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-gray-500">
								<path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
							</svg>
							Cerrar sesión
						</button>
					)}
				</div>
			</header>

			<main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
				{!isAuthenticated ? (
					/* ── Sign-in ── */
					<div className="flex flex-col items-center justify-center py-24 gap-6">
						<div className="flex gap-1.5 mb-2">
							<div className="w-3 h-3 rounded-full bg-blue-500" />
							<div className="w-3 h-3 rounded-full bg-red-500" />
							<div className="w-3 h-3 rounded-full bg-yellow-400" />
							<div className="w-3 h-3 rounded-full bg-green-500" />
						</div>
						<h1 className="text-3xl font-semibold text-gray-800">Mi Dashboard</h1>
						<p className="text-gray-500 text-base">Accede a tu calendario, correos y archivos en un solo lugar.</p>
						<button
							onClick={handleAuthClick}
							className="flex items-center gap-3 px-6 py-3 bg-white border border-gray-300 rounded-xl shadow-sm hover:shadow-md text-gray-700 font-medium text-sm transition-all"
						>
							<svg width="20" height="20" viewBox="0 0 24 24">
								<path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
								<path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
								<path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
								<path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
							</svg>
							Iniciar sesión con Google
						</button>
					</div>
				) : (
					<div className="space-y-8">
						{/* ── Section 1: Calendario + Tasks ── */}
						<section>
							<div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
								<div className="flex items-center gap-2">
									<svg width="18" height="18" viewBox="0 0 24 24" fill="#4285f4">
										<path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/>
									</svg>
									<h2 className="text-base font-semibold text-gray-700">Calendario</h2>
								</div>

								<div
									role="button"
									tabIndex={0}
									onClick={() => setTasksOpen(o => !o)}
									onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setTasksOpen(o => !o); }}
									className="flex items-center gap-2 cursor-pointer select-none"
									aria-expanded={tasksOpen}
								>
									<svg width="18" height="18" viewBox="0 0 24 24" fill="#4285f4">
										<path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>
									</svg>
									<h2 className="text-base font-semibold text-gray-700">Tareas</h2>
								</div>
							</div>

							{/* Flex row: calendar (flex-1) + tasks panel (fixed width)
							    645px = toolbar ~53px + day-headers ~72px + grid 520px */}
							<div className="flex gap-4" style={{ height: '645px' }}>
								<div className="flex-1 min-w-0 h-full">
									<CalendarWeekView
										events={events}
										loading={loading}
										error={error}
										weekStart={weekStart}
										onPrevious={goToPreviousWeek}
										onNext={goToNextWeek}
										onSaveEvent={saveEvent}
										onDeleteEvent={deleteEvent}
										myCalendars={myCalendars}
										otherCalendars={otherCalendars}
										selectedIds={selectedIds}
										onToggleCalendar={toggleCalendar}
									/>
								</div>

								<div
									className="flex-shrink-0 h-full transition-all duration-300 ease-in-out"
									style={{ width: tasksOpen ? '18rem' : '0px', overflow: 'hidden' }}
									aria-hidden={!tasksOpen}
								>
									<div className={`h-full transition-opacity duration-200 ${tasksOpen ? 'opacity-100' : 'opacity-0'}`}>
										<TasksPanel showHeader={false} />
									</div>
								</div>
							</div>
						</section>

						{/* ── Section 2: Gmail ── */}
						<section>
							<div className="flex items-center gap-2 mb-3">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="#ea4335">
									<path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
								</svg>
								<h2 className="text-base font-semibold text-gray-700">Gmail</h2>
							</div>
							<GmailSection />
						</section>

						{/* ── Section 3: Drive ── */}
						<section>
							<div className="flex items-center gap-2 mb-3">
								<svg width="18" height="18" viewBox="0 0 24 24">
									<path fill="#4285f4" d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5z"/>
									<path fill="#0f9d58" d="M12.66 3.5h-4.95L14.28 15h9.56z"/>
									<path fill="#fbbc04" d="M17.61 15H7.58l-3.43 6h13.04z"/>
								</svg>
								<h2 className="text-base font-semibold text-gray-700">Google Drive</h2>
							</div>
							<DriveSection />
						</section>
					</div>
				)}
			</main>
		</div>
	);
}

export default App;
