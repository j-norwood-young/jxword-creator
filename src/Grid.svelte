<script>
    // Dispatcher
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    // Stores
    import { questionsAcross, questionsDown, currentDirection, currentQuestion } from "./stores.js";

    // Components
    import Questions from "./Questions.svelte";

    // Private properties
    let number_grid = [];
    let marked_word_grid = [];
    let restoreState = false;
    let fontSize;
    let numFontSize;
    let cellWidth;
    let cellHeight;
    let viewbox_width;
    let viewbox_height;
    export let Container;
    export let Input;

    // Public properties
    export let grid = [];
    export let size = 10;
    export let current_x = 0;
    export let current_y = 0;
    export let totalWidth = 500;
    export let totalHeight = 500;
    export let outerBorderWidth = 1.5;
    export let innerBorderWidth = 1;
    export let margin = 3;
    export let outerBorderColour = "black";
    export let innerBorderColour = "black";
    export let fillColour = "black";
    export let backgroundColour = "white";
    // export let selectCellColour = "#f7f457";
    // export let selectWordColour = "#9ce0fb";
    export const fontRatio = 0.7;
    export const numRatio = 0.33;
    
$: {
    if (size < 2) {
        size = 2;
    }
    if (size > 30) {
        size = 30;
    }
    viewbox_width = totalWidth + margin + outerBorderWidth;
    viewbox_height = totalHeight + margin + outerBorderWidth;
    cellWidth = totalWidth / size;
    cellHeight = totalHeight / size;
    fontSize = cellWidth * fontRatio;
    numFontSize = cellWidth * numRatio;
    let questions_across = [];
    let questions_down = [];
    let num = 1;
    // Grow grid if necessary
    if (grid.length - 1 < size) {
        for (let i = 0; i < size; i++) {
            grid[i] = grid[i] || Array(size).map(() => " ");
            number_grid[i] = number_grid[i] || Array(size).map(() => " ");
        }
    }
    // Shrink grid if necessary
    while (grid.length > size) {
        for (let i = 0; i < grid.length; i++) {
            while(grid[i].length > size) {
                grid[i].pop();
                number_grid[i].pop();
            }
        }
        grid.pop();
        number_grid.pop();
    }
    // Make sure we're still in the grid
    if (current_x >= size) {
        current_x = size - 1;
    }
    if (current_y >= size) {
        current_y = size - 1;
    }
    for (let y = 0; y < size; y++) {
        if (!number_grid[y]) {
            number_grid[y] = Array(size);
        }
        for (let x = 0; x < size; x++) {
            grid[y][x] = grid[y][x] || " ";
            if (grid[y][x] === "#") continue;
            let found = false;
            if (isStartOfAcross(x, y)) {
                questions_across.push(getQuestion(num, x, y, "across", ""));
                found = true;
            } 
            if (isStartOfDown(x, y)) {
                questions_down.push(getQuestion(num, x, y, "down", ""));
                found = true;
            } 
            if (!found) {
                number_grid[y][x] = null;
            } else {
                number_grid[y][x] = num++;
            }
        }
    }
    // questions_across.sort();
    // questions_down.sort();
    questionsAcross.set(questions_across);
    questionsDown.set(questions_down);
    // Find the current question
    const current_question = getCurrentQuestion();
    // console.log(current_question);
    currentQuestion.set(current_question);
    drawMarkedWordGrid();
}

export function selectCell(e) {
    current_x = e.srcElement.getAttribute("data-col");
    current_y = e.srcElement.getAttribute("data-row");
    drawMarkedWordGrid();
    dispatch("change");
}

function isStartOfAcross(x, y) {
    if (grid[y][x] === "#") return false;
    if (x >= size) return false;
    let word = getWord(x, y, "across");
    if (word.length <= 1) return false;
    return ((x === 0) || (grid[y][x - 1] == "#"));
}

function isStartOfDown(x, y) {
    if (grid[y][x] === "#") return false;
    if (y >= size) return false;
    let word = getWord(x, y, "down");
    if (word.length <= 1) return false;
    return ((y === 0) || (grid[y - 1][x] == "#"));
}

