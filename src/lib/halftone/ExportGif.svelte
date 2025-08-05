<script lang="ts">
	import { browser } from '$app/environment';
	import { Button } from '$lib/components/ui/button/index.js';

	import { onMount } from 'svelte';

	let gif: any;

	export let ctx: CanvasRenderingContext2D;
	export let brightness: number;
	export let brightnessMin: number;
	export let brightnessMax: number;
	export let brightnessStep: number;
	export let boomerang: boolean = false; // Boomerang mode: goes up then back down
	export let onBrightnessChange: () => Promise<void>; // Function to trigger canvas update

	let isExporting = false;

	onMount(async () => {
		if (browser) {
			const [{ default: GIF }, workerScriptModule] = await Promise.all([
				import('gif.js.optimized'),
				import('gif.js.optimized/dist/gif.worker.js?url')
			]);

			gif = new GIF({
				workerScript: workerScriptModule.default,
				quality: 10,
				workers: 2,
				width: ctx.canvas.width,
				height: ctx.canvas.height
			});

			gif.on('finished', function (blob: any) {
				isExporting = false;
				console.log('GIF export finished');
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `halftone-animation-${Date.now()}.gif`;
				a.click();
				URL.revokeObjectURL(url);
			});
		}
	});

	function exportFrame() {
		if (browser && gif) {
			gif.addFrame(ctx, { copy: true, delay: 50, dispose: 1 });
			console.log('export frame');
		}
	}

	async function exportGIF() {
		if (!browser || !gif || isExporting) return;
		isExporting = true;

		console.log('Starting GIF export...');

		// Calculate brightness values
		const brightnessValues = [];

		// Forward direction: min to max
		for (let i = brightnessMin; i <= brightnessMax; i += brightnessStep) {
			brightnessValues.push(i);
		}

		// If boomerang mode, add reverse direction: max-step down to min
		if (boomerang) {
			for (let i = brightnessMax - brightnessStep; i >= brightnessMin; i -= brightnessStep) {
				brightnessValues.push(i);
			}
		}

		console.log(
			`Exporting ${boomerang ? 'boomerang' : 'linear'} animation with ${
				brightnessValues.length
			} frames:`,
			brightnessValues
		);

		// Capture frames sequentially with proper delays
		for (let i = 0; i < brightnessValues.length; i++) {
			const brightnessValue = brightnessValues[i];
			console.log(
				`Capturing frame ${i + 1}/${brightnessValues.length} with brightness: ${brightnessValue}`
			);

			// Update brightness
			brightness = brightnessValue;

			// Wait for canvas to update
			await onBrightnessChange();

			// Add small delay to ensure canvas is fully rendered
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Capture frame
			exportFrame();
		}

		console.log('All frames captured, rendering GIF...');
		gif.render();
	}
</script>

<div class="flex gap-2 items-center">
	<Button variant="default" size="sm" class="w-full" on:click={exportGIF}>Export GIF</Button>
	{#if isExporting}
		<svg
			width="265"
			height="265"
			class="w-6 h-6 spin"
			viewBox="0 0 265 265"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<circle
				cx="132.5"
				cy="132.5"
				r="107.5"
				stroke="white"
				stroke-opacity="0.13"
				stroke-width="50"
			/>
			<path
				d="M132.5 240C73.1294 240 25 191.871 25 132.5C25 73.1294 73.1294 25 132.5 25"
				stroke="white"
				stroke-width="50"
			/>
		</svg>
	{/if}
</div>

<style>
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.spin {
		animation: spin 0.2s linear infinite;
	}
</style>
