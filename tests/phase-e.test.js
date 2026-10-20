const test = require('node:test');
const assert = require('node:assert/strict');
const analyze = require('../src/index/analyzer');
const build = require('../src/index/positionalIndex');
const createEngine = require('../src/search/advancedSearch');
const parse = require('../src/search/queryParser');
const { editDistance } = require('../src/search/suggestions');

const documents = [
    { id: 10, title: '', content: 'node authentication connected machine learning the office' },
    { id: 20, title: '', content: 'node postgres connecting machine deep learning' },
    { id: 30, title: '', content: 'python react javascript office' },
    { id: 40, title: 'machine', content: 'learning' },
    { id: 50, title: '', content: 'node node java javadoc' }
];
const engine = createEngine(build(documents));
const ids = query => engine.search(query).results.map(result => result.id).sort((a, b) => a - b);

test('analyzer uses shared stemming and optional stop words', () => {
    assert.deepEqual(analyze('The connected servers'), ['connect', 'server']);
    assert.deepEqual(analyze('The connected servers', { removeStopWords: false }), ['the', 'connect', 'server']);
    assert.deepEqual(analyze('connected'), analyze('connecting'));
    assert.deepEqual(analyze(''), []);
});

test('parser preserves syntax and rejects bad quotes and parentheses', () => {
    assert.deepEqual(parse('"research AND development"'), [{type:'phrase',value:'research AND development'}]);
    for (const query of ['"unfinished', '""', '"  "', '(node)']) assert.throws(() => parse(query));
});

test('positions preserve repeats and stop words', () => {
    const index = build([{id:1,title:'',content:'node the node'}]);
    assert.deepEqual(index.postings.node[0].content, [0,2]);
    assert.deepEqual(index.postings.the[0].content, [1]);
});

test('implicit AND, explicit operators, and precedence', () => {
    assert.deepEqual(ids('node authentication'), [10]);
    assert.deepEqual(ids('node AND postgres'), [20]);
    assert.deepEqual(ids('node NOT react'), [10,20,50]);
    assert.deepEqual(ids('node OR python'), [10,20,30,50]);
    assert.deepEqual(ids('python OR node AND postgres'), [20,30]);
    assert.deepEqual(ids('NOT node'), [30,40]);
    assert.deepEqual(ids('NOT NOT node'), [10,20,50]);
});

test('phrases require adjacency in one field and handle repeated terms', () => {
    assert.deepEqual(ids('"machine learning"'), [10]);
    assert.deepEqual(ids('"the office"'), [10]);
    assert.deepEqual(ids('"node node"'), [50]);
    assert.deepEqual(ids('"learning machine"'), []);
    assert.deepEqual(ids('"machine learning" OR postgres'), [10,20]);
});

test('stop-word policy and stemming', () => {
    assert.deepEqual(ids('the node'), [10,20,50]);
    assert.deepEqual(ids('the AND node'), [10]);
    assert.deepEqual(ids('connecting'), [10,20]);
    assert.deepEqual(ids('the'), []);
});

test('unknown terms give suggestions without changing query', () => {
    const result = engine.search('authentcation');
    assert.equal(result.results.length, 0);
    assert.ok(result.suggestions[0].alternatives.includes('authentication'));
    assert.equal(editDistance('javscript', 'javascript'), 1);
    assert.equal(editDistance('kitten', 'sitting'), 3);
    assert.equal(editDistance('', 'node'), 4);
});

test('prefix completion and prefix search', () => {
    assert.deepEqual(engine.complete('java'), ['java','javadoc','javascript']);
    assert.deepEqual(ids('java*'), [30,50]);
    assert.throws(() => engine.search('ja*va'));
});

test('empty collection and malformed Boolean syntax', () => {
    assert.deepEqual(createEngine(build([])).search('node').results, []);
    assert.deepEqual(ids(''), []);
    for (const query of ['AND node', 'node OR', 'node AND OR react', 'NOT']) {
        assert.throws(() => engine.search(query));
    }
    assert.throws(() => build([{id:1},{id:1}]));
});

test('BM25 results are finite, descending, and exclude negated scoring terms', () => {
    const results = engine.search('node OR python').results;
    assert.ok(results.every(result => Number.isFinite(result.score)));
    for (let i = 1; i < results.length; i++) assert.ok(results[i-1].score >= results[i].score);
    const positive = engine.search('node').results;
    assert.deepEqual(engine.search('node NOT react').results, positive);
});
