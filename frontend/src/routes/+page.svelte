<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
	import MessageBubble from '$lib/MessageBubble.svelte';
	import MathPreview from '$lib/MathPreview.svelte';
	import {
		activeSession,
		activeMessages,
		activeSessionId,
		setActiveSession,
		createSession,
		addMessage,
		updateStreamingMessage,
		finalizeStreamingMessage,
		setStreaming,
		streamingSessions,
		updateSessionTitle,
		syncAllSessions,
		isLoading,
		isStreaming,
		apiBaseUrl
	} from '$lib/stores';
	import { createToken, loadHistory, sendMessage, checkTokenAlive, type ChatSession } from '$lib/api';

		let messageInput = $state('');
	let sidebarOpen = $state(true);
	let messagesContainer = $state<HTMLElement | null>(null);
	let textareaEl = $state<HTMLTextAreaElement | null>(null);
	let showScrollButton = $state(false);
	let now = $state(Date.now());
	let cursorPos = $state(0);

	$effect(() => {
		if (textareaEl) {
			const el = textareaEl;
			const updateCursor = () => { cursorPos = el.selectionStart; };
			el.addEventListener('click', updateCursor);
			el.addEventListener('keyup', updateCursor);
			el.addEventListener('input', updateCursor);
			el.addEventListener('select', updateCursor);
			return () => {
				el.removeEventListener('click', updateCursor);
				el.removeEventListener('keyup', updateCursor);
				el.removeEventListener('input', updateCursor);
				el.removeEventListener('select', updateCursor);
			};
		}
	});
	$effect(() => {
		const interval = setInterval(() => {
			now = Date.now();
		}, 1000);
		return () => clearInterval(interval);
	});

	$effect(() => {
		if (messagesContainer) {
			const el = messagesContainer;
			const handleScroll = () => {
				const scrollBottom = el.scrollHeight - el.clientHeight - el.scrollTop;
				showScrollButton = scrollBottom > 200;
			};
			el.addEventListener('scroll', handleScroll);
			return () => el.removeEventListener('scroll', handleScroll);
		}
	});

	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTo({
				top: messagesContainer.scrollHeight,
				behavior: 'smooth'
			});
		}
	}

	$effect(() => {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	});

	// Sync all chat titles from server on mount
	$effect(() => {
		syncAllSessions();
	});

	$effect(() => {
		if (textareaEl) {
			textareaEl.style.height = 'auto';
			const maxH = 120;
			textareaEl.style.height = Math.min(textareaEl.scrollHeight, maxH) + 'px';
			textareaEl.style.transition = 'none';
		}
	});

	function resizeTextarea() {
		if (textareaEl) {
			textareaEl.style.height = 'auto';
			const maxH = 120;
			const newH = Math.min(textareaEl.scrollHeight, maxH);
			textareaEl.style.height = newH + 'px';
			textareaEl.style.transition = 'none';
		}
	}

	async function handleSendMessage() {
		if (!messageInput.trim() || $isStreaming || $isLoading) return;
		if (!$activeSession) {
			await createNewSession();
		}

		const content = messageInput.trim();
		messageInput = '';

		// Reset textarea height after clearing
		if (textareaEl) {
			textareaEl.style.height = 'auto';
		}

		// Update chat title from first user message
		if ($activeSession && ($activeSession.title === 'New Chat' || !$activeSession.title)) {
			const title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
			updateSessionTitle($activeSession.token, title);
		}

		const token = $activeSession?.token;
		if (!token) return;

		addMessage(token, { role: 'user', content });
		addMessage(token, { role: 'assistant', content: 'STREAMING...' });

		setStreaming(token, true);

		let lastContent = '';
		let lastReasoning = '';

		try {
			await sendMessage(token, content, (chunk, isReasoning) => {
				if (isReasoning) {
					lastReasoning = chunk;
				} else {
					lastContent = chunk;
				}
				updateStreamingMessage(token, lastContent || 'STREAMING...', lastReasoning);
			});

			finalizeStreamingMessage(token, lastContent, lastReasoning);
		} catch (error) {
			console.error('Failed to send message:', error);
			finalizeStreamingMessage(token, lastContent || '**Error:** Failed to get response.', lastReasoning);
		}
	}

	async function createNewSession() {
		$isLoading = true;
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
			$isLoading = false;
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSendMessage();
		}
	}

	function formatTimeRemaining(expiresAt: number): string {
		const remaining = expiresAt - Date.now();
		if (remaining <= 0) return 'Expired';
		const minutes = Math.floor(remaining / 60000);
		const hours = Math.floor(minutes / 60);
		if (hours > 0) {
			return `${hours}h ${minutes % 60}m left`;
		}
		return `${minutes}m left`;
	}

	const quickActions = [
		{ label: 'Calculus', text: 'What is the derivative of sin(x)?' },
		{ label: 'Integrals', text: 'Solve the integral of x^2 dx' },
		{ label: 'Percentages', text: 'What is 15% of 250?' },
		{ label: 'Algebra', text: 'Explain the quadratic formula' }
	];
