<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';

	const dispatch = createEventDispatcher();

	export let title = '';
	export let text = '';
	export let heights: any;
	export let status = 'default';

	export let index: number;
	export let stack: number;
	export let isHovering: boolean = false;
	export let shadow = true;

	export let position: string = 'top-right';

	let nodeHeight: number;
	let isFront: boolean = false;
	let isOpen: boolean = false;

	let item: HTMLDivElement;

	let gap = 10;

	let invert = -1;

	function getPosition(pos: string) {
		switch (pos) {
			case 'top-left':
				invert = 1;
				return 'top-5 left-5';
			case 'top-right':
				invert = 1;
				return 'top-5 right-5';
			case 'bottom-left':
				invert = -1;
				return 'bottom-5 left-5';
			case 'bottom-right':
				invert = -1;
				return 'bottom-5 right-5';
			default:
				return 'bottom-5 right-5';
		}
	}

	function toastsHeightBefore(heightsArray: any) {
		const thb = heightsArray.reduce((prev: any, curr: any, reducerIndex: any) => {
			if (reducerIndex >= index) {
				return prev;
			}

			return prev + curr + gap;
		}, 0);

		return thb;
	}

	$: previousHeight = toastsHeightBefore(heights);

	$: firstHeight = heights[0] ? heights[0] : 66;

	$: index, setHeights(item);

	function setHeights(node: HTMLDivElement) {
		if (node) {
			let h = node.clientHeight;
			// console.log(index, h);
			dispatch('height', {
				height: nodeHeight,
				index: index
			});
		}
	}
</script>

<div
	in:fly|local={{ y: -invert * 50, duration: 400 }}
	out:fly|local={{ y: invert * 10, duration: 300 }}
	bind:this={item}
	data-front={isFront}
	data-state={isOpen ? 'open' : 'closed'}
	data-hovering={isHovering}
	data-hidden={index > 3}
	class="in pointer-events-auto {getPosition(position)} {status}"
	class:shadowOn={shadow}
	style="
	--y:translateY({invert * (index * 10)}px); 
	--index:{index}; z-index:{stack}; 
	--offset:calc({invert} * {previousHeight}px);
	 --gap: calc(1px * {gap}); 
	 --shift: calc({-invert}px * {gap + 4} * {index ? 1 : 0});
	 --opacity: calc(1 - {index} * 0.2);
	 --contentOpacity: {index ? 0 : 1};
	 --firstH:{firstHeight}px;
	 "
>
	<div class="in--bg">
		<!--  -->
	</div>
	<div class="in--wrap">
		<div bind:clientHeight={nodeHeight} class="in--content">
			{#if title && title.length}
				<div class="in--title">
					{title}
				</div>
			{/if}
			<div class="in--text">
				{text}
			</div>
		</div>
	</div>
</div>

<style lang="postcss">
	.in {
		---y: translateY(var(--offset));
		@apply absolute cursor-default;
		@apply w-[260px] text-sm rounded-lg border;
		@apply text-neutral-900 bg-neutral-100 border-neutral-300;
		/* @apply bg-white text-black border-neutral-200; */
		transform-origin: center;
		transform: var(--y) scale(calc(-1 * var(--index) * 0.05 + 1));
		/* transition: all 0.5s cubic-bezier(0.215, 0.61, 0.355, 1); */
		transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);

		&.shadowOn {
			/* box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 10px 0px; */
			box-shadow: 0 2px 10px #0000001a;
			/* box-shadow: 0 4px 12px #0000001a; */
		}

		&.bottom-right {
			@apply bottom-5 right-5;
		}
		&.top-left {
			@apply bottom-5 left-5;
		}

		&--content {
			transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
			@apply p-3;
		}

		&:hover {
			@apply bg-neutral-200;
			/* @apply */

			.in--text {
				@apply opacity-70;
			}
		}

		&.default {
			/*  */
		}

		&.dark {
			@apply bg-neutral-900 text-neutral-100 border-neutral-600;

			&:hover {
				@apply bg-neutral-800;
			}
		}

		&.success {
			@apply bg-green-100 text-green-900 border-green-300;

			&:hover {
				@apply bg-green-200;
			}
		}

		&.warning {
			@apply bg-yellow-100 text-yellow-900 border-yellow-300;

			&:hover {
				@apply bg-yellow-200;
			}
		}

		&.error {
			@apply bg-red-100 text-red-900 border-red-300;

			&:hover {
				@apply bg-red-200;
			}
		}

		&.info {
			@apply bg-blue-100 text-blue-900 border-blue-300;

			&:hover {
				@apply bg-blue-200;
			}
		}

		&[data-hidden='true'] {
			@apply hidden;
		}

		&[data-hovering='true'] {
			/* @apply hidden; */
			transform: var(---y) scale(calc(1));

			.in--content {
				transform: translateY(0);
				opacity: 1;
			}
		}

		&[data-hovering='false'] {
			.in--wrap {
				height: var(--firstH);
			}

			.in--content {
				transform: translateY(var(--shift));
				opacity: var(--contentOpacity);
			}
		}

		&--wrap {
			@apply overflow-hidden;
			/* transition: all 0.8s cubic-bezier(0.215, 0.61, 0.355, 1); */
			transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
		}

		&:before {
			content: '';
			@apply absolute w-full left-0;
			/* @apply bg-neutral-600; */
			top: -10px;
			height: 10px;
		}

		&--text {
			@apply opacity-50 transition-all;
		}
	}
</style>
