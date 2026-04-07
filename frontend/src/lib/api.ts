export interface Message {
	role: 'user' | 'assistant';
	content: string;
	reasoning_details?: string;
}

export interface ChatSession {
	token: string;
	createdAt: number;
	expiresAt: number;
	messages: Message[];
	title: string;
}

export interface HistoryResponse {
	data: Message[];
	ok: boolean;
}

export interface CreateTokenResponse {
	api: string;
	live_in: number;
	ok: boolean;
}

export interface ApiResponse {
	ok: boolean;
	msg?: string;
}

const getApiUrl = (): string => {
	if (typeof window === 'undefined') return '';
	const stored = localStorage.getItem('api_base_url');
	// Use relative URL by default (same origin as the page)
	return stored || '';
};

export const setApiBaseUrl = (url: string): void => {
	if (typeof window === 'undefined') return;
	localStorage.setItem('api_base_url', url);
};

export const getApiUrlWithToken = (token: string, path: string): string => {
	return `${getApiUrl()}/api/${token}/${path}`;
};

export const createToken = async (): Promise<CreateTokenResponse> => {
	const response = await fetch(`${getApiUrl()}/api/create`);
	return response.json();
};

export const checkTokenAlive = async (token: string): Promise<boolean> => {
	try {
		const response = await fetch(`${getApiUrl()}/api/${token}/alive`, {
			method: 'POST'
		});
		const data: ApiResponse = await response.json();
		return data.ok;
	} catch {
		return false;
	}
};

export const removeToken = async (token: string): Promise<boolean> => {
	try {
		const response = await fetch(`${getApiUrl()}/api/${token}/remove`, {
			method: 'POST'
		});
		const data: ApiResponse = await response.json();
		return data.ok;
	} catch {
		return false;
	}
};

export const loadHistory = async (token: string): Promise<Message[]> => {
	const response = await fetch(`${getApiUrl()}/api/${token}/history`, {
		method: 'POST'
	});
	const data: HistoryResponse = await response.json();
	if (!data.ok) {
		throw new Error('Failed to load history');
	}
	return data.data;
};

export const sendMessage = async (
	token: string,
	content: string,
	onChunk: (chunk: string, isReasoning: boolean) => void
): Promise<void> => {
	const url = `${getApiUrl()}/api/${token}/chat`;

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ content })
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const reader = response.body?.getReader();
	if (!reader) {
		throw new Error('No reader available');
	}

	const decoder = new TextDecoder();
	let isReasoning = true;
	let reasoningText = '';
	let answerText = '';

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunkText = decoder.decode(value, { stream: true });
			
			// Check for TOKEN separator
			const tokenIdx = chunkText.indexOf('\n' + token + '\n');
			if (tokenIdx !== -1) {
				// Emit reasoning before token
				const reasoning = chunkText.substring(0, tokenIdx);
				if (reasoning) {
					reasoningText += reasoning;
					onChunk(reasoningText, true);
				}
				
				// Switch to answer
				isReasoning = false;
				const answer = chunkText.substring(tokenIdx + token.length + 2);
				if (answer) {
					answerText += answer;
					onChunk(answerText, false);
				}
				continue;
			}
			
			// Emit chunk immediately
			if (isReasoning) {
				reasoningText += chunkText;
				onChunk(reasoningText, true);
			} else {
				answerText += chunkText;
				onChunk(answerText, false);
			}
		}
	} catch {
		// Server closed - process what we have
		if (isReasoning) {
			onChunk(reasoningText, true);
		} else {
			onChunk(answerText, false);
		}
	}
};
