const { Op, literal } = require("sequelize");
const ModuleMaster = require("../../../model/ModuleMaster");
const Users = require("../../../model/Users");
const helper = require("../../../utils/helper");
const moment = require("moment");

const { body, validationResult } = require("express-validator");
const ElementAttributeType = require("../../../model/ElementAttributeType");
const { moduleMapping } = require("../../../utils/moduleConfig");

const elementAttributeTypeCreateAndUpdateRules = () => {
  return [
    body("ElementAttributeTypeID")
      .trim()
      .optional({
        checkFalsy: true,
        nullable: true,
      })
      .bail()
      .isUUID()
      .withMessage("Element attribute ID should be a UUID")
      .bail()
      .custom(async (value) => {
        const elementAttributeType = await ElementAttributeType.count({
          where: { ElementAttributeTypeID: value, IsDeleted: false },
        });
        if (!elementAttributeType || elementAttributeType < 1) {
          return Promise.reject("Element attribute doesn't exist");
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
    body("Name")
      .trim()
      .notEmpty()
      .withMessage("Name can't be empty")
      .bail()
      .isString()
      .withMessage("Name should be a string")
      .bail()
      .isLength({ min: 1, max: 100 })
      .withMessage("Name should be maximum 100 characters")
      .bail()
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        let elementAttributeType;
        if (req.body.ElementAttributeTypeID) {
          elementAttributeType = await ElementAttributeType.count({
            where: {
              Name: {
                [Op.iLike]: value,
              },
              ElementAttributeTypeID: {
                [Op.ne]: req.body.ElementAttributeTypeID,
              },
              ModuleTypeID: req.body.ModuleTypeID,
              IsDeleted: false,
            },
          });
        } else {
          elementAttributeType = await ElementAttributeType.count({
            where: {
              Name: {
                [Op.iLike]: value,
              },
              ModuleTypeID: req.body.ModuleTypeID,
              IsDeleted: false,
            },
          });
        }
        if (elementAttributeType || elementAttributeType > 0) {
          return Promise.reject("Element attribute already exists");
        }
      }),
    body("Description")
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
    body("IsReview")
      .trim()
      .notEmpty()
      .withMessage("IsReview can't be empty")
      .bail()
      .isBoolean()
      .withMessage("IsReview should be a boolean"),
    body("Reviewers")
      .if(helper.ifValidatorFieldTrue("IsReview"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject("Reviewers should be a non empty array");
        }
        return Promise.resolve();
      }),
    body("Reviewers.*")
      .trim()
      .if(helper.ifValidatorFieldTrue("IsReview"))
      .isUUID()
      .withMessage("Reviewers should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: {
            UserID: value,
            IsDeleted: false,
            UserType: ["EndUser", "ProcessOwner"],
          },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Reviewers doesn't exist");
        }
      }),
    body("IsApproval")
      .trim()
      .notEmpty()
      .withMessage("IsApproval can't be empty")
      .bail()
      .isBoolean()
      .withMessage("IsApproval should be a boolean"),
    body("Approvers")
      .if(helper.ifValidatorFieldTrue("IsApproval"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject("Approvers should be a non empty array");
        }
        return Promise.resolve();
      }),
    body("Approvers.*")
      .trim()
      .if(helper.ifValidatorFieldTrue("IsApproval"))
      .isUUID()
      .withMessage("Approvers should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: {
            UserID: value,
            IsDeleted: false,
            UserType: ["EndUser", "ProcessOwner"],
          },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Approvers doesn't exist");
        }
      }),
    body("IsStakeholder")
      .trim()
      .notEmpty()
      .withMessage("IsStakeholder can't be empty")
      .bail()
      .isBoolean()
      .withMessage("IsStakeholder should be a boolean"),
    body("Stakeholders")
      .if(helper.ifValidatorFieldTrue("IsStakeholder"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject("Stakeholders should be a non empty array");
        }
        return Promise.resolve();
      }),
    body("Stakeholders.*")
      .trim()
      .if(helper.ifValidatorFieldTrue("IsStakeholder"))
      .isUUID()
      .withMessage("Stakeholders should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: {
            UserID: value,
            IsDeleted: false,
            UserType: ["ProcessOwner"],
          },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("Stakeholders doesn't exist");
        }
      }),
    body("IsStakeHolderEscalation")
      .trim()
      .notEmpty()
      .withMessage("IsStakeHolderEscalation can't be empty")
      .bail()
      .isBoolean()
      .withMessage("IsStakeHolderEscalation should be a boolean"),
    body("StakeHolderEscalationUsers")
      .if(helper.ifValidatorFieldTrue("IsStakeHolderEscalation"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject(
            "StakeHolderEscalationUsers should be a non empty array"
          );
        }
        return Promise.resolve();
      }),
    body("StakeHolderEscalationUsers.*")
      .trim()
      .if(helper.ifValidatorFieldTrue("IsStakeHolderEscalation"))
      .isUUID()
      .withMessage("StakeHolderEscalationUsers should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: {
            UserID: value,
            IsDeleted: false,
            UserType: ["EndUser", "ProcessOwner"],
          },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("StakeHolderEscalationUsers doesn't exist");
        }
      }),
    body("StakeHolderEscalationType")
      .trim()
      .if(helper.ifValidatorFieldTrue("IsStakeHolderEscalation"))
      .notEmpty()
      .withMessage("StakeHolderEscalation Type can't be empty")
      .bail()
      .isIn(["Minutes", "Hours", "Days", "Weeks", "Months", "Years"])
      .withMessage(
        "StakeHolderEscalation Type should be Minutes, Hours, Days, Weeks, Months or Years"
      ),
    body("StakeHolderEscalationAfter")
      .trim()
      .if(helper.ifValidatorFieldTrue("IsStakeHolderEscalation"))
      .notEmpty()
      .withMessage("StakeHolderEscalation After can't be empty")
      .bail()
      .isInt({ min: 1 })
      .withMessage("StakeHolderEscalation After should be a non-zero integer")
      .isLength({ min: 1, max: 3 })
      .withMessage(
        "StakeHolderEscalation After should be a maximum of 3 digits"
      )
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("IsEscalation")
      .trim()
      .notEmpty()
      .withMessage("IsEscalation can't be empty")
      .bail()
      .isBoolean()
      .withMessage("IsEscalation should be a boolean"),
    body("EscalationUsers")
      .if(helper.ifValidatorFieldTrue("IsEscalation"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject("EscalationUsers should be a non empty array");
        }
        return Promise.resolve();
      }),
    body("EscalationUsers.*")
      .trim()
      .if(helper.ifValidatorFieldTrue("IsEscalation"))
      .isUUID()
      .withMessage("EscalationUsers should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: {
            UserID: value,
            IsDeleted: false,
            UserType: ["EndUser", "ProcessOwner"],
          },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("EscalationUsers doesn't exist");
        }
      }),
    body("EscalationType")
      .trim()
      .if(helper.ifValidatorFieldTrue("IsEscalation"))
      .notEmpty()
      .withMessage("Escalation Type can't be empty")
      .bail()
      .isIn(["Minutes", "Hours", "Days", "Weeks", "Months", "Years"])
      .withMessage(
        "Escalation Type should be Minutes, Hours, Days, Weeks, Months or Years"
      ),
    body("EscalationAfter")
      .trim()
      .if(helper.ifValidatorFieldTrue("IsEscalation"))
      .notEmpty()
      .withMessage("Escalation After can't be empty")
      .bail()
      .isInt({ min: 1 })
      .withMessage("Escalation After should be a non-zero integer")
      .isLength({ min: 1, max: 3 })
      .withMessage("Escalation After should be a maximum of 3 digits")
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        } else {
          return Promise.resolve();
        }
      }),
    body("IsDownloadable")
      .trim()
      .notEmpty()
      .withMessage("IsDownloadable can't be empty")
      .bail()
      .isBoolean()
      .withMessage("IsDownloadable should be a boolean"),
    body("DownloadableUsers")
      .if(helper.ifValidatorFieldTrue("IsDownloadable"))
      .custom(async (value) => {
        if (!helper.isNonEmptyArray(value)) {
          return Promise.reject(
            "Downloadable Users should be a non empty array"
          );
        }
        return Promise.resolve();
      }),
    body("DownloadableUsers.*")
      .trim()
      .if(helper.ifValidatorFieldTrue("IsDownloadable"))
      .isUUID()
      .withMessage("DownloadableUsers should be a UUID")
      .bail()
      .custom(async (value) => {
        const existingUser = await Users.count({
          where: {
            UserID: value,
            IsDeleted: false,
            UserType: ["EndUser", "ProcessOwner"],
          },
        });
        if (!existingUser || existingUser < 1) {
          return Promise.reject("DownloadableUsers doesn't exist");
        }
      }),
    body("IsExpiry")
      .trim()
      .notEmpty()
      .withMessage("IsExpiry can't be empty")
      .bail()
      .isBoolean()
      .withMessage("IsExpiry should be a boolean"),
    body("ExpiryDate")
      .trim()
      .if(helper.ifValidatorFieldTrue("IsExpiry"))
      .notEmpty()
      .withMessage("ExpiryDate is required when IsExpiry is true")
      .bail()
      .isDate({ format: "YYYY-MM-DD" })
      .withMessage("ExpiryDate should be a valid date in YYYY-MM-DD format")
      .bail()
      .custom((value) => {
        const inputDate = moment(value, "YYYY-MM-DD", true);
        if (!inputDate.isValid()) {
          throw new Error("ExpiryDate is not a valid date");
        }
        if (inputDate.isBefore(moment(), "day")) {
          throw new Error("ExpiryDate cannot be in the past");
        }
        return true;
      }),
    body("IsEmailTrigger")
      .trim()
      .notEmpty()
      .withMessage("IsEmailTrigger can't be empty")
      .bail()
      .isBoolean()
      .withMessage("IsEmailTrigger should be a boolean"),
    body("IsAutoPublish")
      .trim()
      .notEmpty()
      .withMessage("IsAutoPublish can't be empty")
      .bail()
      .isBoolean()
      .withMessage("IsAutoPublish should be a boolean"),
    body("ReviewNotificationInterval")
      .trim()
      .notEmpty()
      .withMessage("Review Notification Interval can't be empty")
      .bail()
      .isInt({ min: 1 })
      .withMessage("Review Notification Interval should be a non-zero integer")
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

