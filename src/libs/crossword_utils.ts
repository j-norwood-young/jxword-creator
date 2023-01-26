export function getStartOfWord(grid:string[][], x: number, y: number, direction: string) {
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

export function getEndOfWord(grid:string[][], x: number, y: number, direction: string) {
    const size = grid.length;
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

export function getWord(grid:string[][], x: number, y: number, direction: string) {
    let start = getStartOfWord(grid, x, y, direction);
    let end = getEndOfWord(grid, x, y, direction);
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

export function isStartOfAcross(grid:string[][], x: number, y: number) {
    const size = grid.length;
    if (grid[y][x] === "#") return false;
    if (x >= size) return false;
    let word = getWord(grid, x, y, "across");
    if (word.length <= 1) return false;
    return ((x === 0) || (grid[y][x - 1] == "#"));
}

export function isStartOfDown(grid:string[][], x: number, y: number) {
    const size = grid.length;
    if (grid[y][x] === "#") return false;
    if (y >= size) return false;
    let word = getWord(grid, x, y, "down");
    if (word.length <= 1) return false;
    return ((y === 0) || (grid[y - 1][x] == "#"));
}