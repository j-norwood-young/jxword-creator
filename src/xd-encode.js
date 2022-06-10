const format_date = (date) => new Date(date).toISOString().slice(0, 10);

export function XDEncode(obj) {
    if (!obj) return;
    let str = "";
    if (obj.title) {
        str += `Title: ${obj.title}\n`;
    }
    if (obj.author) {
        str += `Author: ${obj.author}\n`;
    }
    if (obj.editor) {
        str += `Editor: ${obj.editor}\n`;
    }
    if (obj.date) {
        str += `Date: ${format_date(obj.date)}\n`;
    }
    if (obj.difficulty) {
        str += `Difficulty: ${obj.difficulty}\n`;
    }
    if (obj.type) {
        str += `Type: ${obj.type}\n`;
    }
    if (obj.copyright) {
        str += `Copyright: ${obj.copyright}\n`;
    }
    str += `\n\n`;
    for (let y = 0; y < obj.grid.length; y++) {
        for(let x = 0; x < obj.grid[y].length; x++) {
            str += `${obj.grid[y][x]}`;
        }
        str += `\n`;
    }
    str += `\n\n`;
    for (let q of obj.questions_across) {
        str += `A${q.num}. ${q.question} ~ ${q.answer}\n`;
    }
    str += `\n`;
    for (let q of obj.questions_down) {
        str += `D${q.num}. ${q.question} ~ ${q.answer}\n`;
    }
    return str;
}