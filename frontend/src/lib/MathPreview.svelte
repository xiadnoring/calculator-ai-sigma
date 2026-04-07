<script lang="ts">
	import katex from 'katex';
	import 'katex/dist/katex.min.css';

	let { text, cursorPos }: { text: string; cursorPos: number } = $props();

	function getCurrentMathBlock(text: string, pos: number): { latex: string; isDisplay: boolean } | null {
		// Find $$...$$ blocks
		const displayRegex = /\$\$([^$]*)\$\$/g;
		let match;
		while ((match = displayRegex.exec(text)) !== null) {
			const start = match.index!;
			const end = start + match[0].length;
			if (pos >= start && pos <= end) {
				return { latex: match[1], isDisplay: true };
			}
		}

		// Find $...$ blocks (not $$)
		const inlineRegex = /(?<!\$)\$(?!\$)([^$]+)\$(?!\$)/g;
		while ((match = inlineRegex.exec(text)) !== null) {
			const start = match.index!;
			const end = start + match[0].length;
			if (pos >= start && pos <= end) {
				return { latex: match[1], isDisplay: false };
			}
		}

		return null;
	}

	let currentBlock = $derived(getCurrentMathBlock(text, cursorPos));
	
	let rendered = $derived(currentBlock ? (() => {
		try {
			return katex.renderToString(currentBlock.latex, {
				throwOnError: false,
				displayMode: currentBlock.isDisplay,
				output: 'html',
				trust: false,
				strict: false
			});
		} catch {
			return `<span class="mp-fallback">${currentBlock.latex.replace(/</g, '&lt;')}</span>`;
		}
	})() : '');
</script>

{#if currentBlock}
	<div class="math-preview">
		{@html rendered}
	</div>
{/if}

<style>
	.math-preview {
		padding: 10px 12px;
		background: #0d0d0d;
		border: 1px solid #1a1a1a;
		border-radius: 8px;
		font-size: 14px;
		line-height: 1.6;
		overflow-x: auto;
	}

	:global(.mp-fallback) {
		color: #666;
		font-style: italic;
	}

	:global(.katex) {
		font-size: 1em;
		color: #fff !important;
	}

	:global(.katex *) {
		color: inherit !important;
	}

	:global(.katex-display) {
		margin: 4px 0;
	}
</style>
