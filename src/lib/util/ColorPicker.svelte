<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
	export let name: string = '';
	export let id: string = '';

	let className: string = '';

	export { className as class };

	export let value: string = '#000000';

	function handleChange(e: Event) {
		dispatch('change', (e.target as HTMLInputElement).value);
	}

	// $: console.log('value', value);
</script>

<label style="background-color: {value}" for={id} class="{className} block">
	<input type="color" {name} {id} on:change={handleChange} bind:value />
</label>

<style>
	input {
		visibility: hidden;
	}

	label {
		background-color: black;
		position: relative;
	}
</style>
