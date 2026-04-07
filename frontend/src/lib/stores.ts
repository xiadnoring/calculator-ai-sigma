import { writable, derived, get } from 'svelte/store';
import type { ChatSession, Message } from './api';
import { loadHistory } from './api';

const STORAGE_KEY = 'chat_sessions';

function loadSessions(): ChatSession[] {
	if (typeof window === 'undefined') return [];
	try {
		const data = localStorage.getItem(STORAGE_KEY);
		if (!data) return [];
		const sessions: ChatSession[] = JSON.parse(data);
		// Filter out expired sessions
		return sessions.filter((s) => s.expiresAt > Date.now());
	} catch {
		return [];
	}
}

function saveSessions(sessions: ChatSession[]) {
	if (typeof window === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export const sessions = writable<ChatSession[]>(loadSessions());
export const activeSessionId = writable<string | null>(null);
export const isLoading = writable(false);
export const isStreaming = writable(false);

// Track which sessions are currently streaming
export const streamingSessions = writable<Set<string>>(new Set());

const initialApiUrl = typeof window !== 'undefined' ? (localStorage.getItem('api_base_url') || '') : '';
export const apiBaseUrl = writable(initialApiUrl);

apiBaseUrl.subscribe((url) => {
	if (typeof window === 'undefined') return;
	localStorage.setItem('api_base_url', url);
});

sessions.subscribe((sessions) => {
	saveSessions(sessions);
});

export const activeSession = derived(
	[sessions, activeSessionId],
	([$sessions, $activeSessionId]) => {
		return $sessions.find((s) => s.token === $activeSessionId) || null;
	}
);

export const activeMessages = derived(activeSession, ($session) => {
	return $session?.messages || [];
});

export function setActiveSession(token: string | null) {
	activeSessionId.set(token);
	
	// Sync history and title from server when switching sessions
	if (token) {
		syncSessionHistory(token);
	}
}

// Sync all sessions from server on initial load
export async function syncAllSessions() {
	const currentSessions = get(sessions);
	for (const session of currentSessions) {
		try {
			const history = await loadHistory(session.token);
			if (history && history.length > 0) {
				const firstUserMsg = history.find(m => m.role === 'user');
				if (firstUserMsg && (session.title === 'New Chat' || !session.title)) {
					const title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
					updateSessionTitle(session.token, title);
				}
			}
		} catch {
			// Failed to sync, skip
		}
	}
}

async function syncSessionHistory(token: string) {
	try {
		const history = await loadHistory(token);
		if (history && history.length > 0) {
			sessions.update((sessions) =>
				sessions.map((s) => {
					if (s.token === token) {
						// Update title from first user message if not set
						let title = s.title;
						if (title === 'New Chat' || !title) {
							const firstUserMsg = history.find(m => m.role === 'user');
							if (firstUserMsg) {
								title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
							}
						}
						return { ...s, messages: history, title };
					}
					return s;
				})
			);
		}
	} catch {
		// Failed to sync, that's OK
	}
}

export function createSession(session: ChatSession) {
	sessions.update((sessions) => [session, ...sessions]);
	activeSessionId.set(session.token);
}

export function addMessage(token: string, message: Message) {
	sessions.update((sessions) =>
		sessions.map((s) =>
			s.token === token
				? { ...s, messages: [...s.messages, message] }
				: s
		)
	);
}

export function updateStreamingMessage(
	token: string,
	content: string,
	reasoning_details: string
) {
	sessions.update((sessions) =>
		sessions.map((s) => {
			if (s.token !== token) return s;
			const messages = [...s.messages];
			const lastMsg = messages[messages.length - 1];
			if (lastMsg && lastMsg.role === 'assistant') {
				// If we have answer content, use it (remove thinking indicator)
				// If only reasoning, keep STREAMING placeholder for content
				const displayContent = content || (reasoning_details ? 'STREAMING...' : 'STREAMING...');
				messages[messages.length - 1] = {
					role: 'assistant',
					content: displayContent,
					reasoning_details: reasoning_details
				};
			}
			return { ...s, messages };
		})
	);
}

export function finalizeStreamingMessage(token: string, content: string, reasoning_details?: string) {
	sessions.update((sessions) =>
		sessions.map((s) => {
			if (s.token !== token) return s;
			const messages = [...s.messages];
			const lastMsg = messages[messages.length - 1];
			if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content === 'STREAMING...') {
				messages[messages.length - 1] = {
					role: 'assistant',
					content,
					...(reasoning_details ? { reasoning_details } : {})
				};
			}
			return { ...s, messages };
		})
	);
	
	// Clear streaming state
	streamingSessions.update((set) => {
		set.delete(token);
		return new Set(set);
	});
	isStreaming.set(false);
}

export function setStreaming(token: string, streaming: boolean) {
	streamingSessions.update((set) => {
		const newSet = new Set(set);
		if (streaming) {
			newSet.add(token);
		} else {
			newSet.delete(token);
		}
		return newSet;
	});
	isStreaming.set(streaming);
}

export function removeSession(token: string) {
	sessions.update((sessions) => sessions.filter((s) => s.token !== token));
	activeSessionId.update((current) => (current === token ? null : current));
}

export function updateSessionTitle(token: string, title: string) {
	sessions.update((sessions) =>
		sessions.map((s) => (s.token === token ? { ...s, title } : s))
	);
}
