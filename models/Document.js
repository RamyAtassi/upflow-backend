const mongoose = require("mongoose");

const documentSchema = mongoose.Schema({
  url: String,
  name: String,
  thumbnail: String,
  pdfAbsolutPath: String,
  thumbnailAbsolutPath: String,
  thumbnailLocalPath: String
});

const documentModel = mongoose.model("document", documentSchema);

module.exports = documentModel;
