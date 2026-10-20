const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const createEngine = require('../search/advancedSearch');
const makeSnippet = require('./snippet');

function loadData() {
    const directory = path.resolve(__dirname, '../../data/processed');
    try {
        return {
            index: JSON.parse(fs.readFileSync(path.join(directory, 'positional-index.json'), 'utf8')),
            documents: JSON.parse(fs.readFileSync(path.join(directory, 'newDocuments.json'), 'utf8'))
        };
    } catch (error) {
        throw new Error(`Cannot load search data. Run npm run index and npm run index:advanced. ${error.message}`);
    }
}

function badRequest(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
}

function readQuery(req, { allowEmpty = false } = {}) {
    const value = req.query.q;
    if (typeof value !== 'string') throw badRequest('Supply a single string query parameter: q.');
    const query = value.trim();
    if (!query && !allowEmpty) throw badRequest('Query must not be empty.');
    if (query.length > 300) throw badRequest('Query must be at most 300 characters.');
    return query;
}

function readInteger(value, fallback, maximum, name) {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^\d+$/.test(value)) throw badRequest(`${name} must be an integer.`);
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number > maximum || number < (name === 'limit' ? 1 : 0)) {
        throw badRequest(`${name} is outside the supported range.`);
    }
    return number;
}

function createApp(data = loadData()) {
    const { index, documents } = data;
    if (index.version !== 1) throw new Error('Unsupported positional index. Rebuild it.');
    const documentsById = new Map(documents.map(document => [document.id, document]));
    if (documentsById.size !== documents.length || index.documents.length !== documents.length) {
        throw new Error('Document/index mismatch. Rebuild the advanced index.');
    }
    for (const entry of index.documents) {
        const document = documentsById.get(entry.id);
        if (!document || document.title !== entry.title || document.url !== entry.url) {
            throw new Error('Document/index mismatch. Rebuild the advanced index.');
        }
    }

    const engine = createEngine(index);
    const app = express();
    app.disable('x-powered-by');

    app.get('/search', (req, res) => {
        const query = readQuery(req);
        const limit = readInteger(req.query.limit, 10, 50, 'limit');
        const offset = readInteger(req.query.offset, 0, Number.MAX_SAFE_INTEGER, 'offset');
        let response;
        try {
            response = engine.search(query);
        } catch (error) {
            throw badRequest(error.message);
        }
        const results = response.results.slice(offset, offset + limit).map(result => ({
            ...result,
            title: result.title.replace(/\s+/g, ' ').trim(),
            snippet: makeSnippet(documentsById.get(result.id).content, query)
        }));
        res.json({ query, total: response.results.length, offset, limit, results, suggestions: response.suggestions });
    });

    app.get('/suggest', (req, res) => {
        const query = readQuery(req, { allowEmpty: true });
        // Complete the final word, leaving earlier query words intact in the UI.
        const prefix = query.match(/[a-z0-9]+$/i)?.[0] || '';
        res.json({ query, suggestions: prefix ? engine.complete(prefix) : [] });
    });

    app.get('/documents/:id', (req, res) => {
        if (!/^\d+$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) {
            throw badRequest('Document ID must be a non-negative integer.');
        }
        const document = documentsById.get(Number(req.params.id));
        if (!document) return res.status(404).json({ error: 'Document not found.' });
        res.json(document);
    });

    app.use(express.static(path.resolve(__dirname, '../../public')));
    app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
    app.use((error, req, res, next) => {
        const status = error.status === 400 ? 400 : 500;
        if (status === 500) console.error(error);
        res.status(status).json({ error: status === 500 ? 'Internal server error.' : error.message });
    });
    return app;
}

module.exports = createApp;
