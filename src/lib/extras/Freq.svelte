<script lang="ts">
	import { onMount } from 'svelte';

	// Reactive variables for slider controls
	let freqX0 = 1;
	let freqY1 = 3;
	let freqX2 = 5;

	// Canvas and animation variables
	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let animationId: number;

	// Animation state
	const freqX = [1, 1, 2];
	const freqY = [1, 3, 1];
	let loop = 3;
	let inc = 1;
	let ttx = 0;

	// Reactive statements to update frequencies when sliders change
	$: freqX[0] = freqX0;
	$: freqY[1] = freqY1;
	$: {
		freqX[2] = freqX2;
		freqY[2] = freqX2 - 1;
	}

	onMount(() => {
		const cxCx = canvas.getContext('2d');
		if (!cxCx) return;

		const gridUnit = 64;
		let size = Math.floor(window.innerHeight / gridUnit) * gridUnit;
		let dimDif = 1;
		canvas.width = size * dimDif;
		canvas.height = canvas.width;
		// container.style.width = size * dimDif + 'px';
		// container.style.height = canvas.width + 'px';

		if (window.innerWidth < window.innerHeight * dimDif) {
			size = window.innerWidth;
			canvas.height = size / dimDif;
			canvas.width = canvas.height;
		}

		function generateLayer(strt: number, hght: number, ttx: number): void {
			if (!cxCx) return;

			const mtrx: number[][][] = [];
			let ticker = 0;

			// Initialize matrix
			for (let x = 0; x < gridUnit; x++) {
				mtrx[x] = [];
				for (let y = 0; y < gridUnit; y++) {
					mtrx[x][y] = [0];
				}
			}

			// Generate pattern
			for (let x = 0; x < gridUnit; x++) {
				for (let y = 0; y < gridUnit; y++) {
					for (let j = 0; j < loop; j++) {
						let doodler = (j * inc + ttx) * Math.PI;
						let xx = Math.round(
							Math.sin(ticker * freqX[j] + doodler) * (gridUnit / 2 - 1) + gridUnit / 2
						);
						let yy = Math.round(Math.cos(ticker * freqY[j]) * (gridUnit / 2 - 1) + gridUnit / 2);

						if (mtrx[xx] && mtrx[xx][yy]) {
							mtrx[xx][yy] = [j + 1];
						}
					}
					ticker++;
				}
			}

			// Clear and render
			cxCx.clearRect(0, 0, size, size);
			const gridSizeX = size / gridUnit;
			const gridSizeY = size / gridUnit;
			const margin = 2;
			const radius = (gridSizeX - 2 * margin) * 0.1;

			for (let x = 0; x < gridUnit; x++) {
				for (let y = strt; y < hght; y++) {
					const val: number = mtrx[x][y][0];
					let color: string | null = null;
					if (val === 1) color = 'orangered';
					if (val === 2) color = 'green';
					if (val === 3) color = '#525aff';

					if (color) {
						const rx = x * gridSizeX + margin;
						const ry = y * gridSizeY + margin;
						const rw = gridSizeX - 2 * margin;
						const rh = gridSizeY - 2 * margin;

						cxCx.fillStyle = color;
						cxCx.beginPath();
						cxCx.moveTo(rx + radius, ry);
						cxCx.lineTo(rx + rw - radius, ry);
						cxCx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
						cxCx.lineTo(rx + rw, ry + rh - radius);
						cxCx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
						cxCx.lineTo(rx + radius, ry + rh);
						cxCx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
						cxCx.lineTo(rx, ry + radius);
						cxCx.quadraticCurveTo(rx, ry, rx + radius, ry);
						cxCx.closePath();
						cxCx.fill();
					}
				}
			}
		}

		// Animation loop
		function animate() {
			if (!cxCx) return;
			generateLayer(0, gridUnit, ttx);
			ttx += 0.001;
			animationId = requestAnimationFrame(animate);
		}

		animate();

		// Cleanup function
		return () => {
			if (animationId) {
				cancelAnimationFrame(animationId);
			}
		};
	});
</script>

<div class="relative p-0 m-0 w-full">
	{#if false}
		<div class="flex absolute top-5 left-5 z-10 flex-col gap-2.5">
			<label class="flex flex-col gap-1 font-mono text-sm text-white">
				X Freq (Orange): {freqX0}
				<input type="range" bind:value={freqX0} min="1" max="10" class="w-48" />
			</label>
			<label class="flex flex-col gap-1 font-mono text-sm text-white">
				Y Freq (Green): {freqY1}
				<input type="range" bind:value={freqY1} min="1" max="10" class="w-48" />
			</label>
			<label class="flex flex-col gap-1 font-mono text-sm text-white">
				X Freq (Purple): {freqX2}
				<input type="range" bind:value={freqX2} min="2" max="10" class="w-48" />
			</label>
		</div>
	{/if}
	<div bind:this={container} class="block relative inset-0 p-0 m-auto w-full h-full">
		<canvas bind:this={canvas} class="block w-full h-full" />
	</div>
</div>
