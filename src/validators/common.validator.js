const { Op } = require("sequelize");
const { body, validationResult, param, query } = require("express-validator");
const FormModuleDraft = require("../model/FormModuleDraft");
const UserModuleLink = require("../model/UserModuleLink");

const generateTokenForDynamicFormRules = () => {
  return [
    body("FormModuleDraftID")
      .trim()
      .notEmpty()
      .withMessage("InProgress ID is required")
      .isUUID()
      .withMessage("InProgress ID must be a valid UUID")
      .custom(async (value) => {
        const isDraftExist = await FormModuleDraft.count({
          where: {
            FormModuleDraftID: value,
          },
        });

        if (!isDraftExist || isDraftExist < 1) {
          return Promise.reject("InProgress not found");
        }
      }),
    body("UserModuleLinkID")
      .trim()
      .isUUID()
      .withMessage("Module Linked ID must be a valid UUID")
      .custom(async (value) => {
        const isModuleLink = await UserModuleLink.count({
          where: {
            UserModuleLinkID: value,
          },
        });

        if (!isModuleLink || isModuleLink < 1) {
          return Promise.reject("User have not assigned to this module");
        }
      })
      .optional({
        nullable: true,
        checkFalsy: true,
      }),
  ];
};

const validate = async (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
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
  generateTokenForDynamicFormRules,
  validate,
};
