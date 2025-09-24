const mongoose = require("mongoose");
const schema = mongoose.Schema;

const pointSchema = new schema({
  head_en: { type: String, required: true },
  body_en: { type: String, required: true },
  head_ar: { type: String, required: true },
  body_ar: { type: String, required: true },
});

const blogSchema = new schema({
  label_en: { type: String, required: true },
  label_ar: { type: String, required: true },
  heading_en: { type: String, required: true },
  heading_ar: { type: String, required: true },
  subHeading_en: { type: String, required: true },
  subHeading_ar: { type: String, required: true },
  date: { type: String, required: true },
  img: { type: String, required: true },
  points: { type: [pointSchema], required: true },
});

const Blog = mongoose.model("Blog", blogSchema);
module.exports = Blog;
