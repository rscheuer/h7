<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { fade, fly } from 'svelte/transition';
	let visible = false;

	let highlight: HTMLDivElement;

	let selectedIndex: number = 0;
	let queryString: string = '';
	let queryInput: HTMLInputElement;
	let commandDivs: HTMLDivElement[] = [];
	let showHighlight = true;

	let commands = [
		{
			name: 'Go Home',
			action: function () {
				goto('/');
				closePalette();
			},
			keycode: 'H'
		},
		{
			name: 'Copy URL',
			action: function () {
				copyURL();
			},
			keycode: 'U'
		},
		{
			name: 'Go to Nav',
			action: function () {
				goto('/nav');
				closePalette();
			},
			keycode: 'N'
		},
		{
			name: 'Go to Button',
			action: function () {
				goto('/button');
				closePalette();
			},
			keycode: 'B'
		},
		{
			name: 'Go to Cards',
			action: function () {
				goto('/cards');
				closePalette();
			},
			keycode: 'CA'
		},
		{
			name: 'Go to Users',
			action: function () {
				goto('/users');
				closePalette();
			},
			keycode: 'US'
		},
		{
			name: 'Go to Airport Nav',
			action: function () {
				goto('/airport-nav');
				closePalette();
			},
			keycode: 'AI'
		}
	];

	let filteredCommands = commands;
	$: queryString, (filteredCommands = filterCommands());

	function copyURL() {
		// console.log('COPYING URL', $page.url.href);
		navigator.clipboard.writeText($page.url.href);
		closePalette();
	}

	function handleClick(cmd: any) {
		// console.log('CLICKED');
		if (cmd.action) {
			cmd.action();
		}
	}

	function filterCommands() {
		const results = commands.filter((obj) => {
			return obj.name.toLowerCase().includes(queryString.toLowerCase());
		});
		if (results.length) {
			showHighlight = true;
			selectedIndex = 0;
			setHighlight();
		} else {
			showHighlight = false;
		}
		// setHighlight();
		return results;
	}

	function handleMouseover(e: any) {
		selectedIndex = e.currentTarget.dataset.index;
		// console.log(selectedIndex);
		highlight.style.top = e.currentTarget.offsetTop + 'px';
		highlight.style.height = e.currentTarget.offsetHeight + 'px';
	}

	function setHighlight() {
		if (commandDivs[0]) {
			highlight.style.top = commandDivs[0].offsetTop + 'px';
			highlight.style.height = commandDivs[0].offsetHeight + 'px';
		}
	}

	function openPalette() {
		visible = true;
		// console.log('COMMAND PALETTE');
		setTimeout(() => {
			queryInput.focus();
			setHighlight();
		}, 50);
	}
	function closePalette() {
		visible = false;
		queryString = '';
		selectedIndex = 0;
	}

	function onKeyDown(e: any) {
		var pressed = '';
		// console.log(e.keyCode);
		pressed += e.keyCode;
		if (e.keyCode == 27) {
			// console.log('ESCAPE');
			closePalette();
		}
		if (e.keyCode == 13) {
			handleClick(filteredCommands[selectedIndex]);
		}
		if (e.shiftKey) {
			// Shift Key is pressed
			if (e.keyCode != 16) pressed += ' + Shift';
		} else if (e.metaKey) {
			// Command Key is Pressed
			if (e.keyCode != '91') {
				pressed += ' + Ctrl';
				if (e.keyCode == 75) {
					openPalette();
				}
			}
		}
	}

	function handleClose(e: any) {
		if (e.target !== e.currentTarget) return;
		//
		closePalette();
	}
</script>

<svelte:window on:keydown={onKeyDown} />

{#if visible}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div
		on:click={(e) => handleClose(e)}
		class="cp"
		in:fade={{ duration: 150 }}
		out:fade={{ duration: 150 }}
	>
		<div in:fly={{ y: 50, duration: 150, delay: 50 }} class="cp--window">
			<input
				class="cp--input"
				bind:this={queryInput}
				bind:value={queryString}
				type="text"
				placeholder="Type here..."
			/>
			<div class="cp--commands">
				<div class="cp--commands-wrapper">
					{#each filteredCommands as command, index}
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<div
							bind:this={commandDivs[index]}
							data-index={index}
							class="cp--command"
							class:selected={index == selectedIndex}
							on:click={() => {
								handleClick(command);
							}}
							on:mouseenter={handleMouseover}
						>
							<span>
								{command.name}
							</span>
							<div class="cp--command--shortcut">
								{command.keycode}
							</div>
						</div>
					{/each}
					{#if !filteredCommands.length}
						<div class="cp--command" on:mouseenter={handleMouseover}>
							<span> No commands found </span>
							<div class="cp--command--shortcut">:(</div>
						</div>
					{/if}
				</div>
				<div class:show={showHighlight} bind:this={highlight} class="highlight" />
			</div>
		</div>
	</div>
{/if}

<style lang="postcss">
	.cp {
		@apply fixed w-full h-full top-0 left-0 z-[999];
		@apply grid place-items-start bg-black bg-opacity-30 pt-[15%];

		&--window {
			@apply bg-white max-w-md mx-auto w-full p-3 rounded-xl border;
			@apply drop-shadow-lg;
		}

		&--input {
			@apply w-full outline-none pb-2 border-b;
		}
		&--commands {
			@apply pt-2 relative;
		}

		&--command {
			@apply w-full select-none py-2.5 px-2.5;
			@apply opacity-50 transition-all flex justify-between;

			&--shortcut {
				@apply bg-neutral-300 px-1.5 rounded;
			}

			&.selected {
				@apply opacity-100;
			}
		}

		.highlight {
			@apply absolute w-full bg-neutral-400 rounded opacity-0 pointer-events-none;
			transition: all 0.15s ease;

			&.show {
				@apply opacity-25;
			}
		}
	}
</style>
