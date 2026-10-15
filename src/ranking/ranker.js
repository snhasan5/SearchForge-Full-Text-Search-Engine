const tokenizer = require('../index/tokenizer')

function ranker(documents) {
    const freq_statistics = [];

    documents.forEach(document => {

        let corpus = [...tokenizer(document.title), ...tokenizer(document.content)];
        const map = new Map();

        corpus.forEach((word) => {
            let freq = map.get(word) ?? 0;
            map.set(word, ++freq);
        })
        let stats = {
            id: document.id,
            t_count: corpus.length,
            freq: Object.fromEntries(map)
        };
        freq_statistics.push(stats);
    });
    return freq_statistics;
}

module.exports = ranker;