const { Op, literal } = require("sequelize");
const ContentStructure = require("../../model/ContentStructure");
const DocumentModule = require("../../model/DocumentModule");
const ModuleMaster = require("../../model/ModuleMaster");
const Users = require("../../model/Users");
const helper = require("../../utils/helper");
const constants = require("../../utils/constants");

const { body, validationResult } = require("express-validator");
const TrainingSimulationModule = require("../../model/TrainingSimulationModule");
const TestSimulationModule = require("../../model/TestSimulationModule");
const SopModule = require("../../model/SopModule");
const DocumentModuleDraft = require("../../model/DocumentModuleDraft");
const TrainingSimulationModuleDraft = require("../../model/TrainingSimulationModuleDraft");
const TestSimulationModuleDraft = require("../../model/TestSimulationModuleDraft");
const SopModuleDraft = require("../../model/SopModuleDraft");
const Roles = require("../../model/Roles");
const Departments = require("../../model/Departments");
const TestMcqsModule = require("../../model/TestMcqsModule");
const TestMcqsModuleDraft = require("../../model/TestMcqsModuleDraft");
const FormModule = require("../../model/FormModule");
const FormModuleDraft = require("../../model/FormModuleDraft");
const UserModuleLink = require("../../model/UserModuleLink");
const Campaign = require("../../model/Campaign");
const CampaignParticipant = require("../../model/CampaignParticipant");
const ModuleOwner = require("../../model/ModuleOwner");
const AuditorSignature = require("../../model/AuditorSignature");
const { logger } = require("../../utils/services/logger");
const { moduleMapping } = require("../../utils/moduleConfig");
const ElementAttributeType = require("../../model/ElementAttributeType");

const documentModuleCreateRules = () => {
  return [
    body("ElementAttributeTypeID")
      .trim()
      .notEmpty()
      .withMessage("Element Attribute Type can't be empty")
      .bail()
      .isUUID()
      .withMessage("Element Attribute Type should be a UUID")
      .bail()
      .custom(async (value) => {
        const elementAttributeType = await ElementAttributeType.count({
          where: { ElementAttributeTypeID: value, IsDeleted: false },
        });
        if (!elementAttributeType || elementAttributeType < 1) {
          return Promise.reject("Element Attribute Type doesn't exist");
        }
      }),
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
    body("DocumentID")
      .trim()
      .isUUID()
      .withMessage("Document should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        const documentModule = await DocumentModule.count({
          where: { DocumentID: value, ContentID: req.body.ContentID },
        });
        if (!documentModule || documentModule < 1) {
          return Promise.reject("Document doesn't exist");
        }
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("FileUrl")
      .trim()
      .isString()
      .withMessage("File Url should be a string")
      .notEmpty()
      .withMessage("File Url can't be empty")
      .custom(async (value, { req }) => {
        const DocumentID = req.body.DocumentID;

        if (!DocumentID) {
          const extension = value.includes(".") ? value.split(".").pop() : "";
          if (
            extension === "" ||
            !constants.allowedDocumentFileExtensions.includes(extension)
          ) {
            return Promise.reject("Please upload valid document file");
          }
        }
      }),
    body("DocumentName")
      .trim()
      .notEmpty()
      .withMessage("Document Name can't be empty")
      .bail()
      .isString()
      .withMessage("Document Name should be a string")
      .bail()
      .isLength({ min: 1, max: 100 })
      .withMessage("Document Name should be maximum 100 characters")
      .bail()
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        let documentModule;
        if (req.body.DocumentID) {
          documentModule = await DocumentModule.count({
            where: {
              DocumentName: {
                [Op.iLike]: value,
              },
              DocumentID: { [Op.ne]: req.body.DocumentID },
              ModuleTypeID: req.body.ModuleTypeID,
              ContentID: req.body.ContentID,
              IsDeleted: false,
            },
          });
        } else {
          documentModule = await DocumentModule.count({
            where: {
              DocumentName: {
                [Op.iLike]: value,
              },
              ModuleTypeID: req.body.ModuleTypeID,
              ContentID: req.body.ContentID,
              IsDeleted: false,
            },
          });
        }
        if (documentModule || documentModule > 0) {
          return Promise.reject("Document already exists");
        }
      }),
    body("DocumentDescription")
      .trim()
      .isString()
      .withMessage("Document Description should be a string")
      .optional({ checkFalsy: true, nullable: true })
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("DocumentIsActive")
      .trim()
      .notEmpty()
      .withMessage("Document Status can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Document Status should be a boolean"),
    body("DocumentExpiry")
      .trim()
      .bail()
      .isDate({
        format: "YYYY-MM-DD",
      })
      .withMessage("Document Expiry should be a date in the format YYYY-MM-DD")
      .optional({ checkFalsy: true, nullable: true }),
    body("DocumentTags")
      .trim()
      .isString()
      .withMessage("Document Tags should be a string")
      .matches(/^[a-zA-Z\s,]*$/)
      .withMessage(
        "Document Tags can only contain alphabetic characters (a-z, A-Z)"
      )
      .optional({ checkFalsy: true, nullable: true })
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    //   ,
    // body("SelfApproved")
    //   .trim()
    //   .notEmpty()
    //   .withMessage("Self Approved can't be empty")
    //   .bail()
    //   .isBoolean()
    //   .withMessage("SelfApproved should be a boolean"),
    // body("Checker")
    //   .if(body("SelfApproved").equals("false"))
    //   .custom(async (value) => {
    //     if (!helper.isNonEmptyArray(value)) {
    //       return Promise.reject("Checker should be a non empty array");
    //     }
    //     return Promise.resolve();
    //   }),
    // body("Checker.*")
    //   .isUUID()
    //   .withMessage("Checker should be a UUID")
    //   .bail()
    //   .custom(async (value) => {
    //     const existingUser = await Users.count({
    //       where: { UserID: value },
    //     });
    //     if (!existingUser || existingUser < 1) {
    //       return Promise.reject("Checker doesn't exist");
    //     }
    //   }),
    // body("Approver")
    //   .if(body("SelfApproved").equals("false"))
    //   .custom(async (value) => {
    //     if (!helper.isNonEmptyArray(value)) {
    //       return Promise.reject("Approver should be a non empty array");
    //     }
    //     return Promise.resolve();
    //   }),
    // body("Approver.*")
    //   .isUUID()
    //   .withMessage("Approver should be a UUID")
    //   .bail()
    //   .custom(async (value) => {
    //     const existingUser = await Users.count({
    //       where: { UserID: value },
    //     });
    //     if (!existingUser || existingUser < 1) {
    //       return Promise.reject("Approver doesn't exist");
    //     }
    //   }),
    // body("StakeHolder")
    //   .if((value, { req }) => {
    //     return (
    //       (req.body.SelfApproved === false ||
    //         req.body.SelfApproved === "false") &&
    //       (!req?.body?.Checker ||
    //         (req?.body?.Checker && req?.body?.Checker?.length === 0))
    //     );
    //   })
    //   .custom(async (value) => {
    //     if (!helper.isNonEmptyArray(value)) {
    //       return Promise.reject("StakeHolder should be a non empty array");
    //     }
    //     return Promise.resolve();
    //   }),
    // body("StakeHolder.*")
    //   .isUUID()
    //   .withMessage("StakeHolder should be a UUID")
    //   .bail()
    //   .custom(async (value) => {
    //     const existingUser = await Users.count({
    //       where: { UserID: value },
    //     });
    //     if (!existingUser || existingUser < 1) {
    //       return Promise.reject("StakeHolder doesn't exist");
    //     }
    //   }),
    // body("EscalationPerson")
    //   .if(body("SelfApproved").equals("false"))
    //   .custom(async (value) => {
    //     if (!helper.isNonEmptyArray(value)) {
    //       return Promise.reject(
    //         "Escalation person should be a non empty array"
    //       );
    //     }
    //     return Promise.resolve();
    //   }),
    // body("EscalationPerson.*")
    //   .isUUID()
    //   .withMessage("Escalation Person should be a UUID")
    //   .bail()
    //   .custom(async (value) => {
    //     const existingUser = await Users.count({
    //       where: { UserID: value },
    //     });
    //     if (!existingUser || existingUser < 1) {
    //       return Promise.reject("EscalationPerson doesn't exist");
    //     }
    //   }),
    // body("EscalationType")
    //   .trim()
    //   .if(body("SelfApproved").equals("false"))
    //   .notEmpty()
    //   .withMessage("Escalation Type can't be empty")
    //   .bail()
    //   .isIn(["Minutes", "Hours", "Days", "Weeks", "Months", "Years"])
    //   .withMessage(
    //     "Escalation Type should be Minutes, Hours, Days, Weeks, Months or Years"
    //   ),
    // body("EscalationAfter")
    //   .trim()
    //   .if(body("SelfApproved").equals("false"))
    //   .notEmpty()
    //   .withMessage("Escalation After can't be empty")
    //   .bail()
    //   .isInt()
    //   .withMessage("Escalation After should be an integer")
    //   .custom(async (value) => {
    //     const isSafe = helper.isInputSafe(value);
    //     if (!isSafe) {
    //       return Promise.reject("Suspicious input detected!");
    //     } else {
    //       return Promise.resolve();
    //     }
    //   }),
    // body("DocumentOwner")
    //   .isArray()
    //   .withMessage("Document Owner should be an array"),
    // body("DocumentOwner.*")
    //   .isUUID()
    //   .withMessage("Document Owner should be a UUID")
    //   .bail()
    //   .custom(async (value) => {
    //     const existingUser = await Users.count({
    //       where: {
    //         UserID: value,
    //         UserType: {
    //           [Op.in]: ["ProcessOwner"],
    //         },
    //         IsDeleted: false,
    //       },
    //     });
    //     if (!existingUser || existingUser < 1) {
    //       return Promise.reject("Document Owner doesn't exist");
    //     }
    //   }),
  ];
};

const documentModuleBulkCreateRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Invalid module id")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("Documents")
      .isArray()
      .withMessage("Please add at least one document")
      .custom((value) => {
        if (
          (value && Array.isArray(value) && value.length < 1) ||
          (value && !Array.isArray(value)) ||
          !value
        ) {
          return Promise.reject("Please add at least one document");
        }
        return Promise.resolve();
      }),
    body("Documents.*.CategoryPath")
      .trim()
      .notEmpty()
      .withMessage((value, { path }) => {
        const documentIndex = path.match(/Documents\[(\d+)\]/)?.[1];
        return `Document ${
          Number(documentIndex) + 1
        }: Content hierarchy path cannot be empty`;
      })
      .bail()
      .custom((value, { path }) => {
        const documentIndex = path.match(/Documents\[(\d+)\]/)?.[1];
        const displayIndex = `Document ${Number(documentIndex) + 1}`;

        // 2️⃣ Double slashes check
        if (value.includes("//")) {
          throw new Error(
            `${displayIndex}: Content hierarchy path cannot contain consecutive slashes '//'`
          );
        }

        // 3️⃣ Leading slash check
        if (value.startsWith("/")) {
          throw new Error(
            `${displayIndex}: Content hierarchy path cannot start with a slash '/'`
          );
        }

        // 4️⃣ Trailing slash check
        if (value.endsWith("/")) {
          throw new Error(
            `${displayIndex}: Content hierarchy path cannot end with a slash '/'`
          );
        }

        if (!value.startsWith("Document/")) {
          throw new Error(
            `${displayIndex}: Content hierarchy path must be part of 'Document'`
          );
        }

        return true;
      }),
    body("Documents.*.SourceFolder")
      .trim()
      .notEmpty()
      .withMessage((value, { path }) => {
        const documentIndex = path.match(/Documents\[(\d+)\]/)?.[1];
        return `Document ${
          Number(documentIndex) + 1
        }: Source folder path cannot be empty`;
      })
      .bail()
      .custom((value, { path }) => {
        const documentIndex = path.match(/Documents\[(\d+)\]/)?.[1];
        const displayIndex = `Document ${Number(documentIndex) + 1}`;

        // 2️⃣ Double slashes check
        if (value.includes("//")) {
          throw new Error(
            `${displayIndex}: Source folder path cannot contain consecutive slashes '//'`
          );
        }

        // 3️⃣ Leading slash check
        if (value.startsWith("/")) {
          throw new Error(
            `${displayIndex}: Source folder path cannot start with a slash '/'`
          );
        }

        // 4️⃣ Trailing slash check
        if (value.endsWith("/")) {
          throw new Error(
            `${displayIndex}: Source folder path cannot end with a slash '/'`
          );
        }

        if (!value.startsWith("Document/")) {
          throw new Error(
            `${displayIndex}: Source folder path must be part of 'Document'`
          );
        }

        return true;
      }),
    body("Documents.*.FileName")
      .trim()
      .notEmpty()
      .withMessage((value, { path }) => {
        const documentIndex = path.match(/Documents\[(\d+)\]/)?.[1];
        return `Document ${
          Number(documentIndex) + 1
        }: File name cannot be empty`;
      })
      .bail()
      .custom((value, { path }) => {
        const documentIndex = path.match(/Documents\[(\d+)\]/)?.[1];
        const displayIndex = `Document ${Number(documentIndex) + 1}`;

        const extension = value.includes(".") ? value.split(".").pop() : "";

        if (
          !extension ||
          !constants.allowedDocumentFileExtensions.includes(extension)
        ) {
          throw new Error(
            `${displayIndex}: Please provide valid file name extension`
          );
        }
        return true;
      }),
    body("Documents.*.DocumentName")
      .trim()
      .notEmpty()
      .withMessage((value, { path }) => {
        const documentIndex = path.match(/Documents\[(\d+)\]/)?.[1];
        return `Document ${
          Number(documentIndex) + 1
        }: Document Name field can't be empty`;
      })
      .bail()
      .isString()
      .withMessage((value, { path }) => {
        const documentIndex = path.match(/Documents\[(\d+)\]/)?.[1];
        return `Document ${
          Number(documentIndex) + 1
        }: Document Name should be a string`;
      })
      .bail()
      .isLength({ min: 1, max: 100 })
      .withMessage((value, { path }) => {
        const documentIndex = path.match(/Documents\[(\d+)\]/)?.[1];
        return `Document ${
          Number(documentIndex) + 1
        }: Document Name should be maximum 100 characters`;
      })
      .bail()
      .custom(async (value, { req, path }) => {
        const documentIndex = path.match(/Documents\[(\d+)\]/)?.[1];
        const displayIndex = Number(documentIndex) + 1;

        // Security check for suspicious input
        if (!helper.isInputSafe(value)) {
          return Promise.reject(
            `Document ${displayIndex}: Suspicious input detected!`
          );
        }
      }),
    body("Documents.*.DocumentDescription")
      .trim()
      .isString()
      .withMessage((value, { path }) => {
        const documentIndex = path.match(/Documents\[(\d+)\]/)?.[1];
        return `Document ${
          Number(documentIndex) + 1
        }: Document Description should be a string`;
      })
      .bail()
      .custom(async (value, { path }) => {
        const documentIndex = path.match(/Documents\[(\d+)\]/)?.[1];
        const displayIndex = Number(documentIndex) + 1;

        // Security check for suspicious input
        if (!helper.isInputSafe(value)) {
          return Promise.reject(
            `Document ${displayIndex}: Suspicious input detected!`
          );
        }
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("Documents.*.DocumentExpiry")
      .if((value) => value !== null || !value) // Only proceed with validation if the value is not null
      .trim()
      .bail()
      .isDate({
        format: "DD-MM-YYYY",
      })
      .withMessage((value, { path }) => {
        const documentIndex = path.match(/Documents\[(\d+)\]/)?.[1];
        return `Document ${
          Number(documentIndex) + 1
        }: Document Expiry should be a date in the format DD-MM-YYYY`;
      })
      .optional({
        checkFalsy: true,
        nullable: true,
      }),
    body("Documents.*.DocumentOwner").custom((value, { path }) => {
      const documentIndex = path.match(/Documents\[(\d+)\]/)?.[1];
      const displayIndex = Number(documentIndex) + 1;
      if (
        (value && Array.isArray(value) && value.length < 1) ||
        (value && !Array.isArray(value)) ||
        !value
      ) {
        return Promise.reject(
          `Document ${displayIndex}: Document should have at least one owner`
        );
      }
      return Promise.resolve();
    }),
    body("Documents.*.DocumentOwner.*")
      .isUUID()
      .withMessage((value, { path }) => {
        const [documentIndex, ownerIndex] = path.match(/\d+/g);
        const displayIndex = Number(documentIndex) + 1;
        const displayOwnerIndex = Number(ownerIndex) + 1;
        const ordinalOwnerIndex = helper.getOrdinal(displayOwnerIndex);

        return `Document ${Number(
          displayIndex
        )}: ${ordinalOwnerIndex} Document Owner should be a valid id`;
      })
      .bail()
      .custom(async (value, { path }) => {
        const [documentIndex, ownerIndex] = path.match(/\d+/g);
        const displayIndex = Number(documentIndex) + 1;
        const displayOwnerIndex = Number(ownerIndex) + 1;
        const ordinalOwnerIndex = helper.getOrdinal(displayOwnerIndex);

        const existingUser = await Users.count({
          where: {
            UserID: value,
            UserType: {
              [Op.in]: ["ProcessOwner"],
            },
            IsDeleted: false,
          },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject(
            `Document ${displayIndex}: ${ordinalOwnerIndex} Document owner doesn't exist`
          );
        }
      }),
  ];
};

const publishDocumentModuleRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("DocumentID")
      .trim()
      .notEmpty()
      .withMessage("Document can't be empty")
      .bail()
      .isUUID()
      .withMessage("Document should be a UUID")
      .bail()
      .custom(async (value) => {
        const documentModule = await DocumentModule.count({
          where: { DocumentID: value },
        });
        if (!documentModule || documentModule < 1) {
          return Promise.reject("Document doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
  ];
};

const trainingSimulationModuleCreateRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
    body("TrainingSimulationID")
      .trim()
      .isUUID()
      .withMessage("Skill Building should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        const trainingSimulationModule = await TrainingSimulationModule.count({
          where: { TrainingSimulationID: value, ContentID: req.body.ContentID },
        });
        if (!trainingSimulationModule || trainingSimulationModule < 1) {
          return Promise.reject("Skill Building doesn't exist");
        }
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("FileUrl")
      .trim()
      .isString()
      .withMessage("File Url should be a string")
      .notEmpty()
      .withMessage("File Url can't be empty")
      .custom(async (value, { req }) => {
        const isVideo =
          req?.body?.IsTrainingLinkIsVideo === true ||
          req?.body?.IsTrainingLinkIsVideo === "true";

        if (!req.body.TrainingSimulationID) {
          const extension = value.includes(".") ? value.split(".").pop() : "";
          if (extension !== "") {
            if (
              isVideo &&
              (constants.allowedZipFileExtensions.includes(extension) ||
                !constants.allowedVideoFileExtensions.includes(extension))
            ) {
              return Promise.reject("Please upload video file");
            } else if (
              !isVideo &&
              (constants.allowedVideoFileExtensions.includes(extension) ||
                !constants.allowedZipFileExtensions.includes(extension))
            ) {
              return Promise.reject("Please upload zip file");
            }
          } else {
            return Promise.reject("Please upload zip or video file");
          }
        }
      }),
    body("TrainingSimulationName")
      .trim()
      .notEmpty()
      .withMessage("Skill Building Name can't be empty")
      .bail()
      .isString()
      .withMessage("Skill Building Name should be a string")
      .bail()
      .isLength({ min: 1, max: 100 })
      .withMessage("Skill Building Name should be maximum 100 characters")
      .bail()
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        let trainingSimulationModule;
        if (req.body.TrainingSimulationID) {
          trainingSimulationModule = await TrainingSimulationModule.count({
            where: {
              TrainingSimulationName: {
                [Op.iLike]: value,
              },
              TrainingSimulationID: { [Op.ne]: req.body.TrainingSimulationID },
              ModuleTypeID: req.body.ModuleTypeID,
              ContentID: req.body.ContentID,
              IsDeleted: false,
            },
          });
        } else {
          trainingSimulationModule = await TrainingSimulationModule.count({
            where: {
              TrainingSimulationName: {
                [Op.iLike]: value,
              },
              ModuleTypeID: req.body.ModuleTypeID,
              ContentID: req.body.ContentID,
              IsDeleted: false,
            },
          });
        }
        if (trainingSimulationModule || trainingSimulationModule > 0) {
          return Promise.reject("Skill Building already exists");
        }
      }),
    body("TrainingSimulationDescription")
      .trim()
      .isString()
      .withMessage("Skill Building Description should be a string")
      .optional({ checkFalsy: true, nullable: true })
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),

    body("TrainingSimulationIsActive")
      .trim()
      .notEmpty()
      .withMessage("Skill Building Status can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Skill Building Status should be a boolean"),
    body("TrainingSimulationExpiry")
      .trim()
      .bail()
      .isDate({
        format: "YYYY-MM-DD",
      })
      .withMessage(
        "Skill Building Expiry should be a date in the format YYYY-MM-DD"
      )
      .optional({ checkFalsy: true, nullable: true }),
    body("TrainingSimulationTags")
      .trim()
      .isString()
      .withMessage("Skill Building Tags should be a string")
      .matches(/^[a-zA-Z\s,]*$/)
      .withMessage(
        "Skill Building Tags can only contain alphabetic characters (a-z, A-Z)"
      )
      .optional({ checkFalsy: true, nullable: true })
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("SelfApproved")
      .trim()
      .notEmpty()
      .withMessage("Self Approved can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Self Approved should be a boolean"),
    body("Checker")
      .if(body("SelfApproved").equals("false"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject("Checker should be a non empty array");
        }
        return Promise.resolve();
      }),
    body("Checker.*")
      .isUUID()
      .withMessage("Checker should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: { UserID: value },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Checker doesn't exist");
        }
      }),
    body("Approver")
      .if(body("SelfApproved").equals("false"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject("Approver should be a non empty array");
        }
        return Promise.resolve();
      }),
    body("Approver.*")
      .isUUID()
      .withMessage("Approver should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: { UserID: value },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Approver doesn't exist");
        }
      }),
    body("EscalationPerson")
      .if(body("SelfApproved").equals("false"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject(
            "Escalation person should be a non empty array"
          );
        }
        return Promise.resolve();
      }),
    body("EscalationPerson.*")
      .isUUID()
      .withMessage("Escalation Person should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: { UserID: value },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Escalation Person doesn't exist");
        }
      }),
    body("EscalationType")
      .trim()
      .if(body("SelfApproved").equals("false"))
      .notEmpty()
      .withMessage("Escalation Type can't be empty")
      .bail()
      .isIn(["Minutes", "Hours", "Days", "Weeks", "Months", "Years"])
      .withMessage(
        "Escalation Type should be Minutes, Hours, Days, Weeks, Months or Years"
      ),
    body("EscalationAfter")
      .trim()
      .if(body("SelfApproved").equals("false"))
      .notEmpty()
      .withMessage("Escalation After can't be empty")
      .bail()
      .isInt()
      .withMessage("Escalation After should be an integer")
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("TrainingSimulationOwner")
      .isArray()
      .withMessage("Skill Building Owner should be an array"),
    body("TrainingSimulationOwner.*")
      .isUUID()
      .withMessage("Skill Building Owner should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: {
            UserID: value,
            UserType: {
              [Op.in]: ["ProcessOwner"],
            },
            IsDeleted: false,
          },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Skill Building Owner doesn't exist");
        }
      }),
    body("IsTrainingLinkIsVideo")
      .trim()
      .notEmpty()
      .withMessage("Skill Building Link Video Flag can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Skill Building Link Video Flag should be a boolean"),
  ];
};

const publishTrainingSimulationModuleRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("TrainingSimulationID")
      .trim()
      .notEmpty()
      .withMessage("Skill Building can't be empty")
      .bail()
      .isUUID()
      .withMessage("Skill Building should be a UUID")
      .bail()
      .custom(async (value) => {
        const trainingSimulationModule = await TrainingSimulationModule.count({
          where: { TrainingSimulationID: value },
        });
        if (!trainingSimulationModule || trainingSimulationModule < 1) {
          return Promise.reject("Skill Building doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
  ];
};

const testSimulationModuleCreateRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
    body("TestSimulationID")
      .trim()
      .isUUID()
      .withMessage("Skill Assessment should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        const testSimulationModule = await TestSimulationModule.count({
          where: { TestSimulationID: value, ContentID: req.body.ContentID },
        });
        if (!testSimulationModule || testSimulationModule < 1) {
          return Promise.reject("Skill Assessment doesn't exist");
        }
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("FileUrl")
      .trim()
      .isString()
      .withMessage("File Url should be a string")
      .notEmpty()
      .withMessage("File Url can't be empty")
      .custom(async (value, { req }) => {
        const TestSimulationID = req.body.TestSimulationID;

        if (!TestSimulationID) {
          const extension = value.includes(".") ? value.split(".").pop() : "";
          if (
            extension === "" ||
            !constants.allowedZipFileExtensions.includes(extension)
          ) {
            return Promise.reject("Please upload zip file");
          }
        }
      }),
    body("TestSimulationName")
      .trim()
      .notEmpty()
      .withMessage("Skill Assessment Name can't be empty")
      .bail()
      .isString()
      .withMessage("Skill Assessment Name should be a string")
      .bail()
      .isLength({ min: 1, max: 100 })
      .withMessage("Skill Assessment Name should be maximum 100 characters")
      .bail()
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        let testSimulationModule;
        if (req.body.TestSimulationID) {
          testSimulationModule = await TestSimulationModule.count({
            where: {
              TestSimulationName: {
                [Op.iLike]: value,
              },
              TestSimulationID: { [Op.ne]: req.body.TestSimulationID },
              ModuleTypeID: req.body.ModuleTypeID,
              ContentID: req.body.ContentID,
              IsDeleted: false,
            },
          });
        } else {
          testSimulationModule = await TestSimulationModule.count({
            where: {
              TestSimulationName: {
                [Op.iLike]: value,
              },
              ModuleTypeID: req.body.ModuleTypeID,
              ContentID: req.body.ContentID,
              IsDeleted: false,
            },
          });
        }
        if (testSimulationModule || testSimulationModule > 0) {
          return Promise.reject("Skill Assessment already exists");
        }
      }),
    body("TestSimulationDescription")
      .trim()
      .isString()
      .withMessage("Skill Assessment Description should be a string")
      .optional({ checkFalsy: true, nullable: true })
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),

    body("TestSimulationIsActive")
      .trim()
      .notEmpty()
      .withMessage("Skill Assessment Status can't be empty")         
      .bail()
      .isBoolean()
      .withMessage("Skill Assessment Status should be a boolean"),

    body("TestSimulationTags")
      .trim()
      .isString()
      .withMessage("Skill Assessment Tags should be a string")
      .matches(/^[a-zA-Z\s,]*$/)
      .withMessage(
        "Skill Assessment Tags can only contain alphabetic characters (a-z, A-Z)"
      )
      .optional({ checkFalsy: true, nullable: true })
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("TestSimulationExpiry")
      .trim()
      .bail()
      .isDate({
        format: "YYYY-MM-DD",
      })
      .withMessage(
        "Skill Assessment Expiry should be a date in the format YYYY-MM-DD"
      )
      .optional({ checkFalsy: true, nullable: true }),
    body("SelfApproved")
      .trim()
      .notEmpty()
      .withMessage("Self Approved can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Self Approved should be a boolean"),
    body("Checker")
      .if(body("SelfApproved").equals("false"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject("Checker should be a non empty array");
        }
        return Promise.resolve();
      }),
    body("Checker.*")
      .isUUID()
      .withMessage("Checker should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: { UserID: value },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Checker doesn't exist");
        }
      }),
    body("Approver")
      .if(body("SelfApproved").equals("false"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject("Approver should be a non empty array");
        }
        return Promise.resolve();
      }),
    body("Approver.*")
      .isUUID()
      .withMessage("Approver should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: { UserID: value },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Approver doesn't exist");
        }
      }),
    body("EscalationPerson")
      .if(body("SelfApproved").equals("false"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject(
            "Escalation person should be a non empty array"
          );
        }
        return Promise.resolve();
      }),
    body("EscalationPerson.*")
      .isUUID()
      .withMessage("Escalation Person should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: { UserID: value },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Escalation Person doesn't exist");
        }
      }),
    body("EscalationType")
      .trim()
      .if(body("SelfApproved").equals("false"))
      .notEmpty()
      .withMessage("Escalation Type can't be empty")
      .bail()
      .isIn(["Minutes", "Hours", "Days", "Weeks", "Months", "Years"])
      .withMessage(
        "Escalation Type should be Minutes, Hours, Days, Weeks, Months or Years"
      ),
    body("EscalationAfter")
      .trim()
      .if(body("SelfApproved").equals("false"))
      .notEmpty()
      .withMessage("Escalation After can't be empty")
      .bail()
      .isInt()
      .withMessage("Escalation After should be an integer")
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("TestSimulationOwner")
      .isArray()
      .withMessage("Skill Assessment Owner should be an array"),
    body("TestSimulationOwner.*")
      .isUUID()
      .withMessage("Skill Assessment Owner should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: {
            UserID: value,
            UserType: {
              [Op.in]: ["ProcessOwner"],
            },
            IsDeleted: false,
          },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Skill Assessment Owner doesn't exist");
        }
      }),
    body("TotalAttempts")
      .trim()
      .notEmpty()
      .withMessage("Total Attempts can't be empty")
      .bail()
      .isInt({ min: 0 }) // Ensure the value is an integer and non-negative
      .withMessage("Total Attempts should be a non-negative integer")
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("PassPercentage")
      .trim()
      .notEmpty()
      .withMessage("Pass Percentage can't be empty")
      .bail()
      .isFloat({ min: 1, max: 100 }) // Restrict between 1 and 100
      .withMessage("Pass Percentage must be a decimal between 1 and 100")
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
  ];
};

const publishTestSimulationModuleRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("TestSimulationID")
      .trim()
      .notEmpty()
      .withMessage("Skill Assessment can't be empty")
      .bail()
      .isUUID()
      .withMessage("Skill Assessment should be a UUID")
      .bail()
      .custom(async (value) => {
        const testSimulationModule = await TestSimulationModule.count({
          where: { TestSimulationID: value },
        });
        if (!testSimulationModule || testSimulationModule < 1) {
          return Promise.reject("Skill Assessment doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
  ];
};

const sopModuleCreateRules = () => {
  return [
    body("ElementAttributeTypeID")
      .trim()
      .notEmpty()
      .withMessage("Element Attribute Type can't be empty")
      .bail()
      .isUUID()
      .withMessage("Element Attribute Type should be a UUID")
      .bail()
      .custom(async (value) => {
        const elementAttributeType = await ElementAttributeType.count({
          where: { ElementAttributeTypeID: value, IsDeleted: false },
        });
        if (!elementAttributeType || elementAttributeType < 1) {
          return Promise.reject("Element Attribute Type doesn't exist");
        }
      }),
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
    body("SOPID")
      .trim()
      .isUUID()
      .withMessage("SOP should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        const SopModuleExists = await SopModule.count({
          where: { SOPID: value, ContentID: req.body.ContentID },
        });
        if (!SopModuleExists || SopModuleExists < 1) {
          return Promise.reject("SOP doesn't exist");
        }
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("SOPName")
      .trim()
      .notEmpty()
      .withMessage("SOP Name can't be empty")
      .bail()
      .isString()
      .withMessage("SOP Name should be a string")
      .bail()
      .isLength({ min: 1, max: 100 })
      .withMessage("SOP Name should be maximum 100 characters")
      .bail()
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        let sopModuleCount;
        if (req.body.SOPID) {
          sopModuleCount = await SopModule.count({
            where: {
              SOPName: {
                [Op.iLike]: value,
              },
              SOPID: { [Op.ne]: req.body.SOPID },
              ModuleTypeID: req.body.ModuleTypeID,
              ContentID: req.body.ContentID,
              IsDeleted: false,
            },
          });
        } else {
          sopModuleCount = await SopModule.count({
            where: {
              SOPName: {
                [Op.iLike]: value,
              },
              ModuleTypeID: req.body.ModuleTypeID,
              ContentID: req.body.ContentID,
              IsDeleted: false,
            },
          });
        }
        if (sopModuleCount || sopModuleCount > 0) {
          return Promise.reject("SOP already exists");
        }
      }),
    body("SOPDescription")
      .trim()
      .isString()
      .withMessage("SOP Description should be a string")
      .optional({ checkFalsy: true, nullable: true })
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),

    body("SOPIsActive")
      .trim()
      .notEmpty()
      .withMessage("SOP Status can't be empty")
      .bail()
      .isBoolean()
      .withMessage("SOP Status should be a boolean"),
    body("SOPExpiry")
      .trim()
      .bail()
      .isDate({
        format: "YYYY-MM-DD",
      })
      .withMessage("SOP Expiry should be a date in the format YYYY-MM-DD")
      .optional({ checkFalsy: true, nullable: true }),
    body("SOPTags")
      .trim()
      .isString()
      .withMessage("SOP Tags should be a string")
      .matches(/^[a-zA-Z\s,]*$/)
      .withMessage("SOP Tags can only contain alphabetic characters (a-z, A-Z)")
      .optional({ checkFalsy: true, nullable: true })
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("SelfApproved")
      .trim()
      .notEmpty()
      .withMessage("Self Approved can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Self Approved should be a boolean"),
    // body("Checker")
    //   .if(body("SelfApproved").equals("false"))
    //   .custom(async (value) => {
    //     if (!helper.isNonEmptyArray(value)) {
    //       return Promise.reject("Checker should be a non empty array");
    //     }
    //     return Promise.resolve();
    //   }),
    // body("Checker.*")
    //   .isUUID()
    //   .withMessage("Checker should be a UUID")
    //   .bail()
    //   .custom(async (value) => {
    //     const existingUser = await Users.count({
    //       where: { UserID: value },
    //     });
    //     if (!existingUser || existingUser < 1) {
    //       return Promise.reject("Checker doesn't exist");
    //     }
    //   }),
    // body("Approver")
    //   .if(body("SelfApproved").equals("false"))
    //   .custom(async (value) => {
    //     if (!helper.isNonEmptyArray(value)) {
    //       return Promise.reject("Approver should be a non empty array");
    //     }
    //     return Promise.resolve();
    //   }),
    // body("Approver.*")
    //   .isUUID()
    //   .withMessage("Approver should be a UUID")
    //   .bail()
    //   .custom(async (value) => {
    //     const existingUser = await Users.count({
    //       where: { UserID: value },
    //     });
    //     if (!existingUser || existingUser < 1) {
    //       return Promise.reject("Approver doesn't exist");
    //     }
    //   }),
    // body("EscalationPerson")
    //   .if(body("SelfApproved").equals("false"))
    //   .custom(async (value) => {
    //     if (!helper.isNonEmptyArray(value)) {
    //       return Promise.reject(
    //         "Escalation person should be a non empty array"
    //       );
    //     }
    //     return Promise.resolve();
    //   }),
    // body("EscalationPerson.*")
    //   .isUUID()
    //   .withMessage("Escalation Person should be a UUID")
    //   .bail()
    //   .custom(async (value) => {
    //     const existingUser = await Users.count({
    //       where: { UserID: value },
    //     });
    //     if (!existingUser || existingUser < 1) {
    //       return Promise.reject("Escalation Person doesn't exist");
    //     }
    //   }),
    // body("EscalationType")
    //   .trim()
    //   .if(body("SelfApproved").equals("false"))
    //   .notEmpty()
    //   .withMessage("Escalation Type can't be empty")
    //   .bail()
    //   .isIn(["Minutes", "Hours", "Days", "Weeks", "Months", "Years"])
    //   .withMessage(
    //     "Escalation Type should be Minutes, Hours, Days, Weeks, Months or Years"
    //   ),
    // body("EscalationAfter")
    //   .trim()
    //   .if(body("SelfApproved").equals("false"))
    //   .notEmpty()
    //   .withMessage("Escalation After can't be empty")
    //   .bail()
    //   .isInt()
    //   .withMessage("Escalation After should be an integer")
    //   .custom(async (value) => {
    //     const isSafe = helper.isInputSafe(value);
    //     if (!isSafe) {
    //       return Promise.reject("Suspicious input detected!");
    //     } else {
    //       return Promise.resolve();
    //     }
    //   }),
    // body("SOPOwner").isArray().withMessage("SOP Owner should be an array"),
    // body("SOPOwner.*")
    //   .isUUID()
    //   .withMessage("SOP Owner should be a UUID")
    //   .bail()
    //   .custom(async (value) => {
    //     const existingUser = await Users.count({
    //       where: {
    //         UserID: value,
    //         UserType: {
    //           [Op.in]: ["ProcessOwner"],
    //         },
    //         IsDeleted: false,
    //       },
    //     });
    //     if (!existingUser || existingUser < 1) {
    //       return Promise.reject("SOP Owner doesn't exist");
    //     }
    //   }),
    body("IsTemplate")
      .trim()
      .notEmpty()
      .withMessage("Template flag can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Template flag should be a boolean"),
  ];
};

const flowModuleCreateRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
    body("SOPID")
      .trim()
      .isUUID()
      .withMessage("SOP should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        const SopModuleExists = await SopModule.count({
          where: { SOPID: value, ContentID: req.body.ContentID },
        });
        if (!SopModuleExists || SopModuleExists < 1) {
          return Promise.reject("SOP doesn't exist");
        }
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("SOPName")
      .trim()
      .notEmpty()
      .withMessage("SOP Name can't be empty")
      .bail()
      .isString()
      .withMessage("SOP Name should be a string")
      .bail()
      .isLength({ min: 1, max: 100 })
      .withMessage("SOP Name should be maximum 100 characters")
      .bail()
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        let sopModuleCount;
        if (req.body.SOPID) {
          sopModuleCount = await SopModule.count({
            where: {
              SOPName: {
                [Op.iLike]: value,
              },
              SOPID: { [Op.ne]: req.body.SOPID },
              ModuleTypeID: req.body.ModuleTypeID,
              ContentID: req.body.ContentID,
              IsDeleted: false,
            },
          });
        } else {
          sopModuleCount = await SopModule.count({
            where: {
              SOPName: {
                [Op.iLike]: value,
              },
              ModuleTypeID: req.body.ModuleTypeID,
              ContentID: req.body.ContentID,
              IsDeleted: false,
            },
          });
        }
        if (sopModuleCount || sopModuleCount > 0) {
          return Promise.reject("SOP already exists");
        }
      }),
    body("SOPDescription")
      .trim()
      .isString()
      .withMessage("SOP Description should be a string")
      .optional({ checkFalsy: true, nullable: true })
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),

    body("SOPIsActive")
      .trim()
      .notEmpty()
      .withMessage("SOP Status can't be empty")
      .bail()
      .isBoolean()
      .withMessage("SOP Status should be a boolean"),
    body("SOPExpiry")
      .trim()
      .bail()
      .isDate({
        format: "YYYY-MM-DD",
      })
      .withMessage("SOP Expiry should be a date in the format YYYY-MM-DD")
      .optional({ checkFalsy: true, nullable: true }),
    body("SOPTags")
      .trim()
      .isString()
      .withMessage("SOP Tags should be a string")
      .matches(/^[a-zA-Z\s,]*$/)
      .withMessage("SOP Tags can only contain alphabetic characters (a-z, A-Z)")
      .optional({ checkFalsy: true, nullable: true })
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("SelfApproved")
      .trim()
      .notEmpty()
      .withMessage("Self Approved can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Self Approved should be a boolean"),
    body("Checker")
      .if(body("SelfApproved").equals("false"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject("Checker should be a non empty array");
        }
        return Promise.resolve();
      }),
    body("Checker.*")
      .isUUID()
      .withMessage("Checker should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: { UserID: value },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Checker doesn't exist");
        }
      }),
    body("Approver")
      .if(body("SelfApproved").equals("false"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject("Approver should be a non empty array");
        }
        return Promise.resolve();
      }),
    body("Approver.*")
      .isUUID()
      .withMessage("Approver should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: { UserID: value },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Approver doesn't exist");
        }
      }),
    body("EscalationPerson")
      .if(body("SelfApproved").equals("false"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject(
            "Escalation person should be a non empty array"
          );
        }
        return Promise.resolve();
      }),
    body("EscalationPerson.*")
      .isUUID()
      .withMessage("Escalation Person should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: { UserID: value },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Escalation Person doesn't exist");
        }
      }),
    body("EscalationType")
      .trim()
      .if(body("SelfApproved").equals("false"))
      .notEmpty()
      .withMessage("Escalation Type can't be empty")
      .bail()
      .isIn(["Minutes", "Hours", "Days", "Weeks", "Months", "Years"])
      .withMessage(
        "Escalation Type should be Minutes, Hours, Days, Weeks, Months or Years"
      ),
    body("EscalationAfter")
      .trim()
      .if(body("SelfApproved").equals("false"))
      .notEmpty()
      .withMessage("Escalation After can't be empty")
      .bail()
      .isInt()
      .withMessage("Escalation After should be an integer")
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("SOPOwner").isArray().withMessage("SOP Owner should be an array"),
    body("SOPOwner.*")
      .isUUID()
      .withMessage("SOP Owner should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: {
            UserID: value,
            UserType: {
              [Op.in]: ["ProcessOwner"],
            },
            IsDeleted: false,
          },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("SOP Owner doesn't exist");
        }
      }),
    body("IsTemplate")
      .trim()
      .notEmpty()
      .withMessage("Template flag can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Template flag should be a boolean"),
    body("Nodes").custom(async (value) => {
      if ((value && !Array.isArray(value)) || !value) {
        return Promise.reject("Nodes should be an array");
      }
      if (value?.length < 1) {
        return Promise.reject("At least one node is required");
      }
    }),
    body("Edges").custom(async (value) => {
      if ((value && !Array.isArray(value)) || !value) {
        return Promise.reject("Edges should be an array");
      }
    }),
    body("NodeProperties").custom(async (value) => {
      if ((value && !Array.isArray(value)) || !value) {
        return Promise.reject("Node properties should be an array");
      }
      if (value?.length < 1) {
        return Promise.reject("At least one node property is required");
      }
    }),
    body("NodeRoles").custom(async (value) => {
      if ((value && !Array.isArray(value)) || !value) {
        return Promise.reject("Roles should be an array");
      }
    }),
    body("IsSopWithWorkflow")
      .trim()
      .notEmpty()
      .withMessage("SOP with workflow flag can't be empty")
      .bail()
      .isBoolean()
      .withMessage("SOP with workflow flag should be a boolean"),
    body("NodeRoles.*.id")
      .if(
        (_, { req }) =>
          Array.isArray(req.body.NodeRoles) && req.body.NodeRoles.length > 0
      )
      .trim()
      .notEmpty()
      .withMessage("Node role id can't be empty")
      .bail()
      .isUUID()
      .withMessage("Node role id should be a UUID"),
    body("NodeRoles.*.roleID")
      .if(
        (_, { req }) =>
          Array.isArray(req.body.NodeRoles) && req.body.NodeRoles.length > 0
      )
      .trim()
      .notEmpty()
      .withMessage("Role can't be empty")
      .bail()
      .isUUID()
      .withMessage("Role should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingRole = await Roles.count({
          where: { RoleID: value, IsActive: true, IsDeleted: false },
        });
        if (!existingRole || existingRole < 1) {
          return Promise.reject("Role doesn't exist");
        }
      }),
    body("NodeProperties.*.id")
      .trim()
      .notEmpty()
      .withMessage("Node property id can't be empty")
      .bail()
      .isUUID()
      .withMessage("Node property id should be a UUID"),
    body("NodeProperties.*.serviceID")
      .trim()
      .isUUID()
      .withMessage("Node service id should be a UUID")
      .optional({
        checkFalsy: true,
        nullable: true,
      }),
    body("NodeProperties.*.properties").custom(async (value) => {
      if ((value && !Array.isArray(value)) || !value) {
        return Promise.reject("Properties field should be an array");
      }
      if (value?.length < 1) {
        return Promise.reject("At least one Properties field is required");
      }
    }),
    body("NodeClipAttachments").custom(async (value) => {
      if (value && !Array.isArray(value)) {
        return Promise.reject("Node clip attachments should be an array");
      }
    }),
    body("NodeImageAttachments").custom(async (value) => {
      if (value && !Array.isArray(value)) {
        return Promise.reject("Node image attachments should be an array");
      }
    }),
    body("NodeClipAttachments.*.id")
      .if(
        (_, { req }) =>
          Array.isArray(req.body.NodeClipAttachments) &&
          req.body.NodeClipAttachments.length > 0
      )
      .trim()
      .notEmpty()
      .withMessage("Clip attachment node id can't be empty")
      .bail()
      .isUUID()
      .withMessage("Clip attachment node id should be a UUID"),
    body("NodeClipAttachments.*.attachmentTitle")
      .if(
        (_, { req }) =>
          Array.isArray(req.body.NodeClipAttachments) &&
          req.body.NodeClipAttachments.length > 0
      )
      .trim()
      .notEmpty()
      .withMessage("Clip attachment title can't be empty")
      .bail()
      .isString()
      .withMessage("Clip attachment title should be a string")
      .bail()
      .isLength({ min: 1, max: 100 })
      .withMessage("Clip attachment title should be maximum 100 characters"),
    body("NodeClipAttachments.*.attachmentType")
      .if(
        (_, { req }) =>
          Array.isArray(req.body.NodeClipAttachments) &&
          req.body.NodeClipAttachments.length > 0
      )
      .trim()
      .notEmpty()
      .withMessage("Clip attachment type can't be empty")
      .bail()
      .isString()
      .withMessage("Clip attachment type should be a string")
      .bail()
      .isLength({ min: 1, max: 100 })
      .withMessage("Clip attachment type should be maximum 100 characters"),
    body("NodeClipAttachments.*.attachmentLink")
      .if(
        (_, { req }) =>
          Array.isArray(req.body.NodeClipAttachments) &&
          req.body.NodeClipAttachments.length > 0
      )
      .trim()
      .notEmpty()
      .withMessage("Clip attachment link can't be empty")
      .bail()
      .custom((value, { req, path }) => {
        const index = path.match(/\d+/)?.[0];

        if (index !== undefined) {
          const attachmentType =
            req.body.NodeClipAttachments[parseInt(index, 10)]?.attachmentType;

          if (attachmentType === "link") {
            if (!/^(https?:\/\/[^\s$.?#].[^\s]*)$/i.test(value)) {
              throw new Error("Clip attachment link should be a valid URL");
            }
          } else {
            if (!/^[0-9a-fA-F-]{36}$/.test(value)) {
              throw new Error("Clip attachment link should be a valid UUID");
            }
          }
        }
        return true;
      }),
    body("NodeImageAttachments.*.id")
      .if(
        (_, { req }) =>
          Array.isArray(req.body.NodeImageAttachments) &&
          req.body.NodeImageAttachments.length > 0
      )
      .trim()
      .notEmpty()
      .withMessage("Image attachment node id can't be empty")
      .bail()
      .isUUID()
      .withMessage("Image attachment node id should be a UUID"),
    body("NodeImageAttachments.*.attachmentTitle")
      .if(
        (_, { req }) =>
          Array.isArray(req.body.NodeImageAttachments) &&
          req.body.NodeImageAttachments.length > 0
      )
      .trim()
      .notEmpty()
      .withMessage("Image attachment title can't be empty")
      .bail()
      .isString()
      .withMessage("Image attachment title should be a string")
      .bail()
      .isLength({ min: 1, max: 100 })
      .withMessage("Image attachment title should be maximum 100 characters"),
    body("NodeImageAttachments.*.attachmentLink")
      .if(
        (_, { req }) =>
          Array.isArray(req.body.NodeImageAttachments) &&
          req.body.NodeImageAttachments.length > 0
      )
      .trim()
      .notEmpty()
      .withMessage("Image attachment link can't be empty")
      .bail()
      .isString()
      .withMessage("Image attachment link should be a string"),
    body("NodeImageAttachments.*.attachmentType")
      .if(
        (_, { req }) =>
          Array.isArray(req.body.NodeImageAttachments) &&
          req.body.NodeImageAttachments.length > 0
      )
      .trim()
      .notEmpty()
      .withMessage("Image attachment type can't be empty")
      .bail()
      .isString()
      .withMessage("Image attachment type should be a string")
      .bail()
      .isLength({ min: 1, max: 100 })
      .withMessage("Image attachment type should be maximum 100 characters"),
  ];
};

const publishSopModuleRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("SOPID")
      .trim()
      .notEmpty()
      .withMessage("SOP can't be empty")
      .bail()
      .isUUID()
      .withMessage("SOP should be a UUID")
      .bail()
      .custom(async (value) => {
        const sopModule = await SopModule.count({
          where: { SOPID: value },
        });
        if (!sopModule || sopModule < 1) {
          return Promise.reject("SOP doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
  ];
};

const sopDraftViewRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("ContentID")
      .trim()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("SOPID")
      .trim()
      .notEmpty()
      .withMessage("SOP can't be empty")
      .bail()
      .isUUID()
      .withMessage("SOP should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        const sop = SopModule.count({
          where: {
            SOPID: value,
            ContentID: req.body.ContentID,
            ModuleTypeID: req.body.ModuleTypeID,
            IsDeleted: false,
          },
        });
        const sopDraft = SopModuleDraft.count({
          where: {
            SOPID: value,
            ContentID: req.body.ContentID,
            ModuleTypeID: req.body.ModuleTypeID,
            IsDeleted: false,
          },
        });
        const [sopExists, sopDraftExists] = await Promise.all([sop, sopDraft]);
        if (
          !sopExists ||
          sopExists < 1 ||
          !sopDraftExists ||
          sopDraftExists < 0
        ) {
          return Promise.reject("SOP doesn't exist");
        }
      }),
  ];
};

const sopFlowDraftViewRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("ContentID")
      .trim()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("SOPID")
      .trim()
      .notEmpty()
      .withMessage("SOP can't be empty")
      .bail()
      .isUUID()
      .withMessage("SOP should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        const sopDraftExist = await SopModuleDraft.count({
          where: {
            [Op.or]: [
              {
                SOPDraftID: value,
              },
              {
                SOPID: value,
              },
            ],
            ContentID: req.body.ContentID,
            ModuleTypeID: req.body.ModuleTypeID,
            IsDeleted: false,
          },
          include: [
            {
              required: true,
              model: SopModule,
              as: "SopModule",
              where: {
                IsDeleted: false,
              },
            },
          ],
        });

        if (!sopDraftExist || sopDraftExist < 0) {
          return Promise.reject("SOP doesn't exist");
        }
      }),
  ];
};

const createBulkTestMCQRules = () => {
  return [
    body("QuestionList")
      .isArray()
      .withMessage("Please add at least one question")
      .custom((value) => {
        if (
          (value && Array.isArray(value) && value.length < 1) ||
          (value && !Array.isArray(value)) ||
          !value
        ) {
          return Promise.reject("Please add at least one question.");
        }
        return Promise.resolve();
      }),
    body("QuestionList.*").custom((value, { req, path }) => {
      const questionIndex = path.match(/QuestionList\[(\d+)\]/)?.[1];
      if (questionIndex === undefined) {
        throw new Error("Invalid question structure.");
      }

      const currentQuestion = req.body.QuestionList[questionIndex];
      if (
        !currentQuestion.AnswerList ||
        currentQuestion.AnswerList.length === 0
      ) {
        throw new Error(
          `Question ${
            Number(questionIndex) + 1
          }: Must contain at least one answer.`
        );
      }

      const isCorrectCount = currentQuestion.AnswerList.filter(
        (answer) => answer.IsCorrect === true || answer.IsCorrect === "true"
      ).length;

      if (isCorrectCount === 0) {
        throw new Error(
          `Question ${
            Number(questionIndex) + 1
          }: At least one answer must be marked as correct.`
        );
      }

      if (
        currentQuestion.IsMultipleAnswer === false ||
        currentQuestion.IsMultipleAnswer === "false"
      ) {
        if (isCorrectCount > 1) {
          throw new Error(
            `Question ${
              Number(questionIndex) + 1
            }: Only one answer can be marked as correct.`
          );
        }
      }

      return true;
    }),
    body("QuestionList.*.QuestionHeading")
      .trim()
      .notEmpty()
      .withMessage((value, { path }) => {
        const questionIndex = path.match(/QuestionList\[(\d+)\]/)?.[1];
        return `Question ${
          Number(questionIndex) + 1
        }: Question Heading field can't be empty.`;
      })
      .bail()
      .isString()
      .withMessage((value, { path }) => {
        const questionIndex = path.match(/QuestionList\[(\d+)\]/)?.[1];
        return `Question ${
          Number(questionIndex) + 1
        }: Question Heading must be a string.`;
      }),
    body("QuestionList.*.QuestionText")
      .trim()
      .notEmpty()
      .withMessage((value, { path }) => {
        const questionIndex = path.match(/QuestionList\[(\d+)\]/)?.[1];
        return `Question ${
          Number(questionIndex) + 1
        }: Question Text field can't be empty.`;
      })
      .bail()
      .isString()
      .withMessage((value, { path }) => {
        const questionIndex = path.match(/QuestionList\[(\d+)\]/)?.[1];
        return `Question ${
          Number(questionIndex) + 1
        }: Question Text must be a string.`;
      }),
    body("QuestionList.*.AnswerList")
      .isArray()
      .withMessage((value, { path }) => {
        const questionIndex = path.match(/QuestionList\[(\d+)\]/)?.[1];
        return `Question ${
          Number(questionIndex) + 1
        }: Answer List should have minimum 1 option`;
      })
      .bail()
      .custom((value, { path }) => {
        const questionIndex = path.match(/QuestionList\[(\d+)\]/)?.[1];
        if (
          !value ||
          (value && !Array.isArray(value)) ||
          (value && Array.isArray(value) && value.length < 1)
        ) {
          throw new Error(
            `Question ${
              Number(questionIndex) + 1
            }: Answer List should have minimum 1 option`
          );
        }

        if (value.length > 4) {
          throw new Error(
            `Question ${
              Number(questionIndex) + 1
            }: Answer List can have a maximum of 4 options.`
          );
        }

        return true;
      }),
    body("QuestionList.*.AnswerList.*.OptionText")
      .trim()
      .notEmpty()
      .withMessage((value, { path }) => {
        const [questionIndex, answerIndex] = path.match(/\d+/g);
        return `Question ${Number(questionIndex) + 1}, Answer ${
          Number(answerIndex) + 1
        }: Option Text field can't be empty.`;
      })
      .bail()
      .isString()
      .withMessage((value, { path }) => {
        const [questionIndex, answerIndex] = path.match(/\d+/g);
        return `Question ${Number(questionIndex) + 1}, Answer ${
          Number(answerIndex) + 1
        }: Option Text must be a string.`;
      }),
    body("QuestionList.*.AnswerList.*.IsCorrect")
      .notEmpty()
      .withMessage((value, { path }) => {
        const [questionIndex, answerIndex] = path.match(/\d+/g);
        return `Question ${Number(questionIndex) + 1}, Answer ${
          Number(answerIndex) + 1
        }: IsCorrect field can't be empty.`;
      })
      .bail()
      .isBoolean()
      .withMessage((value, { path }) => {
        const [questionIndex, answerIndex] = path.match(/\d+/g);
        return `Question ${Number(questionIndex) + 1}, Answer ${
          Number(answerIndex) + 1
        }: IsCorrect must be a boolean (true/false).`;
      }),
  ];
};

const testMCQModuleCreateRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
    body("TestMCQID")
      .trim()
      .isUUID()
      .withMessage("Test MCQ should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        const TestMCQModuleExists = await TestMcqsModule.count({
          where: { TestMCQID: value, ContentID: req.body.ContentID },
        });
        if (!TestMCQModuleExists || TestMCQModuleExists < 1) {
          return Promise.reject("Test MCQ doesn't exist");
        }
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("QuestionList")
      .isArray()
      .withMessage("Question List should be an array")
      .custom((value) => {
        if (value.length < 1) {
          return Promise.reject("Please add at least one question");
        }
        return Promise.resolve();
      }),
    body("QuestionList.*.QuestionHeading")
      .trim()
      .notEmpty()
      .withMessage("Question Heading can't be empty")
      .bail()
      .isString()
      .withMessage("Question Heading should be a string")
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("QuestionList.*.QuestionText")
      .trim()
      .notEmpty()
      .withMessage("Question Text can't be empty")
      .bail()
      .isString()
      .withMessage("Question Text should be a string")
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("QuestionList.*.QuestionImage")
      .trim()
      .isString()
      .withMessage("Question Image should be a string")
      .optional({ checkFalsy: true, nullable: true }),
    body("QuestionList.*.IsMultipleAnswer")
      .trim()
      .notEmpty()
      .withMessage("Multiple Answer Toggle can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Multiple Answer Toggle should be a boolean"),
    body("QuestionList.*.IsAnswerWithImage")
      .trim()
      .notEmpty()
      .withMessage("Answer With Image Toggle can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Answer With Image Toggle should be a boolean"),
    body("QuestionList.*.IsRequired")
      .trim()
      .notEmpty()
      .withMessage("Required Toggle can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Required Toggle should be a boolean"),
    body("QuestionList.*.AnswerList")
      .isArray()
      .withMessage("Answer List should be an array")
      .bail()
      .custom((value) => {
        if (value.length > 4) {
          return Promise.reject("Question should have maximum 4 options");
        }
        // Check if at least one answer is correct
        const hasCorrectAnswer = value.some(
          (answer) => answer.IsCorrect === true || answer.IsCorrect === "true"
        );

        if (!hasCorrectAnswer) {
          return Promise.reject(
            "At least one answer must be marked as correct"
          );
        }
        return Promise.resolve();
      }),
    body("QuestionList.*.AnswerList.*.OptionText")
      .trim()
      .notEmpty()
      .withMessage("Option Text can't be empty")
      .bail()
      .isString()
      .withMessage("Option Text should be a string")
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("QuestionList.*.AnswerList.*.IsCorrect")
      .trim()
      .notEmpty()
      .withMessage("Is Correct can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Is Correct should be a boolean"),
    body("TestMCQName")
      .trim()
      .notEmpty()
      .withMessage("Test MCQ Name can't be empty")
      .bail()
      .isString()
      .withMessage("Test MCQ Name should be a string")
      .bail()
      .isLength({ min: 1, max: 100 })
      .withMessage("Test MCQ Name should be maximum 100 characters")
      .bail()
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        let testMCQModuleCount;
        if (req.body.TestMCQID) {
          testMCQModuleCount = await TestMcqsModule.count({
            where: {
              TestMCQName: {
                [Op.iLike]: value,
              },
              TestMCQID: { [Op.ne]: req.body.TestMCQID },
              ModuleTypeID: req.body.ModuleTypeID,
              ContentID: req.body.ContentID,
              IsDeleted: false,
            },
          });
        } else {
          testMCQModuleCount = await TestMcqsModule.count({
            where: {
              TestMCQName: {
                [Op.iLike]: value,
              },
              ModuleTypeID: req.body.ModuleTypeID,
              ContentID: req.body.ContentID,
              IsDeleted: false,
            },
          });
        }
        if (testMCQModuleCount || testMCQModuleCount > 0) {
          return Promise.reject("Test MCQ already exists");
        }
      }),
    body("TestMCQDescription")
      .trim()
      .isString()
      .withMessage("Test MCQ Description should be a string")
      .optional({ checkFalsy: true, nullable: true })
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),

    body("TestMCQIsActive")
      .trim()
      .notEmpty()
      .withMessage("Test MCQ Status can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Test MCQ Status should be a boolean"),
    body("TestMCQExpiry")
      .trim()
      .bail()
      .isDate({
        format: "YYYY-MM-DD",
      })
      .withMessage("Test MCQ Expiry should be a date in the format YYYY-MM-DD")
      .optional({ checkFalsy: true, nullable: true }),
    body("TestMCQTags")
      .trim()
      .isString()
      .withMessage("Test MCQ Tags should be a string")
      .matches(/^[a-zA-Z\s,]*$/)
      .withMessage(
        "Test MCQ Tags can only contain alphabetic characters (a-z, A-Z)"
      )
      .optional({ checkFalsy: true, nullable: true })
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("SelfApproved")
      .trim()
      .notEmpty()
      .withMessage("Self Approved can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Self Approved should be a boolean"),
    body("Checker")
      .if(body("SelfApproved").equals("false"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject("Checker should be a non empty array");
        }
        return Promise.resolve();
      }),
    body("Checker.*")
      .isUUID()
      .withMessage("Checker should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: { UserID: value },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Checker doesn't exist");
        }
      }),
    body("Approver")
      .if(body("SelfApproved").equals("false"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject("Approver should be a non empty array");
        }
        return Promise.resolve();
      }),
    body("Approver.*")
      .isUUID()
      .withMessage("Approver should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: { UserID: value },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Approver doesn't exist");
        }
      }),
    body("EscalationPerson")
      .if(body("SelfApproved").equals("false"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject(
            "Escalation person should be a non empty array"
          );
        }
        return Promise.resolve();
      }),
    body("EscalationPerson.*")
      .isUUID()
      .withMessage("Escalation Person should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: { UserID: value },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Escalation Person doesn't exist");
        }
      }),
    body("EscalationType")
      .trim()
      .if(body("SelfApproved").equals("false"))
      .notEmpty()
      .withMessage("Escalation Type can't be empty")
      .bail()
      .isIn(["Minutes", "Hours", "Days", "Weeks", "Months", "Years"])
      .withMessage(
        "Escalation Type should be Minutes, Hours, Days, Weeks, Months or Years"
      ),
    body("EscalationAfter")
      .trim()
      .if(body("SelfApproved").equals("false"))
      .notEmpty()
      .withMessage("Escalation After can't be empty")
      .bail()
      .isInt()
      .withMessage("Escalation After should be an integer")
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("TestMCQOwner")
      .isArray()
      .withMessage("Test MCQ Owner should be an array"),
    body("TestMCQOwner.*")
      .isUUID()
      .withMessage("Test MCQ Owner should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: {
            UserID: value,
            UserType: {
              [Op.in]: ["ProcessOwner"],
            },
            IsDeleted: false,
          },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Test MCQ Owner doesn't exist");
        }
      }),
    body("PassPercentage")
      .trim()
      .notEmpty()
      .withMessage("Pass Percentage can't be empty")
      .bail()
      .isFloat({ min: 1, max: 100 }) // Restrict between 1 and 100
      .withMessage("Pass Percentage must be a decimal between 1 and 100")
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("TotalAttempts")
      .trim()
      .notEmpty()
      .withMessage("Total Attempts can't be empty")
      .bail()
      .isInt({ min: 0 }) // Ensure the value is an integer and non-negative
      .withMessage("Total Attempts should be a non-negative integer")
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("TotalQuestions")
      .trim()
      .notEmpty()
      .withMessage("Total Questions can't be empty")
      .bail()
      .isInt({ min: 1 }) // Ensure the value is an integer and non-negative
      .withMessage("Total Questions should be a non-negative integer")
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
  ];
};

const publishTestMCQModuleRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("TestMCQID")
      .trim()
      .notEmpty()
      .withMessage("Test MCQ can't be empty")
      .bail()
      .isUUID()
      .withMessage("Test MCQ should be a UUID")
      .bail()
      .custom(async (value) => {
        const testMCQModule = await TestMcqsModule.count({
          where: { TestMCQID: value },
        });
        if (!testMCQModule || testMCQModule < 1) {
          return Promise.reject("Test MCQ doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
  ];
};

const testMCQModuleDraftViewRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
    body("TestMCQID")
      .trim()
      .notEmpty()
      .withMessage("Test MCQ can't be empty")
      .bail()
      .isUUID()
      .withMessage("Test MCQ should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        const testMCQ = TestMcqsModule.count({
          where: {
            TestMCQID: value,
            ContentID: req.body.ContentID,
            ModuleTypeID: req.body.ModuleTypeID,
          },
        });
        const testMCQDraft = TestMcqsModuleDraft.count({
          where: {
            TestMCQID: value,
            ContentID: req.body.ContentID,
            ModuleTypeID: req.body.ModuleTypeID,
          },
        });
        const [testMCQExists, testMCQDraftExists] = await Promise.all([
          testMCQ,
          testMCQDraft,
        ]);
        if (
          !testMCQExists ||
          testMCQExists < 1 ||
          !testMCQDraftExists ||
          testMCQDraftExists < 0
        ) {
          return Promise.reject("Test MCQ doesn't exist");
        }
      }),
  ];
};

const createCategoryRules = () => {
  return [
    body("ContentID")
      .trim()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("ParentContentID")
      .trim()
      .isUUID()
      .withMessage("Parent Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Parent Content doesn't exist");
        }
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("ContentName")
      .trim()
      .notEmpty()
      .withMessage("Content Name can't be empty")
      .bail()
      .isString()
      .withMessage("Content Name should be a string")
      .bail()
      .isLength({ min: 1, max: 100 })
      .withMessage("Content Name should be maximum 100 characters")
      .bail()
      .custom(async (value, { req }) => {
        if (/^template(s)?$/i.test(value)) {
          return Promise.reject(`Content Name can't be ${value}`);
        }

        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        let contentStructure;
        if (req.body.ContentID) {
          contentStructure = await ContentStructure.count({
            where: {
              ContentName: {
                [Op.iLike]: value,
              },
              OrganizationStructureID: req.payload.lincense.EnterpriseID,
              ContentID: { [Op.ne]: req.body.ContentID },
              ParentContentID: req.body.ParentContentID,
              ModuleTypeID: req.body.ModuleTypeID,
              IsDeleted: false,
            },
          });
        } else {
          contentStructure = await ContentStructure.count({
            where: {
              ContentName: {
                [Op.iLike]: value,
              },
              OrganizationStructureID: req.payload.lincense.EnterpriseID,
              ParentContentID: req.body.ParentContentID,
              ModuleTypeID: req.body.ModuleTypeID,
              IsDeleted: false,
            },
          });
        }
        if (contentStructure || contentStructure > 0) {
          return Promise.reject("Content already exists");
        }
      }),
    body("ContentDescription")
      .trim()
      .isString()
      .withMessage("Content Description should be a string")
      .optional({ checkFalsy: true, nullable: true })
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("CategoryStatus")
      .trim()
      .notEmpty()
      .withMessage("Category Status can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Category Status should be a boolean"),
  ];
};

const deleteCategoryRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value, ModuleTypeID: req.body.ModuleTypeID },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Element doesn't exist in this module");
        }
      }),
    body("ParentContentID")
      .trim()
      .notEmpty()
      .withMessage("Parent Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Parent Content should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        const documentModule = await ContentStructure.count({
          where: {
            ContentID: req.body.ContentID,
            ModuleTypeID: req.body.ModuleTypeID,
            ParentContentID: value,
          },
        });
        if (!documentModule || documentModule < 1) {
          return Promise.reject(
            "Element doesn't exist inside this module and parent folder"
          );
        }
      }),
  ];
};

const changeCategoryStatusRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value, ModuleTypeID: req.body.ModuleTypeID },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Element doesn't exist in this module");
        }
      }),
    body("ParentContentID")
      .trim()
      .notEmpty()
      .withMessage("Parent Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Parent Content should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        const documentModule = await ContentStructure.count({
          where: {
            ContentID: req.body.ContentID,
            ModuleTypeID: req.body.ModuleTypeID,
            ParentContentID: value,
          },
        });
        if (!documentModule || documentModule < 1) {
          return Promise.reject(
            "Element doesn't exist inside this module and parent folder"
          );
        }
      }),
    body("CategoryStatus")
      .trim()
      .notEmpty()
      .withMessage("Category Status can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Category Status should be a boolean"),
  ];
};

const documentDraftViewRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
    body("DocumentID")
      .trim()
      .notEmpty()
      .withMessage("Document can't be empty")
      .bail()
      .isUUID()
      .withMessage("Document should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        const documentModule = DocumentModule.count({
          where: {
            DocumentID: value,
            ContentID: req.body.ContentID,
            ModuleTypeID: req.body.ModuleTypeID,
          },
        });
        const documentModuleDraft = DocumentModuleDraft.count({
          where: {
            DocumentID: value,
            ContentID: req.body.ContentID,
            ModuleTypeID: req.body.ModuleTypeID,
          },
        });
        const [documentModuleExists, documentModuleDraftExists] =
          await Promise.all([documentModule, documentModuleDraft]);
        if (
          !documentModuleExists ||
          documentModuleExists < 1 ||
          !documentModuleDraftExists ||
          documentModuleDraftExists < 0
        ) {
          return Promise.reject("Document doesn't exist");
        }
      }),
  ];
};

const trainingSimulationDraftViewRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
    body("TrainingSimulationID")
      .trim()
      .notEmpty()
      .withMessage("Skill Building can't be empty")
      .bail()
      .isUUID()
      .withMessage("Skill Building should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        const trainingSimulationModule = TrainingSimulationModule.count({
          where: {
            TrainingSimulationID: value,
            ContentID: req.body.ContentID,
            ModuleTypeID: req.body.ModuleTypeID,
          },
        });
        const trainingSimulationModuleDraft =
          TrainingSimulationModuleDraft.count({
            where: {
              TrainingSimulationID: value,
              ContentID: req.body.ContentID,
              ModuleTypeID: req.body.ModuleTypeID,
            },
          });
        const [
          trainingSimulationModuleExists,
          trainingSimulationModuleDraftExists,
        ] = await Promise.all([
          trainingSimulationModule,
          trainingSimulationModuleDraft,
        ]);
        if (
          !trainingSimulationModuleExists ||
          trainingSimulationModuleExists < 1 ||
          !trainingSimulationModuleDraftExists ||
          trainingSimulationModuleDraftExists < 0
        ) {
          return Promise.reject("Skill Building doesn't exist");
        }
      }),
  ];
};

const testSimulationDraftViewRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
    body("TestSimulationID")
      .trim()
      .notEmpty()
      .withMessage("Skill Assessment can't be empty")
      .bail()
      .isUUID()
      .withMessage("Skill Assessment should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        const testSimulationModule = TestSimulationModule.count({
          where: {
            TestSimulationID: value,
            ContentID: req.body.ContentID,
            ModuleTypeID: req.body.ModuleTypeID,
          },
        });
        const testSimulationModuleDraft = TestSimulationModuleDraft.count({
          where: {
            TestSimulationID: value,
            ContentID: req.body.ContentID,
            ModuleTypeID: req.body.ModuleTypeID,
          },
        });
        const [testSimulationModuleExists, testSimulationModuleDraftExists] =
          await Promise.all([testSimulationModule, testSimulationModuleDraft]);
        if (
          !testSimulationModuleExists ||
          testSimulationModuleExists < 1 ||
          !testSimulationModuleDraftExists ||
          testSimulationModuleDraftExists < 0
        ) {
          return Promise.reject("Skill Assessment doesn't exist");
        }
      }),
  ];
};

const assignElementToRoleAndDepartmentRules = () => {
  return [
    body("startDate")
      .trim()
      .notEmpty()
      .withMessage("Start Date can't be empty")
      .bail()
      .isDate({
        format: "YYYY-MM-DD",
      })
      .withMessage("Start Date should be a date"),
    body("dueDate")
      .trim()
      .notEmpty()
      .withMessage("End Date can't be empty")
      .bail()
      .isDate({
        format: "YYYY-MM-DD",
      })
      .withMessage("End Date should be a date"),
    body("roles")
      .isArray()
      .withMessage("Roles should be an array")
      .bail()
      .custom((roles, { req }) => {
        const departments = req.body.departments;
        if (
          Array.isArray(roles) &&
          roles.length === 0 &&
          Array.isArray(departments) &&
          departments.length === 0
        ) {
          throw new Error("Either roles or departments must be non-empty.");
        }
        return true;
      }),
    body("roles.*")
      .optional({ checkFalsy: true, nullable: true })
      .isUUID()
      .withMessage("Roles should be a UUID")
      .bail()
      .custom(async (value) => {
        const role = await Roles.count({
          where: { RoleID: value, IsDeleted: false },
        });
        if (!role || role < 1) {
          return Promise.reject("Role doesn't exist");
        }
      }),
    body("departments")
      .isArray()
      .withMessage("Departments should be an array")
      .bail()
      .custom((departments, { req }) => {
        const roles = req.body.roles;
        if (
          Array.isArray(departments) &&
          departments.length === 0 &&
          Array.isArray(roles) &&
          roles.length === 0
        ) {
          throw new Error("Either roles or departments must be non-empty.");
        }
        return true;
      }),
    body("departments.*")
      .optional({ checkFalsy: true, nullable: true })
      .bail()
      .isUUID()
      .withMessage("Departments should be a UUID")
      .bail()
      .custom(async (value) => {
        const department = await Departments.count({
          where: { DepartmentID: value, IsDeleted: false },
        });
        if (!department || department < 1) {
          return Promise.reject("Department doesn't exist");
        }
      }),
    body("modules")
      .isArray()
      .withMessage("Modules should be an array")
      .custom((modules) => {
        if (modules.length === 0) {
          return Promise.reject("Modules can't be empty");
        }
        return Promise.resolve();
      }),
    body("modules.*").isObject().withMessage("Modules should be an object"),
    body("modules.*.name")
      .trim()
      .notEmpty()
      .withMessage("Module Name can't be empty")
      .bail()
      .isIn(Object.keys(moduleMapping))
      .withMessage(
        `Module name should be either one of ${Object.keys(moduleMapping).join(
          ", "
        )}`
      ),
    body("modules.*.ModuleTypeID")
      .notEmpty()
      .withMessage("Module ID can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module ID should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value, IsActive: true },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("modules.*.data")
      .isArray()
      .withMessage("Data should be an array")
      .custom((data) => {
        if (data.length === 0) {
          return Promise.reject("Data can't be empty");
        }
        return Promise.resolve();
      }),
    body("modules.*.data.*")
      .notEmpty()
      .withMessage("Element can't be empty")
      .bail()
      .isUUID()
      .withMessage("Element should be a UUID")
      .bail()
      .custom(async (value, { req, path }) => {
        try {
          const moduleIndexMatch = path.match(/modules\[(\d+)\]/);

          if (!moduleIndexMatch) {
            logger.error({
              message: "Unable to determine module index from path",
              details: "Unable to determine module index from path",
            });
            return Promise.reject("Module doesn't exist");
          }

          const moduleIndex = moduleIndexMatch[1]; // Extract the index from the regex match

          // Access the module's name
          const moduleName = req.body.modules[moduleIndex].name;
          const ModuleTypeID = req.body.modules[moduleIndex].ModuleTypeID;

          const moduleConfig = moduleMapping[moduleName];

          if (!moduleConfig) {
            logger.error({
              message: `${moduleName} Module doesn't exist`,
              details: `${moduleName} Module doesn't exist`,
            });
            return Promise.reject("Module doesn't exist");
          }

          const { model, idField } = moduleConfig;

          if (!model || !idField) {
            logger.error({
              message: `${moduleName} Module doesn't exist`,
              details: `${moduleName} Module doesn't exist`,
            });
            return Promise.reject("Module doesn't exist");
          }

          const moduleCount = await model.count({
            where: { [idField]: value, ModuleTypeID, IsDeleted: false },
          });

          // If no record is found for the specific module or folder, return an error
          if (!moduleCount || moduleCount < 1) {
            logger.error({
              message: `Module does not exist - For ${moduleName} with ID: ${value}`,
              details: `Module does not exist - For ${moduleName} with ID: ${value}`,
            });
            return Promise.reject(`Module does not exist - For ${moduleName}`);
          }
        } catch (error) {
          logger.error({
            message: error.message,
            details: error,
          });
          return Promise.reject(
            "An unexpected error occurred during validation."
          );
        }
      }),
    body("isAllUsers")
      .trim()
      .notEmpty()
      .withMessage("Users type can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Users type should be a boolean"),
    body("selectedUsers")
      .if(body("isAllUsers").equals("false"))
      .isArray()
      .withMessage("At least one user should be selected")
      .bail()
      .custom((value, { req }) => {
        if (value.length === 0) {
          return Promise.reject("At least one user should be selected");
        }
        return Promise.resolve();
      }),
    body("selectedUsers.*")
      .if(body("isAllUsers").equals("false"))
      .notEmpty()
      .withMessage("Selected Users can't be empty")
      .isUUID()
      .withMessage("Selected Users should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: { UserID: value },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Selected User doesn't exist");
        }
      }),
  ];
};

const viewElementDraftActivityLogRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module Type ID can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module Type ID should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value, IsActive: true },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module Type doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value, IsDeleted: false },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
    body("ModuleName")
      .trim()
      .notEmpty()
      .withMessage("ModuleName can't be empty")
      .bail()
      .isIn(Object.keys(moduleMapping))
      .withMessage("Invalid Module Name")
      .bail()
      .isString()
      .withMessage("ModuleName should be a string"),
    body("ModuleID")
      .trim()
      .notEmpty()
      .withMessage("Module ID can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module ID should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        try {
          const moduleName = req.body.ModuleName;

          const moduleConfig = moduleMapping[moduleName];

          if (!moduleConfig) {
            logger.error({
              message: `${moduleName} Module doesn't exist`,
              details: `${moduleName} Module doesn't exist`,
            });
            return Promise.reject("Module doesn't exist");
          }

          const { model, idField } = moduleConfig;

          if (!model || !idField) {
            logger.error({
              message: `${moduleName} Module doesn't exist`,
              details: `${moduleName} Module doesn't exist`,
            });
            return Promise.reject("Module doesn't exist");
          }

          const moduleExists = await model.count({
            where: {
              [idField]: value,
              ContentID: req.body.ContentID,
              ModuleTypeID: req.body.ModuleTypeID,
            },
          });

          if (!moduleExists || moduleExists < 1) {
            return Promise.reject("Element doesn't exist");
          }
        } catch (error) {
          logger.error({
            message: error.message,
            details: error,
          });
          return Promise.reject(
            "An unexpected error occurred during validation."
          );
        }
      }),
  ];
};

const viewElementDraftActivityLogHistoryRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module Type ID can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module Type ID should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value, IsActive: true },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module Type doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value, IsDeleted: false },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
    body("ModuleName")
      .trim()
      .notEmpty()
      .withMessage("ModuleName can't be empty")
      .bail()
      .isIn(Object.keys(moduleMapping))
      .withMessage("Invalid Module Name")
      .bail()
      .isString()
      .withMessage("ModuleName should be a string"),
    body("ModuleID")
      .trim()
      .notEmpty()
      .withMessage("Module ID can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module ID should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        try {
          const moduleName = req.body.ModuleName;

          const moduleConfig = moduleMapping[moduleName];

          if (!moduleConfig) {
            logger.error({
              message: `${moduleName} Module doesn't exist`,
              details: `${moduleName} Module doesn't exist`,
            });
            return Promise.reject("Module doesn't exist");
          }

          const { model, idField } = moduleConfig;

          if (!model || !idField) {
            logger.error({
              message: `${moduleName} Module doesn't exist`,
              details: `${moduleName} Module doesn't exist`,
            });
            return Promise.reject("Module doesn't exist");
          }

          const moduleExists = await model.count({
            where: {
              [idField]: value,
              ContentID: req.body.ContentID,
              ModuleTypeID: req.body.ModuleTypeID,
            },
          });

          if (!moduleExists || moduleExists < 1) {
            return Promise.reject("Element doesn't exist");
          }
        } catch (error) {
          logger.error({
            message: error.message,
            details: error,
          });
          return Promise.reject(
            "An unexpected error occurred during validation."
          );
        }
      }),
  ];
};

const impactAnalysisRules = () => {
  return [
    body("ImpactAnalysisTarget")
      .trim()
      .notEmpty()
      .withMessage("Impact Analysis Target can't be empty")
      .bail()
      .isIn([
        "Document",
        "SkillBuilding",
        "SkillAssessment",
        "SOP",
        "TestMCQ",
        "Form",
        "Department",
        "Role",
        "Auditor",
        "StakeHolder",
        "UserSignature",
      ])
      .withMessage("Invalid impact analysis target"),
    body("ModuleID")
      .trim()
      .notEmpty()
      .withMessage("Module ID can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module ID should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        const moduleName = req.body.ImpactAnalysisTarget;

        let moduleCount;
        switch (moduleName) {
          case "Document":
            moduleCount = DocumentModule.count({
              where: {
                DocumentID: value,
                IsDeleted: false,
              },
            });
            break;

          case "SkillBuilding":
            moduleCount = TrainingSimulationModule.count({
              where: {
                TrainingSimulationID: value,
                IsDeleted: false,
              },
            });
            break;

          case "SkillAssessment":
            moduleCount = TestSimulationModule.count({
              where: {
                TestSimulationID: value,
                IsDeleted: false,
              },
            });
            break;

          case "SOP":
            moduleCount = SopModule.count({
              where: {
                SOPID: value,
                IsDeleted: false,
              },
            });
            break;

          case "TestMCQ":
            moduleCount = TestMcqsModule.count({
              where: {
                TestMCQID: value,
                IsDeleted: false,
              },
            });
            break;
          case "Form":
            moduleCount = FormModule.count({
              where: {
                FormID: value,
                IsDeleted: false,
              },
            });
            break;
          case "Department":
            moduleCount = UserModuleLink.count({
              where: {
                DepartmentID: value,
                IsDeleted: false,
              },
            });
            break;
          case "Role":
            moduleCount = UserModuleLink.count({
              where: {
                RoleID: value,
                IsDeleted: false,
              },
            });
            break;
          case "Auditor":
            moduleCount = AuditorSignature.count({
              where: literal(
                `'${value}' = ANY("AuditorSignature"."AuditorIDs")`
              ),
            });
            break;
          case "StakeHolder":
            moduleCount = ModuleOwner.count({
              where: {
                UserID: value,
                IsDeleted: false,
              },
            });
            break;
          case "UserSignature":
            moduleCount = AuditorSignature.count({
              where: literal(
                `'${value}' = ANY("AuditorSignature"."SignatureIDs")`
              ),
            });
            break;
        }
        const moduleExists = await moduleCount;

        if (!moduleExists || moduleExists < 1) {
          return Promise.reject(`${moduleName} doesn't exist`);
        }

        return Promise.resolve();
      }),
  ];
};

const formModuleCreateRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
    body("FormID")
      .trim()
      .isUUID()
      .withMessage("Form should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        const formModule = await FormModule.count({
          where: { FormID: value, ContentID: req.body.ContentID },
        });
        if (!formModule || formModule < 1) {
          return Promise.reject("Form doesn't exist");
        }
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("FormName")
      .trim()
      .notEmpty()
      .withMessage("Form Name can't be empty")
      .bail()
      .isString()
      .withMessage("Form Name should be a string")
      .bail()
      .isLength({ min: 1, max: 100 })
      .withMessage("Form Name should be maximum 100 characters")
      .bail()
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        let formModule;
        if (req.body.FormID) {
          formModule = await FormModule.count({
            where: {
              FormName: {
                [Op.iLike]: value,
              },
              FormID: { [Op.ne]: req.body.FormID },
              ModuleTypeID: req.body.ModuleTypeID,
              ContentID: req.body.ContentID,
              IsDeleted: false,
            },
          });
        } else {
          formModule = await FormModule.count({
            where: {
              FormName: {
                [Op.iLike]: value,
              },
              ModuleTypeID: req.body.ModuleTypeID,
              ContentID: req.body.ContentID,
              IsDeleted: false,
            },
          });
        }
        if (formModule || formModule > 0) {
          return Promise.reject("Form already exists");
        }
      }),
    body("FormDescription")
      .trim()
      .isString()
      .withMessage("Form Description should be a string")
      .optional({ checkFalsy: true, nullable: true })
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("FormIsActive")
      .trim()
      .notEmpty()
      .withMessage("Form Status can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Form Status should be a boolean"),
    body("FormExpiry")
      .trim()
      .bail()
      .isDate({
        format: "YYYY-MM-DD",
      })
      .withMessage("Form Expiry should be a date in the format YYYY-MM-DD")
      .optional({ checkFalsy: true, nullable: true }),
    body("FormTags")
      .trim()
      .isString()
      .withMessage("Form Tags should be a string")
      .matches(/^[a-zA-Z\s,]*$/)
      .withMessage(
        "Form Tags can only contain alphabetic characters (a-z, A-Z)"
      )
      .optional({ checkFalsy: true, nullable: true })
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("SelfApproved")
      .trim()
      .notEmpty()
      .withMessage("Self Approved can't be empty")
      .bail()
      .isBoolean()
      .withMessage("SelfApproved should be a boolean"),
    body("Checker")
      .if(body("SelfApproved").equals("false"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject("Checker should be a non empty array");
        }
        return Promise.resolve();
      }),
    body("Checker.*")
      .isUUID()
      .withMessage("Checker should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: { UserID: value },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Checker doesn't exist");
        }
      }),
    body("Approver")
      .if(body("SelfApproved").equals("false"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject("Approver should be a non empty array");
        }
        return Promise.resolve();
      }),
    body("Approver.*")
      .isUUID()
      .withMessage("Approver should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: { UserID: value },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Approver doesn't exist");
        }
      }),
    body("EscalationPerson")
      .if(body("SelfApproved").equals("false"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject(
            "Escalation person should be a non empty array"
          );
        }
        return Promise.resolve();
      }),
    body("EscalationPerson.*")
      .isUUID()
      .withMessage("Escalation Person should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: { UserID: value },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("EscalationPerson doesn't exist");
        }
      }),
    body("EscalationType")
      .trim()
      .if(body("SelfApproved").equals("false"))
      .notEmpty()
      .withMessage("Escalation Type can't be empty")
      .bail()
      .isIn(["Minutes", "Hours", "Days", "Weeks", "Months", "Years"])
      .withMessage(
        "Escalation Type should be Minutes, Hours, Days, Weeks, Months or Years"
      ),
    body("EscalationAfter")
      .trim()
      .if(body("SelfApproved").equals("false"))
      .notEmpty()
      .withMessage("Escalation After can't be empty")
      .bail()
      .isInt()
      .withMessage("Escalation After should be an integer")
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("FormOwner").isArray().withMessage("Form Owner should be an array"),
    body("FormOwner.*")
      .isUUID()
      .withMessage("Form Owner should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: {
            UserID: value,
            UserType: {
              [Op.in]: ["ProcessOwner"],
            },
            IsDeleted: false,
          },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Form Owner doesn't exist");
        }
      }),
  ];
};

const publishFormModuleRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("FormID")
      .trim()
      .notEmpty()
      .withMessage("Form can't be empty")
      .bail()
      .isUUID()
      .withMessage("Form should be a UUID")
      .bail()
      .custom(async (value) => {
        const formModule = await FormModule.count({
          where: { FormID: value },
        });
        if (!formModule || formModule < 1) {
          return Promise.reject("Form doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
  ];
};

const formDraftViewRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
    body("FormID")
      .trim()
      .notEmpty()
      .withMessage("Form can't be empty")
      .bail()
      .isUUID()
      .withMessage("Form should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        const formModule = FormModule.count({
          where: {
            FormID: value,
            ContentID: req.body.ContentID,
            ModuleTypeID: req.body.ModuleTypeID,
          },
        });
        const formModuleDraft = FormModuleDraft.count({
          where: {
            FormID: value,
            ContentID: req.body.ContentID,
            ModuleTypeID: req.body.ModuleTypeID,
          },
        });
        const [formModuleExists, formModuleDraftExists] = await Promise.all([
          formModule,
          formModuleDraft,
        ]);
        if (
          !formModuleExists ||
          formModuleExists < 1 ||
          !formModuleDraftExists ||
          formModuleDraftExists < 1
        ) {
          return Promise.reject("Form doesn't exist");
        }
      }),
  ];
};

const viewFormRules = () => {
  return [
    body("FormModuleDraftID")
      .trim()
      .notEmpty()
      .withMessage("Form InProgress ID can't be empty")
      .bail()
      .isUUID()
      .withMessage("Form InProgress should be a UUID")
      .bail()
      .custom(async (value) => {
        const formDraft = await FormModuleDraft.count({
          where: { FormModuleDraftID: value },
        });
        const form = await FormModule.count({
          include: [
            {
              model: FormModuleDraft,
              required: true,
              where: { FormModuleDraftID: value },
            },
          ],
        });
        if (!formDraft || formDraft < 1 || !form || form < 1) {
          return Promise.reject("Form doesn't exist");
        }
      }),
  ];
};

const createFormRules = () => {
  return [
    body("FormModuleDraftID")
      .trim()
      .notEmpty()
      .withMessage("Form InProgress ID can't be empty")
      .bail()
      .isUUID()
      .withMessage("Form InProgress should be a UUID")
      .bail()
      .custom(async (value) => {
        const formDraft = await FormModuleDraft.count({
          where: { FormModuleDraftID: value },
        });
        const form = await FormModule.count({
          include: [
            {
              model: FormModuleDraft,
              required: true,
              where: { FormModuleDraftID: value },
            },
          ],
        });
        if (!formDraft || formDraft < 1 || !form || form < 1) {
          return Promise.reject("Form doesn't exist");
        }
      }),
    body("Mode")
      .trim()
      .notEmpty()
      .withMessage("Mode can't be empty")
      .bail()
      .isIn(["create", "edit"])
      .withMessage("Invalid Mode"),
  ];
};

