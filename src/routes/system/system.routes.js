const { Router } = require("express");
const {
  updateSystemConfigure,
  getSystemConfigure,
  getSystemAndOrganizationInfoKey,
  decriptSystemInfo,
  addOrUpdateOrganizationInfo,
  getOrganizationTypes,
  getEnterpriseList,
  deleteEnterprise,
  getExistingLicenseDetails,
  enterprisesWiseAdminList,
  addInitialAdminUser,
  updateCloudeConfig,
} = require("../../controller/system/system.controller");
const { apiAccess } = require("../../utils/middleware/checkUserAccess");

exports.systemRoutes = Router()
  .post("/ZmKEWezRqWA5e9B", apiAccess.Admin(), updateSystemConfigure)
  .post("/bywT3cLZRVfujK7", apiAccess.EndUser(), getSystemConfigure)
  .post("/B5uk5l0ie6yq7Fm", apiAccess.Admin(), getSystemAndOrganizationInfoKey)
  .post("/xLoZneo6fA93l8x", apiAccess.Admin(), decriptSystemInfo)
  .post("/CaQzTD6mC8VzHg1", apiAccess.Admin(), addOrUpdateOrganizationInfo)
  .post("/JxA0gknsUByKnXL", apiAccess.Admin(), getOrganizationTypes)
  .post("/VcMLIlIlQdVcw8G", apiAccess.Admin(), getEnterpriseList)
  .post("/J1HZlRXTzDEdUko", apiAccess.Admin(), deleteEnterprise)
  .post("/wLnMoL8Egm3v8hK", apiAccess.Admin(), getExistingLicenseDetails)
  .post("/UB1oBK8mvtleI94", apiAccess.Admin(), enterprisesWiseAdminList)
  .post("/oUBdgmQDDyzBbJp", apiAccess.Admin(), addInitialAdminUser)
  .post("/D5hGngPZ8fwvdve", apiAccess.Admin(), updateCloudeConfig);
