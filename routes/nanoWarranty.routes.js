const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const NanoWarranty = require("../models/NanoWarranty");

const JWT_SECRET = process.env.SHIELD_SECRET_KEY || process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || "royal-shield-secret-2024";

// Ensure uploads/nano directory exists
const uploadDir = path.join(__dirname, "../uploads/nano");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

// Auth middleware
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: "Invalid token" });
    }
};

// Generate unique serial number
const generateSerial = () => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `NANO-${randomNum}`;
};

/*
 * POST /api/nano-warranties/activate
 * Activate Nano Warranty with image upload
 */
router.post("/activate", authMiddleware, upload.single("image"), async (req, res) => {
    try {
        let { name, phoneNumber, email, brand, model, color, address, plateNumber, productCode, otp } = req.body;

        if (!name || !phoneNumber || !otp) {
            return res.status(400).json({ success: false, message: "Name, phone number, and OTP are required" });
        }

        // Clean inputs
        phoneNumber = phoneNumber.toString().trim();
        otp = otp.toString().trim();

        // Generate unique serial
        let internalSerial = generateSerial();
        let exists = await NanoWarranty.findOne({ internalSerial });
        while (exists) {
            internalSerial = generateSerial();
            exists = await NanoWarranty.findOne({ internalSerial });
        }

        // Check if warranty already exists with this phone number and product code (optional logic, but good for data integrity)
        // For now, we proceed as designed.

        const nanoWarranty = new NanoWarranty({
            name,
            phoneNumber,
            email,
            brand,
            model,
            color,
            address,
            plateNumber,
            productCode,
            internalSerial,
            imagePath: req.file ? `uploads/nano/${req.file.filename}` : "",
            otp
        });

        await nanoWarranty.save();

        res.json({
            success: true,
            serial: internalSerial,
            message: "Warranty activated successfully",
        });
    } catch (error) {
        console.error("Nano Warranty Activation Error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

/*
 * GET /api/nano-warranties
 * Get all nano warranties (Admin)
 */
router.get("/", authMiddleware, async (req, res) => {
    try {
        const warranties = await NanoWarranty.find({}).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: warranties,
        });
    } catch (error) {
        console.error("Get Nano Warranties Error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

/*
 * DELETE /api/nano-warranties/:id
 * Delete nano warranty by ID or Internal Serial (Admin)
 */
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Attempting to delete Nano Warranty with ID/Serial: ${id}`);

        let warranty;

        // Check if id is a valid ObjectId
        if (mongoose.Types.ObjectId.isValid(id)) {
            warranty = await NanoWarranty.findByIdAndDelete(id);
        } else {
            // Try to delete by internalSerial
            warranty = await NanoWarranty.findOneAndDelete({ internalSerial: id });
        }

        if (!warranty) {
            console.warn(`Nano Warranty not found for deletion with ID/Serial: ${id}`);
            return res.status(404).json({ success: false, message: "Warranty not found" });
        }

        console.log(`Successfully deleted Nano Warranty: ${warranty.internalSerial} (${warranty._id})`);

        // Delete associated image if exists
        if (warranty.imagePath) {
            const imagePath = path.join(__dirname, "..", warranty.imagePath);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log(`Deleted associated image: ${imagePath}`);
            }
        }

        res.json({
            success: true,
            message: "Warranty deleted successfully",
        });
    } catch (error) {
        console.error("Delete Nano Warranty Error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

/*
 * POST /api/nano-warranties/check-status
 * Check warranty status by Phone + OTP
 */
router.post("/check-status", async (req, res) => {
    try {
        let { phoneNumber, otp } = req.body;

        if (!phoneNumber || !otp) {
            return res.status(400).json({ success: false, message: "Phone number and OTP are required" });
        }

        // Clean inputs
        const originalPhone = phoneNumber.toString().trim();
        const cleanOtp = otp.toString().trim();

        // Generate potential phone number formats
        const phoneFormats = [originalPhone];

        // If starts with +20, add version starting with 0
        if (originalPhone.startsWith("+20")) {
            phoneFormats.push("0" + originalPhone.substring(3));
        }
        // If starts with 20 (no +), add version starting with 0
        else if (originalPhone.startsWith("20")) {
            phoneFormats.push("0" + originalPhone.substring(2));
        }
        // If starts with 0, add +20
        else if (originalPhone.startsWith("0")) {
            phoneFormats.push("+20" + originalPhone.substring(1));
        }

        console.log(`Checking Nano Warranty. OTP: ${cleanOtp}. Phone formats to check: ${JSON.stringify(phoneFormats)}`);

        // Find warranty matching ANY of the phone formats AND the OTP
        const warranty = await NanoWarranty.findOne({
            phoneNumber: { $in: phoneFormats },
            otp: cleanOtp
        });

        if (!warranty) {
            console.warn(`Nano Warranty not found for Phone formats: ${JSON.stringify(phoneFormats)}, OTP: ${cleanOtp}`);
            return res.status(404).json({ success: false, message: "Warranty not found or invalid credentials" });
        }

        console.log(`Warranty found! ID: ${warranty._id}, Phone: ${warranty.phoneNumber}`);

        res.json({
            success: true,
            data: warranty
        });
    } catch (error) {
        console.error("Check Nano Warranty Error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
});

module.exports = router;
