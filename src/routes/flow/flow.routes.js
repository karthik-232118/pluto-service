const { Router } = require("express");
const {
    getAllUserLists,
    getManagerDetails,
    getUserDetails,
    addBulkWorkFlowActionable,
    updateWorkflowActionable
} = require("../../controller/flow/flow.controller");
const { apiAccess } = require("../../utils/middleware/checkUserAccess");

exports.flowRoutes = Router()
    .post('/HvacTLXpTk2MpRA', getAllUserLists)
    .post('/k1Bz37WqsuMWaiz', getManagerDetails)
    .post('/PnKINXQWuY4oI56', getUserDetails)
    .post('/E7IiDa7UocODtp0',apiAccess.ProcessOwner(), addBulkWorkFlowActionable)
    .post('/N3WG6D6ZGPcXe59',apiAccess.ProcessOwner(), updateWorkflowActionable)