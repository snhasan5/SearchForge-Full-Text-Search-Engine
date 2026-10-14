const buildIndex = require('./invertedIndex');
const documents = require('../../data/raw/crawled-documents.json');

buildIndex(documents).catch(error => {
    console.error('Index build failed:', error.message);
    process.exitCode = 1;
});
