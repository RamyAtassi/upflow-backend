const express = require("express");
const router = express.Router();
const fs = require("fs");
const request = require("request");
const pdf = require("pdf-thumbnail");

const Document = require("../models/Document");

// Home page
router.get("/", function(req, res, next) {
  res.render("index", {
    title: "Upflow backend coding challenge",
    subTitle: "Enter the URL of the PDF to upload"
  });
});

/* POST request to save PDF from an URL link */
router.post("/upload-pdf", async function(req, res, next) {
  // Creation of the empty PDF file in the folder public/pdf
  let randomNumber = Math.floor(Math.random() * 1000000);
  let path = `./public/pdfFolder/${randomNumber}.pdf`;
  let createdEmptyFile = await fs.createWriteStream(path);

  // Modifying the content of the empty file with the pdf contained in the URL link
  // req.body.pdfURL contains the URL link
  await new Promise((resolve, reject) => {
    request({
      uri: req.body.pdfURL,
      headers: {}
    })
      .pipe(createdEmptyFile)
      .on("finish", () => {
        console.log(`The file is finished downloading`);
        resolve();
      })
      .on("error", error => {
        reject(error);
      });
  }).catch(error => {
    console.log(`Something wrong happened: ${error}`);
  });

  // Creation of the corresponding thumbnail using the first page of the PDF
  const pdfBuffer = await fs.createReadStream(path);

  pdf(pdfBuffer, {
    compress: {
      type: "JPEG", //default
      quality: 70 //default
    }
  })
    .then(data =>
      data.pipe(
        fs.createWriteStream(`./public/thumbnailFolder/${randomNumber}.jpg`)
      )
    )
    .catch(err => console.error(err));

  try {
    const newDocument = new Document({
      url: req.body.pdfURL,
      name: randomNumber,
      pdfAbsolutPath: `/Users/ramyatassi/Desktop/upflowBackendTest/backend/public/pdfFolder/${randomNumber}.pdf`,
      thumbnailAbsolutPath: `/Users/ramyatassi/Desktop/upflowBackendTest/backend/public/thumbnailFolder/${randomNumber}.jpg`,
      thumbnailLocalPath: `../thumbnailFolder/${randomNumber}.jpg`
    });
    await newDocument.save();
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }

  res.render("index", { title: "PDF uploaded", subTitle: "" });
});

// Get the list of all saved PDF and associated thumbnails
router.get("/list", async function(req, res, next) {
  let table = [];

  await Document.find(function(error, data) {
    for (let i = 0; i < data.length; i++) {
      table.push({
        name: data[i].name,
        image: data[i].thumbnailLocalPath
      });
    }
    console.log(table);

    res.render("list", {
      title: "Upflow backend coding challenge",
      subTitle: "List of saved PDF",
      table
    });

    // res.json({ result: true, data });
  });
});

module.exports = router;
