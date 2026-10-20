const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const createApp = require('../src/api/app');
const build = require('../src/index/positionalIndex');
const makeSnippet = require('../src/api/snippet');

const documents = [
    {id:10,title:'Node Authentication',url:'https://example.com/node',content:'Learn node authentication and connected servers.'},
    {id:20,title:'Postgres Guide',url:'https://example.com/postgres',content:'Postgres authentication with node and connecting clients.'},
    {id:30,title:'React Guide',url:'https://example.com/react',content:'React javascript interfaces.'}
];

test('HTTP API, validation, document lookup, and static UI', async t => {
    const app = createApp({documents, index:build(documents)});
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
        server.closeAllConnections();
    }));
    const base = `http://127.0.0.1:${server.address().port}`;
    async function json(url, status = 200) {
        const response = await fetch(base + url);
        assert.equal(response.status, status, url);
        assert.match(response.headers.get('content-type'), /application\/json/);
        return response.json();
    }

    const result = await json('/search?q=node%20authentication');
    assert.equal(result.query, 'node authentication');
    assert.equal(result.total, 2);
    assert.ok(result.results.every(row => row.title && row.url && row.snippet && Number.isFinite(row.score)));
    assert.ok(result.results[0].score >= result.results[1].score);
    const page = await json('/search?q=node&limit=1&offset=1');
    assert.equal(page.total,2);
    assert.equal(page.results.length,1);
    assert.equal((await json('/search?q=node&offset=99')).results.length,0);
    assert.equal((await json('/search?q=%22postgres%20authentication%22')).total,1);
    assert.equal((await json('/search?q=node%20NOT%20postgres')).total,1);
    assert.equal((await json('/search?q=zzzzunknown')).total,0);
    const typo = await json('/search?q=authentcation');
    assert.ok(typo.suggestions[0].alternatives.includes('authentication'));
    assert.deepEqual((await json('/suggest?q=no')).suggestions,['node']);
    assert.deepEqual((await json('/suggest?q=postgres%20no')).suggestions,['node']);
    assert.deepEqual((await json('/suggest?q=')).suggestions,[]);
    assert.deepEqual(await json('/documents/20'), documents[1]);
    await json('/documents/999',404);
    for (const url of ['/search','/search?q=','/search?q=a&q=b','/search?q=%22unfinished',
        '/search?q=node%20OR','/search?q=node&limit=0','/search?q=node&offset=-1',
        '/search?q=node&limit=51','/suggest','/documents/hello','/documents/1.5',
        `/search?q=${'x'.repeat(301)}`]) await json(url,400);
    await json('/no-such-route',404);

    for (const [url,pattern] of [['/',/MySearch/],['/app.js',/runSearch/],['/style.css',/search-bar/]]) {
        const response = await fetch(base + url);
        assert.equal(response.status,200);
        assert.match(await response.text(),pattern);
    }
    const traversal = await fetch(base + '/data/processed/newDocuments.json');
    assert.equal(traversal.status,404);
});

test('snippet is bounded plain text and empty content is supported', () => {
    const snippet = makeSnippet('filler '.repeat(100) + 'authentication explained ' + 'tail '.repeat(100), 'authentication');
    assert.ok(snippet.includes('authentication'));
    assert.ok(snippet.length <= 222);
    assert.equal(makeSnippet('', 'node'),'');
    assert.equal(makeSnippet('<script>alert(1)</script>', 'node'),'<script>alert(1)</script>');
});

test('startup rejects mismatched data', () => {
    assert.throws(() => createApp({documents:documents.slice(1),index:build(documents)}),/mismatch/);
});
