const mongoose = require("mongoose");
const schema = mongoose.Schema;

const warrantySchema = new schema({
  name: String,
  phoneNumber: String,
  birthdate: String,
  address: String,
  brand: String,
  model: String,
  color: String,
  email: String,
  serialNumber: String, // للحفاظ على التوافق مع الكود القديم
  productCode: String, // كود المنتج/السيريال الخارجي
  internalSerial: String, // السيريال الداخلي المستخدم في التفعيل
  imagePath: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Warranty = mongoose.model("Warranty", warrantySchema);
module.exports = Warranty;
