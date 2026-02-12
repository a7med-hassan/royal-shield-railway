const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const JWT_SECRET_KEY = process.env.SHIELD_SECRET_KEY || process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || "royal-shield-secret-2024";
const nodemailer = require("nodemailer");
require("dotenv").config();
const multer = require("multer");

const path = require("path");

const app = express();

app.use(express.json());
app.use(cors({
  origin: [
    "https://www.royalnanoceramic.com",
    "https://royalnanoceramic.com",      // بدون www
    "https://royalshieldworld.com",
    "https://www.royalshieldworld.com",  // بدون www
    "http://localhost:4200"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Origin", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser support
}));

// Trusted Origins Middleware - حل ذكي للمواقع الموثوقة
const allowedOrigins = [
  "https://www.royalnanoceramic.com",
  "https://royalnanoceramic.com",
  "https://royalshieldworld.com",
  "https://www.royalshieldworld.com",
  "http://localhost:4200"
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // لو الطلب جاي من دومين موثوق → متطلبش توكن
  if (allowedOrigins.includes(origin)) {
    console.log("✅ Trusted origin:", origin);
    return next();
  }

  // لو مش من دومين موثوق → فعّل الحماية العادية
  if (!req.headers.authorization) {
    console.log("❌ Unauthorized access from:", origin);
    return res.status(403).json({ message: "Invalid token" });
  }

  // ممكن تضيف هنا كود التحقق من التوكن (لو حابب)
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const branchOtpRoutes = require("./routes/branchOtp.routes");
const adminBranchRoutes = require("./routes/adminBranch.routes");
const warrantyNewRoutes = require("./routes/warrantyNew.routes");
const nanoWarrantyRoutes = require("./routes/nanoWarranty.routes");

app.use("/api/branch-otp", branchOtpRoutes);
app.use("/api/admin/branches", adminBranchRoutes);
app.use("/api/warranty", warrantyNewRoutes);
app.use("/api/nano-warranties", nanoWarrantyRoutes);

const Warranty = require("./models/warranty");
const Serial = require("./models/serial");
const Product = require("./models/product");
const Offer = require("./models/offer");
const Admin = require("./models/admin");
const Appointment = require("./models/appointment");
const Application = require("./models/application");
const Blog = require("./models/blog");

mongoose
  .connect(`${process.env.MONGO_URI}`)
  .then(() => {
    console.log("db connected succefully");
  })
  .catch(() => {
    console.log("err connecting DB");
  });

/* admin add or delete serialss */
app.get("/", (req, res) => res.send("Hello World!"));

// Test endpoint for multiple sites
app.get("/api/test", (req, res) => {
  res.json({
    message: "Royal Shield Backend is working!",
    timestamp: new Date().toISOString(),
    origin: req.headers.origin,
    userAgent: req.headers['user-agent'],
    trustedOrigin: allowedOrigins.includes(req.headers.origin)
  });
});

// Test endpoint for trusted origins
app.get("/api/trusted-test", (req, res) => {
  const origin = req.headers.origin;
  const isTrusted = allowedOrigins.includes(origin);

  res.json({
    message: isTrusted ? "✅ Trusted Origin Access" : "❌ Untrusted Origin",
    origin: origin,
    isTrusted: isTrusted,
    timestamp: new Date().toISOString()
  });
});

// Admin route with OTAT (One-Time Access Token) authentication
app.get("/admin", async (req, res, next) => {
  const otat = req.query.otat;
  if (!otat) return next();

  try {
    const decoded = jwt.verify(otat, JWT_SECRET_KEY);
    if (decoded.purpose !== "shield_access") return res.redirect("/admin/login");

    // إنشاء session مؤقت
    req.session = req.session || {};
    req.session.user = {
      id: decoded.id,
      username: decoded.username,
      fromNano: true
    };

    // الدخول مباشرة إلى لوحة التحكم
    return res.redirect("/admin/serials");
  } catch (err) {
    console.error("Invalid OTAT:", err.message);
    return res.redirect("/admin/login");
  }
});

// POST /api/auth/verify-otat - Verify OTAT token
app.post("/api/auth/verify-otat", async (req, res) => {
  const { otat } = req.body;

  if (!otat) {
    return res.status(400).json({
      success: false,
      message: "OTAT token is required"
    });
  }

  try {
    const decoded = jwt.verify(otat, JWT_SECRET_KEY);

    // Check token type
    if (decoded.type !== "shield-access") {
      return res.status(403).json({
        success: false,
        message: "Invalid token type"
      });
    }

    // Return user information
    return res.json({
      success: true,
      user: {
        id: decoded.id,
        username: decoded.username,
        type: decoded.type,
        purpose: decoded.purpose
      }
    });
  } catch (err) {
    console.error("OTAT verification error:", err.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired OTAT"
    });
  }
});
app.post("/addSerial", async (req, res) => {
  const { productCode, internalSerial, branch } = req.body;

  try {
    // التحقق من وجود الحقول المطلوبة
    if (!productCode || !internalSerial) {
      return res.status(400).send({ msg: "Product code and internal serial are required" });
    }

    if (!branch) {
      return res.status(400).send({ msg: "No branch has been added" });
    }

    // التحقق من عدم تكرار productCode
    const existingProductCode = await Serial.findOne({ productCode });
    if (existingProductCode) {
      return res.status(400).send({ msg: "Product code already exists" });
    }

    // التحقق من عدم تكرار internalSerial
    const existingInternalSerial = await Serial.findOne({ internalSerial });
    if (existingInternalSerial) {
      return res.status(400).send({ msg: "Internal serial already exists" });
    }

    // إنشاء السيريال الجديد
    const newSerial = new Serial({
      productCode,
      internalSerial,
      branch,
      serialNumber: productCode, // للحفاظ على التوافق مع الكود القديم
    });

    await newSerial.save();
    const serials = await Serial.find({});
    res.status(201).send({ msg: "success", serials: serials });
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.post("/deleteSerial", async (req, res) => {
  console.log(req.body);
  const { serialNumber, productCode } = req.body;
  const codeToDelete = productCode || serialNumber;

  if (!codeToDelete) {
    return res.status(400).send({ msg: "Serial number or product code is required" });
  }

  try {
    const deletedSerial = await Serial.findOneAndDelete({
      $or: [
        { productCode: codeToDelete },
        { serialNumber: codeToDelete }
      ]
    });

    console.log(deletedSerial);
    if (!deletedSerial) {
      return res.status(404).send("Serial not found");
    }

    // حذف الضمان المرتبط إذا كان موجوداً
    await Warranty.deleteMany({
      $or: [
        { productCode: codeToDelete },
        { serialNumber: codeToDelete }
      ]
    });

    const serial = await Serial.find({});
    res.status(200).send({ msg: "success", serial: serial });
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

app.post("/updateBranch", async (req, res) => {
  const { serialNumber, branch } = req.body;

  if (!serialNumber || !branch) {
    return res
      .status(400)
      .send({ msg: "Serial number and branch are required" });
  }

  try {
    const updatedSerial = await Serial.findOneAndUpdate(
      {
        $or: [
          { serialNumber: serialNumber },
          { productCode: serialNumber }
        ]
      },
      { branch },
      { new: true }
    );

    if (!updatedSerial) {
      return res.status(404).send({ msg: "Serial not found" });
    }

    // Fetch all serials, maintaining the order
    const serials = await Serial.find({}).sort({ _id: 1 });

    res.status(200).send({ msg: "Branch updated successfully", serials });
  } catch (error) {
    res
      .status(500)
      .send({ msg: "Error updating branch", error: error.message });
  }
});

// Update serial - تحديث السيريال (productCode, internalSerial, branch)
app.put("/updateSerial", async (req, res) => {
  const { serialId, productCode, internalSerial, branch } = req.body;

  if (!serialId) {
    return res.status(400).send({ msg: "Serial ID is required" });
  }

  try {
    const updateData = {};
    if (productCode) updateData.productCode = productCode;
    if (internalSerial) updateData.internalSerial = internalSerial;
    if (branch) updateData.branch = branch;

    // إذا تم تحديث productCode، نحدث serialNumber أيضاً للحفاظ على التوافق
    if (productCode) {
      updateData.serialNumber = productCode;
    }

    const updatedSerial = await Serial.findByIdAndUpdate(
      serialId,
      updateData,
      { new: true }
    );

    if (!updatedSerial) {
      return res.status(404).send({ msg: "Serial not found" });
    }

    // Fetch all serials, maintaining the order
    const serials = await Serial.find({}).sort({ _id: 1 });

    res.status(200).send({
      msg: "Serial updated successfully",
      serial: updatedSerial,
      serials
    });
  } catch (error) {
    res
      .status(500)
      .send({ msg: "Error updating serial", error: error.message });
  }
});
// Protected Admin Route
app.get("/viewSerials", async (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://www.royalnanoceramic.com",
    "https://royalnanoceramic.com",
    "https://royalshieldworld.com",
    "https://www.royalshieldworld.com",
    "http://localhost:4200"
  ];

  // ✅ لو الطلب من موقع موثوق، اعرض البيانات بدون توكن
  if (allowedOrigins.includes(origin)) {
    console.log("✅ Trusted origin (no token required):", origin);
    const serials = await Serial.find({});
    if (serials.length === 0) {
      return res.status(404).send("No serials found");
    }
    return res.status(200).json({ status: "ok", serials });
  }

  // ⛔ باقي الطلبات لازم توكن
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send("No token provided or invalid format");
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY);
    const serials = await Serial.find({});
    if (serials.length === 0) {
      return res.status(404).send("No serials found");
    }
    res.status(200).json({ status: "ok", serials });
  } catch (err) {
    return res.status(403).send(`Invalid token: ${err.message}`);
  }
});
/* user check serials - التحقق من السيريال الخارجي (productCode) */
app.post("/checkSerial", async (req, res) => {
  try {
    const { productCode } = req.body; // السيريال الخارجي من الكرتونة
    console.log("Checking product code:", productCode);

    if (!productCode) {
      return res.status(400).send({
        status: "false",
        msg: "Product code is required"
      });
    }

    // البحث عن السيريال باستخدام productCode
    const serialNum = await Serial.findOne({
      $or: [
        { productCode: productCode },
        { serialNumber: productCode } // للحفاظ على التوافق مع البيانات القديمة
      ]
    });

    if (!serialNum) {
      return res.send({
        status: "false",
        msg: "السيريال غير موجود",
      });
    }

    // التحقق من حالة التفعيل
    if (serialNum.activated) {
      const warranty = await Warranty.findOne({
        $or: [
          { productCode: serialNum.productCode },
          { serialNumber: serialNum.productCode || serialNum.serialNumber }
        ]
      });

      if (warranty) {
        const hiddenName = warranty.name.slice(0, 3);
        const hiddenPhone = warranty.phoneNumber.slice(-3);
        return res.send({
          status: "act",
          owner: { name: hiddenName, phone: hiddenPhone },
        });
      }
    }

    // التحقق من عدد المحاولات
    if (serialNum.numOfChecks > 0) {
      serialNum.numOfChecks -= 1;
      await serialNum.save();

      // البحث عن تفاصيل المنتج
      let productInfo = null;
      if (serialNum.productCode) {
        productInfo = await Product.findOne({ code: serialNum.productCode });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          productCode: serialNum.productCode || serialNum.serialNumber,
          internalSerial: serialNum.internalSerial
        },
        JWT_SECRET_KEY,
        { expiresIn: "24h" }
      );

      res.send({
        status: "ok",
        productCode: serialNum.productCode || serialNum.serialNumber,
        productInfo: productInfo || {
          code: serialNum.productCode || serialNum.serialNumber,
          name: "منتج"
        },
        token
      });
    } else if (serialNum.numOfChecks == 0) {
      res.send({
        status: "false",
        msg: "You can't check serial number more than 3 times",
      });
    }
  } catch (error) {
    console.error("Error in checkSerial:", error);
    res.status(500).send({ message: "An error occurred", error: error.message });
  }
});

// configure multer for uploads with extension support
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), "uploads");
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadWarranty = multer({ storage: storage });

// Generic upload endpoint
app.post("/api/upload", uploadWarranty.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: "No file uploaded" });
  }
  // Return the path relative to the domain (e.g., /uploads/filename.jpg)
  const imagePath = `/uploads/${req.file.filename}`;
  res.status(200).send({
    success: true,
    message: "File uploaded successfully",
    imagePath: imagePath
  });
});

