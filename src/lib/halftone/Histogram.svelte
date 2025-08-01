<script lang="ts">
	import type { PixelData } from '$lib/halftone/types.ts';
	import { onMount } from 'svelte';
	import { Spring } from 'svelte/motion';
	import CustomSlider from './CustomSlider.svelte';
	export let pixelData: PixelData[] = [];
	export let divisions = 10;
	let curveMode = true;

	let handle: HTMLDivElement;
	let slider: HTMLDivElement;
	let mouseDown = false;

	export let percentage = 0.5;

	// Function to calculate brightness histogram
	export function getBrightnessHistogram(pixels: PixelData[], numDivisions: number): number[] {
		if (numDivisions <= 0 || pixels.length === 0) {
			return new Array(numDivisions).fill(0);
		}

		// Initialize histogram array with zeros
		const histogram = new Array(numDivisions).fill(0);

		// Calculate the range for each division
		const divisionSize = 1.0 / numDivisions;

		// Count pixels in each division
		for (const pixel of pixels) {
			// Clamp brightness to [0, 1] range in case of any floating point errors
			const clampedBrightness = Math.max(0, Math.min(1, pixel.brightness));

			// Calculate which division this brightness belongs to
			let divisionIndex = Math.floor(clampedBrightness / divisionSize);

			// Handle edge case where brightness is exactly 1.0
			if (divisionIndex >= numDivisions) {
				divisionIndex = numDivisions - 1;
			}

			histogram[divisionIndex]++;
		}

		return histogram;
	}

	// Reactive statement to calculate histogram when pixelData or divisions change
	$: histogram = getBrightnessHistogram(pixelData, divisions);

	// Helper function to get division ranges for display
	function getDivisionRanges(numDivisions: number): { min: number; max: number }[] {
		const ranges = [];
		const divisionSize = 1.0 / numDivisions;

		for (let i = 0; i < numDivisions; i++) {
			const min = i * divisionSize;
			const max = (i + 1) * divisionSize;
			ranges.push({ min, max });
		}

		return ranges;
	}

	$: divisionRanges = getDivisionRanges(divisions);

	// Function to create smooth SVG path from histogram data
	function createSmoothPath(data: number[]): string {
		if (data.length === 0) return '';

		const maxValue = Math.max(...data);
		if (maxValue === 0) return '';

		// Convert data to coordinates that span full width (0-100)
		const points = data.map((value, i) => ({
			x: data.length === 1 ? 50 : (i / (data.length - 1)) * 100, // Spread points across full width
			y: 100 - (value / maxValue) * 95
		}));

		// Start path at bottom left
		let path = `M 0,100`;

		// Move to first point
		path += ` L ${points[0].x},100 L ${points[0].x},${points[0].y}`;

		// Create smooth curve through points using cubic bezier
		for (let i = 1; i < points.length; i++) {
			const prev = points[i - 1];
			const curr = points[i];
			const next = points[i + 1];

			// Calculate control points for smooth curve
			const tension = 0.34; // Adjust this for more/less smoothing

			let cp1x, cp1y, cp2x, cp2y;

			if (i === 1) {
				// First curve segment
				cp1x = prev.x + (curr.x - prev.x) * tension;
				cp1y = prev.y;
			} else {
				const prevPrev = points[i - 2];
				cp1x = prev.x + (curr.x - prevPrev.x) * tension * 0.5;
				cp1y = prev.y + (curr.y - prevPrev.y) * tension * 0.5;
			}

			if (i === points.length - 1) {
				// Last curve segment
				cp2x = curr.x - (curr.x - prev.x) * tension;
				cp2y = curr.y;
			} else {
				cp2x = curr.x - (next.x - prev.x) * tension * 0.5;
				cp2y = curr.y - (next.y - prev.y) * tension * 0.5;
			}

			path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
		}

		// Close path at bottom right
		const lastPoint = points[points.length - 1];
		path += ` L ${lastPoint.x},100 L 100,100 Z`;

		return path;
	}

	$: console.log('Brightness histogram:', histogram);
	$: console.log('Division ranges:', divisionRanges);

	// function handleMouseDown(e: any) {
	// 	mouseDown = true;
	// 	// move handle to position
	// 	const x = e.clientX - slider.getBoundingClientRect().left;
	// 	const width = slider.clientWidth;
	// 	percentage = x / width;
	// 	// console.log('x', x, 'width', width, 'percentage', percentage);
	// 	let pxToMove = percentage * width;
	// 	setHandle(pxToMove);
	// }

	// function handleMouseUp() {
	// 	mouseDown = false;
	// }

	// function handleMouseMove(e: any) {
	// 	if (!mouseDown) return;
	// 	const x = e.clientX - slider.getBoundingClientRect().left;
	// 	const width = slider.clientWidth;
	// 	percentage = x / width;
	// 	// console.log('x', x, 'width', width, 'percentage', percentage);
	// 	let pxToMove = percentage * width;
	// 	setHandle(pxToMove);
	// }

	// function setHandle(x: number) {
	// 	handle.style.left = x + 'px';
	// }

	onMount(() => {
		// document.addEventListener('mousemove', handleMouseMove, { passive: true });
	});
</script>

<div class="w-full h-full p-0">
	{#if pixelData.length > 0}
		<div class="mb-4">
			<div
				role="slider"
				aria-valuenow={0}
				tabindex="0"
				bind:this={slider}
				class="p-1.5 border-[1.5px] border-h-neutral-400 rounded-2xl relative"
			>
				<div class="w-full h-[50px] overflow-hidden rounded-lg bg-h-neutral-400">
					<svg class="w-full h-full -scale-x-100" viewBox="0 0 100 100" preserveAspectRatio="none">
						<defs>
							<linearGradient id="histogramGradient" x1="0%" y1="0%" x2="0%" y2="100%">
								<stop offset="0%" style="stop-color:black;stop-opacity:0.9" />
								<stop offset="100%" style="stop-color:black;stop-opacity:0.9" />
							</linearGradient>
						</defs>

						{#if histogram.length > 0}
							<!-- Create smooth curve path -->
							<path
								d={createSmoothPath(histogram)}
								fill="url(#histogramGradient)"
								stroke="red"
								stroke-width="0"
								vector-effect="non-scaling-stroke"
							/>
						{/if}
					</svg>
				</div>
				<!-- <div bind:this={handle} class="absolute w-[1.5px] h-full bg-white inset-0">
					<div class="absolute w-4 h-[7px] -top-px left-1/2 mx-auto bg-white -translate-x-1/2" />
					<div class="absolute w-4 h-[7px] -bottom-px left-1/2 mx-auto bg-white -translate-x-1/2" />
				</div> -->
				<div class="absolute w-full h-full inset-0">
					<CustomSlider
						bind:value={percentage}
						trackColor="transparent"
						thumbColor="white"
						thumbWidth="10px"
						thumbHeight="60px"
						min={0}
						max={1}
						step={0.01}
					/>
				</div>
			</div>
		</div>

		<!-- Raw data display -->
		<!-- <details class="mt-4 hidden">
			<summary class="cursor-pointer text-sm font-medium">Raw Histogram Data</summary>
			<div class="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
				<div>Histogram: {JSON.stringify(histogram)}</div>
				<div class="mt-1">
					Ranges: {JSON.stringify(
						divisionRanges.map((r) => `${r.min.toFixed(2)}-${r.max.toFixed(2)}`)
					)}
				</div>
			</div>
		</details> -->
	{:else}
		<div class="text-gray-500 text-center py-8">No pixel data available</div>
	{/if}
</div>
