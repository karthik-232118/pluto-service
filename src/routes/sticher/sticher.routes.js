const { Router } = require("express");
const { apiAccess } = require("../../utils/middleware/checkUserAccess");
const { 
    addSticherClientDetails, 
    addSticherLicenseDetails, 
    getSticherClientDetailWithLicense 
} = require("../../controller/sticher/sticher.controller");

exports.sticherRoutes = Router()
  .post("/SseJ74rHufMTTgb", apiAccess.Admin(), addSticherClientDetails)
  .post("/D0Aj0iG7Kh9RHo3", apiAccess.Admin(), addSticherLicenseDetails)
  .post("/FlwjwAOesY2ZMVl", apiAccess.Admin(), getSticherClientDetailWithLicense);