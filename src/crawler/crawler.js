const fs = require('fs/promises');
const { fetchPage } = require('./fetch-page')
const parsePage = require('./parser')
const { setTimeout } = require('node:timers/promises');
const robotsParser = require('robots-parser');
const path = require('path');
try {
    const query = process.argv[2];
    if (!query || !query.trim()) {
        console.log("Please seed a URL ");
        process.exit(1);
    }
    const ATTEMPTS = parseInt(process.argv[3],10);
if (!ATTEMPTS || !Number.isInteger(ATTEMPTS)) {
    console.log("Please enter a valid integer");
    process.exit(1);
}

// Step 2: Now that we know it's a safe integer, check the upper boundary
if (ATTEMPTS > 100) {
    console.log("Must enter value below 100");
    process.exit(1);
}
    let count = 0;
    const startingURL = new URL(query);
    startingURL.hash = "";
    if (!['http:', 'https:'].includes(startingURL.protocol)) {
        throw new Error("Use an HTTP or HTTPS URL");
    }

    async function updateDocument(document) {
        const data = JSON.stringify(document);
        const filePath = path.join(__dirname,'../../data/raw/crawled-documents.json');
        await fs.writeFile(filePath, data);
        console.log("The document has been updated!");
    }

    async function crawler() {
        try {

            const robotURL = new URL('/robots.txt', startingURL);
            const robotRes = await fetch(robotURL, {
                signal: AbortSignal.timeout(10000),
                headers: {
                    'User-Agent': 'MiniSearchBot'
                },
                redirect: 'manual'
            });
            console.log(robotRes.status);
            if (robotRes.status >= 300 && robotRes.status < 400) {
                throw new Error("Robots request redirected; rules couldn't be loaded");
            }
            let robotText = undefined;
            if (robotRes.ok) {
                robotText = await robotRes.text();
            } else if (robotRes.status === 404) {
                robotText = '';
            } else {
                throw new Error(`HTTP Error: ${robotRes.status} --- ${robotRes.statusText}`);
            }
            let robots = robotsParser(robotURL.href, robotText);
            // console.log(robots.isAllowed(startingURL.href, 'MiniSearchBot'));
            const robotDelay = robots.getCrawlDelay('MiniSearchBot');
            const queue = [startingURL.href];
            const set = new Set();
            set.add(startingURL.href);
            const document = [];
            while (queue.length != 0 && count < ATTEMPTS) {
                let url = queue.shift();
                try {
                    if (robots.isAllowed(url, 'MiniSearchBot')) {
                        count++;
                        const delay = Math.max((robotDelay || 0) * 1000, 1000);
                        await setTimeout(delay);
                        const page = await fetchPage(url);
                        if (page === "redirect") {
                            console.log(`this ${url} was skipped due to redirect--- `);
                            continue;
                        }
                        if (!page.contentType.toLowerCase().includes("text/html")) {
                            console.log("Skipping non-HTML response");
                            continue;
                        }
                        const result = parsePage(page.html, page.url);
                        for (const link of result.links) {
                            const discoveredURL = new URL(link);
                            if (
                                !["http:", "https:"].includes(discoveredURL.protocol) ||
                                discoveredURL.origin !== startingURL.origin
                            ) {
                                continue;
                            }
                            if (!set.has(link)) {
                                queue.push(link);
                                set.add(link);
                            }
                        }
                        
                        document.push({
                            ... result.document
                        })
                       
                        console.log(`Completed fetch number ${count}`);
                    }
                    else console.log(`this ${url} was skipped----`);
                } catch (error) {
                    console.error("Fetch failed:", error.message);
                    process.exitCode = 1;
                }
            }
             await updateDocument(document);
            console.log("attemps :", count);
        } catch (error) {
            console.log(error.message);
            process.exitCode = 1;

        }

    }

    crawler();
}
catch (error) {
    console.log(error.message);
    process.exitCode = 1;
}

