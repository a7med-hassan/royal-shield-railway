const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Branch = require("../models/Branch");
const OtpRequest = require("../models/OtpRequest");

// Config
const JWT_SECRET = process.env.SHIELD_SECRET_KEY || process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || "royal-shield-secret-2024";
const OTP_EXPIRY_MINUTES = 5;
const OTP_EXPIRY_MS = OTP_EXPIRY_MINUTES * 60 * 1000;

const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper: Parse JSON from Env
function parseJsonEnv(name, fallback = {}) {
    try {
        return JSON.parse(process.env[name] || '') || fallback;
    } catch {
        return fallback;
    }
}

const branchConfig = parseJsonEnv('BRANCH_CONFIG_JSON', {});

// Helper: Build OTP Email
function buildOtpEmail({ otp, branchName, branchCode }) {
    const subject = `Your Warranty Activation OTP – ${branchName} | Royal Shield World`;

    const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6;">
        <h2 style="margin:0 0 6px 0;">Warranty Activation OTP</h2>

        <p style="margin: 0 0 10px 0; color:#555;">
        Branch: <strong>${branchName}</strong> (<strong>${branchCode}</strong>)
        </p>

        <p>
        This is your One-Time Password (OTP) to activate the warranty from
        <strong>Royal Shield World</strong>.
        </p>

        <div style="
        font-family: 'Courier New', Courier, monospace;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: 2px;
        padding: 12px 16px;
        display: inline-block;
        border: 1px solid #d4af37;
        border-radius: 10px;
        background: #0b1a2a;
        color: #f3d68a;
        margin: 12px 0 16px 0;
        ">
        ${otp}
        </div>

        <p style="margin: 0 0 8px 0;">
        This code is valid for <strong>5 minutes</strong>. For security reasons, do not share this code with anyone.
        </p>

        <p style="margin-top: 18px;">
        — <strong>Royal Shield World</strong>
        </p>
    </div>`;

    return { subject, html };
}

router.get("/ping", (req, res) => {
    res.json({ message: "Branch OTP Service is working!", time: new Date() });
});


/*
 * POST /api/branch-otp/request
 * Input: branchCode
 * Logic: Validate branch, Generate OTP, Hash & Store, Send Email
 */
router.post("/request", async (req, res) => {
    try {
        const { branchCode } = req.body;

        if (!branchCode) {
            return res.status(400).json({ success: false, message: "Branch code is required" });
        }

        // 1. Validate Branch using Config (Emails)
        const cfg = branchConfig[branchCode];
        if (!cfg || !Array.isArray(cfg.emails) || cfg.emails.length !== 3) {
            return res.status(404).json({ message: 'Branch code not configured' });
        }

        // 2. Validate Branch in DB (for ID and foreign key)
        const branch = await Branch.findOne({ branchCode, isActive: true });
        if (!branch) {
            return res.status(404).json({ success: false, message: "Invalid or inactive branch code in DB" });
        }

        // 3. Generate OTP (6 digits)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

        // 4. Store OTP Request
        const otpRequest = new OtpRequest({
            branchId: branch._id,
            branchCode: branch.branchCode,
            otpHash,
            expiresAt,
            status: 'pending'
        });
        await otpRequest.save();

        // 5. Send Email via Resend
        const branchName = cfg.name || branch.branchName || branchCode;
        const { subject, html } = buildOtpEmail({ otp, branchName, branchCode });

        await resend.emails.send({
            from: process.env.RESEND_FROM,
            to: cfg.emails,
            subject,
            html
        });

        res.json({
            success: true,
            message: "OTP sent to branch emails",
            requestId: otpRequest._id,
            branchName: branchName,
            expiresIn: OTP_EXPIRY_MINUTES * 60
        });

    } catch (error) {
        console.error("OTP Request Error:", error);
        res.status(500).json({ success: false, message: "Server error during OTP request", error: error.message });
    }
});

/*
 * POST /api/branch-otp/verify
 * Input: requestId, otp
 * Logic: Find Request, Check Expiry, Check Attempts, Verify Hash, Return Token
 */
router.post("/verify", async (req, res) => {
    try {
        const { requestId, otp } = req.body;

        if (!requestId || !otp) {
            return res.status(400).json({ success: false, message: "Request ID and OTP are required" });
        }

        const otpReq = await OtpRequest.findById(requestId).populate('branchId'); // Populate to get branch details for token
        if (!otpReq) {
            return res.status(404).json({ success: false, message: "Invalid Request ID" });
        }

        // Check Status
        if (otpReq.status !== 'pending') {
            return res.status(400).json({ success: false, message: "OTP already used or expired" });
        }

        // Check Expiry
        if (new Date() > otpReq.expiresAt) {
            otpReq.status = 'expired';
            await otpReq.save();
            return res.status(400).json({ success: false, message: "OTP has expired" });
        }

        // Check Attempts (Limit 3)
        if (otpReq.attempts >= 3) {
            otpReq.status = 'expired';
            await otpReq.save();
            return res.status(400).json({ success: false, message: "Too many failed attempts" });
        }

        // Verify OTP
        const isMatch = await bcrypt.compare(otp, otpReq.otpHash);
        if (!isMatch) {
            otpReq.attempts += 1;
            await otpReq.save();
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        // Success
        otpReq.status = 'verified';
        await otpReq.save();

        // Generate Short-lived Token (10-15 mins) for Warranty Activation Form
        const token = jwt.sign(
            {
                branchId: otpReq.branchId._id,
                branchCode: otpReq.branchId.branchCode,
                branchName: otpReq.branchId.branchName,
                requestId: otpReq._id,
                purpose: 'warranty_activation'
            },
            JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.json({
            success: true,
            message: "OTP verified successfully",
            verifiedToken: token
        });

    } catch (error) {
        console.error("OTP Verify Error:", error);
        res.status(500).json({ success: false, message: "Server error during verification", error: error.message });
    }
});

module.exports = router;
