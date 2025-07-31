<script lang="ts">
	import { browser } from '$app/environment';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Resizable from '$lib/components/ui/resizable/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { newPalettes } from '$lib/halftone/newPalette';
	import Palette from '$lib/halftone/Palette.svelte';
	import { onDestroy, onMount } from 'svelte';
	import Histogram from './Histogram.svelte';
	import type { PaletteType } from './newPalette';
	import type { PixelData } from './types.ts';

	let container: HTMLElement;
	let sourceImg: HTMLImageElement;
	let tileImages: (SVGElement | null)[] = [];
	let svgOutput: SVGSVGElement;

	// Control variables
	let pixelSize = 14; // Size of each "pixel" in the output
	let invertSource = false;
	let selectedPalette: PaletteType | null = null;
	let minWidth = 1080;
	let fitToScreen = true;
	let brightnessAdjustment = 0; // Range from -100 to 100
	let scalingMode = false; // New toggle for scaling mode
	let darkMode = false;

	// Global values
	let pixelData: PixelData[] = [];

	function setDarkMode(value: boolean) {
		if (browser) {
			document.documentElement.classList.toggle('dark', value);
		}
	}

	$: if (darkMode) {
		setDarkMode(true);
	} else {
		setDarkMode(false);
	}

	// Canvas for image processing
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;

	// Add to your existing variables
	let tileColors: { mode: 'default' | 'custom' | 'source'; color?: string }[] = [];
	let loadedTileImages: Record<string, SVGElement> = {};

	// Add this variable to track the selected palette index
	let selectedPaletteIndex = 0;

	onMount(() => {
		// Create hidden canvas for image processing
		canvas = document.createElement('canvas');
		ctx = canvas.getContext('2d')!;

		// Create SVG element
		svgOutput = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svgOutput.setAttribute('shape-rendering', 'crispEdges');
		container.appendChild(svgOutput);

		// Load default image
		loadImage('/demo.jpg');

		// Apply first palette by default
		let startEvent = new CustomEvent<{ palette: PaletteType; index: number }>('paletteSelect', {
			detail: { palette: newPalettes[0], index: 0 }
		});
		handlePaletteSelect(startEvent);

		// Add paste event listener only in browser environment
		if (browser) {
			window.addEventListener('paste', handlePaste);
		}
	});

	// Clean up event listener on component destruction
	onDestroy(() => {
		if (browser) {
			window.removeEventListener('paste', handlePaste);
		}
	});

	function handlePaste(event: ClipboardEvent) {
		const items = event.clipboardData?.items;
		if (!items) return;

		for (const item of items) {
			if (item.type.indexOf('image') !== -1) {
				const file = item.getAsFile();
				if (file) {
					const reader = new FileReader();
					reader.onload = (e) => {
						loadImage(e.target?.result as string);
					};
					reader.readAsDataURL(file);
					break;
				}
			}
		}
	}

	async function loadImage(src: string) {
		sourceImg = new Image();
		sourceImg.onload = updateOutput;
		sourceImg.src = src;
	}

	async function loadSVG(url: string): Promise<SVGElement> {
		const response = await fetch(url);
		const text = await response.text();
		const parser = new DOMParser();
		const doc = parser.parseFromString(text, 'image/svg+xml');
		return doc.documentElement as unknown as SVGElement;
	}

	function applyFloydSteinbergDithering(pixels: Uint8ClampedArray, width: number, height: number) {
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const idx = (y * width + x) * 4;
				const oldR = pixels[idx];
				const oldG = pixels[idx + 1];
				const oldB = pixels[idx + 2];
				const newR = Math.round(oldR / 255) * 255;
				const newG = Math.round(oldG / 255) * 255;
				const newB = Math.round(oldB / 255) * 255;
				const errR = oldR - newR;
				const errG = oldG - newG;
				const errB = oldB - newB;
				pixels[idx] = newR;
				pixels[idx + 1] = newG;
				pixels[idx + 2] = newB;
				// Distribute error
				for (const [dx, dy, factor] of [
					[1, 0, 7 / 16],
					[-1, 1, 3 / 16],
					[0, 1, 5 / 16],
					[1, 1, 1 / 16]
				]) {
					const nx = x + dx;
					const ny = y + dy;
					if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
					const nidx = (ny * width + nx) * 4;
					pixels[nidx] = Math.max(0, Math.min(255, pixels[nidx] + errR * factor));
					pixels[nidx + 1] = Math.max(0, Math.min(255, pixels[nidx + 1] + errG * factor));
					pixels[nidx + 2] = Math.max(0, Math.min(255, pixels[nidx + 2] + errB * factor));
				}
			}
		}
	}

	function updateOutput() {
		if (!sourceImg || tileImages.length === 0) return;

		// Clear previous SVG content more efficiently
		svgOutput.replaceChildren();

		// Set dimensions
		const aspectRatio = sourceImg.height / sourceImg.width;
		const width = 800;
		const height = Math.round(width * aspectRatio);

		// Set SVG dimensions
		svgOutput.setAttribute('width', width.toString());
		svgOutput.setAttribute('height', height.toString());

		// Update the class based on fitToScreen
		svgOutput.classList.remove('w-full', 'h-auto', 'max-h-full', 'object-contain');
		if (fitToScreen) {
			svgOutput.classList.add('max-h-full', 'object-contain');
		} else {
			svgOutput.classList.add('w-full', 'h-auto');
		}

		svgOutput.setAttribute('viewBox', `0 0 ${width} ${height}`);

		// Set canvas dimensions and draw source image
		canvas.width = sourceImg.width;
		canvas.height = sourceImg.height;
		ctx.drawImage(sourceImg, 0, 0);

		// Get image data
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const pixels = imageData.data;

		// Apply brightness adjustment
		const brightnessFactor = 1 + brightnessAdjustment / 100;
		for (let i = 0; i < pixels.length; i += 4) {
			pixels[i] = Math.min(255, Math.max(0, pixels[i] * brightnessFactor)); // R
			pixels[i + 1] = Math.min(255, Math.max(0, pixels[i + 1] * brightnessFactor)); // G
			pixels[i + 2] = Math.min(255, Math.max(0, pixels[i + 2] * brightnessFactor)); // B
		}
		// ctx.putImageData(imageData, 0, 0);

		// applyFloydSteinbergDithering(pixels, canvas.width, canvas.height);
		ctx.putImageData(imageData, 0, 0);

		// Calculate grid dimensions
		const cols = Math.floor(width / pixelSize);
		const rows = Math.floor(height / pixelSize);

		// Create a document fragment to batch DOM operations
		const fragment = document.createDocumentFragment();

		// Pre-calculate pixel data for the entire image
		pixelData = new Array(cols * rows);
		for (let i = 0; i < cols; i++) {
			for (let j = 0; j < rows; j++) {
				const imgX = Math.floor(((i * pixelSize) / width) * canvas.width);
				const imgY = Math.floor(((j * pixelSize) / height) * canvas.height);
				const index = (imgY * canvas.width + imgX) * 4;
				const r = pixels[index];
				const g = pixels[index + 1];
				const b = pixels[index + 2];
				const brightness = invertSource ? 1 - (r + g + b) / (255 * 3) : (r + g + b) / (255 * 3);

				pixelData[j * cols + i] = {
					brightness,
					r,
					g,
					b,
					x: i * pixelSize,
					y: j * pixelSize
				};
			}
		}

		// Create a template for each tile variant
		const tileTemplates = tileImages.map((tileSvg) => {
			if (!tileSvg) return null;
			// Check if the SVG has any meaningful content
			const hasContent = tileSvg.querySelector(
				'path, circle, rect, polygon, line, polyline, ellipse'
			);
			if (!hasContent) return null;

			const template = tileSvg.cloneNode(true) as SVGElement;
			template.removeAttribute('x');
			template.removeAttribute('y');
			return template;
		});

		// Track which cells have been filled by larger tiles
		const filledCells = new Set<number>();

		// Process tiles from largest to smallest to ensure proper grid alignment
		if (scalingMode) {
			// Start with the largest tiles (highest index) and work down
			for (let tileIndex = tileImages.length - 1; tileIndex >= 0; tileIndex--) {
				const scale = Math.pow(2, tileIndex);
				const template = tileTemplates[tileIndex];
				if (!template) continue;

				// Calculate grid dimensions for this scale
				const scaledCols = Math.floor(cols / scale);
				const scaledRows = Math.floor(rows / scale);

				// Process each cell in the scaled grid
				for (let i = 0; i < scaledCols; i++) {
					for (let j = 0; j < scaledRows; j++) {
						// Calculate the base position in the original grid
						const baseX = i * scale;
						const baseY = j * scale;
						const cellIndex = baseY * cols + baseX;

						// Skip if any cell in this area is already filled
						let skip = false;
						for (let si = 0; si < scale && !skip; si++) {
							for (let sj = 0; sj < scale && !skip; sj++) {
								const checkIndex = (baseY + sj) * cols + (baseX + si);
								if (filledCells.has(checkIndex)) {
									skip = true;
								}
							}
						}
						if (skip) continue;

						// Get the brightness from the center of the scaled area
						const centerX = Math.floor(baseX + scale / 2);
						const centerY = Math.floor(baseY + scale / 2);
						const centerIndex = centerY * cols + centerX;
						const { brightness, r, g, b } = pixelData[centerIndex];

						// Only place tile if it matches the current brightness level
						const currentTileIndex = Math.min(
							tileImages.length - 1,
							Math.max(0, Math.floor(brightness * tileImages.length))
						);
						if (currentTileIndex !== tileIndex) continue;

						const tile = template.cloneNode(true) as SVGElement;

						// Add a small overlap by adjusting position and size
						const overlap = 0.2;
						tile.setAttribute('x', (baseX * pixelSize - overlap / 2).toString());
						tile.setAttribute('y', (baseY * pixelSize - overlap / 2).toString());
						tile.setAttribute('width', (pixelSize * scale + overlap).toString());
						tile.setAttribute('height', (pixelSize * scale + overlap).toString());

						// Mark all cells in this area as filled
						for (let si = 0; si < scale; si++) {
							for (let sj = 0; sj < scale; sj++) {
								const fillIndex = (baseY + sj) * cols + (baseX + si);
								if (fillIndex < cols * rows) {
									filledCells.add(fillIndex);
								}
							}
						}

						// Apply color based on mode
						if (tileColors[tileIndex]) {
							const colorConfig = tileColors[tileIndex];
							if (colorConfig.mode === 'custom' && colorConfig.color) {
								tile.querySelectorAll('path, circle, rect, polygon').forEach((element) => {
									(element as SVGElement).setAttribute('fill', colorConfig.color!);
								});
							} else if (colorConfig.mode === 'source') {
								const color = `rgb(${r}, ${g}, ${b})`;
								tile.querySelectorAll('path, circle, rect, polygon').forEach((element) => {
									(element as SVGElement).setAttribute('fill', color);
								});
							} else if (colorConfig.mode === 'default') {
								// Use the default color from the palette
								const defaultColor = selectedPalette?.tiles[tileIndex].color || '#000000';
								tile.querySelectorAll('path, circle, rect, polygon').forEach((element) => {
									(element as SVGElement).setAttribute('fill', defaultColor);
								});
							}
						}

						fragment.appendChild(tile);
					}
				}
			}
		} else {
			// Original non-scaling mode behavior
			for (let i = 0; i < cols; i++) {
				for (let j = 0; j < rows; j++) {
					const cellIndex = j * cols + i;
					const { brightness, r, g, b, x, y } = pixelData[cellIndex];
					const tileIndex = Math.min(
						tileImages.length - 1,
						Math.max(0, Math.floor(brightness * tileImages.length))
					);
					const template = tileTemplates[tileIndex];
					if (!template) continue;

					const tile = template.cloneNode(true) as SVGElement;

					// Add a small overlap by adjusting position and size
					const overlap = 0.2;
					tile.setAttribute('x', (x - overlap / 2).toString());
					tile.setAttribute('y', (y - overlap / 2).toString());
					tile.setAttribute('width', (pixelSize + overlap).toString());
					tile.setAttribute('height', (pixelSize + overlap).toString());

					// Apply color based on mode
					if (tileColors[tileIndex]) {
						const colorConfig = tileColors[tileIndex];
						if (colorConfig.mode === 'custom' && colorConfig.color) {
							tile.querySelectorAll('path, circle, rect, polygon').forEach((element) => {
								(element as SVGElement).setAttribute('fill', colorConfig.color!);
							});
						} else if (colorConfig.mode === 'source') {
							const color = `rgb(${r}, ${g}, ${b})`;
							tile.querySelectorAll('path, circle, rect, polygon').forEach((element) => {
								(element as SVGElement).setAttribute('fill', color);
							});
						} else if (colorConfig.mode === 'default') {
							// Use the default color from the palette
							const defaultColor = selectedPalette?.tiles[tileIndex].color || '#000000';
							tile.querySelectorAll('path, circle, rect, polygon').forEach((element) => {
								(element as SVGElement).setAttribute('fill', defaultColor);
							});
						}
					}

					fragment.appendChild(tile);
				}
			}
		}

		// Single DOM update
		svgOutput.appendChild(fragment);
	}

	function handleSourceImageUpload(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				loadImage(e.target?.result as string);
			};
			reader.readAsDataURL(file);
		}
	}

	function getTimestamp() {
		const now = new Date();
		return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now
			.getDate()
			.toString()
			.padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now
			.getMinutes()
			.toString()
			.padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
	}

	function exportSVG() {
		if (!svgOutput) return;

		const serializer = new XMLSerializer();
		const svgString = serializer.serializeToString(svgOutput);
		const blob = new Blob([svgString], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);

		const link = document.createElement('a');
		link.href = url;
		link.download = `halftone_${getTimestamp()}.svg`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	function exportPNG() {
		if (!svgOutput) return;

		console.log('export PNG');

		// Create a canvas for rendering the SVG
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d')!;

		// Get original dimensions
		const originalWidth = parseInt(svgOutput.getAttribute('width') || '800');
		const originalHeight = parseInt(svgOutput.getAttribute('height') || '600');

		// Calculate new dimensions (maintaining aspect ratio)
		const scale = Math.max(minWidth / originalWidth, 1);
		const width = Math.round(originalWidth * scale);
		const height = Math.round(originalHeight * scale);

		// Set canvas size to upscaled dimensions
		canvas.width = width;
		canvas.height = height;

		// Convert SVG to data URL
		const svgString = new XMLSerializer().serializeToString(svgOutput);
		const blob = new Blob([svgString], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);

		// Create image from SVG and draw to canvas
		const img = new Image();
		img.onload = () => {
			// Use better quality scaling
			ctx.imageSmoothingEnabled = true;
			ctx.imageSmoothingQuality = 'high';

			// Draw upscaled image
			ctx.drawImage(img, 0, 0, width, height);

			// Convert canvas to PNG and download
			canvas.toBlob((blob) => {
				if (blob) {
					const url = URL.createObjectURL(blob);
					const link = document.createElement('a');
					link.href = url;
					link.download = `halftone_${getTimestamp()}.png`;
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
					URL.revokeObjectURL(url);
				}
			}, 'image/png');

			URL.revokeObjectURL(url);
		};
		img.src = url;
	}

	async function handleTileImageUpload(event: Event, index: number) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file || !file.type.includes('svg')) return;

		const reader = new FileReader();
		reader.onload = async (e) => {
			const svgText = e.target?.result as string;
			const parser = new DOMParser();
			const doc = parser.parseFromString(svgText, 'image/svg+xml');
			const svg = doc.documentElement as unknown as SVGElement;

			tileImages[index] = svg;
			tileImages = tileImages;
			updateOutput();
		};
		reader.readAsText(file);
	}

	// Add new handler for color updates
	function handleTileColorUpdate(event: CustomEvent) {
		const { index, colorMode, customColor } = event.detail;
		tileColors[index] = { mode: colorMode, color: customColor };
		updateOutput();
	}

	// Update the handlePaletteSelect function to track the index
	async function handlePaletteSelect(event: CustomEvent<{ palette: PaletteType; index: number }>) {
		const { palette, index } = event.detail;
		selectedPaletteIndex = index;
		selectedPalette = palette;

		// Load all SVGs from the palette
		const newTileImages: (SVGElement | null)[] = [];
		for (const tile of palette.tiles) {
			if (!loadedTileImages[tile.svg]) {
				loadedTileImages[tile.svg] = await loadSVG(tile.svg);
			}
			const tileSvg = loadedTileImages[tile.svg];
			newTileImages.push(tileSvg);
		}

		// Initialize tile colors based on palette, preserving color modes
		tileColors = palette.tiles.map((tile) => ({
			mode: tile.colorMode || 'custom',
			color: tile.color || '#000000'
		}));

		tileImages = newTileImages;
		updateOutput();
	}

	// Update output when controls change
	$: if (
		sourceImg &&
		(pixelSize || invertSource || fitToScreen || brightnessAdjustment || scalingMode)
	) {
		updateOutput();
	}
