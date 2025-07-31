<script lang="ts">
	import { browser } from '$app/environment';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { newPalettes } from '$lib/halftone/newPalette';
	import Palette from '$lib/halftone/Palette.svelte';
	import { onDestroy, onMount } from 'svelte';
	import type { PaletteType } from './newPalette';

	let container: HTMLElement;
	let videoElement: HTMLVideoElement;
	let outputCanvas: HTMLCanvasElement;
	let outputCtx: CanvasRenderingContext2D;
	let processingCanvas: HTMLCanvasElement;
	let processingCtx: CanvasRenderingContext2D;

	// Control variables
	let pixelSize = 14; // Size of each "pixel" in the output
	let invertSource = false;
	let selectedPalette: PaletteType | null = null;
	let minWidth = 1080;
	let fitToScreen = false;
	let isPlaying = false;
	let isLooping = true; // Add loop control variable
	let isRecording = false;
	let videoDuration = 0;
	let useMP4 = true;
	let use60FPS = false;
	let outputResolution = 720; // Default to 720p
	let useWebcam = false;
	let flipWebcam = false;
	let mediaStream: MediaStream | null = null;
	let mediaRecorder: MediaRecorder | null = null;
	let recordedChunks: Blob[] = [];
	let recordingStartTime = 0;
	let recordingElapsedTime = 0;
	let recordingInterval: ReturnType<typeof setInterval>;

	// Preloaded tile images
	let tileImages: HTMLImageElement[] = [];
	let loadedTileImages: Record<string, HTMLImageElement> = {};

	// Cache for color calculations
	let colorCache: Map<string, string> = new Map();

	// Add to your existing variables
	let tileColors: { mode: 'default' | 'custom' | 'source'; color?: string }[] = [];
	let selectedPaletteIndex = 0;

	// Animation frame ID for video processing
	let animationFrameId: number;
	let lastFrameTime = 0;
	const targetFrameTime = 1000 / 30; // 30fps in milliseconds
	let currentFPS = 0;
	let frameCount = 0;
	let lastFPSUpdate = 0;
	const FPS_UPDATE_INTERVAL = 1000; // Update FPS every second

	let darkMode = true;

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

	// Performance optimization: Cache for RGB to color string conversion
	function rgbToColorString(r: number, g: number, b: number): string {
		const key = `${r},${g},${b}`;
		if (colorCache.has(key)) {
			return colorCache.get(key)!;
		}
		const color = `rgb(${r}, ${g}, ${b})`;
		colorCache.set(key, color);
		return color;
	}

	// Performance optimization: Batch process pixels
	function processPixelBatch(
		startX: number,
		startY: number,
		width: number,
		height: number,
		pixels: Uint8ClampedArray,
		processingCanvasWidth: number,
		processingCanvasHeight: number,
		totalCols: number,
		totalRows: number
	) {
		const results = [];

		for (let i = startX; i < startX + width; i++) {
			for (let j = startY; j < startY + height; j++) {
				// Calculate the position in the source image
				const sourceX = Math.floor((i / totalCols) * processingCanvasWidth);
				const sourceY = Math.floor((j / totalRows) * processingCanvasHeight);
				const index = (sourceY * processingCanvasWidth + sourceX) * 4;

				const r = pixels[index];
				const g = pixels[index + 1];
				const b = pixels[index + 2];
				const brightness = invertSource ? 1 - (r + g + b) / (255 * 3) : (r + g + b) / (255 * 3);

				results.push({
					x: i,
					y: j,
					brightness,
					color: rgbToColorString(r, g, b)
				});
			}
		}

		return results;
	}

	onMount(() => {
		// Create video element
		videoElement = document.createElement('video');
		videoElement.style.display = 'none';
		videoElement.loop = true; // Enable looping by default
		videoElement.muted = true;
		videoElement.playsInline = true;
		container.appendChild(videoElement);

		// Load default demo video
		videoElement.src = '/demo.mp4';
		videoElement
			.play()
			.then(() => {
				isPlaying = true;
				videoDuration = videoElement.duration;
				processVideoFrame(performance.now());
			})
			.catch((error) => {
				console.error('Error loading default video:', error);
			});

		// Create output canvas
		outputCanvas = document.createElement('canvas');
		outputCanvas.style.width = '100%';
		outputCanvas.style.height = '100%';
		outputCanvas.style.backgroundColor = darkMode ? 'black' : 'white'; // Set white background
		container.appendChild(outputCanvas);
		outputCtx = outputCanvas.getContext('2d', { willReadFrequently: true })!;

		// Create processing canvas
		processingCanvas = document.createElement('canvas');
		processingCtx = processingCanvas.getContext('2d', { willReadFrequently: true })!;

		// Apply first palette by default
		let startEvent = new CustomEvent<{ palette: PaletteType; index: number }>('paletteSelect', {
			detail: { palette: newPalettes[0], index: 0 }
		});
		handlePaletteSelect(startEvent);
	});

	async function startWebcam() {
		try {
			mediaStream = await navigator.mediaDevices.getUserMedia({
				video: {
					width: { ideal: 1280 },
					height: { ideal: 720 }
				}
			});
			videoElement.srcObject = mediaStream;
			await videoElement.play();
			isPlaying = true;
			videoDuration = Infinity; // Webcam has no duration
			processVideoFrame(performance.now());
		} catch (error) {
			console.error('Error accessing webcam:', error);
			alert('Could not access webcam. Please make sure you have granted camera permissions.');
		}
	}

	async function stopWebcam() {
		if (mediaStream) {
			mediaStream.getTracks().forEach((track) => track.stop());
			mediaStream = null;
			videoElement.srcObject = null;
			isPlaying = false;
		}
	}

	async function loadVideo(file: File) {
		// Stop webcam if it's active
		if (mediaStream) {
			await stopWebcam();
		}

		const url = URL.createObjectURL(file);
		videoElement.src = url;
		await videoElement.play();
		isPlaying = true;
		videoDuration = videoElement.duration;
		processVideoFrame(performance.now());
	}

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

		// Set white background for the SVG
		svg.setAttribute('fill', darkMode ? 'black' : 'white');
		svg.style.backgroundColor = darkMode ? 'black' : 'white';

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

		// Fill canvas with white background
		ctx.fillStyle = darkMode ? 'black' : 'white';
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

	function processVideoFrame(timestamp: number) {
		if (!isPlaying || !videoElement || !outputCanvas || !selectedPalette) return;

		// Calculate FPS
		frameCount++;
		if (timestamp - lastFPSUpdate >= FPS_UPDATE_INTERVAL) {
			currentFPS = Math.round((frameCount * 1000) / (timestamp - lastFPSUpdate));
			frameCount = 0;
			lastFPSUpdate = timestamp;
		}

		// Check if video has ended and needs to be restarted
		if (videoElement.ended && !isLooping) {
			isPlaying = false;
			if (isRecording) {
				stopRecording();
			}
			return;
		}

		// During recording, maintain consistent frame rate
		if (isRecording) {
			const targetFrameTime = 1000 / (use60FPS ? 60 : 30);
			const elapsed = timestamp - lastFrameTime;
			if (elapsed < targetFrameTime) {
				animationFrameId = requestAnimationFrame(processVideoFrame);
				return;
			}
			lastFrameTime = timestamp;
		}

		// Set processing canvas size to match video dimensions
		processingCanvas.width = videoElement.videoWidth;
		processingCanvas.height = videoElement.videoHeight;

		// Draw current video frame to processing canvas
		processingCtx.drawImage(videoElement, 0, 0);

		// Get image data for processing
		const imageData = processingCtx.getImageData(
			0,
			0,
			processingCanvas.width,
			processingCanvas.height
		);
		const pixels = imageData.data;

		// Calculate dimensions based on video aspect ratio and tile count
		const videoAspectRatio = videoElement.videoWidth / videoElement.videoHeight;
		const baseWidth = outputResolution; // Use the selected output resolution
		const baseHeight = Math.round(baseWidth / videoAspectRatio);

		// Calculate number of tiles that will fit
		let cols = Math.floor(baseWidth / pixelSize);
		let rows = Math.floor(baseHeight / pixelSize);

		// Ensure we have at least 1 tile in each dimension
		cols = Math.max(1, cols);
		rows = Math.max(1, rows);

		// Calculate the actual width and height needed for square tiles
		const width = cols * pixelSize;
		const height = rows * pixelSize;

		// Get device pixel ratio for high DPI support
		const dpr = window.devicePixelRatio || 1;

		// Set output canvas size with DPR scaling
		outputCanvas.width = width * dpr;
		outputCanvas.height = height * dpr;

		// Scale the context to account for DPR
		outputCtx.scale(dpr, dpr);

		// Clear output canvas with background color based on dark mode
		outputCtx.fillStyle = darkMode ? 'black' : 'white';
		outputCtx.fillRect(0, 0, width, height);

		// Process pixels in batches
		const batchSize = 4;
		for (let i = 0; i < cols; i += batchSize) {
			for (let j = 0; j < rows; j += batchSize) {
				const batchResults = processPixelBatch(
					i,
					j,
					Math.min(batchSize, cols - i),
					Math.min(batchSize, rows - j),
					pixels,
					processingCanvas.width,
					processingCanvas.height,
					cols,
					rows
				);

				// Process batch results
				for (const result of batchResults) {
					const tileIndex = Math.min(
						tileImages.length - 1,
						Math.max(0, Math.floor(result.brightness * tileImages.length))
					);
					const tile = tileImages[tileIndex];
					if (!tile) continue;

					const x = result.x * pixelSize;
					const y = result.y * pixelSize;

					// Apply color based on mode
					if (tileColors[tileIndex]) {
						const colorConfig = tileColors[tileIndex];
						if (colorConfig.mode === 'custom' && colorConfig.color) {
							outputCtx.fillStyle = colorConfig.color;
							outputCtx.fillRect(x, y, pixelSize, pixelSize);
						} else if (colorConfig.mode === 'source') {
							outputCtx.fillStyle = result.color;
							outputCtx.fillRect(x, y, pixelSize, pixelSize);
						} else {
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

		// Schedule next frame
		animationFrameId = requestAnimationFrame(processVideoFrame);
	}

	function handleVideoUpload(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (file && file.type.startsWith('video/')) {
			loadVideo(file);
		}
	}

	function handlePaletteSelect(event: CustomEvent<{ palette: PaletteType; index: number }>) {
		const { palette, index } = event.detail;
		selectedPaletteIndex = index;
		selectedPalette = palette;

		// Convert SVG tiles to PNGs and load them
		Promise.all(
			palette.tiles.map(async (tile) => {
				const pngUrl = await convertSVGToPNG(tile.svg, tile.color || '#000000');
				return loadTileImage(pngUrl);
			})
		).then((images) => {
			tileImages = images;
		});

		// Initialize tile colors based on palette
		tileColors = palette.tiles.map((tile) => ({
			mode: tile.colorMode || 'custom',
			color: tile.color || '#000000'
		}));
	}

	async function startRecording() {
		if (!outputCanvas) return;

		// Restart video from beginning
		videoElement.currentTime = 0;
		await videoElement.play();
		isPlaying = true;

		recordedChunks = [];
		const stream = outputCanvas.captureStream(use60FPS ? 60 : 30);

		// Determine supported MIME types
		const mimeTypes = [
			useMP4 ? 'video/mp4;codecs=h264' : 'video/webm;codecs=vp9',
			useMP4 ? 'video/mp4' : 'video/webm',
			'video/webm;codecs=vp8',
			'video/webm'
		];

		// Find the first supported MIME type
		const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || 'video/webm';

		mediaRecorder = new MediaRecorder(stream, {
			mimeType,
			videoBitsPerSecond: 8000000 // 8 Mbps
		});

		mediaRecorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
				recordedChunks.push(event.data);
			}
		};

		mediaRecorder.onstop = () => {
			const blob = new Blob(recordedChunks, {
				type: useMP4 ? 'video/mp4' : 'video/webm'
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `halftone-video.${useMP4 ? 'mp4' : 'webm'}`;
			a.click();
			URL.revokeObjectURL(url);
			recordingElapsedTime = 0;
			clearInterval(recordingInterval);
		};

		mediaRecorder.start(33); // ~30fps
		isRecording = true;
		recordingStartTime = Date.now();
		recordingElapsedTime = 0;

		// Update elapsed time every second
		recordingInterval = setInterval(() => {
			recordingElapsedTime = Math.floor((Date.now() - recordingStartTime) / 1000);
		}, 1000);
	}

	function stopRecording() {
		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			mediaRecorder.stop();
		}
		isRecording = false;
		clearInterval(recordingInterval);
	}

	// Watch for webcam toggle changes
	$: if (useWebcam) {
		startWebcam();
	} else {
		stopWebcam();
	}

	// Clean up animation frame and media recorder on component destruction
	onDestroy(() => {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			mediaRecorder.stop();
		}
		clearInterval(recordingInterval);
		if (mediaStream) {
			stopWebcam();
		}
	});

	$: if (flipWebcam) {
		outputCanvas?.classList.add('flipped');
	} else {
		outputCanvas?.classList.remove('flipped');
	}
</script>

<div class="grid grid-cols-3 gap-4 p-4 video-halftone">
	<div class="col-span-2">
		<div
			style="height: {fitToScreen ? 'calc(100vh - 2rem)' : '100%'}"
			class="flex justify-center items-start w-full"
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

				<div class="flex flex-col gap-1.5 w-full max-w-sm">
					<Label for="outputResolution">Output Resolution</Label>
					<div class="flex w-full max-w-[300px] items-center space-x-2">
						<select
							class="w-full max-w-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
							bind:value={outputResolution}
							id="outputResolution"
						>
							<option value="480">480p</option>
							<option value="720">720p</option>
							<option value="1080">1080p</option>
							<option value="1440">1440p</option>
						</select>
					</div>
					<p class="text-sm text-muted-foreground">Lower resolution = better performance</p>
				</div>

				<div class="flex items-center space-x-2">
					<Switch bind:checked={invertSource} id="invert-source" />
					<Label for="invert-source">Invert Source Video</Label>
				</div>

				<div class="flex items-center space-x-2">
					<Switch bind:checked={darkMode} id="dark-mode" />
					<Label for="dark-mode">Dark Mode</Label>
				</div>

				<div class="flex items-center space-x-2">
					<Switch bind:checked={isLooping} id="video-loop" />
					<Label for="video-loop">Loop Video</Label>
				</div>

				<!-- <div class="flex items-center space-x-2">
					<Switch bind:checked={fitToScreen} id="fit-to-screen" />
					<Label for="fit-to-screen">Fit to Screen</Label>
				</div> -->

				<div class="flex items-center space-x-2">
					<Switch bind:checked={useMP4} id="use-mp4" />
					<Label for="use-mp4">Use MP4 Format</Label>
				</div>

				<div class="flex items-center space-x-2">
					<Switch bind:checked={use60FPS} id="use-60fps" />
					<Label for="use-60fps">Record at 60 FPS</Label>
				</div>

				<div class="flex items-center space-x-2">
					<Switch bind:checked={useWebcam} id="use-webcam" />
					<Label for="use-webcam">Use Webcam</Label>
				</div>

				{#if useWebcam}
					<div class="flex items-center space-x-2">
						<Switch bind:checked={flipWebcam} id="flip-webcam" />
						<Label for="flip-webcam">Flip Webcam</Label>
					</div>
				{/if}

				<div class="grid gap-1.5 items-center w-full max-w-sm">
					<Label for="video-upload">Source Video</Label>
					<Input
						on:change={handleVideoUpload}
						class="pt-1.5"
						id="video-upload"
						type="file"
						accept="video/*"
						disabled={useWebcam}
					/>
					{#if videoDuration > 0 && !useWebcam}
						<p class="text-sm text-muted-foreground">Duration: {videoDuration.toFixed(1)}s</p>
					{/if}
				</div>

				{#if videoDuration > 0 || useWebcam}
					<div class="flex flex-col gap-2">
						<div class="flex items-center space-x-2">
							<Button
								variant={isRecording ? 'destructive' : 'default'}
								on:click={() => (isRecording ? stopRecording() : startRecording())}
								disabled={!isPlaying}
							>
								{isRecording ? `Stop Recording (${recordingElapsedTime}s)` : 'Start Recording'}
							</Button>
							{#if isRecording}
								<p class="text-sm text-muted-foreground">Recording in progress...</p>
							{/if}
						</div>
						<p class="text-sm text-muted-foreground">Current FPS: {currentFPS}</p>
					</div>
				{/if}

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
								}}
							/>
						{/each}
					</div>
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

	:global(.video-halftone canvas) {
		max-width: 100%;
		height: auto !important;
		object-fit: contain;
		position: sticky;
		top: 1rem;
	}

	:global(.video-halftone canvas.flipped) {
		transform: scaleX(-1);
	}
</style>
