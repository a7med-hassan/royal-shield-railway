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
const ADMIN_EMAILS = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : ['ahmed_28x@outlook.com', 'royalnanoceramicwep@gmail.com'];

const { sendOtpEmail } = require("../utils/resendEmail");

router.get("/ping", (req, res) => {
    res.json({ message: "Branch OTP Service is working!", time: new Date() });
});


/*
 * POST /api/branch-otp/request
 * Input: branchCode, agentId (optional)
 * Logic: Validate branch, Generate OTP, Hash & Store, Send Email
 */
router.post("/request", async (req, res) => {
    try {
        const { branchCode } = req.body;

        if (!branchCode) {
            return res.status(400).json({ success: false, message: "Branch code is required" });
        }

        // 1. Validate Branch
        const branch = await Branch.findOne({ branchCode, isActive: true });
        if (!branch) {
            return res.status(404).json({ success: false, message: "Invalid or inactive branch code" });
        }

        // 2. Generate OTP (6 digits)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

        // 3. Store OTP Request
        const otpRequest = new OtpRequest({
            branchId: branch._id,
            branchCode: branch.branchCode,
            otpHash,
            expiresAt,
            status: 'pending'
        });
        await otpRequest.save();

        // 4. Send Email via Resend
        await sendOtpEmail(ADMIN_EMAILS, otp);

        res.json({
            success: true,
            message: "OTP sent to admins",
            requestId: otpRequest._id,
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
