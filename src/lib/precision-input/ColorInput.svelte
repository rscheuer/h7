<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';

	const dispatch = createEventDispatcher();

	export let value = '';

	// @ts-ignore
	function handleChange(event) {
		// value = event.target.value;
		dispatch('change', value);
	}
</script>

<div class="w-fit bg-white shadow-lg flex flex-col" id="swatch">
	<input
		type="color"
		id="color"
		name="color"
		class="appearance-none bg-none border-0 cursor-pointer h-20 w-20 p-0 focus:outline-none focus:rounded-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-none [&::-moz-color-swatch]:border-0 [&::-moz-focus-inner]:border-0 [&::-moz-focus-inner]:p-0"
		bind:value
		on:input={handleChange}
	/>
	<div class="p-2">
		<h1 class="m-0 uppercase">Input</h1>
		<h2 class="m-0 font-normal">Color</h2>
	</div>
</div>
