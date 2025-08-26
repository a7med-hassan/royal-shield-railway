const mongoose = require("mongoose");
const schema = mongoose.Schema;

const serialSchema = new schema({
  serialNumber: String,
  branch: String,
  activated: {
    type: Boolean,
    default: false,
  },
  numOfChecks: {
    type: Number,
    default: 3,
  },
});

const Serial = mongoose.model("Serial", serialSchema);
module.exports = Serial;
