<script>
export let size = 10;

let active = [];
let number_grid = [];
let marked_word_grid = [];
let questions_across = [];
let questions_down = [];
export let grid = [];
export let current_direction = "across"; // across or down
export let totalWidth = 500;
export let totalHeight = 500;
export let outerBorderWidth = 1.5;
export let innerBorderWidth = 1;
export let margin = 3;
export let outerBorderColour = "black";
export let innerBorderColour = "black";
export let fillColour = "black";
export let backgroundColour = "white";
let selectCellColour = "#f7f457";
let selectWordColour = "#9ce0fb";
export const fontRatio = 0.7;
let numRatio = 0.33;
let debug = false;
let restoreState = false;

let fontSize;
let numFontSize;
let cellWidth;
let cellHeight;
let viewbox_width;
let viewbox_height;
export let current_x = 0;
export let current_y = 0;
$: {
    viewbox_width = totalWidth + margin + outerBorderWidth;
    viewbox_height = totalHeight + margin + outerBorderWidth;
    cellWidth = totalWidth / size;
    cellHeight = totalHeight / size;
    fontSize = cellWidth * fontRatio;
    numFontSize = cellWidth * numRatio;
    let num = 1;
    questions_across = [];
    questions_down = [];
    for (let y = 0; y < size; y++) {
        if (!grid[y]) {
            grid[y] = [];
        }
        if (!number_grid[y]) {
            number_grid[y] = [];
        }
        for (let x = 0; x < size; x++) {
            grid[y][x] = grid[y][x] || " ";
            if (isStartOfAcross(x, y)) {
                addQuestion(num, x, y, "across", "");
            }
            if (isStartOfDown(x, y)) {
                addQuestion(num, x, y, "down", "");
            }
            if (isStartOfAcross(x, y) || isStartOfDown(x, y)) {
                number_grid[y][x] = num++;
            }
        }
    }
    // drawNumbers();
    drawMarkedWordGrid();
}

export function selectCell(e) {
    current_x = e.srcElement.getAttribute("data-col");
    current_y = e.srcElement.getAttribute("data-row");
    drawMarkedWordGrid();
}

function isStartOfAcross(x, y) {
    if (grid[y][x] === "#") return false;
    return ((x === 0) || (grid[y][x - 1] == "#"));
}

function isStartOfDown(x, y) {
    if (grid[y][x] === "#") return false;
    return ((y === 0) || (grid[y - 1][x] == "#"));
}

function drawNumber(x, y, num) {
    number_grid[y][x] = num;
}

function addQuestion(num, x, y, direction, question, answer) {
    answer = answer || getWord(x, y, direction);
    if (direction === "across") {
        questions_across.push({
            num: num,
            x: x,
            y: y,
            question: question,
            answer: answer
        });
    } else {
        questions_down.push({
            num: num,
            x: x,
            y: y,
            question: question,
            answer: answer
        });
    }
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
    console.log(direction, start, end);
    let word = "";
    if (direction === "across") {
        for (let i = start.x; i <= end.x; i++) {
            word += grid[y][i];
        }
    } else {
        for (let i = start.y; i <= end.y; i++) {
            word += grid[i][x];
        }
    }
    return word;
}

