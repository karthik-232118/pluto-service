const { Op } = require("sequelize");
const { body, validationResult, param, query } = require("express-validator");
const ESignRequest = require("../../model/ESignRequest");
const ESignReceiver = require("../../model/ESignReceiver");
const FormModuleDraft = require("../../model/FormModuleDraft");
const FormModule = require("../../model/FormModule");
const Campaign = require("../../model/Campaign");
const CampaignParticipant = require("../../model/CampaignParticipant");

const getESignRequestByIdRules = () => {
  return [
    param("ESignRequestID")
      .trim()
      .notEmpty()
      .withMessage("Insufficient data to process the request")
      .bail()
      .isUUID()
      .withMessage("Invalid ESign Request")
      .bail()
      .custom(async (value) => {
        const eSignRequest = await ESignRequest.count({
          where: { ESignRequestID: value },
        });
        if (!eSignRequest || eSignRequest < 1) {
          return Promise.reject("ESign Request not found");
        }
      }),
    query("receiverId")
      .trim()
      .notEmpty()
      .withMessage("Insufficient data to process the request")
      .bail()
      .isUUID()
      .withMessage("Invalid Receiver")
      .bail()
      .custom(async (value) => {
        const eSignReceiver = await ESignReceiver.count({
          where: { ESignReceiverID: value },
        });

        if (!eSignReceiver || eSignReceiver < 1) {
          return Promise.reject("Receiver not found");
        }

        const isReceiverAlreadySigned = await ESignReceiver.count({
          where: {
            ESignReceiverID: value,
            Status: "Signed",
          },
        });

        if (isReceiverAlreadySigned || isReceiverAlreadySigned > 0) {
          return Promise.reject("You have already signed the document");
        }
      }),
    query("ip")
      .trim()
      .bail()
      .isIP()
      .withMessage("IP should be a valid IP")
      .optional({
        nullable: true,
        checkFalsy: true,
      }),
  ];
};

const fillESignRequestRules = () => {
  return [
    body("ESignRequestID")
      .trim()
      .notEmpty()
      .withMessage("Insufficient data to process the request")
      .bail()
      .isUUID()
      .withMessage("Invalid ESign Request")
      .bail()
      .custom(async (value) => {
        const eSignRequest = await ESignRequest.count({
          where: { ESignRequestID: value },
        });
        if (!eSignRequest || eSignRequest < 1) {
          return Promise.reject("There is no ESign Request found");
        }
      }),
    body("ESignReceiverID")
      .trim()
      .notEmpty()
      .withMessage("Insufficient data to process the request")
      .bail()
      .isUUID()
      .withMessage("Invalid Receiver")
      .bail()
      .custom(async (value) => {
        const eSignReceiver = await ESignReceiver.count({
          where: { ESignReceiverID: value },
        });

        if (!eSignReceiver || eSignReceiver < 1) {
          return Promise.reject("You are not a receiver of this document");
        }

        const isReceiverAlreadySigned = await ESignReceiver.count({
          where: {
            ESignReceiverID: value,
            Status: "Signed",
          },
        });

        if (isReceiverAlreadySigned || isReceiverAlreadySigned > 0) {
          return Promise.reject("You have already signed the document");
        }
      }),
  ];
};

const viewFormRules = () => {
  return [
    body("FormModuleDraftID")
      .trim()
      .notEmpty()
      .withMessage("Form Module InProgress is required")
      .bail()
      .isUUID()
      .withMessage("Invalid Form Module InProgress")
      .bail()
      .custom(async (value) => {
        const formModuleDraft = FormModuleDraft.count({
          where: { FormModuleDraftID: value },
        });

        const formModule = FormModule.count({
          include: [
            {
              model: FormModuleDraft,
              required: true,
              where: {
                FormModuleDraftID: value,
              },
            },
          ],
        });

        await Promise.all([formModuleDraft, formModule]);

        if (
          !formModuleDraft ||
          formModuleDraft < 1 ||
          !formModule ||
          formModule < 1
        ) {
          return Promise.reject("Form Module InProgress not found");
        }
      }),
    body("CampaignID")
      .trim()
      .notEmpty()
      .withMessage("Campaign ID is required")
      .bail()
      .isUUID()
      .withMessage("Invalid Campaign ID")
      .bail()
      .custom(async (value) => {
        console.log("RUNNING CAMPAIGN VALIDATION");
        const campaignQuery = Campaign.count({
          where: { CampaignID: value },
        });

        const campaignParticipantQuery = CampaignParticipant.count({
          where: {
            CampaignID: value,
          },
        });

        const [campaign, campaignParticipant] = await Promise.all([
          campaignQuery,
          campaignParticipantQuery,
        ]);

        if (!campaign || campaign < 1) {
          return Promise.reject("Campaign not found");
        }

        if (!campaignParticipant || campaignParticipant < 1) {
          return Promise.reject("You are not a participant of this campaign");
        }
      }),
  ];
};

