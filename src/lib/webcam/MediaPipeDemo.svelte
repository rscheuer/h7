<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	let videoElement: HTMLVideoElement;
	let canvasElement: HTMLCanvasElement;
	let selfieSegmentation: any;
	let cameraStream: MediaStream;

	async function initMediaPipe(): Promise<void> {
		return new Promise((resolve) => {
			const SelfieSegmentation = (window as any).SelfieSegmentation;

			selfieSegmentation = new SelfieSegmentation({
				locateFile: (file: string) =>
					`https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
			});

			selfieSegmentation.setOptions({
				modelSelection: 1 // Landscape mode = better quality
			});

			selfieSegmentation.onResults(onResults);
			resolve();
		});
	}

	async function startCamera() {
		cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
		videoElement.srcObject = cameraStream;
		await videoElement.play();
		requestAnimationFrame(processFrame);
	}

	async function processFrame() {
		if (videoElement.readyState >= 2) {
			await selfieSegmentation.send({ image: videoElement });
		}
		requestAnimationFrame(processFrame);
	}

	function onResults(results: any) {
		const canvasCtx = canvasElement.getContext('2d')!;
		canvasElement.width = results.image.width;
		canvasElement.height = results.image.height;

		canvasCtx.save();
		canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

		// Draw the segmentation mask
		canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height);

		// Cut out background
		canvasCtx.globalCompositeOperation = 'source-in';
		canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

		canvasCtx.restore();
	}

	onMount(async () => {
		await loadMediaPipeScript();
		await initMediaPipe();
		await startCamera();
	});

	onDestroy(() => {
		cameraStream?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
	});

	async function loadMediaPipeScript(): Promise<void> {
		if (!(window as any).SelfieSegmentation) {
			return new Promise((resolve) => {
				const script = document.createElement('script');
				script.src =
					'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
				script.onload = () => resolve();
				document.body.appendChild(script);
			});
		}
	}
</script>

<video bind:this={videoElement} playsinline muted style="display: none;" />
<canvas bind:this={canvasElement} />

<style>
	video,
	canvas {
		width: 100%;
		max-width: 640px;
		border-radius: 0.5rem;
		margin: 0 auto;
		display: block;
	}
</style>
