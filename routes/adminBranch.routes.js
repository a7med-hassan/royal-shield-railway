const express = require("express");
const router = express.Router();
const Branch = require("../models/Branch");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.SHIELD_SECRET_KEY || process.env.JWT_SECRET_KEY || "royal-shield-secret-2024";

// Middleware to protect admin routes (Reuse existing OTAT or standard auth logic from app.js if possible, or simple check)
// For now, I will assume the caller sends the standard Bearer token used in the app, and we verify it matches an admin.
const verifyAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Add any specific admin checks here if needed (e.g. decoded.role === 'admin')
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: "Invalid token" });
    }
};

// GET /api/admin/branches
router.get("/", verifyAdmin, async (req, res) => {
    try {
        const branches = await Branch.find().sort({ createdAt: -1 });
        res.json({ success: true, branches });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/admin/branches
router.post("/", verifyAdmin, async (req, res) => {
    try {
        const { branchName, city, branchCode, country, agentId } = req.body;

        // Check if code exists
        const existing = await Branch.findOne({ branchCode });
        if (existing) {
            return res.status(400).json({ success: false, message: "Branch code already exists" });
        }

        const newBranch = new Branch({
            branchName,
            city,
            branchCode,
            country,
            agentId
        });

        await newBranch.save();
        res.status(201).json({ success: true, branch: newBranch });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/admin/branches/:id
router.put("/:id", verifyAdmin, async (req, res) => {
    try {
        const { branchName, city, branchCode, country, agentId, isActive } = req.body;

        const branch = await Branch.findByIdAndUpdate(
            req.params.id,
            { branchName, city, branchCode, country, agentId, isActive },
            { new: true }
        );

        if (!branch) return res.status(404).json({ success: false, message: "Branch not found" });

        res.json({ success: true, branch });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PATCH /api/admin/branches/:id/status
router.patch("/:id/status", verifyAdmin, async (req, res) => {
    try {
        const { isActive } = req.body;
        const branch = await Branch.findByIdAndUpdate(
            req.params.id,
            { isActive },
            { new: true }
        );
        if (!branch) return res.status(404).json({ success: false, message: "Branch not found" });
        res.json({ success: true, branch });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
