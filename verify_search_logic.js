const mongoose = require('mongoose');
const fs = require('fs');
const util = require('util');
require('dotenv').config();
const Warranty = require('./models/warranty');
const Product = require('./models/product');

const logFile = fs.createWriteStream('verify_log.txt', { flags: 'w' });
const logStdout = process.stdout;

console.log = function (d) { //
    logFile.write(util.format(d) + '\n');
    logStdout.write(util.format(d) + '\n');
};

console.error = function (d) { //
    logFile.write(util.format(d) + '\n');
    logStdout.write(util.format(d) + '\n');
};

async function verifySearch() {
    try {
        console.log("Connecting to Database...");
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI not found in environment variables");
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected.");

        // 1. Create a dummy warranty for testing
        const testInternalSerial = "TEST-INT-SERIAL-123";
        const testPhoneNumber = "01099999999";
        const testProductCode = "TEST-PROD-123";

        // Cleanup if exists
        await Warranty.deleteMany({ internalSerial: testInternalSerial });
        await Product.deleteMany({ code: testProductCode });

        // Create dummy Product
        const product = new Product({
            name: "Test Product Shield",
            price: 1000,
            categorie: "Test Cat",
            code: testProductCode
        });
        await product.save();
        console.log("Dummy Product created.");

        // Create dummy Warranty
        const warranty = new Warranty({
            name: "Test User",
            phoneNumber: testPhoneNumber,
            internalSerial: testInternalSerial,
            productCode: testProductCode,
            brand: "TestBrand",
            model: "TestModel"
        });
        await warranty.save();
        console.log("Dummy Warranty created.");

        // 2. Perform the Search Logic (as implemented in app.js)
        console.log("\n--- Testing Search Logic ---");
        const foundWarranty = await Warranty.findOne({
            internalSerial: testInternalSerial,
            phoneNumber: testPhoneNumber
        });

        if (foundWarranty) {
            console.log("✅ Warranty Found!");

            let productName = "Unknown Product";
            if (foundWarranty.productCode) {
                const foundProduct = await Product.findOne({ code: foundWarranty.productCode });
                if (foundProduct) {
                    productName = foundProduct.name;
                }
            }

            const responseData = {
                name: foundWarranty.name,
                phoneNumber: foundWarranty.phoneNumber,
                email: foundWarranty.email || "",
                address: foundWarranty.address || "",
                brand: foundWarranty.brand || "",
                model: foundWarranty.model || "",
                productCode: foundWarranty.productCode,
                productName: productName,
                internalSerial: foundWarranty.internalSerial,
                createdAt: foundWarranty.createdAt,
                warrantyDuration: "5 Years"
            };

            console.log("Response Data Preview:", JSON.stringify(responseData, null, 2));

            if (responseData.internalSerial === testInternalSerial && responseData.phoneNumber === testPhoneNumber) {
                console.log("✅ Data matches expected values.");
            } else {
                console.log("❌ Data mismatch!");
            }

        } else {
            console.log("❌ Warranty NOT Found!");
        }

        // 3. Cleanup
        console.log("\n--- Cleaning up ---");
        await Warranty.deleteMany({ internalSerial: testInternalSerial });
        await Product.deleteMany({ code: testProductCode });
        console.log("Cleanup done.");

    } catch (err) {
        console.error("Error: " + err);
        console.error("Stack: " + err.stack);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
    }
}

verifySearch();
