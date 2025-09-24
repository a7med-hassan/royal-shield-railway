const mongoose = require("mongoose");
const schema = mongoose.Schema;

const bookFormSchema = new schema({
  fullName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  carType: { type: String, required: true },
  carModel: { type: String, required: true },
  service: { type: String, required: true },
  branch: { type: String, required: true },
  notes: { type: String, required: true },
});

const Appointment = mongoose.model("Appointment", bookFormSchema);
module.exports = Appointment;
