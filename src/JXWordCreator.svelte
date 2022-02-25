<script>
	import Menu from "./Menu.svelte";
	import Grid from "./Grid.svelte";
	import Instructions from "./Instructions.svelte";
	import { saveState, restoreState, clearState } from './savestate';
	import { onMount, tick } from "svelte";
	import { questionsAcross, questionsDown } from "./stores.js";
	import { XDEncode } from "./xd-encode.js";
	import XDParser from "xd-crossword-parser";

	let gridComponent;
	let title;
	let author;
	let editor;
	let date;
	export const save_state = true;
	export let xd;
	export let grid = [...Array(10)].map(e => Array(10));

	let size = grid.length;

	let state = {
		grid,
		size,
		current_x: 0,
		current_y: 0,
		direction: "across",
		questions_across: $questionsAcross,
		questions_down: $questionsDown,
	}

	let getState = () => {
		let { x: current_x, y: current_y } = gridComponent.getCurrentPos();
		let direction = gridComponent.getDir();
		return {
			grid: grid,
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
		const currentDir = gridComponent.getDir();
		let newDir;
		if (direction === "down" || direction === "up") {
			newDir = "down";
		}
		if (direction === "left" || direction === "right") {
			newDir = "across";
		}
		if (newDir !== currentDir) {
			gridComponent.setDir(newDir);
		} else {
			gridComponent.handleMove(direction);
		}
	}

	function handleLetter(event) {
		const letter = event.detail;
		let {x, y} = gridComponent.getCurrentPos();
		grid[y][x] = letter;
		if (gridComponent.getDir() === "across") {
			gridComponent.moveRight();
		} else {
			gridComponent.moveDown();
		}
	}

	function handleEnter(event) {
		let {x, y} = gridComponent.getCurrentPos();
		let current_direction = gridComponent.getDir();
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
		let {x, y} = gridComponent.getCurrentPos();
		grid[y][x] = "";
		if (gridComponent.getDir() === "across") {
			gridComponent.moveLeft();
		} else {
			gridComponent.moveUp();
		}
	}

	function handleStateChange() {
		if (!save_state) return;
		saveState(getState());
		xd = XDEncode(getState());
	}

	onMount(() => {
		if (xd) {
			loadXd(xd);
		} else {
			if (save_state) {
				state = restoreState() || state;
			}
			grid = state.grid;
			size = state.size;
			author = state.author;
			editor = state.editor;
			date = state.date;
			title = state.title;
			questionsAcross.set(state.questions_across);
			questionsDown.set(state.questions_down);
			gridComponent.setDir(state.direction);
			gridComponent.setCurrentPos(state.current_x, state.current_y);
		}
	});
	
	function handleReset() {
		clearState();
		size = 10;
		gridComponent.setDir("across");
		gridComponent.setCurrentPos(0, 0);
		title = "";
		author = "";
		editor = "";
		date = "";
		grid = [...Array(10)].map(e => Array(10));;
		questionsAcross.set([]);
		clearState();
		questionsDown.set([]);
		clearState();
		xd = "";
		clearState();
	}

	async function loadXd(xd) {
		const data= XDParser(xd);
		console.log(data);
		grid = data.grid;
		size = data.grid.length;
		author = data.meta.Author;
		editor = data.meta.Editor;
		date = data.meta.Date;
		title = data.meta.Title;
		gridComponent.setDir("across");
		gridComponent.setCurrentPos(0, 0);
		await tick();
		let questions_across = $questionsAcross;
		for (let question of questions_across) {
			let matching_question = data.across.find(q => q.num === `A${question.num}`);
			// console.log(matching_question);
			if (matching_question) {
				question.question = matching_question.question;
			}
		}
		questionsAcross.set(questions_across);
		let questions_down = $questionsDown;
		for (let question of questions_down) {
			let matching_question = data.down.find(q => q.num === `D${question.num}`);
			// console.log(matching_question);
			if (matching_question) {
				question.question = matching_question.question;
			}
		}
		questionsDown.set(questions_down);
		handleStateChange();
	}

	let fileInput;
	function handleFileSelect() {
		const reader = new FileReader();
		reader.onload = (function() {
			return async function(e) {
				try {
					await loadXd(e.target.result);
				} catch(err) {
					console.error(err);
					throw "Unable to parse file";
				}
			};
		})(fileInput.files[0]);
		// Read in the image file as a data URL.
		reader.readAsText(fileInput.files[0]);
	}

</script>

<main>
	<Instructions />
	<label for="file">Upload an XD file (optional)</label>
	<input class="drop_zone" type="file" id="file" name="files" accept=".xd" bind:this={fileInput} on:change={handleFileSelect} />
	<label for="title">Title</label>
	<input id="title" name="title" type="text" bind:value={title} on:change="{handleStateChange}" />
	<label for="author">Author</label>
	<input id="author" name="author" type="text" bind:value={author} on:change="{handleStateChange}" />
	<label for="editor">Editor</label>
	<input id="editor" name="editor" type="text" bind:value={editor} on:change="{handleStateChange}" />
	<label for="date">Date</label>
	<input id="date" name="date" type="date" bind:value={date} on:change="{handleStateChange}" />
	<label for="size">Size</label>
	<input type="number" name="size" id="size" placeholder="size" default="5" min="1" bind:value={size}>
	<div class="jxword-container" >
		<div class="jxword-header">
			<Menu on:reset="{ handleReset }" />
		</div>
		<Grid size={size} grid={grid} bind:this={gridComponent} on:change={handleStateChange} on:move={handleMove} on:letter={handleLetter} on:backspace={handleBackspace} on:enter={handleEnter} />
	</div>
	<textarea id="xd" name="xd" class="jxword-xd-textarea" bind:value="{xd}" />
</main>

<style lang="scss">
	main {
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