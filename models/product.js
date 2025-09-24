const mongoose = require("mongoose");
const schema = mongoose.Schema;

const productSchema = new schema({
  name: String,
  price: Number,
  categorie: String,
  code: String,
});

const Products = mongoose.model("Product", productSchema);
module.exports = Products;
