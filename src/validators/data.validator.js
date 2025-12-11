const { Op } = require("sequelize");
const UserAttempts = require("../model/UserAttempts");
const FormModuleDraft = require("../model/FormModuleDraft");
const FormModule = require("../model/FormModule");
const FormModuleSubmission = require("../model/FormModuleSubmission");
const { body, validationResult, param, query } = require("express-validator");
const UserModuleLink = require("../model/UserModuleLink");

const achievementViewRules = () => {
  return [
    body("AttemptID")
      .trim()
      .notEmpty()
      .withMessage("AttemptID can't be empty")
      .bail()
      .isUUID()
      .withMessage("AttemptID should be a UUID")
      .bail()
      .custom(async (value) => {
        const userAttempt = await UserAttempts.count({
          where: { AttemptID: value },
        });
        if (!userAttempt || userAttempt < 1) {
          return Promise.reject("You have't attempted this module yet");
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

        const isFormAlreadySubmitted = await FormModuleSubmission.count({
          where: {
            FormModuleDraftID: value,
            CreatedBy: req.payload.currentUserId,
          },
        });

        if (isFormAlreadySubmitted && isFormAlreadySubmitted > 0) {
          return Promise.reject("You have already submitted the form");
        }
      }),
    body("UserModuleLinkID")
      .trim()
      .notEmpty()
      .withMessage("UserModuleLinkID can't be empty")
      .bail()
      .isUUID()
      .withMessage("UserModuleLinkID should be a UUID")
      .bail()
      .custom(async (value) => {
        const userModuleLink = await UserModuleLink.count({
          where: { UserModuleLinkID: value },
        });
        if (!userModuleLink || userModuleLink < 1) {
          return Promise.reject("You have not been assigned this module");
        }
      }),
  ];
};

const fillFormRules = () => {
  return [
    body("FormAnswerData").custom((value) => {
      if (!Array.isArray(value)) {
        return Promise.reject("You must fill the form");
      }

      return Promise.resolve();
    }),
    body("FormModuleDraftID")
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

        const isFormAlreadySubmitted = await FormModuleSubmission.count({
          where: {
            FormModuleDraftID: value,
            CreatedBy: req.payload.currentUserId,
          },
        });

        if (isFormAlreadySubmitted && isFormAlreadySubmitted > 0) {
          return Promise.reject("You have already submitted the form");
        }
      }),
    body("UserModuleLinkID")
      .trim()
      .notEmpty()
      .withMessage("UserModuleLinkID can't be empty")
      .bail()
      .isUUID()
      .withMessage("UserModuleLinkID should be a UUID")
      .bail()
      .custom(async (value) => {
        const userModuleLink = await UserModuleLink.count({
          where: { UserModuleLinkID: value },
        });
        if (!userModuleLink || userModuleLink < 1) {
          return Promise.reject("You have not been assigned this module");
        }
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
  achievementViewRules,
  viewFormRules,
  fillFormRules,
  validate,
};
