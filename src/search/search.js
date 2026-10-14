const tokenizer = require('../index/tokenizer');
const path = require('path');
const fs = require('fs');

function loadIndexedData(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error("Index not found.");
    }
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        throw new Error(`Index file is corrupted (${err.message}). Rebuild it .`);
    }
}

function invertedIndexSearch(input) {
    try {
        if (!input || !input.trim()) {
            console.log("Please enter a value, Ex: 'node file_name 'Hello World '' ");
            return [];
        }

        const inputWords = tokenizer(input);
        const filePath = path.resolve(__dirname, '../../data/processed/inverted-index.json');
        const index = loadIndexedData(filePath);

        const set = new Set();
        for (const word of inputWords) {
            if (Object.hasOwn(index, word)) {
                set.add(index[word]);
            } else {
                set.clear();
                break;
            }
        }

        if (set.size === 0) {
            console.log([]);
            return [];
        }

        const [first, ...rest] = [...set];
        const result = first.filter(x => rest.every(arr => arr.includes(x)));

        console.log(result);
        return result;
    } catch (error) {
        console.log(error.message);
        process.exit(1);
    }

}


const input = process.argv[2];

invertedIndexSearch(input);

