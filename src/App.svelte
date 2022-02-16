<script>
	import Keyboard from "./Keyboard.svelte";
	import Menu from "./Menu.svelte";
	import Grid from "./Grid.svelte";
	let size = 10;
	let grid;
	let sample_grid = [
		[
			"A", "B", "C", "D", "E", "F", "G", "H", "I", "J"
		],
		[
			"A", "B", "C", "D", "E", "F", "G", "H", "I", "J"
		],
		[
			"A", "B", "C", "D", "E", "F", "G", "H", "I", "J"
		],
		[
			"A", "B", "C", "D", "E", "F", "G", "H", "I", "J"
		],
		[
			"A", "B", "C", "D", "E", "F", "G", "H", "I", "J"
		],
		[
			"A", "B", "C", "D", "E", "F", "G", "H", "I", "J"
		],
		[
			"A", "B", "C", "D", "E", "F", "G", "H", "I", "J"
		],
		[
			"A", "B", "C", "D", "E", "F", "G", "H", "I", "J"
		],
		[
			"A", "B", "C", "D", "E", "F", "G", "H", "I", "J"
		],
		[
			"A", "B", "C", "D", "E", "F", "G", "H", "I", "J"
		],
	]

	function handleMove(event) {
		const direction = event.detail;
		grid.handleMove(direction);
	}

	function handleLetter(event) {
		const letter = event.detail;
		let {row, col} = grid.getCurrentPos();
		sample_grid[row][col] = letter;
		grid.moveRight();
	}

	function handleBackspace(event) {
		let {row, col} = grid.getCurrentPos();
		sample_grid[row][col] = "";
		grid.moveLeft();
	}


</script>

<main>
	<input type="number" id="size" placeholder="size" default="5" min="1" bind:value={size}>
	<div class="jxword-container" >
		<div class="jxword-header">
			<Menu />
		</div>
		<div class="jxword-svg-container">
			<Grid size={size} grid={sample_grid} bind:this={grid} />
		</div>
		<Keyboard on:move={handleMove} on:letter={handleLetter} on:backspace={handleBackspace} />
	</div>
</main>

<style lang="scss">
	main {
		text-align: center;
		padding: 1em;
		max-width: none;
		margin: 0 auto;
	}

	@media (min-width: 1024px) {
		main {
			max-width: 1024px;
		}
	}

	.jxword-svg-container {
        width: 50%; 
        height: 100%;
        touch-action: none;
        user-select: none;
	}
</style>