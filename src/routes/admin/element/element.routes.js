const { Router } = require("express");
const elementController = require("../../../controller/admin/element/element.controller");
const {
  elementAttributeTypeCreateAndUpdateRules,
  elementAttributeTypeViewRules,
  elementAttributeTypeDeleteRules,
  validate,
  elementAttributeTypeLinkedElementViewRules,
} = require("../../../validators/admin/element/element.validator");
const { apiAccess } = require("../../../utils/middleware/checkUserAccess");

exports.elementRoutes = Router()
  .post(
    "/Ab9X4zQyWvE1TgR",
    apiAccess.ProcessOwner(),
    elementAttributeTypeCreateAndUpdateRules(),
    validate,
    elementController.createUpdateElementAttributeType
  )
  .post(
    "/Lm6R8bKtUvY3QnJ",
    apiAccess.ProcessOwner(),
    validate,
    elementController.listElementAttributeTypes
  )
  .post(
    "/Zp0FcWdNtYo2HvL",
    apiAccess.ProcessOwner(),
    elementAttributeTypeViewRules(),
    validate,
    elementController.viewElementAttributeType
  )
  .post(
    "/Dj5SaEpBxKw7RmC",
    apiAccess.ProcessOwner(),
    elementAttributeTypeDeleteRules(),
    validate,
    elementController.deleteElementAttributeType
  )
  .post(
    "/IMJghjlHxunWeM6",
    apiAccess.ProcessOwner(),
    elementAttributeTypeLinkedElementViewRules(),
    validate,
    elementController.linkedDocumentOrSOPInElementAttributeTypes
  );
