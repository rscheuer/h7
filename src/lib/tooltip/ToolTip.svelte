<script lang="ts">
	import { tooltip } from './tooltip';
	export let text = 'This is a tooltip';

	let content = 'Tooltip';
</script>

<div>
	<button use:tooltip={{ content: text }} class="bg-green-200 px-2 rounded border border-green-500"
		>Button</button
	>
</div>
