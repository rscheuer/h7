<script lang="ts">
	import { onMount } from 'svelte';

	import Icon from './util/Icon.svelte';
	import Image from './util/Image.svelte';

	export let userList = [
		{
			name: 'Ryan Scheuer',
			subtitle: 'CEO of Fonts',
			image: 'https://picsum.photos/seed/picsum2/200/200'
		},
		{
			name: 'Boss Baby',
			subtitle: 'Software Cracks Specialist',
			image: 'https://picsum.photos/seed/picsum3/200/200'
		},
		{
			name: 'Kowalski',
			subtitle: 'Strategy',
			image: 'https://picsum.photos/seed/picsum/200/200'
		},
		{
			name: 'Jason Bourne',
			subtitle: 'Literal Secret Agent',
			image: 'https://picsum.photos/seed/vibes/200/200'
		},
		{
			name: 'Gecko One',
			subtitle: 'Vibe Checker',
			image: 'https://picsum.photos/seed/ryan/200/200'
		},
		{
			name: 'Big Hoss',
			subtitle: 'Check Viber',
			image: 'https://picsum.photos/seed/scheyer/200/200'
		}
	];

	export let callout: string = 'Overview';

	let open = false;
	let condensed = false;

	let listElement: HTMLDivElement;
	let wrapperElement: HTMLDivElement;
	let previewElement: HTMLDivElement;
	let previewPhotos: HTMLDivElement;

	$: previewNum = setPreviewNum(open, userList);

	$: open, handleOpen();

	function setPreviewNum(menuOpen: boolean, list: Array<any>) {
		let max;
		!menuOpen ? (max = 3) : (max = userList.length);
		return max;
	}

	let pWidth = 0;

	function handleOpen() {
		if (open) {
			condensed = false;
			listElement.style.height = 288 + 'px';
			previewElement.style.transform = `translate3d(-${pWidth}px, 0px, 0px)`;
			previewPhotos.style.opacity = '0';
			listElement.style.opacity = '1';
		} else {
			if (listElement) {
				previewElement.style.transform = `translate3d(0px, 0px, 0px)`;
				listElement.style.height = '0px';
				previewPhotos.style.opacity = '1';
				listElement.style.opacity = '0';
			}
		}
	}

	var lastScrollTop = 0;

	onMount(() => {
		pWidth = previewPhotos.offsetWidth;
		window.addEventListener('scroll', function () {
			var st = window.pageYOffset || document.documentElement.scrollTop;
			if (st > lastScrollTop) {
				// downscroll code
				console.log('down');
				condensed = true;
			} else if (st < lastScrollTop) {
				// upscroll code
				console.log('up');
				condensed = false;
			}
			lastScrollTop = st <= 0 ? 0 : st;
		});
	});
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
	class="bg-black bg-opacity-90 p-0 overflow-hidden relative max-w-[300px] sm:max-w-[325px] w-full ease-smooth duration-800 {open
		? 'rounded-3xl'
		: 'rounded-[40px]'}"
>
	<div
		class="relative p-3"
		on:click={() => {
			open = !open;
		}}
		on:mouseenter={() => {
			condensed = false;
		}}
		on:mouseleave={() => {
			condensed = true;
		}}
	>
		<div
			class="ease-smooth duration-800 w-full min-w-[300px] flex items-center overflow-hidden"
			bind:this={previewElement}
		>
			<div
				class="flex overflow-hidden w-fit pr-4 ease-smooth duration-300"
				bind:this={previewPhotos}
			>
				{#each userList.slice(0, 3) as user, i}
					<div
						style="z-index: {50 - i};"
						class="relative overflow-hidden {condensed && !open
							? 'w-6 h-6 -mr-2'
							: 'w-12 h-12 -mr-4'}  ease-smooth duration-700 rounded-full bg-neutral-600"
					>
						<Image src={user.image} />
					</div>
				{/each}
				<div
					class="mr-0 {condensed && !open
						? 'w-6 h-6'
						: 'w-12 h-12'} ease-smooth duration-700 rounded-full bg-neutral-600"
				>
					<div class=" {condensed && !open ? 'p-1.5' : 'p-3'} ease-smooth duration-700 invert">
						<Icon icon="open" />
					</div>
				</div>
			</div>
			<div class="pr-4 text-white leading-5 select-none">
				<p class="opacity-95">{callout}</p>
				<p
					class="{condensed && !open ? 'h-0 opacity-0' : 'h-5 opacity-30'} ease-smooth duration-700"
				>
					{userList.length} sections
				</p>
			</div>
		</div>
		<div
			class="{open
				? 'pointer-events-auto opacity-50 translate-x-0'
				: 'opacity-0 pointer-events-none translate-x-24'} transform-gpu ease-smooth duration-800 absolute top-3 right-3 h-12 w-12 p-3 bg-white rounded-full hover:opacity-90"
		>
			<Icon icon="x" />
		</div>
	</div>

	<div
		class="{open
			? 'overflow-y-scroll'
			: 'overflow-hidden'} transform-gpu ease-smooth duration-800 flex flex-col relative h-0 px-3 max-h-72"
		bind:this={listElement}
	>
		<div class="relative pt-0 flex flex-col gap-0" bind:this={wrapperElement}>
			{#each userList as user}
				<div
					class="transition-all ease-smooth duration-500 hover:bg-opacity-20 flex text-white items-center gap-3 p-2 bg-white bg-opacity-0 rounded-md"
				>
					<div class="w-12 h-12 rounded-full overflow-hidden">
						<Image src={user.image} alt="" />
					</div>
					<div class="flex flex-col">
						<p class="opacity-90">{user.name}</p>
						<p class="text-sm opacity-30">{user.subtitle}</p>
					</div>
				</div>
			{/each}
			<div class="flex flex-col w-full items-center gap-2 text-white opacity-75 text-xs pt-2 pb-4">
				<p>That's all for now!</p>
				<button
					class="border w-fit rounded px-2 hover:bg-white hover:text-black ease-smooth duration-200"
				>
					Refresh
				</button>
			</div>
		</div>
	</div>
</div>
