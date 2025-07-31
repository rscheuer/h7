<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let value = 50;
	export let min = 0;
	export let max = 100;
	export let step = 1;

	export let label = 'Value';

	export let unit = '';

	const dispatch = createEventDispatcher();

	// @ts-ignore
	function handleInput(event) {
		value = event.target.value;
		dispatch('change', value);
	}
</script>

<div class="flex items-center gap-2">
	<div
		style="--percentage: {((value - min) * 100) / (max - min)}%"
		id="sound-slider__container"
		class="px-0 py-4 group relative"
	>
		<input
			type="range"
			class="sw-32 bg-neutral-800 bg-opacity-10 drop-shadow-sm group-hover:drop-shadow-xl"
			bind:value
			{min}
			{max}
			{step}
			on:input={handleInput}
		/>
		<!-- svelte-ignore a11y_label_has_associated_control -->
		<div
			class="absolute bottom-full left-0 group-hover:left-2 label translate-y-3 group-hover:translate-y-6 text-xs pointer-events-none opacity-90"
		>
			{label}
		</div>
	</div>
	<div class="flex border w-fit px-2 pr-3 py-1 rounded-lg bg-white text-center">
		<input
			type="number"
			name="number"
			class="text-center"
			bind:value
			{min}
			{max}
			{step}
			on:input={handleInput}
		/>
		<label for="number">{unit}</label>
	</div>

	<!-- <div class="flex flex-col gap-1">
		<button class="w-6 h-6 text-center" on:click={() => (value = Math.max(min, value - 1))}
			>-</button
		>
		<button class="w-6 h-6 text-center" on:click={() => (value = Math.min(max, value + 1))}
			>+</button
		>
	</div> -->
</div>

<style lang="postcss">
	:root {
		/* --percentage: 30%; */
		--main-color: 255, 255, 255;
		--el-bg-color: 220, 220, 220;
	}
	#sound-slider__container {
		display: flex;
		width: 300px;
		height: 20px;
		/* padding: 20px 40px; */
		/* background: rgba(var(--main-color), 0.07); */
		border: 1px solid rgba(var(--main-color), 0.03);
		border-radius: 1in;
		align-items: center;
		justify-content: center;
		position: relative;
		/* overflow: hidden; */

		&:hover {
			input[type='range'] {
				height: 2em;
			}
		}
	}

	#sound-slider__container::after {
		content: '';
		height: 100%;
		opacity: 0;
		left: 0px;
		position: absolute;
		top: 0px;
		transition: opacity 500ms;
		width: 100%;
		/* background: radial-gradient(
			500px circle at var(--mouse-x) var(--mouse-y),
			rgba(var(--main-color), 0.06),
			transparent 40%
		); */
		z-index: -1;
	}

	#sound-slider__container:hover::after {
		opacity: 1;
	}
	input[type='range'] {
		@apply md:h-[5px] h-[2em];
		/* margin: 0 10px; */
		appearance: none;
		width: 100%;
		/* height: 5px; */
		border-radius: 12px;
		outline: none;
		transition: height 0.5s cubic-bezier(0.16, 1, 0.3, 1);
		/* transition: 0.2s; */
		cursor: pointer;
		/* background: rgba(var(--el-bg-color), 0.5); */
		/* background: grey; */
		background-image: linear-gradient(rgb(var(--main-color)), rgb(var(--main-color)));
		background-size: calc(var(--percentage) - 9px) 100%;
		background-repeat: no-repeat;
		position: relative;
		overflow: hidden;
	}

	/* round the volume progress */
	input[type='range']::after {
		position: absolute;
		content: '';
		height: 100%;
		width: 10px;
		border-radius: 0 12px 12px 0;
		background-color: rgb(var(--main-color));
		/* transition: 0.2s; */
		left: calc(var(--percentage) - 10px);
		transition: border-radius 0.5s cubic-bezier(0.16, 1, 0.3, 1);
	}

	input[type='range']:hover::after {
		border-radius: 0 0px 0px 0;
	}

	input[type='range']::-webkit-slider-thumb {
		appearance: none;
		visibility: hidden;
		width: 1px;
		height: 10px;
	}

	/* input[type='range']:hover {
		height: 1em;
	} */

	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	/* Firefox */
	input[type='number'] {
		-moz-appearance: textfield;
	}

	.label {
		transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
	}
</style>
