const fs = require('node:fs');
const path = require('node:path');
const createEngine = require('./advancedSearch');

function main() {
    const args = process.argv.slice(2);
    const completion = args[0] === '--complete';
    const query = completion ? args[1] : args[0];
    if (!query?.trim()) {
        throw new Error('Usage: npm run search:advanced -- \'"machine learning" OR node\' OR --complete java');
    }
    const filename = path.resolve(__dirname, '../../data/processed/positional-index.json');
    if (!fs.existsSync(filename)) throw new Error('Run npm run index:advanced first.');
    const engine = createEngine(JSON.parse(fs.readFileSync(filename, 'utf8')));
    if (completion) {
        console.log(engine.complete(query));
        return;
    }
    const { results, suggestions } = engine.search(query);
    console.log(`Matches: ${results.length}`);
    if (!results.length) console.log('No results found.');
    else console.table(results.slice(0, 10).map((result, i) => ({
        rank: i + 1, id: result.id, title: result.title.trim(), score: result.score.toFixed(4)
    })));
    for (const suggestion of suggestions) {
        if (suggestion.alternatives.length) {
            console.log(`Did you mean ${suggestion.alternatives.map(word => `"${word}"`).join(' or ')} instead of "${suggestion.word}"?`);
        }
    }
}

if (require.main === module) {
    try { main(); } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
