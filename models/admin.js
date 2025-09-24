const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// Skip password hashing
userSchema.pre("save", function (next) {
  // Any additional logic can be added here if needed
  next();
});

userSchema.methods.comparePassword = function (password) {
  // Just a simple comparison (note: this is not secure)
  return password === this.password;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
