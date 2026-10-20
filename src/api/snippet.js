const analyze = require('../index/analyzer');
const parseQuery = require('../search/queryParser');

// Generate previews only for the selected result page, after index retrieval.
function makeSnippet(content, query, size = 220) {
    const text = (content || '').replace(/\s+/g, ' ').trim();
    const terms = new Set(parseQuery(query)
        .filter(token => token.type !== 'operator')
        .flatMap(token => analyze(token.value, { removeStopWords: false })));
    let start = 0;
    for (const match of text.matchAll(/[a-z0-9]+/gi)) {
        if (terms.has(analyze(match[0], { removeStopWords: false })[0])) {
            start = Math.max(0, match.index - 60);
            break;
        }
    }
    // Avoid starting or ending in the middle of a word when possible.
    if (start > 0) {
        const boundary = text.indexOf(' ', start);
        if (boundary !== -1) start = boundary + 1;
    }
    let end = Math.min(text.length, start + size);
    if (end < text.length) {
        const boundary = text.lastIndexOf(' ', end);
        if (boundary > start) end = boundary;
    }
    return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

module.exports = makeSnippet;