</script>

<div class="flex h-screen bg-[#0a0a0a] overflow-hidden">
	<!-- Dot grid pattern overlay -->
	<div class="fixed inset-0 pointer-events-none opacity-[0.03]" style="background-image: radial-gradient(circle, #fff 1px, transparent 1px); background-size: 24px 24px;"></div>

	<div class="relative z-20">
		<Sidebar isOpen={sidebarOpen} onClose={() => { sidebarOpen = false; }} />
	</div>

	<!-- Main Content -->
	<div class="flex-1 flex flex-col h-screen relative min-w-0">
		<!-- Top Bar -->
		<div class="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a] bg-[#0a0a0a]">
			<button
				onclick={() => { sidebarOpen = !sidebarOpen; }}
				aria-label="Toggle sidebar"
				class="p-2 bg-[#141414] hover:bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl text-white transition-all duration-200"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>

			{#if $activeSession}
				<div class="flex items-center gap-3">
					{#if $activeSession.expiresAt > now}
						<div class="w-2 h-2 bg-[#22c55e] rounded-full animate-pulse"></div>
					{/if}
					<h2 class="text-sm font-medium text-white">{$activeSession.title}</h2>
					<span class="text-[10px] px-2 py-1 bg-[#141414] text-white rounded-md border border-[#1f1f1f] font-mono">
						{formatTimeRemaining($activeSession.expiresAt)}
					</span>
				</div>
			{:else}
				<h2 class="text-sm font-medium text-white">Calculator AI</h2>
			{/if}

			<div class="w-10"></div>
		</div>

		<!-- Messages Area -->
		<div class="flex-1 overflow-y-auto" bind:this={messagesContainer}>
			<div class="max-w-3xl mx-auto px-6 py-8">
				{#if !$activeSession || $activeMessages.length === 0}
					<!-- Welcome Screen -->
					<div class="flex flex-col items-center justify-center py-12 animate-fade-in-up">
						<!-- Logo -->
						<div class="mb-6">
							<div class="w-24 h-24 rounded-2xl bg-[#141414] border border-[#1f1f1f] flex items-center justify-center">
								<svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
								</svg>
							</div>
						</div>

						<h1 class="text-3xl font-bold text-white mb-2 text-center tracking-tight">
							Calculator AI
						</h1>
						<p class="text-white text-sm mb-8 text-center max-w-md leading-relaxed">
							Ask me any math question. I'll help you solve it step by step.
						</p>

						<!-- Quick actions grid -->
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
							{#each quickActions as action}
								<button
									onclick={() => { messageInput = action.text; }}
									class="p-4 bg-[#111] hover:bg-[#141414] border border-[#1a1a1a] hover:border-[#222] rounded-xl text-left transition-all duration-200 group"
								>
									<div class="text-xs text-white group-hover:text-white transition-colors font-medium uppercase tracking-wider mb-1.5">
										{action.label}
									</div>
									<div class="text-sm text-white group-hover:text-white transition-colors leading-relaxed">
										{action.text}
									</div>
								</button>
							{/each}
						</div>
					</div>
				{:else}
					<!-- Messages -->
					<div class="space-y-5 pb-5">
						{#each $activeMessages as message, index (index)}
							<MessageBubble 
								{message} 
								{index} 
								isLast={index === $activeMessages.length - 1}
								isSessionStreaming={$streamingSessions.has($activeSession?.token || '')}
							/>
						{/each}
					</div>
				{/if}
			</div>
			<!-- Scroll to bottom button -->
			{#if showScrollButton && $activeSession && $activeMessages.length > 0}
				<div class="absolute bottom-28 right-8 z-10 animate-fade-in">
					<button
						onclick={scrollToBottom}
						aria-label="Scroll to bottom"
						class="w-10 h-10 bg-[#141414] hover:bg-[#1a1a1a] border border-[#1f1f1f] hover:border-[#2a2a2a] rounded-lg text-white shadow-xl transition-all duration-200 flex items-center justify-center hover:scale-110 active:scale-95"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
						</svg>
					</button>
				</div>
			{/if}
		</div>

		<!-- Input Area -->
		<div class="px-6 py-4 border-t border-[#1a1a1a] bg-[#0a0a0a]">
			<div class="max-w-3xl mx-auto">
				<!-- Math Preview (above input) -->
				<MathPreview text={messageInput} cursorPos={cursorPos} />
				<div class="flex items-end gap-3 bg-[#111] border border-[#1a1a1a] rounded-xl p-3 focus-within:border-[#2a2a2a] transition-colors mt-2">
					<textarea
						bind:this={textareaEl}
						bind:value={messageInput}
						oninput={resizeTextarea}
						onkeydown={handleKeyDown}
						placeholder="Ask me anything about math..."
						style="outline: none;"
						class="flex-1 bg-transparent text-white placeholder-gray-500 px-2 py-1 max-h-32 min-h-[24px] leading-relaxed resize-none text-sm"
						disabled={$streamingSessions.has($activeSession?.token || '') || $isLoading}
					></textarea>
					<button
						onclick={handleSendMessage}
						disabled={!messageInput.trim() || $streamingSessions.has($activeSession?.token || '') || $isLoading}
						class="flex items-center justify-center p-2.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#222] hover:border-[#2a2a2a] rounded-xl text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#1a1a1a] disabled:hover:border-[#222] disabled:hover:text-white"
					>
						{#if $streamingSessions.has($activeSession?.token || '')}
							<div class="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
						{:else}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
							</svg>
						{/if}
					</button>
				</div>
				<p class="text-[10px] text-white text-center mt-3 font-mono">
					ENTER to send • SHIFT+ENTER new line
				</p>
			</div>
		</div>
	</div>
</div>

<style>
	@keyframes slide-in {
		from {
			opacity: 0;
			transform: translateX(-100%);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	@keyframes fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes fade-in-up {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes message-in {
		from {
			opacity: 0;
			transform: translateY(20px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	:global(.animate-slide-in) {
		animation: slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	:global(.animate-fade-in) {
		animation: fade-in 0.3s ease-out;
	}

	:global(.animate-fade-in-up) {
		animation: fade-in-up 0.5s cubic-bezier(0.4, 0, 0.2, 1);
	}

	:global(.animate-message-in) {
		animation: message-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) both;
	}

	/* Custom scrollbar */
	::-webkit-scrollbar {
		width: 6px;
	}

	::-webkit-scrollbar-track {
		background: transparent;
	}

	::-webkit-scrollbar-thumb {
		background: #1a1a1a;
		border-radius: 3px;
	}

	::-webkit-scrollbar-thumb:hover {
		background: #222;
	}
</style>