const createCampaignRules = () => {
  return [
    body("Step")
      .trim()
      .notEmpty()
      .withMessage("Step can't be empty")
      .bail()
      .isInt()
      .withMessage("Step should be an integer")
      .bail()
      .isIn([1, 2, 3])
      .withMessage("Step should be 1, 2 or 3"),
    body("CampaignName")
      .if(body("Step").equals("1"))
      .trim()
      .notEmpty()
      .withMessage("Campaign Name can't be empty")
      .bail()
      .isString()
      .withMessage("Campaign Name should be a string")
      .bail()
      .isLength({ min: 1, max: 100 })
      .withMessage("Campaign Name should be maximum 100 characters")
      .bail()
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        const { lincense } = req.payload;

        const campaign = await Campaign.count({
          where: {
            CampaignName: {
              [Op.iLike]: value,
            },
            OrganizationStructureID: lincense.EnterpriseID,
            IsDeleted: false,
          },
        });

        if (campaign || campaign > 0) {
          return Promise.reject("Campaign already exists");
        }

        return Promise.resolve();
      }),
    body("CampaignDescription")
      .if(body("Step").equals("1"))
      .trim()
      .notEmpty()
      .withMessage("Campaign Description can't be empty")
      .bail()
      .isString()
      .withMessage("Campaign Description should be a string")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("CampaignCode")
      .if(body("Step").equals("1"))
      .trim()
      .notEmpty()
      .withMessage("Campaign Code can't be empty")
      .bail()
      .isString()
      .withMessage("Campaign Code should be a string")
      .bail()
      .isLength({ min: 2, max: 8 })
      .withMessage("Campaign Code should be between 2 to 8 characters")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        const campaign = await Campaign.count({
          where: {
            CampaignCode: {
              [Op.iLike]: value,
            },
            IsDeleted: false,
          },
        });

        if (campaign || campaign > 0) {
          return Promise.reject("Campaign Code already exists");
        }

        return Promise.resolve();
      }),
    body("Users")
      .if(body("Step").equals("2"))
      .isArray()
      .withMessage("Users can't be empty")
      .bail()
      .custom(async (value) => {
        if (value.length === 0 || !Array.isArray(value)) {
          return Promise.reject("Users can't be empty");
        }
        return Promise.resolve();
      }),
    body("Users.*.FirstName")
      .if(body("Step").equals("2"))
      .trim()
      .notEmpty()
      .withMessage("First Name can't be empty")
      .bail()
      .isString()
      .withMessage("First Name should be a string")
      .bail()
      .isLength({ min: 1, max: 100 })
      .withMessage("First Name should be maximum 100 characters")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        return Promise.resolve();
      }),
    body("Users.*.LastName")
      .if(body("Step").equals("2"))
      .trim()
      .notEmpty()
      .withMessage("Last Name can't be empty")
      .bail()
      .isString()
      .withMessage("Last Name should be a string")
      .bail()
      .isLength({ min: 1, max: 100 })
      .withMessage("Last Name should be maximum 100 characters")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        return Promise.resolve();
      }),
    body("Users.*.UnitCode")
      .if(body("Step").equals("2"))
      .trim()
      .notEmpty()
      .withMessage("Unit Code can't be empty")
      .bail()
      .isString()
      .withMessage("Unit Code should be a string")
      .bail()
      .isLength({ min: 2, max: 6 })
      .withMessage("Unit Code should be between 2 to 6 characters")
      .bail()
      .custom(async (value, { req }) => {
        const allUnitCodes = req.body.Users.map((user) => user.UnitCode);
        const duplicates = allUnitCodes.filter(
          (unitCode, index, self) => self.indexOf(unitCode) !== index
        );

        if (duplicates.length > 0) {
          return Promise.reject(
            `Duplicated Unit Codes: ${[...new Set(duplicates)].join(", ")}`
          );
        }

        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        return Promise.resolve();
      }),
    body("Users.*.MobileNumber")
      .if(body("Step").equals("2"))
      .trim()
      .notEmpty()
      .withMessage("Mobile Number can't be empty")
      .bail()
      .isMobilePhone()
      .withMessage("Mobile Number should be a valid mobile number")
      .bail()
      .custom(async (value, { req }) => {
        const allMobileNumbers = req.body.Users.map(
          (user) => user.MobileNumber
        );
        const duplicates = allMobileNumbers.filter(
          (mobile, index, self) => self.indexOf(mobile) !== index
        );

        if (duplicates.length > 0) {
          return Promise.reject(
            `Duplicated Mobile Numbers: ${[...new Set(duplicates)].join(", ")}`
          );
        }

        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        return Promise.resolve();
      }),

    body("Users.*.Email")
      .if(body("Step").equals("2"))
      .trim()
      .notEmpty()
      .withMessage("Email can't be empty")
      .bail()
      .isEmail()
      .withMessage("Email should be a valid email")
      .bail()
      .isString()
      .withMessage("Email should be a string")
      .bail()
      .custom(async (value, { req }) => {
        const allEmails = req.body.Users.map((user) => user.Email);
        const duplicates = allEmails.filter(
          (email, index, self) => self.indexOf(email) !== index
        );

        if (duplicates.length > 0) {
          return Promise.reject(
            `Duplicated Emails: ${[...new Set(duplicates)].join(", ")}`
          );
        }

        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        return Promise.resolve();
      }),
    body("FormID")
      .if(body("Step").equals("3"))
      .trim()
      .notEmpty()
      .withMessage("Form can't be empty")
      .bail()
      .isUUID()
      .withMessage("Form should be a UUID")
      .bail()
      .custom(async (value) => {
        const formModule = FormModule.count({
          where: { FormID: value },
        });
        const formModuleDraft = FormModuleDraft.count({
          where: { FormID: value },
        });
        const [formModuleExists, formModuleDraftExists] = await Promise.all([
          formModule,
          formModuleDraft,
        ]);
        if (
          !formModuleExists ||
          formModuleExists < 1 ||
          !formModuleDraftExists ||
          formModuleDraftExists < 1
        ) {
          return Promise.reject("Form doesn't exist");
        }
      }),
    body("FormModuleDraftID")
      .if(body("Step").equals("3"))
      .trim()
      .notEmpty()
      .withMessage("Form InProgress ID can't be empty")
      .bail()
      .isUUID()
      .withMessage("Form InProgress should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        const formDraft = await FormModuleDraft.count({
          where: { FormModuleDraftID: value },
        });
        const form = await FormModule.count({
          include: [
            {
              model: FormModuleDraft,
              required: true,
              where: { FormModuleDraftID: value },
            },
          ],
        });
        if (!formDraft || formDraft < 1 || !form || form < 1) {
          return Promise.reject("Form doesn't exist");
        }

        return Promise.resolve();
      }),
    body("FormFields")
      .if(body("Step").equals("3"))
      .isArray()
      .withMessage("Form Fields can't be empty")
      .bail()
      .custom(async (value) => {
        if (value.length === 0 || !Array.isArray(value)) {
          return Promise.reject("Form Fields can't be empty");
        }
        return Promise.resolve();
      }),
    body("FormFields.*.FieldID")
      .if(body("Step").equals("3"))
      .trim()
      .notEmpty()
      .withMessage("Field ID can't be empty")
      .bail()
      .isString()
      .withMessage("Field ID should be a string"),
    body("FormFields.*.FieldLabel")
      .if(body("Step").equals("3"))
      .trim()
      .notEmpty()
      .withMessage("Field Label can't be empty")
      .bail()
      .isString()
      .withMessage("Field Label should be a string"),
    body("CampaignEmailReferenceNumber")
      .if(body("Step").equals("3"))
      .trim()
      .notEmpty()
      .withMessage("Campaign Email Reference Number can't be empty")
      .bail()
      .isString()
      .withMessage("Campaign Email Reference Number should be a string")
      .bail()
      .isLength({ min: 2, max: 15 })
      .withMessage(
        "Campaign Email Reference Number should be between 2 to 15 characters"
      )
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        return Promise.resolve();
      }),
    body("CampaignEmailSubject")
      .if(body("Step").equals("3"))
      .trim()
      .notEmpty()
      .withMessage("Campaign Email Subject can't be empty")
      .bail()
      .isString()
      .withMessage("Campaign Email Subject should be a string")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        return Promise.resolve();
      }),
    body("CampaignEmailMessage")
      .if(body("Step").equals("3"))
      .trim()
      .notEmpty()
      .withMessage("Campaign Email Message can't be empty")
      .bail()
      .isString()
      .withMessage("Campaign Email Message should be a string")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        return Promise.resolve();
      }),
    body("CampaignEmailCC")
      .if(body("Step").equals("3"))
      .trim()
      .optional({ checkFalsy: true, nullable: true })
      .isString()
      .withMessage("Campaign Email CC should be a string")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        return Promise.resolve();
      }),
  ];
};

const campaignListRules = () => {
  return [
    body("CampaignID")
      .trim()
      .notEmpty()
      .withMessage("Campaign ID can't be empty")
      .bail()
      .isUUID()
      .withMessage("Campaign ID should be a UUID")
      .bail()
      .custom(async (value) => {
        const campaign = await Campaign.count({
          where: { CampaignID: value, IsDeleted: false },
        });
        if (!campaign || campaign < 1) {
          return Promise.reject("Campaign doesn't exist");
        }
      }),
  ];
};

const exportCampaignExcelRules = () => {
  return [
    body("CampaignID")
      .trim()
      .notEmpty()
      .withMessage("Campaign ID can't be empty")
      .bail()
      .isUUID()
      .withMessage("Campaign ID should be a UUID")
      .bail()
      .custom(async (value) => {
        const campaign = await Campaign.count({
          where: { CampaignID: value, IsDeleted: false },
        });
        if (!campaign || campaign < 1) {
          return Promise.reject("Campaign doesn't exist");
        }
      }),
  ];
};

const fetchAssignedDataForElementRules = () => {
  return [
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value, IsDeleted: false },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
    body("ModuleName")
      .trim()
      .notEmpty()
      .withMessage("ModuleName can't be empty")
      .bail()
      .isIn(Object.keys(moduleMapping))
      .withMessage("Invalid Module Name")
      .bail()
      .isString()
      .withMessage("ModuleName should be a string"),
    body("ModuleID")
      .trim()
      .notEmpty()
      .withMessage("Module ID can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module ID should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        try {
          const moduleName = req.body.ModuleName;

          const moduleConfig = moduleMapping[moduleName];

          if (!moduleConfig) {
            logger.error({
              message: `${moduleName} Module doesn't exist`,
              details: `${moduleName} Module doesn't exist`,
            });
            return Promise.reject("Module doesn't exist");
          }

          const { model, idField } = moduleConfig;

          if (!model || !idField) {
            logger.error({
              message: `${moduleName} Module doesn't exist`,
              details: `${moduleName} Module doesn't exist`,
            });
            return Promise.reject("Module doesn't exist");
          }

          const moduleExists = await model.count({
            where: {
              [idField]: value,
              ContentID: req.body.ContentID,
              ModuleTypeID: req.body.ModuleTypeID,
            },
          });

          if (!moduleExists || moduleExists < 1) {
            return Promise.reject("Element doesn't exist");
          }
        } catch (error) {
          logger.error({
            message: error.message,
            details: error,
          });
          return Promise.reject(
            "An unexpected error occurred during validation."
          );
        }
      }),
  ];
};

const revokeAssignedUsersFromElementRules = () => {
  return [
    body("Roles")
      .isArray()
      .withMessage("Roles should be an array")
      .bail()
      .custom((value, { req }) => {
        const departments = req.body.departments;
        if (
          Array.isArray(value) &&
          value.length === 0 &&
          Array.isArray(departments) &&
          departments.length === 0
        ) {
          throw new Error("Either roles or departments must be non-empty.");
        }
        return true;
      }),
    body("Roles.*")
      .optional({ checkFalsy: true, nullable: true })
      .isUUID()
      .withMessage("Roles should be a UUID")
      .bail()
      .custom(async (value) => {
        const role = await Roles.count({
          where: { RoleID: value, IsDeleted: false },
        });
        if (!role || role < 1) {
          return Promise.reject("Role doesn't exist");
        }
      }),
    body("Departments")
      .isArray()
      .withMessage("Departments should be an array")
      .bail()
      .custom((value, { req }) => {
        const roles = req.body.roles;
        if (
          Array.isArray(value) &&
          value.length === 0 &&
          Array.isArray(roles) &&
          roles.length === 0
        ) {
          throw new Error("Either roles or departments must be non-empty.");
        }
        return true;
      }),
    body("Departments.*")
      .optional({ checkFalsy: true, nullable: true })
      .bail()
      .isUUID()
      .withMessage("Departments should be a UUID")
      .bail()
      .custom(async (value) => {
        const department = await Departments.count({
          where: { DepartmentID: value, IsDeleted: false },
        });
        if (!department || department < 1) {
          return Promise.reject("Department doesn't exist");
        }
      }),
    body("ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value, IsDeleted: false },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
    body("ModuleName")
      .trim()
      .notEmpty()
      .withMessage("ModuleName can't be empty")
      .bail()
      .isIn(Object.keys(moduleMapping))
      .withMessage("Invalid Module Name")
      .bail()
      .isString()
      .withMessage("ModuleName should be a string"),
    body("ModuleID")
      .trim()
      .notEmpty()
      .withMessage("Module ID can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module ID should be a UUID")
      .bail()
      .custom(async (value, { req }) => {
        try {
          const moduleName = req.body.ModuleName;

          const moduleConfig = moduleMapping[moduleName];

          if (!moduleConfig) {
            logger.error({
              message: `${moduleName} Module doesn't exist`,
              details: `${moduleName} Module doesn't exist`,
            });
            return Promise.reject("Module doesn't exist");
          }

          const { model, idField } = moduleConfig;

          if (!model || !idField) {
            logger.error({
              message: `${moduleName} Module doesn't exist`,
              details: `${moduleName} Module doesn't exist`,
            });
            return Promise.reject("Module doesn't exist");
          }

          const moduleExists = await model.count({
            where: {
              [idField]: value,
              ContentID: req.body.ContentID,
              ModuleTypeID: req.body.ModuleTypeID,
            },
          });

          if (!moduleExists || moduleExists < 1) {
            return Promise.reject("Element doesn't exist");
          }
        } catch (error) {
          logger.error({
            message: error.message,
            details: error,
          });
          return Promise.reject(
            "An unexpected error occurred during validation."
          );
        }
      }),
    body("IsAllUsers")
      .trim()
      .notEmpty()
      .withMessage("Users type can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Users type should be a boolean"),
    body("SelectedUsers")
      .if(body("IsAllUsers").equals("false"))
      .isArray()
      .withMessage("At least one user should be selected")
      .bail()
      .custom((value, { req }) => {
        if (value.length === 0) {
          return Promise.reject("At least one user should be selected");
        }
        return Promise.resolve();
      }),
    body("SelectedUsers.*")
      .if(body("IsAllUsers").equals("false"))
      .notEmpty()
      .withMessage("Selected Users can't be empty")
      .isUUID()
      .withMessage("Selected Users should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: { UserID: value },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Selected User doesn't exist");
        }
      }),
  ];
};

const hideUnhideModuleRules = () => {
  return [
    body("Modules")
      .isArray()
      .withMessage("At least one module should be selected")
      .bail()
      .custom((value) => {
        if (value && value?.length === 0) {
          return Promise.reject("At least one module should be selected");
        }
        return Promise.resolve();
      }),
    body("Modules.*.ModuleTypeID")
      .trim()
      .notEmpty()
      .withMessage("Module can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module should be a UUID")
      .bail()
      .custom(async (value) => {
        const moduleMaster = await ModuleMaster.count({
          where: { ModuleTypeID: value },
        });
        if (!moduleMaster || moduleMaster < 1) {
          return Promise.reject("Module doesn't exist");
        }
      }),
    body("Modules.*.ContentID")
      .trim()
      .notEmpty()
      .withMessage("Content can't be empty")
      .bail()
      .isUUID()
      .withMessage("Content should be a UUID")
      .bail()
      .custom(async (value) => {
        const contentStructure = await ContentStructure.count({
          where: { ContentID: value },
        });
        if (!contentStructure || contentStructure < 1) {
          return Promise.reject("Content doesn't exist");
        }
      }),
    body("Modules.*.ModuleName")
      .trim()
      .notEmpty()
      .withMessage("ModuleName can't be empty")
      .bail()
      .isIn(Object.keys(moduleMapping))
      .withMessage("Invalid Module Name")
      .bail()
      .isString()
      .withMessage("ModuleName should be a string"),
    body("Modules.*.ModuleID")
      .trim()
      .notEmpty()
      .withMessage("Module ID can't be empty")
      .bail()
      .isUUID()
      .withMessage("Module ID should be a UUID")
      .bail()
      .custom(async (value, { req, path }) => {
        try {
          const moduleIndexMatch = path.match(/Modules\[(\d+)\]/);

          if (!moduleIndexMatch) {
            logger.error({
              message: "Unable to determine module index from path",
              details: "Unable to determine module index from path",
            });
            return Promise.reject("Module doesn't exist");
          }

          const moduleIndex = moduleIndexMatch[1]; // Extract the index from the regex match

          // Access the module's name
          const moduleName = req.body.Modules[moduleIndex].ModuleName;
          const ModuleTypeID = req.body.Modules[moduleIndex].ModuleTypeID;
          const ContentID = req.body.Modules[moduleIndex].ContentID;

          const moduleConfig = moduleMapping[moduleName];

          if (!moduleConfig) {
            logger.error({
              message: `${moduleName} Module doesn't exist`,
              details: `${moduleName} Module doesn't exist`,
            });
            return Promise.reject("Module doesn't exist");
          }

          const { model, idField } = moduleConfig;

          if (!model || !idField) {
            logger.error({
              message: `${moduleName} Module doesn't exist`,
              details: `${moduleName} Module doesn't exist`,
            });
            return Promise.reject("Module doesn't exist");
          }

          const moduleExists = await model.count({
            where: {
              [idField]: value,
              ContentID,
              ModuleTypeID,
            },
          });

          if (!moduleExists || moduleExists < 1) {
            return Promise.reject("Element doesn't exist");
          }
        } catch (error) {
          logger.error({
            message: error.message,
            details: error,
          });
          return Promise.reject(
            "An unexpected error occurred during validation."
          );
        }
      }),
    body("Modules.*.IsHidden")
      .trim()
      .notEmpty()
      .withMessage("Hidden field can't be empty")
      .bail()
      .isBoolean()
      .withMessage("Hidden field should be a boolean"),
  ];
};

