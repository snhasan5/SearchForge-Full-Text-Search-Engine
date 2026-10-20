const form = document.querySelector('#search-form');
const input = document.querySelector('#query');
const results = document.querySelector('#results');
const status = document.querySelector('#status');
const corrections = document.querySelector('#corrections');
const pagination = document.querySelector('#pagination');
const dialog = document.querySelector('#document-dialog');
const completions = document.querySelector('#completions');
let activeQuery = '';
let offset = 0;
let searchController;
let suggestController;
let suggestTimer;
let documentController;
const limit = 10;

async function getJSON(url, signal) {
    const response = await fetch(url, { signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
}

function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
}

function renderResult(result) {
    const card = element('article', undefined, 'result');
    card.append(element('div', result.url || 'Local document', 'url'));
    const heading = element('h2');
    // Crawled text is untrusted: use textContent, and only permit web links.
    let target;
    try {
        const url = new URL(result.url);
        if (['http:', 'https:'].includes(url.protocol)) target = url.href;
    } catch { /* A document need not have an external URL. */ }
    const title = element(target ? 'a' : 'span', result.title || 'Untitled document');
    if (target) { title.href = target; title.target = '_blank'; title.rel = 'noopener noreferrer'; }
    heading.append(title);
    card.append(heading, element('p', result.snippet, 'snippet'));
    const meta = element('div', undefined, 'result-meta');
    meta.append(element('span', `Score: ${result.score.toFixed(4)}`));
    const preview = element('button', 'Read saved document');
    preview.type = 'button';
    preview.addEventListener('click', () => openDocument(result.id));
    meta.append(preview);
    card.append(meta);
    return card;
}

async function runSearch(query, nextOffset = 0) {
    if (!query.trim()) return;
    searchController?.abort();
    const controller = new AbortController();
    searchController = controller;
    activeQuery = query.trim();
    offset = nextOffset;
    input.value = activeQuery;
    status.textContent = 'Searching…';
    results.replaceChildren();
    corrections.replaceChildren();
    pagination.hidden = true;
    results.setAttribute('aria-busy', 'true');
    try {
        const params = new URLSearchParams({ q: activeQuery, limit, offset });
        const data = await getJSON(`/search?${params}`, controller.signal);
        status.textContent = data.total
            ? `${data.total} results for “${data.query}”`
            : `No results for “${data.query}”. Try another word or OR to broaden your query.`;
        results.replaceChildren(...data.results.map(renderResult));
        for (const suggestion of data.suggestions) {
            if (!suggestion.alternatives.length) continue;
            const row = element('p', `For “${suggestion.word}”, did you mean `);
            for (const alternative of suggestion.alternatives) {
                const button = element('button', alternative);
                button.type = 'button';
                button.addEventListener('click', () => {
                    // Replace a whole token, preserving the rest of the expression.
                    const replacement = data.query.replace(/[a-z0-9]+/gi, word =>
                        word.toLowerCase() === suggestion.word ? alternative : word);
                    runSearch(replacement);
                });
                row.append(button);
            }
            corrections.append(row);
        }
        pagination.hidden = data.total <= limit;
        document.querySelector('#previous').disabled = offset === 0;
        document.querySelector('#next').disabled = offset + limit >= data.total;
        document.querySelector('#page-label').textContent = `${offset + 1}–${Math.min(offset + limit, data.total)} of ${data.total}`;
        history.replaceState(null, '', `/?${new URLSearchParams({ q: data.query })}`);
    } catch (error) {
        if (error.name !== 'AbortError') status.textContent = error.message;
    } finally {
        if (searchController === controller) results.setAttribute('aria-busy', 'false');
    }
}

async function openDocument(id) {
    documentController?.abort();
    const controller = new AbortController();
    documentController = controller;
    document.querySelector('#document-title').textContent = 'Loading document…';
    document.querySelector('#document-content').textContent = '';
    if (!dialog.open) dialog.showModal();
    try {
        const data = await getJSON(`/documents/${id}`, controller.signal);
        document.querySelector('#document-title').textContent = data.title.trim();
        document.querySelector('#document-content').textContent = data.content;
    } catch (error) {
        if (error.name !== 'AbortError') document.querySelector('#document-content').textContent = error.message;
    }
}

form.addEventListener('submit', event => { event.preventDefault(); runSearch(input.value); });
document.querySelectorAll('[data-query]').forEach(button =>
    button.addEventListener('click', () => runSearch(button.dataset.query)));
document.querySelector('#previous').addEventListener('click', () => runSearch(activeQuery, Math.max(0, offset - limit)));
document.querySelector('#next').addEventListener('click', () => runSearch(activeQuery, offset + limit));
document.querySelector('#close-document').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => documentController?.abort());

input.addEventListener('input', () => {
    clearTimeout(suggestTimer);
    suggestController?.abort();
    completions.replaceChildren();
    const value = input.value;
    if (!value.trim()) return;
    suggestTimer = setTimeout(async () => {
        const controller = new AbortController();
        suggestController = controller;
        try {
            const data = await getJSON(`/suggest?${new URLSearchParams({ q: value })}`, controller.signal);
            if (input.value !== value) return;
            completions.replaceChildren(...data.suggestions.map(word => {
                const option = element('option');
                option.value = value.replace(/[a-z0-9]+$/i, word);
                return option;
            }));
        } catch { /* Suggestions are optional; the search form still works. */ }
    }, 200);
});

const initialQuery = new URLSearchParams(location.search).get('q');
if (initialQuery) runSearch(initialQuery);
