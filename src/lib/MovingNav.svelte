<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	export let items = [
		{
			name: 'Home',
			url: ''
		},
		{
			name: 'About',
			url: ''
		},
		{
			name: 'Work',
			url: ''
		}
	];

	let navItems: HTMLAnchorElement[] = [];
	export let currentIndex: number = 0;
	let indicator: HTMLDivElement;
	// let dot: HTMLDivElement;
	let left = 0;
	let width = 0;
	let height = 0;
	let moving = false;

	onMount(() => {
		left = navItems[currentIndex].offsetLeft;
		width = navItems[currentIndex].offsetWidth;
		height = navItems[currentIndex].offsetHeight;
	});

	// You'll have to use afterNavigate to update the nav
	// afterNavigate(()=>{
	// 	let currentPage = $page.url.pathname;
	// 	let index = items.findIndex((item) => item.url == currentPage);
	// 	if (index != -1) {
	// 		currentIndex = index;
	// 	}
	// })

	$: updateNav(currentIndex);

	function updateNav(i: number) {
		left = navItems[i]?.offsetLeft;
		width = navItems[i]?.offsetWidth;
	}

	function handleClick(num: number) {
		// You'd swap this function in favor of the afterNavigate function
		currentIndex = num;
		moving = true;
		setTimeout(function () {
			moving = false;
		}, 100);
		// console.log(navItems);
	}
</script>

<div class="nav relative bg-neutral-900 bg-opacity-90 flex gap-3 p-3 px-4 rounded-xl">
	{#each items as item, index (item.name + '-' + index)}
		<a
			bind:this={navItems[index]}
			href={item.url}
			class:selected={currentIndex == index}
			on:click={() => {
				handleClick(index);
			}}
			class="w-full min-w-fit px-4 text-white text-opacity-40 transition-all duration-500 ease-smooth"
		>
			{item.name}
		</a>
	{/each}
	<div
		class="absolute flex justify-center items-end transition-all duration-500 ease-smooth"
		bind:this={indicator}
		class:enabled={navItems.length}
		style={`left: ${left}px; width: ${width}px; height:${height}px;`}
	>
		<!-- svelte-ignore element_invalid_self_closing_tag -->
		<div
			class:moving
			class="dot w-[6px] h-[6px] bg-neutral-50 rounded-full translate-y-1 opacity-0 transition-all ease-smooth duration-500"
		/>
	</div>
</div>

<style lang="postcss">
	.selected {
		@apply -translate-y-1 text-opacity-95;
	}

	.moving {
		@apply w-4;
	}

	.enabled {
		.dot {
			@apply opacity-100;
		}
	}
</style>
