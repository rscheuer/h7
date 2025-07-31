<script lang="ts">
	export let progress: number = 50;

	function mapProgressToAngle(progress: number): number {
		return (progress / 100) * 360;
	}

	$: angularProgress = mapProgressToAngle(progress);
</script>

<div class="p-1 w-12 h-12 progress rounded-xl" style="--progress: {angularProgress}deg">
	<div class="bg-black w-full h-full rounded-lg">p</div>
</div>

<!-- <div class="w-4 h-4">
	<svg width="100%" height="100%" viewBox="0 0 100 100">
		<circle cx="50" cy="50" r="40" stroke="white" stroke-width="10" fill="none" />
		<circle cx="50" cy="50" r="40" stroke="red" stroke-width="10" fill="none" />
	</svg>
</div> -->

<style>
	.progress {
		background: conic-gradient(from 0deg, white var(--progress), #4c4c4d var(--progress));
	}
</style>
