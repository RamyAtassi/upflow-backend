const express = require("express");
const router = express.Router();
const fs = require("fs");
const request = require("request");
const pdf = require("pdf-thumbnail");
const jpeg = require("jpeg-js");

const Document = require("../models/Document");

// const jpegData = fs.readFileSync("./public/thumbnailFolder/37185.jpg");
// const rawImageData = jpeg.decode(jpegData);
// console.log(rawImageData);

// Home page
router.get("/", function(req, res, next) {
  res.render("index", {
    title: "Upflow backend coding challenge",
    subTitle: "Enter the URL of the PDF to download"
  });
});

/* POST request to save PDF from an URL link */
router.post("/download-pdf", async function(req, res, next) {
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
      thumbnail: `../thumbnailFolder/${randomNumber}.jpg`,
      pdfAbsolutPath: `/Users/ramyatassi/Desktop/upflowBackendTest/backend/public/pdfFolder/${randomNumber}.pdf`,
      thumbnailAbsolutPath: `/Users/ramyatassi/Desktop/upflowBackendTest/backend/public/thumbnailFolder/${randomNumber}.jpg`,
      thumbnailLocalPath: `./public/thumbnailFolder/${randomNumber}.jpg`
    });
    await newDocument.save();
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }

  res.render("index", { title: "PDF downloaded", subTitle: "" });
});

// Get the list of all saved PDF and associated thumbnails
// and return number of duplicate
router.get("/list", async function(req, res, next) {
  // table sent to the Front to display documents
  let tableDocuments = [];

  await Document.find(function(err, data) {
    try {
      for (let i = 0; i < data.length; i++) {
        tableDocuments.push({
          name: data[i].name,
          image: data[i].thumbnail
        });
      }
      return tableDocuments;
    } catch (err) {
      console.log(err);
    }
  });

  // Get number of duplicates

  // table used to count the number of duplicates
  let tableThumbnails = [];

  await Document.find(function(error, data) {
    try {
      for (let i = 0; i < data.length; i++) {
        tableThumbnails.push(data[i].thumbnailLocalPath);
      }
      return tableThumbnails;
    } catch (err) {
      console.log(err);
    }
  });

  let tableBuffer = await tableThumbnails.map(
    x => jpeg.decode(fs.readFileSync(x)).data
  );

  let uniqueElements = [...new Set(tableBuffer)];
  let numberDuplicates = tableBuffer.length - uniqueElements.length;

  for (let i = 0; i < tableBuffer.length - 1; i++) {
    for (let j = i + 1; j < tableBuffer.length; j++) {
      if (Buffer.compare(tableBuffer[i], tableBuffer[j]) === 0) {
        numberDuplicates++;
      }
    }
  }

  res.render("list", {
    title: "Upflow backend coding challenge",
    subTitle: "List of saved PDF",
    tableDocuments,
    numberDuplicates
  });
});

// Show database
router.get("/list-json", (req, res, next) => {
  Document.find((error, data) => {
    res.json({ result: true, data });
  });
});

module.exports = router;
