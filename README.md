# SearchForge-Full-Text-Search-Engine

A learning project with a crawler, HTML parser, tokenizer, and inverted-index search.

## Commands

Run from the project root:

```sh
npm install
npm run crawl -- "https://books.toscrape.com/"
npm run index
npm run search -- "book price"
npm run test:server
```

The crawler's configured attempt limit and robots rules still apply.

## Files

- `data/raw/`: original sample documents and crawled pages.
- `data/processed/`: documents with IDs and the saved inverted index.
- `src/crawler/`: crawler, parser, and reusable page fetcher.
- `src/index/`: tokenizer, index builder, and index-building command.
- `src/search/search.js`: indexed AND search.
- `src/search/linear-search.js`: original linear search for comparison.
- `tests/server.js`: local crawler test website, started separately from the crawler.
- `src/ranking/`, `src/search/queryParser.js`, and `src/api/server.js`: placeholders for future phases.
- `src/utils/`: reserved for shared helpers.

The local test website remains in `tests/`; the future search API has its own placeholder in `src/api/`.

## Phase E: advanced queries

```sh
npm install
npm run index:advanced
npm run search:advanced -- 'book AND price'
npm run search:advanced -- '"tipping the velvet"'
npm run search:advanced -- 'poetry OR travel'
npm run search:advanced -- 'book NOT poetry'
npm run search:advanced -- 'travle'
npm run search:advanced -- 'java*'
npm run search:advanced -- --complete java
npm run test:phase-e
```

Single quotes around the query preserve double quotes inside phrases in Git Bash and PowerShell.
Examples only match terms present in your collection. Typo suggestions are not automatically executed.

### Implementation

- `src/index/analyzer.js`: existing tokenizer, a five-word stop list, and library-based Porter stemming.
- `src/index/positionalIndex.js`: builds a stemmed positional index, field lengths, and an original-word vocabulary.
- `src/index/buildAdvancedIndex.js`: loads `newDocuments.json` and saves `data/processed/positional-index.json`.
- `src/search/queryParser.js`: your existing terms/phrases/operators parser.
- `src/search/advancedSearch.js`: Boolean evaluation, positional phrase matching, and BM25 ranking.
- `src/search/suggestions.js`: handwritten Levenshtein distance and original-word prefix completion.
- `src/search/advanced-search.js`: command-line input and result display.
- `tests/phase-e.test.js`: sample-data integration tests, independent of the crawled books.

The existing Phase C/D index and commands remain available. After crawling new data, run
`npm run index` followed by `npm run index:advanced` to refresh both index formats.

### Query rules

- Adjacent operands mean AND. Operators must be uppercase.
- Precedence is NOT, then AND, then OR. `node NOT react` means `node AND NOT react`.
- Unary NOT uses all indexed document IDs as its universe. Negative operands do not contribute to ranking.
- Parentheses and escaped quotes are unsupported; malformed expressions report errors.
- Ordinary unquoted queries ignore `the`, `a`, `an`, `of`, and `is`.
  Explicit Boolean expressions preserve these words as operands; quoted phrases always preserve them.
- All words are retained in the positional index. Positions start at zero and are separate for title and content.
  Phrases require consecutive stemmed tokens within a single field, preserving repeated words and stop words.
  Stemming means a phrase can match related word forms; matching is not byte-for-byte literal.
- A trailing `*` expands a prefix against original vocabulary words, then looks up their stems.
  Completion displays at most ten original words. Internal expansion includes all matching vocabulary terms.
- Unknown words get up to five suggestions within edit distance two, ordered by distance then spelling.
  Suggestions depend on vocabulary; this is a small-corpus implementation that scans vocabulary for suggestions.
- BM25 scores matching candidates using saved positions for term frequencies and saved document lengths.
  Query evaluation does not tokenize or scan document bodies. Ties use ascending numeric document ID.
- Stop-word-only ordinary queries return no results. Queries containing only NOT may return zero-score results.

Porter stemming is supplied by `@stdlib/nlp-porter-stemmer`; the rest of the Phase E retrieval logic is implemented here.

## Phase F: API and simple UI

```sh
npm start
# Open http://localhost:3000
npm test
```

Stop `npm run test:server` first if it is using port 3000. The API uses the existing
`data/processed/newDocuments.json` and `positional-index.json`. If those files are missing
or you have crawled new data, run `npm run index` and `npm run index:advanced`, then restart.

- `GET /search?q=travel&limit=10&offset=0`: BM25-ranked results, total count, snippets, and typo suggestions.
- `GET /suggest?q=trav`: up to ten vocabulary prefix completions for the final word.
- `GET /documents/10`: full saved document by ID.
- `GET /`: search UI with autocomplete, paging, typo buttons, and saved-document previews.

Try `poetry`, `travel`, `poetry OR travel`, `book NOT poetry`, and `"tipping the velvet"`.
This collection is books, so programming-related queries may have no matches.
Invalid queries return 400, missing documents 404, and zero-match searches 200.
Query length is capped at 300 characters, and result page size at 50.

Implementation: `src/api/app.js`, `src/api/server.js`, `src/api/snippet.js`, and `public/`.
Tests: `tests/phase-f.test.js`. Existing command-line search and ranking scripts remain available.

Read [the modular interview guide](docs/interview-guide.md) for Phases E/F, data flow,
algorithm explanations, design tradeoffs, questions and answers, and reference resources.
