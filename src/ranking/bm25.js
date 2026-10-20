// Reserved for a future learning phase.
const documents = require('../../data/processed/newDocuments.json');
const ranker = require('./ranker');
const tokenizer = require('../index/tokenizer');
const index = require('../../data/processed/inverted-index.json');


const statsById = new Map(
    ranker(documents).map(stat => [stat.id, stat])
);
const avgLength =
    [...statsById.values()].reduce((acc, { t_count }) => acc + t_count, 0) / statsById.size;
// (3 + 2) / 2 = 2.5
function bm25(query) {
    if (statsById.size === 0 || avgLength === 0) {
        return [];
    }
    const terms = new Set(tokenizer(query));
    const scores = new Map();

    for (const term of terms) {
        const posting = Object.hasOwn(index, term) ? index[term] : [];
        if (posting.length == 0) continue;
        const N = statsById.size;
        const df = posting.length;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        const k1 = 1.2;
        const b = 0.75;
        for (const id of posting) {
            const stat = statsById.get(id);
            const tf = stat.freq[term] ?? 0;
            const length = stat.t_count;
            const previousScore = scores.get(id) ?? 0;

            const score = idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (length / avgLength))));
            scores.set(id, previousScore + score)
        }
    }

    return [...scores].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score || a.id - b.id)
}

module.exports = bm25;