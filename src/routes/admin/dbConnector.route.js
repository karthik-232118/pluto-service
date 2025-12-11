const { Router } = require("express");

const dbConnectorController = require("../../controller/admin/dbConnector.controller");
const {
  dbSaveConnectionRules,
  validate,
} = require("../../validators/admin/dbConnector.validator");
const { apiAccess } = require("../../utils/middleware/checkUserAccess");

exports.dbConnectorRoutes = Router()
  .post(
    "/yMN0MAYWZ4kutUr",
    apiAccess.ProcessOwner(),
    dbSaveConnectionRules(),
    validate,
    dbConnectorController.saveConnection
  )
  .post("/tUZ4MrkyMAYWN0u",apiAccess.ProcessOwner(), dbConnectorController.getTables)
  .post("/UZryN0MutMAYW4k",apiAccess.ProcessOwner(), dbConnectorController.getColumns)
  .post("/4NMut0kUZryMAYW",apiAccess.ProcessOwner(), dbConnectorController.executeQuery);
