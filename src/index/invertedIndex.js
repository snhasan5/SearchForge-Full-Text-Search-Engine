const tokenize = require('./tokenizer');
const path = require('path');
const fs = require('fs/promises');

function getIDs(documents){
    return documents.map((document,index)=>(
        {
            id : index,
            ...document
        })
    )
}
async function updateDocument(documents,dir){
    const data =  JSON.stringify(documents);
    const filePath = path.join(__dirname,dir)
    await fs.writeFile(filePath,data);
    console.log("The document has been updated!");

}
async function invertedIndexing(documents) {
    const map = new Map();
    const newDocuments = getIDs(documents);
    await updateDocument( newDocuments,'../../data/processed/newDocuments.json');

    newDocuments.forEach((doc ) => {
        [...tokenize(doc.title), ...tokenize(doc.content)].forEach(word => {
            const entry = map.get(word) ?? new Set();
            entry.add(doc.id);
            map.set(word, entry);
        });
    });
    map.forEach((value,key)=>{
        map.set(key,[...value]);
    })
    const finalObjectResult =  Object.fromEntries(map);
    await updateDocument(finalObjectResult,'../../data/processed/inverted-index.json');
    return finalObjectResult;
}


module.exports = invertedIndexing;