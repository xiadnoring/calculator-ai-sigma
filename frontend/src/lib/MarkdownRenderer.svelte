<script lang="ts">
	import { marked } from 'marked';

	let { content }: { content: string } = $props();

	let html = $derived(marked.parse(content, {
		breaks: true,
		gfm: true
	}) as string);
</script>

<div class="markdown-body">
	{@html html}
</div>