const createRiskRules = () => {
  // Common validator for required string fields
  const requiredString = (field, name) => {
    return body(field)
      .if((value, { req }) => {
        return !req.body.RiskState;
      })
      .trim()
      .notEmpty()
      .withMessage(`${name} field can't be empty`)
      .bail()
      .isLength({ min: 1 })
      .withMessage(`${name} field can't be empty string`);
  };

  return [
    // Basic fields - validated when riskState is missing or not "Risk Assessment"
    requiredString("SOPID", "SOPID"),
    requiredString("RiskName", "Risk Name"),
    requiredString("RiskDescription", "Risk Description"),
    requiredString("RiskCategory", "Risk Category"),
    requiredString("InitialSeverity", "Initial Severity"),

    // Risk Assessment fields - only validated when riskState is "Risk Assessment"
    body("Impact")
      .if((value, { req }) => req.body.RiskState === "Risk Assessment")
      .exists()
      .withMessage("Impact is required for Risk Assessment")
      .bail()
      .trim()
      .notEmpty()
      .withMessage(`Impact field can't be empty`),

    body("Likelihood")
      .if((value, { req }) => req.body.RiskState === "Risk Assessment")
      .exists()
      .withMessage("Likelihood is required for Risk Assessment")
      .bail()
      .isNumeric()
      .withMessage("Likelihood must be a number"),

    body("Frequency")
      .if((value, { req }) => req.body.RiskState === "Risk Assessment")
      .exists()
      .withMessage("Frequency is required for Risk Assessment")
      .bail()
      .trim()
      .notEmpty()
      .withMessage(`Frequency field can't be empty`),

    body("AffectedAreas")
      .if((value, { req }) => req.body.RiskState === "Risk Assessment")
      .exists()
      .withMessage("AffectedAreas is required for Risk Assessment")
      .bail()
      .isArray()
      .withMessage("AffectedAreas must be an array")
      .bail()
      .notEmpty()
      .withMessage("At least one AffectedArea must be specified")
      .bail()
      .custom((areas) => {
        if (areas.length === 0) {
          throw new Error("At least one AffectedArea must be specified");
        }
        // Check each element is a non-empty string
        if (areas.some((area) => typeof area !== "string" || !area.trim())) {
          throw new Error("All AffectedAreas must be non-empty strings");
        }
        return true;
      }),

    body("RiskValue")
      .if((value, { req }) => req.body.RiskState === "Risk Assessment")
      .exists()
      .withMessage("RiskValue is required for Risk Assessment")
      .bail()
      .trim()
      .notEmpty()
      .withMessage(`Impact field can't be empty`),

    body("RootCause")
      .if((value, { req }) => req.body.RiskState === "Risk Analysis Form")
      .exists()
      .withMessage("RootCause is required for Risk Assessment")
      .bail()
      .trim()
      .notEmpty()
      .withMessage(`RootCause field can't be empty`),

    body("TreatmentStrategy")
      .if((value, { req }) => req.body.RiskState === "Risk Treatment")
      .exists()
      .withMessage("TreatmentStrategy is required for Risk Assessment")
      .bail()
      .trim()
      .notEmpty()
      .withMessage(`TreatmentStrategy field can't be empty`),

    body("ControlMeasures")
      .if((value, { req }) => req.body.RiskState === "Risk Treatment")
      .exists()
      .withMessage("ControlMeasures is required for Risk Assessment")
      .bail()
      .trim()
      .notEmpty()
      .withMessage(`ControlMeasures field can't be empty`),

    body("TreatmentActionItems")
      .if((value, { req }) => req.body.RiskState === "Risk Treatment")
      .exists()
      .withMessage("Treatment Action Items are required for Risk Treatment")
      .bail()
      .isArray()
      .withMessage("Treatment Action Items must be an array")
      .bail()
      .notEmpty()
      .withMessage("At least one Treatment Action Item must be specified")
      .bail()
      .custom(async (actionItems) => {
        // Validate array structure
        if (actionItems.length === 0) {
          throw new Error(
            "At least one Treatment Action Item must be specified"
          );
        }

        // Validate each action item object
        for (const [index, item] of actionItems.entries()) {
          // Required fields validation
          if (!item.TreatmentDescription?.trim()) {
            throw new Error(
              `Item ${index + 1}: Treatment Description is required`
            );
          }
          if (!item.TreatmentOwner?.trim()) {
            throw new Error(`Item ${index + 1}: Treatment Owner is required`);
          }
          if (!item.TreatmentDueDate) {
            throw new Error(
              `Item ${index + 1}: Treatment Due Date is required`
            );
          }

          // Date format validation (optional)
          if (isNaN(new Date(item.TreatmentDueDate).getTime())) {
            throw new Error(`Item ${index + 1}: Invalid Due Date format`);
          }
        }
        return true;
      }),

    body("MonitoringFrequency")
      .if((value, { req }) => req.body.RiskState === "Risk Monitoring & Review")
      .exists()
      .withMessage("Monitoring Frequency is required for Risk Assessment")
      .bail()
      .trim()
      .notEmpty()
      .withMessage(`Monitoring Frequency field can't be empty`),

    // body("KPI")
    //   .if((value, { req }) => req.body.RiskState === "Risk Monitoring & Review")
    //   .exists()
    //   .withMessage("KPI is required for Risk Assessment")
    //   .bail()
    //   .trim()
    //   .notEmpty()
    //   .withMessage(`KPI field can't be empty`),

    body("ReviewFindings")
      .if((value, { req }) => req.body.RiskState === "Risk Monitoring & Review")
      .exists()
      .withMessage("Review Findings is required for Risk Assessment")
      .bail()
      .trim()
      .notEmpty()
      .withMessage(`Review Findings field can't be empty`),

    body("ControlEffectiveness")
      .if((value, { req }) => req.body.RiskState === "Risk Monitoring & Review")
      .exists()
      .withMessage("Control Effectiveness is required for Risk Assessment")
      .bail()
      .isNumeric()
      .withMessage("Control Effectiveness must be a number"),
  ];
};

const updateRiskRules = () => {
  // Common validator for required string fields
  const requiredString = (field, name) => {
    return body(field)
      .if((value, { req }) => {
        return !req.body.RiskState;
      })
      .trim()
      .notEmpty()
      .withMessage(`${name} field can't be empty`)
      .bail()
      .isLength({ min: 1 })
      .withMessage(`${name} field can't be empty string`);
  };

  return [
    // Basic fields - validated when riskState is missing or not "Risk Assessment"
    // requiredString("SOPID", "SOPID"),
    requiredString("RiskName", "Risk Name"),
    requiredString("RiskDescription", "Risk Description"),
    requiredString("RiskCategory", "Risk Category"),
    requiredString("InitialSeverity", "Initial Severity"),

    // Risk Assessment fields - only validated when riskState is "Risk Assessment"
    body("Impact")
      .if((value, { req }) => req.body.RiskState === "Risk Assessment")
      .exists()
      .withMessage("Impact is required for Risk Assessment")
      .bail()
      .trim()
      .notEmpty()
      .withMessage(`Impact field can't be empty`),

    body("Likelihood")
      .if((value, { req }) => req.body.RiskState === "Risk Assessment")
      .exists()
      .withMessage("Likelihood is required for Risk Assessment")
      .bail()
      .isNumeric()
      .withMessage("Likelihood must be a number"),

    body("Frequency")
      .if((value, { req }) => req.body.RiskState === "Risk Assessment")
      .exists()
      .withMessage("Frequency is required for Risk Assessment")
      .bail()
      .trim()
      .notEmpty()
      .withMessage(`Frequency field can't be empty`),

    body("AffectedAreas")
      .if((value, { req }) => req.body.RiskState === "Risk Assessment")
      .exists()
      .withMessage("AffectedAreas is required for Risk Assessment")
      .bail()
      .isArray()
      .withMessage("AffectedAreas must be an array")
      .bail()
      .notEmpty()
      .withMessage("At least one AffectedArea must be specified")
      .bail()
      .custom((areas) => {
        if (areas.length === 0) {
          throw new Error("At least one AffectedArea must be specified");
        }
        // Check each element is a non-empty string
        if (areas.some((area) => typeof area !== "string" || !area.trim())) {
          throw new Error("All AffectedAreas must be non-empty strings");
        }
        return true;
      }),

    body("RiskValue")
      .if((value, { req }) => req.body.RiskState === "Risk Assessment")
      .exists()
      .withMessage("RiskValue is required for Risk Assessment")
      .bail()
      .trim()
      .notEmpty()
      .withMessage(`Impact field can't be empty`),

    body("RootCause")
      .if((value, { req }) => req.body.RiskState === "Risk Analysis Form")
      .exists()
      .withMessage("RootCause is required for Risk Assessment")
      .bail()
      .trim()
      .notEmpty()
      .withMessage(`RootCause field can't be empty`),

    body("TreatmentStrategy")
      .if((value, { req }) => req.body.RiskState === "Risk Treatment")
      .exists()
      .withMessage("TreatmentStrategy is required for Risk Assessment")
      .bail()
      .trim()
      .notEmpty()
      .withMessage(`TreatmentStrategy field can't be empty`),

    body("ControlMeasures")
      .if((value, { req }) => req.body.RiskState === "Risk Treatment")
      .exists()
      .withMessage("ControlMeasures is required for Risk Assessment")
      .bail()
      .trim()
      .notEmpty()
      .withMessage(`ControlMeasures field can't be empty`),

    body("TreatmentActionItems")
      .if((value, { req }) => req.body.RiskState === "Risk Treatment")
      .exists()
      .withMessage("Treatment Action Items are required for Risk Treatment")
      .bail()
      .isArray()
      .withMessage("Treatment Action Items must be an array")
      .bail()
      .notEmpty()
      .withMessage("At least one Treatment Action Item must be specified")
      .bail()
      .custom(async (actionItems) => {
        // Validate array structure
        if (actionItems.length === 0) {
          throw new Error(
            "At least one Treatment Action Item must be specified"
          );
        }

        // Validate each action item object
        for (const [index, item] of actionItems.entries()) {
          // Required fields validation
          if (!item.TreatmentDescription?.trim()) {
            throw new Error(
              `Item ${index + 1}: Treatment Description is required`
            );
          }
          if (!item.TreatmentOwner?.trim()) {
            throw new Error(`Item ${index + 1}: Treatment Owner is required`);
          }
          if (!item.TreatmentDueDate) {
            throw new Error(
              `Item ${index + 1}: Treatment Due Date is required`
            );
          }

          // Date format validation (optional)
          if (isNaN(new Date(item.TreatmentDueDate).getTime())) {
            throw new Error(`Item ${index + 1}: Invalid Due Date format`);
          }
        }
        return true;
      }),

    body("MonitoringFrequency")
      .if((value, { req }) => req.body.RiskState === "Risk Monitoring & Review")
      .exists()
      .withMessage("Monitoring Frequency is required for Risk Assessment")
      .bail()
      .trim()
      .notEmpty()
      .withMessage(`Monitoring Frequency field can't be empty`),

    // body("KPI")
    //   .if((value, { req }) => req.body.RiskState === "Risk Monitoring & Review")
    //   .exists()
    //   .withMessage("KPI is required for Risk Assessment")
    //   .bail()
    //   .trim()
    //   .notEmpty()
    //   .withMessage(`KPI field can't be empty`),

    body("ReviewFindings")
      .if((value, { req }) => req.body.RiskState === "Risk Monitoring & Review")
      .exists()
      .withMessage("Review Findings is required for Risk Assessment")
      .bail()
      .trim()
      .notEmpty()
      .withMessage(`Review Findings field can't be empty`),

    body("ControlEffectiveness")
      .if((value, { req }) => req.body.RiskState === "Risk Monitoring & Review")
      .exists()
      .withMessage("Control Effectiveness is required for Risk Assessment")
      .bail()
      .isNumeric()
      .withMessage("Control Effectiveness must be a number"),
  ];
};

const validate = async (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  if (req?.file?.path) {
    try {
      await helper.deleteFile(req?.file?.path);
    } catch (error) {
      console.log("Error deleting file", error);
    }
  }
  const extractedErrors = [];
  const errorWithParams = {};
  errors.array().forEach((err) => extractedErrors.push(err.msg));
  errors.array().forEach((err) => (errorWithParams[err.path] = err.msg));
  return res.status(422).json({
    message: extractedErrors[0],
    errors: errorWithParams,
  });
};

module.exports = {
  documentModuleCreateRules,
  documentModuleBulkCreateRules,
  publishDocumentModuleRules,
  trainingSimulationModuleCreateRules,
  publishTrainingSimulationModuleRules,
  testSimulationModuleCreateRules,
  publishTestSimulationModuleRules,
  sopModuleCreateRules,
  flowModuleCreateRules,
  publishSopModuleRules,
  sopDraftViewRules,
  sopFlowDraftViewRules,
  createBulkTestMCQRules,
  testMCQModuleCreateRules,
  publishTestMCQModuleRules,
  testMCQModuleDraftViewRules,
  createCategoryRules,
  deleteCategoryRules,
  changeCategoryStatusRules,
  documentDraftViewRules,
  trainingSimulationDraftViewRules,
  testSimulationDraftViewRules,
  assignElementToRoleAndDepartmentRules,
  viewElementDraftActivityLogRules,
  viewElementDraftActivityLogHistoryRules,
  impactAnalysisRules,
  formModuleCreateRules,
  publishFormModuleRules,
  formDraftViewRules,
  createFormRules,
  viewFormRules,
  createCampaignRules,
  campaignListRules,
  exportCampaignExcelRules,
  fetchAssignedDataForElementRules,
  revokeAssignedUsersFromElementRules,
  hideUnhideModuleRules,
  validate,
  createRiskRules,
  updateRiskRules,
};
