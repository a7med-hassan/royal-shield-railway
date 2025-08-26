const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const schema = mongoose.Schema;

const offerSchema = new schema({
  name: String,
  email: String,
  msg: String,
  phone: String,
  Id: {
    type: String,
    unique: true,
    default: uuidv4,
  },
  checked: {
    type: Boolean,
    default: false,
  },
  company: String,
});

const Offer = mongoose.model("offer", offerSchema);
module.exports = Offer;