function getQuestion(num, x, y, direction, question) {
    const answer = getWord(x, y, direction);
    if (direction === "across") {
        for (let i = 0; i < $questionsAcross.length; i++) {
            if ($questionsAcross[i].answer === answer && $questionsAcross[i].direction === direction) {
                return { ...$questionsAcross[i], answer, num, x, y };
            }
            if ($questionsAcross[i].num === num && $questionsAcross[i].direction === direction) {
                return { ...$questionsAcross[i], answer, x, y };
            }
        }
        return { num, x, y, question, answer, editing: false, direction };
    } else {
        for (let i = 0; i < $questionsDown.length; i++) {
            if ($questionsDown[i].answer === answer && $questionsDown[i].direction === direction) {
                return { ...$questionsDown[i], answer, num, x, y };
            }
            if ($questionsDown[i].num === num && $questionsDown[i].direction === direction) {
                return $questionsDown[i] = { ...$questionsDown[i], answer, x, y };
            }
        }
        return $questionsDown = { num, x, y, question, answer, editing: false, direction };
    }
}

function getCurrentQuestion() {
    let {x, y} = getCurrentPos();
    let selected_question;
    let questions = $currentDirection === "across" ? $questionsAcross : $questionsDown;
    if (!questions.length) return;
    if ($currentDirection === "across") {
        selected_question = questions.find(q => y === q.y && x >= q.x && x <= q.x + q.answer.length - 1);
    } else {
        selected_question = questions.find(q => x === q.x && y >= q.y && y <= q.y + q.answer.length - 1);
    }
    return selected_question;
}

function getStartOfWord(x, y, direction) {
    if (direction === "across") {
        while(x > 0 && grid[y][x - 1] !== "#") {
            x--;
        }
    } else {
        while(y > 0 && grid[y - 1][x] !== "#") {
            y--;
        }
    }
    return { x, y };
}

function getEndOfWord(x, y, direction) {
    if (direction === "across") {
        while(x < size - 1 && grid[y][x + 1] !== "#") {
            x++;
        }
    } else {
        while(y < size - 1 && grid[y + 1][x] !== "#") {
            y++;
        }
    }
    return { x, y };
}

function getWord(x, y, direction) {
    let start = getStartOfWord(x, y, direction);
    let end = getEndOfWord(x, y, direction);
    let word = "";
    if (direction === "across") {
        for (let i = start.x; i <= end.x; i++) {
            word += grid[y][i] || " ";
        }
    } else {
        for (let i = start.y; i <= end.y; i++) {
            word += grid[i][x] || " ";
        }
    }
    return word;
}

function drawMarkedWordGrid() {
    marked_word_grid = Array(size).fill(false).map(() => Array(size).fill(false));
    if ($currentDirection === "across") {
        for (let x = current_x; x < size; x++) {
            if (!grid[current_y]) break;
            if (grid[current_y][x] === "#") {
                break;
            }
            marked_word_grid[current_y][x] = true;
        }
        for (let x = current_x; x >= 0; x--) {
            if (!grid[current_y]) break;
            if (grid[current_y][x] === "#") {
                break;
            }
            marked_word_grid[current_y][x] = true;
        }
    } else { // down
        for (let y = current_y; y < size; y++) {
            if (!grid[y]) break;
            if (grid[y][current_x] === "#") {
                break;
            }
            marked_word_grid[y][current_x] = true;
        }
        for (let y = current_y; y >= 0; y--) {
            if (!grid[y]) break;
            if (grid[y][current_x] === "#") {
                break;
            }
            marked_word_grid[y][current_x] = true;
        }
    }
}

export function moveUp() {
    if (current_y > 0) {
        current_y--;
        dispatch("change");
        drawMarkedWordGrid();
    }
}

export function moveDown() {
    if (current_y < size - 1) {
        current_y++;
        dispatch("change");
        drawMarkedWordGrid();
    }
}

export function moveLeft() {
    if (current_x > 0) {
        current_x--;
        dispatch("change");
        drawMarkedWordGrid();
    } else {
        if (current_y > 0) {
            current_y--;
            current_x = size - 1;
            dispatch("change");
            drawMarkedWordGrid();
        }
    }
}

export function moveRight() {
    if (current_x < size - 1) {
        current_x++;
        dispatch("change");
        drawMarkedWordGrid();
    } else {
        if (current_y < size - 1) {
            current_y++;
            current_x = 0;
            dispatch("change");
            drawMarkedWordGrid();
        }
    }
}

