const fs = require("fs");
const xss = require("xss");
const moment = require("moment");
const path = require("path");
const crypto = require("crypto");
const unzipper = require("unzipper");
const UserModuleLink = require("../model/UserModuleLink");
const { literal, Op } = require("sequelize");
const ModuleMaster = require("../model/ModuleMaster");
const UserNotification = require("../model/UserNotification");
const { sendNotification } = require("./services/socket");
const Notification = require("../model/Notification");
const { microsoftMailService } = require("./services/nodemailer");
const { logger } = require("./services/logger");
const ContentStructure = require("../model/ContentStructure");
const { sequelize } = require("../model");
const UserDetails = require("../model/UserDetails");

const algorithm = "aes-256-cbc";
const secretKey = process.env.DYNAMIC_FORM_SECRET_KEY.slice(0, 32);
const iv = crypto.randomBytes(16);

const encryptPayload = (payload) => {
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  let encrypted = cipher.update(JSON.stringify(payload), "utf8", "hex");
  encrypted += cipher.final("hex");
  return { iv: iv.toString("hex"), encryptedData: encrypted };
};

const decryptPayload = (encryptedPayload) => {
  const decipher = crypto.createDecipheriv(
    algorithm,
    secretKey,
    Buffer.from(encryptedPayload.iv, "hex")
  );
  let decrypted = decipher.update(
    encryptedPayload.encryptedData,
    "hex",
    "utf8"
  );
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
};

const getLimitAndOffset = (page, pageSize) => {
  page = page ? page : 1;
  pageSize = pageSize ? pageSize : 10;
  const limit = parseInt(pageSize);
  const offset = (parseInt(page) - 1) * pageSize;
  return { limit, offset, pageSize };
};

const pagination = async (page, pageSize, total) => {
  let pagesize, offset, previouspage, nextpage, totalPages;
  page = page ? parseInt(page) : 1;
  pageSize = pageSize ? pageSize : 10;
  pagesize = parseInt(pageSize);
  previouspage = page <= 1 ? null : page - 1;
  nextpage = total / pagesize > page ? page + 1 : null;
  totalPages = total < pageSize ? 1 : Math.ceil(total / pageSize);

  return {
    previousPage: previouspage,
    currentPage: page,
    nextPage: nextpage,
    total: total,
    totalPages: totalPages,
    pageSize: pagesize,
    offset: offset,
  };
};

const sorting = (sortField = "CreatedDate", sortOrder = "DESC") => {
  return [sortField, sortOrder];
};

