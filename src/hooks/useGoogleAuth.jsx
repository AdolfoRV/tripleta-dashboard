import { useState, useEffect } from 'react';

const CLIENT_ID = '134731411042-sj0mbjc2nj8p4nfrk00tgj05mlspp3jf.apps.googleusercontent.com';
const DISCOVERY_DOCS = [
	'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
	'https://gmail.googleapis.com/$discovery/rest?version=v1',
	'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
	'https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest',
];
const SCOPES = [
	'https://www.googleapis.com/auth/calendar',
	'https://www.googleapis.com/auth/gmail.readonly',
	'https://www.googleapis.com/auth/drive.metadata.readonly',
	'https://www.googleapis.com/auth/tasks.readonly',
].join(' ');

export function useGoogleAuth() {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [tokenClient, setTokenClient] = useState(null);

	useEffect(() => {
		const initGapi = async () => {
			await window.gapi.client.init({ discoveryDocs: DISCOVERY_DOCS });
			checkAutoLogin();
		};

		window.gapi.load('client', initGapi);

		const client = window.google.accounts.oauth2.initTokenClient({
			client_id: CLIENT_ID,
			scope: SCOPES,
			callback: (resp) => {
				if (resp.error !== undefined) throw resp;
				localStorage.setItem('google_dashboard_token', JSON.stringify({
					access_token: resp.access_token,
					timestamp: new Date().getTime(),
				}));
				setIsAuthenticated(true);
			},
		});
		setTokenClient(client);
	}, []);

	const checkAutoLogin = () => {
		const tokenString = localStorage.getItem('google_dashboard_token');
		if (tokenString) {
			const tokenData = JSON.parse(tokenString);
			const now = new Date().getTime();
			if (now - tokenData.timestamp < 3300000) {
				window.gapi.client.setToken({ access_token: tokenData.access_token });
				setIsAuthenticated(true);
			} else {
				localStorage.removeItem('google_dashboard_token');
			}
		}
	};

	const handleAuthClick = () => {
		if (window.gapi.client.getToken() === null) {
			tokenClient.requestAccessToken({ prompt: 'consent' });
		} else {
			tokenClient.requestAccessToken({ prompt: '' });
		}
	};

	const handleSignoutClick = () => {
		const token = window.gapi.client.getToken();
		if (token !== null) {
			window.google.accounts.oauth2.revoke(token.access_token);
			window.gapi.client.setToken('');
			localStorage.removeItem('google_dashboard_token');
			setIsAuthenticated(false);
		}
	};

	return { isAuthenticated, handleAuthClick, handleSignoutClick };
}
