const getElement = (xmlDoc, tagName) => xmlDoc.getElementsByTagName(tagName)[0]?.textContent;

const getAttribute = (xmlDoc, tagName, attributeName) => xmlDoc.getElementsByTagName(tagName)[0]?.getAttribute(attributeName);

const getGrid = (xmlDoc) => {
    const xmlCells = xmlDoc.getElementsByTagName('cell');
    const cells = [];
    for (let i = 0; i < xmlCells.length; i++) {
        const cell = xmlCells[i];
        const x = parseInt(cell.getAttribute('x'));
        const y = parseInt(cell.getAttribute('y'));
        const number = parseInt(cell.getAttribute('number')) || null;
        const solution = cell.getAttribute('solution') || '#';
        const clue = cell.getAttribute('clue');
        cells.push({ x, y, number, solution, clue });
    }
    const grid = [];
    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (!grid[cell.y - 1]) {
            grid[cell.y - 1] = [];
        }
        grid[cell.y - 1][cell.x - 1] = cell.solution;
    }
    
    return grid;
};

const getQuestions = (xmlDoc) => {
    const xmlClues = xmlDoc.getElementsByTagName('clue');
    const xmlWords = xmlDoc.getElementsByTagName('word');
    const words = {};
    for (let i = 0; i < xmlWords.length; i++) {
        const word = xmlWords[i];
        const dir = word.getAttribute('x').includes('-') ? 'across' : 'down';
        const x = parseInt(word.getAttribute('x').split('-')[0]);
        const y = parseInt(word.getAttribute('y').split('-')[0]);
        const id = parseInt(word.getAttribute('id'));
        words[id] = { dir, x, y };
    }
    const down = [];
    const across = [];
    for (let i = 0; i < xmlClues.length; i++) {
        const clue = xmlClues[i];
        const word_id = parseInt(clue.getAttribute('word'));
        const word = words[word_id];
        const number = parseInt(clue.getAttribute('number'));
        const text = clue.textContent;
        if (word.dir === 'across') {
            across.push({ num: number, word_id, question: text, x: word.x - 1, y: word.y - 1, direction: 'across' });
        }
        if (word.dir === 'down') {
            down.push({ num: number, word_id, question: text, x: word.x - 1, y: word.y - 1, direction: 'down' });
        }
    }
    return { across, down };
}

export function parseCrosswordXML(xml) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'text/xml');
    const result = {};
    result.title = getElement(xmlDoc, 'title');
    result.created = getElement(xmlDoc, 'created');
    result.creator = getElement(xmlDoc, 'creator');
    result.editor = getElement(xmlDoc, 'editor');
    result.rights = getElement(xmlDoc, 'rights');
    result.copyright = getElement(xmlDoc, 'copyright');
    result.publisher = getElement(xmlDoc, 'publisher');
    result.identifier = getElement(xmlDoc, 'identifier');
    result.description = getElement(xmlDoc, 'description');
    result.width = parseInt(getAttribute(xmlDoc, 'grid', 'width'));
    result.height = parseInt(getAttribute(xmlDoc, 'grid', 'height'));
    result.grid = getGrid(xmlDoc);
    result.questions = getQuestions(xmlDoc);
    return result;
}

