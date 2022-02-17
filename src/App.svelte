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
		const currentDir = grid.getDir();
		let newDir;
		if (direction === "down" || direction === "up") {
			newDir = "down";
		}
		if (direction === "left" || direction === "right") {
			newDir = "across";
		}
		if (newDir !== currentDir) {
			grid.setDir(newDir);
		} else {
			grid.handleMove(direction);
		}
	}

	function handleLetter(event) {
		const letter = event.detail;
		let {x, y} = grid.getCurrentPos();
		sample_grid[y][x] = letter;
		if (grid.getDir() === "across") {
			grid.moveRight();
		} else {
			grid.moveDown();
		}
	}

	function handleBackspace(event) {
		let {x, y} = grid.getCurrentPos();
		sample_grid[y][x] = "";
		grid.moveLeft();
	}


</script>

<main>
	<input type="number" id="size" placeholder="size" default="5" min="1" bind:value={size}>
	<div class="jxword-container" >
		<div class="jxword-header">
			<Menu />
		</div>
		<Grid size={size} grid={sample_grid} bind:this={grid} />
		
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
</style>