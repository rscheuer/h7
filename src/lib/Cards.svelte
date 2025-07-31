<script lang="ts">
	import { expoOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';

	type Card = {
		name: string;
		sub: string;
		body: string;
		color: string;
		id: number;
	};

	let cardData: Card[] = [
		{
			name: 'Ryan Scheuer',
			sub: 'Bomb ass subtitle',
			body: 'Deserunt Lorem amet labore ipsum reprehenderit ut. Lorem ea in eiusmod mollit consequat deserunt laborum tempor amet qui irure ut proident nostrud. Deserunt sint ad occaecat consectetur. Irure et excepteur esse proident dolor voluptate commodo amet sit.',
			color: 'red',
			id: 0
		},
		{
			name: 'Spiritual Engineering',
			sub: 'Coding 4 life',
			body: 'Enim aliquip aliquip qui irure. Velit veniam occaecat consectetur deserunt sunt elit est sunt mollit proident esse laboris ea. Voluptate magna sit aute minim labore officia dolor proident magna pariatur officia eiusmod non. Id consectetur esse dolore amet officia. Ut incididunt nulla laborum Lorem.',
			color: 'yellow',
			id: 1
		},
		{
			name: 'Yerrr ',
			sub: 'Cupidatat ex commodo quis cupidatat irure eiusmod ex incididunt magna.',
			body: 'Duis dolore labore culpa quis ex sit consectetur dolore quis non ea enim pariatur minim. Dolor irure ut ad voluptate consequat. Aliqua elit anim tempor amet mollit. Nisi veniam id sint occaecat proident eiusmod dolor. Ea consequat sint velit commodo. Elit in labore sunt culpa laboris sit consectetur.',
			color: 'AliceBlue',
			id: 2
		},
		{
			name: 'Weee',
			sub: 'Cupidatat ex commodo quis cupidatat irure eiusmod ex incididunt magna.',
			body: 'Lorem dolore et nisi qui commodo ut aliquip commodo deserunt commodo ad id. Laboris qui cupidatat est do irure laborum officia voluptate consequat deserunt. Irure duis veniam Lorem exercitation pariatur veniam velit minim in irure cillum aliqua. Occaecat qui non fugiat aliqua minim quis amet laborum sit elit ad duis do reprehenderit. Deserunt dolore fugiat aliqua esse ipsum eiusmod. Ea aliquip duis minim adipisicing dolore eu veniam et eu duis nulla. Officia incididunt ad dolore in duis.',
			color: 'BlueViolet',
			id: 3
		},
		{
			name: 'Wooo',
			sub: 'Cupidatat ex commodo quis cupidatat irure eiusmod ex incididunt magna.',
			body: 'Enim aliquip aliquip qui irure. Velit veniam occaecat consectetur deserunt sunt elit est sunt mollit proident esse laboris ea. Voluptate magna sit aute minim labore officia dolor proident magna pariatur officia eiusmod non. Id consectetur esse dolore amet officia. Ut incididunt nulla laborum Lorem.',
			color: 'CadetBlue',
			id: 4
		},
		{
			name: 'The End',
			sub: 'Cupidatat ex commodo quis cupidatat irure eiusmod ex incididunt magna.',
			body: 'Ipsum incididunt sit commodo magna qui veniam minim. Minim sit irure non laborum tempor est aliqua Lorem ullamco consequat laborum ut commodo reprehenderit. Voluptate tempor in irure nisi occaecat laborum irure nulla ullamco adipisicing. Fugiat occaecat et mollit minim adipisicing labore dolor commodo. Magna mollit reprehenderit eu exercitation id cupidatat labore.',
			color: 'Coral',
			id: 5
		}
	];

	let numbersArray = [0, 1, 2, 3, 4, 5];

	let maxCards = 3;
	let maxStringLength = 100;
	let cards = cardData;
	$: cardStack = cards.slice(0, maxCards);
	$: numberStack = numbersArray.slice(0, maxCards);
	let currentIndex = 0;

	let cardDivs: HTMLDivElement[] = [];

	function next() {
		// cardDivs[0].remove();
		// shiftArrayToRight(cardDivs, 1);
		setTimeout(() => {
			// cards = shiftArrayToRight(cards, 1);
			// numbersArray = shiftArrayToRight(numbersArray, 1);
			cards = shiftArrayToLeft(cards, 1);
			numbersArray = shiftArrayToLeft(numbersArray, 1);
		}, 0);
	}

	function previous() {
		cards = shiftArrayToRight(cards, 1);
		numbersArray = shiftArrayToRight(numbersArray, 1);
	}

	function shiftArrayToRight(arr: any[], places: number) {
		for (var i = 0; i < places; i++) {
			arr.unshift(arr.pop());
		}
		return arr;
	}

	function shiftArrayToLeft(arr: any[], places: number) {
		// arr.concat(arr.splice(0, places)); // shift left by 2
		let first = arr.shift();
		arr.push(first);
		return arr;
	}
</script>

<!-- <div class="debug">
	<div class="numbers">
		{#each numbersArray as num, i}
			<span class:text-red-300={i <= 2}>{num}</span>
		{/each}
	</div>
</div> -->

<div class="cards">
	{#each cardStack as card, index (card.id)}
		{#key card.id}
			<!-- {#if numberStack.includes(card.id)} -->
			<div
				in:fly={{ y: 60, duration: 350 }}
				out:fly={{ y: -100, duration: 250 }}
				data-index={index}
				bind:this={cardDivs[index]}
				class="card i-{index + 1}"
				style="--color: {card.color}"
			>
				<div class="card--header">
					<div class="card--header-top">
						<div class="card--image" />
					</div>
					<div class="card--header-bottom">
						<p>{card.name}</p>
						<p class="card--sub">{card.sub}</p>
					</div>
				</div>
				<div class="card--body">
					<p>
						{card.body.substring(0, maxStringLength)}...
					</p>
				</div>
				<div class="card--footer">
					<button on:click={previous} class="prev">
						<svg
							width="38px"
							height="38px"
							stroke-width="1.5"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							color="#000000"
							><path
								d="M18.5 12H6m0 0l6-6m-6 6l6 6"
								stroke="#000000"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/></svg
						>
					</button>
					<button on:click={next} class="next">
						<svg
							width="38px"
							height="38px"
							stroke-width="1.5"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							color="#000000"
							><path
								d="M6 12h12.5m0 0l-6-6m6 6l-6 6"
								stroke="#000000"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/></svg
						>
					</button>
				</div>
			</div>
			<!-- {/if} -->
		{/key}
	{/each}
</div>

<style lang="postcss">
	.debug {
		@apply absolute top-0 left-0;

		.numbers {
			@apply flex gap-2;
		}
	}
	.cards {
		@apply bg-gray-600 w-full h-full bg-opacity-0;
		@apply pointer-events-none;
		@apply flex items-center justify-center relative;
	}
	.card {
		@apply bg-black w-full max-w-sm rounded-3xl absolute p-2;
		@apply pointer-events-auto;
		@apply backdrop-blur-sm pointer-events-none;
		@apply drop-shadow-md text-white;
		display: none;
		transition: all 0.7s cubic-bezier(0.215, 0.61, 0.355, 1);

		&.i-1 {
			/* @apply -translate-y-5 scale-95 -rotate-2 bg-white opacity-60; */
			@apply z-30 pointer-events-auto;
			display: block;
		}

		&.i-2 {
			@apply -translate-y-10 scale-90 -rotate-2 bg-opacity-60;
			@apply z-20 pointer-events-auto;
			display: block;
		}

		&.i-3 {
			@apply -translate-y-[75px] scale-[0.8] rotate-2 bg-opacity-60;
			@apply z-10 pointer-events-auto;
			display: block;
		}

		&--header {
			@apply flex flex-col gap-12;
		}

		&--image {
			@apply w-6 h-6 bg-neutral-800 rounded-full grid place-items-center;
			background-color: var(--color);
		}

		&--sub {
			@apply text-xs opacity-50;
		}

		&--body {
			@apply bg-neutral-900 p-4 text-center text-2xl mt-2 rounded-lg text-white text-opacity-75;
		}

		&--footer {
			@apply flex justify-center mt-2 gap-4;

			button {
				@apply bg-neutral-600  px-4 w-fit py-2 select-none;
				@apply transition-all rounded-full hover:bg-neutral-400;

				&:hover {
					svg {
						/* filter: invert(1); */
					}
				}

				&.prev {
				}

				&.next {
					@apply flex justify-end;
				}
			}
		}
	}
</style>
