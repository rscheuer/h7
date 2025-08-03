<script lang="ts">
	let outputCanvas: HTMLCanvasElement;
	let selfieSegmentation: any;

	async function loadMediaPipe(): Promise<void> {
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

		selfieSegmentation.onResults(onResults);
	}

	async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const url = URL.createObjectURL(blob);
			const img = new Image();
			img.onload = () => {
				URL.revokeObjectURL(url);
				resolve(img);
			};
			img.onerror = reject;
			img.src = url;
		});
	}

	async function removeBackgroundFromBlob(blob: Blob): Promise<void> {
		await loadMediaPipe();
		const img = await blobToImage(blob);
		await selfieSegmentation.send({ image: img });
	}

	function onResults(results: any): void {
		const ctx = outputCanvas.getContext('2d')!;
		outputCanvas.width = results.image.width;
		outputCanvas.height = results.image.height;

		ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
		ctx.save();
		ctx.drawImage(results.segmentationMask, 0, 0);
		ctx.globalCompositeOperation = 'source-in';
		ctx.drawImage(results.image, 0, 0);
		ctx.restore();
	}

	// example usage: call this when you have a Blob
	// removeBackgroundFromBlob(myBlob);
</script>

<canvas bind:this={outputCanvas} />
