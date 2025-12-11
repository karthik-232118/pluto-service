const multer = require("multer");
const path = require("path");
const fs = require("fs");

const configureMulter = ({
  fileSizeLimitMB,
  destinationFolder,
  allowedFileTypes,
}) => {
  if (!fs.existsSync(destinationFolder)) {
    fs.mkdirSync(destinationFolder, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destinationFolder);
    },
    filename: (req, file, cb) => {
      // Use the original file name as the filename
      const fileExtension = path.extname(file.originalname).toLowerCase();
      cb(null, file.originalname); // Preserve the original file name
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
      return cb(new Error(`${file.originalname}: Invalid file type!`), false);
    }
  };

  return multer({
    storage: storage,
    limits: { fileSize: fileSizeLimitMB * 1024 * 1024 },
    fileFilter: fileFilter,
  });
};

const bulkFileUpload = (options) => (req, res, next) => {
  const {
    fileSizeLimitMB,
    destinationFolder,
    allowedFileTypes,
    returnFiles = false,
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

  const upload = configureMulter({ ...options }).array("files");

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

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ message: "Please upload at least one file" });
    }

    let uploadedFiles = null;
    if (returnFiles) {
      uploadedFiles = req.files.map((file) => {
        const completeFileName = file.originalname; // Use the original file name
        let filePath;

        const location = destinationFolder.split("/").pop();

        switch (location) {
          case "Document":
            filePath = path.posix.join("file", "bd", completeFileName);
            break;
          default:
            break;
        }

        return filePath;
      });
    }

    return res.status(201).json({
      message: "Files uploaded successfully",
      data: uploadedFiles,
    });
  });
};

module.exports = bulkFileUpload;
