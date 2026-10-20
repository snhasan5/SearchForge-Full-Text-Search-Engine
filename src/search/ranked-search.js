const tfidf = require('../ranking/tfidf');
const bm25 = require('../ranking/bm25');
const documents = require('../../data/processed/newDocuments.json');

const documentsById = new Map(
    documents.map(document => [document.id, document])
);

function rankedSearch(input, method) {
    if (!input || !input.trim()) {
        throw new Error('Enter a non-empty query.');
    }

    const normalizedMethod = (method || '').trim().toLowerCase();

    let scorer;

    if (normalizedMethod === 'tfidf') {
        scorer = tfidf;
    } else if (normalizedMethod === 'bm25') {
        scorer = bm25;
    } else {
        throw new Error('Choose a method: tfidf or bm25.');
    }

    return scorer(input.trim());
}

if (require.main === module) {
    const input = process.argv[2];
    const method = process.argv[3];

    try {
        const results = rankedSearch(input, method);

        console.log(`Query: ${input.trim()}`);
        console.log(`Method: ${method.trim().toLowerCase()}`);

        if (results.length === 0) {
            console.log('No results found.');
        } else {
            const rows = results.slice(0, 10).map((result, position) => ({
                rank: position + 1,
                id: result.id,
                title: documentsById.get(result.id).title,
                score: result.score.toFixed(4)
            }));

            console.log(
                `Matches: ${results.length} — showing ${rows.length}`
            );
            console.table(rows);
        }
    } catch (error) {
        console.error(error.message);
        console.error(
            'Usage: node src/search/ranked-search.js "<query>" <tfidf|bm25>'
        );
        process.exitCode = 1;
    }
}

module.exports = rankedSearch;