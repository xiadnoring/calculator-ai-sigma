<script lang="ts">
	import MarkdownRenderer from './MarkdownRenderer.svelte';
	import type { Message } from './api';

	let { message, index, isLast, isSessionStreaming }: { message: Message; index: number; isLast: boolean; isSessionStreaming: boolean } = $props();

	let isVisible = $state(false);

	$effect(() => {
		const timer = setTimeout(() => {
			isVisible = true;
		}, index * 60);
		return () => clearTimeout(timer);
	});

	let isStreaming = $derived(isSessionStreaming && isLast && message.role === 'assistant');
	let hasAnswer = $derived(message.content && message.content !== 'STREAMING...');
	let hasReasoning = $derived(!!message.reasoning_details);
</script>

<div
	class="message-wrapper flex {message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4"
	style="opacity: {isVisible ? 1 : 0}; transform: translateY({isVisible ? '0' : '16px'}); transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) {index * 0.06}s;"
>
	<div
		class="message-bubble max-w-[90%] md:max-w-[80%] lg:max-w-[75%] rounded-xl px-5 py-4 break-all min-w-0 {message.role === 'user'
			? 'bg-[#141414] border border-[#1f1f1f] text-white rounded-tr-sm'
			: 'bg-[#111] border border-[#1a1a1a] text-white rounded-tl-sm'}"
	>
		{#if message.reasoning_details}
			<details class="text-xs group mb-3" open={isStreaming}>
				<summary class="cursor-pointer text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1.5 list-none">
					<svg class="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
					<span class="font-mono uppercase text-[10px]">Reasoning</span>
				</summary>
				<div class="mt-2 p-3 bg-[#0d0d0d] rounded-lg border border-[#1a1a1a] text-gray-400 text-[11px] font-mono whitespace-pre-wrap leading-relaxed break-all" style="overflow-wrap: anywhere;">
					{message.reasoning_details}
				</div>
			</details>
		{/if}

		<div class="message-content" style="overflow-wrap: anywhere; word-break: break-word; max-width: 100%; min-width: 0;">
			{#if isStreaming && !hasAnswer}
				<div class="flex items-center gap-3">
					<div class="typing-indicator flex gap-1.5">
						<span class="dot w-2 h-2 bg-white rounded-full animate-bounce" style="animation-delay: 0ms;"></span>
						<span class="dot w-2 h-2 bg-white rounded-full animate-bounce" style="animation-delay: 150ms;"></span>
						<span class="dot w-2 h-2 bg-white rounded-full animate-bounce" style="animation-delay: 300ms;"></span>
					</div>
					<span class="text-xs text-white font-mono uppercase tracking-wider">Thinking...</span>
				</div>
			{:else}
				<MarkdownRenderer content={message.content} />
			{/if}
		</div>
	</div>
</div>

<style>
	.typing-indicator .dot {
		animation: bounce 1.4s infinite ease-in-out;
	}

	@keyframes bounce {
		0%, 80%, 100% {
			transform: scale(0.6);
			opacity: 0.3;
		}
		40% {
			transform: scale(1);
			opacity: 1;
		}
	}

	:global(.markdown-body) {
		font-size: 0.9rem;
		line-height: 1.7;
		color: #fff;
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	:global(.markdown-body p) {
		margin-bottom: 0.5rem;
		overflow-wrap: anywhere;
	}

	:global(.markdown-body p:last-child) {
		margin-bottom: 0;
	}

	:global(.markdown-body code) {
		background: #141414;
		padding: 0.15em 0.4em;
		border-radius: 3px;
		font-size: 0.85em;
		color: #fff;
		overflow-wrap: anywhere;
	}

	:global(.markdown-body pre) {
		background: #0d0d0d;
		padding: 1rem;
		border-radius: 8px;
		overflow-x: auto;
		margin: 0.5rem 0;
		border: 1px solid #1a1a1a;
	}

	:global(.markdown-body pre code) {
		background: none;
		padding: 0;
	}

	:global(.markdown-body h1),
	:global(.markdown-body h2),
	:global(.markdown-body h3) {
		margin-top: 0.8rem;
		margin-bottom: 0.4rem;
		color: #fff;
	}

	:global(.markdown-body ul),
	:global(.markdown-body ol) {
		padding-left: 1.5rem;
	}

	:global(.markdown-body blockquote) {
		border-left: 2px solid #1f1f1f;
		padding-left: 1rem;
		color: #fff;
	}

	:global(.markdown-body a) {
		color: #fff;
		text-decoration: underline;
	}

	:global(.markdown-body strong) {
		color: #fff;
	}
</style>
