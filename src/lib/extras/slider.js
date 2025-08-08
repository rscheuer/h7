window.onload = function () {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	document.body.appendChild(canvas);

	const COLS = 64;
	const SLIDERS = 3;
	const W = 600;
	const SLIDER_H = 120;
	const H = SLIDERS * SLIDER_H + 20;
	canvas.width = W;
	canvas.height = H;
	canvas.style.position = 'fixed';
	canvas.style.top = '20px';
	canvas.style.left = '20px';
	canvas.style.background = 'transparent';

	const sliderColors = ['green', 'orangered', '#525aff'];
	const mouseX = Array(SLIDERS).fill(W * 0.3);

	canvas.addEventListener('mousemove', (e) => {
		const y = e.offsetY;
		const sliderIndex = Math.floor(y / SLIDER_H);
		if (sliderIndex >= 0 && sliderIndex < SLIDERS) {
			mouseX[sliderIndex] = e.offsetX;
		}
	});

	function drawRoundedRect(x, y, w, h, r, fill) {
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

	function fract(n) {
		return n - Math.floor(n);
	}
	function rand(i) {
		return fract(Math.sin(i * 127.1 + 311.7) * 43758.5453123);
	}
	function noise1D(x) {
		const i = Math.floor(x);
		const f = x - i;
		const u = f * f * (3 - 2 * f);
		const a = rand(i);
		const b = rand(i + 1);
		return a * (1 - u) + b * u;
	}
	function fnoise(x) {
		const n1 = noise1D(x);
		const n2 = noise1D(x * 2.13 + 17.7);
		return n1 * 0.7 + n2 * 0.3;
	}

	let t = 0;
	function draw() {
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
				let h01;

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
		requestAnimationFrame(draw);
	}

	draw();
};
