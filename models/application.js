const mongoose = require("mongoose");
const schema = mongoose.Schema;

const applicationSchema = new schema({
  name: String,
  birthdate: Date,
  email: String,
  phone: String,
  address: String,
  position: String,
  coverLetter: String,
  cvPath: String,
});

const Application = mongoose.model("Application", applicationSchema);

module.exports = Application;
