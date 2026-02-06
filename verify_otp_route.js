const http = require('http');

console.log("Checking if backend is running...");

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/branch-otp/request',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
        console.log('No more data in response.');
        process.exit(0);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
    // If connection refused, try starting the server
    if (e.code === 'ECONNREFUSED') {
        console.log("Server not running. Please start the server with `npm start` first.");
        process.exit(1);
    }
});

// write data to request body
req.write(JSON.stringify({ branchCode: 'test' }));
req.end();
