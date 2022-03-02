const fs = require("fs");

const data = fs.readFileSync("./google-10000-english-no-swears.txt");

const words = String(data).split("\n");

const json = [ ...words ];

fs.writeFileSync("words.json", JSON.stringify(json));