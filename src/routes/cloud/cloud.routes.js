const { Router } = require("express");
const { getDriveFolderAndDocumentList, updateDriveFolderAndDocuments } = require("../../controller/cloud/cloud.controller");
const { apiAccess } = require("../../utils/middleware/checkUserAccess");

exports.cloudRoutes = Router()
    .post('/wgVVJMPxGAcdSrC',apiAccess.ProcessOwner(), getDriveFolderAndDocumentList)
    .post('/rGqObchk114KPvg',apiAccess.ProcessOwner(), updateDriveFolderAndDocuments)