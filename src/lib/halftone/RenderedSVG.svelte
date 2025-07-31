<script lang="ts">
	import { onMount } from 'svelte';
	import { blur, fade } from 'svelte/transition';
	export let svg: string;
	export let color: string = '#000000';
	export let useSourceColor: boolean = false;

	async function loadSVG(url: string): Promise<SVGElement> {
		const response = await fetch(url);
		const text = await response.text();
		const parser = new DOMParser();
		const doc = parser.parseFromString(text, 'image/svg+xml');
		return doc.documentElement as unknown as SVGElement;
	}

	async function renderSVG(url: string, color: string, useSourceColor: boolean) {
		useSourceColor ? (color = '#00000080') : (color = color);
		const svg = await loadSVG(url);
		svg.querySelectorAll('path, circle, rect, polygon').forEach((element) => {
			(element as SVGElement).setAttribute('fill', color);
		});
		svg.setAttribute('width', '100%');
		svg.setAttribute('height', '100%');
		const serializer = new XMLSerializer();
		const string = serializer.serializeToString(svg);
		return string;
	}

	// let renderedSVG = '';

	$: renderedSVG = svg ? renderSVG(svg, color, useSourceColor) : '';

	onMount(async () => {
		renderedSVG = await renderSVG(svg, color, useSourceColor);
	});
</script>

{#await renderedSVG}
	<!-- Loading... -->
{:then svg}
	<div in:fade out:fade class:checker={useSourceColor}>
		{@html svg}
	</div>
{:catch error}
	<p>Error: {error.message}</p>
{/await}

<style>
	.checker {
		background: repeating-conic-gradient(#c0c0c0 0% 25%, transparent 0% 50%) 50% / 5px 5px;
	}
</style>
