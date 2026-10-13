const tokenize = require('./tokenizer');
const crawledDocuments = require('../data/crawled-documents.json')
const path = require('path');
const fs = require('fs');

function getIDs(documents){
    return documents.map((document,index)=>(
        {
            id : index,
            ...document
        })
    )
}
function updateDocument(document){
    
}
function invertedIndexing(documents) {
    const map = new Map();

    documents.forEach((doc ) => {
        [...tokenize(doc.title), ...tokenize(doc.content)].forEach(word => {
            const entry = map.get(word) ?? new Set();
            entry.add(doc.id);
            map.set(word, entry);
        });
    });
    map.forEach((word)=>{
        map.set(word,[...map.get(word)]);
    })
    const finalObjectResult =  Object.fromEntries(getIDs(documents));
    return JSON.stringify(finalObjectResult);
}


module.exports = invertedIndexing;