const fs = require('node:fs/promises');
const path = require('node:path');
const build = require('./positionalIndex');

async function main() {
    const input = path.resolve(__dirname, '../../data/processed/newDocuments.json');
    const output = path.resolve(__dirname, '../../data/processed/positional-index.json');
    const documents = JSON.parse(await fs.readFile(input, 'utf8'));
    const index = build(documents);
    await fs.writeFile(output, JSON.stringify(index, null, 2));
    console.log(`Indexed ${documents.length} documents and ${Object.keys(index.postings).length} stems.`);
    console.log(output);
}

if (require.main === module) main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});

module.exports = main;
