const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();
const multer = require("multer");

const path = require("path");

const app = express();

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const Warranty = require("./models/warranty");
const Serial = require("./models/serial");
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
app.post("/addSerial", async (req, res) => {
  const { serialNumber, branch } = req.body;

  try {
    const existingSerial = await Serial.findOne({ serialNumber });
    if (existingSerial) {
      return res.status(400).send({ msg: "Serial already exists" });
    } else if (!branch) {
      return res.status(400).send({ msg: "No branch has been added" });
    } else {
      const newSerial = new Serial({
        serialNumber,
        branch,
      });
      await newSerial.save();
      const serials = await Serial.find({});
      res.status(201).send({ msg: "success", serials: serials });
    }
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.post("/deleteSerial", async (req, res) => {
  console.log(req.body);
  const { serialNumber } = req.body;
  try {
    const deletedSerial = await Serial.findOneAndDelete({ serialNumber });
    console.log(deletedSerial);
    if (!deletedSerial) {
      return res.status(404).send("Serial not found");
    }
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
      { serialNumber },
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
// Protected Admin Route
app.get("/viewSerials", async (req, res) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send("No token provided or invalid format");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Token is valid, proceed to retrieve serials
    const serials = await Serial.find({});

    if (serials.length === 0) {
      return res.status(404).send("No serials found");
    }

    res.status(200).json({ status: "ok", serials });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).send("Token expired");
    }
    return res.status(403).send(`Invalid token: ${err.message}`);
  }
});
/* user check serials */
app.post("/checkSerial", async (req, res) => {
  try {
    const { serialNumber } = req.body;
    console.log(serialNumber);
    const serialNum = await Serial.findOne({ serialNumber });

    if (serialNum.activated) {
      const curSerial = serialNum.serialNumber;
      const { name, phoneNumber } = await Warranty.findOne({
        serialNumber: curSerial,
      });
      const hiddenName = name.slice(0, 3);
      const hiddenPhone = phoneNumber.slice(-3);
      return res.send({
        status: "act",
        owner: { name: hiddenName, phone: hiddenPhone },
      });
    }
    if (serialNum && serialNum.numOfChecks > 0) {
      serialNum.numOfChecks -= 1;
      await serialNum.save();

      // Generate JWT token
      const token = jwt.sign(
        { serialNumber: serialNum.serialNumber },
        process.env.JWT_SECRET_KEY, // Replace with your actual secret key
        { expiresIn: "24h" } // Token expiration time
      );

      res.send({ status: "ok", serialNum, token });
    } else if (serialNum && serialNum.numOfChecks == 0) {
      res.send({
        status: "false",
        msg: "You can't check serial number more than 3 times",
      });
    }
  } catch (error) {
    res.status(500).send({ message: "An error occurred", error });
  }
});

const uploadWarranty = multer({ dest: "uploads/" });

/* activate serial */
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
    serialNumber,
    createdAt,
  } = req.body;

  try {
    if (serialNumber !== "Royal-Nano") {
      const foundSerial = await Serial.findOne({ serialNumber });
      if (!foundSerial) {
        return res.send({ msg: "not found" });
      }

      if (foundSerial.activated) {
        const activatedWarranty = await Warranty.findOne({ serialNumber });
        return res.send({
          msg: "activated",
          owner: {
            name: activatedWarranty.name.slice(0, 2),
            phoneNumber: String(activatedWarranty.phoneNumber).slice(-3),
          },
        });
      }

      foundSerial.activated = true;
      await foundSerial.save();
    }

    const newActivation = new Warranty({
      name,
      phoneNumber,
      birthdate,
      address,
      brand,
      model,
      color,
      email,
      serialNumber,
      createdAt,
      imagePath: req.file.path, // Save image path to warranty
    });
    await newActivation.save();
    res.status(201).send({
      msg: "success",
      activation: newActivation,
      imageUrl: req.file.path, // Return image path
    });
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

app.get("/activatedWarrantys", async (req, res) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send("No token provided or invalid format");
  }
  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const warrantys = await Warranty.find({});

    if (warrantys.length === 0) {
      return res.status(404).send("No warrantys found");
    }
    res.status(200).json({ status: "ok", warrantys });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).send("Token expired");
    }
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
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .send({ message: "No token provided or invalid format" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const offers = await Offer.find({});
    res.status(200).json({ status: "ok", offers });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).send({ message: "Token expired" });
    }
    return res.status(403).send({ message: "Invalid token", error });
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
    const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET_KEY, {
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
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send("No token provided or invalid format");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const forms = await Appointment.find();
    res.status(200).json(forms);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).send("Token expired");
    }
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
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send("No token provided or invalid format");
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
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
  console.log("port is 3000");
});
