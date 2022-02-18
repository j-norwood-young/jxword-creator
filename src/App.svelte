<script>
	import Keyboard from "./Keyboard.svelte";
	import Menu from "./Menu.svelte";
	import Grid from "./Grid.svelte";
	import { saveState, restoreState } from './savestate';
	import { onMount } from "svelte";
	import { questionsAcross, questionsDown } from "./stores.js";
	import { XDEncode } from "./xd-encode.js";

	let size = 10;
	let grid;
	let title;
	let author;
	let editor;
	let date;
	let xd;
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

	let state = {
		grid: sample_grid,
		size,
		current_x: 0,
		current_y: 0,
		direction: "across"
	}

	let getState = () => {
		let { x: current_x, y: current_y } = grid.getCurrentPos();
		let direction = grid.getDir();
		return {
			grid: sample_grid,
			size,
			current_x,
			current_y,
			direction,
			questions_across: $questionsAcross,
			questions_down: $questionsDown,
			title,
			author,
			editor,
			date
		}
	};

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

	function handleEnter(event) {
		let {x, y} = grid.getCurrentPos();
		let current_direction = grid.getDir();
		let selected_question;
		let questions = current_direction === "across" ? $questionsAcross : $questionsDown;
		if (current_direction === "across") {
			selected_question = questions.find(q => y === q.y && x >= q.x && x <= q.x + q.answer.length - 1);
			if (selected_question) {
				selected_question.editing = true;
				$questionsAcross = questions;
			}
		} else {
			selected_question = questions.find(q => x === q.x && y >= q.y && y <= q.y + q.answer.length - 1);
			if (selected_question) {
				selected_question.editing = true;
				$questionsDown = questions;
			}
		}
	}

	function handleBackspace(event) {
		let {x, y} = grid.getCurrentPos();
		sample_grid[y][x] = "";
		grid.moveLeft();
	}

	function handleStateChange() {
		saveState(getState());
		xd = XDEncode(getState());
	}

	onMount(() => {
		state = restoreState();
		sample_grid = state.grid;
		size = state.size;
		author = state.author;
		editor = state.editor;
		date = state.date;
		title = state.title;
		questionsAcross.set(state.questions_across);
		questionsDown.set(state.questions_down);
		grid.setDir(state.direction);
		grid.setCurrentPos(state.current_x, state.current_y);
	});
	

</script>

<main>
	<label for="title">Title</label>
	<input id="title" type="text" bind:value={title} on:change="{handleStateChange}" />
	<label for="author">Author</label>
	<input id="author" type="text" bind:value={author} on:change="{handleStateChange}" />
	<label for="editor">Editor</label>
	<input id="editor" type="text" bind:value={editor} on:change="{handleStateChange}" />
	<label for="date">Date</label>
	<input id="date" type="date" bind:value={date} on:change="{handleStateChange}" />
	<label for="size">Size</label>
	<input type="number" id="size" placeholder="size" default="5" min="1" bind:value={size}>
	<div class="jxword-container" >
		<div class="jxword-header">
			<Menu />
		</div>
		<Grid size={size} grid={sample_grid} bind:this={grid} on:change={handleStateChange} on:move={handleMove} on:letter={handleLetter} on:backspace={handleBackspace} on:enter={handleEnter} />
		
		<Keyboard  />
	</div>
	<textarea class="jxword-xd-textarea" bind:value="{xd}" />
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

	.jxword-xd-textarea {
		width: 100%;
		height: 600px;
		border: 1px solid #ccc;
		padding: 1em;
		margin-top: 1em;
	}
</style>