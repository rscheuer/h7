<script lang="ts">
	import { onMount } from 'svelte';

	// // const slider = document.querySelector('.wrapper');
	// const preventClick = (e: any) => {
	// 	e.preventDefault();
	// 	e.stopImmediatePropagation();
	// };
	// let isDown = false;
	// var isDragged = false;
	// let startX;
	// let scrollLeft;
	// let velocity = 0;

	// $: console.log('isDown', isDown);

	let slider: HTMLDivElement;
	onMount(() => {
		// slider.addEventListener('mousedown', (e) => {
		// 	onMouseDown(e);
		// });

		// slider.addEventListener('mouseleave', (e) => {
		// 	onMouseLeave(e);
		// });

		// slider.addEventListener('mouseup', (e) => {
		// 	onMouseUp(e);
		// });

		// slider.addEventListener('mousemove', (e) => {
		// 	onMouseMove(e);
		// });

		// const slider = document.querySelector('.wrapper');
		const preventClick = (e) => {
			e.preventDefault();
			e.stopImmediatePropagation();
		};
		let isDown = false;
		var isDragged = false;
		let startX: any;
		let scrollLeft: any;
		let velocity = 0;

		slider.addEventListener('mousedown', (e) => {
			console.log('mousedown');
			velocity = 0; // Cancel previous velocity
			isDown = true;
			slider.classList.add('active');
			startX = e.pageX - slider.offsetLeft;
			scrollLeft = slider.scrollLeft;
		});

		slider.addEventListener('mouseleave', () => {
			isDown = false;
			slider.classList.remove('active');
		});

		slider.addEventListener('mouseup', (e) => {
			isDown = false;
			const elements = document.getElementsByClassName('book');
			if (isDragged) {
				for (let i = 0; i < elements.length; i++) {
					elements[i].addEventListener('click', preventClick);
				}
			} else {
				for (let i = 0; i < elements.length; i++) {
					elements[i].removeEventListener('click', preventClick);
				}
			}
			slider.classList.remove('active');
			isDragged = false;
			requestAnimationFrame(smooth);
		});

		slider.addEventListener('mousemove', (e) => {
			console.log('mousemove');
			if (!isDown) return;
			isDragged = true;
			e.preventDefault();
			let lastX = slider.scrollLeft;
			const x = e.pageX - slider.offsetLeft;
			const walk = (x - startX) * 2;
			slider.scrollLeft = scrollLeft - walk;

			velocity = lastX - slider.scrollLeft;
		});

		// document.getElementsByClassName('book').ondragstart = function () {
		// 	console.log('Drag start');
		// };

		function smooth() {
			if (Math.abs(velocity) > 0) {
				// Change the 2s here to change how quickly the scrolling stops
				if (Math.abs(velocity) < 2) {
					velocity = 0;
				}
				if (velocity > 0) {
					velocity -= 2;
				} else {
					velocity += 2;
				}
				slider.scrollLeft -= velocity;
				requestAnimationFrame(smooth);
			}
		}
	});
</script>

<div bind:this={slider} class="wrapper">
	<div class="book one" />
	<div class="book two" />
	<div class="book three" />
	<div class="book four" />
	<div class="book five" />
	<div class="book six" />
</div>

<style lang="postcss">
	.wrapper {
		position: relative;
		display: -webkit-box;
		display: -webkit-flex;
		display: -ms-flexbox;
		display: flex;
		overflow-x: scroll;
		min-width: 100%;
		height: 100%;
	}

	.book {
		width: auto;
		height: 100%;
		min-width: 50vw;
	}

	.one {
		background-color: #d07fe0;
	}

	.two {
		background-color: #808888;
	}

	.three {
		background-color: #83e7dc;
	}

	.four {
		background-color: #edf7a8;
	}

	.five {
		background-color: #e9d98f;
	}

	.six {
		background-color: #fdd;
	}
</style>
