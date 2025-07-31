<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Popover from '$lib/components/ui/popover';
	import * as Select from '$lib/components/ui/select';
	import { createEventDispatcher } from 'svelte';
	import type { PaletteType } from './newPalette';
	import { newPalettes } from './newPalette';
	import PaletteTile from './PaletteTile.svelte';

	export let palette: PaletteType;
	export let index: number;
	export let isSelected = false;

	const dispatch = createEventDispatcher();

	async function loadSVG(url: string): Promise<SVGElement> {
		const response = await fetch(url);
		const text = await response.text();
		const parser = new DOMParser();
		const doc = parser.parseFromString(text, 'image/svg+xml');
		return doc.documentElement as unknown as SVGElement;
	}

	async function renderSVG(url: string, color: string) {
		const svg = await loadSVG(url);
		svg.querySelectorAll('path, circle, rect, polygon').forEach((element) => {
			(element as SVGElement).setAttribute('fill', color);
		});
		svg.setAttribute('width', '100%');
		svg.setAttribute('height', '100%');
		const serializer = new XMLSerializer();
		const string = serializer.serializeToString(svg);
		return string;
	}

	function handlePaletteSelect(palette: PaletteType) {
		dispatch('paletteSelect', { palette, index });
	}

	function setTileColor(color: string, index: number) {
		palette.tiles[index].color = color;
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="flex relative gap-2 items-center p-2 rounded-md cursor-pointer border-border hover:bg-accent {isSelected
		? 'bg-accent'
		: ''}"
>
	<!-- svelte-ignore element_invalid_self_closing_tag -->
	<!-- svelte-ignore a11y_consider_explicit_label -->
	<button on:click={() => handlePaletteSelect(palette)} class="absolute inset-0 z-0 rounded-md" />
	<div class="flex z-10 gap-2">
		{#each palette.tiles as tile, i}
			{#key i}
				<PaletteTile
					on:updateTileColor
					on:updateTileSVG={() => {
						handlePaletteSelect(palette);
					}}
					{tile}
					{i}
				/>
			{/key}
		{/each}
	</div>
</div>
