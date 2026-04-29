import { useState, useEffect } from 'react';

function formatDate(internalDate) {
	if (!internalDate) return '';
	const d = new Date(Number(internalDate));
	const now = new Date();
	const isToday = d.toDateString() === now.toDateString();
	if (isToday) return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
	return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function getHeader(headers, name) {
	return headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

function getInitials(name) {
	if (!name) return '?';
	const parts = name.replace(/<.*>/, '').trim().split(' ');
	return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

const AVATAR_COLORS = ['#4285f4', '#ea4335', '#34a853', '#fbbc04', '#ab47bc', '#00acc1'];
function avatarColor(str) {
	let h = 0;
	for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
	return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function GmailSection() {
	const [threads, setThreads] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchEmails = async () => {
			setLoading(true);
			setError(null);
			try {
				// Fetch thread list
				const listResp = await window.gapi.client.gmail.users.threads.list({
					userId: 'me',
					maxResults: 10,
					labelIds: ['INBOX'],
				});
				const threadIds = (listResp.result.threads || []).map(t => t.id);

				// Batch fetch thread details
				const details = await Promise.all(
					threadIds.map(id =>
						window.gapi.client.gmail.users.threads.get({
							userId: 'me',
							id,
							format: 'metadata',
							metadataHeaders: ['From', 'Subject', 'Date'],
						})
					)
				);

				setThreads(details.map(r => r.result));
			} catch (err) {
				setError('No se pudieron cargar los correos.');
				console.error(err);
			} finally {
				setLoading(false);
			}
		};

		fetchEmails();
	}, []);

	const isUnread = (thread) =>
		thread.messages?.some(m => m.labelIds?.includes('UNREAD'));

	if (loading) {
		return (
			<div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
				<div className="flex items-center gap-3 text-gray-500 text-sm">
					<div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
					Cargando correos…
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
				<p className="text-red-500 text-sm">{error}</p>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden" style={{ fontFamily: "'Google Sans', Roboto, sans-serif" }}>
			{/* Header */}
			<div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
				<div className="flex items-center gap-2">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="#ea4335">
						<path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
					</svg>
					<span className="font-semibold text-gray-800 text-sm">Bandeja de entrada</span>
					{threads.filter(isUnread).length > 0 && (
						<span className="text-xs font-bold bg-blue-600 text-white rounded-full px-2 py-0.5">
							{threads.filter(isUnread).length}
						</span>
					)}
				</div>
				<a
					href="https://mail.google.com"
					target="_blank"
					rel="noopener noreferrer"
					className="text-xs text-blue-600 hover:underline font-medium"
				>
					Abrir Gmail →
				</a>
			</div>

			{/* Email list */}
			<div className="divide-y divide-gray-50">
				{threads.length === 0 ? (
					<p className="px-5 py-8 text-center text-gray-400 text-sm">No hay correos en la bandeja.</p>
				) : (
					threads.map(thread => {
						const lastMsg = thread.messages?.[thread.messages.length - 1];
						const headers = lastMsg?.payload?.headers;
						const from = getHeader(headers, 'From');
						const subject = getHeader(headers, 'Subject');
						const unread = isUnread(thread);
						const initials = getInitials(from);
						const color = avatarColor(from);

						const threadUrl = `https://mail.google.com/mail/u/0/#inbox/${thread.id}`;

						return (
							<a
								key={thread.id}
								href={threadUrl}
								target="_blank"
								rel="noopener noreferrer"
								className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors ${unread ? 'bg-blue-50/40' : ''}`}
							>
								{/* Avatar */}
								<div
									className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
									style={{ backgroundColor: color }}
								>
									{initials}
								</div>

								{/* Content */}
								<div className="flex-1 min-w-0">
									<div className="flex items-baseline gap-2">
										<span className={`text-sm truncate flex-1 ${unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
											{from.replace(/<.*>/, '').trim() || 'Sin remitente'}
										</span>
										<span className="text-xs text-gray-400 flex-shrink-0 ml-2">
											{formatDate(lastMsg?.internalDate)}
										</span>
									</div>
									<p className={`text-sm truncate ${unread ? 'text-gray-800' : 'text-gray-500'}`}>
										{subject || '(Sin asunto)'}
									</p>
								</div>

								{/* Unread dot */}
								{unread && (
									<div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
								)}
							</a>
						);
					})
				)}
			</div>
		</div>
	);
}
