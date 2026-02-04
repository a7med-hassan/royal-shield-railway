const fetch = require('node-fetch'); // Make sure to npm install node-fetch if on older Node
// If node-fetch is not available, you can use built-in fetch in Node 18+

const BASE_URL = 'http://localhost:3000'; // Change port if needed
const BRANCH_CODE = 'O-G10'; // Seeded branch
const ADMIN_EMAIL_TO_CHECK = 'ahmed_28x@outlook.com'; // For verification (manual)

async function testBackend() {
    console.log("=== Testing Branch OTP Backend Flow ===");

    // Check if server is running (basic check)
    try {
        await fetch(BASE_URL);
    } catch (e) {
        console.error("Error: Could not connect to server. Make sure 'node app.js' is running.");
        console.error("If running locally without .env, ensure MONGO_URI is set or logic is adjusted.");
        return;
    }

    // 1. Request OTP
    console.log("\n1. Requesting OTP...");
    let requestId = null;
    try {
        const res = await fetch(`${BASE_URL}/api/branch-otp/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ branchCode: BRANCH_CODE })
        });
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", data);

        if (data.success) {
            requestId = data.requestId;
            console.log("✅ OTP Request Successful. ID:", requestId);
            console.log("👉 ACTION REQUIRED: Check admin email/logs for OTP.");
        } else {
            console.error("❌ OTP Request Failed");
            return;
        }
    } catch (e) {
        console.error("Error requesting OTP:", e.message);
        return;
    }

    // 2. Verify OTP (Interactive or Mock)
    if (requestId) {
        console.log("\n2. Verify OTP");
        console.log("Since we cannot read email automatically here, you must verify manually via Postman or Curl with the OTP you received.");
        console.log(`Command: curl -X POST ${BASE_URL}/api/branch-otp/verify -H "Content-Type: application/json" -d '{"requestId": "${requestId}", "otp": "YOUR_OTP"}'`);
    }

    // 3. Admin Branch CRUD (Test Auth)
    console.log("\n3. Testing Admin Branch List (Unauthorized)");
    try {
        const res = await fetch(`${BASE_URL}/api/admin/branches`);
        console.log("Status (should be 401/403):", res.status);
    } catch (e) {
        console.log("Error testing admin:", e.message);
    }
}

// Check for Environment
if (!process.env.MONGO_URI && !process.env.SMTP_USER) {
    console.warn("⚠️  WARNING: Environment variables (MONGO_URI, SMTP_USER) seem missing.");
    console.warn("   Backend functionality might fail if not running in a configured environment.");
}

testBackend();
