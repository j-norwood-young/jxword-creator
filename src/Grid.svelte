<script>
export let size = 10;

let active = [];
let number_grid = [];
let marked_word_grid = [];
export let grid = [];
export let direction = "across"; // across or down
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
export let current_row = 0;
export let current_col = 0;
$: {
    viewbox_width = totalWidth + margin + outerBorderWidth;
    viewbox_height = totalHeight + margin + outerBorderWidth;
    cellWidth = totalWidth / size;
    cellHeight = totalHeight / size;
    fontSize = cellWidth * fontRatio;
    numFontSize = cellWidth * numRatio;
    for (let i = 0; i < size; i++) {
        // grid[i] = [];
        number_grid[i] = [];
        // marked_word_grid[i] = [];
        for (let j = 0; j < size; j++) {
            if (!grid[i]) {
                grid[i] = [];
            }
            grid[i][j] = grid[i][j] || " ";
            number_grid[i][j] = null;
            // marked_word_grid[i][j] = false;
        }
    }
    drawNumbers();
    drawMarkedWordGrid();
}

export function selectCell(e) {
    current_row = e.srcElement.getAttribute("data-row");
    current_col = e.srcElement.getAttribute("data-col");
    drawMarkedWordGrid();
}

function isStartOfAcross(col, row) {
    if (grid[col][row] === "#") return false;
    return ((col === 0) || (grid[col - 1][row] == "#"));
}

function isStartOfDown(col, row) {
    if (grid[col][row] === "#") return false;
    return ((row === 0) || (grid[col][row - 1] == "#"));
}

function drawNumbers() {
    // A cell gets a number if it has a block or edge above or to the left of it, and a blank letter to the bottom or right of it respectively
    // Populate a number grid while we're at it
    let num = 1;
    for (let col = 0; col < size; col++) {
        for (let row = 0; row < size; row++) {
            let drawNum = isStartOfAcross(col, row) || isStartOfDown(col, row);
            if (drawNum) {
                drawNumber(col, row, num++);
            }
        }
    }
}

function drawNumber(col, row, num) {
    number_grid[col][row] = num;
}

function drawMarkedWordGrid() {
    marked_word_grid = Array(size).fill(false).map(() => Array(size).fill(false));
    if (direction === "across") {
        for (let col = current_col; col < size; col++) {
            if (grid[current_row][col] === "#") {
                break;
            }
            marked_word_grid[current_row][col] = true;
        }
        for (let col = current_col; col >= 0; col--) {
            if (grid[current_row][col] === "#") {
                break;
            }
            marked_word_grid[current_row][col] = true;
        }
    } else { // down
        for (let row = current_row; row < size; row++) {
            if (grid[row][current_col] === "#") {
                break;
            }
            marked_word_grid[row][current_col] = true;
        }
        for (let row = current_row; row >= 0; row--) {
            if (grid[row][current_col] === "#") {
                break;
            }
            marked_word_grid[row][current_col] = true;
        }
    }
}

export function moveUp() {
    if (current_row > 0) {
        current_row--;
    }
    drawMarkedWordGrid();
}

export function moveDown() {
    if (current_row < size - 1) {
        current_row++;
    }
    drawMarkedWordGrid();
}

export function moveLeft() {
    if (current_col > 0) {
        current_col--;
    }
    drawMarkedWordGrid();
}

export function moveRight() {
    if (current_col < size - 1) {
        current_col++;
    }
    drawMarkedWordGrid();
}

export function moveStartOfRow() {
    current_col = 0;
    drawMarkedWordGrid();
}

export function moveEndOfRow() {
    current_col = size - 1;
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

export function changeDir() {
    if (direction === "across") {
        direction = "down";
    } else {
        direction = "across";
    }
    drawMarkedWordGrid();
}

export function setDir(dir) {
    if (dir === "across") {
        direction = "across";
    } else {
        direction = "down";
    }
    drawMarkedWordGrid();
}

export function getDir() {
    return direction;
}

export function getCurrentPos() {
    return {
        row: current_row,
        col: current_col
    };
}

</script>

<main on:move={handleMove}>
    <svg class='jxword-svg' min-x="0" min-y="0" width={viewbox_width} height={viewbox_height}>
        <g class="cell-group">
            {#each grid as row_data, row}
                {#each row_data as letter, col}
                    <g id="jxword-cell-{col}-{row}" class="jxword-cell" style="z-index: 20" class:selected="{(current_row === row && current_col === col)}" class:active="{(marked_word_grid[row][col])}" on:click="{() => {current_row = row; current_col = col; drawMarkedWordGrid(); }}">
                        {#if letter=="#"}
                            <rect class="jxword-cell-rect" role="cell" tabindex="-1" aria-label="" x="{(cellWidth * col) + margin}" y="{(cellHeight * row) + margin}" width="{cellWidth}" height="{cellHeight}" stroke="{innerBorderColour}" stroke-width="{innerBorderWidth}" fill="{fillColour}" data-col="{col}" data-row="{row }" contenteditable="true"></rect>
                        {:else}
                            <rect class="jxword-cell-rect" role="cell" tabindex="-1" aria-label="" x="{(cellWidth * col) + margin}" y="{(cellHeight * row) + margin}" width="{cellWidth}" height="{cellHeight}" stroke="{innerBorderColour}" stroke-width="{innerBorderWidth}" fill="{backgroundColour}" data-col="{col}" data-row="{row }" contenteditable="true"></rect>
                            <text id="jxword-letter-{col}-{row}" x="{ ((cellWidth * col) + margin) + (cellWidth / 2) }" y="{ ((cellHeight * row) + margin) + cellHeight - (cellHeight * 0.1) }" text-anchor="middle" font-size="{ fontSize }" width="{ cellWidth }">{ letter }</text>
                        {/if}
                        {#if (number_grid[row][col] != null)}
                            <text x="{(cellWidth * col) + margin + 2}" y="{(cellHeight * row) + margin + numFontSize}" text-anchor="left" font-size="{ numFontSize }">{ (number_grid[row][col]) }</text>
                        {/if}
                    </g>
                {/each}
            {/each}
            <rect x="{margin}" y="{margin}" width="{totalWidth}" height="{totalHeight}" stroke="{outerBorderColour }" stroke-width="{outerBorderWidth }" fill="none"></rect>
        </g>
    </svg>
</main>

<style lang="scss" scoped>
    svg.jxword-svg {
        max-width: 100%; 
        max-height: 100%;

        .jxword-cell-rect {
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