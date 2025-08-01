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
	import UploadProgress from './UploadProgress.svelte';

	let container: HTMLElement;
	let sourceImg: HTMLImageElement;
	let tileImages: HTMLImageElement[] = [];
	let outputCanvas: HTMLCanvasElement;
	let outputCtx: CanvasRenderingContext2D;

	// Control variables
	let pixelSize = 14; // Size of each "pixel" in the output
	let invertSource = true;
	let selectedPalette: PaletteType | null = null;
	let minWidth = 1080;
	let fitToScreen = true;
	let brightnessAdjustment = 0; // Range from -100 to 100
	let scalingMode = false; // New toggle for scaling mode
	let darkMode = false;

	// Global values
	let pixelData: PixelData[] = [];
	let isUploading = false;
	let uploadProgress = -1;
	let histogramPercentage = 0.5;
	let isAnimating = false;
	let animationFrameId: number;
	let shouldAnimate = false;
	let animateFromTop = true;
	let skipBrightestLayer = true;
	let animateByRows = true;

	function percentageToBrightnessMultiplier(percentage: number) {
		return percentage * 200 - 100;
	}

	$: brightnessAdjustment = percentageToBrightnessMultiplier(histogramPercentage);

	function setDarkMode(value: boolean) {
		if (browser) {
			document.documentElement.classList.toggle('dark', value);
		}
	}

	// $: console.log('pixelData parent', pixelData);

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
	let loadedTileImages: Record<string, HTMLImageElement> = {};

	// Add this variable to track the selected palette index
	let selectedPaletteIndex = 0;

	async function loadTileImage(url: string): Promise<HTMLImageElement> {
		if (loadedTileImages[url]) {
			return loadedTileImages[url];
		}

		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				loadedTileImages[url] = img;
				resolve(img);
			};
			img.onerror = reject;
			img.src = url;
		});
	}

	async function convertSVGToPNG(svgUrl: string, color: string = '#000000'): Promise<string> {
		const response = await fetch(svgUrl);
		const svgText = await response.text();
		const parser = new DOMParser();
		const doc = parser.parseFromString(svgText, 'image/svg+xml');
		const svg = doc.documentElement as unknown as SVGElement;

		// Set black background for the SVG
		svg.setAttribute('fill', 'black');
		svg.style.backgroundColor = 'black';

		// Apply the color only to the shapes
		svg.querySelectorAll('path, circle, rect, polygon').forEach((element) => {
			(element as SVGElement).setAttribute('fill', color);
		});

		// Get the original viewBox or create one based on width/height
		let viewBox = svg.getAttribute('viewBox');
		if (!viewBox) {
			const width = svg.getAttribute('width') || '100';
			const height = svg.getAttribute('height') || '100';
			viewBox = `0 0 ${width} ${height}`;
		}

		// Set SVG attributes for proper rendering
		svg.setAttribute('width', '100');
		svg.setAttribute('height', '100');
		svg.setAttribute('viewBox', viewBox);
		svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

		// Create a canvas to render the SVG
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
		canvas.width = 100;
		canvas.height = 100;

		// Fill canvas with black background
		ctx.fillStyle = 'black';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Convert SVG to data URL
		const serializer = new XMLSerializer();
		const svgBlob = new Blob([serializer.serializeToString(svg)], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(svgBlob);

		// Create an image from the SVG
		const img = new Image();
		await new Promise((resolve, reject) => {
			img.onload = resolve;
			img.onerror = reject;
			img.src = url;
		});

		// Draw the SVG to canvas with proper scaling
		ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

		// Get the image data to process
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		const data = imageData.data;

		// Process each pixel to ensure proper opacity
		for (let i = 0; i < data.length; i += 4) {
			const r = data[i];
			const g = data[i + 1];
			const b = data[i + 2];
			const a = data[i + 3];

			// If the pixel is not white (meaning it's part of a shape)
			if (!(r === 255 && g === 255 && b === 255)) {
				// Keep the original color but ensure full opacity
				data[i + 3] = 255;
			} else {
				// Make white pixels fully opaque
				data[i + 3] = 255;
			}
		}

		// Put the processed image data back
		ctx.putImageData(imageData, 0, 0);

		// Convert canvas to PNG data URL
		const pngDataUrl = canvas.toDataURL('image/png');
		URL.revokeObjectURL(url);
		return pngDataUrl;
	}

	onMount(() => {
		// Create hidden canvas for image processing
		canvas = document.createElement('canvas');
		ctx = canvas.getContext('2d')!;

		// Create output canvas
		outputCanvas = document.createElement('canvas');
		outputCanvas.style.width = '100%';
		outputCanvas.style.height = '100%';
		outputCanvas.style.backgroundColor = 'black';
		container.appendChild(outputCanvas);
		outputCtx = outputCanvas.getContext('2d', { willReadFrequently: true })!;

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

	// Clean up event listener and animations on component destruction
	onDestroy(() => {
		if (browser) {
			window.removeEventListener('paste', handlePaste);
		}
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
	});

	function handlePaste(event: ClipboardEvent) {
		const items = event.clipboardData?.items;
		isUploading = true;
		if (!items) return;

		for (const item of items) {
			if (item.type.indexOf('image') !== -1) {
				const file = item.getAsFile();
				if (file) {
					// Start progress tracking
					uploadProgress = 0;

					const reader = new FileReader();
					reader.onprogress = (e) => {
						if (e.lengthComputable) {
							// FileReader progress: 0-25%
							uploadProgress = Math.round((e.loaded / e.total) * 25);
						}
					};
					reader.onload = (e) => {
						// File read complete: 25%
						uploadProgress = 25;
						loadImage(e.target?.result as string);
						setTimeout(() => {
							isUploading = false;
						}, 50);
					};
					reader.readAsDataURL(file);
					break;
				}
			}
		}
	}

	async function loadImage(src: string) {
		// Image loading starts: 50%
		if (isUploading) {
			uploadProgress = 50;
		}

		sourceImg = new Image();
		sourceImg.onload = () => {
			// Image loaded, processing starts: 75%
			if (isUploading) {
				uploadProgress = 75;
			}
			shouldAnimate = true; // Enable animation for image load
		};
		sourceImg.onerror = () => {
			// Reset progress on error
			uploadProgress = -1;
		};
		sourceImg.src = src;
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
		if (!sourceImg || tileImages.length === 0 || !outputCanvas) return;

		// Set dimensions
		const aspectRatio = sourceImg.height / sourceImg.width;
		const width = 800;
		const height = Math.round(width * aspectRatio);

		// Get device pixel ratio for high DPI support
		const dpr = window.devicePixelRatio || 1;

		// Set output canvas size with DPR scaling
		outputCanvas.width = width * dpr;
		outputCanvas.height = height * dpr;

		// Scale the context to account for DPR
		outputCtx.scale(dpr, dpr);

		// Update the canvas styling based on fitToScreen
		outputCanvas.classList.remove('w-full', 'h-auto', 'max-h-full', 'object-contain');
		if (fitToScreen) {
			outputCanvas.classList.add('max-h-full', 'object-contain');
		} else {
			outputCanvas.classList.add('w-full', 'h-auto');
		}

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
		ctx.putImageData(imageData, 0, 0);

		// Calculate grid dimensions
		const cols = Math.floor(width / pixelSize);
		const rows = Math.floor(height / pixelSize);

		// Clear output canvas with black background
		outputCtx.fillStyle = 'black';
		outputCtx.fillRect(0, 0, width, height);

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
		pixelData = pixelData;

		// Track which cells have been filled by larger tiles
		const filledCells = new Set<number>();

		// Process tiles from largest to smallest to ensure proper grid alignment
		if (scalingMode) {
			// Start with the largest tiles (highest index) and work down
			for (let tileIndex = tileImages.length - 1; tileIndex >= 0; tileIndex--) {
				const scale = Math.pow(2, tileIndex);
				const tile = tileImages[tileIndex];
				if (!tile) continue;

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

						const x = baseX * pixelSize;
						const y = baseY * pixelSize;
						const size = pixelSize * scale;

						// Mark all cells in this area as filled
						for (let si = 0; si < scale; si++) {
							for (let sj = 0; sj < scale; sj++) {
								const fillIndex = (baseY + sj) * cols + (baseX + si);
								if (fillIndex < cols * rows) {
									filledCells.add(fillIndex);
								}
							}
						}

						// Apply background color based on mode
						if (tileColors[tileIndex]) {
							const colorConfig = tileColors[tileIndex];
							if (colorConfig.mode === 'custom' && colorConfig.color) {
								outputCtx.fillStyle = colorConfig.color;
								outputCtx.fillRect(x, y, size, size);
							} else if (colorConfig.mode === 'source') {
								outputCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
								outputCtx.fillRect(x, y, size, size);
							} else if (colorConfig.mode === 'default') {
								const defaultColor = selectedPalette?.tiles[tileIndex].color || '#000000';
								outputCtx.fillStyle = defaultColor;
								outputCtx.fillRect(x, y, size, size);
							}
						}

						// Draw the tile image
						outputCtx.drawImage(tile, x, y, size, size);
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
					const tile = tileImages[tileIndex];
					if (!tile) continue;

					// Apply background color based on mode
					if (tileColors[tileIndex]) {
						const colorConfig = tileColors[tileIndex];
						if (colorConfig.mode === 'custom' && colorConfig.color) {
							outputCtx.fillStyle = colorConfig.color;
							outputCtx.fillRect(x, y, pixelSize, pixelSize);
						} else if (colorConfig.mode === 'source') {
							outputCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
							outputCtx.fillRect(x, y, pixelSize, pixelSize);
						} else if (colorConfig.mode === 'default') {
							const defaultColor = selectedPalette?.tiles[tileIndex].color || '#000000';
							outputCtx.fillStyle = defaultColor;
							outputCtx.fillRect(x, y, pixelSize, pixelSize);
						}
					}

					// Draw the tile image
					outputCtx.drawImage(tile, x, y, pixelSize, pixelSize);
				}
			}
		}

		// Processing complete: 100%
		if (isUploading) {
			uploadProgress = 100;
		}

		// Hide progress after a short delay
		setTimeout(() => {
			uploadProgress = -1;
		}, 1500);
	}

	function updateOutputAnimated(shouldAnimate = false) {
		if (!sourceImg || tileImages.length === 0 || !outputCanvas) return;

		// Cancel any existing animation
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}

		// Set dimensions
		const aspectRatio = sourceImg.height / sourceImg.width;
		const width = 800;
		const height = Math.round(width * aspectRatio);

		// Get device pixel ratio for high DPI support
		const dpr = window.devicePixelRatio || 1;

		// Set output canvas size with DPR scaling
		outputCanvas.width = width * dpr;
		outputCanvas.height = height * dpr;

		// Scale the context to account for DPR
		outputCtx.scale(dpr, dpr);

		// Update the canvas styling based on fitToScreen
		outputCanvas.classList.remove('w-full', 'h-auto', 'max-h-full', 'object-contain');
		if (fitToScreen) {
			outputCanvas.classList.add('max-h-full', 'object-contain');
		} else {
			outputCanvas.classList.add('w-full', 'h-auto');
		}

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
		ctx.putImageData(imageData, 0, 0);

		// Calculate grid dimensions
		const cols = Math.floor(width / pixelSize);
		const rows = Math.floor(height / pixelSize);

		// Clear output canvas with black background
		outputCtx.fillStyle = 'black';
		outputCtx.fillRect(0, 0, width, height);

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
		pixelData = pixelData;

		// Prepare tile data for animation
		const tilesByLayer = new Map<
			number,
			Array<{
				x: number;
				y: number;
				size: number;
				r: number;
				g: number;
				b: number;
				tileIndex: number;
			}>
		>();
		const filledCells = new Set<number>();

		// Process tiles and group by layer
		if (scalingMode) {
			// Start with the largest tiles (highest index) and work down
			for (let tileIndex = tileImages.length - 1; tileIndex >= 0; tileIndex--) {
				const scale = Math.pow(2, tileIndex);
				const tile = tileImages[tileIndex];
				if (!tile) continue;

				const layerTiles: Array<{
					x: number;
					y: number;
					size: number;
					r: number;
					g: number;
					b: number;
					tileIndex: number;
				}> = [];

				// Calculate grid dimensions for this scale
				const scaledCols = Math.floor(cols / scale);
				const scaledRows = Math.floor(rows / scale);

				// Process each cell in the scaled grid
				for (let i = 0; i < scaledCols; i++) {
					for (let j = 0; j < scaledRows; j++) {
						// Calculate the base position in the original grid
						const baseX = i * scale;
						const baseY = j * scale;

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

						const x = baseX * pixelSize;
						const y = baseY * pixelSize;
						const size = pixelSize * scale;

						// Mark all cells in this area as filled
						for (let si = 0; si < scale; si++) {
							for (let sj = 0; sj < scale; sj++) {
								const fillIndex = (baseY + sj) * cols + (baseX + si);
								if (fillIndex < cols * rows) {
									filledCells.add(fillIndex);
								}
							}
						}

						layerTiles.push({ x, y, size, r, g, b, tileIndex });
					}
				}

				if (layerTiles.length > 0) {
					tilesByLayer.set(tileIndex, layerTiles);
				}
			}
		} else {
			// Original non-scaling mode behavior
			for (let tileIndex = tileImages.length - 1; tileIndex >= 0; tileIndex--) {
				const layerTiles: Array<{
					x: number;
					y: number;
					size: number;
					r: number;
					g: number;
					b: number;
					tileIndex: number;
				}> = [];

				for (let i = 0; i < cols; i++) {
					for (let j = 0; j < rows; j++) {
						const cellIndex = j * cols + i;
						const { brightness, r, g, b, x, y } = pixelData[cellIndex];
						const currentTileIndex = Math.min(
							tileImages.length - 1,
							Math.max(0, Math.floor(brightness * tileImages.length))
						);

						if (currentTileIndex === tileIndex) {
							layerTiles.push({ x, y, size: pixelSize, r, g, b, tileIndex });
						}
					}
				}

				if (layerTiles.length > 0) {
					tilesByLayer.set(tileIndex, layerTiles);
				}
			}
		}

		// If not animating, draw all at once
		if (!shouldAnimate) {
			tilesByLayer.forEach((layerTiles) => {
				drawTileLayer(layerTiles);
			});
			return;
		}

		// Animate drawing each layer
		isAnimating = true;
		const layerIndices = Array.from(tilesByLayer.keys()).sort((a, b) => b - a); // Highest to lowest

		// Draw brightest layer immediately if skipping animation
		if (skipBrightestLayer && layerIndices.length > 0) {
			const brightestLayerTiles = tilesByLayer.get(layerIndices[0]);
			if (brightestLayerTiles) {
				drawTileLayer(brightestLayerTiles);
			}
		}

		let currentLayerIndex = skipBrightestLayer ? 1 : 0; // Skip first (brightest) layer if enabled

		function drawNextLayer() {
			if (currentLayerIndex >= layerIndices.length) {
				isAnimating = false;
				return;
			}

			const tileIndex = layerIndices[currentLayerIndex];
			const layerTiles = tilesByLayer.get(tileIndex);

			if (layerTiles) {
				drawTileLayerAnimated(layerTiles, () => {
					currentLayerIndex++;
					// Continue to next layer after current layer finishes
					setTimeout(() => {
						animationFrameId = requestAnimationFrame(drawNextLayer);
					}, 1); // Short delay between layers
				});
			} else {
				currentLayerIndex++;
				animationFrameId = requestAnimationFrame(drawNextLayer);
			}
		}

		// Start animation
		animationFrameId = requestAnimationFrame(drawNextLayer);
	}

	function drawTileLayer(
		layerTiles: Array<{
			x: number;
			y: number;
			size: number;
			r: number;
			g: number;
			b: number;
			tileIndex: number;
		}>
	) {
		layerTiles.forEach(({ x, y, size, r, g, b, tileIndex }) => {
			drawSingleTile({ x, y, size, r, g, b, tileIndex });
		});
	}

	function drawTileLayerAnimated(
		layerTiles: Array<{
			x: number;
			y: number;
			size: number;
			r: number;
			g: number;
			b: number;
			tileIndex: number;
		}>,
		onComplete: () => void
	) {
		if (animateByRows) {
			// Group tiles by rows (y-coordinate)
			const rowMap = new Map<number, typeof layerTiles>();
			layerTiles.forEach((tile) => {
				const rowY = tile.y;
				if (!rowMap.has(rowY)) {
					rowMap.set(rowY, []);
				}
				rowMap.get(rowY)!.push(tile);
			});

			// Sort rows by y-coordinate
			const sortedRows = Array.from(rowMap.keys()).sort((a, b) => {
				return animateFromTop ? a - b : b - a;
			});

			let currentRowIndex = 0;

			function drawNextRow() {
				if (currentRowIndex >= sortedRows.length) {
					onComplete();
					return;
				}

				// Draw all tiles in current row
				const rowY = sortedRows[currentRowIndex];
				const rowTiles = rowMap.get(rowY)!;

				// Sort tiles within the row by x-coordinate
				const sortedRowTiles = rowTiles.sort((a, b) => a.x - b.x);

				// Draw all tiles in this row immediately
				sortedRowTiles.forEach((tile) => {
					drawSingleTile(tile);
				});

				currentRowIndex++;

				// Continue to next row
				setTimeout(() => {
					animationFrameId = requestAnimationFrame(drawNextRow);
				}, 5); // 15ms delay between rows
			}

			// Start drawing
			animationFrameId = requestAnimationFrame(drawNextRow);
		} else {
			// Original individual tile animation
			// Sort tiles by position (top to bottom or bottom to top)
			const sortedTiles = [...layerTiles].sort((a, b) => {
				if (animateFromTop) {
					// Top to bottom: sort by y, then x
					if (a.y !== b.y) return a.y - b.y;
					return a.x - b.x;
				} else {
					// Bottom to top: sort by y descending, then x
					if (a.y !== b.y) return b.y - a.y;
					return a.x - b.x;
				}
			});

			let currentTileIndex = 0;
			const tilesPerBatch = 3; // Draw multiple tiles per animation frame for speed

			function drawNextBatch() {
				if (currentTileIndex >= sortedTiles.length) {
					onComplete();
					return;
				}

				// Draw a batch of tiles
				const endIndex = Math.min(currentTileIndex + tilesPerBatch, sortedTiles.length);
				for (let i = currentTileIndex; i < endIndex; i++) {
					const tileData = sortedTiles[i];
					drawSingleTile(tileData);
				}

				currentTileIndex = endIndex;

				// Continue with next batch
				setTimeout(() => {
					animationFrameId = requestAnimationFrame(drawNextBatch);
				}, 2); // 2ms delay between batches for smooth animation
			}

			// Start drawing
			animationFrameId = requestAnimationFrame(drawNextBatch);
		}
	}

	function drawSingleTile({
		x,
		y,
		size,
		r,
		g,
		b,
		tileIndex
	}: {
		x: number;
		y: number;
		size: number;
		r: number;
		g: number;
		b: number;
		tileIndex: number;
	}) {
		const tile = tileImages[tileIndex];
		if (!tile) return;

		// Apply background color based on mode
		if (tileColors[tileIndex]) {
			const colorConfig = tileColors[tileIndex];
			if (colorConfig.mode === 'custom' && colorConfig.color) {
				outputCtx.fillStyle = colorConfig.color;
				outputCtx.fillRect(x, y, size, size);
			} else if (colorConfig.mode === 'source') {
				outputCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
				outputCtx.fillRect(x, y, size, size);
			} else if (colorConfig.mode === 'default') {
				const defaultColor = selectedPalette?.tiles[tileIndex].color || '#000000';
				outputCtx.fillStyle = defaultColor;
				outputCtx.fillRect(x, y, size, size);
			}
		}

		// Draw the tile image
		outputCtx.drawImage(tile, x, y, size, size);
	}

	function handleSourceImageUpload(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (file) {
			// Start progress tracking
			uploadProgress = 0;

			const reader = new FileReader();
			reader.onprogress = (e) => {
				if (e.lengthComputable) {
					// FileReader progress: 0-25%
					uploadProgress = Math.round((e.loaded / e.total) * 25);
				}
			};
			reader.onload = (e) => {
				// File read complete: 25%
				uploadProgress = 25;
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
		// SVG export is no longer supported in canvas mode
		console.warn('SVG export not available in canvas mode');
	}

	function exportPNG() {
		if (!outputCanvas) return;

		console.log('export PNG');

		// Get original dimensions
		const originalWidth = outputCanvas.width / (window.devicePixelRatio || 1);
		const originalHeight = outputCanvas.height / (window.devicePixelRatio || 1);

		// Calculate new dimensions (maintaining aspect ratio)
		const scale = Math.max(minWidth / originalWidth, 1);
		const width = Math.round(originalWidth * scale);
		const height = Math.round(originalHeight * scale);

		// Create a new canvas for export
		const exportCanvas = document.createElement('canvas');
		const exportCtx = exportCanvas.getContext('2d')!;

		// Set canvas size to upscaled dimensions
		exportCanvas.width = width;
		exportCanvas.height = height;

		// Use better quality scaling
		exportCtx.imageSmoothingEnabled = true;
		exportCtx.imageSmoothingQuality = 'high';

		// Draw upscaled image from output canvas
		exportCtx.drawImage(outputCanvas, 0, 0, width, height);

		// Convert canvas to PNG and download
		exportCanvas.toBlob((blob) => {
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

		// Convert SVG tiles to PNGs and load them
		const newTileImages = await Promise.all(
			palette.tiles.map(async (tile) => {
				const pngUrl = await convertSVGToPNG(tile.svg, tile.color || '#000000');
				return loadTileImage(pngUrl);
			})
		);

		// Initialize tile colors based on palette, preserving color modes
		tileColors = palette.tiles.map((tile) => ({
			mode: tile.colorMode || 'custom',
			color: tile.color || '#000000'
		}));

		tileImages = newTileImages;
		shouldAnimate = true; // Enable animation for palette change
	}

	// Update output when controls change or tiles change
	$: if (
		sourceImg &&
		(pixelSize || invertSource || fitToScreen || brightnessAdjustment || scalingMode || tileImages)
	) {
		updateOutputAnimated(shouldAnimate);
		shouldAnimate = false; // Reset after use
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

				<div class="flex items-center space-x-2">
					<Switch bind:checked={animateFromTop} id="animate-from-top" />
					<Label for="animate-from-top">Animate from Top</Label>
				</div>

				<div class="flex items-center space-x-2">
					<Switch bind:checked={skipBrightestLayer} id="skip-brightest-layer" />
					<Label for="skip-brightest-layer">Skip Brightest Layer</Label>
				</div>

				<div class="flex items-center space-x-2">
					<Switch bind:checked={animateByRows} id="animate-by-rows" />
					<Label for="animate-by-rows">Animate by Rows</Label>
				</div>

				<div>
					<Histogram bind:percentage={histogramPercentage} {pixelData} />
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

				<div class="flex">
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
					<div>
						<UploadProgress progress={uploadProgress} />
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
