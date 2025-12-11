const { Router } = require("express");

const uploadFile = require("../../utils/uploadFile");
const eSignController = require("../../controller/admin/eSign.controller");
const { apiAccess } = require("../../utils/middleware/checkUserAccess");

exports.eSignRoutes = Router()
  .post(
    "/0UWMkrZyu4MAYtN",
    apiAccess.ProcessOwner(),
    uploadFile({
      fileSizeLimitMB: 25,
      destinationFolder: "public/eSign",
      allowedFileTypes: ["application/pdf"],
      middleware: false,
    })
  )
  .post("/WN0MZ4kutUryMAY",apiAccess.ProcessOwner(), eSignController.createEsignRequest)
  .post("/MryMAYtUZ4kWN0u",apiAccess.ProcessOwner(), eSignController.eSignDashboardCards)
  .post("/ryMAYWN0MutUZ4k",apiAccess.ProcessOwner(), eSignController.eSignDashboardList)
  .post("/0Mu4krZYWNyMAtU",apiAccess.ProcessOwner(), eSignController.eSignDashboardActivity);