/* verify internal serial - التحقق من السيريال الداخلي */
app.post("/verifyInternalSerial", async (req, res) => {
  try {
    const { productCode, internalSerial } = req.body;

    if (!productCode || !internalSerial) {
      return res.status(400).send({
        success: false,
        msg: "Product code and internal serial are required",
      });
    }

    // البحث عن السيريال باستخدام productCode
    const serialNum = await Serial.findOne({
      $or: [
        { productCode: productCode },
        { serialNumber: productCode } // للحفاظ على التوافق مع البيانات القديمة
      ]
    });

    if (!serialNum) {
      return res.send({
        success: false,
        msg: "السيريال الخارجي غير موجود",
      });
    }

    // التحقق من تطابق السيريال الداخلي
    if (serialNum.internalSerial === internalSerial) {
      // Generate JWT token للتفعيل
      const token = jwt.sign(
        {
          productCode: serialNum.productCode || serialNum.serialNumber,
          internalSerial: serialNum.internalSerial,
        },
        JWT_SECRET_KEY,
        { expiresIn: "1h" } // Token expiration time للتفعيل
      );

      return res.send({
        success: true,
        msg: "السيريال صحيح",
        token,
        productCode: serialNum.productCode || serialNum.serialNumber,
        internalSerial: serialNum.internalSerial,
      });
    } else {
      return res.send({
        success: false,
        msg: "في حاجة غلط",
      });
    }
  } catch (error) {
    console.error("Error in verifyInternalSerial:", error);
    res.status(500).send({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
});

/* activate serial - تفعيل الضمان */
app.post("/activation", uploadWarranty.single("image"), async (req, res) => {
  const {
    name,
    phoneNumber,
    birthdate,
    address,
    brand,
    model,
    color,
    email,
    serialNumber, // للحفاظ على التوافق مع الكود القديم
    productCode, // كود المنتج/السيريال الخارجي
    internalSerial, // السيريال الداخلي
    createdAt,
  } = req.body;

  try {
    // استخدام productCode إذا كان موجوداً، وإلا استخدام serialNumber (للتوافق مع البيانات القديمة)
    const codeToUse = productCode || serialNumber;

    if (!codeToUse || codeToUse === "Royal-Nano") {
      // معالجة الحالة الخاصة Royal-Nano
      const newActivation = new Warranty({
        name,
        phoneNumber,
        birthdate,
        address,
        brand,
        model,
        color,
        email,
        serialNumber: codeToUse || "Royal-Nano",
        productCode: codeToUse || "Royal-Nano",
        internalSerial: internalSerial || "",
        createdAt,
        imagePath: req.file ? `/uploads/${req.file.filename}` : "",
      });
      await newActivation.save();
      return res.status(201).send({
        msg: "success",
        activation: newActivation,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : "",
      });
    }

    // البحث عن السيريال باستخدام productCode
    const foundSerial = await Serial.findOne({
      $or: [
        { productCode: codeToUse },
        { serialNumber: codeToUse } // للحفاظ على التوافق مع البيانات القديمة
      ]
    });

    if (!foundSerial) {
      return res.status(404).send({ msg: "not found" });
    }

    // التحقق من حالة التفعيل
    if (foundSerial.activated) {
      const activatedWarranty = await Warranty.findOne({
        $or: [
          { productCode: foundSerial.productCode || foundSerial.serialNumber },
          { serialNumber: foundSerial.productCode || foundSerial.serialNumber }
        ]
      });

      if (activatedWarranty) {
        return res.send({
          msg: "activated",
          owner: {
            name: activatedWarranty.name.slice(0, 2),
            phoneNumber: String(activatedWarranty.phoneNumber).slice(-3),
          },
        });
      }
    }

    // التحقق من السيريال الداخلي إذا كان موجوداً
    if (internalSerial && foundSerial.internalSerial) {
      if (foundSerial.internalSerial !== internalSerial) {
        return res.status(400).send({
          msg: "في حاجة غلط - السيريال الداخلي غير صحيح",
        });
      }
    }

    // تفعيل السيريال
    foundSerial.activated = true;
    await foundSerial.save();

    // إنشاء سجل الضمان
    const newActivation = new Warranty({
      name,
      phoneNumber,
      birthdate,
      address,
      brand,
      model,
      color,
      email,
      serialNumber: foundSerial.productCode || foundSerial.serialNumber, // للحفاظ على التوافق
      productCode: foundSerial.productCode || foundSerial.serialNumber,
      internalSerial: foundSerial.internalSerial || internalSerial || "",
      createdAt,
      imagePath: req.file ? `/uploads/${req.file.filename}` : "", // Save image path to warranty
    });

    await newActivation.save();

    res.status(201).send({
      msg: "success",
      activation: newActivation,
      imageUrl: req.file ? `/uploads/${req.file.filename}` : "", // Return image path
    });
  } catch (err) {
    console.error("Error in activation:", err);
    res.status(500).send(`Error: ${err.message}`);
  }
});

/* activation lookup - بحث عن الضمان */
app.get("/activation/lookup", async (req, res) => {
  const { internalSerial, phoneNumber } = req.query;

  if (!internalSerial || !phoneNumber) {
    return res.status(400).json({
      status: 400,
      success: false,
      message: "internalSerial and phoneNumber are required"
    });
  }

  try {
    // البحث في قاعدة البيانات عن تفعيل يطابق السيريال الداخلي ورقم الهاتف
    const warranty = await Warranty.findOne({
      internalSerial: internalSerial,
      phoneNumber: phoneNumber
    });

    if (!warranty) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Warranty not found"
      });
    }

    // البحث عن اسم المنتج للحصول على تفاصيل إضافية (اختياري)
    let productName = "Unknown Product";
    // نحاول نجيب اسم المنتج من جدول المنتجات لو الكود موجود
    if (warranty.productCode) {
      const product = await Product.findOne({ code: warranty.productCode });
      if (product) {
        productName = product.name;
      }
    }

    // تجهيز الرد
    const responseData = {
      name: warranty.name,
      phoneNumber: warranty.phoneNumber,
      email: warranty.email || "",
      address: warranty.address || "",
      brand: warranty.brand || "",
      model: warranty.model || "",
      year: "N/A", // غير موجود في الموديل حالياً
      vin: "N/A",  // غير موجود في الموديل حالياً
      plate: "N/A", // غير موجود في الموديل حالياً
      productCode: warranty.productCode,
      productName: productName,
      internalSerial: warranty.internalSerial,
      createdAt: warranty.createdAt,
      warrantyDuration: "5 Years" // قيمة افتراضية أو يمكن حسابها لو فيه تاريخ انتهاء
    };

    return res.status(200).json({
      status: 200,
      success: true,
      data: responseData
    });

  } catch (err) {
    console.error("Error in activation lookup:", err);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Internal Server Error",
      error: err.message
    });
  }
});


