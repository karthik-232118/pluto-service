const { Router } = require("express");
const multer = require("multer");

const commonController = require("../controller/common.controller");
const {
  generateTokenForDynamicFormRules,
  validate,
} = require("../validators/common.validator");
const uploadFileNew = require("../utils/uploadFileNew");
const constants = require("../utils/constants");
const bulkFileUpload = require("../utils/bulkFileUpload");

exports.commonRoutes = Router()
  // upload document file
  .post(
    "/j3PrIxysO5MIZZB",
    uploadFileNew({
      fileSizeLimitMB: constants.fileSizeLimitMB,
      destinationFolder: "src/infrastructure/media/Document",
      allowedFileTypes: constants.allowedDocumentFileTypes,
    })
  )
  .post(
    "/MIBj35ZPsOZrIxy",
    uploadFileNew({
      fileSizeLimitMB: constants.fileSizeLimitMB,
      destinationFolder: "src/infrastructure/media/Risk",
      allowedFileTypes: constants.allowedDocumentFileTypes,
    })
  )
  // upload bulk document files
  .post(
    "/xyIZZBj3PrIsO5M",
    bulkFileUpload({
      fileSizeLimitMB: constants.bulkFileSizeLimitMB,
      destinationFolder: "src/infrastructure/media/bulk/Document",
      allowedFileTypes: constants.allowedDocumentFileTypes,
    })
  )
  // upload Skill Building video file
  .post(
    "/AxMkYtN0k4MUWM",
    uploadFileNew({
      fileSizeLimitMB: constants.fileSizeLimitMB,
      destinationFolder: "src/infrastructure/media/TrainingSimulation",
      allowedFileTypes: constants.allowedVideoFileTypes,
    })
  )
  // upload Skill Building zip file
  .post(
    "/RdaHHQfk7zkvNuq",
    uploadFileNew({
      fileSizeLimitMB: constants.fileSizeLimitMB,
      destinationFolder: "src/infrastructure/media/TrainingSimulation",
      allowedFileTypes: constants.allowedZipFileTypes,
    })
  )
  // upload Skill Assessment zip file
  .post(
    "/fk7zkvNuqRdaHHQ",
    uploadFileNew({
      fileSizeLimitMB: constants.fileSizeLimitMB,
      destinationFolder: "src/infrastructure/media/TestSimulation",
      allowedFileTypes: constants.allowedZipFileTypes,
    })
  )
  // upload image file
  .post(
    "/RdaHHQfk7zqkvNu",
    uploadFileNew({
      fileSizeLimitMB: constants.fileSizeLimitMB,
      destinationFolder: "src/infrastructure/media/SopImage",
      allowedFileTypes: constants.allowedImageFileTypes,
    })
  )
  // sop flow pdf file
  .post(
    "/vNuRdaH7zqkHQfk",
    uploadFileNew({
      fileSizeLimitMB: constants.fileSizeLimitMB,
      destinationFolder: "src/infrastructure/media/SopFlowDocument",
      allowedFileTypes: constants.allowedSopFlowDocumentFileExtensions,
    })
  )
  // blank document
  .post(
    "/zqaH7kHQfkvNuRd",
    uploadFileNew({
      fileSizeLimitMB: constants.fileSizeLimitMB,
      destinationFolder: "src/infrastructure/media/Template/Blank",
      allowedFileTypes: constants.allowedBlankDocumentFileExtensions,
    })
  )
  .post(
    "/aHkHQfkzq7vNuRd",
    uploadFileNew({
      fileSizeLimitMB: constants.fileSizeLimitMB,
      destinationFolder: "src/infrastructure/media/Template/TemplateDocument",
      allowedFileTypes: constants.allowedBlankDocumentFileExtensions,
    })
  )
  .post(
    "/zdUdGLYFfdbXLek",
    multer().single("report"),
    commonController.createTestSimulationReport
  )
  .post("/rANUMtWyYkuZ04M", commonController.listProcessOwner)
  .post("/XqfUekpsJi2a4KO", commonController.auditorList)
  .post("/rANUMtWyYkuZ05N", commonController.endUserList)
  .post("/wVbRc3blF5fhZxh", commonController.listProcessOwnerAndEndUser)
  .post("/Y5xGBif2YZa6XSf", commonController.userLIstWhoHaveSignature)
  .post("/fpdso51qDHq2k7c", commonController.userRelaterSignatoryElementList)
  .post("/XjFGE9SNuU4bj0W", commonController.replaceSignatoryUser)
  .post("/E9ZIr3wa5wwcgeC", commonController.moduleCoOwnerChange)
  .post("/b6xaPIRW453B3Yn", commonController.coOwnersElements)
  .post("/VEPVbCaUZyhexUE", commonController.userListWhoIsCoOwner)
  .post("/HtHTKXcpFiruC7F", commonController.userListWhoIsOwner)
  .post("/xhwVbRF5fhZc3bl", commonController.listForm)
  .post(
    "/bRc3blFfhZxhwV5",
    generateTokenForDynamicFormRules(),
    validate,
    commonController.generateTokenForDynamicForm
  )
  .post("/V5bRcfhZxhw3blF", commonController.listUsersToAssignElement)
  .post("/hZxhw3blFV5bRcf", commonController.listSOPTemplates)
  .post("/blFV5bhZxhw3Rcf", commonController.viewSOPTemplate);
