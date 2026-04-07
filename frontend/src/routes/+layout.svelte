<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Calculator AI</title>
	<meta name="description" content="AI-powered math calculator" />
</svelte:head>

<div class="app-container">
	{@render children()}
</div>