export function moveStartOfRow() {
    current_x = 0;
    dispatch("change");
    drawMarkedWordGrid();
}

export function moveEndOfRow() {
    current_x = size - 1;
    dispatch("change");
    drawMarkedWordGrid();
}

export function moveStartOfCol() {
    current_y = 0;
    dispatch("change");
    drawMarkedWordGrid();
}

export function moveEndOfCol() {
    current_y = size - 1;
    dispatch("change");
    drawMarkedWordGrid();
}

export function handleMove(dir) {
    if (dir === "up") {
        moveUp();
    }
    if (dir === "down") {
        moveDown();
    }
    if (dir === "left") {
        moveLeft();
    }
    if (dir === "right") {
        moveRight();
    }
    if (dir === "backsapce") {
        backspace();
    }
}

export function toggleDir() {
    if ($currentDirection === "across") {
        currentDirection.set("down");
    } else {
        currentDirection.set("across");
    }
    dispatch("change");
    drawMarkedWordGrid();
}

export function setDir(direction) {
    if (direction === "across") {
        currentDirection.set("across");
    } else {
        currentDirection.set("down");
    }
    dispatch("change");
    drawMarkedWordGrid();
}

export function getCurrentPos() {
    return {
        x: current_x,
        y: current_y
    };
}

export function setCurrentPos(x, y) {
    current_x = x;
    current_y = y;
    dispatch("change");
    drawMarkedWordGrid();
}

function handleDoubleclick(x, y) {
    toggleDir();
    // let selected_question;
    // let questions = $currentDirection === "across" ? $questionsAcross : $questionsDown;
    // if ($currentDirection === "across") {
    //     selected_question = questions.find(q => y === q.y && x >= q.x && x <= q.x + q.answer.length - 1);
    //     if (selected_question) {
    //         selected_question.editing = true;
    //         $questionsAcross = [...questions];
    //     }
    // } else {
    //     selected_question = questions.find(q => x === q.x && y >= q.y && y <= q.y + q.answer.length - 1);
    //     if (selected_question) {
    //         selected_question.editing = true;
    //         $questionsDown = [...questions];
    //     }
    // }
    
}

export function handleKeydown (e) {
    e.preventDefault();
    const keycode = e.keyCode;
    if (e.metaKey) return;
    if ((keycode > 64 && keycode < 91)) {
        dispatch("letter", e.key.toUpperCase());
    } else if (keycode === 51) { // #
        dispatch("letter", "#");
    } else if (keycode === 8) { // Backspace
        dispatch("backspace");
    } else if (keycode == 32) { // Space
        dispatch("letter", " ");
    } else if ((keycode === 9)) { // Enter
        if (e.shiftKey) {
            dispatch("move", "prev-word");
        } else {
            dispatch("move", "next-word");
        }
    } else if (keycode === 13) { // Enter
        dispatch("enter");
    } else if (keycode === 37) {
        dispatch("move", "left");
    } else if (keycode === 38) {
        dispatch("move", "up");
    } else if (keycode === 39) {
        dispatch("move", "right");
    } else if (keycode === 40) {
        dispatch("move", "down");
    }
    handleFocus(e);
}

function handleFocus(e) {
    Input.focus();
}

function handleUpdateQuestion(e) {
    const { question, suggestion } = e.detail;
    if (question.direction === "across") {
        for (let i = 0; i < suggestion.length; i++) {
            grid[question.y][i + question.x] = suggestion[i];
        }
    } else {
        for (let i = 0; i < suggestion.length; i++) {
            grid[i + question.y][question.x] = suggestion[i];
        }
    }
}
</script>

