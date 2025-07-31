<script lang="ts">
	export let text = 'Read Article';
	export let url = '#';
	export let color = 'black';
	export let bgColor = 'white';

	let textItem: HTMLDivElement;
	let icon: HTMLDivElement;
</script>

<a class="button" href={url} style={`--color:${color}; --bg-color:${bgColor}`}>
	<div class="button--text" id={`text-${color}`} bind:this={textItem}>
		<p>
			{text}
		</p>
	</div>
	<div bind:this={icon} class="button--icon" style={`--left-margin: ${textItem?.offsetWidth}px;`}>
		<svg
			width="24px"
			height="24px"
			stroke-width="2.5"
			viewBox="0 0 24 24"
			style="transform: scale(1.9);"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			{color}
			><path
				d="M12.25 18.5V6m0 0l6 6m-6-6l-6 6"
				stroke={color}
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/></svg
		>
	</div>
</a>

<style lang="postcss">
	.button {
		@apply overflow-hidden relative block;
		@apply p-0 rounded-full;
		background-color: var(--color);

		&:hover {
			.button--icon {
				margin-left: var(--left-margin);
				transform: rotate(90deg);
			}
		}
		&--text {
			@apply absolute w-fit flex items-center h-full px-6;
			@apply overflow-hidden text-xl;
			white-space: nowrap;
			color: var(--bg-color);
		}

		&--icon {
			@apply relative;
			@apply border-4;
			@apply p-4 rounded-full;
			border-color: var(--color);
			background-color: var(--bg-color);
			/* transition: all 0.3s ease; */
			transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
			transform: rotate(135deg);
		}
	}
</style>
