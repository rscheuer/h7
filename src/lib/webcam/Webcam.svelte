<script lang="ts">
	import { browser } from '$app/environment';
	import * as faceapi from 'face-api.js';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';

	const dispatch = createEventDispatcher();

	let video: HTMLVideoElement;
	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let stream: MediaStream | null = null;
	let isLoaded = false;
	let isDetecting = false;
	let error: string | null = null;
	let detectionInterval: number;

	// MediaPipe background removal
	let selfieSegmentation: any;
	let isMediaPipeLoaded = false;
	let backgroundRemovalCanvas: HTMLCanvasElement;
	let backgroundRemovalResolve: ((value: string) => void) | null = null;
	let backgroundRemovalReject: ((reason?: any) => void) | null = null;

	// Detection settings
	let showBoundingBox = true;
	let flipCamera = true; // Default to flipped (mirror mode)
	let detectionConfidence = 0.2;
	let detectionFrequency = 100; // ms between detections

	// Bounding box expansion settings
	let expandBox = true;
	let marginTop = 0.6; // More space for hair
	let marginBottom = 0.1;
	let forceSquare = true; // Auto-calculate sides to make square

	// Detection results
	let detectionResults: any[] = [];

	// Capture functionality
	let capturedImages: string[] = [];
	let isCapturing = false;

	const expandBoundingBox = (box: any) => {
		const { x, y, width, height } = box;

		// Calculate the expanded height first
		const expandedHeight = height * (1 + marginTop + marginBottom);

		// Calculate sides margin to make it square (width = height)
		let calculatedMarginSides = 0;
		if (forceSquare) {
			// Solve: width * (1 + 2 * marginSides) = expandedHeight
			calculatedMarginSides = Math.max(0, (expandedHeight - width) / (2 * width));
		}

		const newX = Math.max(0, x - width * calculatedMarginSides);
		const newY = Math.max(0, y - height * marginTop);
		const newWidth = Math.min(
			canvas?.width - newX || width,
			width * (1 + 2 * calculatedMarginSides)
		);
		const newHeight = Math.min(canvas?.height - newY || height, expandedHeight);

		return {
			x: newX,
			y: newY,
			width: newWidth,
			height: newHeight,
			calculatedMarginSides // Return this for display purposes
		};
	};

	async function loadModels() {
		if (!browser) return;

		try {
			await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
			isLoaded = true;
			console.log('Tiny face detector model loaded successfully');
		} catch (err) {
			error =
				'Failed to load face detection model. Please ensure the tiny face detector model is available.';
			console.error('Failed to load model:', err);
		}
	}

	async function loadMediaPipe(): Promise<void> {
		if (!browser) return;

		if (!(window as any).SelfieSegmentation) {
			await new Promise<void>((resolve) => {
				const script = document.createElement('script');
				script.src =
					'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
				script.onload = () => resolve();
				document.body.appendChild(script);
			});
		}

		selfieSegmentation = new (window as any).SelfieSegmentation({
			locateFile: (file: string) =>
				`https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
		});

		selfieSegmentation.setOptions({ modelSelection: 1 });

		// Set up the results callback once during initialization
		selfieSegmentation.onResults((results: any) => {
			console.log('Results received from MediaPipe');
			if (!backgroundRemovalCanvas) {
				backgroundRemovalCanvas = document.createElement('canvas');
			}

			const ctx = backgroundRemovalCanvas.getContext('2d')!;
			backgroundRemovalCanvas.width = results.image.width;
			backgroundRemovalCanvas.height = results.image.height;

			ctx.clearRect(0, 0, backgroundRemovalCanvas.width, backgroundRemovalCanvas.height);
			ctx.save();

			// Draw the segmentation mask
			ctx.drawImage(results.segmentationMask, 0, 0);
			ctx.globalCompositeOperation = 'source-in';
			ctx.drawImage(results.image, 0, 0);
			ctx.restore();

			// Convert to data URL and resolve the promise
			const imageData = backgroundRemovalCanvas.toDataURL('image/png');

			if (backgroundRemovalResolve) {
				backgroundRemovalResolve(imageData);
				backgroundRemovalResolve = null;
				backgroundRemovalReject = null;
			}
		});

		isMediaPipeLoaded = true;
		console.log('MediaPipe selfie segmentation loaded successfully');
	}

	async function removeBackgroundFromCanvas(sourceCanvas: HTMLCanvasElement): Promise<string> {
		console.log('Removing background from canvas!!');
		if (!isMediaPipeLoaded) {
			throw new Error('MediaPipe not loaded');
		}

		return new Promise((resolve, reject) => {
			// Store the resolve/reject functions for the callback to use
			backgroundRemovalResolve = resolve;
			backgroundRemovalReject = reject;

			console.log('About to send canvas to MediaPipe');
			// Send the canvas image for processing
			selfieSegmentation.send({ image: sourceCanvas }).catch((err: any) => {
				console.error('MediaPipe send error:', err);
				backgroundRemovalResolve = null;
				backgroundRemovalReject = null;
				reject(err);
			});
		});
	}

	async function startWebcam() {
		if (!browser) return;

		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: {
					width: { ideal: 640 },
					height: { ideal: 480 },
					facingMode: 'user'
				}
			});

			video.srcObject = stream;
			video.play();

			video.addEventListener('loadedmetadata', () => {
				// Set canvas dimensions to match container size
				const rect = container.getBoundingClientRect();
				canvas.width = rect.width;
				canvas.height = rect.height;

				// Auto-start detection when camera is ready and models are loaded
				if (isLoaded) {
					startDetection();
				}
			});

			// Update canvas size when container resizes
			const resizeObserver = new ResizeObserver(() => {
				const rect = container.getBoundingClientRect();
				canvas.width = rect.width;
				canvas.height = rect.height;
			});

			if (container) {
				resizeObserver.observe(container);
			}
		} catch (err) {
			error = 'Failed to access webcam. Please ensure camera permissions are granted.';
			console.error('Webcam error:', err);
		}
	}

	function stopWebcam() {
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			stream = null;
		}
		stopDetection();
	}

	function startDetection() {
		if (!isLoaded || !video || isDetecting) return;

		isDetecting = true;
		detectionInterval = setInterval(async () => {
			await detectFaces();
		}, detectionFrequency);
	}

	function stopDetection() {
		isDetecting = false;
		if (detectionInterval) {
			clearInterval(detectionInterval);
		}
	}

	async function detectFaces() {
		if (!video || !canvas || !isLoaded) return;

		try {
			const detections = await faceapi.detectAllFaces(
				video,
				new faceapi.TinyFaceDetectorOptions({
					inputSize: 416,
					scoreThreshold: detectionConfidence
				})
			);

			detectionResults = detections;
			drawDetections(detections);
		} catch (err) {
			console.error('Detection error:', err);
		}
	}

	function drawDetections(detections: any[]) {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Calculate scale factors between video resolution and display size
		// For object-cover, we need to handle the aspect ratio properly
		const containerRect = container.getBoundingClientRect();
		const videoAspect = video.videoWidth / video.videoHeight;
		const containerAspect = containerRect.width / containerRect.height;

		let scaleX,
			scaleY,
			offsetX = 0,
			offsetY = 0;

		if (videoAspect > containerAspect) {
			// Video is wider than container, scale by height
			scaleY = containerRect.height / video.videoHeight;
			scaleX = scaleY;
			offsetX = (containerRect.width - video.videoWidth * scaleX) / 2;
		} else {
			// Video is taller than container, scale by width
			scaleX = containerRect.width / video.videoWidth;
			scaleY = scaleX;
			offsetY = (containerRect.height - video.videoHeight * scaleY) / 2;
		}

		// Save context state
		ctx.save();

		// Apply offset for centering
		ctx.translate(offsetX, offsetY);

		// Scale the canvas context to match the display size
		ctx.scale(scaleX, scaleY);

		// If camera is flipped, flip the canvas context to match
		if (flipCamera) {
			ctx.scale(-1, 1);
			ctx.translate(-video.videoWidth, 0);
		}

		detections.forEach((detection) => {
			let box = detection.box;

			// Expand the bounding box if enabled
			if (expandBox) {
				box = expandBoundingBox(box);
			}

			let { x, y, width, height } = box;

			// If camera is flipped, adjust x coordinate (but we're already in flipped coordinate space)
			if (flipCamera) {
				x = video.videoWidth - x - width;
			}

			// Draw bounding box
			if (showBoundingBox) {
				ctx.strokeStyle = '#00ff00';
				ctx.lineWidth = 2;
				ctx.strokeRect(x, y, width, height);

				// Draw confidence score
				ctx.fillStyle = '#00ff00';
				ctx.font = '14px Arial';
				ctx.fillText(`${Math.round(detection.score * 100)}%`, x, y - 5);
			}
		});

		// Restore context state
		ctx.restore();
	}

	onMount(async () => {
		await Promise.all([loadModels(), loadMediaPipe()]);

		// Check if camera permissions are already granted and auto-start
		if (browser && navigator.permissions) {
			try {
				const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
				if (permission.state === 'granted') {
					// Auto-start camera and detection if permission already granted
					await startWebcam();
					console.log('Camera auto-started with existing permissions');
				}
			} catch (err) {
				// Fallback: some browsers don't support permissions API fully
				console.log('Permissions API not supported, user will need to manually start camera');
			}
		}
	});

	async function captureBoxImages() {
		console.log('Capturing box images');
		if (!video || !canvas || detectionResults.length === 0) return;
		console.log('Video, canvas, and detection results are ready');

		isCapturing = true;
		const newCapturedImages: string[] = [];

		try {
			// Create a temporary canvas for capturing
			const captureCanvas = document.createElement('canvas');
			const captureCtx = captureCanvas.getContext('2d');
			if (!captureCtx) return;

			// Only capture the first detected face
			const detection = detectionResults[0];
			const index = 0;

			let box = detection.box;

			// Expand the bounding box if enabled
			if (expandBox) {
				box = expandBoundingBox(box);
			}

			let { x, y, width, height } = box;

			// Handle flipped camera by adjusting coordinates
			if (flipCamera) {
				x = video.videoWidth - x - width;
			}

			// Ensure we don't go outside video bounds
			x = Math.max(0, Math.min(x, video.videoWidth - 1));
			y = Math.max(0, Math.min(y, video.videoHeight - 1));
			width = Math.min(width, video.videoWidth - x);
			height = Math.min(height, video.videoHeight - y);

			// Set canvas size to the bounding box size
			captureCanvas.width = width;
			captureCanvas.height = height;

			// Clear the canvas
			captureCtx.clearRect(0, 0, width, height);

			// If camera is flipped, we need to flip the context for drawing
			if (flipCamera) {
				captureCtx.save();
				captureCtx.scale(-1, 1);
				captureCtx.translate(-width, 0);
				// Draw the cropped region (but we need to adjust source coordinates since video is not flipped)
				captureCtx.drawImage(
					video,
					video.videoWidth - x - width,
					y,
					width,
					height, // source (unflipped coordinates)
					0,
					0,
					width,
					height // destination
				);
				captureCtx.restore();
			} else {
				// Draw the cropped region from video to capture canvas
				captureCtx.drawImage(
					video,
					x,
					y,
					width,
					height, // source
					0,
					0,
					width,
					height // destination
				);
			}

			// Apply background removal if MediaPipe is loaded
			let finalImageData: string;
			if (isMediaPipeLoaded) {
				console.log('Applying background removal');
				try {
					finalImageData = await removeBackgroundFromCanvas(captureCanvas);
					console.log('Background removal applied successfully');
				} catch (err) {
					console.warn('Failed to apply background removal, using original image:', err);
					finalImageData = captureCanvas.toDataURL('image/png');
				}
			} else {
				finalImageData = captureCanvas.toDataURL('image/png');
			}

			// Create blob URL for internal gallery display
			fetch(finalImageData)
				.then((res) => res.blob())
				.then((blob) => {
					const url = URL.createObjectURL(blob);
					newCapturedImages.push(url);
					capturedImages = [...capturedImages, ...newCapturedImages];
				});

			// Dispatch capture event with the processed image data
			dispatch('capture', finalImageData);
		} catch (error) {
			console.error('Error capturing images:', error);
		} finally {
			isCapturing = false;
		}
	}

	function clearCapturedImages() {
		// Revoke all blob URLs to free memory
		capturedImages.forEach((url) => URL.revokeObjectURL(url));
		capturedImages = [];
	}

	function downloadImage(url: string, index: number) {
		const a = document.createElement('a');
		a.href = url;
		a.download = `face-capture-${index + 1}-${Date.now()}.png`;
		a.click();
	}

	onDestroy(() => {
		stopWebcam();
		clearCapturedImages();
	});

	// Reactive statements
	$: if (isLoaded && video && video.readyState >= 2) {
		if (isDetecting) {
			stopDetection();
		}
		startDetection();
	}
</script>

<div bind:this={container} class="relative w-full h-screen">
	<!-- Controls -->
	<div
		class:!top-12={stream}
		class="absolute top-1/2 left-1/2 z-20 p-3 mb-4 space-y-3 w-full max-w-sm rounded-2xl transition-all duration-300 -translate-x-1/2 -translate-y-1/2 bg-h-neutral-700"
	>
		<div class="flex gap-2 justify-between w-full">
			<div class="flex gap-2">
				<div class="flex justify-center items-center px-2 text-black rounded bg-h-neutral-logo">
					<svg
						width="33"
						height="16"
						class="w-7 h-auto"
						viewBox="0 0 33 16"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<circle cx="8.18182" cy="7.99999" r="7.68182" fill="#141415" />
						<path
							d="M29.4548 0.318359C31.4129 0.318454 32.9998 1.90622 32.9998 3.86426V12.1367C32.9997 14.0947 31.4128 15.6815 29.4548 15.6816H21.1824C19.2243 15.6816 17.6366 14.0947 17.6365 12.1367V3.86426C17.6365 1.90616 19.2243 0.318359 21.1824 0.318359H29.4548ZM25.3181 3.27246C22.7074 3.27256 20.5906 5.38926 20.5906 8C20.5906 10.6107 22.7074 12.7274 25.3181 12.7275C27.9289 12.7275 30.0457 10.6108 30.0457 8C30.0457 5.3892 27.9289 3.27246 25.3181 3.27246Z"
							fill="#141415"
						/>
					</svg>
				</div>
				<div
					class="flex justify-center items-center px-2 py-px text-black rounded bg-h-neutral-400"
				>
					H7 Console
				</div>
			</div>

			<button
				class="py-px px-2 bg-[#00956D] text-white rounded hover:bg-opacity-80 disabled:opacity-50"
				on:click={stream ? stopWebcam : startWebcam}
				disabled={!isLoaded}
				class:!bg-h-neutral-400={stream}
			>
				{stream ? 'Stop' : 'Start'}
			</button>

			<!-- <button
				class="px-4 py-2 text-white bg-green-500 rounded hover:bg-green-600 disabled:opacity-50"
				on:click={isDetecting ? stopDetection : startDetection}
				disabled={!stream || !isLoaded}
			>
				{isDetecting ? 'Stop Detection' : 'Start Detection'}
			</button> -->

			<!-- <button
				class="px-4 py-2 text-white bg-purple-500 rounded hover:bg-purple-600 disabled:opacity-50"
				on:click={captureBoxImages}
				disabled={!stream || !isDetecting || detectionResults.length === 0 || isCapturing}
			>
				{isCapturing
					? 'Capturing...'
					: detectionResults.length > 0
					? 'Capture Face'
					: 'No Face Detected'}
			</button> -->

			{#if capturedImages.length > 0}
				<button
					class="px-4 py-2 text-white bg-red-500 rounded hover:bg-red-600"
					on:click={clearCapturedImages}
				>
					Clear ({capturedImages.length})
				</button>
			{/if}
		</div>
	</div>

	<!-- Status -->
	<div class="hidden mb-4 text-sm">
		{#if error}
			<div class="p-2 text-red-500 bg-red-50 rounded dark:bg-red-900/20">
				{error}
			</div>
		{:else if !isLoaded}
			<div class="p-2 text-blue-500 bg-blue-50 rounded dark:bg-blue-900/20">
				Loading face detection models...
			</div>
		{:else if !stream}
			<div class="p-2 text-gray-500 bg-gray-50 rounded dark:bg-gray-900/20">
				Click "Start Camera" to begin face detection
			</div>
		{:else}
			<div class="p-2 text-green-500 bg-green-50 rounded dark:bg-green-900/20">
				Detecting faces... Found: {detectionResults.length}
			</div>
		{/if}
	</div>

	<div
		class="flex fixed inset-0 z-20 justify-center items-end p-12 w-full h-full pointer-events-none"
	>
		<button
			on:click={captureBoxImages}
			disabled={!stream || !isDetecting || detectionResults.length === 0 || isCapturing}
			aria-label="capture"
			class="p-1 rounded-2xl border-2 border-white pointer-events-auto group"
		>
			<!-- svelte-ignore element_invalid_self_closing_tag -->
			<div class="bg-red-500 w-12 h-10 rounded-[10px] group-disabled:opacity-50" />
		</button>
	</div>

	<!-- Video and Canvas Container -->
	<div class="overflow-hidden absolute inset-0 bg-black">
		<!-- Video Element -->
		<!-- svelte-ignore element_invalid_self_closing_tag -->
		<video
			style="filter: saturate(0.0);"
			bind:this={video}
			class="w-full h-full object-cover {flipCamera ? 'scale-x-[-1]' : ''}"
			autoplay
			muted
			playsinline
		/>

		<!-- Overlay Canvas for Detections -->
		<!-- svelte-ignore element_invalid_self_closing_tag -->
		<canvas
			bind:this={canvas}
			class="absolute inset-0 w-full h-full pointer-events-none {flipCamera ? 'scale-x-[-1]' : ''}"
		/>

		<!-- Face Count Overlay -->
		<!-- {#if detectionResults.length > 0}
			<div class="absolute top-2 right-2 px-2 py-1 text-sm text-white rounded bg-black/70">
				{detectionResults.length} face{detectionResults.length !== 1 ? 's' : ''} detected
			</div>
		{/if} -->
	</div>

	<!-- Detection Results -->
	<!-- {#if detectionResults.length > 0}
		<div class="mt-4 space-y-2">
			<h3 class="font-medium">Detection Results:</h3>
			{#each detectionResults as detection, i}
				{@const originalBox = detection.box}
				{@const expandedResult = expandBox ? expandBoundingBox(originalBox) : originalBox}
				<div class="p-3 text-sm bg-gray-50 rounded dark:bg-gray-800">
					<div class="font-medium">Face {i + 1}</div>
					<div>Confidence: {Math.round(detection.score * 100)}%</div>
					<div>Original: {Math.round(originalBox.width)} × {Math.round(originalBox.height)}</div>
					{#if expandBox}
						<div class="text-green-600 dark:text-green-400">
							Expanded: {Math.round(expandedResult.width)} × {Math.round(expandedResult.height)}
							{#if forceSquare}
								<span class="text-xs">(Square)</span>
							{/if}
						</div>
						{#if forceSquare && expandedResult.calculatedMarginSides}
							<div class="text-xs text-gray-500">
								Auto-sides margin: {expandedResult.calculatedMarginSides.toFixed(2)}
							</div>
						{/if}
					{/if}
				</div>
			{/each}
		</div>
	{/if} -->

	<!-- Captured Images -->
	<!-- {#if capturedImages.length > 0}
		<div class="mt-6">
			<h3 class="mb-3 font-medium">Captured Images:</h3>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
				{#each capturedImages as imageUrl, i}
					<div class="relative group">
						<img
							src={imageUrl}
							alt="Captured face {i + 1}"
							class="w-full h-auto rounded-lg border-2 border-gray-200 transition-colors dark:border-gray-700 hover:border-blue-500"
						/>
						<div
							class="flex absolute inset-0 justify-center items-center bg-black bg-opacity-0 rounded-lg opacity-0 transition-all group-hover:bg-opacity-30 group-hover:opacity-100"
						>
							<button
								on:click={() => downloadImage(imageUrl, i)}
								class="px-3 py-1 text-sm text-white bg-blue-500 rounded hover:bg-blue-600"
							>
								Download
							</button>
						</div>
						<div
							class="absolute top-1 right-1 px-2 py-1 text-xs text-white bg-black bg-opacity-70 rounded"
						>
							{i + 1}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if} -->
</div>
