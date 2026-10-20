const analyze = require('./analyzer');
const tokenize = require('./tokenizer');

function buildPositionalIndex(documents) {
    const postings = new Map();
    const vocabulary = new Set();
    const metadata = [];
    const ids = new Set();

    for (const [offset, document] of documents.entries()) {
        const id = document.id ?? offset;
        if (!Number.isSafeInteger(id) || ids.has(id)) {
            throw new Error('Document IDs must be unique safe integers.');
        }
        ids.add(id);
        let length = 0;

        // Keep field positions separate: phrases must not span title/content.
        for (const field of ['title', 'content']) {
            const text = document[field] || '';
            tokenize(text).forEach(word => vocabulary.add(word));
            // Retain stop words so phrase positions and lengths stay accurate.
            const words = analyze(text, { removeStopWords: false });
            length += words.length;
            words.forEach((word, position) => {
                if (!postings.has(word)) postings.set(word, new Map());
                const documentsForWord = postings.get(word);
                if (!documentsForWord.has(id)) {
                    documentsForWord.set(id, { id, title: [], content: [] });
                }
                documentsForWord.get(id)[field].push(position);
            });
        }
        metadata.push({ id, title: document.title || '', url: document.url, length });
    }

    return {
        version: 1,
        documents: metadata,
        postings: Object.fromEntries(
            [...postings].map(([word, entries]) => [word, [...entries.values()]])
        ),
        vocabulary: [...vocabulary].sort()
    };
}

module.exports = buildPositionalIndex;
