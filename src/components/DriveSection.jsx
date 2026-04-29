import { useState, useEffect } from 'react';

const MIME_ICONS = {
	'application/vnd.google-apps.folder': {
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="#f4b400">
				<path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
			</svg>
		),
		label: 'Carpeta',
	},
	'application/vnd.google-apps.document': {
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="#4285f4">
				<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
			</svg>
		),
		label: 'Documento',
	},
	'application/vnd.google-apps.spreadsheet': {
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="#0f9d58">
				<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm0-4H7v-2h5v2zm0-4H7V7h5v2zm5 8h-3v-8h3v8z" />
			</svg>
		),
		label: 'Hoja de cálculo',
	},
	'application/vnd.google-apps.presentation': {
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="#db4437">
				<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
			</svg>
		),
		label: 'Presentación',
	},
	'application/pdf': {
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="#ea4335">
				<path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z" />
			</svg>
		),
		label: 'PDF',
	},
};

function getFileIcon(mimeType) {
	return MIME_ICONS[mimeType] || {
		icon: (
			<svg width="20" height="20" viewBox="0 0 24 24" fill="#78909c">
				<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
			</svg>
		),
		label: 'Archivo',
	};
}

function formatSize(bytes) {
	if (!bytes) return '';
	const b = Number(bytes);
	if (b < 1024) return `${b} B`;
	if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
	return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(str) {
	if (!str) return '';
	return new Date(str).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function DriveSection() {
	const [files, setFiles] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchFiles = async () => {
			setLoading(true);
			setError(null);
			try {
				const resp = await window.gapi.client.drive.files.list({
					pageSize: 20,
					orderBy: 'modifiedTime desc',
					fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink,owners)',
				});
				setFiles(resp.result.files || []);
			} catch (err) {
				setError('No se pudieron cargar los archivos de Drive.');
				console.error(err);
			} finally {
				setLoading(false);
			}
		};

		fetchFiles();
	}, []);

	if (loading) {
		return (
			<div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
				<div className="flex items-center gap-3 text-gray-500 text-sm">
					<div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
					Cargando archivos…
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
					<svg width="20" height="20" viewBox="0 0 24 24">
						<path fill="#4285f4" d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5z" />
						<path fill="#0f9d58" d="M12.66 3.5h-4.95L14.28 15h9.56z" />
						<path fill="#fbbc04" d="M17.61 15H7.58l-3.43 6h13.04z" />
					</svg>
					<span className="font-semibold text-gray-800 text-sm">Archivos recientes</span>
				</div>
				<a
					href="https://drive.google.com"
					target="_blank"
					rel="noopener noreferrer"
					className="text-xs text-blue-600 hover:underline font-medium"
				>
					Abrir Drive →
				</a>
			</div>

			{/* File grid */}
			{files.length === 0 ? (
				<p className="px-5 py-8 text-center text-gray-400 text-sm">No hay archivos recientes.</p>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100">
					{files.map(file => {
						const { icon } = getFileIcon(file.mimeType);
						const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
						return (
							<a
								key={file.id}
								href={file.webViewLink || '#'}
								target="_blank"
								rel="noopener noreferrer"
								className="bg-white flex items-center gap-3 px-4 py-3 hover:bg-blue-50/50 transition-colors group"
							>
								<div className="flex-shrink-0">{icon}</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700 transition-colors">
										{file.name}
									</p>
									<p className="text-xs text-gray-400 truncate">
										{formatDate(file.modifiedTime)}
										{!isFolder && file.size && ` · ${formatSize(file.size)}`}
									</p>
								</div>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-gray-300 group-hover:text-blue-400 flex-shrink-0 transition-colors">
									<path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
								</svg>
							</a>
						);
					})}
				</div>
			)}
		</div>
	);
}