app.get("/activatedWarrantys", async (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://www.royalnanoceramic.com",
    "https://royalnanoceramic.com",
    "https://royalshieldworld.com",
    "https://www.royalshieldworld.com",
    "http://localhost:4200"
  ];

  // ✅ لو الطلب من موقع موثوق، اعرض البيانات بدون توكن
  if (allowedOrigins.includes(origin)) {
    console.log("✅ Trusted origin (no token required):", origin);
    const warrantys = await Warranty.find({});
    if (warrantys.length === 0) {
      return res.status(404).send("No warrantys found");
    }
    return res.status(200).json({ status: "ok", warrantys });
  }

  // ⛔ باقي الطلبات لازم توكن
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send("No token provided or invalid format");
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY);
    const warrantys = await Warranty.find({});
    if (warrantys.length === 0) {
      return res.status(404).send("No warrantys found");
    }
    res.status(200).json({ status: "ok", warrantys });
  } catch (err) {
    return res.status(403).send(`Invalid token: ${err.message}`);
  }
});
// Delete activation by serial number and send all remaining activations
app.delete("/activation/:serialNumber", async (req, res) => {
  const { serialNumber } = req.params;

  try {
    const deletedActivation = await Warranty.findOneAndDelete({ serialNumber });

    if (!deletedActivation) {
      return res.status(404).send({ msg: "Activation not found" });
    }

    const imagePath = path.join(__dirname, deletedActivation.imagePath);

    fs.unlink(imagePath, (err) => {
      if (err) {
        console.error("Error deleting image:", err);
      }
    });

    const allActivations = await Warranty.find();

    res.status(200).send({
      msg: "Activation deleted successfully",
      deletedActivation,
      remainingActivations: allActivations,
    });
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});
// Delete all activations
app.delete("/activations", async (req, res) => {
  try {
    // Find and delete all activations
    const result = await Warranty.deleteMany({});

    if (result.deletedCount === 0) {
      return res.status(404).send({ msg: "No activations found to delete" });
    }

    // Retrieve all remaining activations (should be empty)
    const allActivations = await Warranty.find();

    res.status(200).send({
      msg: "All activations deleted successfully",
      remainingActivations: allActivations,
    });
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

/* offers */
app.post("/sendOffer", async (req, res) => {
  const { name, email, phone, msg, company } = req.body;
  try {
    if (name && email) {
      const newOffer = new Offer({
        name,
        email,
        phone,
        msg,
        company,
      });
      await newOffer.save();
      res.send({
        status: "ok",
        msg: "Request sent successfully",
      });
    } else {
      res.send({
        status: "false",
        msg: "wrong inputs",
      });
    }
  } catch (error) {
    res.status(500).send({ message: "An error occurred", error });
  }
});
app.post("/offerCheck", async (req, res) => {
  const { Id } = req.body;
  try {
    const newOffer = await Offer.findOne({ Id });

    if (!newOffer) {
      return res.status(404).send({ status: "false", msg: "Offer not found" });
    }

    newOffer.checked = true;
    await newOffer.save();
    const offers = await Offer.find({});

    res.send({ status: "ok", offers });
  } catch (error) {
    res.status(500).send({ message: "An error occurred", error });
  }
});
app.post("/offerUnCheck", async (req, res) => {
  const { Id } = req.body;
  try {
    const newOffer = await Offer.findOne({ Id });

    if (!newOffer) {
      return res.status(404).send({ status: "false", msg: "Offer not found" });
    }

    newOffer.checked = false;
    await newOffer.save();
    const offers = await Offer.find({});

    res.send({ status: "ok", offers });
  } catch (error) {
    res.status(500).send({ message: "An error occurred", error });
  }
});
app.delete("/offer/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deletedMessage = await Offer.findOneAndDelete({ _id: id });

    if (!deletedMessage) {
      return res.status(404).send({ msg: "Activation not found" });
    }

    const allMessages = await Offer.find();

    res.status(200).send({
      msg: "message deleted successfully",
      remainingActivations: allMessages,
    });
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

app.get("/getOffers", async (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://www.royalnanoceramic.com",
    "https://royalnanoceramic.com",
    "https://royalshieldworld.com",
    "https://www.royalshieldworld.com",
    "http://localhost:4200"
  ];

  // ✅ لو الطلب من موقع موثوق، اعرض البيانات بدون توكن
  if (allowedOrigins.includes(origin)) {
    console.log("✅ Trusted origin (no token required):", origin);
    const offers = await Offer.find({});
    return res.status(200).json({ status: "ok", offers });
  }

  // ⛔ باقي الطلبات لازم توكن
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .send({ message: "No token provided or invalid format" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY);
    const offers = await Offer.find({});
    res.status(200).json({ status: "ok", offers });
  } catch (error) {
    return res.status(403).send({ message: "Invalid token", error: error.message });
  }
});
app.delete("/deleteOffers", async (req, res) => {
  try {
    await Offer.deleteMany({}); // Delete all documents in the Offer collection
    res.send({ status: "ok", msg: "All offers deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .send({ message: "An error occurred while deleting offers", error });
  }
});

app.post("/admin/register", async (req, res) => {
  console.log(req.body);
  const { username, password } = req.body;

  try {
    // Check if the admin already exists
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    // Create new admin
    const newAdmin = new Admin({ username, password });
    await newAdmin.save();

    res.status(201).json({ message: "Admin registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

app.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find the admin by username
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Check the password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Generate JWT token
    const token = jwt.sign({ adminId: admin._id }, JWT_SECRET_KEY, {
      expiresIn: "1h",
    });

    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

app.post("/send-email", (req, res) => {
  const { name, email, msg, phone, company } = req.body;

  if (!name || !email || !msg) {
    return res.status(400).send("All fields are required.");
  }

  // Create a transporter to send the email
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER, // Your Gmail account
      pass: process.env.GMAIL_PASS, // Your Gmail app password
    },
  });

  // Setup email data
  let mailOptions = {
    from: email, // Sender's email address
    company,
    to: process.env.GMAIL_USER, // Your Gmail address
    subject: `New message from ${name}`,
    text: `Message: ${msg}\nFrom: ${name} (${email})\nPhone Number: ${phone}`,
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      return res.status(500).send("Error sending email.");
    } else {
      console.log("Email sent: " + info.response);
      return res.status(200).json("Message sent successfully!");
    }
  });
});

// POST Endpoint to store form data //NANO CERAMIC
app.post("/bookForm", async (req, res) => {
  const { fullName, phoneNumber, carType, carModel, service, branch, notes } =
    req.body;
  try {
    const newForm = new Appointment({
      fullName,
      phoneNumber,
      carType,
      carModel,
      service,
      branch,
      notes,
    });
    await newForm.save();
    res.status(201).json({ msg: "success" });
  } catch (error) {
    res.status(400).json({ error: "Failed to save form data", details: error });
  }
});

// GET Endpoint to retrieve all form data //NANO CERAMIC
app.get("/bookForms", async (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://www.royalnanoceramic.com",
    "https://royalnanoceramic.com",
    "https://royalshieldworld.com",
    "https://www.royalshieldworld.com",
    "http://localhost:4200"
  ];

  // ✅ لو الطلب من موقع موثوق، اعرض البيانات بدون توكن
  if (allowedOrigins.includes(origin)) {
    console.log("✅ Trusted origin (no token required):", origin);
    const forms = await Appointment.find();
    return res.status(200).json(forms);
  }

  // ⛔ باقي الطلبات لازم توكن
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send("No token provided or invalid format");
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY);
    const forms = await Appointment.find();
    res.status(200).json(forms);
  } catch (err) {
    return res.status(403).send(`Invalid token: ${err.message}`);
  }
});

app.delete("/bookForm/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await Appointment.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const remainingAppointments = await Appointment.find();

    res.status(200).json({
      message: "Appointment deleted successfully",
      remainingAppointments: remainingAppointments,
    });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    res
      .status(500)
      .json({ error: "Failed to delete appointment", details: error.message });
  }
});

const uploadApplication = multer({ dest: "applicants/" });

app.post(
  "/application",
  uploadApplication.single("application"),
  async (req, res) => {
    const { name, birthdate, email, phone, address, position, coverLetter } =
      req.body;

    try {
      const newApplication = new Application({
        name,
        birthdate,
        email,
        phone,
        address,
        position,
        coverLetter,
        cvPath: req.file.path,
      });
      await newApplication.save();
      res.json({ statue: "success" });
    } catch (error) {
      res.status(500).send(`Error: ${error.message}`);
    }
  }
);

app.get("/applicants", async (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://www.royalnanoceramic.com",
    "https://royalnanoceramic.com",
    "https://royalshieldworld.com",
    "https://www.royalshieldworld.com",
    "http://localhost:4200"
  ];

  // ✅ لو الطلب من موقع موثوق، اعرض البيانات بدون توكن
  if (allowedOrigins.includes(origin)) {
    console.log("✅ Trusted origin (no token required):", origin);
    const applications = await Application.find();
    if (applications.length > 0) {
      return res.json({
        statue: "success",
        data: {
          applications,
        },
      });
    } else {
      return res.json({ statue: "empty" });
    }
  }

  // ⛔ باقي الطلبات لازم توكن
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send("No token provided or invalid format");
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY);
    const applications = await Application.find();
    if (applications.length > 0) {
      res.json({
        statue: "success",
        data: {
          applications,
        },
      });
    } else {
      res.json({ statue: "empty" });
    }
  } catch (error) {
    res.send(error);
  }
});

app.get("/download/:id", async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).send("Application not found");
    }
    const filePath = path.join(__dirname, application.cvPath);
    res.download(filePath);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.post("/blog", async (req, res) => {
  const {
    label_en,
    label_ar,
    heading_en,
    heading_ar,
    subHeading_en,
    subHeading_ar,
    date,
    img,
    points,
  } = req.body;

  try {
    const newBlog = new Blog({
      label_en,
      label_ar,
      heading_en,
      heading_ar,
      subHeading_en,
      subHeading_ar,
      date,
      img,
      points,
    });

    await newBlog.save();
    res.json({ status: "success", msg: "Blog added successfully" });
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.get("/blog", async (req, res) => {
  try {
    const blogs = await Blog.find({});
    res.status(200).json({
      status: "success",
      data: {
        blogs,
      },
    });
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});
// Endpoint to get a blog by ID
app.get("/blog/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({ status: "error", msg: "Blog not found" });
    }

    res.status(200).json({
      status: "success",
      data: {
        blog,
      },
    });
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 ROYAL SHIELD SERVER STARTED ON PORT ${port}`);
  console.log("Branch OTP Routes mounted at /api/branch-otp");
});

module.exports = app;