// delete file from directory
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Error deleting file: ${err.message}`);
          reject(new Error("Could not delete the existing file."));
        }
        console.log(`${filePath} has been deleted.`);
        resolve();
      });
    } else {
      console.log(`${filePath} does not exist.`);
      resolve();
    }
  });
};

// Delete a directory
const deleteFolder = (directoryPath) => {
  return new Promise((resolve, reject) => {
    fs.rm(directoryPath, { recursive: true, force: true }, (err) => {
      if (err) {
        console.error(`Error while deleting directory: ${err}`);
        reject(err);
      } else {
        console.log(`Directory ${directoryPath} deleted successfully`);
        resolve();
      }
    });
  });
};

// Rename file in the directory
const renameFile = (oldPath, newPath) => {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(oldPath)) {
      fs.rename(oldPath, newPath, (err) => {
        if (err) {
          console.error(`Error renaming file: ${err.message}`);
          reject(new Error("Error uploading file"));
        }
        // Get relative path starting from 'src'
        const relativePath = path
          .relative(process.cwd(), newPath)
          .replace(/\\/g, "/");
        console.log(`${oldPath} has been renamed to ${newPath}`);
        resolve(relativePath); // Return the relative path starting from 'src'
      });
    } else {
      console.log(`${oldPath} does not exist for renaming.`);
      reject(new Error("Error Uploading file"));
    }
  });
};

// Function to unzip a file
const unzipFile = async (zipFilePath, outputFolderPath) => {
  try {
    // Ensure the output folder exists
    if (!fs.existsSync(outputFolderPath)) {
      fs.mkdirSync(outputFolderPath, { recursive: true });
    }

    // Unzip the file
    await fs
      .createReadStream(zipFilePath)
      .pipe(unzipper.Extract({ path: outputFolderPath }))
      .promise();

    logger.info(`File unzipped to ${outputFolderPath}`);
  } catch (err) {
    logger.error("Error unzipping file:", err);
    throw new Error(err);
  }
};

// Get file path from src
const getFilePathFromSrc = (oldPath) => {
  return path.relative(process.cwd(), oldPath).replace(/\\/g, "/");
};

function calculateEscalationDate(createdDate, escalationType, escalationAfter) {
  const escalationAfterInt = parseInt(escalationAfter, 10);
  const createdDateMoment = moment(createdDate);

  // Adjust the date based on EscalationType
  switch (escalationType) {
    case "Minutes":
      return createdDateMoment
        .add(escalationAfterInt, "minutes")
        .format("D MMM YYYY HH:mm");
    case "Hours":
      return createdDateMoment
        .add(escalationAfterInt, "hours")
        .format("D MMM YYYY HH:mm");
    case "Days":
      return createdDateMoment
        .add(escalationAfterInt, "days")
        .format("D MMM YYYY");
    case "Weeks":
      return createdDateMoment
        .add(escalationAfterInt, "weeks")
        .format("D MMM YYYY");
    case "Months":
      return createdDateMoment
        .add(escalationAfterInt, "months")
        .format("D MMM YYYY");
    case "Years":
      return createdDateMoment
        .add(escalationAfterInt, "years")
        .format("D MMM YYYY");
    default:
      throw new Error("Invalid escalation type");
  }
}

// Function to check if the input is safe
const isInputSafe = (input) => {
  const sanitizedInput = xss(input);

  // If input is modified during sanitization, it's potentially unsafe
  if (sanitizedInput != input) {
    return false;
  }
  return true;
};

const assignElementToUser = async (
  UserID = null,
  DepartmentID = null,
  RoleID = null,
  currentUserId = null,
  t = null
) => {
  try {
    if (UserID && currentUserId && t && (DepartmentID || RoleID)) {
      let assignmentElementsToUser = [];

      if (DepartmentID && RoleID) {
        const userModuleLinks = await UserModuleLink.findAll({
          where: {
            DepartmentID,
            RoleID,
            IsDeleted: false,
          },
          transaction: t,
        });

        if (userModuleLinks) {
          const list = userModuleLinks.map((userModuleLink) => {
            return {
              ModuleTypeID: userModuleLink.ModuleTypeID,
              ModuleID: userModuleLink.ModuleID,
              DepartmentID: userModuleLink.DepartmentID,
              RoleID: userModuleLink.RoleID,
              UserID: UserID,
              StartDate: userModuleLink.StartDate,
              DueDate: userModuleLink.DueDate,
              CreatedBy: currentUserId,
            };
          });
          assignmentElementsToUser = assignmentElementsToUser.concat(list); // Fix: reassign the result to the array
        }
      }

      if (DepartmentID) {
        const userModuleLinks = await UserModuleLink.findAll({
          where: {
            DepartmentID,
            RoleID: null,
            IsDeleted: false,
          },
          transaction: t,
        });

        if (userModuleLinks) {
          const list = userModuleLinks.map((userModuleLink) => {
            return {
              ModuleTypeID: userModuleLink.ModuleTypeID,
              ModuleID: userModuleLink.ModuleID,
              DepartmentID: userModuleLink.DepartmentID,
              RoleID: null,
              UserID: UserID,
              StartDate: userModuleLink.StartDate,
              DueDate: userModuleLink.DueDate,
              CreatedBy: currentUserId,
            };
          });
          assignmentElementsToUser = assignmentElementsToUser.concat(list); // Fix: reassign the result to the array
        }
      }

      if (RoleID) {
        const userModuleLinks = await UserModuleLink.findAll({
          where: {
            DepartmentID: null,
            RoleID,
            IsDeleted: false,
          },
          transaction: t,
        });

        if (userModuleLinks) {
          const list = userModuleLinks.map((userModuleLink) => {
            return {
              ModuleTypeID: userModuleLink.ModuleTypeID,
              ModuleID: userModuleLink.ModuleID,
              DepartmentID: null,
              RoleID: userModuleLink.RoleID,
              UserID: UserID,
              StartDate: userModuleLink.StartDate,
              DueDate: userModuleLink.DueDate,
              CreatedBy: currentUserId,
            };
          });
          assignmentElementsToUser = assignmentElementsToUser.concat(list); // Fix: reassign the result to the array
        }
      }

      if (assignmentElementsToUser.length > 0) {
        const filteredElementsToAssign = assignmentElementsToUser.filter(
          (value, index, self) =>
            index ===
            self.findIndex(
              (t) =>
                t.ModuleTypeID === value.ModuleTypeID &&
                t.ModuleID === value.ModuleID
            )
        );

        await UserModuleLink.bulkCreate(filteredElementsToAssign, {
          transaction: t,
        });
        const moduleTypes = await ModuleMaster.findAll({
          where: {
            IsActive: true,
          },
          attributes: ["ModuleTypeID", "ModuleName"],
        });
        const uniqueUsers = [];
        for (const el of filteredElementsToAssign) {
          uniqueUsers.push(el.UserID);
        }
        const notificationStatus = await Notification.findAll({
          where: {
            UserID: uniqueUsers,
            NotificationTypeForAction: ["push", "both"],
          },
          attributes: ["UserID", "NotificationTypeForAction"],
        });
        const notififactionBulk = [];
        for (const el of JSON.parse(JSON.stringify(moduleTypes))) {
          for (const element of filteredElementsToAssign) {
            for (const e of JSON.parse(JSON.stringify(notificationStatus))) {
              if (
                el.ModuleTypeID == element.ModuleTypeID &&
                e.UserID == element.UserID
              ) {
                notififactionBulk.push({
                  UserID: element.UserID,
                  Message: "Element has been assigned to you",
                  NotificationType: "assignment",
                  LinkedType: el.ModuleName,
                  LinkedID: element.ModuleID,
                  CreatedBy: element.CreatedBy,
                });
              }
            }
          }
        }
        for (const el of notififactionBulk) {
          try {
            await UserNotification.create(el);
          } catch (error) {

          }
        }
        await sendNotification(notififactionBulk);
      }
    } else {
      throw new Error("Invalid input parameters to assign element to user");
    }
  } catch (error) {
    throw new Error(error);
  }
};

const removeAssignedElementFromUser = async (
  UserID = null,
  currentUserId = null,
  t = null
) => {
  try {
    if (UserID && currentUserId && t) {
      await UserModuleLink.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { UserID }, transaction: t }
      );
    } else {
      throw new Error(
        "Invalid input parameters to delete assigned element from user"
      );
    }
  } catch (error) {
    throw new Error(error);
  }
};

const getFileExtension = (filePath) => {
  return path.extname(filePath).toLowerCase(); // Lowercase to ensure consistency
};

const generateUUID = () => {
  return crypto.randomUUID();
};

function formatEmailList(emailList) {
  return emailList.replace(/[\s;]+/g, ",");
}

function splitPath(path) {
  return path.split(/[\\/]+/);
}

const sendBulkEmails = async (data, batchSize = 3) => {
  try {
    const batches = chunkArray(data, batchSize);

    for (const batch of batches) {
      batch.map((data) => {
        try {
          microsoftMailService({
            recipientEmail: data?.recipientEmail,
            subject: data?.subject,
            body: data?.body,
          });
        } catch (error) {
          throw Error(error);
        }
      });
      await delay(0.2); // Delay for 12 seconds before sending the next batch
    }
  } catch (error) {
    console.error("Error sending bulk emails:", error);
    throw Error(error);
  }
};

const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const normalizeBool = (val) => val === true || val === "true";

const delay = (minutes) => {
  const ms = minutes * 60 * 1000; // Convert minutes to milliseconds
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const checkEscalationStatus = (
  createdDate,
  escalationType,
  escalationAfter
) => {
  const escalationAfterInt = parseInt(escalationAfter, 10);
  const createdDateMoment = moment(createdDate);
  let escalationDate;

  // Determine the escalation date based on the type and value
  switch (escalationType) {
    case "Minutes":
      escalationDate = createdDateMoment.add(escalationAfterInt, "minutes");
      break;
    case "Hours":
      escalationDate = createdDateMoment.add(escalationAfterInt, "hours");
      break;
    case "Days":
      escalationDate = createdDateMoment.add(escalationAfterInt, "days");
      break;
    case "Weeks":
      escalationDate = createdDateMoment.add(escalationAfterInt, "weeks");
      break;
    case "Months":
      escalationDate = createdDateMoment.add(escalationAfterInt, "months");
      break;
    case "Years":
      escalationDate = createdDateMoment.add(escalationAfterInt, "years");
      break;
    default:
      throw new Error("Invalid escalation type");
  }

  // Check if the current date is after or equal to the escalation date
  return createdDateMoment.isSameOrAfter(escalationDate);
};

const setNoCache = (req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // Set no-cache headers for API routes
  next();
};
const setCache = (req, res, next) => {
  res.setHeader("Cache-Control", "public, max-age=86400, immutable"); // Set cache headers for files
  next();
};

const publicFilesCacheConfig = (res, path) => {
  // Cache static assets like JS, CSS, images for 1 year
  if (
    path.endsWith(".js") ||
    path.endsWith(".css") ||
    path.endsWith(".jpg") ||
    path.endsWith(".png") ||
    path.endsWith(".gif") ||
    path.endsWith(".svg")
  ) {
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
  } else {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  }
};

const getOrdinal = (n) => {
  return (
    n.toLocaleString("en-US", { numberingSystem: "latn", style: "decimal" }) +
    (["th", "st", "nd", "rd"][((n % 100) - 20) % 10] ||
      ["th", "st", "nd", "rd"][n % 100] ||
      "th")
  );
};

const checkFolderHierarchy = async (folderPath, ModuleTypeID) => {
  const folderHierarchy = folderPath
    .split("/")
    .map((folderName) => folderName.trim());
  let parentContentID = null;

  try {
    const results = await ContentStructure.findAll({
      where: {
        ModuleTypeID: ModuleTypeID,
        ContentName: {
          [Op.in]: folderHierarchy,
        },
      },
      attributes: ["ContentID", "ContentName", "ParentContentID"],
      raw: true,
    });

    for (let i = 0; i < folderHierarchy.length; i++) {
      const folderName = folderHierarchy[i];

      const folder = results.find(
        (f) =>
          f.ContentName === folderName && f.ParentContentID === parentContentID
      );

      if (!folder) {
        return {
          error: true,
          message: `Folder '${folderName}' not found in the hierarchy.`,
        };
      }

      if (i > 0 && folder.ParentContentID !== parentContentID) {
        return {
          error: true,
          message: `Folder '${folder.ContentName}' is not a subfolder of the previous folder.`,
        };
      }

      parentContentID = folder.ContentID;
    }

    return {
      error: false,
      message: "Folder hierarchy is correct.",
      data: {
        ContentID: parentContentID,
      },
    };
  } catch (error) {
    logger.error({
      message: error.message,
      error,
    });
    throw error;
  }
};

const deleteFileByBaseNameSync = (baseName, directory) => {
  try {
    const files = fs.readdirSync(directory);

    const fileToDelete = files.find(
      (file) => path.basename(file, path.extname(file)) === baseName
    );

    if (fileToDelete) {
      const filePath = path.posix.join(directory, fileToDelete);

      fs.unlinkSync(filePath);
      logger.info(`File ${filePath} deleted successfully.`);
    } else {
      logger.info(
        `File with base name ${baseName} not found in directory ${directory}.`
      );
    }
  } catch (err) {
    throw err;
  }
};

const sortByPrefixNumericIdentifier = (items, prefix, fallback = Infinity) => {
  const pattern = new RegExp(`^${prefix} (\\d+)`);

  return items.sort((a, b) => {
    const matchA = a.match(pattern);
    const matchB = b.match(pattern);

    const numA = matchA ? parseInt(matchA[1], 10) : fallback;
    const numB = matchB ? parseInt(matchB[1], 10) : fallback;

    return numA - numB;
  });
};

const updateFileContent = async (stableFilePath, modifiedFilePath) => {
  try {
    // Read the current file content synchronously
    const currentContent = fs.readFileSync(stableFilePath, "utf-8");

    // Generate a hash of the current content
    const currentHash = crypto
      .createHash("md5")
      .update(currentContent)
      .digest("hex");

    // Simulate retrieving updated content (e.g., from a database, API, or other source)
    const updatedContent = fs.readFileSync(modifiedFilePath, "utf-8"); // Assuming fetchUpdatedContent is synchronous

    // Generate a hash of the updated content
    const updatedHash = crypto
      .createHash("md5")
      .update(updatedContent)
      .digest("hex");

    // Compare hashes to check if content is different
    if (currentHash !== updatedHash) {
      // Overwrite the file with updated content synchronously
      fs.writeFileSync(stableFilePath, updatedContent, "utf-8");
      return true; // Content was updated
    }

    return false; // No changes detected
  } catch (error) {
    console.error(`Error updating file content for ${stableFilePath}:`, error);
    return false;
  }
};

const getHierarchicalStructure = async (
  rootContentID,
  direction = "BOTTOM_TO_TOP"
) => {
  try {
    const query = `
              WITH RECURSIVE hierarchy AS (
                SELECT
                  "ContentID",
                  "ParentContentID",
                  "ContentName"
                FROM
                  "ContentStructures"
                WHERE
                  "ContentID" = :rootContentID
                  AND "IsDeleted" = false
                UNION ALL
                SELECT
                  cs."ContentID",
                  cs."ParentContentID",
                  cs."ContentName"
                FROM
                  "ContentStructures" cs
                INNER JOIN hierarchy h ON h."ParentContentID" = cs."ContentID"
              )
              SELECT * FROM hierarchy;
            `;

    const results = await sequelize.query(query, {
      replacements: { rootContentID },
      type: sequelize.QueryTypes.SELECT,
    });

    if (direction === "TOP_TO_BOTTOM") {
      return results.reverse();
    } else if (direction === "BOTTOM_TO_TOP") {
      return results;
    } else {
      throw new Error(
        "Invalid direction parameter. Use 'TOP_TO_BOTTOM' or 'BOTTOM_TO_TOP'."
      );
    }
  } catch (error) {
    console.error("Error fetching hierarchical structure:", error);
    throw error;
  }
};

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "").trim();
}

const formatFormModuleData = (questions, answers) => {
  const finalData = [];
  questions.forEach((question) => {
    answers.forEach((answer) => {
      if (question["field_name"] === answer["custom_name"]) {
        const isAnswerArray = answer["value"];

        if (
          isAnswerArray &&
          Array.isArray(isAnswerArray) &&
          isAnswerArray?.length
        ) {
          const answer = [];
          isAnswerArray.forEach((ans) => {
            const options = question["options"];
            const option = options.find((option) => option["key"] === ans);
            answer.push(option["text"]);
          });
          finalData.push({
            question: stripHtml(question["label"]),
            answer: answer,
          });
        } else {
          finalData.push({
            question: stripHtml(question["label"]),
            answer: answer["value"],
          });
        }
      }
    });
  });
  return finalData;
};

const updateUserConnectionStatusToDesktopClient = async (
  userId,
  isConnected,
  socketId
) => {
  try {
    await UserDetails.update(
      {
        IsConnectedToDesktopClient: isConnected,
        DesktopClientSocketId: socketId,
      },
      {
        where: {
          UserID: userId,
        },
      }
    );
  } catch (error) {
    throw new Error(error);
  }
};

const ifValidatorFieldTrue = (fieldName) => {
  return (value, { req }) => {
    const flag = req.body[fieldName];
    return flag === true || flag === "true";
  };
};

const isNonEmptyArray = (arr) => {
  return Array.isArray(arr) && arr.length > 0;
};

const formatUserName = (Obj) => {
  const detail = Obj?.UserDetail || {};
  const userName = Obj?.UserName;

  const parts = [
    detail.UserFirstName,
    detail.UserMiddleName,
    detail.UserLastName,
  ].filter(Boolean);

  const fullName = parts.join(" ").trim();

  if (fullName && userName) {
    return `${fullName} (${userName})`;
  } else if (fullName) {
    return fullName;
  } else if (userName) {
    return `(${userName})`;
  } else {
    return "-";
  }
};

module.exports = {
  encryptPayload,
  decryptPayload,
  getLimitAndOffset,
  pagination,
  sorting,
  deleteFile,
  deleteFolder,
  renameFile,
  unzipFile,
  getFilePathFromSrc,
  calculateEscalationDate,
  normalizeBool,
  isInputSafe,
  assignElementToUser,
  removeAssignedElementFromUser,
  getFileExtension,
  generateUUID,
  formatEmailList,
  splitPath,
  chunkArray,
  sendBulkEmails,
  checkEscalationStatus,
  setNoCache,
  setCache,
  publicFilesCacheConfig,
  getOrdinal,
  checkFolderHierarchy,
  deleteFileByBaseNameSync,
  sortByPrefixNumericIdentifier,
  updateFileContent,
  getHierarchicalStructure,
  formatFormModuleData,
  stripHtml,
  updateUserConnectionStatusToDesktopClient,
  ifValidatorFieldTrue,
  isNonEmptyArray,
  formatUserName,
};
