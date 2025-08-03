<script lang="ts">
	import { FlowPhase, flowStore } from '$lib/stores';
	import Webcam from '$lib/webcam/Webcam.svelte';
	import Editor from 'lib/halftone/Editor.svelte';

	$: phase = $flowStore;

	let capturedImageUrl: string | null = null;

	function handleCapture(event: CustomEvent) {
		const imageData = event.detail;
		console.log('First face captured:', imageData);

		capturedImageUrl = imageData;

		flowStore.set(FlowPhase.Editor);

		// You can now use the blob for further processing
		// For example, send to an API, save to IndexedDB, etc.
	}
</script>

<svelte:head>
	<title>Halftone</title>
</svelte:head>

<main>
	{#if phase === FlowPhase.Webcam}
		<Webcam on:capture={handleCapture} />
	{:else if phase === FlowPhase.Editor}
		<Editor defaultImageUrl={capturedImageUrl} />
	{:else if phase === FlowPhase.Test}
		<p>Test</p>
	{/if}
</main>
