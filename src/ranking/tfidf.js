const ranker = require('./ranker');
const tokenize = require('../index/tokenizer');
const documents = require('../../data/processed/newDocuments.json');
const index = require('../../data/processed/inverted-index.json');

// Compute once when this module loads.
const statsById = new Map(
    ranker(documents).map(stat => [stat.id, stat])
);

function TFIDF(query) {
    const terms = new Set(tokenize(query));
    const scores = new Map();

    for (const term of terms) {
        const postings = Object.hasOwn(index, term) ? index[term] : [];

        // Missing words contribute nothing.
        if (postings.length === 0) continue;

        const idf = Math.log(documents.length / postings.length);

        for (const id of postings) {
            const tf = statsById.get(id).freq[term] ?? 0;
            const previousScore = scores.get(id) ?? 0;

            scores.set(id, previousScore + tf * idf);
        }
    }

    return [...scores].map(([id, score]) => ({ id, score }))
        .sort((a, b) => b.score - a.score || a.id - b.id);
}

if (require.main === module) {
    const query = process.argv[2];

    if (!query || !query.trim()) {
        console.error('Usage: node src/ranking/tfidf.js "book price"');
        process.exitCode = 1;
    } else {
        console.table(TFIDF(query));
    }
}

module.exports = TFIDF;