const express = require("express");
const router = express.Router();
const request = require("request");

const fs = require("fs"); // to store files locally
const pdf = require("pdf-thumbnail"); // to create a thumbnail using first page of PDF
const jpeg = require("jpeg-js"); // to transform a jpeg file into a Buffer object
// to try to compare thumbnails and detect duplicates
const https = require("https"); // used for webhooks https request

// import of the model defined for MongoDB database
const Document = require("../models/Document");

// Loading of the home page
router.get("/", (req, res, next) => {
  res.render("index", {
    title: "Upflow backend coding challenge",
    subTitle: "Enter the URL of the PDF to download"
  });
});

// Post request for the download of a pdf using its URL link
router.post("/download-pdf", async (req, res, next) => {
  // Choice of a random Number to name the file to be downloaded
  const fileName = Math.floor(Math.random() * 1000000);
  // Path for the storage of the file to be downloaded
  const path = `./public/pdfFolder/${fileName}.pdf`;
  // Creation of the empty PDF file in the folder public/pdfFolder
  const emptyFile = await fs.createWriteStream(path);

  // 1- Downloading of the PDF file
  // Promise constructor allows to use resolve() and reject() on the events coming from the request library
  await new Promise(async (resolve, reject) => {
    try {
      let result = await request({
        // contains the URL link
        uri: req.body.pdfURL,
        // fill from Request Headers parameters in the Network section (using Chrome DevTool)
        // To be adapted to the url to download
        headers: {
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
          "accept-encoding": "gzip, deflate, br",
          "accept-language":
            "fr-FR,fr;q=0.9,en;q=0.8,zh-CN;q=0.7,zh;q=0.6,ar;q=0.5",
          "cache-control": "max-age=0",
          Connection: "keep-alive",
          "upgrade-insecure-requests": "1",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36}"
        },
        // to compression the actual data being transferred on the request
        gzip: true
      });
      // Modifying the content of the empty file with the pdf contained in the URL link
      const downloadedFile = await result.pipe(emptyFile);
      // event listener for "finish" event that triggers resolve method
      downloadedFile.on("finish", () => {
        console.log(`1 - Downloading process is over`);
        resolve();
      });
      // event listener for "error" event that triggers reject method
      downloadedFile.on("error", error => {
        reject(error);
      });
    } catch (err) {
      console.log(err);
    }
  });

  // 2- Creation of the corresponding thumbnail using first page of the PDF
  try {
    // Open the PDF file as a readable stream
    const pdfStream = await fs.createReadStream(path);
    // creation of the thumbnail jpeg image
    const image = await pdf(pdfStream, {
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

  // 3- Storage in the database
  try {
    // creation of a new document with the parameters defined in the model
    const newDocument = new Document({
      url: req.body.pdfURL,
      name: fileName,
      thumbnail: `../thumbnailFolder/${fileName}.jpg`,
      pdfAbsolutPath: `/Users/ramyatassi/Desktop/upflowBackendTest/backend/public/pdfFolder/${fileName}.pdf`,
      thumbnailLocalPath: `./public/thumbnailFolder/${fileName}.jpg`,
      thumbnailAbsolutPath: `/Users/ramyatassi/Desktop/upflowBackendTest/backend/public/thumbnailFolder/${fileName}.jpg`
    });
    // saving of the new document
    await newDocument.save();
    console.log("3 - Document details saved in the database");

    //4 - Webhook
    // options of the webhook request
    const options = {
      // webhook URL which is sending the POST request
      hostname: "upflow-backend.free.beeceptor.com",
      method: "POST",
      // path for the POST request
      path: "/hook",
      headers: {
        "content-type": "application/json"
      }
    };
    // send the webhook request
    const reqWebhook = await https.request(options);
    // request body of the webhook
    reqWebhook.write(`Download completed : ${req.body.pdfURL}`);
    reqWebhook.end();
  } catch (err) {
    console.log(err.message);
  }
  res.render("index", { title: "PDF downloaded!", subTitle: "" });
});

// Get request to show the PDF files saved in the database
router.get("/list", async (req, res, next) => {
  // table sent to the Front to display the documents
  let tableDocuments = [];
  // get all documents from database
  await Document.find((err, data) => {
    try {
      // Fill up the table with the data from database
      for (let i = 0; i < data.length; i++) {
        tableDocuments.push({
          url: data[i].url,
          name: data[i].name,
          image: data[i].thumbnail
        });
      }
      return tableDocuments;
    } catch (err) {
      console.log(err);
    }
  });

  // Get the number of duplicates, not working yet
  let numberDuplicates = 0;
  await Document.find(async (error, data) => {
    try {
      // table to gather all thumbnail images
      let tableThumbnails = [];
      for (let i = 0; i < data.length; i++) {
        tableThumbnails.push(data[i].thumbnailLocalPath);
      }
      // transform jpeg images into Buffer objects
      let tableBuffer = await tableThumbnails.map(
        x => jpeg.decode(fs.readFileSync(x)).data
      );
      // Count number of duplicates
      for (let i = 0; i < tableBuffer.length - 1; i++) {
        for (let j = i + 1; j < tableBuffer.length; j++) {
          if (Buffer.compare(tableBuffer[i], tableBuffer[j]) === 0) {
            numberDuplicates++;
          }
        }
      }
      return numberDuplicates;
    } catch (err) {
      console.log(err);
    }
  });

  res.render("list", {
    tableDocuments,
    numberDuplicates
  });
});

// Show directly the database
router.get("/list-json", (req, res, next) => {
  Document.find((error, data) => {
    res.json({ result: true, data });
  });
});

module.exports = router;
