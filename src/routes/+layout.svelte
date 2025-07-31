<script lang="ts">
	import Toasts from 'lib/toast/Toasts.svelte';
	import { position } from 'lib/toast/toastStore';
	import '../style/app.css';

	import { dev } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';

	injectAnalytics({ mode: dev ? 'development' : 'production' });
</script>

<Toasts position={$position} />

<!-- <CommandPalette /> -->
<slot />

<style lang="postcss">
	:global(body) {
		/* background-color: black; */
		/* @apply bg-neutral-100; */
		/* background-color: #191414; */
		/* background-color: #1F2525; */
	}
</style>
