<script lang="ts">
	import { onMount } from 'svelte';

	// Constants
	const COLS = 64;
	const SLIDERS = 3;
	const W = 600;
	const SLIDER_H = 120;
	const H = SLIDERS * SLIDER_H + 20;

	// Reactive variables
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let animationId: number;

	// State
	const sliderColors = ['green', 'orangered', '#525aff'];
	const mouseX = Array(SLIDERS).fill(W * 0.5);
	let t = 0;
	let isDragging = false;
	let activeSlider = -1;

	// Exported values (0-1 normalized)
	export let sliderValues = [0, 0.3, 0.3]; // Initial values matching mouseX default

	// $: console.log(sliderValues);

	// Reactive statement to update exported values when mouseX changes
	$: {
		for (let i = 0; i < SLIDERS; i++) {
			sliderValues[i] = Math.min(1, Math.max(0, mouseX[i] / W));
		}
	}

	// Reactive statement to sync external sliderValues changes back to mouseX
	$: {
		for (let i = 0; i < SLIDERS; i++) {
			const newMouseX = sliderValues[i] * W;
			if (Math.abs(mouseX[i] - newMouseX) > 0.1) {
				// Avoid infinite loops with small threshold
				mouseX[i] = newMouseX;
			}
		}
	}

	// Generate token data (from original HTML)
	function genTokenData(p: number) {
		let data: { hash: string; tokenId: number } = { hash: '', tokenId: 0 };
		let hash = '0x';
		for (var i = 0; i < 64; i++) {
			hash += Math.floor(Math.random() * 16).toString(16);
		}
		data.hash = hash;
		data.tokenId = p * 1000000 + Math.floor(Math.random() * 1000);
		return data;
	}

	let tokenData = genTokenData(1);

	// Mouse event handlers
	function getCanvasCoordinates(e: MouseEvent) {
		if (!canvas) return { x: 0, y: 0 };

		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;

		return {
			x: (e.clientX - rect.left) * scaleX,
			y: (e.clientY - rect.top) * scaleY
		};
	}

	function handleMouseDown(e: MouseEvent) {
		const { x, y } = getCanvasCoordinates(e);
		const sliderIndex = Math.floor(y / SLIDER_H);

		if (sliderIndex >= 0 && sliderIndex < SLIDERS) {
			isDragging = true;
			activeSlider = sliderIndex;
			mouseX[sliderIndex] = x;

			// Add global mouse event listeners for over-dragging
			document.addEventListener('mousemove', handleGlobalMouseMove);
			document.addEventListener('mouseup', handleGlobalMouseUp);
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging || activeSlider === -1) return;

		const { x } = getCanvasCoordinates(e);
		mouseX[activeSlider] = Math.max(0, Math.min(W, x));
	}

	function handleGlobalMouseMove(e: MouseEvent) {
		if (!isDragging || activeSlider === -1) return;

		const { x } = getCanvasCoordinates(e);
		mouseX[activeSlider] = Math.max(0, Math.min(W, x));
	}

	function handleGlobalMouseUp() {
		if (isDragging) {
			isDragging = false;
			activeSlider = -1;

			// Remove global listeners when dragging stops
			document.removeEventListener('mousemove', handleGlobalMouseMove);
			document.removeEventListener('mouseup', handleGlobalMouseUp);
		}
	}

	function handleMouseUp() {
		handleGlobalMouseUp();
	}

	function handleMouseLeave() {
		// Don't stop dragging when leaving canvas - let global handlers manage it
	}

	// Drawing functions
	function drawRoundedRect(x: number, y: number, w: number, h: number, r: number, fill: string) {
		if (!ctx) return;

		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.lineTo(x + w - r, y);
		ctx.quadraticCurveTo(x + w, y, x + w, y + r);
		ctx.lineTo(x + w, y + h - r);
		ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
		ctx.lineTo(x + r, y + h);
		ctx.quadraticCurveTo(x, y + h, x, y + h - r);
		ctx.lineTo(x, y + r);
		ctx.quadraticCurveTo(x, y, x + r, y);
		ctx.closePath();
		ctx.fillStyle = fill;
		ctx.fill();
	}

	function fract(n: number): number {
		return n - Math.floor(n);
	}

	function rand(i: number): number {
		return fract(Math.sin(i * 127.1 + 311.7) * 43758.5453123);
	}

	function noise1D(x: number): number {
		const i = Math.floor(x);
		const f = x - i;
		const u = f * f * (3 - 2 * f);
		const a = rand(i);
		const b = rand(i + 1);
		return a * (1 - u) + b * u;
	}

	function fnoise(x: number): number {
		const n1 = noise1D(x);
		const n2 = noise1D(x * 2.13 + 17.7);
		return n1 * 0.7 + n2 * 0.3;
	}

	function draw() {
		if (!ctx) return;

		ctx.clearRect(0, 0, W, H);

		for (let s = 0; s < SLIDERS; s++) {
			const offsetY = s * SLIDER_H;
			const colW = W / COLS;
			const margin = 2;
			const pixelW = colW - 2 * margin;
			const r = pixelW * 0.12;
			const pixelH = Math.max(6, Math.floor(pixelW));
			const rows = Math.floor((SLIDER_H - 2 * margin) / pixelH);
			const innerTop = SLIDER_H - rows * pixelH - margin;

			const sliderCol = Math.min(COLS - 1, Math.max(0, Math.floor((mouseX[s] / W) * COLS)));
			const sliderNorm = Math.min(1, Math.max(0, mouseX[s] / W));

			for (let i = 0; i < COLS; i++) {
				const xNorm = i / COLS;
				let h01: number;

				if (s === 0) {
					// Green: simple ramp
					h01 = Math.pow(xNorm, 0.5 + sliderNorm * 2);
				} else if (s === 1) {
					// Orange: organic histogram (frequency control)
					const freq = 1 + sliderNorm * 9;
					const waveBase = Math.sin(xNorm * freq * Math.PI * 2 + t);
					const noiseVal = fnoise(i * 0.18 + t * 0.22) * 2 - 1;
					const mix = waveBase * 0.75 + noiseVal * 0.35;
					const shaped = Math.sign(mix) * Math.pow(Math.abs(mix), 0.85);
					h01 = Math.min(1, Math.max(0, (shaped + 1) * 0.5));
				} else {
					// Purple: single sine wave (contrast & scale control)
					const freq = 1; // exactly one cycle across the slider
					const amp = 0.2 + sliderNorm * 0.8;
					const contrast = 1 + sliderNorm * 3;
					const waveBase = Math.sin(xNorm * freq * Math.PI * 2 + t);
					const boosted = Math.sign(waveBase) * Math.pow(Math.abs(waveBase * amp), contrast);
					h01 = Math.min(1, Math.max(0, (boosted + 1) * 0.5));
				}

				const activeRows = Math.floor(h01 * rows);
				const x = i * colW + margin;

				for (let p = 0; p < rows; p++) {
					const y =
						H - margin - (p + 1) * pixelH - (innerTop - margin) - (SLIDERS - 1 - s) * SLIDER_H;
					if (i === sliderCol) {
						drawRoundedRect(x, y, pixelW, pixelH - 1, r, '#ccc');
					} else {
						const color = p < activeRows ? sliderColors[s] : '#333333';
						drawRoundedRect(x, y, pixelW, pixelH - 1, r, color);
					}
				}
			}
		}

		t += 0.02;
		animationId = requestAnimationFrame(draw);
	}

	onMount(() => {
		if (canvas) {
			const context = canvas.getContext('2d');
			if (context) {
				ctx = context;
				draw();
			}
		}

		// Cleanup function
		return () => {
			if (animationId) {
				cancelAnimationFrame(animationId);
			}
			// Clean up any remaining global listeners
			document.removeEventListener('mousemove', handleGlobalMouseMove);
			document.removeEventListener('mouseup', handleGlobalMouseUp);
		};
	});
</script>

<div class="flex relative justify-center items-center p-0 m-0 bg-black">
	<!-- svelte-ignore element_invalid_self_closing_tag -->
	<canvas
		bind:this={canvas}
		width={W}
		height={H}
		on:mousedown={handleMouseDown}
		on:mousemove={handleMouseMove}
		on:mouseup={handleMouseUp}
		on:mouseleave={handleMouseLeave}
		class="block p-0 mx-auto w-full bg-transparent border-none cursor-pointer"
	/>
</div>
