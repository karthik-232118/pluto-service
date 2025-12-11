const { Router } = require("express");
const {} = require("../../controller/desktop/desktop.controller");
const {} = require("../../validators/public/public.validator");
const multer = require("multer");

const UPLOAD_DIRECTORY = "src/infrastructure/media/Document";

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`[UPLOAD] Storing file in: ${UPLOAD_DIRECTORY}`);
    cb(null, UPLOAD_DIRECTORY);
  },
  filename: (req, file, cb) => {
    console.log(`[UPLOAD] Saving file as: ${file.originalname}`);
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

exports.desktopRoutes = Router().post(
  "/bBexhh1x2W4u5w7",
  upload.single("file"),
  (req, res) => {
    res
      .status(200)
      .send({ success: true, message: "File uploaded successfully" });
  }
);
