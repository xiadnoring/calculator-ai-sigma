<script lang="ts">
	import { sessions, activeSessionId, setActiveSession, createSession, removeSession } from '$lib/stores';
	import { createToken, removeToken, loadHistory } from '$lib/api';
	import type { ChatSession } from '$lib/api';

	let { isOpen, onClose }: { isOpen: boolean; onClose: () => void } = $props();
	let isCreating = $state(false);
	let showApiSettings = $state(false);
	let apiInput = $state('');

	$effect(() => {
		if (typeof window !== 'undefined') {
			apiInput = localStorage.getItem('api_base_url') || '';
		}
	});

	async function handleNewChat() {
		isCreating = true;
		try {
			const tokenData = await createToken();
			if (!tokenData.ok) {
				throw new Error('Failed to create token');
			}

			const session: ChatSession = {
				token: tokenData.api,
				createdAt: Date.now(),
				expiresAt: Date.now() + tokenData.live_in,
				messages: [],
				title: 'New Chat'
			};

			try {
				const history = await loadHistory(tokenData.api);
				if (history.length > 0) {
					session.messages = history;
					const firstUserMsg = history.find(m => m.role === 'user');
					if (firstUserMsg) {
						session.title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
					}
				}
			} catch {
				// No history yet
			}

			createSession(session);
		} catch (error) {
			console.error('Failed to create new chat:', error);
		} finally {
			isCreating = false;
		}
	}

	async function handleDeleteSession(token: string, event: MouseEvent) {
		event.stopPropagation();
		await removeToken(token);
		removeSession(token);
	}

	async function handleSaveApiUrl() {
		localStorage.setItem('api_base_url', apiInput);
		window.location.reload();
	}
</script>

<div
	class="sidebar h-screen flex flex-col bg-[#0d0d0d] border-r border-[#1a1a1a] transition-all duration-300 ease-in-out"
	class:w-72={isOpen}
	class:w-0={!isOpen}
	style="overflow: hidden;"
>
	<div class="sidebar-content flex flex-col h-full min-w-[288px]">
		<!-- Header -->
		<div class="px-5 py-5 border-b border-[#1a1a1a]">
			<div class="flex items-center justify-between mb-5">
				<h1 class="text-sm font-semibold text-white uppercase tracking-wider">
					Calculator AI
				</h1>
				<button
					onclick={onClose}
					aria-label="Close sidebar"
					class="p-1.5 rounded-lg hover:bg-[#141414] transition-colors text-white"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
			</div>

			<button
				onclick={handleNewChat}
				disabled={isCreating}
				class="w-full py-3 px-5 bg-[#141414] hover:bg-[#1a1a1a] border border-[#1f1f1f] hover:border-[#2a2a2a] text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
			>
				{#if isCreating}
					<div class="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
				{:else}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
				{/if}
				{isCreating ? 'Creating...' : 'New Chat'}
			</button>
		</div>

		<!-- Chat List -->
		<div class="flex-1 overflow-y-auto px-4 py-4 space-y-2">
			{#if $sessions.length === 0}
				<div class="flex flex-col items-center justify-center py-12">
					<div class="w-15 h-15 rounded-xl bg-[#141414] border border-[#1a1a1a] flex items-center justify-center mb-4">
						<svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
						</svg>
					</div>
					<p class="text-xs text-white">No chats yet</p>
					<p class="text-[10px] mt-1 text-white">Start a new conversation</p>
				</div>
			{:else}
				{#each $sessions as session, i (session.token)}
					<div
						class="chat-item w-full p-3 rounded-xl cursor-pointer transition-all duration-200 text-left {session.token === $activeSessionId ? 'bg-[#141414] border border-[#1f1f1f]' : 'hover:bg-[#111] border border-transparent hover:border-[#1a1a1a]'}"
						style="animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) {i * 0.05}s both;"
						onclick={() => setActiveSession(session.token)}
						role="button"
						tabindex="0"
						onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setActiveSession(session.token); } }}
					>
						<div class="flex items-start justify-between gap-3">
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium text-white truncate mb-2">{session.title}</p>
								<p class="text-[10px] text-white font-mono">
									{new Date(session.createdAt).toLocaleDateString()}
								</p>
							</div>
							<button
								onclick={(e) => handleDeleteSession(session.token, e)}
								aria-label="Delete chat"
								class="p-1.5 rounded-lg hover:bg-red-900/20 text-white transition-colors flex-shrink-0"
							>
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
							</button>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Footer -->
		<div class="px-5 py-5 border-t border-[#1a1a1a]">
			<button
				onclick={() => { showApiSettings = !showApiSettings; }}
				class="w-full py-3 px-5 bg-[#111] hover:bg-[#141414] border border-[#1a1a1a] hover:border-[#222] text-white rounded-xl text-sm transition-colors flex items-center justify-center gap-2.5"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
				API Settings
			</button>

			{#if showApiSettings}
				<div class="mt-3 p-3 bg-[#111] border border-[#1a1a1a] rounded-xl space-y-3" style="animation: fadeIn 0.2s ease-out;">
					<p class="text-[10px] text-white">Leave empty for same-origin, or set full URL</p>
					<input
						type="text"
						bind:value={apiInput}
						placeholder="http://127.0.0.1:8888"
						class="w-full px-3 py-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#2a2a2a] transition-colors font-mono"
					/>
					<button
						onclick={handleSaveApiUrl}
						class="w-full py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#222] text-white rounded-lg text-sm transition-colors"
					>
						Save & Reload
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(-20px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Custom scrollbar */
	::-webkit-scrollbar {
		width: 4px;
	}

	::-webkit-scrollbar-track {
		background: transparent;
	}

	::-webkit-scrollbar-thumb {
		background: #1a1a1a;
		border-radius: 2px;
	}

	::-webkit-scrollbar-thumb:hover {
		background: #222;
	}
</style>
