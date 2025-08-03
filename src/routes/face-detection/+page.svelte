<script lang="ts">
	import Editor from '$lib/halftone/Editor.svelte';
	import Webcam from '$lib/webcam/Webcam.svelte';

	let capturedImageUrl: string | null = null;
	let showEditor = false;

	function handleCapture(event: CustomEvent) {
		const imageData = event.detail;
		console.log('First face captured:', imageData);

		// Store the captured image data URL for the halftone editor
		capturedImageUrl = imageData;
		showEditor = true;
	}

	function backToCamera() {
		showEditor = false;
		// Note: capturedImageUrl is now a data URL, no need to revoke
	}
</script>

<svelte:head>
	<title>Face Detection - Webcam</title>
</svelte:head>

{#if showEditor && capturedImageUrl}
	<main class="h-screen w-full bg-white overflow-auto">
		<div class="p-4">
			<button
				class="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
				on:click={backToCamera}
			>
				← Back to Camera
			</button>
		</div>
		<Editor defaultImageUrl={capturedImageUrl} />
	</main>
{:else}
	<main class="h-screen w-full bg-black">
		<Webcam on:capture={handleCapture} />
		{#if capturedImageUrl}
			<div class="absolute bottom-4 right-4 z-30">
				<button
					class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
					on:click={() => (showEditor = true)}
				>
					Open in Halftone Editor
				</button>
			</div>
		{/if}
	</main>
{/if}
