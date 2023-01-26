<script>
    export let size;
    export let grid;
    import patterns_data from "./data/patterns.json"
    let patterns = [];
    let cell_width = 10;
    let svg_width;

    function usePattern(pattern) {
        for (let y = 0; y < pattern.length; y++) {
            for (let x = 0; x < pattern[y].length; x++) {
                if (pattern[y][x]) {
                    grid[y][x] = "#";
                } else {
                    if (grid[y][x] === "#") {
                        grid[y][x] = " ";
                    }
                }
            }
        }
    }

    $: {
        patterns = [];
        svg_width = size * cell_width;
        for (let pattern of patterns_data) {
            if (pattern.size === size)
            patterns.push(pattern.pattern);
        }
    }
</script>

<main>
    <h1>Patterns</h1>
    <p>Size: {size}</p>
    <div class="patterns">
        {#each patterns as pattern}
            <div on:click={usePattern(pattern)} on:keypress={usePattern(pattern)}>
                <svg class="pattern-preview" width={svg_width} height={svg_width}>
                    {#each pattern as row, y}
                        <g>
                            {#each row as cell, x}
                                <rect x={x * cell_width} y={y * cell_width} width={cell_width} height={cell_width} fill={(cell) ? "black" : "white" } stroke="black" stroke-width="1" />
                            {/each}
                        </g>
                    {/each}
                </svg>
            </div>
        {/each}
    </div>
</main>

<style lang="scss">
    .patterns {
        display: flex;
        overflow-x: auto;
        width: 500px;
        div {
            margin-right: 20px;
            flex-grow: 1;
            box-shadow: 0 0 10px 0 rgba(0,0,0,0.5);
            margin-bottom: 20px;
        }
        div:hover {
            box-shadow: 0 0 10px 0 rgba(0,0,0,0.8);
            svg {
                transform: scale(1.1);
            }
        }
    }
</style>