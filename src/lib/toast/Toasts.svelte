<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import ToastItem from './ToastItem.svelte';
	import { toast, toasts } from './toastStore';

	import type { PositionType } from './types';

	export let position: PositionType = 'top-right';
	export let clearAfter = 3000;

	let heights: number[] = [];
	let isHovering = false;
	let show = false;

	function setHeight(e: any) {
		resetToasts();
		let h = e.detail.height;
		let index = e.detail.index;
		heights[index] = h;
		heights = heights;
	}

	let timeout = setTimeout(() => {
		show = false;
	}, 3000);

	function resetToasts() {
		show = true;
		clearTimeout(timeout);
		if (isHovering) return;
		timeout = setTimeout(() => {
			toast.clear();
		}, clearAfter);
	}

	$: isHovering, resetToasts();
</script>

<div
	out:fade|local={{ duration: 200 }}
	in:fade={{ duration: 200 }}
	class="block w-full fixed h-full z-[9999] pointer-events-none"
	on:mouseenter={() => (isHovering = true)}
	on:mouseleave={() => (isHovering = false)}
>
	{#each $toasts.slice(0).slice(-4).reverse() as item, i (item.id)}
		<ToastItem
			on:height={setHeight}
			title={item?.title}
			text={item?.description}
			status={item?.status}
			index={i}
			{position}
			stack={$toasts.slice(0).slice(-4).reverse().length - i}
			{isHovering}
			{heights}
		/>
	{/each}
</div>
