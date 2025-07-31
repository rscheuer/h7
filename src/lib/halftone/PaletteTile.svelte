<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Popover from '$lib/components/ui/popover';
	import * as Select from '$lib/components/ui/select';
	import ColorPicker from '$lib/util/ColorPicker.svelte';
	import { createEventDispatcher } from 'svelte';
	import type { Tile } from './newPalette';
	import { colorPalettesList, masterList, newPalettes } from './newPalette';
	import RenderedSVG from './RenderedSVG.svelte';

	const dispatch = createEventDispatcher();

	export let tile: Tile;
	export let i = 0;

	let isOpen = false;

	let useSourceColor = tile.colorMode === 'source';
	let customColor = tile.color ? tile.color : '#000000';

	function handleSourceColorToggle(event: Event) {
		useSourceColor = (event.target as HTMLInputElement).checked;
		// customColor = useSourceColor ? '#000000' : tile.color;
		// tile.color = customColor;
		tile.colorMode = useSourceColor ? 'source' : 'custom';
		dispatch('updateTileColor', {
			index: i,
			colorMode: useSourceColor ? 'source' : 'custom',
			customColor
		});
	}

	function handleTileChange(svg: string) {
		tile.svg = svg;
		dispatch('updateTileSVG', { index: i, svg });
	}

	function handleCustomColorChange() {
		tile.color = customColor;
		tile.colorMode = useSourceColor ? 'source' : 'custom';
		dispatch('updateTileColor', {
			index: i,
			colorMode: useSourceColor ? 'source' : 'custom',
			customColor
		});
	}

	// async function loadSVG(url: string): Promise<SVGElement> {
	// 	const response = await fetch(url);
	// 	const text = await response.text();
	// 	const parser = new DOMParser();
	// 	const doc = parser.parseFromString(text, 'image/svg+xml');
	// 	return doc.documentElement as unknown as SVGElement;
	// }

	// async function renderSVG(url: string, color: string) {
	// 	const svg = await loadSVG(url);
	// 	svg.querySelectorAll('path, circle, rect, polygon').forEach((element) => {
	// 		(element as SVGElement).setAttribute('fill', color);
	// 	});
	// 	svg.setAttribute('width', '100%');
	// 	svg.setAttribute('height', '100%');
	// 	const serializer = new XMLSerializer();
	// 	const string = serializer.serializeToString(svg);
	// 	return string;
	// }

	// $: renderedSVG = renderSVG(tile.svg, tile.color);
</script>

<Popover.Root bind:open={isOpen}>
	<Popover.Trigger>
		<div class:open={isOpen} class="p-0.5 w-6 h-6 bg-white rounded border dark:bg-neutral-900">
			<!-- {#await renderedSVG}
				<p>...</p>
			{:then svg}
				<p>{@html svg}</p>
			{:catch error}
				<p>Error: {error.message}</p>
			{/await} -->
			<RenderedSVG svg={tile.svg} color={tile.color} {useSourceColor} />
		</div>
	</Popover.Trigger>
	<Popover.Content>
		<div class="flex flex-col gap-2 text-xs">
			<div class="flex flex-wrap gap-1">
				{#each masterList as tileOption}
					<button
						on:click={() => handleTileChange(tileOption.svg)}
						class="p-px w-6 h-6 bg-white rounded border"
					>
						<RenderedSVG svg={tileOption.svg} color={tile.color} {useSourceColor} />
					</button>
				{/each}
			</div>

			<div class="space-y-2">
				<ColorPicker
					class="w-9 h-9 rounded-md border shadow-sm border-input bg-background"
					name="tileColor"
					id="tileColor{Math.random()}"
					bind:value={customColor}
					on:change={handleCustomColorChange}
				/>

				<Label for="tile">
					<span class="text-xs">{tile.color}</span>
				</Label>

				<div class="flex gap-2 items-center">
					<input
						type="checkbox"
						id="useSourceColor{i}"
						bind:checked={useSourceColor}
						on:change={handleSourceColorToggle}
						class="rounded border"
					/>
					<Label for="useSourceColor{i}" class="text-xs">Use source image color</Label>
				</div>

				<div class="flex flex-col gap-1">
					<p class="text-xs opacity-50">Suggested palettes</p>
					{#each colorPalettesList as palette}
						<div class="flex gap-1">
							{#each palette.colors as color}
								<!-- svelte-ignore a11y_consider_explicit_label -->
								<!-- svelte-ignore element_invalid_self_closing_tag -->
								<button
									on:click={() => {
										customColor = color;
										handleCustomColorChange();
									}}
									style="background-color: {color}"
									class="w-6 h-4 rounded-md border shadow-sm border-input bg-background"
								/>
								<!-- <span class="text-xs">{color}</span> -->
							{/each}
						</div>
					{/each}
				</div>
			</div>
		</div>
	</Popover.Content>
</Popover.Root>

<style lang="postcss">
	.open {
		@apply border-2 border-blue-300;
	}
</style>