<main on:move={handleMove}>
    <div class="jxword-svg-container" bind:this={Container}>
        <input bind:this={Input} type="text" on:keydown={handleKeydown} />
        <svg class='jxword-svg' min-x="0" min-y="0" width={viewbox_width} height={viewbox_height}>
            <g class="cell-group">
                {#each grid as col_data, y}
                    {#each col_data as letter, x}
                        <g id="jxword-cell-{x}-{y}" class="jxword-cell" style="z-index: 20" class:selected="{(current_y === y && current_x === x)}" class:active="{(marked_word_grid[y][x])}" on:click="{() => { setCurrentPos(x, y);}}" on:dblclick="{() => {handleDoubleclick(x, y)}}" on:keydown="{handleKeydown}">
                            {#if letter=="#"}
                                <rect class="jxword-cell-rect" role="cell" tabindex="-1" aria-label="blank" y="{(cellWidth * y) + margin}" x="{(cellHeight * x) + margin}" width="{cellWidth}" height="{cellHeight}" stroke="{innerBorderColour}" stroke-width="{innerBorderWidth}" fill="{fillColour}" data-col="{y}" data-row="{ x }" on:focus="{handleFocus}"></rect>
                                <!-- Draw cross -->
                                <line class="jxword-cell-line" role="cell" tabindex="-1" y1="{(cellHeight * y) + margin + innerBorderWidth}" x1="{(cellWidth * x) + margin + innerBorderWidth}" y2="{(cellHeight * y) + (innerBorderWidth * y) + cellHeight}" x2="{(cellWidth * x) + (innerBorderWidth * y) + cellWidth}" stroke="{innerBorderColour}" stroke-width="{innerBorderWidth}" data-col="{y}" data-row="{ x }" on:focus="{handleFocus}"></line>
                                <line class="jxword-cell-line" role="cell" tabindex="-1" y1="{(cellHeight * y) + margin + innerBorderWidth}" x1="{(cellWidth * x) + margin + innerBorderWidth}" y2="{(cellHeight * y) + (innerBorderWidth * y) + cellHeight}" x2="{(cellWidth * x) + (innerBorderWidth * y) + cellWidth}" stroke="{innerBorderColour}" stroke-width="{innerBorderWidth}" data-col="{y}" data-row="{ x }" on:focus="{handleFocus}" transform="rotate(90, {(cellWidth * x) + margin + (cellWidth / 2)}, {(cellHeight * y) + margin + (cellWidth / 2)})"></line>
                            {:else}
                                <rect class="jxword-cell-rect" role="cell" tabindex="-1" aria-label="" y="{(cellWidth * y) + margin}" x="{(cellHeight * x) + margin}" width="{cellWidth}" height="{cellHeight}" stroke="{innerBorderColour}" stroke-width="{innerBorderWidth}" fill="{backgroundColour}" data-col="{ x }" data-row="{ y }" on:focus="{handleFocus}"></rect>
                                <text id="jxword-letter-{x}-{y}" x="{ ((cellWidth * x) + margin) + (cellWidth / 2) }" y="{ ((cellHeight * y) + margin) + cellHeight - (cellHeight * 0.1) }" text-anchor="middle" font-size="{ fontSize }" width="{ cellWidth }" on:focus="{handleFocus}">{ letter }</text>
                            {/if}
                            {#if (number_grid[y][x] != null && letter!=="#")}
                                <text x="{(cellWidth * x) + margin + 2}" y="{(cellHeight * y) + margin + numFontSize}" text-anchor="left" font-size="{ numFontSize }" on:focus="{handleFocus}">{ (number_grid[y][x]) }</text>
                            {/if}
                        </g>
                    {/each}
                {/each}
                <rect x="{margin}" y="{margin}" width="{totalWidth}" height="{totalHeight}" stroke="{outerBorderColour }" stroke-width="{outerBorderWidth }" fill="none" on:focus="{handleFocus}"></rect>
            </g>
        </svg>
    </div>
    <Questions on:change on:update_question="{handleUpdateQuestion}" />
</main>

<style lang="scss" scoped>
    main {
        display: flex;
        flex-direction: row;
        align-items: top;
        justify-content: center;
        height: 100%;
        width: 100%;
        touch-action: none;
        user-select: none;
        .jxword-svg-container {
            width: 50%;
        }
        
    }

    input {
        opacity: 0;
        position: absolute;
        left: -1000px;
    }

    svg.jxword-svg {
        max-width: 100%; 
        max-height: 100%;
        *:focus {
            outline: none;
        }
        .jxword-cell-rect {
            user-select: none;
            text {
                pointer-events: none;
            }
        }
        .active {
            rect.jxword-cell-rect {
                fill: #9ce0fb;
            }
        }
        .selected {
            rect.jxword-cell-rect {
                fill: #f7f457;
            }
        }
        
    }
</style>