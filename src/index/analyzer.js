const tokenize = require('./tokenizer');
const stem = require('@stdlib/nlp-porter-stemmer');

const stopWords = new Set(['the', 'a', 'an', 'of', 'is']);

function analyze(text, { removeStopWords = true } = {}) {
    return tokenize(text)
        .filter(word => !removeStopWords || !stopWords.has(word))
        .map(word => stem(word));
}

module.exports = analyze;
