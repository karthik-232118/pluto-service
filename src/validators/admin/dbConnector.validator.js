const { Op, literal } = require("sequelize");
const helper = require("../../utils/helper");
const constants = require("../../utils/constants");

const { body, validationResult } = require("express-validator");

const dbSaveConnectionRules = () => {
  return [
    body("DatabaseType")
      .trim()
      .notEmpty()
      .withMessage("Database type is required")
      .isIn(["postgres", "mysql", "mariadb"])
      .withMessage("Invalid database type")
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      }),
    body("Host")
      .trim()
      .notEmpty()
      .withMessage("Host is required")
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      }),
    body("Port")
      .trim()
      .notEmpty()
      .withMessage("Port is required")
      .isInt()
      .withMessage("Port must be an integer")
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      }),
    body("Username")
      .trim()
      .notEmpty()
      .withMessage("Username is required")
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      }),
    body("Password")
      .trim()
      .notEmpty()
      .withMessage("Password is required")
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      }),
    body("DatabaseName")
      .trim()
      .notEmpty()
      .withMessage("Database name is required")
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
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
  dbSaveConnectionRules,
  validate,
};