function drawMarkedWordGrid() {
    marked_word_grid = Array(size).fill(false).map(() => Array(size).fill(false));
    if (current_direction === "across") {
        for (let x = current_x; x < size; x++) {
            if (grid[current_y][x] === "#") {
                break;
            }
            marked_word_grid[current_y][x] = true;
        }
        for (let x = current_x; x >= 0; x--) {
            if (grid[current_y][x] === "#") {
                break;
            }
            marked_word_grid[current_y][x] = true;
        }
    } else { // down
        for (let y = current_y; y < size; y++) {
            if (grid[y][current_x] === "#") {
                break;
            }
            marked_word_grid[y][current_x] = true;
        }
        for (let y = current_y; y >= 0; y--) {
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
    }
    drawMarkedWordGrid();
}

export function moveDown() {
    if (current_y < size - 1) {
        current_y++;
    }
    drawMarkedWordGrid();
}

export function moveLeft() {
    if (current_x > 0) {
        current_x--;
    }
    drawMarkedWordGrid();
}

export function moveRight() {
    if (current_x < size - 1) {
        current_x++;
    }
    drawMarkedWordGrid();
}

export function moveStartOfRow() {
    current_x = 0;
    drawMarkedWordGrid();
}

export function moveEndOfRow() {
    current_x = size - 1;
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
    if (current_direction === "across") {
        current_direction = "down";
    } else {
        current_direction = "across";
    }
    drawMarkedWordGrid();
}

export function setDir(direction) {
    if (direction === "across") {
        current_direction = "across";
    } else {
        current_direction = "down";
    }
    drawMarkedWordGrid();
}

export function getDir() {
    return current_direction;
}

export function getCurrentPos() {
    return {
        x: current_x,
        y: current_y
    };
}

</script>

<main on:move={handleMove}>
    <div class="jxword-svg-container">
        <svg class='jxword-svg' min-x="0" min-y="0" width={viewbox_width} height={viewbox_height}>
            <g class="cell-group">
                {#each grid as col_data, y}
                    {#each col_data as letter, x}
                        <g id="jxword-cell-{x}-{y}" class="jxword-cell" style="z-index: 20" class:selected="{(current_y === y && current_x === x)}" class:active="{(marked_word_grid[y][x])}" on:click="{() => {current_y = y; current_x = x; drawMarkedWordGrid(); }}" on:dblclick="{() => {toggleDir(); drawMarkedWordGrid();}}">
                            {#if letter=="#"}
                                <rect class="jxword-cell-rect" role="cell" tabindex="-1" aria-label="" y="{(cellWidth * y) + margin}" x="{(cellHeight * x) + margin}" width="{cellWidth}" height="{cellHeight}" stroke="{innerBorderColour}" stroke-width="{innerBorderWidth}" fill="{fillColour}" data-col="{y}" data-row="{ x }"></rect>
                            {:else}
                                <rect class="jxword-cell-rect" role="cell" tabindex="-1" aria-label="" y="{(cellWidth * y) + margin}" x="{(cellHeight * x) + margin}" width="{cellWidth}" height="{cellHeight}" stroke="{innerBorderColour}" stroke-width="{innerBorderWidth}" fill="{backgroundColour}" data-col="{ x }" data-row="{ y }"></rect>
                                <text id="jxword-letter-{x}-{y}" x="{ ((cellWidth * x) + margin) + (cellWidth / 2) }" y="{ ((cellHeight * y) + margin) + cellHeight - (cellHeight * 0.1) }" text-anchor="middle" font-size="{ fontSize }" width="{ cellWidth }">{ letter }</text>
                            {/if}
                            {#if (number_grid[y][x] != null)}
                                <text x="{(cellWidth * x) + margin + 2}" y="{(cellHeight * y) + margin + numFontSize}" text-anchor="left" font-size="{ numFontSize }">{ (number_grid[y][x]) }</text>
                            {/if}
                        </g>
                    {/each}
                {/each}
                <rect x="{margin}" y="{margin}" width="{totalWidth}" height="{totalHeight}" stroke="{outerBorderColour }" stroke-width="{outerBorderWidth }" fill="none"></rect>
            </g>
        </svg>
    </div>
    <div class="jxword-questions">
        <div class="jxword-questions-direction jxword-questions-across">
            <h4>Across</h4>
            <ul>
                {#each questions_across as question}
                <li>{question.num}: {question.question} ~ {question.answer}</li>
                {/each}
            </ul>
        </div>
        <div class="jxword-questions-direction jxword-questions-across">
            <h4>Down</h4>
            <ul>
                {#each questions_down as question}
                    <li>{question.num}: {question.question} ~ {question.answer}</li>
                {/each}
            </ul>
        </div>
    </div>
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
        .jxword-questions {
            width: 50%;
            display: flex;
            flex-direction: row;
            align-items: left;
            justify-content: left;
        }
    }
    svg.jxword-svg {
        max-width: 100%; 
        max-height: 100%;

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