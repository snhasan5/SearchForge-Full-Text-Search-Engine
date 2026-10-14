const http = require('node:http');

const server = http.createServer((req, res) => {
    console.log(new Date().toISOString(), req.method, req.url);
    const pathName = new URL(req.url, "http://localhost:3000").pathname;

    if (pathName === '/robots.txt') {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(
            "User-agent: MiniSearchBot\n" +
            "Disallow: /private\n" +
            "Crawl-delay: 1\n"
        );
        return;
    }
    if (pathName === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
            `
		        <html>
		        <head><title>Home</title></head>
		        <body>
		            <h1>Welcome to our Node learning site</h1>
		                <a href="/about">About</a>
		                <a href="/about">About again</a>
		                <a href="/private">Private</a>
		                <a href="/redirect">Redirect</a>
		        </body>
		        </html>`
        )
        return;
    }
    if (pathName === '/about') {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(
            `
            <html>
                <head><title>About</title></head>
		        <body>
		            <p>We are learning to build a web crawler.</p>
		            <a href="/">Home</a>
		        </body>
		    </html>
            `
        )
        return;
    }
    if (pathName === '/redirect'){
		res.writeHead(302, { Location: "/destination" });
		res.end();
		return;
    }

    if (pathName === "/private" || pathname === "/destination") {
		console.log("UNEXPECTED REQUEST:", pathname);
		res.writeHead(200, { "Content-Type": "text/html" });
		res.end("<html><body>This should not be crawled.</body></html>");
		return;
	}
    else{
        	res.writeHead(404, { "Content-Type": "text/plain" });
	res.end("Not found");
    }
})

server.listen(3000, () => {
    console.log("Port is listening at port http://localhost:3000");

})