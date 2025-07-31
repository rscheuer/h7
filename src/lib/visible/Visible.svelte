<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';

	let visible: boolean, scrollDir: any;
	export let blur = false;
	export let repeat = false;
	export let duration = 0.7;
	let options = {
		threshold: 0.4,
		once: repeat ? false : true
	};

	let dir = {
		y: 1
	};

	function handleChange(e: any) {
		visible = e.detail.isVisible;
		scrollDir = e.detail.scrollDirection;
		// console.log('ScrollDir', scrollDir);
		dir.y = scrollDir.vertical === 'up' ? 1 : -1;
		console.log('dir.y', dir.y, 'out:fly', -20 * dir.y);
	}
</script>

<div class="w-full h-full" use:visibility={options} on:v-change={handleChange}>
	<div
		class:show={visible}
		style="--y: {20 * dir.y}px; --blur: {blur ? 20 : 0}px; transition-duration:{duration}s;"
		class="start opacity-0 transition-all smooth w-full h-full blur-none"
	>
		<slot />
	</div>
</div>

<style>
	.start {
		opacity: 0;
		transform: translateY(var(--y));
		filter: blur(var(--blur));
	}
	.show {
		opacity: 1;
		transform: translateY(0);
		filter: blur(0px);
	}
</style>
