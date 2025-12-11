const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const pdf = require("pdf-creator-node");
const FormData = require("form-data");
const fs = require("fs");
require("dotenv").config();
const { createCanvas, loadImage } = require("canvas");
const path = require("path");

const moment = require("moment-timezone");
const { generateUUID } = require("./helper");

async function convertDataUriToPngBase64(dataUri) {
  try {
    const canvas = createCanvas();
    const ctx = canvas.getContext("2d");

    // Load the image
    const img = await loadImage(dataUri);

    // Set canvas dimensions based on image size
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw the image on the canvas
    ctx.drawImage(img, 0, 0);

    // Get PNG base64 data
    const pngBase64 = canvas.toDataURL().split(",")[1]; // Extract base64 data without data URL prefix
    return pngBase64;
  } catch (error) {
    console.error("Error converting data URI to PNG:", error);
    throw error;
  }
}

// Function to add text to the PDF
async function addTextToPDF(pdfDoc, page, text, x, y, size = 12) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const drawTextOptions = {
    font: font,
    size: size,
    color: rgb(0, 0, 0),
  };
  page.drawText(text, {
    x: x,
    y: y,
    ...drawTextOptions,
  });
}

// Function to add an image to the PDF
async function addImageToPDF(pdfDoc, page, imageData, x, y, width, height) {
  const jpgImage = await pdfDoc.embedPng(imageData);
  page.drawImage(jpgImage, {
    x: x,
    y: y,
    width: width,
    height: height,
  });
}

// Function to decode base64 data URI
function decodeBase64DataUri(dataUri) {
  const matches = dataUri.match(/^data:(.+);base64,(.*)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid data URI");
  }

  const contentType = matches[1];
  const base64Data = matches[2];

  return Buffer.from(base64Data, "base64");
}

// Function to place markers on the PDF and upload to S3
async function placeMarkersOnPDF(pdfUrl, markers, id) {
  // const existingPdfBytes = await fetch(pdfUrl).then((res) => res.buffer());
  try {
    const fetch = (await import("node-fetch")).default;
    const existingPdfBytes = await fetch(pdfUrl)
      .then((res) => res.arrayBuffer())
      .then((arrayBuffer) => Buffer.from(arrayBuffer));
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();

    for (const marker of markers) {
      let { x, y, data, markerType, width, height } = marker;

      let imageWidth = 125;
      let imageHeight = 25;

      const page = pages[marker.pageNumber - 1];

      let pageHeight = page.getSize().height;

      if (markerType === "text") {
        y = pageHeight - y - 10;

        await addTextToPDF(pdfDoc, page, data, x, y);
      } else if (markerType === "image") {
        y = pageHeight - y - imageHeight;

        // Decode the base64 image data URI
        const imageData = await convertDataUriToPngBase64(data);

        // Add image to PDF
        const image = await pdfDoc.embedPng(imageData);
        page.drawImage(image, { x, y, width: imageWidth, height: imageHeight });
      }
    }

    const signedDocumentPath = path.posix.join(
      "src",
      "infrastructure",
      "eSign"
    );
    if (!fs.existsSync(signedDocumentPath)) {
      fs.mkdirSync(signedDocumentPath, { recursive: true });
      console.log(`Directory created at: ${signedDocumentPath}`);
    }
    for (const page of pages) {
      const x = 10; // left margin
      const y = 10; // bottom margin
      await addTextToPDF(pdfDoc, page, `doc_id: ${id}`, x, y, 8);
    }

    const editedPdfBytes = await pdfDoc.save();

    // Generate a unique filename
    const editedFilename = `${id}.pdf`;

    // Write edited PDF to a temporary file
    const signedDocumentFilePath = path.posix.join(
      signedDocumentPath,
      editedFilename
    );
    fs.writeFileSync(signedDocumentFilePath, editedPdfBytes);

    return signedDocumentFilePath;
  } catch (error) {
    console.error("Error placing markers on PDF:", error);
    throw error;
  }
}

const convertHtmlToPdfBuffer = async (html) => {
  const options = {
    format: "A4",
    orientation: "portrait",
    border: "10mm",
  };

  const document = {
    html,
    data: {},
    type: "buffer",
  };

  return pdf.create(document, options);
};

const options = {
  format: "A4",
  orientation: "portrait",
  border: "6mm",
  childProcessOptions: {
    env: {
      OPENSSL_CONF: "/dev/null",
    },
  },
};

