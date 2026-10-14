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
