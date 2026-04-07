<script lang="ts">
	import { marked } from 'marked';
	import katex from 'katex';
	import 'katex/dist/katex.min.css';

	let { content }: { content: string } = $props();

	function renderContent(text: string): string {
		if (!text) return '';
		
		const parts: { type: 'text' | 'latex'; content: string; rendered?: string }[] = [];
		const latexRegex = /(\$\$[\s\S]*?\$\$)|(\\\[[\s\S]*?\\\])|(\\\([\s\S]*?\\\))|(\$[^$\n]+\$)/gs;
		
		let lastIdx = 0;
		let match;
		let blockIdx = 0;
		
		while ((match = latexRegex.exec(text)) !== null) {
			if (match.index > lastIdx) {
				parts.push({ type: 'text', content: text.slice(lastIdx, match.index) });
			}
			
			const fullMatch = match[0];
			let latexContent: string;
			let isDisplay: boolean;
			
			if (match[1] !== undefined) {
				latexContent = fullMatch.slice(2, -2).trim();
				isDisplay = true;
			} else if (match[2] !== undefined) {
				latexContent = fullMatch.slice(2, -2).trim();
				isDisplay = true;
			} else if (match[3] !== undefined) {
				latexContent = fullMatch.slice(2, -2).trim();
				isDisplay = false;
			} else {
				latexContent = fullMatch.slice(1, -1).trim();
				isDisplay = false;
			}
			
			try {
				const rendered = katex.renderToString(latexContent, {
					throwOnError: false,
					displayMode: isDisplay,
					output: 'html',
					trust: false,
					strict: false
				});
				
				const placeholder = `%%LTX${blockIdx}%%`;
				const html = isDisplay 
					? `<div class="katex-outer"><div class="katex-inner">${rendered}</div></div>` 
					: `<span class="katex-inline">${rendered}</span>`;
				parts.push({ type: 'latex', content: placeholder, rendered: html });
				blockIdx++;
			} catch {
				parts.push({ type: 'text', content: fullMatch });
			}
			
			lastIdx = latexRegex.lastIndex;
		}
		
		if (lastIdx < text.length) {
			parts.push({ type: 'text', content: text.slice(lastIdx) });
		}
		
		const combined = parts.map(p => p.type === 'latex' ? p.content : p.content).join('');
		let html = marked.parse(combined, {
			breaks: true,
			gfm: true
		}) as string;
		
		for (let i = 0; i < blockIdx; i++) {
			const latexPart = parts.find(p => p.content === `%%LTX${i}%%`);
			if (latexPart && 'rendered' in latexPart) {
				html = html.replace(`%%LTX${i}%%`, latexPart.rendered);
			}
		}
		
		return html;
	}

	let html = $derived(renderContent(content));
</script>

<div class="markdown-body">
	{@html html}
</div>

<style>
	:global(.katex-outer) {
		margin: 1em 0;
		overflow: hidden;
	}

	:global(.katex-inner) {
		overflow-x: auto;
		overflow-y: hidden;
		max-width: 100%;
	}

	:global(.katex-inner .katex) {
		font-size: 1.3em;
	}

	:global(.katex-inline) {
		display: inline-block;
		max-width: 100%;
		vertical-align: middle;
		font-size: 1.15em;
	}

	:global(.katex) {
		font-size: inherit;
	}

	:global(.katex-inner::-webkit-scrollbar),
	:global(.katex-inline::-webkit-scrollbar) {
		height: 4px;
	}

	:global(.katex-inner::-webkit-scrollbar-track),
	:global(.katex-inline::-webkit-scrollbar-track) {
		background: transparent;
	}

	:global(.katex-inner::-webkit-scrollbar-thumb),
	:global(.katex-inline::-webkit-scrollbar-thumb) {
		background: #333;
		border-radius: 2px;
	}
</style>
