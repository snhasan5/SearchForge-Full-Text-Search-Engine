const parseQuery = require('./queryParser');
const analyze = require('../index/analyzer');
const tokenize = require('../index/tokenizer');
const { suggest, complete } = require('./suggestions');

const intersection = (a, b) => new Set([...a].filter(id => b.has(id)));
const union = (a, b) => new Set([...a, ...b]);

function createSearchEngine(index) {
    const documents = new Map(index.documents.map(document => [document.id, document]));
    const universe = new Set(documents.keys());
    const vocabulary = new Set(index.vocabulary);
    const postings = new Map(Object.entries(index.postings).map(([word, entries]) =>
        [word, new Map(entries.map(entry => [entry.id, entry]))]
    ));
    const averageLength = index.documents.reduce((sum, doc) => sum + doc.length, 0)
        / (documents.size || 1);
    const getPostings = word => postings.get(word) || new Map();

    function phraseMatches(words) {
        if (!words.length) return new Set();
        const matches = new Set();
        for (const [id, first] of getPostings(words[0])) {
            const found = ['title', 'content'].some(field => {
                const positions = words.map(word =>
                    new Set(getPostings(word).get(id)?.[field] || [])
                );
                return first[field].some(start =>
                    positions.every((set, offset) => set.has(start + offset))
                );
            });
            if (found) matches.add(id);
        }
        return matches;
    }

    function search(query) {
        const parsed = parseQuery(query);
        const explicitBoolean = parsed.some(token => token.type === 'operator');
        // Ignore standalone stop words in ordinary queries. Explicit Boolean
        // operands and phrases retain them so their meaning is not discarded.
        const tokens = explicitBoolean ? parsed : parsed.filter(token =>
            token.type !== 'term' || analyze(token.value).length > 0
        );
        const scoringTerms = new Set();
        const suggestions = [];
        let position = 0;

        function operand(negated) {
            const token = tokens[position++];
            if (!token || token.type === 'operator') {
                throw new Error('Expected a term or quoted phrase.');
            }
            let words;
            if (token.type === 'phrase') {
                words = analyze(token.value, { removeStopWords: false });
            } else if (token.value.endsWith('*')) {
                const prefix = token.value.slice(0, -1).toLowerCase();
                if (!/^[a-z0-9]+$/.test(prefix)) {
                    throw new Error('Prefix syntax: java* (letters/numbers followed by *).');
                }
                words = [...new Set(complete(prefix, index.vocabulary, Infinity)
                    .flatMap(word => analyze(word, { removeStopWords: false })))];
                if (!negated) words.forEach(word => scoringTerms.add(word));
                return words.reduce((ids, word) => union(ids, new Set(getPostings(word).keys())), new Set());
            } else {
                if (token.value.includes('*')) throw new Error('Only a trailing * is supported.');
                words = analyze(token.value, { removeStopWords: !explicitBoolean });
                for (const raw of tokenize(token.value)) {
                    if (!vocabulary.has(raw) && !getPostings(analyze(raw, { removeStopWords: false })[0]).size) {
                        suggestions.push({ word: raw, alternatives: suggest(raw, index.vocabulary) });
                    }
                }
            }
            if (!negated) words.forEach(word => scoringTerms.add(word));
            if (token.type === 'phrase') return phraseMatches(words);
            if (!words.length) return new Set();
            return words.map(word => new Set(getPostings(word).keys())).reduce(intersection);
        }

        // Precedence: NOT, then AND (including adjacency), then OR.
        function unary(negated = false) {
            if (tokens[position]?.value === 'NOT' && tokens[position].type === 'operator') {
                position++;
                const excluded = unary(!negated);
                return new Set([...universe].filter(id => !excluded.has(id)));
            }
            return operand(negated);
        }
        function andExpression() {
            let result = unary();
            while (position < tokens.length &&
                !(tokens[position].type === 'operator' && tokens[position].value === 'OR')) {
                if (tokens[position].type === 'operator' && tokens[position].value === 'AND') position++;
                result = intersection(result, unary());
            }
            return result;
        }
        let candidates = new Set();
        if (tokens.length) {
            candidates = andExpression();
            while (position < tokens.length) {
                position++; // OR
                candidates = union(candidates, andExpression());
            }
        }

        const results = [...candidates].map(id => {
            const document = documents.get(id);
            let score = 0;
            for (const word of scoringTerms) {
                const entries = getPostings(word);
                const entry = entries.get(id);
                if (!entry) continue;
                const tf = entry.title.length + entry.content.length;
                const idf = Math.log(1 + (documents.size - entries.size + 0.5) / (entries.size + 0.5));
                const denominator = tf + 1.2 * (0.25 + 0.75 * document.length / averageLength);
                score += idf * tf * 2.2 / denominator;
            }
            return { id, title: document.title, url: document.url, score };
        }).sort((a, b) => b.score - a.score || a.id - b.id);

        return { results, suggestions };
    }

    return { search, complete: prefix => complete(prefix.toLowerCase(), index.vocabulary) };
}

module.exports = createSearchEngine;
