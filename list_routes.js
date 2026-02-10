const express = require('express');
const app = require('./app'); // Import the app instance

// Function to print all routes
function printRoutes(stack, basePath = '') {
    stack.forEach(middleware => {
        if (middleware.route) { // routes registered directly on the app
            Object.keys(middleware.route.methods).forEach(method => {
                console.log(`${method.toUpperCase()} ${basePath}${middleware.route.path}`);
            });
        } else if (middleware.name === 'router') { // router middleware
            // router middleware has a regexp to match the path, we can try to extract the base path
            // This part is tricky as express regexps are complex. 
            // For simple cases:
            let newBasePath = basePath;
            if (middleware.regexp) {
                const match = middleware.regexp.toString().match(/^\/\^\\(\/.*?)\\\/\?/);
                if (match) {
                    newBasePath += match[1].replace(/\\/g, '');
                }
            }

            // We can also just look at how it was mounted in app.js
            // But let's try to inspect the handle
            printRoutes(middleware.handle.stack, newBasePath);
        }
    });
}

console.log("Registered Routes:");
// Start inspecting from the main router stack
if (app._router && app._router.stack) {
    printRoutes(app._router.stack);
} else {
    console.log("Could not access app._router.stack. Attempting to start server and print...");
    // If app is not exported with routes loaded (it should be based on previous file reads), 
    // we might need a different approach.
    // Let's just try to infer from app.js content we read earlier.
}
