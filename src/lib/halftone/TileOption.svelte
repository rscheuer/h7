<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Popover from '$lib/components/ui/popover';
	import * as Select from '$lib/components/ui/select';
	import { defaultPalettes } from '$lib/halftone/defaultPalette';
	import ColorPicker from '$lib/util/ColorPicker.svelte';
	import { createEventDispatcher, onMount } from 'svelte';
	const dispatch = createEventDispatcher();

	export let tileImages: any[];
	export let i: number;

	type ColorMode = 'default' | 'custom' | 'source';

	interface SelectedMode {
		value: ColorMode;
		label: string;
	}

	let selectedMode: SelectedMode = { value: 'default', label: 'Default Color' };

	let selectedTileImage: string | null = null;
	let colorMode: ColorMode = 'default';
	let customColor: string = '#000000';

	let hasCustomTile = false;

	function handleTileImageSelect(index: number, imageUrl: string) {
		selectedTileImage = imageUrl;
		dispatch('tileImageSelect', { index, imageUrl, colorMode, customColor });
	}

	function handleColorModeChange(mode: any) {
		console.log('selectedMode', mode);
		// colorMode = (e.target as HTMLSelectElement).value as 'default' | 'custom' | 'source';
		dispatch('updateTileColor', { index: i, colorMode, customColor });
	}

	function handleCustomColorChange() {
		if (colorMode === 'custom') {
			dispatch('updateTileColor', { index: i, colorMode, customColor });
		}
	}

	function handleTileImageUpload(e: Event, index: number) {
		hasCustomTile = true;
		dispatch('tileImageUpload', { e, index });
	}

	function removeTileImage(index: number) {
		dispatch('removeTileImage', { index });
	}

	const palettes = Object.entries(defaultPalettes);

	$: console.log('palettes', palettes);

	$: colorMode = selectedMode.value;

	$: handleColorModeChange(colorMode);
</script>

<div class="space-y-2 border p-2 flex gap-2 bg-white rounded-xl">
	<!-- <div class="w-12 h-12">
		{#if tileImages[i]}
			<div class="w-full h-full bg-white rounded overflow-hidden">
				<img
					src={tileImages[i].canvas.toDataURL()}
					alt="Preview"
					class="w-full h-full object-contain"
				/>
			</div>
		{/if}
	</div> -->
	<div class="w-full">
		<div class="flex gap-2 flex-wrap">
			{#each Object.entries(defaultPalettes) as [key, urls]}
				{#each urls as url}
					<button
						on:click={() => handleTileImageSelect(i, url)}
						class="w-6 h-6 p-0.5 border rounded {selectedTileImage == url
							? 'border-blue-500 border-2'
							: ''}"
					>
						<img src={url} alt="Preview" class="w-full h-full object-contain" />
					</button>
				{/each}
			{/each}
		</div>
		<div class="flex items-end flex-wrap gap-2 justify-between">
			<div class="flex items-center gap-2 mt-2">
				<Select.Root
					disabled={hasCustomTile}
					on:selectedChange={handleColorModeChange}
					bind:selected={selectedMode}
				>
					<Select.Trigger class="w-[180px]">
						<Select.Value placeholder="Theme" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="default">Default Color</Select.Item>
						<Select.Item value="custom">Custom Color</Select.Item>
						<Select.Item value="source">From Source Image</Select.Item>
					</Select.Content>
				</Select.Root>

				{#if colorMode === 'custom'}
					<div class="">
						<ColorPicker
							class="w-9 h-9 rounded-md border border-input bg-background shadow-sm"
							name="tileColor"
							id="tileColor{Math.random()}"
							bind:value={customColor}
							on:change={handleCustomColorChange}
						/>
					</div>
				{/if}
			</div>

			<Popover.Root>
				<Popover.Trigger>
					<Button variant="outline">Options</Button>
				</Popover.Trigger>
				<Popover.Content>
					<div class="flex flex-col gap-2 text-xs">
						<div class="grid w-full max-w-sm items-center gap-1.5">
							<Label for="tile">Custom Tile</Label>
							<Input
								class="pt-1.5"
								on:change={(e) => handleTileImageUpload(e, i)}
								id="tile"
								type="file"
							/>
						</div>

						<Button on:click={() => removeTileImage(i)} variant="destructive">Remove Tile</Button>
					</div>
				</Popover.Content>
			</Popover.Root>
		</div>
	</div>
</div>

<style lang="postcss">
	input[type='file'] {
		overflow: visible;
		display: block;
		position: relative;

		&::file-selector-button {
			outline: none !important;
			background-color: white !important;
			border: 1px solid #e5e5e5 !important;
		}
	}
</style>
