<script lang="ts">
	import type { PixelData } from '$lib/halftone/types.ts';
	export let pixelData: PixelData[] = [];
	export let divisions = 20;
	let curveMode = true;

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
</script>

<div class="w-full h-full p-0">
	<div class="mb-4 flex items-center gap-4">
		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" bind:checked={curveMode} class="rounded" />
			Smooth curve
		</label>

		<div class="flex-1">
			<label for="divisions" class="block text-xs text-gray-600 mb-1">
				Divisions: {divisions}
			</label>
			<input
				id="divisions"
				type="range"
				min="2"
				max="100"
				bind:value={divisions}
				class="w-full h-1"
			/>
		</div>
	</div>

	{#if pixelData.length > 0}
		<div class="mb-4">
			<h3 class="text-lg font-semibold mb-2 hidden">Brightness Histogram</h3>
			<p class="text-sm text-gray-600 mb-3 hidden">
				Total pixels: {pixelData.length}
			</p>

			{#if curveMode == false}
				<!-- Histogram bars -->
				<div class="p-1.5 border-2 border-h-neutral-400 rounded-2xl">
					<div class="flex items-end gap-0 h-[100px] overflow-hidden rounded-lg">
						{#each histogram as count, i}
							<div class="flex-1 bg-h-neutral-400 rounded-t-0 relative h-full flex items-end">
								<div
									class="bg-black w-full rounded-t-0 transition-all duration-300"
									style="height: {Math.max(1, (count / Math.max(...histogram)) * 100)}%"
								>
									<!--  -->
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<div class="p-1.5 border-2 border-h-neutral-400 rounded-2xl">
					<div class="w-full h-[64px] overflow-hidden rounded-lg bg-h-neutral-400">
						<svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
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
				</div>
			{/if}
		</div>

		<!-- Raw data display -->
		<details class="mt-4 hidden">
			<summary class="cursor-pointer text-sm font-medium">Raw Histogram Data</summary>
			<div class="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
				<div>Histogram: {JSON.stringify(histogram)}</div>
				<div class="mt-1">
					Ranges: {JSON.stringify(
						divisionRanges.map((r) => `${r.min.toFixed(2)}-${r.max.toFixed(2)}`)
					)}
				</div>
			</div>
		</details>
	{:else}
		<div class="text-gray-500 text-center py-8">No pixel data available</div>
	{/if}
</div>
