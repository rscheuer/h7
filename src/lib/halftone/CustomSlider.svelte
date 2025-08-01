<script>
	export let min = 0;
	export let max = 100;
	export let value = 0;
	export let step = 1;
	export let label = '';
	export let thumbColor = '#ff4747';
	export let trackColor = '#c9c9c9';
	export let thumbWidth = '10px';
	export let thumbHeight = '60px';
</script>

<div class="flex items-center space-x-2">
	<input
		style="--thumb-color: {thumbColor}; --track-color: {trackColor}; --thumb-width: {thumbWidth}; --thumb-height: {thumbHeight}"
		type="range"
		bind:value
		{min}
		{max}
		{step}
	/>
</div>

<style>
	/*********** Baseline, reset styles ***********/
	input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		cursor: pointer;
		width: 100%;
		height: 100%;
	}

	/* Removes default focus */
	input[type='range']:focus {
		outline: none;
	}

	/******** Chrome, Safari, Opera and Edge Chromium styles ********/
	/* slider track */
	input[type='range']::-webkit-slider-runnable-track {
		background-color: var(--track-color);
		border-radius: 0rem;
		height: var(--thumb-height);
	}

	/* slider thumb */
	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none; /* Override default look */
		appearance: none;
		/* margin-top: calc(var(--thumb-height) / ); Centers thumb on the track */
		background-color: var(--thumb-color);
		border-radius: 0rem;
		height: var(--thumb-height);
		width: var(--thumb-width);
		/* clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); */
	}

	/*********** Firefox styles ***********/
	/* slider track */
	input[type='range']::-moz-range-track {
		background-color: var(--track-color);
		border-radius: 0rem;
		height: 4rem;
	}

	/* slider thumb */
	input[type='range']::-moz-range-thumb {
		background-color: var(--thumb-color);
		border: none; /*Removes extra border that FF applies*/
		border-radius: 0rem;
		height: var(--thumb-height);
		width: var(--thumb-width);
	}

	input[type='range']:focus::-moz-range-thumb {
		outline: 3px solid var(--thumb-color);
		outline-offset: 0.125rem;
	}
</style>
