<script lang="ts">
	import { browser } from '$app/environment';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Resizable from '$lib/components/ui/resizable/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import Freq from '$lib/extras/Freq.svelte';
	import Slider from '$lib/extras/Slider.svelte';
	import { colorPalettes, newPalettes } from '$lib/halftone/newPalette';
	import Palette from '$lib/halftone/Palette.svelte';
	import { FlowPhase, flowStore } from '$lib/stores';
	import { onDestroy, onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import ExportGif from './ExportGif.svelte';
	import Histogram from './Histogram.svelte';
	import type { PaletteType } from './newPalette';
	import type { PixelData } from './types';
	import UploadProgress from './UploadProgress.svelte';

	// Props
	export let defaultImageUrl: string | null = null;

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
	let debug = false; // Debug mode toggle

	// Global values
	let pixelData: PixelData[] = [];
	let isUploading = false;
	let uploadProgress = -1;
	let userHasUploadedImage = false; // Flag to track if user has manually uploaded an image
	let histogramPercentage = 0.5;
	let isAnimating = false;
	let animationFrameId: number;
	let shouldAnimate = false;
	let animateFromTop = true;
	let skipBrightestLayer = true;
	let animateByRows = true;

	let show = false;

	let sliderValues = [0.5, 0.3, 0.3];
	let colorPaletteLength = colorPalettes.length;

	$: console.log('brightness change', brightnessAdjustment);

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
		setTimeout(() => {
			show = true;
		}, 300);
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

		// Load default image - use provided blob URL or fallback to demo.jpg
		const imageSource = defaultImageUrl || '/demo.jpg';
		loadImage(imageSource);

		// Apply first palette by default
		let startEvent = new CustomEvent<{ palette: PaletteType; index: number }>('paletteSelect', {
			detail: { palette: newPalettes[0], index: 0 }
		});
		handlePaletteSelect(startEvent);

		// Add paste event listener only in browser environment
		if (browser) {
			window.addEventListener('paste', handlePaste);
			window.addEventListener('keydown', handleKeydown);
		}
	});

	// Clean up event listener and animations on component destruction
	onDestroy(() => {
		if (browser) {
			window.removeEventListener('paste', handlePaste);
			window.removeEventListener('keydown', handleKeydown);
		}
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
	});

	function handleKeydown(event: KeyboardEvent) {
		// Toggle debug mode when 'd' key is pressed
		if (event.key === 'd' || event.key === 'D') {
			debug = !debug;
			console.log('Debug mode:', debug);
		}
	}

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
						userHasUploadedImage = true; // Mark that user uploaded an image
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
				userHasUploadedImage = true; // Mark that user uploaded an image
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

	function exportGIF() {
		console.log('export GIF');
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

	// Function to swap color scheme from colorPalettes array
	async function swapColorScheme(colorPaletteKey?: string) {
		if (!selectedPalette) return;

		// Get a random color palette if no key is provided
		let targetPalette;
		if (colorPaletteKey) {
			targetPalette = colorPalettes.find((p) => p.key === colorPaletteKey);
		} else {
			// Get a random palette different from current one
			const availablePalettes = colorPalettes.filter((p) => p.key !== selectedPalette?.key);
			targetPalette = availablePalettes[Math.floor(Math.random() * availablePalettes.length)];
		}

		if (!targetPalette) return;

		// Create a new palette with the same tiles but new colors
		const newPalette: PaletteType = {
			key: targetPalette.key,
			tiles: selectedPalette.tiles.map((tile, index) => ({
				...tile,
				color: targetPalette.colors[index % targetPalette.colors.length] || tile.color
			}))
		};

		// Convert SVG tiles to PNGs with new colors
		const newTileImages = await Promise.all(
			newPalette.tiles.map(async (tile) => {
				const pngUrl = await convertSVGToPNG(tile.svg, tile.color || '#000000');
				return loadTileImage(pngUrl);
			})
		);

		// Update the selected palette
		selectedPalette = newPalette;

		// Update tile colors
		tileColors = newPalette.tiles.map((tile) => ({
			mode: tile.colorMode || 'custom',
			color: tile.color || '#000000'
		}));

		tileImages = newTileImages;
		// No animation needed for color swapping
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

	// Reactive: Load new image when defaultImageUrl prop changes (only if user hasn't uploaded their own image)
	$: if (defaultImageUrl && sourceImg && !userHasUploadedImage) {
		loadImage(defaultImageUrl);
	}

	// Update output when controls change or tiles change
	$: if (
		sourceImg &&
		(pixelSize || invertSource || fitToScreen || brightnessAdjustment || scalingMode || tileImages)
	) {
		updateOutputAnimated(shouldAnimate);
		shouldAnimate = false; // Reset after use
	}

	function returnToWebcam() {
		show = false;
		setTimeout(() => {
			flowStore.set(FlowPhase.Webcam);
		}, 500);
	}

	function handleSlidersChange(sliders: number[]) {
		let brightness = sliders[0];
		let size = sliders[1];
		let color = sliders[2];

		brightnessAdjustment = brightness * 200 - 100;
		pixelSize = Math.round(size * 20) + 10;

		console.log('brightness', brightness);
		console.log('size', size);
		console.log('color', color);
	}

	$: handleSlidersChange(sliderValues);
</script>

<div class="grid gap-4 p-4 md:grid-cols-[1fr_20rem]">
	<div
		class="col-span-1 {show ? ' opacity-100' : ' opacity-0'} spring-bounce-20 spring-duration-500"
	>
		<!-- svelte-ignore element_invalid_self_closing_tag -->
		<divdD
			class="flex justify-center items-center w-full {fitToScreen
				? 'md:h-[calc(100vh-2rem)]'
				: 'h-auto'}"
			bind:this={container}
		/>
	</div>

	<div
		class="{show
			? 'translate-x-0 opacity-100'
			: 'translate-x-[100%] opacity-0'} spring-bounce-30 spring-duration-500 delay-[10ms] w-full"
	>
		<div class="flex sticky top-4 flex-col gap-4 mb-4 max-w-xl">
			<div class="space-y-4">
				<div class="hidden md:block">
					<Freq />
				</div>
				<div>
					<Slider bind:sliderValues />
				</div>
				{#if false}
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
						<p class="text-sm text-muted-foreground">
							There may be a slight delay at smaller sizes.
						</p>
					</div>
				{/if}
				{#if debug}
					<div class="grid grid-cols-2 gap-y-2">
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
					</div>
				{/if}
				<div>
					<Button variant="outline" size="sm" on:click={returnToWebcam}>Return</Button>
				</div>

				{#if false}
					<div class="flex gap-12">
						<div class="flex flex-col justify-between py-1">
							<div class="flex gap-2 justify-between items-center">
								<svg
									style="transform: rotate({brightnessAdjustment * 2}deg);"
									width="28"
									height="28"
									viewBox="0 0 28 28"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M13.4707 21.9834C13.6449 21.9946 13.8214 22 14 22V28C13.6919 28 13.3862 27.9884 13.083 27.9688L13.4707 21.9834ZM14.916 27.9688C14.6132 27.9883 14.3078 28 14 28V22C14.1786 22 14.3551 21.9946 14.5293 21.9834L14.916 27.9688ZM10.4648 21.1797C10.7751 21.333 11.0963 21.467 11.4268 21.5791L9.49805 27.2598C8.91598 27.0622 8.35147 26.8268 7.80664 26.5576L10.4648 21.1797ZM20.1924 26.5576C19.6475 26.8268 19.0831 27.0622 18.501 27.2598L16.5732 21.5791C16.9037 21.467 17.2249 21.333 17.5352 21.1797L20.1924 26.5576ZM7.9834 19.2734C8.21469 19.537 8.46304 19.7853 8.72656 20.0166L4.76953 24.5254C4.30993 24.122 3.87697 23.6891 3.47363 23.2295L7.9834 19.2734ZM24.5254 23.2295C24.122 23.6891 23.6891 24.122 23.2295 24.5254L19.2734 20.0166C19.537 19.7853 19.7853 19.537 20.0166 19.2734L24.5254 23.2295ZM6.4209 16.5732C6.53304 16.9037 6.66705 17.2249 6.82031 17.5352L1.44141 20.1924C1.17225 19.6475 0.936761 19.083 0.739258 18.501L6.4209 16.5732ZM27.2598 18.501C27.0622 19.0831 26.8268 19.6475 26.5576 20.1924L21.1797 17.5352C21.333 17.2249 21.467 16.9037 21.5791 16.5732L27.2598 18.501ZM0 14C0 13.6919 0.0106717 13.3862 0.0302734 13.083L6.0166 13.4707C6.00535 13.6449 6 13.8214 6 14C6 14.1786 6.00535 14.3551 6.0166 14.5293L0.0302734 14.916C0.0107133 14.6132 0 14.3078 0 14ZM28 14C28 14.3078 27.9883 14.6132 27.9688 14.916L21.9834 14.5293C21.9946 14.3551 22 14.1786 22 14C22 13.8214 21.9946 13.6449 21.9834 13.4707L27.9688 13.083C27.9884 13.3862 28 13.6919 28 14ZM6.82031 10.4648C6.66705 10.7751 6.53304 11.0963 6.4209 11.4268L0.739258 9.49805C0.936794 8.91601 1.17222 8.35144 1.44141 7.80664L6.82031 10.4648ZM26.5576 7.80664C26.8268 8.35147 27.0622 8.91598 27.2598 9.49805H27.2607L21.5791 11.4268C21.467 11.0963 21.333 10.7751 21.1797 10.4648L26.5576 7.80664ZM8.72656 7.9834C8.46304 8.21469 8.21469 8.46304 7.9834 8.72656L3.47363 4.76953C3.87697 4.30993 4.30993 3.87697 4.76953 3.47363L8.72656 7.9834ZM23.2295 3.47363C23.6891 3.87697 24.122 4.30993 24.5254 4.76953L20.0166 8.72656C19.7853 8.46304 19.537 8.21469 19.2734 7.9834L23.2295 3.47363ZM11.4268 6.4209C11.0963 6.53304 10.7751 6.66705 10.4648 6.82031L7.80664 1.44141C8.35144 1.17222 8.91601 0.936794 9.49805 0.739258L11.4268 6.4209ZM18.501 0.739258C19.083 0.936761 19.6475 1.17225 20.1924 1.44141L17.5352 6.82031C17.2249 6.66705 16.9037 6.53304 16.5732 6.4209L18.501 0.739258ZM14 0C14.3078 0 14.6132 0.0107133 14.916 0.0302734L14.5293 6.0166C14.3551 6.00535 14.1786 6 14 6C13.8214 6 13.6449 6.00535 13.4707 6.0166L13.083 0.0302734C13.3862 0.0106717 13.6919 0 14 0Z"
										fill="white"
									/>
								</svg>

								<span class="text-xl">
									{brightnessAdjustment.toFixed(0)}
								</span>
							</div>
							<p class="text-sm uppercase text-h-neutral-400">Brightness</p>
						</div>
						<div class="flex-1 flex-grow flex-shrink-0">
							<Histogram bind:percentage={histogramPercentage} {pixelData} />
						</div>
					</div>
				{/if}
				<!-- <div class="flex flex-col gap-1.5 w-full max-w-sm">
					<Label for="brightness">Brightness Adjustment</Label>
					<div class="flex w-full max-w-[300px] items-center space-x-2">
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
				</div> -->

				{#if debug}
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
								{#if userHasUploadedImage && defaultImageUrl}
									<button
										class="text-sm text-blue-500 underline hover:text-blue-600"
										on:click={() => {
											userHasUploadedImage = false;
											loadImage(defaultImageUrl);
										}}
									>
										Reset to default image
									</button>
								{/if}
							</div>
						</div>
						<div>
							<UploadProgress progress={uploadProgress} />
						</div>
					</div>
				{/if}

				<div class="space-y-2">
					<div class="flex justify-between items-center">
						<p class="text-sm font-medium">Select a Tile Palette</p>
						{#if selectedPalette}
							<div class="flex gap-1">
								<Button
									variant="outline"
									size="sm"
									on:click={() => swapColorScheme()}
									class="px-2 py-1 text-xs"
									title="Apply random color scheme"
								>
									🎲 Swap
								</Button>
								<Select.Root>
									<Select.Trigger class="w-24 h-8 text-xs">
										<Select.Value placeholder="Pick..." />
									</Select.Trigger>
									<Select.Content>
										{#each colorPalettes as colorPalette}
											<Select.Item
												value={colorPalette.key}
												on:click={() => swapColorScheme(colorPalette.key)}
											>
												{colorPalette.key}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
						{/if}
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

				<div class="flex gap-2">
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
								<Label>GIF Export</Label>
								<ExportGif
									ctx={outputCtx}
									bind:brightness={brightnessAdjustment}
									brightnessMin={-100}
									brightnessMax={100}
									brightnessStep={4}
									boomerang={true}
									onBrightnessChange={async () => {
										updateOutput();
										// Wait a bit for the canvas to actually update
										await new Promise((resolve) => requestAnimationFrame(resolve));
									}}
								/>
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