</script>

<div class="grid grid-cols-3 gap-4 p-4">
	<div class="col-span-2">
		<!-- svelte-ignore element_invalid_self_closing_tag -->
		<div
			style="height: {fitToScreen ? 'calc(100vh - 2rem)' : '100%'}"
			class="flex justify-center items-center w-full"
			bind:this={container}
		/>
	</div>

	<div>
		<div class="flex sticky top-4 flex-col gap-4 mb-4 max-w-xl">
			<div class="space-y-4">
				<div class="flex flex-col gap-1.5 w-full max-w-sm">
					<Label for="pixelSize">Pixel Size</Label>
					<div class="flex w-full max-w-[300px] items-center space-x-2">
						<Input
							class="w-full max-w-[100px]"
							bind:value={pixelSize}
							type="number"
							min="5"
							id="pixelSize"
							placeholder="20"
						/>
						<div class="flex gap-1 items-center">
							<Button
								variant="outline"
								size="icon"
								class="rounded-full"
								on:click={() => (pixelSize = Math.max(5, pixelSize - 1))}
							>
								-
							</Button>
							<Button
								variant="outline"
								size="icon"
								class="rounded-full"
								on:click={() => (pixelSize = Math.min(50, pixelSize + 1))}
							>
								+
							</Button>
						</div>
					</div>
					<p class="text-sm text-muted-foreground">There may be a slight delay at smaller sizes.</p>
				</div>

				<div class="flex items-center space-x-2">
					<Switch bind:checked={invertSource} id="invert-source" />
					<Label for="invert-source">Invert Source Image</Label>
				</div>

				<div class="flex items-center space-x-2">
					<Switch bind:checked={fitToScreen} id="fit-to-screen" />
					<Label for="fit-to-screen">Fit to Screen</Label>
				</div>

				<div class="flex items-center space-x-2">
					<Switch bind:checked={darkMode} id="dark-mode" />
					<Label for="dark-mode">Dark Mode</Label>
				</div>

				<div class="flex items-center space-x-2">
					<Switch bind:checked={scalingMode} id="scaling-mode" />
					<Label for="scaling-mode">Scaling Mode</Label>
				</div>

				<div>
					<Histogram {pixelData} />
				</div>

				<div class="flex flex-col gap-1.5 w-full max-w-sm">
					<Label for="brightness">Brightness Adjustment</Label>
					<div class="flex w-full max-w-[300px] items-center space-x-2">
						<!-- <Input
							class="w-full"
							bind:value={brightnessAdjustment}
							type="range"
							id="brightness"
							min="-100"
							max="100"
							step="1"
						/> -->
						<input
							type="range"
							bind:value={brightnessAdjustment}
							class="w-full"
							id="brightness"
							min="-100"
							max="100"
							step="1"
						/>
						<span class="w-12 text-sm text-right">{brightnessAdjustment}</span>
					</div>
				</div>

				<div class="flex flex-col gap-1.5 w-full max-w-sm">
					<Label for="source-upload">Source Image</Label>
					<div class="space-y-2">
						<Input
							on:change={handleSourceImageUpload}
							class="pt-1.5"
							id="source-upload"
							type="file"
						/>
						<p class="text-sm text-muted-foreground">
							Or paste an image from your clipboard (Ctrl/Cmd + V)
						</p>
					</div>
				</div>

				<div class="space-y-2">
					<div class="flex justify-between items-center">
						<p class="text-sm font-medium">Select a Tile Palette</p>
					</div>

					<div class="flex flex-col gap-px">
						{#each newPalettes as palette, index}
							<Palette
								{palette}
								{index}
								isSelected={index === selectedPaletteIndex}
								on:paletteSelect={handlePaletteSelect}
								on:updateTileColor={(e) => {
									const { index, colorMode, customColor } = e.detail;
									tileColors[index] = { mode: colorMode, color: customColor };
									updateOutput();
								}}
							/>
						{/each}
					</div>
				</div>

				<div>
					<Popover.Root>
						<Popover.Trigger>
							<Button variant="default" size="default">Export Artwork</Button>
						</Popover.Trigger>
						<Popover.Content class="flex flex-col gap-4">
							<div class="flex flex-col gap-2">
								<Label>SVG Export</Label>
								<Button id="svg" variant="default" size="sm" on:click={exportSVG}>SVG</Button>
							</div>
							<div class="flex flex-col gap-2">
								<Label>PNG Export</Label>
								<div class="flex gap-2 items-baseline">
									<Input bind:value={minWidth} type="number" id="png-export-width" />
									<span>px</span>
								</div>
								<Button id="png" variant="outline" size="sm" on:click={exportPNG}>PNG</Button>
							</div>
						</Popover.Content>
					</Popover.Root>
				</div>
			</div>
		</div>
	</div>
</div>

<style lang="postcss">
	input[type='file'] {
		overflow: visible;
		display: block;
		position: relative;
	}

	input[type='file']::file-selector-button {
		@apply inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 bg-white text-black active:scale-95 px-4 py-2 transition-all;
		outline: none !important;
		border: 1px solid #e5e5e5 !important;
	}

	input[type='file']::file-selector-button:hover {
		background-color: #eee;
		border: 0px;
		border-right: 1px solid #e5e5e5;
	}
</style>
