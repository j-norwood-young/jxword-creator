<script>
	// Svelte stuff
	import { onMount, tick } from "svelte";
	import { questionsAcross, questionsDown, currentDirection } from "./stores.js";
	import { parseCrosswordXML } from "./libs/crossword_xml_parse.js";
	
	// Components
	import Menu from "./Menu.svelte";
	import Grid from "./Grid.svelte";
	import Instructions from "./Instructions.svelte";
	import SizeSlider from "./SizeSlider.svelte";
	// import Symmetry from "./Symmetry.svelte";
	import Print from "./Print.svelte";
	import FileUpload from "./FileUpload.svelte";
	import Patterns from "./Patterns.svelte";
	
	// Libraries
	import { saveState, restoreState, clearState } from './savestate';
	import { XDEncode } from "./xd-encode.js";
	import XDParser from "xd-crossword-parser";

	export let difficulties = [
		"Easy", "Medium", "Hard", "Evil" 
	];

	export let types = [
		"Straight", "Quick", "Cryptic"
	];
	
	// export let selected_size = sizes[0];

	// Exposed properties
	export const save_state = true;
	export let xd;
	export let grid = [...Array(15)].map(e => Array(15));
	export let title;
	export let author;
	export let editor;
	export let copyright;
	export let date;
	export let difficulty;
	export let type;
	export let displayXd = true;
	export let symmetry = true;
	export let download_filename = "crossword.xd";

	// Private properties
	// let symmetry_id = $symmetries.findIndex(s => s.default);

	// State
	let gridComponent;
	let gridComponentContainer;
	let size = grid.length;
	let state = {
		grid,
		size,
		current_x: 0,
		current_y: 0,
		direction: "across",
		questions_across: $questionsAcross,
		questions_down: $questionsDown,
		// symmetry_id,
	}

	let getState = () => {
		if (!gridComponent) return; // We haven't loaded the grid yet
		let { x: current_x, y: current_y } = gridComponent.getCurrentPos();
		return {
			grid,
			size,
			current_x,
			current_y,
			direction: $currentDirection,
			questions_across: $questionsAcross,
			questions_down: $questionsDown,
			title,
			author,
			editor,
			copyright,
			difficulty,
			type,
			date,
			// symmetry_id,
		}
	};

	function handleMove(event) {
		const direction = event.detail;
		let newDir;
		if (direction === "down" || direction === "up") {
			newDir = "down";
		}
		if (direction === "left" || direction === "right") {
			newDir = "across";
		}
		if (newDir !== $currentDirection) {
			gridComponent.setDir(newDir);
		} else {
			gridComponent.handleArrowkey(direction);
		}
	}

	function handleLetter(event) {
		event.preventDefault();
		const letter = event.detail;
		if (letter === " ") {
			gridComponent.toggleDir();
			return;
		}
		let {x, y} = gridComponent.getCurrentPos();
		grid[y][x] = letter;
		if (symmetry) {
			if (letter === "#") {
				grid[size - y - 1][size - x - 1] = "#";
			}
		}
		if ($currentDirection === "across") {
			gridComponent.moveRight();
		} else {
			gridComponent.moveDown();
		}
	}

	function handleEnter(event) {
		let {x, y} = gridComponent.getCurrentPos();
		let selected_question;
		let questions = $currentDirection === "across" ? $questionsAcross : $questionsDown;
		if ($currentDirection === "across") {
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
		event.preventDefault();
		let {x, y} = gridComponent.getCurrentPos();
		const letter = grid[y][x];
		if (symmetry && letter === "#") {
			grid[size - y - 1][size - x - 1] = "";
		}
		grid[y][x] = "";
		if ($currentDirection === "across") {
			gridComponent.moveLeft();
		} else {
			gridComponent.moveUp();
		}
	}

	function handleTab(e) {
		const dir = e.detail;
		if (dir === "prev-word") {
			gridComponent.movePrevWord();
		} else if (dir === "next-word") {
			gridComponent.moveNextWord();
		}
	}

	async function handleStateChange() {
		if (!save_state) return;
		saveState(getState());
		xd = XDEncode(getState());
		gridComponent.handleFocus();
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
			copyright = state.copyright;
			date = state.date;
			title = state.title;
			difficulty = state.difficulty;
			type = state.type;
			questionsAcross.set(state.questions_across);
			questionsDown.set(state.questions_down);
			gridComponent.setDir(state.direction);
			gridComponent.setCurrentPos(state.current_x, state.current_y);
			// symmetry_id = state.symmetry_id;
		}
		console.log(grid);
	});
	
	function handleReset() {
		clearState();
		size = 15;
		gridComponent.setDir("across");
		gridComponent.setCurrentPos(0, 0);
		title = "";
		author = "";
		editor = "";
		copyright = "";
		date = "";
		difficulty = "Medium";
		type = "Straight";
		grid = [...Array(15)].map(e => Array(15));;
		questionsAcross.set([]);
		clearState();
		questionsDown.set([]);
		clearState();
		xd = "";
		clearState();
	}

	async function loadXd(xd) {
		const data= XDParser(xd);
		grid = data.grid;
		size = data.grid.length;
		author = data.meta.Author;
		editor = data.meta.Editor;
		copyright = data.meta.Copyright;
		date = data.meta.Date;
		title = data.meta.Title;
		difficulty = data.meta.Difficulty;
		type = data.meta.Type;
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

	async function loadXML(xml) {
		console.log("loading xml")
		try {
			const result = parseCrosswordXML(xml);
			title = result.title;
			author = result.creator;
			editor = result.editor;
			copyright = result.copyright;
			size = result.width;
			grid = result.grid;
			console.log(result);
			questionsAcross.set(result.questions.across);
			questionsDown.set(result.questions.down);
			gridComponent.setDir("across");
			gridComponent.setCurrentPos(0, 0);
			await tick();
		} catch (e) {
			console.log(e);
		}
	}

	let instructionsVisible;
	function handleInstructions() {
		instructionsVisible = true;
	}

	function downloadXD() {
		// Download contents of xd
		const file = new Blob([xd], {type: "text/plain;charset=utf-8"});
		const downloadLink = document.createElement("a");
		downloadLink.download = download_filename || "crossword.xd";
		downloadLink.href = URL.createObjectURL(file);
		downloadLink.click();
	}

	function handleXDUpload(msg) {
		loadXd(msg.detail.content);
		download_filename = msg.detail.filename;
	}

	function handleXMLUpload(msg) {
		loadXML(msg.detail.content);
		download_filename = msg.detail.filename.replace(".xml", ".xd");
	}

</script>

<main>
	<Instructions bind:visible="{ instructionsVisible }" />
	<div class="jxword-form-container">
		<div id="jxword-top">
			<div id="jxword-meta">
				<input id="jxword-title" class="jxword-title" name="title" type="text" bind:value={title} on:change="{handleStateChange}" placeholder="Title" />
				<SizeSlider bind:size="{size}" on:change="{handleStateChange}" />
				<div>
					<label for="difficulty">Difficulty</label>
					<select id="jxword-difficulty" name="difficulty" bind:value="{difficulty}" on:change="{handleStateChange}" >
						{#each difficulties as difficulty_option}
							<option value="{difficulty_option}">{difficulty_option}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="type">Type</label>
					<select id="jxword-type" name="type" bind:value="{type}" on:change="{handleStateChange}">
						{#each types as type_option}
							<option value="{type_option}">{type_option}</option>
						{/each}
					</select>
				</div>
				<input id="jxword-date" name="date" type="date" bind:value={date} on:change="{handleStateChange}" placeholder="Publish Date" />
				<input id="jxword-author" name="author" type="text" bind:value={author} on:change="{handleStateChange}" placeholder="Author" />
				<input id="jxword-editor" name="editor" type="text" bind:value={editor} on:change="{handleStateChange}" placeholder="Editor" />
				<input id="jxword-copyright" name="copyright" type="text" bind:value={copyright} on:change="{handleStateChange}" placeholder="Copyright" />
			</div>
			<div id="jxword-options">
				<Patterns size="{size}" bind:grid="{grid}" />
				<div class="jxword-checkbox-group">
					<input type="checkbox" name="symmetry" bind:checked={symmetry}>
					<label for="symmetry">Symmetry</label>
				</div>
				<Print bind:state={state} />
				<div>
					<label for="file">Upload XD file</label>
					<FileUpload on:upload="{ handleXDUpload }" />
				</div>
				<div>
					<label for="file">Upload XML file</label>
					<FileUpload file_formats=".xml" on:upload="{ handleXMLUpload }" />
				</div>
				<div>
					<label for="download">Download</label>
					<input type="text" name="download" bind:value="{download_filename}" />
					<button on:click="{ downloadXD }">Download Crossword</button>
				</div>
			</div>
		</div>
		<div class="jxword-container" >
			<div class="jxword-header">
				<Menu on:reset="{ handleReset }" on:instructions="{ handleInstructions }" />
			</div>
			<Grid size={size} grid={grid} bind:this={gridComponent} bind:Container={gridComponentContainer} on:change={handleStateChange} on:move={handleMove} on:letter={handleLetter} on:backspace={handleBackspace} on:enter={handleEnter} on:tab={handleTab} />
		</div>
		
		<textarea id="xd" name="xd" class="jxword-xd-textarea" bind:value="{xd}" style:display="{displayXd ? 'block' : 'none'}" />
	</div>
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

	.jxword-form-container {
		display: flex;
		flex-direction: column;
		align-items: left;
		justify-content: left;
		margin-top: 1em;

		label {
			display: block;
			margin-bottom: 0.3em;
		}

		input, select {
			display: block;
			margin-bottom: 1em;
			max-width: 400px;
			border: none;
			border-bottom: 1px solid #ccc;
		}

		input.jxword-title {
			font-size: 1.5em;
			font-weight: bold;
		}
	}

	.jxword-container {
		margin-top: 15px;
		margin-bottom: 25px;
		min-width: 1024px;
	}

	#jxword-top {
		display: flex;
		flex-direction: row;
		align-items: left;
		justify-content: left;
	}

	#jxword-options {
		margin-left: 40px;
		padding-left: 40px;
		border-left: 1px solid #ccc;
		display: flex;
		flex-direction: column;
	}
	
	.jxword-checkbox-group {
		display: flex;
		flex-direction: row;
		align-items: left;
		justify-content: left;
		input {
			margin-right: 0.5em;
		}
	}
</style>