const getCampaignSubmittedFormRules = () => {
  return [
    body("FormModuleDraftID")
      .trim()
      .notEmpty()
      .withMessage("Form Module InProgress is required")
      .bail()
      .isUUID()
      .withMessage("Invalid Form Module InProgress")
      .bail()
      .custom(async (value) => {
        const formModuleDraft = FormModuleDraft.count({
          where: { FormModuleDraftID: value },
        });

        const formModule = FormModule.count({
          include: [
            {
              model: FormModuleDraft,
              required: true,
              where: {
                FormModuleDraftID: value,
              },
            },
          ],
        });

        await Promise.all([formModuleDraft, formModule]);

        if (
          !formModuleDraft ||
          formModuleDraft < 1 ||
          !formModule ||
          formModule < 1
        ) {
          return Promise.reject("Form Module InProgress not found");
        }
      }),
    body("CampaignID")
      .trim()
      .notEmpty()
      .withMessage("Campaign ID is required")
      .bail()
      .isUUID()
      .withMessage("Invalid Campaign ID")
      .bail()
      .custom(async (value) => {
        console.log("RUNNING CAMPAIGN VALIDATION");
        const campaignQuery = Campaign.count({
          where: { CampaignID: value },
        });

        const campaignParticipantQuery = CampaignParticipant.count({
          where: {
            CampaignID: value,
          },
        });

        const [campaign, campaignParticipant] = await Promise.all([
          campaignQuery,
          campaignParticipantQuery,
        ]);

        if (!campaign || campaign < 1) {
          return Promise.reject("Campaign not found");
        }

        if (!campaignParticipant || campaignParticipant < 1) {
          return Promise.reject("You are not a participant of this campaign");
        }
      }),
  ];
};

const fillCampaignRules = () => {
  return [
    body("FormModuleDraftID")
      .trim()
      .notEmpty()
      .withMessage("Form Module InProgress is required")
      .bail()
      .isUUID()
      .withMessage("Invalid Form Module InProgress")
      .bail()
      .custom(async (value) => {
        const formModuleDraft = FormModuleDraft.count({
          where: { FormModuleDraftID: value },
        });

        const formModule = FormModule.count({
          include: [
            {
              model: FormModuleDraft,
              required: true,
              where: {
                FormModuleDraftID: value,
              },
            },
          ],
        });

        await Promise.all([formModuleDraft, formModule]);

        if (
          !formModuleDraft ||
          formModuleDraft < 1 ||
          !formModule ||
          formModule < 1
        ) {
          return Promise.reject("Form Module InProgress not found");
        }
      }),
    body("CampaignID")
      .trim()
      .notEmpty()
      .withMessage("Campaign ID is required")
      .bail()
      .isUUID()
      .withMessage("Invalid Campaign ID")
      .bail()
      .custom(async (value) => {
        console.log("RUNNING CAMPAIGN VALIDATION");
        const campaignQuery = Campaign.count({
          where: { CampaignID: value },
        });

        const campaignParticipantQuery = CampaignParticipant.count({
          where: {
            CampaignID: value,
          },
        });

        const [campaign, campaignParticipant] = await Promise.all([
          campaignQuery,
          campaignParticipantQuery,
        ]);

        if (!campaign || campaign < 1) {
          return Promise.reject("Campaign not found");
        }

        if (!campaignParticipant || campaignParticipant < 1) {
          return Promise.reject("You are not a participant of this campaign");
        }
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
  getESignRequestByIdRules,
  fillESignRequestRules,
  viewFormRules,
  getCampaignSubmittedFormRules,
  fillCampaignRules,
  validate,
};
