const documents = require('../data/document.json');

const query = process.argv[2];

if (!query || !query.trim()) {
    console.log("Please give a query");
    process.exit(1);
}

const searchWord = query.trim().toLowerCase();

const result = [];

for (const document of documents) {
    const title = document.title.toLowerCase();
    const content = document.content.toLowerCase();

    if (
        title.includes(searchWord) ||
        content.includes(searchWord)
    ) {
        result.push(document.title);
    }
}

console.log(result);