const { Router } = require("express");
const {
  getESignRequestById,
  fillESignRequest,
  verifyGeneratedTokenForDynamicForm,
  getCampaignSubmittedForm,
  fillCampaign,
  viewForm,
  updateEditedDocumentPath,
  blankAndTemplatePathUpdate,
  TemplatePathUpdate,
  createSkillsClickEvent,
  getAllSkillsClickEvents,
  getClickEventsBySession,
} = require("../../controller/public/public.controller");
const {
  validate,
  getESignRequestByIdRules,
  getCampaignSubmittedFormRules,
  fillCampaignRules,
  viewFormRules,
  fillESignRequestRules,
} = require("../../validators/public/public.validator");

exports.publicRoutes = Router()
  .get(
    "/AQZZLPX45XKvbTW/:ESignRequestID",
    getESignRequestByIdRules(),
    validate,
    getESignRequestById
  )
  .post("/QZZXvbTWLP45QZZ", fillESignRequestRules(), validate, fillESignRequest)
  .post("/WQZZQP45vbTZZXL", verifyGeneratedTokenForDynamicForm)
  .post("/xWexh52ub47Bhw1", viewFormRules(), validate, viewForm)
  .post(
    "/ub47Bhw1Wexxh52",
    getCampaignSubmittedFormRules(),
    validate,
    getCampaignSubmittedForm
  )
  .post("/h52ub47Bhw1Wexx", fillCampaignRules(), validate, fillCampaign)
  .post("/basFV5bhZxhwsda", updateEditedDocumentPath)
  .post("/bhZabhw5sFVxsda", blankAndTemplatePathUpdate)
  .post("/xshadbw5sFVhZab", TemplatePathUpdate)
  .post("/aaZabhw5sFVxsda", createSkillsClickEvent)
  .post("/fsxadbw5sFVhZaa", getAllSkillsClickEvents)
  .post("/gbiabhw5sFVxsda", getClickEventsBySession);
