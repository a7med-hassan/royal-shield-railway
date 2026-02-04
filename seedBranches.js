const mongoose = require("mongoose");
const Branch = require("./models/Branch");
require("dotenv").config();

const branches = [
    {
        branchName: "October",
        city: "October",
        branchCode: "O-G10",
        country: "Egypt",
        isActive: true
    },
    {
        branchName: "Madinet Nasr",
        city: "Cairo",
        branchCode: "M-G12",
        country: "Egypt",
        isActive: true
    }
];

const seedBranches = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB for Seeding");

        for (const data of branches) {
            const existing = await Branch.findOne({ branchCode: data.branchCode });
            if (!existing) {
                await Branch.create(data);
                console.log(`Created branch: ${data.branchName}`);
            } else {
                console.log(`Branch already exists: ${data.branchName}`);
            }
        }

        console.log("Seeding complete");
        process.exit(0);
    } catch (error) {
        console.error("Seeding error:", error);
        process.exit(1);
    }
};

seedBranches();
