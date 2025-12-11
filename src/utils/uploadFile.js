const multer = require("multer");
const path = require("path");
const fs = require("fs");

const configureMulter = ({
  fileSizeLimitMB,
  destinationFolder,
  allowedFileTypes,
  fileName,
}) => {
  if (!fs.existsSync(destinationFolder)) {
    fs.mkdirSync(destinationFolder, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destinationFolder);
    },
    filename: (req, file, cb) => {
      const fileExtension = path.extname(file.originalname).toLowerCase();
      cb(null, fileName + fileExtension);
    },
  });

  const fileFilter = (req, file, cb) => {
    const fileTypesRegex = new RegExp(allowedFileTypes.join("|"), "i");
    const extname = fileTypesRegex.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = fileTypesRegex.test(file.mimetype);

    if (extname || mimetype) {
      return cb(null, true);
    } else {
      return cb(
        new Error(`Only ${allowedFileTypes.join(", ")} files are allowed!`),
        false
      );
    }
  };

  return multer({
    storage: storage,
    limits: { fileSize: fileSizeLimitMB * 1024 * 1024 },
    fileFilter: fileFilter,
  });
};

const uploadFile = (options) => (req, res, next) => {
  const {
    fileSizeLimitMB,
    destinationFolder,
    allowedFileTypes,
    middleware = true,
    required = true,
  } = options;
  if (!fileSizeLimitMB) {
    return res.status(400).json({ message: "fileSizeLimitMB is required" });
  }
  if (!destinationFolder) {
    return res.status(400).json({ message: "destinationFolder is required" });
  }
  if (allowedFileTypes.length < 1) {
    return res.status(400).json({ message: "allowedFileTypes is required" });
  }

  const { currentUserId } = req.payload;
  if (!currentUserId) {
    return res.status(400).json({ message: "Unauthorized user!" });
  }
  const fileName = currentUserId;
  if (!fileName) {
    return res.status(400).json({ message: "fileName is required" });
  }
  const upload = configureMulter({ ...options, fileName }).single("file");

  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: `File size should not exceed ${options.fileSizeLimitMB}MB`,
        });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (required && !req.file) {
      return res.status(400).json({ message: "Please upload a file" });
    }

    if (middleware) {
      return next();
    } else {
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      const completeFileName = fileName + fileExtension;
      let filePath = path.posix.join(destinationFolder, completeFileName);

      if (filePath?.includes("temp_preview")) {
        // Split the filePath at "temp_preview" and retain the second part
        const [, result] = filePath.split("temp_preview");

        // Rebuild the path without "temp_preview"
        filePath = path.posix.join("file", "p", result.trim());
      }

      return res.status(200).json({
        message: "File uploaded successfully",
        data: {
          file: filePath,
        },
      });
    }
  });
};

module.exports = uploadFile;