const elementAttributeTypeViewRules = () => {
  return [
    body("ElementAttributeTypeID")
      .trim()
      .notEmpty()
      .withMessage("Element attribute ID can't be empty")
      .bail()
      .isUUID()
      .withMessage("Element attribute ID should be a UUID")
      .bail()
      .custom(async (value) => {
        const elementAttributeType = await ElementAttributeType.count({
          where: { ElementAttributeTypeID: value, IsDeleted: false },
        });
        if (!elementAttributeType || elementAttributeType < 1) {
          return Promise.reject("Element attribute doesn't exist");
        }
      }),
  ];
};

const elementAttributeTypeDeleteRules = () => {
  return [
    body("ModuleName")
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
    body("ElementAttributeTypeID")
      .trim()
      .notEmpty()
      .withMessage("Element attribute ID can't be empty")
      .bail()
      .isUUID()
      .withMessage("Element attribute ID should be a UUID")
      .bail()
      .custom(async (value) => {
        const elementAttributeType = await ElementAttributeType.count({
          where: { ElementAttributeTypeID: value, IsDeleted: false },
        });
        if (!elementAttributeType || elementAttributeType < 1) {
          return Promise.reject("Element attribute doesn't exist");
        }
      }),
  ];
};
const elementAttributeTypeLinkedElementViewRules = () => {
  return [
    body("ElementAttributeTypeID")
      .trim()
      .notEmpty()
      .withMessage("Element attribute ID can't be empty")
      .bail()
      .isUUID()
      .withMessage("Element attribute ID should be a UUID")
      .bail()
      .custom(async (value) => {
        const elementAttributeType = await ElementAttributeType.count({
          where: { ElementAttributeTypeID: value, IsDeleted: false },
        });
        if (!elementAttributeType || elementAttributeType < 1) {
          return Promise.reject("Element attribute doesn't exist");
        }
      }),
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
  elementAttributeTypeCreateAndUpdateRules,
  elementAttributeTypeViewRules,
  elementAttributeTypeDeleteRules,
  elementAttributeTypeLinkedElementViewRules,
  validate,
};
