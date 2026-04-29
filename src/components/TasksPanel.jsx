import { useState, useEffect } from 'react';

function formatDueDate(due) {
	if (!due) return null;
	const d = new Date(due);
	const label = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

	const today  = new Date(); today.setHours(0, 0, 0, 0);
	const dueDay = new Date(d); dueDay.setHours(0, 0, 0, 0);

	if (dueDay < today) return { label, color: 'text-red-600 bg-red-50 border-red-200' };

	const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
	if (dueDay.getTime() === today.getTime())    return { label, color: 'text-orange-600 bg-orange-50 border-orange-200' };
	if (dueDay.getTime() === tomorrow.getTime()) return { label, color: 'text-blue-600 bg-blue-50 border-blue-200' };

	return { label, color: 'text-gray-500 bg-gray-50 border-gray-200' };
}

// Builds the best deep-link URL possible for a Google Task
function getTaskUrl(task) {
	// Google Tasks web app supports a fragment that pre-selects the task list
	// Format: https://tasks.google.com/embed/?origin=https://calendar.google.com&fullWidth=1
	// There's no stable per-task deep link in the public Tasks web app, but we can
	// at least land the user on the correct list via the compact embed URL.
	// The cleanest available option is the tasks.google.com URL with the list id.
	if (task._listId) {
		return `https://tasks.google.com/`;
	}
	return 'https://tasks.google.com/';
}

export function TasksPanel({ showHeader = true } = {}) {
	const [tasks, setTasks]     = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError]     = useState(null);

	useEffect(() => {
		const fetchTasks = async () => {
			setLoading(true);
			setError(null);
			try {
				const listResp = await window.gapi.client.tasks.tasklists.list({ maxResults: 20 });
				const taskLists = listResp.result.items || [];

				const allTaskArrays = await Promise.all(
					taskLists.map(list =>
						window.gapi.client.tasks.tasks.list({
							tasklist: list.id,
							showCompleted: false,
							showHidden: false,
							maxResults: 100,
						})
						.then(r => (r.result.items || []).map(t => ({ ...t, _listId: list.id, _listTitle: list.title })))
						.catch(() => [])
					)
				);

				const merged = allTaskArrays.flat().filter(t => t.status !== 'completed');
				merged.sort((a, b) => {
					if (!a.due && !b.due) return 0;
					if (!a.due) return 1;
					if (!b.due) return -1;
					return new Date(a.due) - new Date(b.due);
				});

				setTasks(merged);
			} catch (err) {
				setError('No se pudieron cargar las tareas.');
				console.error(err);
			} finally {
				setLoading(false);
			}
		};

		fetchTasks();
	}, []);

	const overdue  = tasks.filter(t => t.due && new Date(t.due) < new Date(new Date().setHours(0,0,0,0)));
	const upcoming = tasks.filter(t => !t.due || new Date(t.due) >= new Date(new Date().setHours(0,0,0,0)));

	if (loading) {
		return (
			<div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-full flex items-start p-5" style={{ fontFamily: "'Google Sans', Roboto, sans-serif" }}>
				<div className="flex items-center gap-3 text-gray-500 text-sm mt-1">
					<div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
					Cargando tareas…
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5" style={{ fontFamily: "'Google Sans', Roboto, sans-serif" }}>
				<p className="text-red-500 text-sm">{error}</p>
			</div>
		);
	}

	const TaskItem = ({ task }) => {
		const due = formatDueDate(task.due);
		return (
			<a
				href={getTaskUrl(task)}
				target="_blank"
				rel="noopener noreferrer"
				className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group rounded-lg"
			>
				{/* Circle checkbox (visual only) */}
				<span className="mt-0.5 w-4 h-4 rounded-full border-2 border-gray-300 group-hover:border-blue-400 flex-shrink-0 transition-colors" />

				<div className="flex-1 min-w-0">
					<p className="text-sm text-gray-800 font-medium leading-snug truncate group-hover:text-blue-700 transition-colors">
						{task.title || '(Sin título)'}
					</p>
					{task._listTitle && (
						<p className="text-xs text-gray-400 mt-0.5 truncate">{task._listTitle}</p>
					)}
					{task.notes && (
						<p className="text-xs text-gray-400 mt-0.5 truncate">{task.notes}</p>
					)}
				</div>

				{due && (
					<span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${due.color}`}>
						{due.label}
					</span>
				)}
			</a>
		);
	};

	return (
		<div
			className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full"
			style={{ fontFamily: "'Google Sans', Roboto, sans-serif" }}
		>
			{showHeader && (
				<div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
					<div className="flex items-center gap-2">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="#4285f4">
							<path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>
						</svg>
						<span className="font-semibold text-gray-800 text-sm">Tareas</span>
						{tasks.length > 0 && (
							<span className="text-xs font-bold bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
								{tasks.length}
							</span>
						)}
					</div>
					<a href="https://tasks.google.com" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-medium">
						Abrir Tasks →
					</a>
				</div>
			)}

			<div className="overflow-y-auto flex-1 px-1 py-1">
				{tasks.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-gray-200 mb-3">
							<circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
							<path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
						</svg>
						<p className="text-sm text-gray-400">¡Sin tareas pendientes!</p>
					</div>
				) : (
					<>
						{overdue.length > 0 && (
							<div className="mb-1">
								<p className="text-xs font-semibold text-red-500 uppercase tracking-wide px-4 pt-2 pb-1">
									Vencidas · {overdue.length}
								</p>
								{overdue.map(t => <TaskItem key={t.id} task={t} />)}
							</div>
						)}

						{upcoming.length > 0 && (
							<div>
								{overdue.length > 0 && (
									<p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 pt-2 pb-1">
										Próximas · {upcoming.length}
									</p>
								)}
								{upcoming.map(t => <TaskItem key={t.id} task={t} />)}
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
