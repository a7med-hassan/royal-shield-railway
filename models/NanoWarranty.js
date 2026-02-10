const mongoose = require("mongoose");

const nanoWarrantySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        required: true,
    },
    email: {
        type: String,
    },
    brand: {
        type: String,
    },
    model: {
        type: String,
    },
    color: {
        type: String,
    },
    address: {
        type: String,
    },
    plateNumber: {
        type: String,
    },
    productCode: {
        type: String,
    },
    internalSerial: {
        type: String,
        unique: true,
    },
    imagePath: {
        type: String,
    },
    otp: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("NanoWarranty", nanoWarrantySchema);