const generatePdf = async function (pdfData, signedDocumentPath) {
  // Define the consistent file path using path.posix.join
  const filePath = path.posix.join(
    signedDocumentPath,
    `${pdfData?.fileName}.pdf`
  );

  const document = {
    html: pdfData.html,
    data: {},
    path: filePath,
    type: "",
  };

  return new Promise((resolve, reject) => {
    pdf
      .create(document, options)
      .then((res) => {
        console.log(res);
        resolve(res.filename);
      })
      .catch((error) => {
        console.error(error);
        reject("Something went wrong!");
      })
      .finally(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
  });
};

function extractIPAddress(inputString) {
  const ipRegex = /(\d{1,3}\.){3}\d{1,3}/;
  const match = inputString.match(ipRegex);
  return match ? match[0] : null;
}

async function addActivityLogOnPDF(pdfUrl, activities, id, status) {
  // const existingPdfBytes = await fetch(pdfUrl).then((res) => res.buffer());
  const fetch = (await import("node-fetch")).default;
  const existingPdfBytes = await fetch(pdfUrl)
    .then((res) => res.arrayBuffer())
    .then((arrayBuffer) => Buffer.from(arrayBuffer));
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  // Generate the HTML content
  const activityList = activities
    .map((activity, index) => {
      const formattedDate = moment(activity?.date)
        .tz("Asia/Kolkata")
        .format("DD-MM-YYYY hh:mm A");

      return `
      <li style="margin-bottom: 10px; font-size: 12px; color: #555; font-family:Inter">
        <span style="font-weight: bold;">${index + 1}. ${
        activity.description
      }</span>
        <br />
        <span style="font-size: 10px; color: #888;">${formattedDate}</span>
        <span style="font-size: 10px; color: #888;">
          IP Address:
        ${extractIPAddress(activity?.ip_address)}</span>
      </li>
    `;
    })
    .join("");
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500&display=swap');
      </style>
      <title>Document</title>
    </head>
     <body>
    <div style="font-family: 'Inter', sans-serif; color: #333; line-height: 1.6; margin: 20px;">
    <p style="font-size: 14px; margin-bottom: 10px;"><strong>Document ID:</strong> ${id}</p>
    <p style="font-size: 14px; margin-bottom: 20px;"><strong>Status:</strong> ${status}</p>
    <h2 style="font-size: 16px; color: #444; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Activity Log</h2>
    <ul style="list-style: none; padding: 0; margin: 0;">
      ${activityList}
    </ul>
  </div>
   </body>
    </html>
  `;

  const pdfOptions = {
    // html: pdfHtmlTemplate,
    html: htmlContent,
    fileName: `activity_${id}`,
  };

  const signedDocumentPath = path.posix.join("src", "infrastructure", "eSign");

  const htmlPdfBuffer = await generatePdf(pdfOptions, signedDocumentPath);
  const buffer = await fs.readFileSync(htmlPdfBuffer);
  const document = await PDFDocument.load(buffer);

  const [htmlPage] = await pdfDoc.copyPages(document, [0]);
  pdfDoc.addPage(htmlPage);
  const mergedPdfBytes = await pdfDoc.save();

  // Generate a unique filename
  const editedFilename = `${id}.pdf`;

  const signedDocumentFilePath = path.posix.join(
    signedDocumentPath,
    editedFilename
  );

  fs.writeFileSync(signedDocumentFilePath, mergedPdfBytes);

  return signedDocumentFilePath;
}

module.exports = {
  placeMarkersOnPDF,
  addActivityLogOnPDF,
};

// Example usage
// const pdfUrl = 'https://zilla-esign.s3.us-east-2.amazonaws.com/1707895599887-P1%20Hospitality%20Productfeed.pdf';

// const markers = [
//     { x: 100, y: 100, data: "Custom Marker 1", markerType: "text" },
//     {
//         x: 100,
//         y: 100,
//         data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAASCAYAAABb0P4QAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAHuSURBVHgBpVS9TipREJ45u6Dd3Te43uQmJiYma2FiJxT+xApNUDuxMEEtlCdQ3oBOEgu1M/EPO9QCfAG1spS1sxMb4wY448wCusFdRf2SkzOcmfn45sycRfgEY8l0qvMMNVbPj7YKYTkY5hifXdlAos0gHxFlzw/zm10TTs6n+6iBFTYdBMr6fRpwjZNsDfWhi4Ptmw+EscS61WO6G0ydeFMAYKGsGv0rFvKOP2EsuWQrMK85psox1RaN7DduLZox+gftLUBMw5vTk/3CrNmz43yxU8Hd7dXD/4HhJ0Swfce9vGKm0RjBieQy/xmdnh3kE0HlSwVRw41ppKpZB6dTcRvMU5Jw1fypHgOD5lbWohG3ggpODMQSRbAizQqK5Ubde0wQAi9RUw4BpTGLQI0MSJO48xNzy+theWaYgxNTQsAXHS8Xct79cvm7PRH3mlstKnNBeYEKZWx46+My9tpkAs/WdMqmNTWz+rdrwneVYAVk/JHtWUeeuiYs7nudLIPCBZm79nnTxhSbjl+5H6F3yC8hg2CWZIh5JMqt45gMNEF9OiwvtGR5VsqgIR7wcovIFpvJ4kFP7kuFglbpcfgGzOabpAR/qi7hF+B5HeXNMRVQhgB3FC/4JUjDtPf5krnTNbSVIgt+iJdab0E6/wrB9cbBlSZOFAAAAABJRU5ErkJggg==",
//         markerType: "image"
//     },
//     // { x: 100, y: 100, value: { type: 'text', text: 'Marker 1' } },
//     // { x: 200, y: 200, value: { type: 'image', base64: '...', width: 50, height: 50 } },
//     // Add more markers as needed
// ];

// async function uploadEditedPDF(pdfUrl, markers) {
//     try {
//         const fileUrl = await placeMarkersOnPDF(pdfUrl, markers);
//         console.log('Edited PDF uploaded to S3:', fileUrl);
//     } catch (error) {
//         console.error('Error:', error);
//     }
// }

// uploadEditedPDF(pdfUrl, markers);
