const parsePage = require("./parser");

// Read the URL supplied after the script name.


async function fetchPage(url) {
    // fetch sends a GET request by default. Limit the wait to 10 seconds.
    const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: {
            'User-Agent': 'MiniSearchBot',
        },
        redirect: 'manual'
    });
    if (response.status < 400 && response.status >= 300) {
        return "redirect";
    }
    console.log("HTTP status:", response.status);

    // HTTP errors such as 404 do not automatically make fetch throw.
    if (!response.ok) {
        throw new Error(`Could not fetch page: HTTP ${response.status}`);
    }

    // Reading the response body is another asynchronous operation.
    const html = await response.text();
    return { html, url: response.url, contentType: response.headers.get('content-type') || '' };
}

async function main(url) {
    try {
        const page = await fetchPage(url);
        if (page === "redirect") {
            console.log(`Skipping redirect: ${url}`);
            return;
        }
        const result = parsePage(page.html, page.url);
        // console.log("Parsed document:");
        // console.log(result.document);
        // console.log("Discovered links:");
        // console.log(result.links);
    } catch (error) {
        console.error("Fetch failed:", error.message);
        process.exitCode = 1;
    }
}

if (require.main === module) {
    const url = process.argv[2];

    if (!url || !url.trim()) {
        console.error('Usage: node src/crawler/fetch-page.js "https://example.com"');
        process.exit(1);
    }
    main(url);
}

module.exports.fetchPage = fetchPage;