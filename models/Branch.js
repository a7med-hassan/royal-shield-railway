const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema({
    branchName: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    branchCode: {
        type: String,
        required: true,
        unique: true,
    },
    country: {
        type: String,
        required: true,
    },
    agentId: {
        type: String, // Optional, for tying to specific agent system IDs if needed later
        required: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

module.exports = mongoose.model("Branch", branchSchema);
