const mongoose = require("mongoose");

const otpRequestSchema = new mongoose.Schema({
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        required: true,
    },
    branchCode: { // Stored for easier querying/logging
        type: String,
        required: true
    },
    otpHash: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    attempts: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['pending', 'verified', 'expired'],
        default: 'pending',
    },
}, { timestamps: true });

module.exports = mongoose.model("OtpRequest", otpRequestSchema);
