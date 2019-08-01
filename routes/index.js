const express = require("express");
const router = express.Router();
const fs = require("fs");
const request = require("request");
const pdf = require("pdf-thumbnail");
const jpeg = require("jpeg-js");
const https = require("https");

const Document = require("../models/Document");

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
  let fileName = Math.floor(Math.random() * 1000000);
  let path = `./public/pdfFolder/${fileName}.pdf`;
  let createdEmptyFile = await fs.createWriteStream(path);

  // Modifying the content of the empty file with the pdf contained in the URL link
  // req.body.pdfURL contains the URL link
  await new Promise(async (resolve, reject) => {
    try {
      let result = await request({
        uri: req.body.pdfURL,
        headers: {
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
          "accept-encoding": "gzip, deflate, br",
          "accept-language":
            "fr-FR,fr;q=0.9,en;q=0.8,zh-CN;q=0.7,zh;q=0.6,ar;q=0.5",
          "cache-control": "max-age=0",
          "upgrade-insecure-requests": "1",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36}"
        },
        gzip: true
      });

      const downloadedFile = await result.pipe(createdEmptyFile);

      downloadedFile.on("finish", () => {
        console.log(`1 - Downloading process is over`);
        resolve();
      });
      downloadedFile.on("error", error => {
        reject(error);
      });
    } catch (err) {
      console.log(err);
    }
  });

  // Creation of the corresponding thumbnail using the first page of the PDF
  try {
    // creation of the buffer of the downloaded PDF
    const pdfBuffer = await fs.createReadStream(path);

    // creation of the thumbnail from the PDF buffer (1st page)
    const image = await pdf(pdfBuffer, {
      compress: {
        type: "JPEG", //default
        quality: 70 //default
      }
    });

    // The thumbnail is locally saved
    await image.pipe(
      fs.createWriteStream(`./public/thumbnailFolder/${fileName}.jpg`)
    );
    console.log("2 - PDF thumbnail is created");
  } catch (err) {
    console.log(err);
  }

  // creation of a database
  try {
    const newDocument = new Document({
      url: req.body.pdfURL,
      name: fileName,
      thumbnail: `../thumbnailFolder/${fileName}.jpg`,
      pdfAbsolutPath: `/Users/ramyatassi/Desktop/upflowBackendTest/backend/public/pdfFolder/${fileName}.pdf`,
      thumbnailAbsolutPath: `/Users/ramyatassi/Desktop/upflowBackendTest/backend/public/thumbnailFolder/${fileName}.jpg`,
      thumbnailLocalPath: `./public/thumbnailFolder/${fileName}.jpg`
    });
    await newDocument.save();
    console.log("3 - Document details saved in the database");

    //Webhook
    const options = {
      hostname: "upflow-backend.free.beeceptor.com",
      port: 443,
      path: "/",
      method: "POST",
      headers: {
        "content-type": "application/json"
      }
    };

    const reqWebhook = https.request(options);
    reqWebhook.write(`Download completed : ${req.body.pdfURL}`);
    // reqWebhook.write(req.body.pdfURL);
    reqWebhook.end();
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }

  res.render("index", { title: "PDF downloaded!", subTitle: "" });
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

  let numberDuplicates = 0;
  for (let i = 0; i < tableBuffer.length - 1; i++) {
    for (let j = i + 1; j < tableBuffer.length; j++) {
      if (Buffer.compare(tableBuffer[i], tableBuffer[j]) === 0) {
        numberDuplicates++;
      }
    }
  }

  res.render("list", {
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
