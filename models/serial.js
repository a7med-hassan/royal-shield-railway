const mongoose = require("mongoose");
const schema = mongoose.Schema;

const serialSchema = new schema({
  serialNumber: String, // للحفاظ على التوافق مع الكود القديم
  productCode: String, // كود المنتج/السيريال الخارجي (مثل M-102487)
  internalSerial: String, // السيريال الداخلي للتفعيل (مثل RXM-3055)
  branch: String,
  activated: {
    type: Boolean,
    default: false,
  },
});

const Serial = mongoose.model("Serial", serialSchema);
module.exports = Serial;
