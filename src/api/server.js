const createApp = require('./app');

function start() {
    const port = Number(process.env.PORT || 3000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('PORT must be an integer between 1 and 65535.');
    }
    const server = createApp().listen(port, 'localhost', () => {
        console.log(`MySearch is ready at http://localhost:${port}`);
        console.log('Search data is loaded once. Restart after rebuilding the index.');
    });
    server.on('error', error => {
        console.error(error.code === 'EADDRINUSE'
            ? `Port ${port} is in use. Stop the local test server or choose another PORT.`
            : error.message);
        process.exitCode = 1;
    });
    return server;
}

if (require.main === module) {
    try { start(); } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}

module.exports = start;
