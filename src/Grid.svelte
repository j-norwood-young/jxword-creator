<script>
export let size = 10;

let active = [];
export let grid = [];
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
    // grid = [];
    for (let i = 0; i < size; i++) {
        // grid[i] = [];
        for (let j = 0; j < size; j++) {
            if (!grid[i]) {
                grid[i] = [];
            }
            grid[i][j] = grid[i][j] || " ";
        }
    }
}

function selectCell(e) {
    console.log(e.srcElement);
    current_row = e.srcElement.getAttribute("data-row");
    current_col = e.srcElement.getAttribute("data-col");
}

export function moveUp() {
    if (current_row > 0) {
        current_row--;
    }
}

export function moveDown() {
    if (current_row < size - 1) {
        current_row++;
    }
}

export function moveLeft() {
    if (current_col > 0) {
        current_col--;
    }
}

export function moveRight() {
    if (current_col < size - 1) {
        current_col++;
    }
}

export function moveStartOfRow() {
    current_col = 0;
}

export function moveEndOfRow() {
    current_col = size - 1;
}

export function handleMove(direction) {
    console.log(direction);
    if (direction === "up") {
        moveUp();
    }
    if (direction === "down") {
        moveDown();
    }
    if (direction === "left") {
        moveLeft();
    }
    if (direction === "right") {
        moveRight();
    }
    if (direction === "backsapce") {
        backspace();
    }
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
                    <g id="jxword-cell-{col}-{row}" class="jxword-cell" style="z-index: 20" class:active="{(current_row === row && current_col === col)}" on:click="{() => {current_row = row; current_col = col; console.log(current_col, current_row) }}">
                        {#if letter=="#"}
                            <rect class="jxword-cell-rect" role="cell" tabindex="-1" aria-label="" x="{(cellWidth * col) + margin}" y="{(cellHeight * row) + margin}" width="{cellWidth}" height="{cellHeight}" stroke="{innerBorderColour}" stroke-width="{innerBorderWidth}" fill="{fillColour}" data-col="{col}" data-row="{row }" contenteditable="true"></rect>
                        {:else}
                            <rect class="jxword-cell-rect" role="cell" tabindex="-1" aria-label="" x="{(cellWidth * col) + margin}" y="{(cellHeight * row) + margin}" width="{cellWidth}" height="{cellHeight}" stroke="{innerBorderColour}" stroke-width="{innerBorderWidth}" fill="{backgroundColour}" data-col="{col}" data-row="{row }" contenteditable="true"></rect>
                            <text id="jxword-letter-{col}-{row}" x="{ ((cellWidth * col) + margin) + (cellWidth / 2) }" y="{ ((cellHeight * row) + margin) + cellHeight - (cellHeight * 0.1) }" text-anchor="middle" font-size="{ fontSize }" width="{ cellWidth }">{ letter }</text>
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
                fill: #f7f457;
            }
            
        }
    }
</style>