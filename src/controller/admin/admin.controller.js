const {
  Op,
  Sequelize,
  literal,
  DataTypes,
  fn,
  col,
  QueryTypes,
  where,
} = require("sequelize");
const constants = require("../../utils/constants");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const fsPromise = require("fs").promises;
const moment = require("moment");
const { sequelize } = require("../../model");
const { logger } = require("../../utils/services/logger");
const DocumentModule = require("../../model/DocumentModule");
const ModuleChecker = require("../../model/ModuleChecker");
const ModuleStakeHolder = require("../../model/ModuleStakeHolder");
const ModuleEscalation = require("../../model/ModuleEscalation");
const helper = require("../../utils/helper");
const DocumentModuleDraft = require("../../model/DocumentModuleDraft");
const TrainingSimulationModule = require("../../model/TrainingSimulationModule");
const TrainingSimulationModuleDraft = require("../../model/TrainingSimulationModuleDraft");
const TestSimulationModule = require("../../model/TestSimulationModule");
const TestSimulationModuleDraft = require("../../model/TestSimulationModuleDraft");
const SopModuleDraft = require("../../model/SopModuleDraft");
const SopModule = require("../../model/SopModule");
const ContentStructure = require("../../model/ContentStructure");
const UserModuleLink = require("../../model/UserModuleLink");
const Users = require("../../model/Users");
const Departments = require("../../model/Departments");
const Roles = require("../../model/Roles");
const UserRoleLink = require("../../model/UserRoleLink");
const UserDeparmentLink = require("../../model/UserDeparmentLink");
const ModuleOwner = require("../../model/ModuleOwner");
const TestMcqsModuleDraft = require("../../model/TestMcqsModuleDraft");
const TestMcqsModule = require("../../model/TestMcqsModule");
const QuestionRepository = require("../../model/QuestionRepository");
const QuestionAnswersLink = require("../../model/QuestionAnswersLink");
const UserDetails = require("../../model/UserDetails");
const ModuleMaster = require("../../model/ModuleMaster");
const { mailService } = require("../../utils/services/nodemailer");
const TestSimulationReport = require("../../model/TestSimulationReport");
const SopDetails = require("../../model/SopDetails");
const SopAttachmentLinks = require("../../model/SopAttachmentLinks");
const UserNotification = require("../../model/UserNotification");
const Notification = require("../../model/Notification");
const {
  sendNotification,
  sendSync,
  syncRenameCategory,
  syncCreateCategory,
  syncDocumentCreation,
  syncDocumentDeletion,
  notifyUsersAboutDocument,
} = require("../../utils/services/socket");
const FormModule = require("../../model/FormModule");
const FormModuleDraft = require("../../model/FormModuleDraft");
const RiskAndCompliences = require("../../model/RiskAndCompliences");
const Campaign = require("../../model/Campaign");
const CampaignParticipant = require("../../model/CampaignParticipant");
const commonController = require("../common.controller");
const ejs = require("ejs");
const jwt = require("jsonwebtoken");
const ResourceAccess = require("../../model/ResourceAccess");
const AuditorSignature = require("../../model/AuditorSignature");
const SopFlow = require("../../model/SopFlow");
const SopFlowNodeAttachment = require("../../model/SopFlowNodeAttachment");
const SopFlowNodeDetail = require("../../model/SopFlowNodeDetail");
const SopFlowService = require("../../model/SopFlowService");
const { moduleMapping } = require("../../utils/moduleConfig");
const { validationResult } = require("express-validator");
const SopFlowNodeRole = require("../../model/SopFlowNodeRole");
const Group = require("../../model/Group");
const UserGroup = require("../../model/UserGroup");
const OrganizationStructureRoleLinks = require("../../model/OrganizationStructureRoleLinks");
const OrganizationStructureDepartmentLink = require("../../model/OrganizationStructureDepartmentLink");
const RiskModule = require("../../model/RiskModule");
const RiskAssessment = require("../../model/RiskAssessment");
const RiskAnalysis = require("../../model/RiskAnalysis");
const RiskTreatment = require("../../model/RiskTreatment");
const RiskMonitoringReview = require("../../model/RiskMonitoringReview");
const RiskSopLink = require("../../model/RiskSopLink");
const RiskModuleDraft = require("../../model/RiskModuleDraft");
const { group } = require("console");
const RiskTreatmentActionItem = require("../../model/RiskTreatmentActionItems");
const ModuleApprover = require("../../model/ModuleApprover");
const DocumentTemplate = require("../../model/DocumentTemplate");
const EmailTemplate = require("../../model/EmailTemplate");

//Check for user permission
const checkUserPermission = async (
  Modal,
  ModuleTypeID,
  ContentID,
  ModuleKey,
  ModuleValue,
  DraftKey,
  DraftValue,
  UserID,
  t
) => {
  try {
    const coOwner = {};
    if('CoOwnerUserID' in Modal.rawAttributes){
      coOwner.CoOwnerUserID = {
        [Op.contains]: [UserID]
      }
    }
    const [
      isModuleOwnerUserPermissibleToDelete,
      isDraftOwnerPermissibleToDelete,
      isCoOwnerPermissibleToDelete,
    ] = await Promise.all([
      ModuleOwner.count({
        where: {
          ModuleTypeID,
          ContentID,
          [ModuleKey]: ModuleValue,
          [DraftKey]: DraftValue,
          UserID: UserID,
          IsDeleted: false,
        },
        transaction: t,
      }),
      Modal.count({
        where: {
          ModuleTypeID,
          ContentID,
          [ModuleKey]: ModuleValue,
          [DraftKey]: DraftValue,
          CreatedBy: UserID,
          IsDeleted: false,
        },
        transaction: t,
      }),
      Modal.count({
        where: {
          ModuleTypeID,
          ContentID,
          [ModuleKey]: ModuleValue,
          [DraftKey]: DraftValue,
          ...coOwner,
          IsDeleted: false,
        },
        transaction: t,
      }),
    ]);

    if (
      (!isModuleOwnerUserPermissibleToDelete ||
        isModuleOwnerUserPermissibleToDelete < 1) &&
      (!isDraftOwnerPermissibleToDelete ||
        isDraftOwnerPermissibleToDelete < 1) &&
      (!('CoOwnerUserID' in Modal.rawAttributes &&  isCoOwnerPermissibleToDelete && isCoOwnerPermissibleToDelete >0))
    ) {
      return false;
    }
    return true;
  } catch (error) {
    throw error;
  }
};
const sentModuleBulkEmail = async (bulkData, userType) => {
  const assignUserIDs = [],
    moduleIds = {
      SOPID: [],
      DocumentID: [],
      TestSimulationID: [],
      TrainingSimulationID: [],
      TestMCQID: [],
      FormID: [],
    };
  for (const el of bulkData) {
    assignUserIDs.push(el.UserID);
    if (el?.SOPID) {
      moduleIds.SOPID.push(el.SOPID);
    } else if (el?.DocumentID) {
      moduleIds.DocumentID.push(el.DocumentID);
    } else if (el?.TestSimulationID) {
      moduleIds.TestSimulationID.push(el.TestSimulationID);
    } else if (el?.TrainingSimulationID) {
      moduleIds.TrainingSimulationID.push(el.TrainingSimulationID);
    } else if (el?.TestMCQID) {
      moduleIds.TestMCQID.push(el.TestMCQID);
    } else if (el?.FormID) {
      moduleIds.FormID.push(el.FormID);
    }
  }
  let query = "";
  if (moduleIds?.SOPID.length > 0) {
    query = `SELECT s."SOPName" AS "ModuleName",m."ModuleName" AS "ModuleType" FROM "SopModules" s
            INNER JOIN "ModuleMasters" m ON m."ModuleTypeID" = s."ModuleTypeID"
            WHERE s."SOPID" IN ('${moduleIds?.SOPID?.join("','")}') LIMIT 1`;
  } else if (moduleIds?.DocumentID.length > 0) {
    query = `SELECT s."DocumentName" AS "ModuleName",m."ModuleName" AS "ModuleType" FROM "DocumentModules" s
              INNER JOIN "ModuleMasters" m ON m."ModuleTypeID" = s."ModuleTypeID"
              WHERE s."DocumentID" IN ('${moduleIds?.DocumentID?.join(
                "','"
              )}') LIMIT 1`;
  } else if (moduleIds?.TestSimulationID.length > 0) {
    query = `SELECT s."TestSimulationName" AS "ModuleName",m."ModuleName" AS "ModuleType" FROM "TestSimulationModules" s
              INNER JOIN "ModuleMasters" m ON m."ModuleTypeID" = s."ModuleTypeID"
              WHERE s."TestSimulationID" IN ('${moduleIds?.TestSimulationID?.join(
                "','"
              )}') LIMIT 1`;
  } else if (moduleIds?.TrainingSimulationID.length > 0) {
    query = `SELECT s."TrainingSimulationName" AS "ModuleName",m."ModuleName" AS "ModuleType" FROM "TrainingSimulationModules" s
              INNER JOIN "ModuleMasters" m ON m."ModuleTypeID" = s."ModuleTypeID"
              WHERE s."TrainingSimulationID" IN ('${moduleIds?.TrainingSimulationID?.join(
                "','"
              )}') LIMIT 1`;
  } else if (moduleIds?.TestMCQID.length > 0) {
    query = `SELECT s."TestMCQName" AS "ModuleName",m."ModuleName" AS "ModuleType" FROM "TestMcqsModules" s
              INNER JOIN "ModuleMasters" m ON m."ModuleTypeID" = s."ModuleTypeID"
              WHERE s."TestMCQID" IN ('${moduleIds?.TestMCQID?.join(
                "','"
              )}') LIMIT 1`;
  } else if (moduleIds?.FormID.length > 0) {
    query = `SELECT s."FormName" AS "ModuleName",m."ModuleName" AS "ModuleType" FROM "FormModules" s
              INNER JOIN "ModuleMasters" m ON m."ModuleTypeID" = s."ModuleTypeID"
              WHERE s."FormID" IN ('${moduleIds?.FormID?.join(
                "','"
              )}') LIMIT 1`;
  }

  const moduleData = await sequelize.query(query, {
    type: QueryTypes.SELECT,
  });
  const data = await sequelize.query(
    `
    SELECT ud."UserEmail" FROM "UserDetails" ud
    INNER JOIN "Notifications" n ON n."UserID" = ud."UserID"
    WHERE n."NotificationTypeForAction" IN ('email','both' ) AND ud."UserID" IN (:UserIDs);
    `,
    {
      type: QueryTypes.SELECT,
      replacements: {
        UserIDs: assignUserIDs,
      },
    }
  );
  const userEmails = [];
  for (const el of data) {
    userEmails.push(el.UserEmail);
  }
  let html = `<div class="container"> <h1>${userType} Element Assignment Notification</h1> <p>Element has been assigned to you as a ${userType}</p> <table> <tr> <th>Module Type</th> <th>Module Name</th> </tr>
  <tr> <td>${moduleData?.[0]?.ModuleType}</td> <td>${moduleData?.[0]?.ModuleName}</td> </tr></table> </div>`;
  if (userEmails.length > 0) {
    mailService({
      recipientEmail: userEmails.join(", "),
      subject: "Element Assignment Notification",
      body: {
        html,
      },
    });
  }
};

const validate = async (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return [];
  }

  const extractedErrors = [];
  const errorWithParams = {};
  errors.array().forEach((err) => extractedErrors.push(err.msg));
  errors.array().forEach((err) => (errorWithParams[err.path] = err.msg));
  return Object.values(errorWithParams);
};

// document module
const createDocumentModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const {
    ElementAttributeTypeID,
    ModuleTypeID,
    ContentID = null,
    DocumentID = null,
    DocumentName,
    DocumentDescription,
    DocumentIsActive,
    DocumentTags,
    DocumentOwner,
    Checker,
    Approver,
    StakeHolder,
    EscalationPerson,
    EscalationType,
    EscalationAfter,
    StakeHolderEscalationPerson,
    StakeHolderEscalationType,
    StakeHolderEscalationAfter,
    SelfApproved,
    ReadingTimeValue = null,
    ReadingTimeUnit = null,
    DocumentExpiry = null,
    RiskDetailsArrays = [],
    ComplianceDetailsArrays = [],
    ClauseDetailsArrays = [],
    RiskPropertiesDetails = null,
    CompliancePropertiesDetails = null,
    ClausePropertiesDetails = null,
    NeedAcceptance = false,
    NeedAcceptanceFromStakeHolder = false,
    NeedAcceptanceForApprover = false,
    TemplateID = null,
    FileUrl,
  } = req.body;

  const { currentUserId } = req.payload;

  const basePath = path.posix.join(
    "src",
    "infrastructure",
    "media",
    "Document"
  );
  let newFilePathTemp;
  let documentIDForSync = DocumentID;
  let isDocumentNameSame = false;
  let lastDocumentName;
  let newFilePathForDraft;

  try {
    const assignUsers = [];
    const assignMaker = [...JSON.parse(JSON.stringify(DocumentOwner))];
    let assignChecker = [];
    let assignStakeHolder = [];
    if (
      Checker &&
      Checker.length > 0 &&
      EscalationPerson &&
      EscalationPerson.length > 0
    ) {
      assignChecker = [...JSON.parse(JSON.stringify(Checker))];
      assignEscalation = [...JSON.parse(JSON.stringify(EscalationPerson))];
    }

    if (
      StakeHolder &&
      StakeHolder?.length > 0 &&
      StakeHolderEscalationPerson &&
      StakeHolderEscalationPerson?.length > 0
    ) {
      assignStakeHolder = [...JSON.parse(JSON.stringify(StakeHolder))];
      assignEscalation = [
        ...JSON.parse(JSON.stringify(StakeHolderEscalationPerson)),
      ];
    }

    let moduleDetails, draftDetails;

    if (DocumentID) {
      moduleDetails = { DocumentID, DocumentName };
      let existingDocumentModuleDraft = await DocumentModuleDraft.findOne({
        where: { ModuleTypeID, DocumentID, ContentID },
        order: [["CreatedDate", "DESC"]],
        transaction: t,
      });
      if (!existingDocumentModuleDraft) {
        await t.rollback();
        return res.status(404).json({ message: "Document not found" });
      }

      existingDocumentModuleDraft = existingDocumentModuleDraft.toJSON();

      if (existingDocumentModuleDraft.DocumentName === DocumentName) {
        isDocumentNameSame = true;
      } else {
        lastDocumentName = existingDocumentModuleDraft.DocumentName;
      }

      const isUserPermissibleToDelete = await checkUserPermission(
        DocumentModuleDraft,
        ModuleTypeID,
        ContentID,
        "DocumentID",
        DocumentID,
        "DocumentModuleDraftID",
        existingDocumentModuleDraft.DocumentModuleDraftID,
        currentUserId,
        t
      );

      if (!isUserPermissibleToDelete) {
        await t.rollback();
        if (req?.file?.path) await helper.deleteFile(req?.file?.path);
        return res
          .status(403)
          .json({ message: "You are unathorized to edit or publish" });
      }

      let latestDraftVersion;
      let latestMasterVersion = null;
      if (SelfApproved === "true") {
        if (existingDocumentModuleDraft.MasterVersion) {
          latestMasterVersion = (
            parseFloat(existingDocumentModuleDraft.MasterVersion) + 1.0
          ).toFixed(1);
        } else {
          latestMasterVersion = Math.ceil(
            parseFloat(existingDocumentModuleDraft.DraftVersion)
          ).toFixed(1);
        }

        latestDraftVersion = (parseFloat(latestMasterVersion) - 0.9).toFixed(1);
      } else {
        if (existingDocumentModuleDraft.MasterVersion) {
          latestDraftVersion = (
            parseFloat(existingDocumentModuleDraft.MasterVersion) + 0.1
          ).toFixed(1);
        } else {
          latestDraftVersion = (
            parseFloat(existingDocumentModuleDraft.DraftVersion) + 0.1
          ).toFixed(1);
        }
      }

      const newDocumentModuleDraft = await DocumentModuleDraft.create(
        {
          ElementAttributeTypeID,
          ModuleTypeID,
          DocumentID,
          ContentID,
          DocumentName,
          DocumentDescription,
          DocumentIsActive,
          DocumentStatus: SelfApproved === "true" ? "Published" : "InProgress",
          DraftVersion: latestDraftVersion.toString(),
          MasterVersion: SelfApproved === "true" ? latestMasterVersion : null,
          DocumentTags,
          SelfApproved,
          ReadingTimeValue: ReadingTimeValue || null,
          ReadingTimeUnit: ReadingTimeUnit || null,
          CreatedBy: currentUserId,
          DocumentExpiry,
          NeedAcceptance,
          NeedAcceptanceFromStakeHolder,
          NeedAcceptanceForApprover,
          TemplateID,
        },
        { transaction: t }
      );
      await RiskAndCompliences.create(
        {
          DocumentID,
          DocumentModuleDraftID: newDocumentModuleDraft.DocumentModuleDraftID,
          DraftVersion: latestDraftVersion.toString(),
          MasterVersion: SelfApproved === "true" ? latestMasterVersion : null,
          NoOfRisk: RiskDetailsArrays.length,
          NoOfCompliance: ComplianceDetailsArrays.length,
          NoOfClause: ClauseDetailsArrays.length,
          RiskDetailsArrays,
          ComplianceDetailsArrays,
          ClauseDetailsArrays,
          RiskPropertiesDetails,
          CompliancePropertiesDetails,
          ClausePropertiesDetails,
          CreatedBy: currentUserId,
        },
        { transaction: t }
      );
      if (DocumentOwner && DocumentOwner.length > 0) {
        await ModuleOwner.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              DocumentID,
              ContentID,
              DocumentModuleDraftID:
                existingDocumentModuleDraft.DocumentModuleDraftID,
            },
            transaction: t,
          }
        );

        const ownerData = DocumentOwner.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            DocumentID,
            DocumentModuleDraftID: newDocumentModuleDraft.DocumentModuleDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });
        draftDetails = {
          DocumentModuleDraftID: newDocumentModuleDraft.DocumentModuleDraftID,
          DocumentName,
        };
        await ModuleOwner.bulkCreate(ownerData, { transaction: t });
      }

      if (SelfApproved === "true") {
        await DocumentModule.update(
          {
            ElementAttributeTypeID,
            DocumentName,
            DocumentDescription,
            DocumentIsActive,
            DocumentTags,
            SelfApproved,
            ReadingTimeValue: ReadingTimeValue || null,
            ReadingTimeUnit: ReadingTimeUnit || null,
            DocumentStatus: "Published",
            DraftVersion: latestDraftVersion.toString(),
            MasterVersion: latestMasterVersion,
            ModifiedBy: currentUserId,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
            DocumentExpiry,
          },
          { where: { ModuleTypeID, DocumentID, ContentID }, transaction: t }
        );
      }

      if (SelfApproved === "false") {
        await DocumentModuleDraft.update(
          {
            EscalationType,
            EscalationAfter,
            StakeHolderEscalationType,
            StakeHolderEscalationAfter,
          },
          {
            where: {
              ModuleTypeID,
              DocumentModuleDraftID:
                newDocumentModuleDraft.DocumentModuleDraftID,
              DocumentID,
              ContentID,
            },
            transaction: t,
          }
        );
      } else {
        await DocumentModuleDraft.update(
          {
            EscalationType: null,
            EscalationAfter: null,
            StakeHolderEscalationType: null,
            StakeHolderEscalationAfter: null,
          },
          {
            where: {
              ModuleTypeID,
              DocumentModuleDraftID:
                newDocumentModuleDraft.DocumentModuleDraftID,
              DocumentID,
              ContentID,
            },
            transaction: t,
          }
        );
      }

      if (SelfApproved === "false" && Checker && Checker.length > 0) {
        await ModuleChecker.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              DocumentID,
              ContentID,
              DocumentModuleDraftID:
                existingDocumentModuleDraft.DocumentModuleDraftID,
            },
            transaction: t,
          }
        );
        const checkerData = Checker.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            DocumentModuleDraftID: newDocumentModuleDraft.DocumentModuleDraftID,
            DocumentID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleChecker.bulkCreate(checkerData, { transaction: t });
        sentModuleBulkEmail(checkerData, "Checker");
      } else if (SelfApproved === "true") {
        await ModuleChecker.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              DocumentID,
              ContentID,
              DocumentModuleDraftID:
                existingDocumentModuleDraft.DocumentModuleDraftID,
            },
            transaction: t,
          }
        );
      }

      if (SelfApproved === "false" && Approver && Approver.length > 0) {
        await ModuleApprover.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              DocumentID,
              ContentID,
              DocumentModuleDraftID:
                existingDocumentModuleDraft.DocumentModuleDraftID,
            },
            transaction: t,
          }
        );
        const approverData = Approver.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            DocumentModuleDraftID: newDocumentModuleDraft.DocumentModuleDraftID,
            DocumentID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleApprover.bulkCreate(approverData, { transaction: t });
      } else if (SelfApproved === "true") {
        await ModuleApprover.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              DocumentID,
              ContentID,
              DocumentModuleDraftID:
                existingDocumentModuleDraft.DocumentModuleDraftID,
            },
            transaction: t,
          }
        );
      }

      if (SelfApproved === "false" && StakeHolder && StakeHolder?.length > 0) {
        await ModuleStakeHolder.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              DocumentID,
              ContentID,
              DocumentModuleDraftID:
                existingDocumentModuleDraft.DocumentModuleDraftID,
            },
            transaction: t,
          }
        );
        const stakeHolderData = StakeHolder.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            DocumentModuleDraftID: newDocumentModuleDraft.DocumentModuleDraftID,
            DocumentID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleStakeHolder.bulkCreate(stakeHolderData, { transaction: t });
        sentModuleBulkEmail(stakeHolderData, "StakeHolder");
      } else if (SelfApproved === "true") {
        await ModuleStakeHolder.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              DocumentID,
              ContentID,
              DocumentModuleDraftID:
                existingDocumentModuleDraft.DocumentModuleDraftID,
            },
            transaction: t,
          }
        );
      }

      if (
        SelfApproved === "false" &&
        EscalationPerson &&
        EscalationPerson.length > 0
      ) {
        await ModuleEscalation.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              IsReviewer: true,
              IsStakeHolder: false,
              ModuleTypeID,
              DocumentID,
              ContentID,
              DocumentModuleDraftID:
                existingDocumentModuleDraft.DocumentModuleDraftID,
            },
            transaction: t,
          }
        );

        const escalationData = EscalationPerson.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            DocumentModuleDraftID: newDocumentModuleDraft.DocumentModuleDraftID,
            DocumentID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleEscalation.bulkCreate(escalationData, { transaction: t });
      } else if (SelfApproved === "true") {
        await ModuleEscalation.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              IsReviewer: true,
              IsStakeHolder: false,
              ModuleTypeID,
              DocumentID,
              ContentID,
              DocumentModuleDraftID:
                existingDocumentModuleDraft.DocumentModuleDraftID,
            },
            transaction: t,
          }
        );
      }
      if (
        SelfApproved === "false" &&
        StakeHolderEscalationPerson &&
        StakeHolderEscalationPerson.length > 0
      ) {
        await ModuleEscalation.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              IsReviewer: false,
              IsStakeHolder: true,
              ModuleTypeID,
              DocumentID,
              ContentID,
              DocumentModuleDraftID:
                existingDocumentModuleDraft.DocumentModuleDraftID,
            },
            transaction: t,
          }
        );

        const escalationData = StakeHolderEscalationPerson.map((userId) => {
          return {
            IsReviewer: false,
            IsStakeHolder: true,
            ModuleTypeID,
            ContentID,
            DocumentModuleDraftID: newDocumentModuleDraft.DocumentModuleDraftID,
            DocumentID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleEscalation.bulkCreate(escalationData, { transaction: t });
      } else if (SelfApproved === "true") {
        await ModuleEscalation.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              IsReviewer: false,
              IsStakeHolder: true,
              ModuleTypeID,
              DocumentID,
              ContentID,
              DocumentModuleDraftID:
                existingDocumentModuleDraft.DocumentModuleDraftID,
            },
            transaction: t,
          }
        );
      }

      if (FileUrl) {
        const incomingFile = path.posix.join(FileUrl);
        const incomingFileExtension = helper.getFileExtension(incomingFile);

        const oldFile = path.posix.join(
          existingDocumentModuleDraft.DocumentPath
        );

        if (!fs.existsSync(oldFile)) {
          await t.rollback();
          return res
            .status(404)
            .json({ message: "InProgress file doesn't exist" });
        }

        //start create versioning of document
        const incomingFileFullPath = path.posix.join(
          basePath,
          path.basename(incomingFile)
        );

        if (!fs.existsSync(incomingFileFullPath)) {
          await t.rollback();
          return res
            .status(404)
            .json({ message: "Uploaded file is corrupt, Please re-upload" });
        }

        const incomingFileContent = fs.readFileSync(incomingFileFullPath);
        newFilePathForDraft = path.posix.join(
          basePath,
          `${newDocumentModuleDraft.DocumentModuleDraftID}${incomingFileExtension}`
        );
        fs.writeFileSync(newFilePathForDraft, incomingFileContent);

        await DocumentModuleDraft.update(
          { DocumentPath: newFilePathForDraft },
          {
            where: {
              ModuleTypeID,
              DocumentModuleDraftID:
                newDocumentModuleDraft.DocumentModuleDraftID,
              DocumentID,
              ContentID,
            },
            transaction: t,
          }
        );
        //end create versioning of document

        // for Document module id
        const updatedPath = path.posix.join(
          basePath,
          `${DocumentID}${incomingFileExtension}`
        );
        fs.writeFileSync(updatedPath, incomingFileContent);
        newFilePathTemp = updatedPath;

        if (SelfApproved === "true") {
          await DocumentModule.update(
            { DocumentPath: updatedPath },
            {
              where: {
                ModuleTypeID,
                DocumentID,
                ContentID,
              },
              transaction: t,
            }
          );
        }
      }
    } else {
      const createdDocumentModule = await DocumentModule.create(
        {
          ElementAttributeTypeID,
          ModuleTypeID,
          DocumentName,
          DocumentDescription,
          DocumentIsActive,
          DocumentTags,
          ContentID,
          SelfApproved,
          ReadingTimeValue: ReadingTimeValue || null,
          ReadingTimeUnit: ReadingTimeUnit || null,
          DocumentStatus: SelfApproved === "true" ? "Published" : "InProgress",
          MasterVersion: SelfApproved === "true" ? "1.0" : null,
          CreatedBy: currentUserId,
          DocumentExpiry,
          NeedAcceptance,
          NeedAcceptanceFromStakeHolder,
          NeedAcceptanceForApprover,
        },
        { transaction: t }
      );
      documentIDForSync = createdDocumentModule.DocumentID;

      const createdDocumentModuleDraft = await DocumentModuleDraft.create(
        {
          ElementAttributeTypeID,
          ModuleTypeID,
          DocumentID: createdDocumentModule.DocumentID,
          DocumentName,
          DocumentDescription,
          DocumentIsActive,
          DocumentTags,
          DraftVersion: "0.1",
          ReadingTimeValue: ReadingTimeValue || null,
          ReadingTimeUnit: ReadingTimeUnit || null,
          DocumentStatus: SelfApproved === "true" ? "Published" : "InProgress",
          MasterVersion: SelfApproved === "true" ? "1.0" : null,
          ContentID,
          SelfApproved,
          CreatedBy: currentUserId,
          DocumentExpiry,
          NeedAcceptance,
          NeedAcceptanceFromStakeHolder,
          NeedAcceptanceForApprover,
        },
        { transaction: t }
      );
      moduleDetails = {
        DocumentID: createdDocumentModule.DocumentID,
        DocumentName,
      };
      draftDetails = {
        DocumentModuleDraftID: createdDocumentModuleDraft.DocumentModuleDraftID,
        DocumentName,
      };
      await RiskAndCompliences.create(
        {
          DocumentID: createdDocumentModule.DocumentID,
          DocumentModuleDraftID:
            createdDocumentModuleDraft.DocumentModuleDraftID,
          DraftVersion: "0.1",
          MasterVersion: SelfApproved === "true" ? "1.0" : null,
          NoOfRisk: RiskDetailsArrays.length,
          NoOfCompliance: ComplianceDetailsArrays.length,
          NoOfClause: ClauseDetailsArrays.length,
          RiskDetailsArrays,
          ComplianceDetailsArrays,
          ClauseDetailsArrays,
          RiskPropertiesDetails,
          CompliancePropertiesDetails,
          ClausePropertiesDetails,
          CreatedBy: currentUserId,
        },
        { transaction: t }
      );
      if (DocumentOwner && DocumentOwner.length > 0) {
        const ownerData = DocumentOwner.map((userId) => {
          return {
            ModuleTypeID,
            DocumentID: createdDocumentModule.DocumentID,
            ContentID,
            DocumentModuleDraftID:
              createdDocumentModuleDraft.DocumentModuleDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleOwner.bulkCreate(ownerData, { transaction: t });
      }

      const incomingFile = path.posix.join(FileUrl);
      const incomingFileExtension = helper.getFileExtension(incomingFile);
      const incomingFileFullPath = path.posix.join(
        basePath,
        path.basename(incomingFile)
      );

      if (!fs.existsSync(incomingFileFullPath)) {
        await t.rollback();
        return res
          .status(404)
          .json({ message: "Uploaded file is corrupt, Please re-upload" });
      }

      //start create versioning of document
      const incomingFileContent = fs.readFileSync(incomingFileFullPath);
      newFilePathForDraft = path.posix.join(
        basePath,
        `${createdDocumentModuleDraft.DocumentModuleDraftID}${incomingFileExtension}`
      );
      fs.writeFileSync(newFilePathForDraft, incomingFileContent);
      //end create versioning of document

      // creating for Document module
      const newPath = path.posix.join(
        basePath,
        `${createdDocumentModule.DocumentID}${incomingFileExtension}`
      );
      fs.writeFileSync(newPath, incomingFileContent);
      newFilePathTemp = newPath;

      await Promise.all([
        DocumentModuleDraft.update(
          { DocumentPath: newFilePathForDraft },
          {
            where: {
              ModuleTypeID,
              ContentID,
              DocumentModuleDraftID:
                createdDocumentModuleDraft.DocumentModuleDraftID,
              DocumentID: createdDocumentModule.DocumentID,
            },
            transaction: t,
          }
        ),
        DocumentModule.update(
          { DocumentPath: newPath },
          {
            where: {
              ModuleTypeID,
              ContentID,
              DocumentID: createdDocumentModule.DocumentID,
            },
            transaction: t,
          }
        ),
      ]);
      // end creating files

      if (SelfApproved === "false" && Checker && Checker.length > 0) {
        const checkerData = Checker.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            DocumentModuleDraftID:
              createdDocumentModuleDraft.DocumentModuleDraftID,
            DocumentID: createdDocumentModule.DocumentID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleChecker.bulkCreate(checkerData, { transaction: t });
        sentModuleBulkEmail(checkerData, "Checker");
      }

      if (SelfApproved === "false" && Approver && Approver.length > 0) {
        const approverData = Approver.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            DocumentModuleDraftID:
              createdDocumentModuleDraft.DocumentModuleDraftID,
            DocumentID: createdDocumentModule.DocumentID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleApprover.bulkCreate(approverData, { transaction: t });
      }

      if (SelfApproved === "false" && StakeHolder && StakeHolder?.length > 0) {
        const stakeHolderData = StakeHolder.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            DocumentModuleDraftID:
              createdDocumentModuleDraft.DocumentModuleDraftID,
            DocumentID: createdDocumentModule.DocumentID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleStakeHolder.bulkCreate(stakeHolderData, { transaction: t });
        sentModuleBulkEmail(stakeHolderData, "StakeHolder");
      }

      if (
        SelfApproved === "false" &&
        EscalationPerson &&
        EscalationPerson.length > 0
      ) {
        const escalationData = EscalationPerson.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            DocumentModuleDraftID:
              createdDocumentModuleDraft.DocumentModuleDraftID,
            DocumentID: createdDocumentModule.DocumentID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleEscalation.bulkCreate(escalationData, { transaction: t });
      }
      if (
        SelfApproved === "false" &&
        StakeHolderEscalationPerson &&
        StakeHolderEscalationPerson.length > 0
      ) {
        const escalationData = StakeHolderEscalationPerson.map((userId) => {
          return {
            IsReviewer: false,
            IsStakeHolder: true,
            ModuleTypeID,
            ContentID,
            DocumentModuleDraftID:
              createdDocumentModuleDraft.DocumentModuleDraftID,
            DocumentID: createdDocumentModule.DocumentID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleEscalation.bulkCreate(escalationData, { transaction: t });
      }

      if (SelfApproved === "false") {
        await DocumentModule.update(
          {
            EscalationType,
            EscalationAfter,
            StakeHolderEscalationType,
            StakeHolderEscalationAfter,
          },
          {
            where: {
              ModuleTypeID,
              ContentID,
              DocumentID: createdDocumentModule.DocumentID,
            },
            transaction: t,
          }
        );
        await DocumentModuleDraft.update(
          {
            EscalationType,
            EscalationAfter,
            StakeHolderEscalationType,
            StakeHolderEscalationAfter,
          },
          {
            where: {
              ModuleTypeID,
              ContentID,
              DocumentModuleDraftID:
                createdDocumentModuleDraft.DocumentModuleDraftID,
              DocumentID: createdDocumentModule.DocumentID,
            },
            transaction: t,
          }
        );
      }
    }
    const notififactionBulk = [];
    if (SelfApproved == "true") {
      const modulelinks = await UserModuleLink.findAll({
        where: {
          ModuleID: moduleDetails.DocumentID,
          StartDate: {
            [Op.lte]: literal("CURRENT_TIMESTAMP"),
          },
          DueDate: {
            [Op.gte]: literal("CURRENT_TIMESTAMP"),
          },
        },
        attributes: ["UserID"],
      });
      for (const el of JSON.parse(JSON.stringify(modulelinks))) {
        assignUsers.push(el.UserID);
      }
      const notificationStatus = await Notification.findAll({
        where: {
          UserID: [...assignMaker, ...assignUsers],
          NotificationTypeForPublish: ["push", "both"],
        },
        attributes: ["UserID", "NotificationTypeForPublish"],
      });

      for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
        for (const UserID of assignMaker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Module Owner",
              NotificationType: "update",
              LinkedType: "Document",
              LinkedID: moduleDetails.DocumentID,
              CreatedBy: currentUserId,
            });
          }
        }
        for (const UserID of assignUsers) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Updated Element assign version is published",
              NotificationType: "assignment",
              LinkedType: "Document",
              LinkedID: moduleDetails.DocumentID,
              CreatedBy: currentUserId,
            });
          }
        }
      }
    } else {
      const notificationStatus = await Notification.findAll({
        where: {
          UserID: [...assignMaker, ...assignChecker, ...assignStakeHolder],
          NotificationTypeForAction: ["push", "both"],
        },
        attributes: ["UserID", "NotificationTypeForAction"],
      });
      for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
        for (const UserID of assignMaker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Module InProgress Owner",
              NotificationType: "update",
              LinkedType: "Document",
              LinkedID: draftDetails.DocumentModuleDraftID,
              CreatedBy: currentUserId,
            });
          }
        }
        for (const UserID of assignChecker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Checker",
              NotificationType: "actionable",
              LinkedType: "Document",
              LinkedID: draftDetails.DocumentModuleDraftID,
              CreatedBy: currentUserId,
            });
          }
        }
        for (const UserID of assignStakeHolder) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Stakeholder",
              NotificationType: "actionable",
              LinkedType: "Document",
              LinkedID: draftDetails.DocumentModuleDraftID,
              CreatedBy: currentUserId,
            });
          }
        }
      }
    }
    // for (const el of notififactionBulk) {
    //   await UserNotification.create(el);
    // }

    if (notififactionBulk.length > 0) {
      await UserNotification.bulkCreate(notififactionBulk, {
        ignoreDuplicates: true,
        transaction: t,
      });
      await sendNotification(notififactionBulk);
    }

    const usersToNotify = [
      ...assignMaker,
      ...assignChecker,
      ...assignStakeHolder,
    ];

    if (usersToNotify.length > 0) {
      notifyUsersAboutDocument(usersToNotify);
    }

    const userDetails = await UserDetails.findOne({
      where: { UserID: currentUserId, IsDeleted: false },
      attributes: ["DesktopFolderSyncPath"],
    });

    if (userDetails?.DesktopFolderSyncPath) {
      if (DocumentID && !isDocumentNameSame) {
        const hierarchy = await helper.getHierarchicalStructure(
          ContentID,
          "TOP_TO_BOTTOM"
        );

        hierarchy.push({
          ContentName: lastDocumentName,
        });

        const rootDir = userDetails?.DesktopFolderSyncPath;

        syncRenameCategory(currentUserId, {
          hierarchy,
          rootDir,
          newName: DocumentName,
        });
      }

      if (newFilePathTemp) {
        const hierarchy = await helper.getHierarchicalStructure(
          ContentID,
          "TOP_TO_BOTTOM"
        );

        hierarchy.push({
          ContentName: DocumentName,
        });

        const fileExtension = helper.getFileExtension(newFilePathTemp);

        const filePathForBuffer = path.join(
          basePath,
          `${documentIDForSync}${fileExtension}`
        );
        const buffer = fs.readFileSync(filePathForBuffer);

        const rootDir = userDetails?.DesktopFolderSyncPath;

        syncDocumentCreation(currentUserId, {
          hierarchy,
          rootDir,
          fileName: `${documentIDForSync}${fileExtension}`,
          buffer,
        });
      }

      await UserDetails.update(
        {
          LastSynced: new Date().toISOString(),
          ModifiedBy: currentUserId,
          ModifiedDate: new Date().toISOString(),
        },
        {
          where: {
            UserID: currentUserId,
          },
        }
      );
    }

    fs.readdirSync(basePath)
      .filter((file) => file.startsWith(currentUserId))
      .forEach((file) => {
        const filePath = path.join(basePath, file);
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          logger.error({
            message: err.message,
            details: err,
            UserID: currentUserId,
          });
        }
      });

    await t.commit();
    return res.status(201).json({
      message: "Document Module created successfully",
      DocumentID: documentIDForSync,
      DocumentName,
    });
  } catch (error) {
    console.log(error);
    await t.rollback();

    if (newFilePathForDraft) {
      try {
        if (fs.existsSync(newFilePathForDraft)) {
          fs.unlinkSync(newFilePathForDraft);
        }
      } catch (error) {
        logger.error({
          message: error.message,
          details: error,
          UserID: currentUserId,
        });
      }
    }
    if (newFilePathTemp) {
      try {
        const fileExtension = helper.getFileExtension(newFilePathTemp);
        if (fs.existsSync(newFilePathTemp)) {
          fs.renameSync(
            newFilePathTemp,
            path.posix.join(basePath, `${currentUserId}${fileExtension}`)
          );
        }
      } catch (error) {
        logger.error({
          message: error.message,
          details: error,
          UserID: currentUserId,
        });
      }
    }
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const createBulkDocumentModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, Documents = [] } = req.body;

  const { currentUserId } = req.payload;

  const basePath = path.posix.join(
    "src",
    "infrastructure",
    "media",
    "Document"
  );
  const baseBulkPath = path.posix.join(
    "src",
    "infrastructure",
    "media",
    "bulk"
  );
  const createdDocuments = [];

  try {
    const validationErrors = await validate(req, res, next);

    if (validationErrors.length > 0) {
      const sortedErrors = helper.sortByPrefixNumericIdentifier(
        validationErrors,
        "Document"
      );
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Validation failed", errors: sortedErrors });
    }

    const errors = [];
    const lastCategoryID = [];

    // validation logics start
    for (let i = 0; i < Documents.length; i++) {
      const document = Documents[i]; // Access the current document
      const categoryPath = document?.CategoryPath;
      const sourceFolderPath = document?.SourceFolder;
      const fileName = document?.FileName;
      const modifiedCategoryPath = categoryPath.replace("Document/", "");

      // const finalFilePath = path.posix.join(baseBulkPath, fileName);
      const finalFilePath = path.posix.join(
        baseBulkPath,
        sourceFolderPath,
        fileName
      );

      if (!fs.existsSync(finalFilePath)) {
        errors.push(
          `Document ${
            i + 1
          }: (Source folder path --> '${sourceFolderPath}/${fileName}') File not found`
        );
      }

      // Await the result of the async function
      const categoryPathResultQuery = helper.checkFolderHierarchy(
        modifiedCategoryPath,
        ModuleTypeID
      );

      // const [categoryPathResult, sourceFolderPathResult] = await Promise.all([
      //   categoryPathResultQuery,
      //   sourceFolderPathResultQuery,
      // ]);

      const [categoryPathResult] = await Promise.all([categoryPathResultQuery]);

      if (categoryPathResult?.error) {
        errors.push(
          `Document ${i + 1}: (Content hierarchy path --> '${categoryPath}') ${
            categoryPathResult.message
          }`
        );
      } else {
        lastCategoryID.push(categoryPathResult?.data?.ContentID);
      }

      // if (sourceFolderPathResult?.error) {
      //   errors.push(
      //     `Document ${i + 1}: (Source folder path --> '${sourceFolderPath}') ${
      //       sourceFolderPathResult.message
      //     }`
      //   );
      // }

      // if (!fs.existsSync(finalFilePath)) {
      //   errors.push(
      //     `Document ${
      //       i + 1
      //     }: (Source folder path --> '${sourceFolderPath}/${fileName}') File not found`
      //   );
    }

    // Check if the document already exists in the folder
    const existingDocumentsInFolder = await DocumentModule.findAll({
      where: {
        ModuleTypeID,
        ContentID: lastCategoryID,
        IsDeleted: false,
      },
      attributes: ["DocumentName"],
    });

    const existingDocumentNames = new Set(
      existingDocumentsInFolder.map((document) =>
        document.toJSON().DocumentName.toLowerCase()
      )
    );

    Documents.forEach((document, index) => {
      // Directly check if the document name exists in the Set
      const existingDocument = existingDocumentNames.has(
        document.DocumentName.toLowerCase()
      );

      if (existingDocument) {
        errors.push(
          `Document ${index + 1}: '${
            document.DocumentName
          }' already exists in the hierarchy`
        );
      }
    });

    // validation logics end

    // error segregation logics start
    if (errors.length > 0) {
      const sortedErrors = helper.sortByPrefixNumericIdentifier(
        errors,
        "Document"
      );
      logger.error({
        message: "Validation failed",
        errors: sortedErrors,
        currentUserId,
      });
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Validation failed", errors: sortedErrors });
    }
    // error segregation logics end

    if (lastCategoryID.length !== Documents.length) {
      await t.rollback();
      return res.status(400).json({
        message: "Content hierarchy path not found for some document",
      });
    }

    // Document creation logics start
    const bulkDocument = Documents.map((document, index) => {
      const ContentId = lastCategoryID[index];
      const formattedDate = document?.DocumentExpiry
        ? moment(document.DocumentExpiry, "DD-MM-YYYY").format("YYYY-MM-DD")
        : null;

      return {
        ModuleTypeID,
        ContentID: ContentId,
        DocumentName: document.DocumentName,
        DocumentDescription: document.DocumentDescription,
        DocumentExpiry: formattedDate,
        DocumentStatus: "Published",
        DocumentIsActive: true,
        SelfApproved: true,
        DraftVersion: "0.1",
        MasterVersion: "1.0",
        NeedAcceptance: false,
        CreatedBy: currentUserId,
      };
    });

    const documentChunk = helper.chunkArray(bulkDocument, 300);
    for (const el of documentChunk) {
      const docs = await DocumentModule.bulkCreate(el, {
        transaction: t,
        returning: true,
      });
      createdDocuments.push(...docs);
    }

    const bulkDocumentDraft = Documents.map((document, index) => {
      const createdDocumentID = createdDocuments[index].toJSON().DocumentID;
      const ContentId = lastCategoryID[index];
      const formattedDate = document?.DocumentExpiry
        ? moment(document.DocumentExpiry, "DD-MM-YYYY").format("YYYY-MM-DD")
        : null;

      return {
        DocumentID: createdDocumentID,
        ModuleTypeID,
        ContentID: ContentId,
        DocumentName: document.DocumentName,
        DocumentDescription: document.DocumentDescription,
        DocumentExpiry: formattedDate,
        DocumentStatus: "Published",
        DocumentIsActive: true,
        SelfApproved: true,
        DraftVersion: "0.1",
        MasterVersion: "1.0",
        NeedAcceptance: false,
        CreatedBy: currentUserId,
      };
    });

    const createdDocumentDrafts = [];
    const documentDraftChunk = helper.chunkArray(bulkDocumentDraft, 300);
    for (const el of documentDraftChunk) {
      const drafts = await DocumentModuleDraft.bulkCreate(el, {
        transaction: t,
        returning: true,
      });
      createdDocumentDrafts.push(...drafts);
    }

    const owners = [];
    const documentPathUpdatePromises = [];
    for (let i = 0; i < Documents.length; i++) {
      const createdDocumentID = createdDocuments[i].toJSON().DocumentID;
      const createdDocumentDraftID =
        createdDocumentDrafts[i].toJSON().DocumentModuleDraftID;
      const ContentId = lastCategoryID[i];
      const documentOwner = Documents[i]?.DocumentOwner;

      if (documentOwner && documentOwner.length > 0) {
        const ownerData = documentOwner.map((userId) => {
          return {
            ModuleTypeID,
            DocumentID: createdDocumentID,
            DocumentModuleDraftID: createdDocumentDraftID,
            ContentID: ContentId,
            UserID: userId,
            CreatedBy: currentUserId,
          };
        });
        owners.push(...ownerData);
      }

      const sourceFolderPath = Documents[i]?.SourceFolder;
      const fileName = Documents[i].FileName;
      const existingFile = path.posix.join(
        baseBulkPath,
        sourceFolderPath,
        fileName
      );

      const fileExtension = helper.getFileExtension(existingFile);

      const newPath = path.posix.join(
        basePath,
        `${createdDocumentID}${fileExtension}`
      );

      if (fs.existsSync(existingFile)) {
        fs.copyFileSync(existingFile, newPath);
      } else {
        throw new Error(
          `Document ${
            i + 1
          }: (Source folder path --> '${sourceFolderPath}/${fileName}') File not found`
        );
      }

      documentPathUpdatePromises.push(
        DocumentModule.update(
          { DocumentPath: newPath },
          {
            where: {
              ModuleTypeID,
              ContentID: ContentId,
              DocumentID: createdDocumentID,
            },
            transaction: t,
          }
        ),
        DocumentModuleDraft.update(
          { DocumentPath: newPath },
          {
            where: {
              ModuleTypeID,
              ContentID: ContentId,
              DocumentModuleDraftID: createdDocumentDraftID,
              DocumentID: createdDocumentID,
            },
            transaction: t,
          }
        )
      );
    }

    if (owners.length > 0) {
      const chunk = helper.chunkArray(owners, 300);
      for (const el of chunk) {
        await ModuleOwner.bulkCreate(el, { transaction: t });
      }
    }

    if (documentPathUpdatePromises.length > 0) {
      const chunk = helper.chunkArray(documentPathUpdatePromises, 300);
      for (const el of chunk) {
        await Promise.all(el);
      }
    }

    await t.commit();
    return res.status(201).json({ message: "Document created successfully" });
  } catch (error) {
    console.log(error);
    await t.rollback();

    try {
      if (createdDocuments.length > 0) {
        createdDocuments.forEach((doc) => {
          helper.deleteFileByBaseNameSync(doc.toJSON().DocumentID, basePath);
        });
      }
    } catch (error) {
      logger.error({
        message: error.message,
        details: error,
        UserID: currentUserId,
      });
    }

    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });

    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const publishDocumentModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const {
    ModuleTypeID,
    DocumentID,
    ContentID,
    AuthorizedToPublish = "",
  } = req.body;
  const { currentUserId } = req.payload;

  const basePath = path.posix.join(
    "src",
    "infrastructure",
    "media",
    "Document"
  );

  const newDocumentModule = {
    path: null,
    buffer: null,
  };

  const draftModule = {
    path: null,
    buffer: null,
  };

  try {
    let documentModule = await DocumentModule.findOne({
      where: { ModuleTypeID, DocumentID, ContentID, IsDeleted: false },
      attributes: ["DocumentPath"],
      transaction: t,
    });

    let existingDocumentModuleDraft = await DocumentModuleDraft.findOne({
      where: { ModuleTypeID, DocumentID, ContentID, IsDeleted: false },
      order: [["CreatedDate", "DESC"]], // Order by the creation date to get the last record
      transaction: t,
    });

    if (!existingDocumentModuleDraft || !documentModule) {
      await t.rollback();
      return res.status(404).json({ message: "Document not found" });
    }

    existingDocumentModuleDraft = existingDocumentModuleDraft.toJSON();
    documentModule = documentModule.toJSON();

    const isUserPermissibleToDelete =
      AuthorizedToPublish === "true"
        ? true
        : await checkUserPermission(
            DocumentModuleDraft,
            ModuleTypeID,
            ContentID,
            "DocumentID",
            DocumentID,
            "DocumentModuleDraftID",
            existingDocumentModuleDraft.DocumentModuleDraftID,
            currentUserId,
            t
          );

    if (!isUserPermissibleToDelete) {
      await t.rollback();
      return res.status(403).json({ message: "You are unathorized publish" });
    }

    const parsedDraftVersion = parseFloat(
      existingDocumentModuleDraft.DraftVersion
    );

    const latestMasterVersion = Math.ceil(parsedDraftVersion).toFixed(1);

    await Promise.all([
      RiskAndCompliences.update(
        {
          DraftVersion: existingDocumentModuleDraft.DraftVersion,
          MasterVersion: latestMasterVersion,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: {
            DocumentModuleDraftID:
              existingDocumentModuleDraft.DocumentModuleDraftID,
          },
        },
        { transaction: t }
      ),
      DocumentModule.update(
        {
          ElementAttributeTypeID:
            existingDocumentModuleDraft.ElementAttributeTypeID,
          DocumentName: existingDocumentModuleDraft.DocumentName,
          DocumentDescription: existingDocumentModuleDraft.DocumentDescription,
          DocumentStatus: "Published",
          DocumentIsActive: existingDocumentModuleDraft.DocumentIsActive,
          DocumentTags: existingDocumentModuleDraft.DocumentTags,
          EscalationType: existingDocumentModuleDraft.EscalationType,
          EscalationAfter: existingDocumentModuleDraft.EscalationAfter,
          StakeHolderEscalationType:
            existingDocumentModuleDraft.StakeHolderEscalationType,
          StakeHolderEscalationAfter:
            existingDocumentModuleDraft.EscalationAfter,
          SelfApproved: existingDocumentModuleDraft.SelfApproved,
          DraftVersion: existingDocumentModuleDraft.DraftVersion,
          MasterVersion: latestMasterVersion,
          DocumentExpiry: existingDocumentModuleDraft.DocumentExpiry,
          NeedAcceptance: existingDocumentModuleDraft.NeedAcceptance,
          ReadingTimeValue:
            existingDocumentModuleDraft.ReadingTimeValue || null,
          ReadingTimeUnit: existingDocumentModuleDraft.ReadingTimeUnit || null,
          NeedAcceptanceFromStakeHolder:
            existingDocumentModuleDraft.NeedAcceptanceFromStakeHolder,
          NeedAcceptanceForApprover:
            existingDocumentModuleDraft.NeedAcceptanceForApprover,
          TemplateFontFamaly: existingDocumentModuleDraft.TemplateFontFamaly,
          TemplateFontSize: existingDocumentModuleDraft.TemplateFontSize,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
          CoOwnerUserID: existingDocumentModuleDraft.CoOwnerUserID,
        },
        { where: { ModuleTypeID, DocumentID, ContentID }, transaction: t }
      ),
      DocumentModuleDraft.update(
        {
          DocumentStatus: "Published",
          MasterVersion: latestMasterVersion,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: {
            ModuleTypeID,
            DocumentModuleDraftID:
              existingDocumentModuleDraft.DocumentModuleDraftID,
            DocumentID,
            ContentID,
          },
          transaction: t,
        }
      ),
    ]);

    // start of updating document path
    //document module path to revert back if any error occurs
    const documentModulePath = documentModule?.DocumentPath;
    if (documentModulePath && fs.existsSync(documentModulePath)) {
      const documentModulePathExtension =
        helper.getFileExtension(documentModulePath);
      const documentModuleFullPath = path.posix.join(
        basePath,
        `${DocumentID}${documentModulePathExtension}`
      );
      if (!fs.existsSync(documentModuleFullPath)) {
        await t.rollback();
        return res
          .status(404)
          .json({ message: "Document full path file doesn't exist" });
      }
      const documentContentBuffer = fs.readFileSync(documentModuleFullPath);
      newDocumentModule.path = documentModuleFullPath;
      newDocumentModule.buffer = documentContentBuffer;
    } else {
      await t.rollback();
      return res.status(404).json({ message: "Document file doesn't exist" });
    }

    //latest draft path to replace with document module path for publish
    const draftFilePath = existingDocumentModuleDraft?.DocumentPath;
    if (!draftFilePath || !fs.existsSync(draftFilePath)) {
      await t.rollback();
      return res.status(404).json({ message: "InProgress file doesn't exist" });
    }
    const draftFileExtension = helper.getFileExtension(draftFilePath);
    const draftFileContentBuffer = fs.readFileSync(draftFilePath);
    const newFilePath = path.posix.join(
      basePath,
      `${DocumentID}${draftFileExtension}`
    );
    fs.writeFileSync(newFilePath, draftFileContentBuffer);
    draftModule.path = newFilePath;
    draftModule.buffer = draftFileContentBuffer;
    if (newFilePath.includes(".pdf")) {
      await DocumentModule.update(
        {
          DocumentPath: newFilePath,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, DocumentID, ContentID }, transaction: t }
      );
    }
    // end of updating document path

    const modulelinks = await UserModuleLink.findAll({
      where: {
        ModuleID: DocumentID,
        StartDate: {
          [Op.lte]: literal("CURRENT_TIMESTAMP"),
        },
        DueDate: {
          [Op.gte]: literal("CURRENT_TIMESTAMP"),
        },
      },
      attributes: ["UserID"],
    });
    const assignUsers = [],
      notififactionBulk = [];
    for (const el of JSON.parse(JSON.stringify(modulelinks))) {
      assignUsers.push(el.UserID);
    }
    const notificationStatus = await Notification.findAll({
      where: {
        UserID: assignUsers,
        NotificationTypeForPublish: ["push", "both"],
      },
      attributes: ["UserID", "NotificationTypeForPublish"],
    });
    for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
      for (const UserID of assignUsers) {
        if (UserID == el.UserID) {
          notififactionBulk.push({
            UserID: el.UserID,
            Message: "Updated Element assign version is published",
            NotificationType: "assignment",
            LinkedType: "Document",
            LinkedID: DocumentID,
            CreatedBy: currentUserId,
          });
        }
      }
    }

    // for (const el of notififactionBulk) {
    //   await UserNotification.create(el);
    // }
    // await sendNotification(notififactionBulk);

    if (notififactionBulk.length > 0) {
      await UserNotification.bulkCreate(notififactionBulk, {
        ignoreDuplicates: true,
        transaction: t,
      });
      await sendNotification(notififactionBulk);
    }

    await t.commit();
    return res
      .status(200)
      .json({ message: "Document Module Status updated successfully" });
  } catch (error) {
    await t.rollback();

    if (draftModule.path) {
      try {
        if (fs.existsSync(newDocumentModule.path)) {
          fs.writeFileSync(newDocumentModule.path, newDocumentModule.buffer);
        }
        fs.unlinkSync(draftModule.path);
      } catch (error) {
        logger.error({
          message: error.message,
          details: error,
          UserID: currentUserId,
        });
      }
    }

    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const viewDocumentModuleDraft = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID, DocumentID } = req.body;

  try {
    const documentDraft = await DocumentModuleDraft.findOne({
      where: { ModuleTypeID, DocumentID, ContentID, IsDeleted: false },
      include: [
        {
          model: ModuleChecker,
          as: "Checkers",
          required: false, // This ensures DocumentModuleDraft is returned even if ModuleChecker doesn't exist
          where: {
            IsDeleted: false, // Include only if not deleted
          },
          attributes: ["UserID", "ApprovalStatus"],
        },
        {
          model: ModuleStakeHolder,
          as: "StakeHolders",
          required: false, // This ensures DocumentModuleDraft is returned even if ModuleStakeHolder doesn't exist
          where: {
            IsDeleted: false, // Include only if not deleted
          },
          attributes: ["UserID", "ApprovalStatus"],
        },
        {
          model: ModuleEscalation,
          as: "EscalationPersons",
          required: false, // This ensures DocumentModuleDraft is returned even if ModuleEscalation doesn't exist
          where: {
            IsDeleted: false, // Include only if not deleted
          },
          attributes: [
            "UserID",
            "IsReviewer",
            "IsStakeHolder",
            "ApprovalStatus",
          ],
        },
        {
          model: ModuleOwner,
          as: "ModuleOwners",
          required: false,
          where: {
            IsDeleted: false,
          },
          attributes: ["UserID"],
        },
        {
          model: ModuleApprover,
          as: "Approvers",
          required: false,
          where: {
            IsDeleted: false,
          },
          attributes: ["UserID", "ApprovalStatus"],
        },
        {
          model: RiskAndCompliences,
          required: false,
        },
      ],
      order: [["CreatedDate", "DESC"]],
      transaction: t,
    });

    if (!documentDraft) {
      await t.rollback();
      return res.status(404).json({ message: "Document not found" });
    }
    const jsonDocDraft = JSON.parse(JSON.stringify(documentDraft));
    if (jsonDocDraft?.DocumentStatus === "InProgress") {
      const data = await sequelize.query(
        `
        SELECT
              JSONB_AGG(
              DISTINCT JSONB_BUILD_OBJECT('UserID', S."UserID", 'ApprovalStatus', CASE WHEN S."DocumentModuleDraftID" = :DocumentModuleDraftID THEN  S."ApprovalStatus" ELSE NULL END)
              ) FILTER (
                WHERE
                  S."UserID" IS NOT NULL
              ) AS "SC",
              JSONB_AGG(
                DISTINCT JSONB_BUILD_OBJECT('UserID', C."UserID", 'ApprovalStatus', CASE WHEN C."DocumentModuleDraftID" = :DocumentModuleDraftID THEN  C."ApprovalStatus" ELSE NULL END)
              ) FILTER (
                WHERE
                  C."UserID" IS NOT NULL
              ) AS "MC",
              JSONB_AGG(
                DISTINCT JSONB_BUILD_OBJECT(
                  'UserID',
                  E."UserID",
                  'IsReviewer',
                  E."IsReviewer",
                  'IsStakeHolder',
                  E."IsStakeHolder",
                  'ApprovalStatus',
                  CASE WHEN E."DocumentModuleDraftID" = :DocumentModuleDraftID THEN  E."ApprovalStatus" ELSE NULL END
                )
              ) FILTER (
                WHERE
                  E."UserID" IS NOT NULL
              ) AS "ME",
              JSONB_AGG(
                DISTINCT JSONB_BUILD_OBJECT('UserID', A."UserID", 'ApprovalStatus', CASE WHEN A."DocumentModuleDraftID" = :DocumentModuleDraftID THEN  A."ApprovalStatus" ELSE NULL END)
              ) FILTER (
                WHERE
                  A."UserID" IS NOT NULL
              ) AS "MA"
            FROM
              "DocumentModuleDrafts" D
              LEFT JOIN "ModuleStakeHolders" S ON S."DocumentModuleDraftID" = D."DocumentModuleDraftID"
              LEFT JOIN "ModuleCheckers" C ON C."DocumentModuleDraftID" = D."DocumentModuleDraftID"
              LEFT JOIN "ModuleEscalations" E ON E."DocumentModuleDraftID" = D."DocumentModuleDraftID"
              LEFT JOIN "ModuleApprovers" A ON A."DocumentModuleDraftID" = D."DocumentModuleDraftID"
            WHERE
              D."DocumentID" = :DocumentID
              AND D."MasterVersion" ${
                jsonDocDraft?.MasterVersion
                  ? `= '${jsonDocDraft?.MasterVersion}'`
                  : "IS NULL"
              }; 
        `,
        {
          type: QueryTypes.SELECT,
          transaction: t,
          replacements: {
            DocumentID: jsonDocDraft?.DocumentID,
            DocumentModuleDraftID: jsonDocDraft?.DocumentModuleDraftID,
          },
        }
      );
      const uniqueData = (values) => {
        return Object.values(
          values.reduce((acc, item) => {
            const existing = acc[item.UserID];
            if (!existing) {
              acc[item.UserID] = item;
            } else if (!existing.ApprovalStatus && item.ApprovalStatus) {
              acc[item.UserID] = item;
            }
            return acc;
          }, {})
        );
      };
      if (data && data.length > 0) {
        jsonDocDraft.StakeHolders = uniqueData(data[0].SC || []);
        jsonDocDraft.Checkers = uniqueData(data[0].MC || []);
        jsonDocDraft.EscalationPersons = uniqueData(data[0].ME || []);
        jsonDocDraft.Approvers = uniqueData(data[0].MA || []);
      }
    }
    await t.commit();
    // const documentFilename = path.basename(documentDraft.DocumentPath);
    return res.status(200).json({
      message: "Document fetched successfully",
      data: {
        documentDraft: {
          ...jsonDocDraft,
          DocumentPath: path.posix.join(
            "file/d/",
            `${path.basename(jsonDocDraft.DocumentPath)}`
          ),
          // DocumentPath: `${req.protocol}://${req.get("host")}/file/d/${documentFilename}`,
        },
      },
    });
  } catch (error) {
    console.log("error", error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const listDocumentModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID } = req.body;

  try {
    const documentList = await DocumentModuleDraft.findAll({
      where: {
        ModuleTypeID,
        ContentID,
        IsDeleted: false,
      },
      attributes: [
        "DocumentID",
        "DocumentName",
        "DraftVersion",
        "MasterVersion",
        "CreatedDate",
      ],
      where: {
        [Op.and]: [
          { ModuleTypeID },
          { ContentID },
          { IsDeleted: false },
          Sequelize.literal(`
        "CreatedDate" = (
          SELECT MAX("CreatedDate") 
          FROM "DocumentModuleDrafts" AS "sub" 
          WHERE 
            "sub"."DocumentID" = "DocumentModuleDraft"."DocumentID" 
            AND "sub"."IsDeleted" = false
        )
      `),
        ],
      },
      order: [["CreatedDate", "DESC"]],
      transaction: t,
    });

    await t.commit();
    return res.status(200).json({
      message: "Documents list fetched successfully",
      data: {
        documentList,
      },
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const deleteDocumentModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID, DocumentID } = req.body;
  const { currentUserId } = req.payload;

  try {
    const existingDocumentModuleDraft = await DocumentModuleDraft.findOne({
      where: { ModuleTypeID, DocumentID, ContentID },
      order: [["CreatedDate", "DESC"]],
      transaction: t,
    });

    if (!existingDocumentModuleDraft) {
      await t.rollback();
      return res.status(404).json({ message: "Document not found" });
    }

    const isUserPermissibleToDelete = await checkUserPermission(
      DocumentModuleDraft,
      ModuleTypeID,
      ContentID,
      "DocumentID",
      DocumentID,
      "DocumentModuleDraftID",
      existingDocumentModuleDraft.DocumentModuleDraftID,
      currentUserId,
      t
    );

    if (!isUserPermissibleToDelete) {
      await t.rollback();
      return res.status(403).json({ message: "You are unathorized to delete" });
    }

    await Promise.all([
      DocumentModuleDraft.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, ContentID, DocumentID }, transaction: t }
      ),
      DocumentModule.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, ContentID, DocumentID }, transaction: t }
      ),
      ModuleChecker.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, DocumentID, ContentID }, transaction: t }
      ),
      ModuleApprover.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, DocumentID, ContentID }, transaction: t }
      ),
      ModuleEscalation.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, DocumentID, ContentID }, transaction: t }
      ),
      ModuleOwner.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, DocumentID, ContentID }, transaction: t }
      ),
    ]);

    const hierarchy = await helper.getHierarchicalStructure(
      ContentID,
      "TOP_TO_BOTTOM"
    );

    hierarchy.push({
      ContentName: existingDocumentModuleDraft.DocumentName,
    });

    const userDetails = await UserDetails.findOne({
      where: { UserID: currentUserId, IsDeleted: false },
      attributes: ["DesktopFolderSyncPath"],
    });

    if (userDetails?.DesktopFolderSyncPath) {
      const rootDir = userDetails?.DesktopFolderSyncPath;
      const fileName = path.basename(existingDocumentModuleDraft.DocumentPath);

      syncDocumentDeletion(currentUserId, {
        hierarchy,
        rootDir,
        fileName,
      });

      await UserDetails.update(
        {
          LastSynced: new Date().toISOString(),
          ModifiedBy: currentUserId,
          ModifiedDate: new Date().toISOString(),
        },
        {
          where: {
            UserID: currentUserId,
          },
        }
      );
    }

    await t.commit();
    return res.status(200).json({
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const updateDocumentStatus = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID, DocumentID, IsAccepted } = req.body;
  const { currentUserId } = req.payload;

  try {
    let existingDocumentModuleDraft = await sequelize.query(
      `
      WITH
          "UserLIsts" AS (
            SELECT
              "DocumentModuleDraftID",
              "UserID",
              'StakeHolder' AS "UserType"
            FROM
              "ModuleStakeHolders"
            UNION ALL
            SELECT
              "DocumentModuleDraftID",
              "UserID",
              CASE
                WHEN "IsStakeHolder" IS TRUE THEN 'StakeHolder'
                ELSE 'Reviewer'
              END AS "UserType"
            FROM
              "ModuleEscalations"
            UNION ALL
            SELECT
              "DocumentModuleDraftID",
              "UserID",
              'Reviewer' AS "UserType"
            FROM
              "ModuleCheckers"
            UNION ALL
            SELECT
              "DocumentModuleDraftID",
              "UserID",
              'Approver' AS "UserType"
            FROM
              "ModuleApprovers"
          )
        SELECT
          D."AcceptedByApprover",
          D."AcceptedByReviewer",
          D."AcceptedByStakeHolder",
          U."UserType"
        FROM
          "DocumentModuleDrafts" D
          LEFT JOIN "UserLIsts" U ON U."DocumentModuleDraftID" = D."DocumentModuleDraftID"
          AND U."UserID" =:UserID
        WHERE
          D."DocumentID" =:DocumentID
          AND D."ModuleTypeID" =:ModuleTypeID
          AND D."ContentID" =:ContentID
        ORDER BY
          D."CreatedDate" DESC
        LIMIT
          1;
      `,
      {
        type: QueryTypes.SELECT,
        replacements: {
          DocumentID,
          ModuleTypeID,
          ContentID,
          UserID: currentUserId,
        },
        transaction: t,
      }
    );

    if (
      !existingDocumentModuleDraft &&
      existingDocumentModuleDraft.length < 1
    ) {
      await t.rollback();
      return res.status(404).json({ message: "Document not found" });
    } else {
      existingDocumentModuleDraft = existingDocumentModuleDraft[0];
    }

    // If the document has already been accepted by someone, prevent further updates
    if (
      (existingDocumentModuleDraft.AcceptedByStakeHolder.length > 0 &&
        existingDocumentModuleDraft.UserType == "StakeHolder") ||
      (existingDocumentModuleDraft.AcceptedByReviewer.length > 0 &&
        existingDocumentModuleDraft.UserType == "Reviewer") ||
      (existingDocumentModuleDraft.AcceptedByApprover.length > 0 &&
        existingDocumentModuleDraft.UserType == "Approver")
    ) {
      await t.rollback();
      return res.status(403).json({
        message:
          "This document has already been accepted by another user. You cannot update it.",
      });
    }

    // Ensure the current user has not already accepted (even though this shouldn't happen)
    if (
      existingDocumentModuleDraft.AcceptedByStakeHolder.includes(
        currentUserId
      ) ||
      existingDocumentModuleDraft.AcceptedByReviewer.includes(currentUserId) ||
      existingDocumentModuleDraft.AcceptedByApprover.includes(currentUserId)
    ) {
      await t.rollback();
      return res.status(403).json({
        message:
          "You have already accepted this document. You cannot accept it again.",
      });
    }
    const payload = {};
    if (existingDocumentModuleDraft.UserType == "StakeHolder") {
      payload["AcceptedByStakeHolder"] = sequelize.literal(
        `CASE 
              WHEN array_length("AcceptedByStakeHolder", 1) IS NULL 
              THEN ARRAY[${sequelize.escape(currentUserId)}]::uuid[] 
              ELSE "AcceptedByStakeHolder" 
            END`
      );
    } else if (existingDocumentModuleDraft.UserType == "Reviewer") {
      payload["AcceptedByReviewer"] = sequelize.literal(
        `CASE 
              WHEN array_length("AcceptedByReviewer", 1) IS NULL 
              THEN ARRAY[${sequelize.escape(currentUserId)}]::uuid[] 
              ELSE "AcceptedByReviewer" 
            END`
      );
    } else if (existingDocumentModuleDraft.UserType == "Approver") {
      payload["AcceptedByApprover"] = sequelize.literal(
        `CASE 
              WHEN array_length("AcceptedByApprover", 1) IS NULL 
              THEN ARRAY[${sequelize.escape(currentUserId)}]::uuid[] 
              ELSE "AcceptedByApprover" 
            END`
      );
    }

    // Update document status and AcceptedBy field only if it's empty
    await Promise.all([
      DocumentModuleDraft.update(
        {
          ...payload,
        },
        { where: { ModuleTypeID, ContentID, DocumentID }, transaction: t }
      ),
      DocumentModule.update(
        {
          ...payload,
        },
        { where: { ModuleTypeID, ContentID, DocumentID }, transaction: t }
      ),
    ]);

    await t.commit();
    return res
      .status(200)
      .json({ message: "Document status updated successfully" });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

// Skill Building module
const createTrainingSimulationModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const {
    ModuleTypeID,
    ContentID = null,
    TrainingSimulationID = null,
    TrainingSimulationName,
    TrainingSimulationDescription,
    TrainingSimulationIsActive,
    TrainingSimulationTags,
    EscalationPerson,
    EscalationType,
    EscalationAfter,
    Checker,
    Approver,
    TrainingSimulationOwner,
    SelfApproved,
    TrainingSimulationExpiry = null,
    IsTrainingLinkIsVideo,
    NeedAcceptance = false,
    FileUrl,
  } = req.body;

  const { currentUserId } = req.payload;

  const basePath = path.posix.join(
    "src",
    "infrastructure",
    "media",
    "TrainingSimulation"
  );

  let newFilePathTemp;
  let existingTrainingSimulationPathDraft;
  let zipFilePath;

  try {
    const assignUsers = [],
      assignMaker = [
        ...JSON.parse(
          JSON.stringify(TrainingSimulationOwner ? TrainingSimulationOwner : [])
        ),
      ],
      assignChecker = [...JSON.parse(JSON.stringify(Checker ? Checker : []))],
      assignEscalation = [
        ...JSON.parse(JSON.stringify(EscalationPerson ? EscalationPerson : [])),
      ];
    let moduleDetails, draftDetails;
    if (TrainingSimulationID) {
      moduleDetails = { TrainingSimulationID, TrainingSimulationName };
      let existingTrainingSimulationDraft =
        await TrainingSimulationModuleDraft.findOne({
          where: { ModuleTypeID, TrainingSimulationID, ContentID },
          order: [["CreatedDate", "DESC"]],
          transaction: t,
        });

      if (!existingTrainingSimulationDraft) {
        await t.rollback();
        return res.status(404).json({ message: "Skill Building not found" });
      }

      existingTrainingSimulationDraft =
        existingTrainingSimulationDraft.toJSON();

      const isUserPermissibleToDelete = await checkUserPermission(
        TrainingSimulationModuleDraft,
        ModuleTypeID,
        ContentID,
        "TrainingSimulationID",
        TrainingSimulationID,
        "TrainingSimulationDraftID",
        existingTrainingSimulationDraft.TrainingSimulationDraftID,
        currentUserId,
        t
      );

      if (!isUserPermissibleToDelete) {
        await t.rollback();
        if (req?.file?.path) await helper.deleteFile(req?.file?.path);

        return res
          .status(403)
          .json({ message: "You are unathorized to edit or publish" });
      }

      let latestDraftVersion;
      let latestMasterVersion = null;
      if (SelfApproved === "true") {
        if (existingTrainingSimulationDraft.MasterVersion) {
          latestMasterVersion = (
            parseFloat(existingTrainingSimulationDraft.MasterVersion) + 1.0
          ).toFixed(1);
        } else {
          latestMasterVersion = Math.ceil(
            parseFloat(existingTrainingSimulationDraft.DraftVersion)
          ).toFixed(1);
        }

        latestDraftVersion = (parseFloat(latestMasterVersion) - 0.9).toFixed(1);
      } else {
        if (existingTrainingSimulationDraft.MasterVersion) {
          latestDraftVersion = (
            parseFloat(existingTrainingSimulationDraft.MasterVersion) + 0.1
          ).toFixed(1);
        } else {
          latestDraftVersion = (
            parseFloat(existingTrainingSimulationDraft.DraftVersion) + 0.1
          ).toFixed(1);
        }
      }

      const newTrainingSimulationDraft =
        await TrainingSimulationModuleDraft.create(
          {
            ModuleTypeID,
            TrainingSimulationID,
            ContentID,
            TrainingSimulationName,
            TrainingSimulationDescription,
            TrainingSimulationIsActive,
            TrainingSimulationStatus:
              SelfApproved === "true" ? "Published" : "InProgress",
            DraftVersion: latestDraftVersion.toString(),
            MasterVersion: SelfApproved === "true" ? latestMasterVersion : null,
            TrainingSimulationTags,
            DraftVersion: latestDraftVersion.toString(),
            SelfApproved,
            CreatedBy: currentUserId,
            TrainingSimulationExpiry,
            IsTrainingLinkIsVideo,
            NeedAcceptance,
          },
          { transaction: t }
        );
      draftDetails = {
        TrainingSimulationDraftID:
          existingTrainingSimulationDraft.TrainingSimulationDraftID,
        TrainingSimulationName,
      };
      if (SelfApproved === "true") {
        await TrainingSimulationModule.update(
          {
            TrainingSimulationName,
            TrainingSimulationDescription,
            TrainingSimulationIsActive,
            TrainingSimulationTags,
            SelfApproved,
            TrainingSimulationStatus: "Published",
            DraftVersion: latestDraftVersion.toString(),
            MasterVersion: latestMasterVersion,
            ModifiedBy: currentUserId,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
            TrainingSimulationExpiry,
            IsTrainingLinkIsVideo,
            NeedAcceptance,
          },
          {
            where: { ModuleTypeID, TrainingSimulationID, ContentID },
            transaction: t,
          }
        );
      }

      if (TrainingSimulationOwner && TrainingSimulationOwner.length > 0) {
        await ModuleOwner.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TrainingSimulationID,
              ContentID,
              TrainingSimulationDraftID:
                existingTrainingSimulationDraft.TrainingSimulationDraftID,
            },
            transaction: t,
          }
        );

        const ownerData = TrainingSimulationOwner.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            TrainingSimulationID,
            TrainingSimulationDraftID:
              newTrainingSimulationDraft.TrainingSimulationDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleOwner.bulkCreate(ownerData, { transaction: t });
      }

      if (SelfApproved === "false") {
        await TrainingSimulationModuleDraft.update(
          { EscalationType, EscalationAfter },
          {
            where: {
              ModuleTypeID,
              TrainingSimulationDraftID:
                newTrainingSimulationDraft.TrainingSimulationDraftID,
              TrainingSimulationID,
              ContentID,
            },
            transaction: t,
          }
        );
      } else {
        await TrainingSimulationModuleDraft.update(
          { EscalationType: null, EscalationAfter: null },
          {
            where: {
              ModuleTypeID,
              TrainingSimulationDraftID:
                newTrainingSimulationDraft.TrainingSimulationDraftID,
              TrainingSimulationID,
              ContentID,
            },
            transaction: t,
          }
        );
      }

      if (SelfApproved === "false" && Checker && Checker.length > 0) {
        await ModuleChecker.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TrainingSimulationID,
              ContentID,
              TrainingSimulationDraftID:
                existingTrainingSimulationDraft.TrainingSimulationDraftID,
            },
            transaction: t,
          }
        );

        const checkerData = Checker.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            TrainingSimulationID,
            TrainingSimulationDraftID:
              newTrainingSimulationDraft.TrainingSimulationDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleChecker.bulkCreate(checkerData, { transaction: t });
        sentModuleBulkEmail(checkerData, "Checker");
      } else if (SelfApproved === "true") {
        await ModuleChecker.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TrainingSimulationID,
              ContentID,
              TrainingSimulationDraftID:
                existingTrainingSimulationDraft.TrainingSimulationDraftID,
            },
            transaction: t,
          }
        );
      }

      if (SelfApproved === "false" && Approver && Approver.length > 0) {
        await ModuleApprover.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TrainingSimulationID,
              ContentID,
              TrainingSimulationDraftID:
                existingTrainingSimulationDraft.TrainingSimulationDraftID,
            },
            transaction: t,
          }
        );

        const approverData = Approver.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            TrainingSimulationID,
            TrainingSimulationDraftID:
              newTrainingSimulationDraft.TrainingSimulationDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleApprover.bulkCreate(approverData, { transaction: t });
      } else if (SelfApproved === "true") {
        await ModuleApprover.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TrainingSimulationID,
              ContentID,
              TrainingSimulationDraftID:
                existingTrainingSimulationDraft.TrainingSimulationDraftID,
            },
            transaction: t,
          }
        );
      }

      if (
        SelfApproved === "false" &&
        EscalationPerson &&
        EscalationPerson.length > 0
      ) {
        await ModuleEscalation.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TrainingSimulationID,
              ContentID,
              TrainingSimulationDraftID:
                existingTrainingSimulationDraft.TrainingSimulationDraftID,
            },
            transaction: t,
          }
        );

        const escalationData = EscalationPerson.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            TrainingSimulationID,
            TrainingSimulationDraftID:
              newTrainingSimulationDraft.TrainingSimulationDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleEscalation.bulkCreate(escalationData, { transaction: t });
      } else if (SelfApproved === "true") {
        await ModuleEscalation.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TrainingSimulationID,
              ContentID,
              TrainingSimulationDraftID:
                existingTrainingSimulationDraft.TrainingSimulationDraftID,
            },
            transaction: t,
          }
        );
      }

      if (FileUrl) {
        if (
          (IsTrainingLinkIsVideo === "true" ||
            IsTrainingLinkIsVideo === true) &&
          constants.allowedVideoFileExtensions.includes(
            FileUrl.split(".").pop()
          )
        ) {
          const incomingFile = path.posix.join(FileUrl);
          const incomingFileExtension = helper.getFileExtension(incomingFile);
          const oldFile = path.posix.join(
            existingTrainingSimulationDraft.TrainingSimulationPath
          );

          if (!fs.existsSync(oldFile)) {
            await t.rollback();
            return res.status(404).json({
              message: "Existing Skill Building file does not exist",
            });
          }

          if (path.basename(incomingFile) !== path.basename(oldFile)) {
            const incomingFileNewPath = path.posix.join(
              basePath,
              `${currentUserId}${incomingFileExtension}`
            );

            if (!fs.existsSync(incomingFileNewPath)) {
              await t.rollback();
              return res.status(404).json({
                message: "Uploaded file is corrupt, Please re-upload",
              });
            }

            // renaming existing file to draft which is going to be replaced to preserve it if needed
            if (!fs.existsSync(`${oldFile}_draft`)) {
              fs.renameSync(oldFile, `${oldFile}_draft`);
            }
            existingTrainingSimulationPathDraft = path.posix.join(
              `${oldFile}_draft`
            );

            const updatedPath = path.posix.join(
              basePath,
              `${TrainingSimulationID}${incomingFileExtension}`
            );
            fs.renameSync(incomingFileNewPath, updatedPath);
            newFilePathTemp = updatedPath;
            await TrainingSimulationModuleDraft.update(
              { TrainingSimulationPath: updatedPath },
              {
                where: {
                  ModuleTypeID,
                  TrainingSimulationDraftID:
                    newTrainingSimulationDraft.TrainingSimulationDraftID,
                  TrainingSimulationID,
                  ContentID,
                },
                transaction: t,
              }
            );
            if (SelfApproved === "true") {
              await TrainingSimulationModule.update(
                { TrainingSimulationPath: updatedPath },
                {
                  where: {
                    ModuleTypeID,
                    TrainingSimulationID,
                    ContentID,
                  },
                  transaction: t,
                }
              );
            }
          } else {
            await TrainingSimulationModuleDraft.update(
              {
                TrainingSimulationPath:
                  existingTrainingSimulationDraft.TrainingSimulationPath,
              },
              {
                where: {
                  ModuleTypeID,
                  TrainingSimulationDraftID:
                    newTrainingSimulationDraft.TrainingSimulationDraftID,
                  TrainingSimulationID,
                  ContentID,
                },
                transaction: t,
              }
            );
          }
        } else if (
          (IsTrainingLinkIsVideo === "false" ||
            IsTrainingLinkIsVideo === false) &&
          ((FileUrl.includes(".") &&
            constants.allowedZipFileExtensions.includes(
              FileUrl.split(".").pop()
            )) ||
            !FileUrl.includes("."))
        ) {
          const incomingFile = path.posix.join(FileUrl);
          const incomingFileExtension = helper.getFileExtension(incomingFile);

          const oldFile = path.posix.join(
            existingTrainingSimulationDraft.TrainingSimulationPath
          );

          if (!fs.existsSync(oldFile)) {
            await t.rollback();
            return res.status(404).json({
              message: "Existing Skill Building file does not exist",
            });
          }

          if (path.basename(incomingFile) !== path.basename(oldFile)) {
            const incomingFileNewPath = path.posix.join(
              basePath,
              `${currentUserId}${incomingFileExtension}`
            );

            if (!fs.existsSync(incomingFileNewPath)) {
              await t.rollback();
              return res.status(404).json({
                message: "Uploaded file is corrupt, Please re-upload",
              });
            }

            // renaming existing file to draft which is going to be replaced to preserve it if needed
            if (!fs.existsSync(`${oldFile}_draft`)) {
              fs.renameSync(oldFile, `${oldFile}_draft`);
            }
            existingTrainingSimulationPathDraft = path.posix.join(
              `${oldFile}_draft`
            );

            const updatedPath = path.posix.join(
              basePath,
              `${TrainingSimulationID}`
            );
            await helper.unzipFile(incomingFileNewPath, updatedPath);
            newFilePathTemp = updatedPath;
            zipFilePath = incomingFileNewPath;
            await TrainingSimulationModuleDraft.update(
              { TrainingSimulationPath: updatedPath },
              {
                where: {
                  ModuleTypeID,
                  TrainingSimulationDraftID:
                    newTrainingSimulationDraft.TrainingSimulationDraftID,
                  TrainingSimulationID,
                  ContentID,
                },
                transaction: t,
              }
            );
            if (SelfApproved === "true") {
              await TrainingSimulationModule.update(
                { TrainingSimulationPath: updatedPath },
                {
                  where: {
                    ModuleTypeID,
                    TrainingSimulationID,
                    ContentID,
                  },
                  transaction: t,
                }
              );
            }
          } else {
            await TrainingSimulationModuleDraft.update(
              {
                TrainingSimulationPath:
                  existingTrainingSimulationDraft.TrainingSimulationPath,
              },
              {
                where: {
                  ModuleTypeID,
                  TrainingSimulationDraftID:
                    newTrainingSimulationDraft.TrainingSimulationDraftID,
                  TrainingSimulationID,
                  ContentID,
                },
                transaction: t,
              }
            );
          }
        }
      }
    } else {
      const createdTrainingSimulation = await TrainingSimulationModule.create(
        {
          ModuleTypeID,
          TrainingSimulationName,
          TrainingSimulationDescription,
          TrainingSimulationIsActive,
          TrainingSimulationTags,
          ContentID,
          SelfApproved,
          TrainingSimulationStatus:
            SelfApproved === "true" ? "Published" : "InProgress",
          MasterVersion: SelfApproved === "true" ? "1.0" : null,
          CreatedBy: currentUserId,
          TrainingSimulationExpiry,
          IsTrainingLinkIsVideo,
          NeedAcceptance,
        },
        { transaction: t }
      );

      const createdTrainingSimulationDraft =
        await TrainingSimulationModuleDraft.create(
          {
            ModuleTypeID,
            TrainingSimulationID:
              createdTrainingSimulation.TrainingSimulationID,
            TrainingSimulationName,
            TrainingSimulationDescription,
            TrainingSimulationIsActive,
            TrainingSimulationTags,
            DraftVersion: "0.1",
            TrainingSimulationStatus:
              SelfApproved === "true" ? "Published" : "InProgress",
            MasterVersion: SelfApproved === "true" ? "1.0" : null,
            ContentID,
            SelfApproved,
            CreatedBy: currentUserId,
            TrainingSimulationExpiry,
            IsTrainingLinkIsVideo,
            NeedAcceptance,
          },
          { transaction: t }
        );
      moduleDetails = {
        TrainingSimulationID: createdTrainingSimulation.TrainingSimulationID,
        TrainingSimulationName,
      };
      draftDetails = {
        TrainingSimulationDraftID:
          createdTrainingSimulationDraft.TrainingSimulationDraftID,
        TrainingSimulationName,
      };
      if (TrainingSimulationOwner && TrainingSimulationOwner.length > 0) {
        const ownerData = TrainingSimulationOwner.map((userId) => {
          return {
            ModuleTypeID,
            TrainingSimulationID:
              createdTrainingSimulation.TrainingSimulationID,
            ContentID,
            TrainingSimulationDraftID:
              createdTrainingSimulationDraft.TrainingSimulationDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleOwner.bulkCreate(ownerData, { transaction: t });
      }

      if (
        (IsTrainingLinkIsVideo === "true" || IsTrainingLinkIsVideo === true) &&
        FileUrl &&
        constants.allowedVideoFileExtensions.includes(FileUrl.split(".").pop())
      ) {
        const incomingFile = path.posix.join(FileUrl);
        const incomingFileExtension = helper.getFileExtension(incomingFile);
        const incomingFileNewPath = path.posix.join(
          basePath,
          `${currentUserId}${incomingFileExtension}`
        );

        if (!fs.existsSync(incomingFileNewPath)) {
          await t.rollback();
          return res
            .status(404)
            .json({ message: "Uploaded file is corrupt, Please re-upload" });
        }

        const newPath = path.posix.join(
          basePath,
          `${createdTrainingSimulation.TrainingSimulationID}${incomingFileExtension}`
        );
        fs.renameSync(incomingFileNewPath, newPath);
        newFilePathTemp = newPath;

        await Promise.all([
          TrainingSimulationModule.update(
            { TrainingSimulationPath: newPath },
            {
              where: {
                ModuleTypeID,
                ContentID,
                TrainingSimulationID:
                  createdTrainingSimulation.TrainingSimulationID,
              },
              transaction: t,
            }
          ),
          TrainingSimulationModuleDraft.update(
            { TrainingSimulationPath: newPath },
            {
              where: {
                ModuleTypeID,
                ContentID,
                TrainingSimulationDraftID:
                  createdTrainingSimulationDraft.TrainingSimulationDraftID,
                TrainingSimulationID:
                  createdTrainingSimulation.TrainingSimulationID,
              },
              transaction: t,
            }
          ),
        ]);
      }
      if (
        (IsTrainingLinkIsVideo === "false" ||
          IsTrainingLinkIsVideo === false) &&
        FileUrl &&
        constants.allowedZipFileExtensions.includes(FileUrl.split(".").pop())
      ) {
        const incomingFile = path.posix.join(FileUrl);
        const incomingFileExtension = helper.getFileExtension(incomingFile);
        const incomingFileNewPath = path.posix.join(
          basePath,
          `${currentUserId}${incomingFileExtension}`
        );

        if (!fs.existsSync(incomingFileNewPath)) {
          await t.rollback();
          return res
            .status(404)
            .json({ message: "Uploaded file is corrupt, Please re-upload" });
        }

        const newPath = path.posix.join(
          basePath,
          `${createdTrainingSimulation.TrainingSimulationID}`
        );

        await helper.unzipFile(incomingFileNewPath, newPath);
        newFilePathTemp = newPath;
        zipFilePath = incomingFileNewPath;

        await Promise.all([
          TrainingSimulationModule.update(
            { TrainingSimulationPath: newPath },
            {
              where: {
                ModuleTypeID,
                ContentID,
                TrainingSimulationID:
                  createdTrainingSimulation.TrainingSimulationID,
              },
              transaction: t,
            }
          ),
          TrainingSimulationModuleDraft.update(
            { TrainingSimulationPath: newPath },
            {
              where: {
                ModuleTypeID,
                ContentID,
                TrainingSimulationDraftID:
                  createdTrainingSimulationDraft.TrainingSimulationDraftID,
                TrainingSimulationID:
                  createdTrainingSimulation.TrainingSimulationID,
              },
              transaction: t,
            }
          ),
        ]);
      }

      if (SelfApproved === "false" && Checker && Checker.length > 0) {
        const checkerData = Checker.map((userId) => {
          return {
            ModuleTypeID,
            TrainingSimulationID:
              createdTrainingSimulation.TrainingSimulationID,
            ContentID,
            TrainingSimulationDraftID:
              createdTrainingSimulationDraft.TrainingSimulationDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleChecker.bulkCreate(checkerData, { transaction: t });
        sentModuleBulkEmail(checkerData, "Checker");
      }

      if (SelfApproved === "false" && Approver && Approver.length > 0) {
        const approverData = Approver.map((userId) => {
          return {
            ModuleTypeID,
            TrainingSimulationID:
              createdTrainingSimulation.TrainingSimulationID,
            ContentID,
            TrainingSimulationDraftID:
              createdTrainingSimulationDraft.TrainingSimulationDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleApprover.bulkCreate(approverData, { transaction: t });
      }

      if (
        SelfApproved === "false" &&
        EscalationPerson &&
        EscalationPerson.length > 0
      ) {
        const escalationData = EscalationPerson.map((userId) => {
          return {
            ModuleTypeID,
            TrainingSimulationID:
              createdTrainingSimulation.TrainingSimulationID,
            ContentID,
            TrainingSimulationDraftID:
              createdTrainingSimulationDraft.TrainingSimulationDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleEscalation.bulkCreate(escalationData, { transaction: t });
      }

      if (SelfApproved === "false") {
        await TrainingSimulationModule.update(
          { EscalationType, EscalationAfter },
          {
            where: {
              ModuleTypeID,
              ContentID,
              TrainingSimulationID:
                createdTrainingSimulation.TrainingSimulationID,
            },
            transaction: t,
          }
        );
        await TrainingSimulationModuleDraft.update(
          { EscalationType, EscalationAfter },
          {
            where: {
              ModuleTypeID,
              ContentID,
              TrainingSimulationDraftID:
                createdTrainingSimulationDraft.TrainingSimulationDraftID,
              TrainingSimulationID:
                createdTrainingSimulation.TrainingSimulationID,
            },
            transaction: t,
          }
        );
      }
    }
    const notififactionBulk = [];
    if (SelfApproved == "true") {
      const modulelinks = await UserModuleLink.findAll({
        where: {
          ModuleID: moduleDetails.TrainingSimulationID,
          StartDate: {
            [Op.lte]: literal("CURRENT_TIMESTAMP"),
          },
          DueDate: {
            [Op.gte]: literal("CURRENT_TIMESTAMP"),
          },
        },
        attributes: ["UserID"],
      });
      for (const el of JSON.parse(JSON.stringify(modulelinks))) {
        assignUsers.push(el.UserID);
      }
      const notificationStatus = await Notification.findAll({
        where: {
          UserID: [...assignMaker, ...assignUsers],
          NotificationTypeForPublish: ["push", "both"],
        },
        attributes: ["UserID", "NotificationTypeForPublish"],
      });
      for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
        for (const UserID of assignMaker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Module Owner",
              NotificationType: "update",
              LinkedType: "TrainingSimulation",
              LinkedID: moduleDetails.TrainingSimulationID,
              CreatedBy: currentUserId,
            });
          }
        }
        for (const UserID of assignUsers) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Updated Element assign version is published",
              NotificationType: "assignment",
              LinkedType: "TrainingSimulation",
              LinkedID: moduleDetails.TrainingSimulationID,
              CreatedBy: currentUserId,
            });
          }
        }
      }
    } else {
      const notificationStatus = await Notification.findAll({
        where: {
          UserID: [...assignMaker, ...assignChecker],
          NotificationTypeForAction: ["push", "both"],
        },
        attributes: ["UserID", "NotificationTypeForAction"],
      });
      for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
        for (const UserID of assignMaker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Module InProgress Owner",
              NotificationType: "update",
              LinkedType: "TrainingSimulation",
              LinkedID: draftDetails.TrainingSimulationDraftID,
              CreatedBy: currentUserId,
            });
          }
        }
        for (const UserID of assignChecker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Checker",
              NotificationType: "actionable",
              LinkedType: "TrainingSimulation",
              LinkedID: draftDetails.TrainingSimulationDraftID,
              CreatedBy: currentUserId,
            });
          }
        }
      }
    }
    // for (const el of notififactionBulk) {
    //   await UserNotification.create(el);
    // }
    // await sendNotification(notififactionBulk);

    if (notififactionBulk.length > 0) {
      await UserNotification.bulkCreate(notififactionBulk, {
        ignoreDuplicates: true,
        transaction: t,
      });
      await sendNotification(notififactionBulk);
    }

    if (existingTrainingSimulationPathDraft && TrainingSimulationID) {
      if (fs.existsSync(existingTrainingSimulationPathDraft)) {
        const fileStat = fs.statSync(existingTrainingSimulationPathDraft);

        if (fileStat.isFile()) {
          fs.unlinkSync(existingTrainingSimulationPathDraft);
        }
        if (fileStat.isDirectory()) {
          await helper.deleteFolder(existingTrainingSimulationPathDraft);
        }
      }
    }

    if (
      (IsTrainingLinkIsVideo === "false" || IsTrainingLinkIsVideo === false) &&
      zipFilePath &&
      FileUrl &&
      constants.allowedZipFileExtensions.includes(FileUrl.split(".").pop())
    ) {
      await helper.deleteFolder(zipFilePath);
    }

    await t.commit();
    return res
      .status(201)
      .json({ message: "Skill Building Module created successfully" });
  } catch (error) {
    console.log(error);
    await t.rollback();

    if (newFilePathTemp) {
      try {
        if (
          (IsTrainingLinkIsVideo === "false" ||
            IsTrainingLinkIsVideo === false) &&
          FileUrl &&
          constants.allowedZipFileExtensions.includes(FileUrl.split(".").pop())
        ) {
          await helper.deleteFolder(newFilePathTemp);
        } else if (
          (IsTrainingLinkIsVideo === "true" ||
            IsTrainingLinkIsVideo === true) &&
          FileUrl &&
          constants.allowedVideoFileExtensions.includes(
            FileUrl.split(".").pop()
          )
        ) {
          const fileExtension = helper.getFileExtension(newFilePathTemp);
          if (fs.existsSync(newFilePathTemp)) {
            fs.renameSync(
              newFilePathTemp,
              path.posix.join(basePath, `${currentUserId}${fileExtension}`)
            );
          }
        }
      } catch (error) {
        logger.error({
          message: error.message,
          details: error,
          UserID: currentUserId,
        });
      }
    }
    if (existingTrainingSimulationPathDraft && TrainingSimulationID) {
      try {
        if (fs.existsSync(existingTrainingSimulationPathDraft)) {
          const fileExtension = helper
            .getFileExtension(existingTrainingSimulationPathDraft)
            .split("_")[0];
          fs.renameSync(
            existingTrainingSimulationPathDraft,
            path.posix.join(basePath, `${TrainingSimulationID}${fileExtension}`)
          );
        }
      } catch (error) {
        logger.error({
          message: error.message,
          details: error,
          UserID: currentUserId,
        });
      }
    }

    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const publishTrainingSimulationModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, TrainingSimulationID, ContentID } = req.body;
  const { currentUserId } = req.payload;

  try {
    let existingTrainingSimulationDraft =
      await TrainingSimulationModuleDraft.findOne({
        where: { ModuleTypeID, TrainingSimulationID, ContentID },
        order: [["CreatedDate", "DESC"]], // Order by the creation date to get the last record
        transaction: t,
      });

    if (!existingTrainingSimulationDraft) {
      await t.rollback();
      return res.status(404).json({ message: "Skill Building not found" });
    }

    existingTrainingSimulationDraft = existingTrainingSimulationDraft.toJSON();

    const isUserPermissibleToDelete = await checkUserPermission(
      TrainingSimulationModuleDraft,
      ModuleTypeID,
      ContentID,
      "TrainingSimulationID",
      TrainingSimulationID,
      "TrainingSimulationDraftID",
      existingTrainingSimulationDraft.TrainingSimulationDraftID,
      currentUserId,
      t
    );

    if (!isUserPermissibleToDelete) {
      await t.rollback();
      return res
        .status(403)
        .json({ message: "You are unathorized to publish" });
    }

    const parsedDraftVersion = parseFloat(
      existingTrainingSimulationDraft.DraftVersion
    );

    const latestMasterVersion = Math.ceil(parsedDraftVersion).toFixed(1);

    await Promise.all([
      TrainingSimulationModule.update(
        {
          TrainingSimulationName:
            existingTrainingSimulationDraft.TrainingSimulationName,
          TrainingSimulationDescription:
            existingTrainingSimulationDraft.TrainingSimulationDescription,
          TrainingSimulationStatus: "Published",
          TrainingSimulationIsActive:
            existingTrainingSimulationDraft.TrainingSimulationIsActive,
          TrainingSimulationTags:
            existingTrainingSimulationDraft.TrainingSimulationTags,
          EscalationType: existingTrainingSimulationDraft.EscalationType,
          EscalationAfter: existingTrainingSimulationDraft.EscalationAfter,
          SelfApproved: existingTrainingSimulationDraft.SelfApproved,
          DraftVersion: existingTrainingSimulationDraft.DraftVersion,
          TrainingSimulationExpiry:
            existingTrainingSimulationDraft.TrainingSimulationExpiry,
          MasterVersion: latestMasterVersion,
          TrainingSimulationPath:
            existingTrainingSimulationDraft.TrainingSimulationPath,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
          IsTrainingLinkIsVideo:
            existingTrainingSimulationDraft.IsTrainingLinkIsVideo,
          NeedAcceptance: existingTrainingSimulationDraft.NeedAcceptance,
        },
        {
          where: { ModuleTypeID, TrainingSimulationID, ContentID },
          transaction: t,
        }
      ),
      TrainingSimulationModuleDraft.update(
        {
          TrainingSimulationStatus: "Published",
          MasterVersion: latestMasterVersion,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: {
            ModuleTypeID,
            TrainingSimulationDraftID:
              existingTrainingSimulationDraft.TrainingSimulationDraftID,
            TrainingSimulationID,
            ContentID,
          },
          transaction: t,
        }
      ),
    ]);
    const modulelinks = await UserModuleLink.findAll({
      where: {
        ModuleID: TrainingSimulationID,
        StartDate: {
          [Op.lte]: literal("CURRENT_TIMESTAMP"),
        },
        DueDate: {
          [Op.gte]: literal("CURRENT_TIMESTAMP"),
        },
      },
      attributes: ["UserID"],
    });
    const assignUsers = [],
      notififactionBulk = [];
    for (const el of JSON.parse(JSON.stringify(modulelinks))) {
      assignUsers.push(el.UserID);
    }
    const notificationStatus = await Notification.findAll({
      where: {
        UserID: assignUsers,
        NotificationTypeForPublish: ["push", "both"],
      },
      attributes: ["UserID", "NotificationTypeForPublish"],
    });
    for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
      for (const UserID of assignMaker) {
        if (UserID == el.UserID) {
          notififactionBulk.push({
            UserID: el.UserID,
            Message: "Updated Element assign version is published",
            NotificationType: "assignment",
            LinkedType: "TrainingSimulation",
            LinkedID: TrainingSimulationID,
            CreatedBy: currentUserId,
          });
        }
      }
    }

    // for (const el of notififactionBulk) {
    //   await UserNotification.create(el);
    // }
    // await sendNotification(notififactionBulk);

    if (notififactionBulk.length > 0) {
      await UserNotification.bulkCreate(notififactionBulk, {
        ignoreDuplicates: true,
        transaction: t,
      });
      await sendNotification(notififactionBulk);
    }

    await t.commit();
    return res
      .status(200)
      .json({ message: "Skill Building Status updated successfully" });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const viewTrainingSimulationModuleDraft = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID, TrainingSimulationID } = req.body;

  try {
    const trainingSimulationModuleDraft =
      await TrainingSimulationModuleDraft.findOne({
        where: {
          ModuleTypeID,
          TrainingSimulationID,
          ContentID,
          IsDeleted: false,
        },
        include: [
          {
            model: ModuleChecker,
            as: "Checkers",
            required: false, // This ensures TrainingSimulationModuleDraft is returned even if ModuleChecker doesn't exist
            where: {
              IsDeleted: false, // Include only if not deleted
            },
            attributes: ["UserID"],
            include: [
              {
                model: Users,
                as: "ModuleCheckerUser",
                attributes: ["UserID", "UserName"],
              },
            ],
          },
          {
            model: ModuleEscalation,
            as: "EscalationPersons",
            required: false, // This ensures TrainingSimulationModuleDraft is returned even if ModuleEscalation doesn't exist
            where: {
              IsDeleted: false, // Include only if not deleted
            },
            attributes: ["UserID"],
            include: [
              {
                model: Users,
                as: "ModuleEscalationUser",
                attributes: ["UserID", "UserName"],
              },
            ],
          },
          {
            model: ModuleOwner,
            as: "ModuleOwners",
            required: false,
            where: {
              IsDeleted: false,
            },
            attributes: ["UserID"],
            include: [
              {
                model: Users,
                as: "ModuleOwnerUser",
                attributes: ["UserID", "UserName"],
              },
            ],
          },
        ],
        order: [["CreatedDate", "DESC"]],
        transaction: t,
      });

    if (!trainingSimulationModuleDraft) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "Skill Building draft not found" });
    }

    await t.commit();
    return res.status(200).json({
      message: "Skill Building draft fetched successfully",
      data: {
        trainingSimulationModuleDraft,
      },
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const listTrainingSimulationModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID } = req.body;

  try {
    const trainingSimulationList = await TrainingSimulationModuleDraft.findAll({
      where: {
        ModuleTypeID,
        ContentID,
        IsDeleted: false,
      },
      attributes: [
        "TrainingSimulationID",
        "TrainingSimulationName",
        "DraftVersion",
        "MasterVersion",
        "CreatedDate",
      ],
      where: {
        [Op.and]: [
          { ModuleTypeID },
          { ContentID },
          { IsDeleted: false },
          Sequelize.literal(`
        "CreatedDate" = (
          SELECT MAX("CreatedDate") 
          FROM "TrainingSimulationModuleDrafts" AS "sub" 
          WHERE 
            "sub"."TrainingSimulationID" = "TrainingSimulationModuleDraft"."TrainingSimulationID" 
            AND "sub"."IsDeleted" = false
        )
      `),
        ],
      },
      order: [["CreatedDate", "DESC"]],
      transaction: t,
    });

    await t.commit();
    return res.status(200).json({
      message: "Skill Building list fetched successfully",
      data: {
        trainingSimulationList,
      },
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const deleteTrainingSimulationtModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID, TrainingSimulationID } = req.body;
  const { currentUserId } = req.payload;

  try {
    const existingTrainingSimulationDraft =
      await TrainingSimulationModuleDraft.findOne({
        where: { ModuleTypeID, TrainingSimulationID, ContentID },
        order: [["CreatedDate", "DESC"]],
        transaction: t,
      });

    if (!existingTrainingSimulationDraft) {
      await t.rollback();
      return res.status(404).json({ message: "Skill Building not found" });
    }

    const isUserPermissibleToDelete = await checkUserPermission(
      TrainingSimulationModuleDraft,
      ModuleTypeID,
      ContentID,
      "TrainingSimulationID",
      TrainingSimulationID,
      "TrainingSimulationDraftID",
      existingTrainingSimulationDraft.TrainingSimulationDraftID,
      currentUserId,
      t
    );

    if (!isUserPermissibleToDelete) {
      await t.rollback();
      return res.status(403).json({ message: "You are unathorized to delete" });
    }

    await Promise.all([
      TrainingSimulationModuleDraft.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: { ModuleTypeID, ContentID, TrainingSimulationID },
          transaction: t,
        }
      ),
      TrainingSimulationModule.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: { ModuleTypeID, ContentID, TrainingSimulationID },
          transaction: t,
        }
      ),
      ModuleChecker.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: { ModuleTypeID, TrainingSimulationID, ContentID },
          transaction: t,
        }
      ),
      ModuleApprover.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: { ModuleTypeID, TrainingSimulationID, ContentID },
          transaction: t,
        }
      ),
      ModuleEscalation.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: { ModuleTypeID, TrainingSimulationID, ContentID },
          transaction: t,
        }
      ),
      ModuleOwner.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: { ModuleTypeID, TrainingSimulationID, ContentID },
          transaction: t,
        }
      ),
    ]);

    await t.commit();
    return res.status(200).json({
      message: "Skill Building deleted successfully",
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

// Skill Assessment module
const createTestSimulationModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const {
    ModuleTypeID,
    ContentID = null,
    TestSimulationID = null,
    TestSimulationName,
    TestSimulationDescription,
    TestSimulationIsActive,
    TestSimulationTags,
    EscalationPerson,
    EscalationType,
    EscalationAfter,
    Checker,
    Approver,
    TestSimulationOwner,
    SelfApproved,
    TotalAttempts,
    PassPercentage,
    TestSimulationExpiry = null,
    NeedAcceptance = false,
    FileUrl,
    MinimumTime,
  } = req.body;

  const { currentUserId } = req.payload;

  const basePath = path.posix.join(
    "src",
    "infrastructure",
    "media",
    "TestSimulation"
  );

  let newFilePathTemp;
  let existingTestSimulationPathDraft;
  let zipFilePath;

  try {
    const assignUsers = [],
      assignMaker = [
        ...JSON.parse(
          JSON.stringify(TestSimulationOwner ? TestSimulationOwner : [])
        ),
      ],
      assignChecker = [...JSON.parse(JSON.stringify(Checker ? Checker : []))],
      assignEscalation = [
        ...JSON.parse(JSON.stringify(EscalationPerson ? EscalationPerson : [])),
      ];
    let moduleDetails, draftDetails;
    if (TestSimulationID) {
      moduleDetails = { TestSimulationID, TestSimulationName };
      let existingTestSimulationDraft = await TestSimulationModuleDraft.findOne(
        {
          where: { ModuleTypeID, TestSimulationID, ContentID },
          order: [["CreatedDate", "DESC"]],
          transaction: t,
        }
      );

      if (!existingTestSimulationDraft) {
        await t.rollback();
        return res.status(404).json({ message: "Skill Assessment not found" });
      }

      existingTestSimulationDraft = existingTestSimulationDraft.toJSON();

      const isUserPermissibleToDelete = await checkUserPermission(
        TestSimulationModuleDraft,
        ModuleTypeID,
        ContentID,
        "TestSimulationID",
        TestSimulationID,
        "TestSimulationDraftID",
        existingTestSimulationDraft.TestSimulationDraftID,
        currentUserId,
        t
      );

      if (!isUserPermissibleToDelete) {
        await t.rollback();
        if (req?.file?.path) await helper.deleteFile(req?.file?.path);

        return res
          .status(403)
          .json({ message: "You are unathorized to edit or publish" });
      }

      let latestDraftVersion;
      let latestMasterVersion = null;
      if (SelfApproved === "true") {
        if (existingTestSimulationDraft.MasterVersion) {
          latestMasterVersion = (
            parseFloat(existingTestSimulationDraft.MasterVersion) + 1.0
          ).toFixed(1);
        } else {
          latestMasterVersion = Math.ceil(
            parseFloat(existingTestSimulationDraft.DraftVersion)
          ).toFixed(1);
        }

        latestDraftVersion = (parseFloat(latestMasterVersion) - 0.9).toFixed(1);
      } else {
        if (existingTestSimulationDraft.MasterVersion) {
          latestDraftVersion = (
            parseFloat(existingTestSimulationDraft.MasterVersion) + 0.1
          ).toFixed(1);
        } else {
          latestDraftVersion = (
            parseFloat(existingTestSimulationDraft.DraftVersion) + 0.1
          ).toFixed(1);
        }
      }

      const newTestSimulationDraft = await TestSimulationModuleDraft.create(
        {
          ModuleTypeID,
          TestSimulationID,
          ContentID,
          TestSimulationName,
          TestSimulationDescription,
          TestSimulationIsActive,
          TestSimulationTags,
          TestSimulationStatus:
            SelfApproved === "true" ? "Published" : "InProgress",
          DraftVersion: latestDraftVersion.toString(),
          MasterVersion: SelfApproved === "true" ? latestMasterVersion : null,
          SelfApproved,
          TotalAttempts,
          PassPercentage,
          CreatedBy: currentUserId,
          TestSimulationExpiry,
          NeedAcceptance,
          MinimumTime,
        },
        { transaction: t }
      );
      draftDetails = {
        TestSimulationDraftID:
          existingTestSimulationDraft.TestSimulationDraftID,
        TestSimulationName,
      };
      if (SelfApproved === "true") {
        await TestSimulationModule.update(
          {
            TestSimulationName,
            TestSimulationDescription,
            TestSimulationIsActive,
            TestSimulationTags,
            SelfApproved,
            TestSimulationStatus: "Published",
            DraftVersion: latestDraftVersion.toString(),
            MasterVersion: latestMasterVersion,
            ModifiedBy: currentUserId,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
            TestSimulationExpiry,
            MinimumTime,
          },
          {
            where: { ModuleTypeID, TestSimulationID, ContentID },
            transaction: t,
          }
        );
      }

      if (TestSimulationOwner && TestSimulationOwner.length > 0) {
        await ModuleOwner.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TestSimulationID,
              ContentID,
              TestSimulationDraftID:
                existingTestSimulationDraft.TestSimulationDraftID,
            },
            transaction: t,
          }
        );

        const ownerData = TestSimulationOwner.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            TestSimulationID,
            TestSimulationDraftID: newTestSimulationDraft.TestSimulationDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleOwner.bulkCreate(ownerData, { transaction: t });
      }

      if (SelfApproved === "false") {
        await TestSimulationModuleDraft.update(
          { EscalationType, EscalationAfter },
          {
            where: {
              ModuleTypeID,
              TestSimulationDraftID:
                newTestSimulationDraft.TestSimulationDraftID,
              TestSimulationID,
              ContentID,
            },
            transaction: t,
          }
        );
      } else {
        await TestSimulationModuleDraft.update(
          { EscalationType: null, EscalationAfter: null },
          {
            where: {
              ModuleTypeID,
              TestSimulationDraftID:
                newTestSimulationDraft.TestSimulationDraftID,
              TestSimulationID,
              ContentID,
            },
            transaction: t,
          }
        );
      }

      if (SelfApproved === "false" && Checker && Checker.length > 0) {
        await ModuleChecker.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TestSimulationID,
              ContentID,
              TestSimulationDraftID:
                existingTestSimulationDraft.TestSimulationDraftID,
            },
            transaction: t,
          }
        );

        const checkerData = Checker.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            TestSimulationID,
            TestSimulationDraftID: newTestSimulationDraft.TestSimulationDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleChecker.bulkCreate(checkerData, { transaction: t });
        sentModuleBulkEmail(checkerData, "Checker");
      } else if (SelfApproved === "true") {
        await ModuleChecker.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TestSimulationID,
              ContentID,
              TestSimulationDraftID:
                existingTestSimulationDraft.TestSimulationDraftID,
            },
            transaction: t,
          }
        );
      }

      if (SelfApproved === "false" && Approver && Approver.length > 0) {
        await ModuleApprover.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TestSimulationID,
              ContentID,
              TestSimulationDraftID:
                existingTestSimulationDraft.TestSimulationDraftID,
            },
            transaction: t,
          }
        );

        const approverData = Approver.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            TestSimulationID,
            TestSimulationDraftID: newTestSimulationDraft.TestSimulationDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleApprover.bulkCreate(approverData, { transaction: t });
      } else if (SelfApproved === "true") {
        await ModuleApprover.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TestSimulationID,
              ContentID,
              TestSimulationDraftID:
                existingTestSimulationDraft.TestSimulationDraftID,
            },
            transaction: t,
          }
        );
      }

      if (
        SelfApproved === "false" &&
        EscalationPerson &&
        EscalationPerson.length > 0
      ) {
        await ModuleEscalation.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TestSimulationID,
              ContentID,
              TestSimulationDraftID:
                existingTestSimulationDraft.TestSimulationDraftID,
            },
            transaction: t,
          }
        );

        const escalationData = EscalationPerson.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            TestSimulationID,
            TestSimulationDraftID: newTestSimulationDraft.TestSimulationDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleEscalation.bulkCreate(escalationData, { transaction: t });
      } else if (SelfApproved === "true") {
        await ModuleEscalation.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TestSimulationID,
              ContentID,
              TestSimulationDraftID:
                existingTestSimulationDraft.TestSimulationDraftID,
            },
            transaction: t,
          }
        );
      }

      if (FileUrl) {
        if (
          (FileUrl.includes(".") &&
            constants.allowedZipFileExtensions.includes(
              FileUrl.split(".").pop()
            )) ||
          !FileUrl.includes(".")
        ) {
          const incomingFile = path.posix.join(FileUrl);
          const incomingFileExtension = helper.getFileExtension(incomingFile);

          const oldFile = path.posix.join(
            existingTestSimulationDraft.TestSimulationPath
          );

          if (!fs.existsSync(oldFile)) {
            await t.rollback();
            return res.status(404).json({
              message: "Existing Skill Assessment file does not exist",
            });
          }

          if (path.basename(incomingFile) !== path.basename(oldFile)) {
            const incomingFileNewPath = path.posix.join(
              basePath,
              `${currentUserId}${incomingFileExtension}`
            );

            if (!fs.existsSync(incomingFileNewPath)) {
              await t.rollback();
              return res.status(404).json({
                message: "Uploaded file is corrupt, Please re-upload",
              });
            }

            // renaming existing file to draft which is going to be replaced to preserve it if needed
            if (!fs.existsSync(`${oldFile}_draft`)) {
              fs.renameSync(oldFile, `${oldFile}_draft`);
            }
            existingTestSimulationPathDraft = path.posix.join(
              `${oldFile}_draft`
            );

            const updatedPath = path.posix.join(
              basePath,
              `${TestSimulationID}`
            );
            await helper.unzipFile(incomingFileNewPath, updatedPath);
            newFilePathTemp = updatedPath;
            zipFilePath = incomingFileNewPath;

            await TestSimulationModuleDraft.update(
              { TestSimulationPath: updatedPath },
              {
                where: {
                  ModuleTypeID,
                  TestSimulationDraftID:
                    newTestSimulationDraft.TestSimulationDraftID,
                  TestSimulationID,
                  ContentID,
                },
                transaction: t,
              }
            );
            if (SelfApproved === "true") {
              await TestSimulationModule.update(
                { TestSimulationPath: updatedPath },
                {
                  where: {
                    ModuleTypeID,
                    TestSimulationID,
                    ContentID,
                  },
                  transaction: t,
                }
              );
            }
          } else {
            await TestSimulationModuleDraft.update(
              {
                TestSimulationPath:
                  existingTestSimulationDraft.TestSimulationPath,
              },
              {
                where: {
                  ModuleTypeID,
                  TestSimulationDraftID:
                    newTestSimulationDraft.TestSimulationDraftID,
                  TestSimulationID,
                  ContentID,
                },
                transaction: t,
              }
            );
          }
        }
      } else {
        await t.rollback();
        return res.status(400).json({ message: "File is missing" });
      }
    } else {
      const createdTestSimulation = await TestSimulationModule.create(
        {
          ModuleTypeID,
          TestSimulationName,
          TestSimulationDescription,
          TestSimulationIsActive,
          TestSimulationTags,
          ContentID,
          SelfApproved,
          TestSimulationStatus:
            SelfApproved === "true" ? "Published" : "InProgress",
          MasterVersion: SelfApproved === "true" ? "1.0" : null,
          TotalAttempts,
          PassPercentage,
          CreatedBy: currentUserId,
          TestSimulationExpiry,
          NeedAcceptance,
          MinimumTime,
        },
        { transaction: t }
      );

      const createdTestSimulationDraft = await TestSimulationModuleDraft.create(
        {
          ModuleTypeID,
          TestSimulationID: createdTestSimulation.TestSimulationID,
          TestSimulationName,
          TestSimulationDescription,
          TestSimulationIsActive,
          TestSimulationTags,
          DraftVersion: "0.1",
          TestSimulationStatus:
            SelfApproved === "true" ? "Published" : "InProgress",
          MasterVersion: SelfApproved === "true" ? "1.0" : null,
          ContentID,
          SelfApproved,
          TotalAttempts,
          PassPercentage,
          CreatedBy: currentUserId,
          TestSimulationExpiry,
          NeedAcceptance,
          MinimumTime,
        },
        { transaction: t }
      );
      moduleDetails = {
        TestSimulationID: createdTestSimulation.TestSimulationID,
        TestSimulationName,
      };
      draftDetails = {
        TestSimulationDraftID: createdTestSimulationDraft.TestSimulationDraftID,
        TestSimulationName,
      };
      if (TestSimulationOwner && TestSimulationOwner.length > 0) {
        const ownerData = TestSimulationOwner.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            TestSimulationID: createdTestSimulation.TestSimulationID,
            TestSimulationDraftID:
              createdTestSimulationDraft.TestSimulationDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleOwner.bulkCreate(ownerData, { transaction: t });
      }

      if (
        FileUrl &&
        constants.allowedZipFileExtensions.includes(FileUrl.split(".").pop())
      ) {
        const incomingFile = path.posix.join(FileUrl);
        const incomingFileExtension = helper.getFileExtension(incomingFile);
        const incomingFileNewPath = path.posix.join(
          basePath,
          `${currentUserId}${incomingFileExtension}`
        );

        if (!fs.existsSync(incomingFileNewPath)) {
          await t.rollback();
          return res
            .status(404)
            .json({ message: "Uploaded file is corrupt, Please re-upload" });
        }

        const newPath = path.posix.join(
          basePath,
          `${createdTestSimulation.TestSimulationID}`
        );

        await helper.unzipFile(incomingFileNewPath, newPath);
        newFilePathTemp = newPath;
        zipFilePath = incomingFileNewPath;

        await Promise.all([
          TestSimulationModule.update(
            { TestSimulationPath: newPath },
            {
              where: {
                ModuleTypeID,
                ContentID,
                TestSimulationID: createdTestSimulation.TestSimulationID,
              },
              transaction: t,
            }
          ),
          TestSimulationModuleDraft.update(
            { TestSimulationPath: newPath },
            {
              where: {
                ModuleTypeID,
                ContentID,
                TestSimulationDraftID:
                  createdTestSimulationDraft.TestSimulationDraftID,
                TestSimulationID: createdTestSimulation.TestSimulationID,
              },
              transaction: t,
            }
          ),
        ]);
      } else {
        await t.rollback();
        return res.status(400).json({ message: "File is missing" });
      }

      if (SelfApproved === "false" && Checker && Checker.length > 0) {
        const checkerData = Checker.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            TestSimulationID: createdTestSimulation.TestSimulationID,
            TestSimulationDraftID:
              createdTestSimulationDraft.TestSimulationDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleChecker.bulkCreate(checkerData, { transaction: t });
        sentModuleBulkEmail(checkerData, "Checker");
      }

      if (SelfApproved === "false" && Approver && Approver.length > 0) {
        const approverData = Approver.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            TestSimulationID: createdTestSimulation.TestSimulationID,
            TestSimulationDraftID:
              createdTestSimulationDraft.TestSimulationDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleApprover.bulkCreate(approverData, { transaction: t });
      }

      if (
        SelfApproved === "false" &&
        EscalationPerson &&
        EscalationPerson.length > 0
      ) {
        const escalationData = EscalationPerson.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            TestSimulationID: createdTestSimulation.TestSimulationID,
            TestSimulationDraftID:
              createdTestSimulationDraft.TestSimulationDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleEscalation.bulkCreate(escalationData, { transaction: t });
      }

      if (SelfApproved === "false") {
        await TestSimulationModule.update(
          { EscalationType, EscalationAfter },
          {
            where: {
              ModuleTypeID,
              ContentID,
              TestSimulationID: createdTestSimulation.TestSimulationID,
            },
            transaction: t,
          }
        );
        await TestSimulationModuleDraft.update(
          { EscalationType, EscalationAfter },
          {
            where: {
              ModuleTypeID,
              ContentID,
              TestSimulationDraftID:
                createdTestSimulationDraft.TestSimulationDraftID,
              TestSimulationID: createdTestSimulation.TestSimulationID,
            },
            transaction: t,
          }
        );
      }
    }
    const notififactionBulk = [];
    if (SelfApproved == "true") {
      const modulelinks = await UserModuleLink.findAll({
        where: {
          ModuleID: moduleDetails.TestSimulationID,
          StartDate: {
            [Op.lte]: literal("CURRENT_TIMESTAMP"),
          },
          DueDate: {
            [Op.gte]: literal("CURRENT_TIMESTAMP"),
          },
        },
        attributes: ["UserID"],
      });
      for (const el of JSON.parse(JSON.stringify(modulelinks))) {
        assignUsers.push(el.UserID);
      }
      const notificationStatus = await Notification.findAll({
        where: {
          UserID: [...assignMaker, ...assignUsers],
          NotificationTypeForPublish: ["push", "both"],
        },
        attributes: ["UserID", "NotificationTypeForPublish"],
      });
      for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
        for (const UserID of assignMaker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Module Owner",
              NotificationType: "update",
              LinkedType: "TestSimulation",
              LinkedID: moduleDetails.TestSimulationID,
              CreatedBy: currentUserId,
            });
          }
        }
        for (const UserID of assignUsers) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Updated Element assign version is published",
              NotificationType: "assignment",
              LinkedType: "TestSimulation",
              LinkedID: moduleDetails.TestSimulationID,
              CreatedBy: currentUserId,
            });
          }
        }
      }
    } else {
      const notificationStatus = await Notification.findAll({
        where: {
          UserID: [
            ...assignMaker,
            ...assignChecker,
            ...assignEscalation,
            currentUserId,
          ],
          NotificationTypeForAction: ["push", "both"],
        },
        attributes: ["UserID", "NotificationTypeForAction"],
      });
      for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
        for (const UserID of assignMaker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Module InProgress Owner",
              NotificationType: "update",
              LinkedType: "TestSimulation",
              LinkedID: draftDetails.TestSimulationDraftID,
              CreatedBy: currentUserId,
            });
          }
        }
        for (const UserID of assignChecker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Checker",
              NotificationType: "actionable",
              LinkedType: "TestSimulation",
              LinkedID: draftDetails.TestSimulationDraftID,
              CreatedBy: currentUserId,
            });
          }
        }
      }
    }
    // for (const el of notififactionBulk) {
    //   await UserNotification.create(el);
    // }
    // await sendNotification(notififactionBulk);

    if (notififactionBulk.length > 0) {
      await UserNotification.bulkCreate(notififactionBulk, {
        ignoreDuplicates: true,
        transaction: t,
      });
      await sendNotification(notififactionBulk);
    }

    if (
      zipFilePath &&
      FileUrl &&
      constants.allowedZipFileExtensions.includes(FileUrl.split(".").pop())
    ) {
      await helper.deleteFolder(zipFilePath);
    }

    if (existingTestSimulationPathDraft && TestSimulationID) {
      if (fs.existsSync(existingTestSimulationPathDraft)) {
        await helper.deleteFolder(existingTestSimulationPathDraft);
      }
    }

    await t.commit();
    return res
      .status(201)
      .json({ message: "Skill Assessment Module created successfully" });
  } catch (error) {
    console.log(error);
    await t.rollback();

    if (newFilePathTemp) {
      try {
        if (
          FileUrl &&
          constants.allowedZipFileExtensions.includes(FileUrl.split(".").pop())
        ) {
          await helper.deleteFolder(newFilePathTemp);
        }
      } catch (error) {
        logger.error({
          message: error.message,
          details: error,
          UserID: currentUserId,
        });
      }
    }
    if (existingTestSimulationPathDraft && TestSimulationID) {
      try {
        if (fs.existsSync(existingTestSimulationPathDraft)) {
          const fileExtension = helper
            .getFileExtension(existingTestSimulationPathDraft)
            .split("_")[0];
          fs.renameSync(
            existingTestSimulationPathDraft,
            path.posix.join(basePath, `${TestSimulationID}${fileExtension}`)
          );
        }
      } catch (error) {
        logger.error({
          message: error.message,
          details: error,
          UserID: currentUserId,
        });
      }
    }

    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const publishTestSimulationModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, TestSimulationID, ContentID } = req.body;
  const { currentUserId } = req.payload;

  try {
    let existingTestSimulationDraft = await TestSimulationModuleDraft.findOne({
      where: { ModuleTypeID, TestSimulationID, ContentID },
      order: [["CreatedDate", "DESC"]], // Order by the creation date to get the last record
      transaction: t,
    });

    if (!existingTestSimulationDraft) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "Skill Assessment InProgress not found" });
    }

    existingTestSimulationDraft = existingTestSimulationDraft.toJSON();

    const isUserPermissibleToDelete = await checkUserPermission(
      TestSimulationModuleDraft,
      ModuleTypeID,
      ContentID,
      "TestSimulationID",
      TestSimulationID,
      "TestSimulationDraftID",
      existingTestSimulationDraft.TestSimulationDraftID,
      currentUserId,
      t
    );

    if (!isUserPermissibleToDelete) {
      await t.rollback();
      return res
        .status(403)
        .json({ message: "You are unathorized to publish" });
    }

    const parsedDraftVersion = parseFloat(
      existingTestSimulationDraft.DraftVersion
    );

    const latestMasterVersion = Math.ceil(parsedDraftVersion).toFixed(1);

    await Promise.all([
      TestSimulationModule.update(
        {
          TestSimulationName: existingTestSimulationDraft.TestSimulationName,
          TestSimulationDescription:
            existingTestSimulationDraft.TestSimulationDescription,
          TestSimulationStatus: "Published",
          TestSimulationIsActive:
            existingTestSimulationDraft.TestSimulationIsActive,
          TestSimulationTags: existingTestSimulationDraft.TestSimulationTags,
          EscalationType: existingTestSimulationDraft.EscalationType,
          EscalationAfter: existingTestSimulationDraft.EscalationAfter,
          SelfApproved: existingTestSimulationDraft.SelfApproved,
          DraftVersion: existingTestSimulationDraft.DraftVersion,
          MasterVersion: latestMasterVersion,
          TestSimulationPath: existingTestSimulationDraft.TestSimulationPath,
          TotalAttempts: existingTestSimulationDraft.TotalAttempts,
          PassPercentage: existingTestSimulationDraft.PassPercentage,
          TestSimulationExpiry:
            existingTestSimulationDraft.TestSimulationExpiry,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
          NeedAcceptance: existingTestSimulationDraft.NeedAcceptance,
          MinimumTime: existingTestSimulationDraft.MinimumTime,
        },
        { where: { ModuleTypeID, TestSimulationID, ContentID }, transaction: t }
      ),
      TestSimulationModuleDraft.update(
        {
          TestSimulationStatus: "Published",
          MasterVersion: latestMasterVersion,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: {
            ModuleTypeID,
            TestSimulationDraftID:
              existingTestSimulationDraft.TestSimulationDraftID,
            TestSimulationID,
            ContentID,
          },
          transaction: t,
        }
      ),
    ]);
    const modulelinks = await UserModuleLink.findAll({
      where: {
        ModuleID: TestSimulationID,
        StartDate: {
          [Op.lte]: literal("CURRENT_TIMESTAMP"),
        },
        DueDate: {
          [Op.gte]: literal("CURRENT_TIMESTAMP"),
        },
      },
      attributes: ["UserID"],
    });
    const assignUsers = [],
      notififactionBulk = [];
    for (const el of JSON.parse(JSON.stringify(modulelinks))) {
      assignUsers.push(el.UserID);
    }
    const notificationStatus = await Notification.findAll({
      where: {
        UserID: assignUsers,
        NotificationTypeForPublish: ["push", "both"],
      },
      attributes: ["UserID", "NotificationTypeForPublish"],
    });
    for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
      for (const UserID of assignMaker) {
        if (UserID == el.UserID) {
          notififactionBulk.push({
            UserID: el.UserID,
            Message: "Updated Element assign version is published",
            NotificationType: "assignment",
            LinkedType: "TestSimulation",
            LinkedID: TestSimulationID,
            CreatedBy: currentUserId,
          });
        }
      }
    }

    // for (const el of notififactionBulk) {
    //   await UserNotification.create(el);
    // }
    // await sendNotification(notififactionBulk);

    if (notififactionBulk.length > 0) {
      await UserNotification.bulkCreate(notififactionBulk, {
        ignoreDuplicates: true,
        transaction: t,
      });
      await sendNotification(notififactionBulk);
    }

    await t.commit();
    return res
      .status(200)
      .json({ message: "Skill Assessment Status updated successfully" });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const viewTestSimulationModuleDraft = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID, TestSimulationID } = req.body;

  try {
    const testSimulationModuleDraft = await TestSimulationModuleDraft.findOne({
      where: {
        ModuleTypeID,
        TestSimulationID,
        ContentID,
        IsDeleted: false,
      },
      include: [
        {
          model: ModuleChecker,
          as: "Checkers",
          required: false, // This ensures testSimulationModuleDraft is returned even if ModuleChecker doesn't exist
          where: {
            IsDeleted: false, // Include only if not deleted
          },
          attributes: ["UserID"],
          include: [
            {
              model: Users,
              as: "ModuleCheckerUser",
              attributes: ["UserID", "UserName"],
            },
          ],
        },
        {
          model: ModuleEscalation,
          as: "EscalationPersons",
          required: false, // This ensures testSimulationModuleDraft is returned even if ModuleEscalation doesn't exist
          where: {
            IsDeleted: false, // Include only if not deleted
          },
          attributes: ["UserID"],
          include: [
            {
              model: Users,
              as: "ModuleEscalationUser",
              attributes: ["UserID", "UserName"],
            },
          ],
        },
        {
          model: ModuleOwner,
          as: "ModuleOwners",
          required: false,
          where: {
            IsDeleted: false,
          },
          attributes: ["UserID"],
          include: [
            {
              model: Users,
              as: "ModuleOwnerUser",
              attributes: ["UserID", "UserName"],
            },
          ],
        },
      ],
      order: [["CreatedDate", "DESC"]],
      transaction: t,
    });

    if (!testSimulationModuleDraft) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "Skill Assessment draft not found" });
    }

    await t.commit();
    return res.status(200).json({
      message: "Skill Building draft fetched successfully",
      data: {
        testSimulationModuleDraft,
      },
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const listTestSimulationModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID } = req.body;

  try {
    const testSimulationList = await TestSimulationModuleDraft.findAll({
      where: {
        ModuleTypeID,
        ContentID,
        IsDeleted: false,
      },
      attributes: [
        "TestSimulationID",
        "TestSimulationName",
        "DraftVersion",
        "MasterVersion",
        "CreatedDate",
      ],
      where: {
        [Op.and]: [
          { ModuleTypeID },
          { ContentID },
          { IsDeleted: false },
          Sequelize.literal(`
        "CreatedDate" = (
          SELECT MAX("CreatedDate") 
          FROM "TestSimulationModuleDrafts" AS "sub" 
          WHERE 
            "sub"."TestSimulationID" = "TestSimulationModuleDraft"."TestSimulationID" 
            AND "sub"."IsDeleted" = false
        )
      `),
        ],
      },
      order: [["CreatedDate", "DESC"]],
      transaction: t,
    });

    await t.commit();
    return res.status(200).json({
      message: "Skill Assessment list fetched successfully",
      data: {
        testSimulationList,
      },
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const deleteTestSimulationtModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID, TestSimulationID } = req.body;
  const { currentUserId } = req.payload;

  try {
    const existingTestSimulationDraft = await TestSimulationModuleDraft.findOne(
      {
        where: { ModuleTypeID, TestSimulationID, ContentID },
        order: [["CreatedDate", "DESC"]],
        transaction: t,
      }
    );

    if (!existingTestSimulationDraft) {
      await t.rollback();
      return res.status(404).json({ message: "Skill Assessment not found" });
    }

    const isUserPermissibleToDelete = await checkUserPermission(
      TestSimulationModuleDraft,
      ModuleTypeID,
      ContentID,
      "TestSimulationID",
      TestSimulationID,
      "TestSimulationDraftID",
      existingTestSimulationDraft.TestSimulationDraftID,
      currentUserId,
      t
    );

    if (!isUserPermissibleToDelete) {
      await t.rollback();
      return res.status(403).json({ message: "You are unathorized to delete" });
    }

    await Promise.all([
      TestSimulationModuleDraft.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: { ModuleTypeID, ContentID, TestSimulationID },
          transaction: t,
        }
      ),
      TestSimulationModule.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: { ModuleTypeID, ContentID, TestSimulationID },
          transaction: t,
        }
      ),
      ModuleChecker.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, TestSimulationID, ContentID }, transaction: t }
      ),
      ModuleApprover.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, TestSimulationID, ContentID }, transaction: t }
      ),
      ModuleEscalation.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, TestSimulationID, ContentID }, transaction: t }
      ),
      ModuleOwner.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, TestSimulationID, ContentID }, transaction: t }
      ),
    ]);

    await t.commit();
    return res.status(200).json({
      message: "Skill Assessment deleted successfully",
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

// SOP module
const createSOPModule = async (req, res, next) => {
  const t = await sequelize.transaction();
  const {
    ElementAttributeTypeID,
    ModuleTypeID,
    ContentID = null,
    SOPID = null,
    SOPName,
    SOPDescription,
    SOPIsActive,
    SOPTags,
    SOPOwner,
    EscalationPerson,
    EscalationType,
    EscalationAfter,
    Checker,
    Approver,
    SelfApproved,
    SOPXMLElement,
    shapeList,
    selectedElements,
    SOPExpiry = null,
    NeedAcceptance = false,
    NeedAcceptanceForApprover = false,
    IsTemplate,
    IsReactFlow,
    SOPDocID = null,
    CoOwnerUserID,
  } = req.body;

  const { currentUserId } = req.payload;
  try {
    const assignUsers = [],
      assignMaker = [...JSON.parse(JSON.stringify(SOPOwner ? SOPOwner : []))],
      assignChecker = [...JSON.parse(JSON.stringify(Checker ? Checker : []))],
      assignEscalation = [
        ...JSON.parse(JSON.stringify(EscalationPerson ? EscalationPerson : [])),
      ];
    let moduleDetails, draftDetails;
    if (SOPID) {
      moduleDetails = { SOPID, SOPName };
      let existingSopModuleDraft = await SopModuleDraft.findOne({
        where: { ModuleTypeID, SOPID, ContentID },
        order: [["CreatedDate", "DESC"]],
        transaction: t,
      });

      if (!existingSopModuleDraft) {
        await t.rollback();
        return res.status(404).json({ message: "SOP Module not found" });
      }

      existingSopModuleDraft = existingSopModuleDraft.toJSON();

      const isUserPermissibleToDelete = await checkUserPermission(
        SopModuleDraft,
        ModuleTypeID,
        ContentID,
        "SOPID",
        SOPID,
        "SOPDraftID",
        existingSopModuleDraft.SOPDraftID,
        currentUserId,
        t
      );

      if (!isUserPermissibleToDelete) {
        await t.rollback();
        return res
          .status(403)
          .json({ message: "You are unathorized to edit or publish" });
      }

      let latestDraftVersion;
      let latestMasterVersion = null;
      if (SelfApproved === "true") {
        if (existingSopModuleDraft.MasterVersion) {
          latestMasterVersion = (
            parseFloat(existingSopModuleDraft.MasterVersion) + 1.0
          ).toFixed(1);
        } else {
          latestMasterVersion = Math.ceil(
            parseFloat(existingSopModuleDraft.DraftVersion)
          ).toFixed(1);
        }

        latestDraftVersion = (parseFloat(latestMasterVersion) - 0.9).toFixed(1);
      } else {
        if (existingSopModuleDraft.MasterVersion) {
          latestDraftVersion = (
            parseFloat(existingSopModuleDraft.MasterVersion) + 0.1
          ).toFixed(1);
        } else {
          latestDraftVersion = (
            parseFloat(existingSopModuleDraft.DraftVersion) + 0.1
          ).toFixed(1);
        }
      }

      const newSopModuleDraft = await SopModuleDraft.create(
        {
          ElementAttributeTypeID,
          ModuleTypeID,
          SOPID,
          ContentID,
          SOPName,
          SOPDescription,
          SOPIsActive,
          SOPStatus: SelfApproved === "true" ? "Published" : "InProgress",
          DraftVersion: latestDraftVersion.toString(),
          MasterVersion: SelfApproved === "true" ? latestMasterVersion : null,
          SOPTags,
          SelfApproved,
          SOPXMLElement,
          CreatedBy: currentUserId,
          SOPExpiry,
          NeedAcceptance,
          NeedAcceptanceForApprover,
          IsTemplate,
          IsReactFlow,
          SOPDocID,
          CoOwnerUserID,
        },
        { transaction: t }
      );
      draftDetails = { SOPDraftID: newSopModuleDraft.SOPDraftID, SOPName };
      for (const x of shapeList) {
        const { SopDetailsID } = await SopDetails.create(
          {
            SopID: newSopModuleDraft.SOPDraftID,
            SopShapeID: x.SopShapeID,
            AttachmentIcon: x.AttachmentIcon,
            HeaderProperties: x.HeaderProperties,
            FooterProperties: x.FooterProperties,
            CreatedBy: currentUserId,
          },
          { transaction: t }
        );
        const linkedElm = selectedElements.filter(
          (y) => y.SopShapeID === x.SopShapeID
        );
        await SopAttachmentLinks.bulkCreate(
          linkedElm.map((y) => ({
            SopDetailsID,
            ContentLinkTitle: y.ContentLinkTitle,
            ContentLink: y.ContentLink,
            ContentLinkType: y.ContentLinkType,
            CreatedBy: currentUserId,
          })),
          { transaction: t }
        );
      }

      if (SelfApproved === "true") {
        await SopModule.update(
          {
            ElementAttributeTypeID,
            SOPName,
            SOPDescription,
            SOPIsActive,
            SOPTags,
            SelfApproved,
            SOPStatus: "Published",
            DraftVersion: latestDraftVersion.toString(),
            MasterVersion: latestMasterVersion,
            SOPXMLElement,
            ModifiedBy: currentUserId,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
            SOPExpiry,
            IsTemplate,
            IsReactFlow,
            SOPDocID,
          },
          {
            where: { ModuleTypeID, SOPID, ContentID },
            transaction: t,
          }
        );
        const shapeDetailsIds = [];
        for (const x of shapeList) {
          const sopDetails = await SopDetails.findOne(
            {
              where: { SopID: SOPID, SopShapeID: x.SopShapeID },
              attributes: ["SopDetailsID"],
            },
            { transaction: t }
          );
          let SopDetailsID = sopDetails?.SopDetailsID;
          if (!sopDetails) {
            const sopDetailsCreate = await SopDetails.create(
              {
                SopID: SOPID,
                SopShapeID: x.SopShapeID,
                AttachmentIcon: x.AttachmentIcon,
                HeaderProperties: x.HeaderProperties,
                FooterProperties: x.FooterProperties,
                CreatedBy: currentUserId,
              },
              { transaction: t }
            );
            SopDetailsID = sopDetailsCreate.SopDetailsID;
          }
          shapeDetailsIds.push(SopDetailsID);
          const linkedElm = selectedElements.filter(
            (y) => y.SopShapeID === x.SopShapeID
          );
          await SopAttachmentLinks.destroy(
            {
              where: {
                SopDetailsID,
              },
            },
            { transaction: t }
          );
          await SopAttachmentLinks.bulkCreate(
            linkedElm.map((y) => ({
              SopDetailsID,
              ContentLinkTitle: y.ContentLinkTitle,
              ContentLink: y.ContentLink,
              ContentLinkType: y.ContentLinkType,
              CreatedBy: currentUserId,
            })),
            { ignoreDuplicates: true, transaction: t }
          );
        }
        await SopDetails.destroy(
          {
            where: {
              SopID: SOPID,
              SopDetailsID: { [Op.notIn]: shapeDetailsIds },
            },
          },
          { transaction: t }
        );
      }

      if (SOPOwner && SOPOwner.length > 0) {
        await ModuleOwner.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              SOPID,
              ContentID,
              SOPDraftID: existingSopModuleDraft.SOPDraftID,
            },
            transaction: t,
          }
        );

        const ownerData = SOPOwner.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            SOPID,
            SOPDraftID: newSopModuleDraft.SOPDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleOwner.bulkCreate(ownerData, { transaction: t });
      }

      if (SelfApproved === "false") {
        await SopModuleDraft.update(
          { EscalationType, EscalationAfter },
          {
            where: {
              ModuleTypeID,
              SOPDraftID: newSopModuleDraft.SOPDraftID,
              SOPID,
              ContentID,
            },
            transaction: t,
          }
        );
      } else {
        await SopModuleDraft.update(
          { EscalationType: null, EscalationAfter: null },
          {
            where: {
              ModuleTypeID,
              SOPDraftID: newSopModuleDraft.SOPDraftID,
              SOPID,
              ContentID,
            },
            transaction: t,
          }
        );
      }

      if (SelfApproved === "false" && Checker && Checker.length > 0) {
        await ModuleChecker.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              SOPID,
              ContentID,
              SOPDraftID: existingSopModuleDraft.SOPDraftID,
            },
            transaction: t,
          }
        );

        const checkerData = Checker.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            SOPID,
            SOPDraftID: newSopModuleDraft.SOPDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleChecker.bulkCreate(checkerData, { transaction: t });
        sentModuleBulkEmail(checkerData, "Checker");
      } else if (SelfApproved === "true") {
        await ModuleChecker.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              SOPID,
              ContentID,
              SOPDraftID: existingSopModuleDraft.SOPDraftID,
            },
            transaction: t,
          }
        );
      }

      if (SelfApproved === "false" && Approver && Approver.length > 0) {
        await ModuleApprover.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              SOPID,
              ContentID,
              SOPDraftID: existingSopModuleDraft.SOPDraftID,
            },
            transaction: t,
          }
        );

        const approverData = Approver.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            SOPID,
            SOPDraftID: newSopModuleDraft.SOPDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleApprover.bulkCreate(approverData, { transaction: t });
      } else if (SelfApproved === "true") {
        await ModuleApprover.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              SOPID,
              ContentID,
              SOPDraftID: existingSopModuleDraft.SOPDraftID,
            },
            transaction: t,
          }
        );
      }

      if (
        SelfApproved === "false" &&
        EscalationPerson &&
        EscalationPerson.length > 0
      ) {
        await ModuleEscalation.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              SOPID,
              ContentID,
              SOPDraftID: existingSopModuleDraft.SOPDraftID,
            },
            transaction: t,
          }
        );

        const escalationData = EscalationPerson.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            SOPID,
            SOPDraftID: newSopModuleDraft.SOPDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleEscalation.bulkCreate(escalationData, { transaction: t });
      } else if (SelfApproved === "true") {
        await ModuleEscalation.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              SOPID,
              ContentID,
              SOPDraftID: existingSopModuleDraft.SOPDraftID,
            },
            transaction: t,
          }
        );
      }
    } else {
      const createdSopModule = await SopModule.create(
        {
          ElementAttributeTypeID,
          ModuleTypeID,
          SOPName,
          SOPDescription,
          SOPIsActive,
          SOPTags,
          ContentID,
          SelfApproved,
          SOPXMLElement,
          SOPStatus: SelfApproved === "true" ? "Published" : "InProgress",
          MasterVersion: SelfApproved === "true" ? "1.0" : null,
          CreatedBy: currentUserId,
          SOPExpiry,
          NeedAcceptance,
          NeedAcceptanceForApprover,
          IsTemplate,
          IsReactFlow,
          SOPDocID,
          CoOwnerUserID,
        },
        { transaction: t }
      );

      const createdSopModuleDraft = await SopModuleDraft.create(
        {
          ElementAttributeTypeID,
          ModuleTypeID,
          SOPID: createdSopModule.SOPID,
          SOPName,
          SOPDescription,
          SOPIsActive,
          SOPTags,
          DraftVersion: "0.1",
          SOPStatus: SelfApproved === "true" ? "Published" : "InProgress",
          MasterVersion: SelfApproved === "true" ? "1.0" : null,
          ContentID,
          SelfApproved,
          SOPXMLElement,
          CreatedBy: currentUserId,
          SOPExpiry,
          NeedAcceptance,
          NeedAcceptanceForApprover,
          IsTemplate,
          IsReactFlow,
          SOPDocID,
          CoOwnerUserID,
        },
        { transaction: t }
      );
      moduleDetails = { SOPID: createdSopModule.SOPID, SOPName };
      draftDetails = { SOPDraftID: createdSopModuleDraft.SOPDraftID, SOPName };
      for (const x of shapeList) {
        const { SopDetailsID } = await SopDetails.create(
          {
            SopID: createdSopModule.SOPID,
            SopShapeID: x.SopShapeID,
            AttachmentIcon: x.AttachmentIcon,
            HeaderProperties: x.HeaderProperties,
            FooterProperties: x.FooterProperties,
            CreatedBy: currentUserId,
          },
          { transaction: t }
        );
        const linkedElm = selectedElements.filter(
          (y) => y.SopShapeID === x.SopShapeID
        );
        await SopAttachmentLinks.bulkCreate(
          linkedElm.map((y) => ({
            SopDetailsID,
            ContentLinkTitle: y.ContentLinkTitle,
            ContentLink: y.ContentLink,
            ContentLinkType: y.ContentLinkType,
            CreatedBy: currentUserId,
          })),
          { ignoreDuplicates: true, transaction: t }
        );
      }
      for (const x of shapeList) {
        const { SopDetailsID } = await SopDetails.create(
          {
            SopID: createdSopModuleDraft.SOPDraftID,
            SopShapeID: x.SopShapeID,
            AttachmentIcon: x.AttachmentIcon,
            HeaderProperties: x.HeaderProperties,
            FooterProperties: x.FooterProperties,
            CreatedBy: currentUserId,
          },
          { transaction: t }
        );
        const linkedElm = selectedElements.filter(
          (y) => y.SopShapeID === x.SopShapeID
        );
        await SopAttachmentLinks.bulkCreate(
          linkedElm.map((y) => ({
            SopDetailsID,
            ContentLinkTitle: y.ContentLinkTitle,
            ContentLink: y.ContentLink,
            ContentLinkType: y.ContentLinkType,
            CreatedBy: currentUserId,
          })),
          { ignoreDuplicates: true, transaction: t }
        );
      }
      if (SOPOwner && SOPOwner.length > 0) {
        const ownerData = SOPOwner.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            SOPID: createdSopModule.SOPID,
            SOPDraftID: createdSopModuleDraft.SOPDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleOwner.bulkCreate(ownerData, { transaction: t });
      }

      if (SelfApproved === "false" && Checker && Checker.length > 0) {
        const checkerData = Checker.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            SOPID: createdSopModule.SOPID,
            SOPDraftID: createdSopModuleDraft.SOPDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleChecker.bulkCreate(checkerData, { transaction: t });
        sentModuleBulkEmail(checkerData, "Checker");
      }

      if (SelfApproved === "false" && Approver && Approver.length > 0) {
        const approverData = Approver.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            SOPID: createdSopModule.SOPID,
            SOPDraftID: createdSopModuleDraft.SOPDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleApprover.bulkCreate(approverData, { transaction: t });
      }

      if (
        SelfApproved === "false" &&
        EscalationPerson &&
        EscalationPerson.length > 0
      ) {
        const escalationData = EscalationPerson.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            SOPID: createdSopModule.SOPID,
            SOPDraftID: createdSopModuleDraft.SOPDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });
        await ModuleEscalation.bulkCreate(escalationData, { transaction: t });
      }

      if (SelfApproved === "false") {
        await SopModule.update(
          { EscalationType, EscalationAfter },
          {
            where: {
              ModuleTypeID,
              ContentID,
              SOPID: createdSopModule.SOPID,
            },
            transaction: t,
          }
        );
        await SopModuleDraft.update(
          { EscalationType, EscalationAfter },
          {
            where: {
              ModuleTypeID,
              ContentID,
              SOPID: createdSopModule.SOPID,
              SOPDraftID: createdSopModuleDraft.SOPDraftID,
            },
            transaction: t,
          }
        );
      }
    }
    const notififactionBulk = [];
    if (SelfApproved == "true") {
      const modulelinks = await UserModuleLink.findAll({
        where: {
          ModuleID: moduleDetails.SOPID,
          StartDate: {
            [Op.lte]: literal("CURRENT_TIMESTAMP"),
          },
          DueDate: {
            [Op.gte]: literal("CURRENT_TIMESTAMP"),
          },
        },
        attributes: ["UserID"],
      });
      for (const el of JSON.parse(JSON.stringify(modulelinks))) {
        assignUsers.push(el.UserID);
      }
      const notificationStatus = await Notification.findAll({
        where: {
          UserID: [...assignMaker, ...assignUsers],
          NotificationTypeForPublish: ["push", "both"],
        },
        attributes: ["UserID", "NotificationTypeForPublish"],
      });
      for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
        for (const UserID of assignMaker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Module Owner",
              NotificationType: "update",
              LinkedType: "SOP",
              LinkedID: moduleDetails.SOPID,
              CreatedBy: currentUserId,
            });
          }
        }
        for (const UserID of assignUsers) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Updated Element assign version is published",
              NotificationType: "assignment",
              LinkedType: "SOP",
              LinkedID: moduleDetails.SOPID,
              CreatedBy: currentUserId,
            });
          }
        }
      }
    } else {
      const notificationStatus = await Notification.findAll({
        where: {
          UserID: [...assignMaker, ...assignChecker],
          NotificationTypeForAction: ["push", "both"],
        },
        attributes: ["UserID", "NotificationTypeForAction"],
      });
      for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
        for (const UserID of assignMaker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Module InProgress Owner",
              NotificationType: "update",
              LinkedType: "SOP",
              LinkedID: draftDetails.SOPDraftID,
              CreatedBy: currentUserId,
            });
          }
        }
        for (const UserID of assignChecker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Checker",
              NotificationType: "actionable",
              LinkedType: "SOP",
              LinkedID: draftDetails.SOPDraftID,
              CreatedBy: currentUserId,
            });
          }
        }
      }
    }

    // for (const el of notififactionBulk) {
    //   await UserNotification.create(el);
    // }
    // await sendNotification(notififactionBulk);

    if (notififactionBulk.length > 0) {
      await UserNotification.bulkCreate(notififactionBulk, {
        ignoreDuplicates: true,
        transaction: t,
      });
      await sendNotification(notififactionBulk);
    }

    await t.commit();
    return res.status(201).json({ message: "SOP Module created successfully" });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const createSOPFlowModule = async (req, res, next) => {
  const t = await sequelize.transaction();
  const {
    ModuleTypeID,
    ContentID = null,
    SOPID = null,
    SOPName,
    SOPDescription,
    SOPIsActive,
    SOPTags,
    SOPOwner,
    EscalationPerson,
    EscalationType,
    EscalationAfter,
    Checker,
    Approver,
    SelfApproved,
    SOPExpiry = null,
    NeedAcceptance = false,
    IsTemplate,
    IsReactFlow,
    Nodes = [],
    Edges = [],
    NodeRoles = [],
    NodeProperties = [],
    NodeClipAttachments = [],
    NodeImageAttachments = [],
    IsSopWithWorkflow,
  } = req.body;

  const { currentUserId } = req.payload;

  const sopImagePath = path.posix.join(
    "src",
    "infrastructure",
    "media",
    "SopImage"
  );

  try {
    if (Nodes && Nodes?.length === 0) {
      await t.rollback();
      return res.status(404).json({ message: "Please create sop flow" });
    }
    if (NodeProperties && NodeProperties?.length === 0) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "Please add service to each shape" });
    }

    const assignUsers = [],
      assignMaker = [...JSON.parse(JSON.stringify(SOPOwner ? SOPOwner : []))],
      assignChecker = [...JSON.parse(JSON.stringify(Checker ? Checker : []))],
      assignEscalation = [
        ...JSON.parse(JSON.stringify(EscalationPerson ? EscalationPerson : [])),
      ];
    let moduleDetails, draftDetails;
    if (SOPID) {
      moduleDetails = { SOPID, SOPName };
      let existingSopModuleDraft = await SopModuleDraft.findOne({
        where: { ModuleTypeID, SOPID, ContentID },
        order: [["CreatedDate", "DESC"]],
        transaction: t,
      });

      if (!existingSopModuleDraft) {
        await t.rollback();
        return res.status(404).json({ message: "SOP Module not found" });
      }

      existingSopModuleDraft = existingSopModuleDraft.toJSON();

      const isUserPermissibleToDelete = await checkUserPermission(
        SopModuleDraft,
        ModuleTypeID,
        ContentID,
        "SOPID",
        SOPID,
        "SOPDraftID",
        existingSopModuleDraft.SOPDraftID,
        currentUserId,
        t
      );

      if (!isUserPermissibleToDelete) {
        await t.rollback();
        return res
          .status(403)
          .json({ message: "You are unathorized to edit or publish" });
      }

      let latestDraftVersion;
      let latestMasterVersion = null;
      if (SelfApproved === "true") {
        if (existingSopModuleDraft.MasterVersion) {
          latestMasterVersion = (
            parseFloat(existingSopModuleDraft.MasterVersion) + 1.0
          ).toFixed(1);
        } else {
          latestMasterVersion = Math.ceil(
            parseFloat(existingSopModuleDraft.DraftVersion)
          ).toFixed(1);
        }

        latestDraftVersion = (parseFloat(latestMasterVersion) - 0.9).toFixed(1);
      } else {
        if (existingSopModuleDraft.MasterVersion) {
          latestDraftVersion = (
            parseFloat(existingSopModuleDraft.MasterVersion) + 0.1
          ).toFixed(1);
        } else {
          latestDraftVersion = (
            parseFloat(existingSopModuleDraft.DraftVersion) + 0.1
          ).toFixed(1);
        }
      }

      const newSopModuleDraft = await SopModuleDraft.create(
        {
          ModuleTypeID,
          SOPID,
          ContentID,
          SOPName,
          SOPDescription,
          SOPIsActive,
          SOPStatus: SelfApproved === "true" ? "Published" : "InProgress",
          DraftVersion: latestDraftVersion.toString(),
          MasterVersion: SelfApproved === "true" ? latestMasterVersion : null,
          SOPTags,
          SelfApproved,
          CreatedBy: currentUserId,
          SOPExpiry,
          NeedAcceptance,
          IsTemplate,
          IsReactFlow,
          IsSopWithWorkflow,
        },
        { transaction: t }
      );

      const createdSopFlow = await SopFlow.create(
        {
          SOPID: SOPID,
          SOPDraftID: newSopModuleDraft.SOPDraftID,
          Nodes: Nodes,
          Edges: Edges,
          CreatedBy: currentUserId,
        },
        {
          transaction: t,
        }
      );

      if (NodeRoles && NodeRoles.length > 0) {
        const nodeRoles = NodeRoles.map((x) => ({
          SOPID: SOPID,
          SOPDraftID: newSopModuleDraft.SOPDraftID,
          SopFlowID: createdSopFlow.SopFlowID,
          NodeID: x.id,
          RoleID: x.roleID,
          CreatedBy: currentUserId,
        }));

        if (nodeRoles && nodeRoles?.length > 0) {
          await SopFlowNodeRole.bulkCreate(nodeRoles, { transaction: t });
        }
      }

      if (NodeProperties && NodeProperties.length > 0) {
        const nodeProperties = NodeProperties.map((x) => ({
          SOPID: SOPID,
          SOPDraftID: newSopModuleDraft.SOPDraftID,
          SopFlowID: createdSopFlow.SopFlowID,
          NodeID: x.id,
          ServiceID: x.serviceID,
          NodeProperties: x.properties,
          CreatedBy: currentUserId,
        }));

        const nodePropertiesLength = nodeProperties && nodeProperties?.length;
        const nodesLength = Nodes && Nodes?.length;

        if (nodePropertiesLength !== nodesLength) {
          await t.rollback();
          return res
            .status(400)
            .json({ message: "Please add service to each shape" });
        }

        if (nodePropertiesLength > 0) {
          await SopFlowNodeDetail.bulkCreate(nodeProperties, {
            transaction: t,
          });
        }
      }

      const flowAttachments = [];

      if (NodeClipAttachments && NodeClipAttachments.length > 0) {
        const attachments = NodeClipAttachments.map((x) => ({
          SOPID: SOPID,
          SOPDraftID: newSopModuleDraft.SOPDraftID,
          SopFlowID: createdSopFlow.SopFlowID,
          NodeID: x.id,
          IsClip: true,
          AttachmentTitle: x.attachmentTitle,
          AttachmentLink: x.attachmentLink,
          AttachmentType: x.attachmentType,
          CreatedBy: currentUserId,
        }));

        flowAttachments.push(...attachments);
      }

      if (NodeImageAttachments && NodeImageAttachments.length > 0) {
        const attachments = NodeImageAttachments.map((x) => {
          const imageBasename = path.basename(x.attachmentLink);
          const imagePath = path.posix.join(sopImagePath, imageBasename);

          return {
            SOPID: SOPID,
            SOPDraftID: newSopModuleDraft.SOPDraftID,
            SopFlowID: createdSopFlow.SopFlowID,
            NodeID: x.id,
            IsImage: true,
            AttachmentTitle: x.attachmentTitle,
            AttachmentLink: imagePath,
            AttachmentType: x.attachmentType,
            CreatedBy: currentUserId,
          };
        });

        flowAttachments.push(...attachments);
      }

      if (flowAttachments && flowAttachments?.length > 0) {
        await SopFlowNodeAttachment.bulkCreate(flowAttachments, {
          transaction: t,
        });
      }

      draftDetails = { SOPDraftID: newSopModuleDraft.SOPDraftID, SOPName };

      if (SelfApproved === "true") {
        await SopModule.update(
          {
            SOPName,
            SOPDescription,
            SOPIsActive,
            SOPTags,
            SelfApproved,
            SOPStatus: "Published",
            DraftVersion: latestDraftVersion.toString(),
            MasterVersion: latestMasterVersion,
            ModifiedBy: currentUserId,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
            SOPExpiry,
            IsTemplate,
            IsReactFlow,
            IsSopWithWorkflow,
          },
          {
            where: { ModuleTypeID, SOPID, ContentID },
            transaction: t,
          }
        );
      }

      if (SOPOwner && SOPOwner.length > 0) {
        await ModuleOwner.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              SOPID,
              ContentID,
              SOPDraftID: existingSopModuleDraft.SOPDraftID,
            },
            transaction: t,
          }
        );

        const ownerData = SOPOwner.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            SOPID,
            SOPDraftID: newSopModuleDraft.SOPDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleOwner.bulkCreate(ownerData, { transaction: t });
      }

      if (SelfApproved === "false") {
        await SopModuleDraft.update(
          { EscalationType, EscalationAfter },
          {
            where: {
              ModuleTypeID,
              SOPDraftID: newSopModuleDraft.SOPDraftID,
              SOPID,
              ContentID,
            },
            transaction: t,
          }
        );
      } else {
        await SopModuleDraft.update(
          { EscalationType: null, EscalationAfter: null },
          {
            where: {
              ModuleTypeID,
              SOPDraftID: newSopModuleDraft.SOPDraftID,
              SOPID,
              ContentID,
            },
            transaction: t,
          }
        );
      }

      if (SelfApproved === "false" && Checker && Checker.length > 0) {
        await ModuleChecker.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              SOPID,
              ContentID,
              SOPDraftID: existingSopModuleDraft.SOPDraftID,
            },
            transaction: t,
          }
        );

        const checkerData = Checker.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            SOPID,
            SOPDraftID: newSopModuleDraft.SOPDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleChecker.bulkCreate(checkerData, { transaction: t });
        sentModuleBulkEmail(checkerData, "Checker");
      } else if (SelfApproved === "true") {
        await ModuleChecker.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              SOPID,
              ContentID,
              SOPDraftID: existingSopModuleDraft.SOPDraftID,
            },
            transaction: t,
          }
        );
      }

      if (SelfApproved === "false" && Approver && Approver.length > 0) {
        await ModuleApprover.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              SOPID,
              ContentID,
              SOPDraftID: existingSopModuleDraft.SOPDraftID,
            },
            transaction: t,
          }
        );

        const approverData = Approver.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            SOPID,
            SOPDraftID: newSopModuleDraft.SOPDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleApprover.bulkCreate(approverData, { transaction: t });
      } else if (SelfApproved === "true") {
        await ModuleApprover.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              SOPID,
              ContentID,
              SOPDraftID: existingSopModuleDraft.SOPDraftID,
            },
            transaction: t,
          }
        );
      }

      if (
        SelfApproved === "false" &&
        EscalationPerson &&
        EscalationPerson.length > 0
      ) {
        await ModuleEscalation.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              SOPID,
              ContentID,
              SOPDraftID: existingSopModuleDraft.SOPDraftID,
            },
            transaction: t,
          }
        );

        const escalationData = EscalationPerson.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            SOPID,
            SOPDraftID: newSopModuleDraft.SOPDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleEscalation.bulkCreate(escalationData, { transaction: t });
      } else if (SelfApproved === "true") {
        await ModuleEscalation.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              SOPID,
              ContentID,
              SOPDraftID: existingSopModuleDraft.SOPDraftID,
            },
            transaction: t,
          }
        );
      }
    } else {
      const createdSopModule = await SopModule.create(
        {
          ModuleTypeID,
          SOPName,
          SOPDescription,
          SOPIsActive,
          SOPTags,
          ContentID,
          SelfApproved,
          SOPStatus: SelfApproved === "true" ? "Published" : "InProgress",
          MasterVersion: SelfApproved === "true" ? "1.0" : null,
          CreatedBy: currentUserId,
          SOPExpiry,
          NeedAcceptance,
          IsTemplate,
          IsReactFlow,
          IsSopWithWorkflow,
        },
        { transaction: t }
      );

      const createdSopModuleDraft = await SopModuleDraft.create(
        {
          ModuleTypeID,
          SOPID: createdSopModule.SOPID,
          SOPName,
          SOPDescription,
          SOPIsActive,
          SOPTags,
          DraftVersion: "0.1",
          SOPStatus: SelfApproved === "true" ? "Published" : "InProgress",
          MasterVersion: SelfApproved === "true" ? "1.0" : null,
          ContentID,
          SelfApproved,
          CreatedBy: currentUserId,
          SOPExpiry,
          NeedAcceptance,
          IsTemplate,
          IsReactFlow,
          IsSopWithWorkflow,
        },
        { transaction: t }
      );

      moduleDetails = { SOPID: createdSopModule.SOPID, SOPName };
      draftDetails = { SOPDraftID: createdSopModuleDraft.SOPDraftID, SOPName };

      const createdSopFlow = await SopFlow.create(
        {
          SOPID: createdSopModule.SOPID,
          SOPDraftID: createdSopModuleDraft.SOPDraftID,
          Nodes: Nodes,
          Edges: Edges,
          CreatedBy: currentUserId,
        },
        {
          transaction: t,
        }
      );

      if (NodeRoles && NodeRoles.length > 0) {
        const nodeRoles = NodeRoles.map((x) => ({
          SOPID: createdSopModule.SOPID,
          SOPDraftID: createdSopModuleDraft.SOPDraftID,
          SopFlowID: createdSopFlow.SopFlowID,
          NodeID: x.id,
          RoleID: x.roleID,
          CreatedBy: currentUserId,
        }));

        if (nodeRoles && nodeRoles?.length > 0) {
          await SopFlowNodeRole.bulkCreate(nodeRoles, { transaction: t });
        }
      }

      if (NodeProperties && NodeProperties.length > 0) {
        const nodeProperties = NodeProperties.map((x) => ({
          SOPID: createdSopModule.SOPID,
          SOPDraftID: createdSopModuleDraft.SOPDraftID,
          SopFlowID: createdSopFlow.SopFlowID,
          NodeID: x.id,
          ServiceID: x.serviceID,
          NodeProperties: x.properties,
          CreatedBy: currentUserId,
        }));

        const nodePropertiesLength = nodeProperties && nodeProperties?.length;
        const nodesLength = Nodes && Nodes?.length;

        if (nodePropertiesLength !== nodesLength) {
          await t.rollback();
          return res
            .status(400)
            .json({ message: "Please add service to each shape" });
        }

        if (nodePropertiesLength > 0) {
          await SopFlowNodeDetail.bulkCreate(nodeProperties, {
            transaction: t,
          });
        }
      }

      const flowAttachments = [];

      if (NodeClipAttachments && NodeClipAttachments.length > 0) {
        const attachments = NodeClipAttachments.map((x) => ({
          SOPID: createdSopModule.SOPID,
          SOPDraftID: createdSopModuleDraft.SOPDraftID,
          SopFlowID: createdSopFlow.SopFlowID,
          NodeID: x.id,
          IsClip: true,
          AttachmentTitle: x.attachmentTitle,
          AttachmentLink: x.attachmentLink,
          AttachmentType: x.attachmentType,
          CreatedBy: currentUserId,
        }));

        flowAttachments.push(...attachments);
      }

      if (NodeImageAttachments && NodeImageAttachments.length > 0) {
        const attachments = NodeImageAttachments.map((x) => {
          const imageBasename = path.basename(x.attachmentLink);
          const imagePath = path.posix.join(sopImagePath, imageBasename);

          return {
            SOPID: createdSopModule.SOPID,
            SOPDraftID: createdSopModuleDraft.SOPDraftID,
            SopFlowID: createdSopFlow.SopFlowID,
            NodeID: x.id,
            IsImage: true,
            AttachmentTitle: x.attachmentTitle,
            AttachmentLink: imagePath,
            AttachmentType: x.attachmentType,
            CreatedBy: currentUserId,
          };
        });

        flowAttachments.push(...attachments);
      }

      if (flowAttachments && flowAttachments?.length > 0) {
        await SopFlowNodeAttachment.bulkCreate(flowAttachments, {
          transaction: t,
        });
      }

      if (SOPOwner && SOPOwner.length > 0) {
        const ownerData = SOPOwner.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            SOPID: createdSopModule.SOPID,
            SOPDraftID: createdSopModuleDraft.SOPDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleOwner.bulkCreate(ownerData, { transaction: t });
      }

      if (SelfApproved === "false" && Checker && Checker.length > 0) {
        const checkerData = Checker.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            SOPID: createdSopModule.SOPID,
            SOPDraftID: createdSopModuleDraft.SOPDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleChecker.bulkCreate(checkerData, { transaction: t });
        sentModuleBulkEmail(checkerData, "Checker");
      }
      if (SelfApproved === "false" && Approver && Approver.length > 0) {
        const approverData = Approver.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            SOPID: createdSopModule.SOPID,
            SOPDraftID: createdSopModuleDraft.SOPDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleApprover.bulkCreate(approverData, { transaction: t });
      }
      if (
        SelfApproved === "false" &&
        EscalationPerson &&
        EscalationPerson.length > 0
      ) {
        const escalationData = EscalationPerson.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            SOPID: createdSopModule.SOPID,
            SOPDraftID: createdSopModuleDraft.SOPDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });
        await ModuleEscalation.bulkCreate(escalationData, { transaction: t });
      }

      if (SelfApproved === "false") {
        await SopModule.update(
          { EscalationType, EscalationAfter },
          {
            where: {
              ModuleTypeID,
              ContentID,
              SOPID: createdSopModule.SOPID,
            },
            transaction: t,
          }
        );
        await SopModuleDraft.update(
          { EscalationType, EscalationAfter },
          {
            where: {
              ModuleTypeID,
              ContentID,
              SOPID: createdSopModule.SOPID,
              SOPDraftID: createdSopModuleDraft.SOPDraftID,
            },
            transaction: t,
          }
        );
      }
    }
    const notififactionBulk = [];
    if (SelfApproved == "true") {
      const modulelinks = await UserModuleLink.findAll({
        where: {
          ModuleID: moduleDetails.SOPID,
          StartDate: {
            [Op.lte]: literal("CURRENT_TIMESTAMP"),
          },
          DueDate: {
            [Op.gte]: literal("CURRENT_TIMESTAMP"),
          },
        },
        attributes: ["UserID"],
      });
      for (const el of JSON.parse(JSON.stringify(modulelinks))) {
        assignUsers.push(el.UserID);
      }
      const notificationStatus = await Notification.findAll({
        where: {
          UserID: [...assignMaker, ...assignUsers],
          NotificationTypeForPublish: ["push", "both"],
        },
        attributes: ["UserID", "NotificationTypeForPublish"],
      });
      for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
        for (const UserID of assignMaker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Module Owner",
              NotificationType: "update",
              LinkedType: "SOP",
              LinkedID: moduleDetails.SOPID,
              CreatedBy: currentUserId,
            });
          }
        }
        for (const UserID of assignUsers) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Updated Element assign version is published",
              NotificationType: "assignment",
              LinkedType: "SOP",
              LinkedID: moduleDetails.SOPID,
              CreatedBy: currentUserId,
            });
          }
        }
      }
    } else {
      const notificationStatus = await Notification.findAll({
        where: {
          UserID: [...assignMaker, ...assignChecker],
          NotificationTypeForAction: ["push", "both"],
        },
        attributes: ["UserID", "NotificationTypeForAction"],
      });
      for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
        for (const UserID of assignMaker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Module InProgress Owner",
              NotificationType: "update",
              LinkedType: "SOP",
              LinkedID: draftDetails.SOPDraftID,
              CreatedBy: currentUserId,
            });
          }
        }
        for (const UserID of assignChecker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Checker",
              NotificationType: "actionable",
              LinkedType: "SOP",
              LinkedID: draftDetails.SOPDraftID,
              CreatedBy: currentUserId,
            });
          }
        }
      }
    }

    // for (const el of notififactionBulk) {
    //   await UserNotification.create(el);
    // }
    // await sendNotification(notififactionBulk);

    if (notififactionBulk.length > 0) {
      await UserNotification.bulkCreate(notififactionBulk, {
        ignoreDuplicates: true,
        transaction: t,
      });
      await sendNotification(notififactionBulk);
    }

    const payload = {
      SOPID: moduleDetails?.SOPID,
      ModuleTypeID,
      ContentID,
    };

    await t.commit();
    return res
      .status(201)
      .json({ message: "SOP Module created successfully", data: payload });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const publishSOPModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, SOPID, ContentID, AuthorizedToPublish = "" } = req.body;
  const { currentUserId } = req.payload;

  try {
    let existingSopModuleDraft = await SopModuleDraft.findOne({
      where: { ModuleTypeID, SOPID, ContentID },
      order: [["CreatedDate", "DESC"]], // Order by the creation date to get the last record
      transaction: t,
    });

    if (!existingSopModuleDraft) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "Sop Module InProgress not found" });
    }
    const existingSopDetailsDraft = await SopDetails.findAll(
      {
        where: { SopID: existingSopModuleDraft.SOPID },
        include: {
          model: SopAttachmentLinks,
          as: "SopAttachmentLinks",
          required: false,
          attributes: {
            exclude: ["CreatedBy", "CreatedDate", "ModifiedDate", "ModifiedBy"],
          },
        },
      },
      { transaction: t }
    );
    existingSopModuleDraft = existingSopModuleDraft.toJSON();

    const isUserPermissibleToDelete =
      AuthorizedToPublish === "true"
        ? true
        : await checkUserPermission(
            SopModuleDraft,
            ModuleTypeID,
            ContentID,
            "SOPID",
            SOPID,
            "SOPDraftID",
            existingSopModuleDraft.SOPDraftID,
            currentUserId,
            t
          );

    if (!isUserPermissibleToDelete) {
      await t.rollback();
      return res
        .status(403)
        .json({ message: "You are unathorized to publish" });
    }

    const parsedDraftVersion = parseFloat(existingSopModuleDraft.DraftVersion);

    const latestMasterVersion = Math.ceil(parsedDraftVersion).toFixed(1);
    await sequelize.query(
      `WITH deleted_details AS (
            DELETE FROM "SopDetails"
            WHERE "SopID" = :SOPID
            RETURNING "SopDetailsID"
        )
        DELETE FROM "SopAttachmentLinks"
        WHERE "SopDetailsID" IN (SELECT "SopDetailsID" FROM deleted_details);`,
      {
        type: QueryTypes.DELETE,
        replacements: { SOPID },
        transaction: t,
      }
    );

    for (const x of JSON.parse(JSON.stringify(existingSopDetailsDraft))) {
      const { SopDetailsID } = await SopDetails.create(
        {
          SopID: SOPID,
          SopShapeID: x.SopShapeID,
          AttachmentIcon: x.AttachmentIcon,
          HeaderProperties: x.HeaderProperties,
          FooterProperties: x.FooterProperties,
          CreatedBy: currentUserId,
        },
        { transaction: t }
      );

      const linkedElm = [];
      for (const el of x?.SopAttachmentLinks) {
        linkedElm.push({
          SopDetailsID,
          ContentLinkTitle: el.ContentLinkTitle,
          ContentLink: el.ContentLink,
          ContentLinkType: el.ContentLinkType,
          CreatedBy: currentUserId,
        });
      }
      await SopAttachmentLinks.bulkCreate(linkedElm, {
        ignoreDuplicates: true,
        transaction: t,
      });
    }

    await Promise.all([
      SopModule.update(
        {
          ElementAttributeTypeID: existingSopModuleDraft.ElementAttributeTypeID,
          SOPName: existingSopModuleDraft.SOPName,
          SOPDescription: existingSopModuleDraft.SOPDescription,
          SOPStatus: "Published",
          SOPIsActive: existingSopModuleDraft.SOPIsActive,
          SOPTags: existingSopModuleDraft.SOPTags,
          EscalationType: existingSopModuleDraft.EscalationType,
          EscalationAfter: existingSopModuleDraft.EscalationAfter,
          SelfApproved: existingSopModuleDraft.SelfApproved,
          DraftVersion: existingSopModuleDraft.DraftVersion,
          SOPExpiry: existingSopModuleDraft.SOPExpiry,
          SOPXMLElement: existingSopModuleDraft.SOPXMLElement,
          MasterVersion: latestMasterVersion,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
          NeedAcceptance: existingSopModuleDraft.NeedAcceptance,
          IsTemplate: existingSopModuleDraft.IsTemplate,
          SOPDocID: existingSopModuleDraft.SOPDocID,
          TemplateFontFamly: existingSopModuleDraft.TemplateFontFamly,
          TemplateFooter: existingSopModuleDraft.TemplateFooter,
          TemplateHeader: existingSopModuleDraft.TemplateHeader,
          CoOwnerUserID: existingSopModuleDraft.CoOwnerUserID,
        },
        { where: { ModuleTypeID, SOPID, ContentID }, transaction: t }
      ),
      SopModuleDraft.update(
        {
          SOPStatus: "Published",
          MasterVersion: latestMasterVersion,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: {
            ModuleTypeID,
            SOPDraftID: existingSopModuleDraft.SOPDraftID,
            SOPID,
            ContentID,
          },
          transaction: t,
        }
      ),
    ]);
    const modulelinks = await UserModuleLink.findAll({
      where: {
        ModuleID: SOPID,
        StartDate: {
          [Op.lte]: literal("CURRENT_TIMESTAMP"),
        },
        DueDate: {
          [Op.gte]: literal("CURRENT_TIMESTAMP"),
        },
      },
      attributes: ["UserID"],
    });
    const assignUsers = [],
      notififactionBulk = [];
    for (const el of JSON.parse(JSON.stringify(modulelinks))) {
      assignUsers.push(el.UserID);
    }
    const notificationStatus = await Notification.findAll({
      where: {
        UserID: [...assignUsers, currentUserId],
        NotificationTypeForPublish: ["push", "both"],
      },
      attributes: ["UserID", "NotificationTypeForPublish"],
    });
    for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
      for (const UserID of assignUsers) {
        if (UserID == el.UserID) {
          notififactionBulk.push({
            UserID: el.UserID,
            Message: "Updated Element assign version is published",
            NotificationType: "assignment",
            LinkedType: "SOP",
            LinkedID: SOPID,
            CreatedBy: currentUserId,
          });
        }
      }
    }

    // for (const el of notififactionBulk) {
    //   await UserNotification.create(el);
    // }
    // await sendNotification(notififactionBulk);

    if (notififactionBulk.length > 0) {
      await UserNotification.bulkCreate(notififactionBulk, {
        ignoreDuplicates: true,
        transaction: t,
      });
      await sendNotification(notififactionBulk);
    }

    await t.commit();
    return res.status(200).json({ message: "SOP Status updated successfully" });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const publishSOPFlowModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, SOPID, ContentID } = req.body;
  const { currentUserId } = req.payload;

  try {
    let existingSopModuleDraft = await SopModuleDraft.findOne({
      where: { ModuleTypeID, SOPID, ContentID },
      order: [["CreatedDate", "DESC"]], // Order by the creation date to get the last record
      transaction: t,
    });

    if (!existingSopModuleDraft) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "Sop Module InProgress not found" });
    }

    existingSopModuleDraft = existingSopModuleDraft.toJSON();

    const isUserPermissibleToDelete = await checkUserPermission(
      SopModuleDraft,
      ModuleTypeID,
      ContentID,
      "SOPID",
      SOPID,
      "SOPDraftID",
      existingSopModuleDraft.SOPDraftID,
      currentUserId,
      t
    );

    if (!isUserPermissibleToDelete) {
      await t.rollback();
      return res
        .status(403)
        .json({ message: "You are unathorized to publish" });
    }

    const parsedDraftVersion = parseFloat(existingSopModuleDraft.DraftVersion);

    const latestMasterVersion = Math.ceil(parsedDraftVersion).toFixed(1);

    await Promise.all([
      SopModule.update(
        {
          SOPName: existingSopModuleDraft.SOPName,
          SOPDescription: existingSopModuleDraft.SOPDescription,
          SOPStatus: "Published",
          SOPIsActive: existingSopModuleDraft.SOPIsActive,
          SOPTags: existingSopModuleDraft.SOPTags,
          EscalationType: existingSopModuleDraft.EscalationType,
          EscalationAfter: existingSopModuleDraft.EscalationAfter,
          SelfApproved: existingSopModuleDraft.SelfApproved,
          DraftVersion: existingSopModuleDraft.DraftVersion,
          SOPExpiry: existingSopModuleDraft.SOPExpiry,
          MasterVersion: latestMasterVersion,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
          NeedAcceptance: existingSopModuleDraft.NeedAcceptance,
          IsTemplate: existingSopModuleDraft.IsTemplate,
          IsSopWithWorkflow: existingSopModuleDraft.IsSopWithWorkflow,
          CoOwnerUserID: existingSopModuleDraft.CoOwnerUserID,
        },
        { where: { ModuleTypeID, SOPID, ContentID }, transaction: t }
      ),
      SopModuleDraft.update(
        {
          SOPStatus: "Published",
          MasterVersion: latestMasterVersion,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: {
            ModuleTypeID,
            SOPDraftID: existingSopModuleDraft.SOPDraftID,
            SOPID,
            ContentID,
          },
          transaction: t,
        }
      ),
    ]);
    const modulelinks = await UserModuleLink.findAll({
      where: {
        ModuleID: SOPID,
        StartDate: {
          [Op.lte]: literal("CURRENT_TIMESTAMP"),
        },
        DueDate: {
          [Op.gte]: literal("CURRENT_TIMESTAMP"),
        },
      },
      attributes: ["UserID"],
    });
    const assignUsers = [],
      notififactionBulk = [];
    for (const el of JSON.parse(JSON.stringify(modulelinks))) {
      assignUsers.push(el.UserID);
    }
    const notificationStatus = await Notification.findAll({
      where: {
        UserID: [...assignUsers, currentUserId],
        NotificationTypeForPublish: ["push", "both"],
      },
      attributes: ["UserID", "NotificationTypeForPublish"],
    });
    for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
      for (const UserID of assignMaker) {
        if (UserID == el.UserID) {
          notififactionBulk.push({
            UserID: el.UserID,
            Message: "Updated Element assign version is published",
            NotificationType: "assignment",
            LinkedType: "SOP",
            LinkedID: SOPID,
            CreatedBy: currentUserId,
          });
        }
      }
    }

    // for (const el of notififactionBulk) {
    //   await UserNotification.create(el);
    // }
    // await sendNotification(notififactionBulk);

    if (notififactionBulk.length > 0) {
      await UserNotification.bulkCreate(notififactionBulk, {
        ignoreDuplicates: true,
        transaction: t,
      });
      await sendNotification(notififactionBulk);
    }

    await t.commit();
    return res.status(200).json({ message: "SOP Status updated successfully" });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const viewSOPModuleDraft = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID, SOPID } = req.body;

  try {
    const sopModuleDraft = await SopModuleDraft.findOne({
      where: {
        ModuleTypeID,
        SOPID,
        ContentID,
        IsDeleted: false,
      },
      include: [
        {
          model: ModuleChecker,
          as: "Checkers",
          required: false, // This ensures sopModuleDraft is returned even if ModuleChecker doesn't exist
          where: {
            IsDeleted: false, // Include only if not deleted
          },
          attributes: ["UserID"],
        },
        {
          model: ModuleEscalation,
          as: "EscalationPersons",
          required: false, // This ensures sopModuleDraft is returned even if ModuleEscalation doesn't exist
          where: {
            IsDeleted: false, // Include only if not deleted
          },
          attributes: ["UserID"],
        },
        {
          model: ModuleOwner,
          as: "ModuleOwners",
          required: false,
          where: {
            IsDeleted: false,
          },
          attributes: ["UserID"],
        },
        {
          model: ModuleApprover,
          as: "Approvers",
          required: false,
          where: {
            IsDeleted: false,
          },
          attributes: ["UserID"],
        },
        {
          model: SopDetails,
          as: "SopDetails",
          required: false,
          attributes: [
            "SopDetailsID",
            "SopID",
            "SopShapeID",
            "AttachmentIcon",
            "HeaderProperties",
            "FooterProperties",
            "IsActive",
            "CreatedBy",
            "CreatedDate",
            "ModifiedBy",
            "ModifiedDate",
          ],
          include: [
            {
              model: SopAttachmentLinks,
              as: "SopAttachmentLinks",
              required: false,
              attributes: [
                "SopDetailsID",
                "ContentLinkTitle",
                "ContentLink",
                "ContentLinkType",
                "CreatedBy",
                "CreatedDate",
              ],
            },
          ],
        },
        {
          model: DocumentModule,
          required: false,
          attributes: ["DocumentPath", "DocumentName"],
        },
      ],
      order: [["CreatedDate", "DESC"]],
      transaction: t,
    });

    if (!sopModuleDraft) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "Sop simulation draft not found" });
    }
    const jsonSopDraft = JSON.parse(JSON.stringify(sopModuleDraft));
    if (jsonSopDraft?.SOPStatus === "InProgress") {
      const data = await sequelize.query(
        `
        SELECT
              JSONB_AGG(
                DISTINCT JSONB_BUILD_OBJECT('UserID', C."UserID", 'ApprovalStatus', CASE WHEN C."SOPDraftID" = :SOPDraftID THEN  C."ApprovalStatus" ELSE NULL END)
              ) FILTER (
                WHERE
                  C."UserID" IS NOT NULL
              ) AS "MC",
              JSONB_AGG(
                DISTINCT JSONB_BUILD_OBJECT(
                  'UserID',
                  E."UserID",
                  'ApprovalStatus',
                  CASE WHEN E."SOPDraftID" = :SOPDraftID THEN  E."ApprovalStatus" ELSE NULL END
                )
              ) FILTER (
                WHERE
                  E."UserID" IS NOT NULL
              ) AS "ME",
              JSONB_AGG(
                DISTINCT JSONB_BUILD_OBJECT('UserID', A."UserID", 'ApprovalStatus', CASE WHEN A."SOPDraftID" = :SOPDraftID THEN  A."ApprovalStatus" ELSE NULL END)
              ) FILTER (
                WHERE
                  A."UserID" IS NOT NULL
              ) AS "MA"
            FROM
              "SopModuleDrafts" D
              LEFT JOIN "ModuleCheckers" C ON C."SOPDraftID" = D."SOPDraftID"
              LEFT JOIN "ModuleEscalations" E ON E."SOPDraftID" = D."SOPDraftID"
              LEFT JOIN "ModuleApprovers" A ON A."SOPDraftID" = D."SOPDraftID"
            WHERE
              D."SOPID" = :SOPID
              AND D."MasterVersion" ${
                jsonSopDraft?.MasterVersion
                  ? `= '${jsonSopDraft?.MasterVersion}'`
                  : "IS NULL"
              }; 
        `,
        {
          type: QueryTypes.SELECT,
          transaction: t,
          replacements: {
            SOPID: jsonSopDraft?.SOPID,
            SOPDraftID: jsonSopDraft?.SOPDraftID,
          },
        }
      );
      const uniqueData = (values) => {
        return Object.values(
          values.reduce((acc, item) => {
            const existing = acc[item.UserID];
            if (!existing) {
              acc[item.UserID] = item;
            } else if (!existing.ApprovalStatus && item.ApprovalStatus) {
              acc[item.UserID] = item;
            }
            return acc;
          }, {})
        );
      };
      if (data && data.length > 0) {
        jsonSopDraft.Checkers = uniqueData(data[0].MC || []);
        jsonSopDraft.EscalationPersons = uniqueData(data[0].ME || []);
        jsonSopDraft.Approvers = uniqueData(data[0].MA || []);
      }
    }

    // Fetch master SopModule with all SopDetails to ensure complete data
    if (jsonSopDraft?.SOPID) {
      const masterSopModule = await SopModule.findOne({
        where: { SOPID: jsonSopDraft.SOPID },
        include: [
          {
            model: SopDetails,
            as: "SOPDetails",
            attributes: [
              "SopDetailsID",
              "SopID",
              "SopShapeID",
              "AttachmentIcon",
              "HeaderProperties",
              "FooterProperties",
              "IsActive",
              "CreatedBy",
              "CreatedDate",
              "ModifiedBy",
              "ModifiedDate",
            ],
            include: [
              {
                model: SopAttachmentLinks,
                as: "SopAttachmentLinks",
                required: false,
                attributes: [
                  "SopDetailsID",
                  "ContentLinkTitle",
                  "ContentLink",
                  "ContentLinkType",
                  "CreatedBy",
                  "CreatedDate",
                ],
              },
            ],
          },
        ],
        transaction: t,
      });

      // Merge master SOPDetails into jsonSopDraft
      if (masterSopModule && masterSopModule.SOPDetails) {
        jsonSopDraft.SopDetails = masterSopModule.SOPDetails;
      }
    }

    await t.commit();
    return res.status(200).json({
      message: "Sop draft fetched successfully",
      data: {
        sopModuleDraft: jsonSopDraft,
      },
    });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const viewSOPFlowModuleDraft = async (req, res, next) => {
  const { ModuleTypeID, ContentID, SOPID } = req.body;
  const { currentUserId, lincense } = req.payload;
  try {
    const sopModuleDraft = await SopModuleDraft.findOne({
      where: {
        [Op.or]: [
          {
            SOPDraftID: SOPID,
          },
          {
            SOPID: SOPID,
          },
        ],
        ModuleTypeID,
        ContentID,
        IsDeleted: false,
      },
      include: [
        {
          model: Users,
          as: "CreatedByUser",
          include: [
            {
              model: UserDetails,
              as: "UserDetail",
              attributes: ["UserFirstName", "UserLastName"],
            },
          ],
          attributes: ["UserID"],
        },
        {
          model: Users,
          as: "ModifiedByUser",
          include: [
            {
              model: UserDetails,
              as: "UserDetail",
              attributes: ["UserFirstName", "UserLastName"],
            },
          ],
          attributes: ["UserID"],
        },
        {
          model: ModuleChecker,
          separate: true,
          as: "Checkers",
          required: false, // This ensures sopModuleDraft is returned even if ModuleChecker doesn't exist
          where: {
            IsDeleted: false, // Include only if not deleted
          },
          attributes: ["UserID"],
          include: [
            {
              model: Users,
              as: "ModuleCheckerUser",
              attributes: ["UserID", "UserName"],
            },
          ],
        },
        {
          model: ModuleEscalation,
          as: "EscalationPersons",
          separate: true,
          required: false, // This ensures sopModuleDraft is returned even if ModuleEscalation doesn't exist
          where: {
            IsDeleted: false, // Include only if not deleted
          },
          attributes: ["UserID"],
          include: [
            {
              model: Users,
              as: "ModuleEscalationUser",
              attributes: ["UserID", "UserName"],
            },
          ],
        },
        {
          model: ModuleOwner,
          as: "ModuleOwners",
          separate: true,
          required: false,
          where: {
            IsDeleted: false,
          },
          attributes: ["UserID"],
          include: [
            {
              model: Users,
              as: "ModuleOwnerUser",
              attributes: ["UserID", "UserName"],
            },
          ],
        },
        {
          model: SopFlow,
          include: [
            {
              model: SopFlowNodeAttachment,
              separate: true,
              attributes: [
                "NodeID",
                "IsClip",
                "IsImage",
                "AttachmentTitle",
                "AttachmentLink",
                "AttachmentType",
              ],
            },
            {
              model: SopFlowNodeDetail,
              separate: true,
              attributes: ["NodeID", "ServiceID", "NodeProperties"],
            },
            {
              model: SopFlowNodeRole,
              separate: true,
              attributes: ["NodeID", "RoleID"],
              include: [
                {
                  model: Roles,
                  as: "Role",
                  attributes: ["RoleID", "RoleName"],
                },
              ],
            },
            {
              model: RiskSopLink,
              where: {
                IsDeleted: false,
              },
              required: false,
              attributes: ["NodeID", "RiskDraftID"],
            },
          ],
          attributes: ["SopFlowID", "SOPID", "SOPDraftID", "Nodes", "Edges"],
        },
      ],
      attributes: {
        exclude: ["DeletedBy", "DeletedDate", "IsDeleted"],
      },
      order: [["CreatedDate", "DESC"]],
    });
    const sopModalData = sopModuleDraft?.toJSON();
    const sopFlow = sopModalData?.SopFlow;
    delete sopModalData?.SopFlow;

    const mappedNodes = sopFlow?.Nodes.map((node) => {
      const attachments = sopFlow?.SopFlowNodeAttachments.filter(
        (attachment) => attachment.NodeID === node.id
      );

      const clips = attachments
        ?.map((attachment) =>
          attachment?.IsClip && attachment?.AttachmentLink ? attachment : null
        )
        .filter(Boolean);

      const images = attachments
        ?.map((attachment) =>
          attachment?.IsImage && attachment?.AttachmentLink
            ? {
                ...attachment,
                AttachmentLink: path.posix.join(
                  "file/si/",
                  `${path.basename(attachment?.AttachmentLink)}`
                ),
              }
            : null
        )
        .filter(Boolean);

      const riskLinks =
        sopFlow?.RiskSopLinks?.filter((link) => link.NodeID === node.id) || [];
      // Only add RiskIDs if there are actual risk links
      if (riskLinks?.length > 0) {
        node.RiskDraftID = riskLinks.map((link) => link.RiskDraftID);
      }

      const properties = sopFlow?.SopFlowNodeDetails.filter(
        (detail) => detail.NodeID === node.id
      );

      const roles = sopFlow?.SopFlowNodeRoles.filter(
        (role) => role.NodeID === node.id
      );

      return {
        ...node,
        clips,
        images,
        properties,
        roles,
      };
    });

    const CreatedBy = sopModalData?.ModifiedByUser?.UserDetail
      ? `${sopModalData?.ModifiedByUser?.UserDetail?.UserFirstName} ${sopModalData?.ModifiedByUser?.UserDetail?.UserLastName}`
      : `${sopModalData?.CreatedByUser?.UserDetail?.UserFirstName} ${sopModalData?.CreatedByUser?.UserDetail?.UserLastName}`;
    const PublishedDate =
      sopModalData?.SOPStatus === "Published"
        ? sopModalData?.ModifiedDate || sopModalData?.CreatedDate
        : null;

    delete sopModalData?.CreatedByUser,
      delete sopModalData?.ModifiedByUser,
      delete sopModalData?.CreatedBy,
      delete sopModalData?.CreatedDate,
      delete sopModalData?.ModifiedBy,
      delete sopModalData?.ModifiedDate,
      delete sopFlow?.Nodes;
    delete sopFlow?.SopFlowNodeAttachments;
    delete sopFlow?.SopFlowNodeDetails;
    delete sopFlow?.SopFlowNodeRoles;
    delete sopFlow?.RiskSopLinks;

    const ancestors = [];

    const getAncestors = async (pElementId, level = 1) => {
      const parentElement = await ContentStructure.findOne({
        where: {
          ContentID: pElementId,
          OrganizationStructureID: lincense?.EnterpriseID,
        },
        attributes: ["ContentID", "ContentName", "ParentContentID"],
      });

      if (parentElement) {
        ancestors.unshift({
          ...JSON.parse(JSON.stringify(parentElement)),
          level,
        });
        if (parentElement.ParentContentID) {
          await getAncestors(parentElement.ParentContentID, level + 1);
        }
      }
    };

    if (ContentID) {
      await getAncestors(ContentID);
    }

    const lastLevel =
      ancestors.length > 0 ? ancestors[ancestors.length - 1].level + 1 : 1;
    ancestors.push({
      ContentID: sopModuleDraft?.SOPID,
      ContentName: sopModuleDraft?.SOPName,
      level: lastLevel,
    });

    const breadcrumbs = ancestors.map((e, index) => ({
      breadcrumbId: e.ContentID,
      breadcrumbName: e.ContentName,
      level: index + 1,
    }));

    return res.status(200).json({
      message: "Sop draft fetched successfully",
      data: {
        sopModuleDraft: {
          ...sopModalData,
          CreatedBy,
          PublishedDate,
          SopFlow: {
            ...sopFlow,
            Nodes: mappedNodes,
          },
        },
        breadcrumbs,
      },
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const listSOPModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID } = req.body;

  try {
    const sopModuleList = await SopModuleDraft.findAll({
      where: {
        [Op.and]: [
          { ModuleTypeID },
          { ContentID },
          { IsDeleted: false },
          Sequelize.literal(`
        "CreatedDate" = (
          SELECT MAX("CreatedDate") 
          FROM "SopModuleDrafts" AS "sub" 
          WHERE 
            "sub"."SOPID" = "SopModuleDraft"."SOPID" 
            AND "sub"."IsDeleted" = false
        )
      `),
        ],
      },
      attributes: [
        "SOPID",
        "SOPName",
        "DraftVersion",
        "MasterVersion",
        "CreatedDate",
      ],
      order: [["CreatedDate", "DESC"]],
      transaction: t,
    });

    await t.commit();
    return res.status(200).json({
      message: "Sop module list fetched successfully",
      data: {
        sopModuleList,
      },
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const deleteSOPModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID, SOPID } = req.body;
  const { currentUserId } = req.payload;

  try {
    const existingSopModuleDraft = await SopModuleDraft.findOne({
      where: { ModuleTypeID, SOPID, ContentID },
      order: [["CreatedDate", "DESC"]],
      transaction: t,
    });

    if (!existingSopModuleDraft) {
      await t.rollback();
      return res.status(404).json({ message: "SOP Module not found" });
    }

    const isUserPermissibleToDelete = await checkUserPermission(
      SopModuleDraft,
      ModuleTypeID,
      ContentID,
      "SOPID",
      SOPID,
      "SOPDraftID",
      existingSopModuleDraft.SOPDraftID,
      currentUserId,
      t
    );

    if (!isUserPermissibleToDelete) {
      await t.rollback();
      return res.status(403).json({ message: "You are unathorized to delete" });
    }

    await Promise.all([
      SopModuleDraft.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: { ModuleTypeID, ContentID, SOPID },
          transaction: t,
        }
      ),
      SopModule.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: { ModuleTypeID, ContentID, SOPID },
          transaction: t,
        }
      ),
      ModuleChecker.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, SOPID, ContentID }, transaction: t }
      ),
      ModuleApprover.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, SOPID, ContentID }, transaction: t }
      ),
      ModuleEscalation.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, SOPID, ContentID }, transaction: t }
      ),
      ModuleOwner.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, SOPID, ContentID }, transaction: t }
      ),
    ]);

    await t.commit();
    return res.status(200).json({
      message: "SOP deleted successfully",
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const deleteSOPFlowModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID, SOPID } = req.body;
  const { currentUserId } = req.payload;

  try {
    const existingSopModuleDraft = await SopModuleDraft.findOne({
      where: { ModuleTypeID, SOPID, ContentID },
      order: [["CreatedDate", "DESC"]],
      transaction: t,
    });

    if (!existingSopModuleDraft) {
      await t.rollback();
      return res.status(404).json({ message: "SOP Module not found" });
    }

    const isUserPermissibleToDelete = await checkUserPermission(
      SopModuleDraft,
      ModuleTypeID,
      ContentID,
      "SOPID",
      SOPID,
      "SOPDraftID",
      existingSopModuleDraft.SOPDraftID,
      currentUserId,
      t
    );

    if (!isUserPermissibleToDelete) {
      await t.rollback();
      return res.status(403).json({ message: "You are unathorized to delete" });
    }

    await Promise.all([
      SopModuleDraft.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: { ModuleTypeID, ContentID, SOPID },
          transaction: t,
        }
      ),
      SopModule.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: { ModuleTypeID, ContentID, SOPID },
          transaction: t,
        }
      ),
      ModuleChecker.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, SOPID, ContentID }, transaction: t }
      ),
      ModuleApprover.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, SOPID, ContentID }, transaction: t }
      ),
      ModuleEscalation.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, SOPID, ContentID }, transaction: t }
      ),
      ModuleOwner.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, SOPID, ContentID }, transaction: t }
      ),
      SopFlow.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { SOPID }, transaction: t }
      ),
      SopFlowNodeAttachment.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { SOPID }, transaction: t }
      ),
      SopFlowNodeDetail.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { SOPID }, transaction: t }
      ),
    ]);

    await t.commit();
    return res.status(200).json({
      message: "SOP deleted successfully",
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

//for risk sop dropdown
const getLatestSopData = async (req, res) => {
  try {
    // Subquery to get latest CreatedDate per SOPID
    const latestDrafts = await SopModuleDraft.findAll({
      attributes: [
        "SOPID",
        "SOPName",
        "SOPStatus",
        "ModuleTypeID",
        "SOPDraftID",
        "SOPXMLElement",
        "IsReactFlow",
        "DraftVersion",
        "MasterVersion",
      ],
      where: {
        // Filters to get only latest drafts for each SOPID
        [Op.and]: Sequelize.literal(`"SopModuleDraft"."CreatedDate" = (
          SELECT MAX("CreatedDate")
          FROM "SopModuleDrafts" AS "inner"
          WHERE "inner"."SOPID" = "SopModuleDraft"."SOPID"
           AND "inner"."IsDeleted" = false
        )`),
      },
      include: [
        {
          model: SopFlow,
          include: [
            {
              model: SopFlowNodeAttachment,
              separate: true,
              attributes: [
                "NodeID",
                "IsClip",
                "IsImage",
                "AttachmentTitle",
                "AttachmentLink",
                "AttachmentType",
              ],
            },
            {
              model: SopFlowNodeDetail,
              separate: true,
              attributes: ["NodeID", "ServiceID", "NodeProperties"],
            },
            {
              model: SopFlowNodeRole,
              separate: true,
              attributes: ["NodeID", "RoleID"],
              include: [
                {
                  model: Roles,
                  as: "Role",
                  attributes: ["RoleID", "RoleName"],
                },
              ], //This was Added to get the role name along with the roleid
            },
          ],
          attributes: ["SopFlowID", "SOPID", "SOPDraftID", "Nodes", "Edges"],
        },
      ],
    });

    // const sopModalData = latestDrafts?.toJSON();
    const sopFlow = latestDrafts?.SopFlow;
    delete latestDrafts?.SopFlow;

    const mappedNodes = sopFlow?.Nodes.map((node) => {
      const attachments = sopFlow?.SopFlowNodeAttachments.filter(
        (attachment) => attachment.NodeID === node.id
      );

      const clips = attachments
        ?.map((attachment) =>
          attachment?.IsClip && attachment?.AttachmentLink ? attachment : null
        )
        .filter(Boolean);

      const images = attachments
        ?.map((attachment) =>
          attachment?.IsImage && attachment?.AttachmentLink
            ? {
                ...attachment,
                AttachmentLink: path.posix.join(
                  "file/si/",
                  `${path.basename(attachment?.AttachmentLink)}`
                ),
              }
            : null
        )
        .filter(Boolean);

      const properties = sopFlow?.SopFlowNodeDetails.filter(
        (detail) => detail.NodeID === node.id
      );

      const roles = sopFlow?.SopFlowNodeRoles.filter(
        (role) => role.NodeID === node.id
      );

      return {
        ...node,
        clips,
        images,
        properties,
        roles,
      };
    });
    return res.status(200).json({
      data: {
        sopModuleDraft: {
          ...latestDrafts,
          SopFlow: {
            ...sopFlow,
            Nodes: mappedNodes,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error in getLatestSopData:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Test mcq module
const createBulkTestMCQ = async (req, res, next) => {
  try {
    return res.status(201).json({
      message: "Test MCQs excel uploaded successfully",
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const createTestMCQModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const {
    ModuleTypeID,
    ContentID = null,
    TestMCQID = null,
    TestMCQName,
    TestMCQDescription,
    TestMCQIsActive,
    TestMCQTags,
    TestMCQOwner,
    EscalationPerson,
    EscalationType,
    EscalationAfter,
    Checker,
    Approver,
    SelfApproved,
    TotalAttempts,
    PassPercentage,
    TotalQuestions,
    QuestionList,
    TestMCQExpiry = null,
    TimeLimite,
    NeedAcceptance = false,
    MinimumTime,
  } = req.body;

  const { currentUserId } = req.payload;

  try {
    let TestMCQIDResult = null;
    let TestMCQDraftIDResult = null;
    const assignUsers = [],
      assignMaker = [
        ...JSON.parse(JSON.stringify(TestMCQOwner ? TestMCQOwner : [])),
      ],
      assignChecker = [...JSON.parse(JSON.stringify(Checker ? Checker : []))],
      assignEscalation = [
        ...JSON.parse(JSON.stringify(EscalationPerson ? EscalationPerson : [])),
      ];
    let moduleDetails, draftDetails;
    if (TestMCQID) {
      moduleDetails = { TestMCQID, TestMCQName };
      let existingTestMCQModuleDraft = await TestMcqsModuleDraft.findOne({
        where: { ModuleTypeID, TestMCQID, ContentID },
        order: [["CreatedDate", "DESC"]],
        transaction: t,
      });

      if (!existingTestMCQModuleDraft) {
        await t.rollback();
        return res.status(404).json({ message: "Test MCQ Module not found" });
      }

      existingTestMCQModuleDraft = existingTestMCQModuleDraft.toJSON();

      const isUserPermissibleToDelete = await checkUserPermission(
        TestMcqsModuleDraft,
        ModuleTypeID,
        ContentID,
        "TestMCQID",
        TestMCQID,
        "TestMCQDraftID",
        existingTestMCQModuleDraft.TestMCQDraftID,
        currentUserId,
        t
      );

      if (!isUserPermissibleToDelete) {
        await t.rollback();
        return res
          .status(403)
          .json({ message: "You are unathorized to edit or publish" });
      }

      let latestDraftVersion;
      let latestMasterVersion = null;
      if (SelfApproved === "true") {
        if (existingTestMCQModuleDraft.MasterVersion) {
          latestMasterVersion = (
            parseFloat(existingTestMCQModuleDraft.MasterVersion) + 1.0
          ).toFixed(1);
        } else {
          latestMasterVersion = Math.ceil(
            parseFloat(existingTestMCQModuleDraft.DraftVersion)
          ).toFixed(1);
        }

        latestDraftVersion = (parseFloat(latestMasterVersion) - 0.9).toFixed(1);
      } else {
        if (existingTestMCQModuleDraft.MasterVersion) {
          latestDraftVersion = (
            parseFloat(existingTestMCQModuleDraft.MasterVersion) + 0.1
          ).toFixed(1);
        } else {
          latestDraftVersion = (
            parseFloat(existingTestMCQModuleDraft.DraftVersion) + 0.1
          ).toFixed(1);
        }
      }

      if (SelfApproved === "true" && QuestionList && QuestionList.length > 0) {
        await Promise.all([
          QuestionRepository.destroy({
            where: {
              TestMCQID,
            },
            transaction: t,
          }),
          QuestionAnswersLink.destroy({
            where: {
              TestMCQID,
            },
            transaction: t,
          }),
        ]);

        // Validate AnswerList upfront
        for (const { AnswerList } of QuestionList) {
          if (AnswerList.length > 4) {
            await t.rollback();
            return res
              .status(400)
              .send({ message: "Options will not be more than 4" });
          }
        }

        // Prepare data for bulk creation of questions
        const questionData = QuestionList.map(
          ({
            QuestionHeading,
            QuestionText,
            QuestionImage,
            IsMultipleAnswer,
            IsAnswerWithImage,
            IsRequired,
          }) => ({
            TestMCQID: TestMCQID,
            QuestionHeading: QuestionHeading || TestMCQName.split(" ")[0],
            QuestionText,
            QuestionImage: QuestionImage || null,
            IsMultipleAnswer,
            IsAnswerWithImage,
            IsRequired,
            CreatedBy: currentUserId,
          })
        );

        // Bulk create questions and retrieve their IDs
        const createdQuestions = await QuestionRepository.bulkCreate(
          questionData,
          {
            transaction: t,
            returning: true,
          }
        );

        // Prepare data for bulk creation of answers
        const answersData = [];
        createdQuestions.forEach(({ QuestionID }, questionIndex) => {
          const { AnswerList } = QuestionList[questionIndex];
          answersData.push(
            ...AnswerList.map((item, index) => ({
              TestMCQID: TestMCQID,
              QuestionID,
              OptionText: item.OptionText,
              IsCorrect: item.IsCorrect,
              Ordering: index + 1,
              CreatedBy: currentUserId,
            }))
          );
        });

        // Bulk create all answers
        await QuestionAnswersLink.bulkCreate(answersData, { transaction: t });
      }

      const newTestMCQModuleDraft = await TestMcqsModuleDraft.create(
        {
          ModuleTypeID,
          QuestionsAndAnswers: QuestionList,
          TestMCQID,
          ContentID,
          TestMCQName,
          TestMCQDescription,
          TestMCQIsActive,
          TestMCQStatus: SelfApproved === "true" ? "Published" : "InProgress",
          DraftVersion: latestDraftVersion.toString(),
          MasterVersion: SelfApproved === "true" ? latestMasterVersion : null,
          TestMCQTags,
          SelfApproved,
          TotalAttempts,
          PassPercentage,
          TotalQuestions,
          TimeLimite,
          CreatedBy: currentUserId,
          TestMCQExpiry,
          NeedAcceptance,
          MinimumTime,
        },
        { transaction: t }
      );

      TestMCQIDResult = TestMCQID;
      TestMCQDraftIDResult = newTestMCQModuleDraft.TestMCQDraftID;
      draftDetails = {
        TestMCQDraftID: newTestMCQModuleDraft.TestMCQDraftID,
        TestMCQName,
      };
      if (SelfApproved === "true") {
        await TestMcqsModule.update(
          {
            TestMCQName,
            TestMCQDescription,
            TestMCQIsActive,
            TestMCQTags,
            SelfApproved,
            TotalAttempts,
            PassPercentage,
            TotalQuestions,
            TestMCQStatus: "Published",
            DraftVersion: latestDraftVersion.toString(),
            MasterVersion: latestMasterVersion,
            TimeLimite,
            ModifiedBy: currentUserId,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
            TestMCQExpiry,
            MinimumTime,
          },
          {
            where: { ModuleTypeID, TestMCQID, ContentID },
            transaction: t,
          }
        );
      }

      if (TestMCQOwner && TestMCQOwner.length > 0) {
        await ModuleOwner.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TestMCQID,
              ContentID,
              SOPDraftID: existingTestMCQModuleDraft.TestMCQDraftID,
            },
            transaction: t,
          }
        );

        const ownerData = TestMCQOwner.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            TestMCQID,
            TestMCQDraftID: newTestMCQModuleDraft.TestMCQDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleOwner.bulkCreate(ownerData, { transaction: t });
      }

      if (SelfApproved === "false") {
        await TestMcqsModuleDraft.update(
          { EscalationType, EscalationAfter },
          {
            where: {
              ModuleTypeID,
              TestMCQDraftID: newTestMCQModuleDraft.TestMCQDraftID,
              TestMCQID,
              ContentID,
            },
            transaction: t,
          }
        );
      } else {
        await TestMcqsModuleDraft.update(
          { EscalationType: null, EscalationAfter: null },
          {
            where: {
              ModuleTypeID,
              TestMCQDraftID: newTestMCQModuleDraft.TestMCQDraftID,
              TestMCQID,
              ContentID,
            },
            transaction: t,
          }
        );
      }

      if (SelfApproved === "false" && Checker && Checker.length > 0) {
        await ModuleChecker.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TestMCQID,
              TestMCQDraftID: existingTestMCQModuleDraft.TestMCQDraftID,
              ContentID,
            },
            transaction: t,
          }
        );

        const checkerData = Checker.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            TestMCQID,
            TestMCQDraftID: newTestMCQModuleDraft.TestMCQDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleChecker.bulkCreate(checkerData, { transaction: t });
        sentModuleBulkEmail(checkerData, "Checker");
      } else if (SelfApproved === "true") {
        await ModuleChecker.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TestMCQID,
              TestMCQDraftID: existingTestMCQModuleDraft.TestMCQDraftID,
              ContentID,
            },
            transaction: t,
          }
        );
      }

      if (SelfApproved === "false" && Approver && Approver.length > 0) {
        await ModuleApprover.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TestMCQID,
              TestMCQDraftID: existingTestMCQModuleDraft.TestMCQDraftID,
              ContentID,
            },
            transaction: t,
          }
        );

        const approverData = Approver.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            TestMCQID,
            TestMCQDraftID: newTestMCQModuleDraft.TestMCQDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleApprover.bulkCreate(approverData, { transaction: t });
      } else if (SelfApproved === "true") {
        await ModuleApprover.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TestMCQID,
              TestMCQDraftID: existingTestMCQModuleDraft.TestMCQDraftID,
              ContentID,
            },
            transaction: t,
          }
        );
      }

      if (
        SelfApproved === "false" &&
        EscalationPerson &&
        EscalationPerson.length > 0
      ) {
        await ModuleEscalation.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TestMCQID,
              TestMCQDraftID: existingTestMCQModuleDraft.TestMCQDraftID,
              ContentID,
            },
            transaction: t,
          }
        );

        const escalationData = EscalationPerson.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            TestMCQID,
            TestMCQDraftID: newTestMCQModuleDraft.TestMCQDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleEscalation.bulkCreate(escalationData, { transaction: t });
      } else if (SelfApproved === "true") {
        await ModuleEscalation.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              TestMCQID,
              TestMCQDraftID: existingTestMCQModuleDraft.TestMCQDraftID,
              ContentID,
            },
            transaction: t,
          }
        );
      }
    } else {
      const createdTestMCQModule = await TestMcqsModule.create(
        {
          ModuleTypeID,
          TestMCQName,
          TestMCQDescription,
          TestMCQIsActive,
          TestMCQTags,
          ContentID,
          SelfApproved,
          TotalAttempts,
          PassPercentage,
          TotalQuestions,
          TestMCQStatus: SelfApproved === "true" ? "Published" : "InProgress",
          MasterVersion: SelfApproved === "true" ? "1.0" : null,
          TimeLimite,
          CreatedBy: currentUserId,
          TestMCQExpiry,
          NeedAcceptance,
          MinimumTime,
        },
        { transaction: t }
      );

      const createdTestMCQModuleDraft = await TestMcqsModuleDraft.create(
        {
          ModuleTypeID,
          QuestionsAndAnswers: QuestionList,
          TestMCQID: createdTestMCQModule.TestMCQID,
          TestMCQName,
          TestMCQDescription,
          TestMCQIsActive,
          TestMCQTags,
          DraftVersion: "0.1",
          TestMCQStatus: SelfApproved === "true" ? "Published" : "InProgress",
          MasterVersion: SelfApproved === "true" ? "1.0" : null,
          ContentID,
          SelfApproved,
          TotalAttempts,
          PassPercentage,
          TotalQuestions,
          TimeLimite,
          CreatedBy: currentUserId,
          TestMCQExpiry,
          NeedAcceptance,
          MinimumTime,
        },
        { transaction: t }
      );

      TestMCQIDResult = createdTestMCQModule.TestMCQID;
      TestMCQDraftIDResult = createdTestMCQModuleDraft.TestMCQDraftID;
      moduleDetails = {
        TestMCQID: createdTestMCQModule.TestMCQID,
        TestMCQName,
      };
      draftDetails = {
        TestMCQDraftID: createdTestMCQModuleDraft.TestMCQDraftID,
        TestMCQName,
      };
      if (SelfApproved === "true" && QuestionList && QuestionList.length > 0) {
        // Validate all AnswerList lengths upfront
        for (const { AnswerList } of QuestionList) {
          if (AnswerList.length > 4) {
            await t.rollback();
            return res
              .status(400)
              .send({ message: "Options will not be more than 4" });
          }
        }

        // Prepare data for bulk creation of questions
        const questionData = QuestionList.map(
          ({
            QuestionHeading,
            QuestionText,
            QuestionImage,
            IsMultipleAnswer,
            IsAnswerWithImage,
            IsRequired,
          }) => ({
            TestMCQID: createdTestMCQModule.TestMCQID,
            QuestionHeading: QuestionHeading || TestMCQName.split(" ")[0],
            QuestionText,
            QuestionImage: QuestionImage || null,
            IsMultipleAnswer,
            IsAnswerWithImage,
            IsRequired,
            CreatedBy: currentUserId,
          })
        );

        // Bulk create questions and get IDs
        const createdQuestions = await QuestionRepository.bulkCreate(
          questionData,
          {
            transaction: t,
            returning: true,
          }
        );

        // Prepare data for bulk creation of answers
        const answersData = [];
        createdQuestions.forEach(({ QuestionID }, questionIndex) => {
          const { AnswerList } = QuestionList[questionIndex];
          answersData.push(
            ...AnswerList.map((item, index) => ({
              TestMCQID: createdTestMCQModule.TestMCQID,
              QuestionID,
              OptionText: item.OptionText,
              IsCorrect: item.IsCorrect,
              Ordering: index + 1,
              CreatedBy: currentUserId,
            }))
          );
        });

        // Bulk create answers
        await QuestionAnswersLink.bulkCreate(answersData, { transaction: t });
      }

      if (TestMCQOwner && TestMCQOwner.length > 0) {
        const ownerData = TestMCQOwner.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            TestMCQID: createdTestMCQModule.TestMCQID,
            TestMCQDraftID: createdTestMCQModuleDraft.TestMCQDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleOwner.bulkCreate(ownerData, { transaction: t });
      }

      if (SelfApproved === "false" && Checker && Checker.length > 0) {
        const checkerData = Checker.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            TestMCQID: createdTestMCQModule.TestMCQID,
            TestMCQDraftID: createdTestMCQModuleDraft.TestMCQDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleChecker.bulkCreate(checkerData, { transaction: t });
        sentModuleBulkEmail(checkerData, "Checker");
      }

      if (SelfApproved === "false" && Approver && Approver.length > 0) {
        const approverData = Approver.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            TestMCQID: createdTestMCQModule.TestMCQID,
            TestMCQDraftID: createdTestMCQModuleDraft.TestMCQDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleApprover.bulkCreate(approverData, { transaction: t });
      }

      if (
        SelfApproved === "false" &&
        EscalationPerson &&
        EscalationPerson.length > 0
      ) {
        const escalationData = EscalationPerson.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            TestMCQID: createdTestMCQModule.TestMCQID,
            TestMCQDraftID: createdTestMCQModuleDraft.TestMCQDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleEscalation.bulkCreate(escalationData, { transaction: t });
      }

      if (SelfApproved === "false") {
        await Promise.all([
          TestMcqsModule.update(
            { EscalationType, EscalationAfter },
            {
              where: {
                ModuleTypeID,
                ContentID,
                TestMCQID: createdTestMCQModule.TestMCQID,
              },
              transaction: t,
            }
          ),
          TestMcqsModuleDraft.update(
            { EscalationType, EscalationAfter },
            {
              where: {
                ModuleTypeID,
                ContentID,
                TestMCQID: createdTestMCQModule.TestMCQID,
                TestMCQDraftID: createdTestMCQModuleDraft.TestMCQDraftID,
              },
              transaction: t,
            }
          ),
        ]);
      }
    }
    const notififactionBulk = [];
    if (SelfApproved == "true") {
      const modulelinks = await UserModuleLink.findAll({
        where: {
          ModuleID: moduleDetails.TestMCQID,
          StartDate: {
            [Op.lte]: literal("CURRENT_TIMESTAMP"),
          },
          DueDate: {
            [Op.gte]: literal("CURRENT_TIMESTAMP"),
          },
        },
        attributes: ["UserID"],
      });
      for (const el of JSON.parse(JSON.stringify(modulelinks))) {
        assignUsers.push(el.UserID);
      }
      const notificationStatus = await Notification.findAll({
        where: {
          UserID: [...assignMaker, ...assignUsers],
          NotificationTypeForPublish: ["push", "both"],
        },
        attributes: ["UserID", "NotificationTypeForPublish"],
      });
      for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
        for (const UserID of assignMaker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Module Owner",
              NotificationType: "update",
              LinkedType: "TestMCQ",
              LinkedID: moduleDetails.TestMCQID,
              CreatedBy: currentUserId,
            });
          }
        }
        for (const UserID of assignUsers) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Updated Element assign version is published",
              NotificationType: "assignment",
              LinkedType: "TestMCQ",
              LinkedID: moduleDetails.TestMCQID,
              CreatedBy: currentUserId,
            });
          }
        }
      }
    } else {
      const notificationStatus = await Notification.findAll({
        where: {
          UserID: [...assignMaker, ...assignChecker],
          NotificationTypeForAction: ["push", "both"],
        },
        attributes: ["UserID", "NotificationTypeForAction"],
      });
      for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
        for (const UserID of assignMaker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Module InProgress Owner",
              NotificationType: "update",
              LinkedType: "TestMCQ",
              LinkedID: draftDetails.TestMCQDraftID,
              CreatedBy: currentUserId,
            });
          }
        }
        for (const UserID of assignChecker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Checker",
              NotificationType: "actionable",
              LinkedType: "TestMCQ",
              LinkedID: draftDetails.TestMCQDraftID,
              CreatedBy: currentUserId,
            });
          }
        }
      }
    }

    // for (const el of notififactionBulk) {
    //   await UserNotification.create(el);
    // }
    // await sendNotification(notififactionBulk);

    if (notififactionBulk.length > 0) {
      await UserNotification.bulkCreate(notififactionBulk, {
        ignoreDuplicates: true,
        transaction: t,
      });
      await sendNotification(notififactionBulk);
    }

    await t.commit();
    return res.status(201).json({
      message: "Test MCQ Module created successfully",
      data: {
        TestMCQID: TestMCQIDResult,
        TestMCQDraftID: TestMCQDraftIDResult,
      },
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const publishTestMCQModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, TestMCQID, ContentID } = req.body;
  const { currentUserId } = req.payload;

  try {
    let existingTestMCQModuleDraft = await TestMcqsModuleDraft.findOne({
      where: { ModuleTypeID, TestMCQID, ContentID },
      order: [["CreatedDate", "DESC"]], // Order by the creation date to get the last record
      transaction: t,
    });

    if (!existingTestMCQModuleDraft) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "Test MCQ Module InProgress not found" });
    }

    existingTestMCQModuleDraft = existingTestMCQModuleDraft.toJSON();

    const isUserPermissibleToDelete = await checkUserPermission(
      TestMcqsModuleDraft,
      ModuleTypeID,
      ContentID,
      "TestMCQID",
      TestMCQID,
      "TestMCQDraftID",
      existingTestMCQModuleDraft.TestMCQDraftID,
      currentUserId,
      t
    );

    if (!isUserPermissibleToDelete) {
      await t.rollback();
      return res
        .status(403)
        .json({ message: "You are unathorized to publish" });
    }

    const parsedDraftVersion = parseFloat(
      existingTestMCQModuleDraft.DraftVersion
    );

    const latestMasterVersion = Math.ceil(parsedDraftVersion).toFixed(1);

    const QuestionList = existingTestMCQModuleDraft.QuestionsAndAnswers;
    if (QuestionList && QuestionList.length > 0) {
      await Promise.all([
        QuestionRepository.destroy({
          where: {
            TestMCQID,
          },
          transaction: t,
        }),
        QuestionAnswersLink.destroy({
          where: {
            TestMCQID,
          },
          transaction: t,
        }),
      ]);

      for (const {
        QuestionHeading,
        QuestionText,
        QuestionImage,
        IsMultipleAnswer,
        IsAnswerWithImage,
        IsRequired,
        AnswerList,
      } of QuestionList) {
        if (AnswerList.length > 4) {
          await t.rollback();
          return res
            .status(400)
            .send({ message: "Options will not be more than 4" });
        }

        const { QuestionID } = await QuestionRepository.create(
          {
            TestMCQID: TestMCQID,
            QuestionHeading: QuestionHeading
              ? QuestionHeading
              : TestMCQName.split(" ")[0],
            QuestionText,
            QuestionImage: QuestionImage ? QuestionImage : null,
            IsMultipleAnswer,
            IsAnswerWithImage,
            IsRequired,
            CreatedBy: currentUserId,
          },
          { transaction: t }
        );
        await QuestionAnswersLink.bulkCreate(
          AnswerList.map((item, index) => ({
            TestMCQID: TestMCQID,
            QuestionID,
            OptionText: item.OptionText,
            IsCorrect: item.IsCorrect,
            Ordering: index + 1,
            CreatedBy: currentUserId,
          })),
          { transaction: t }
        );
      }
    }

    await Promise.all([
      TestMcqsModule.update(
        {
          TestMCQName: existingTestMCQModuleDraft.TestMCQName,
          TestMCQDescription: existingTestMCQModuleDraft.TestMCQDescription,
          TestMCQStatus: "Published",
          TestMCQIsActive: existingTestMCQModuleDraft.TestMCQIsActive,
          TestMCQTags: existingTestMCQModuleDraft.TestMCQTags,
          EscalationType: existingTestMCQModuleDraft.EscalationType,
          EscalationAfter: existingTestMCQModuleDraft.EscalationAfter,
          SelfApproved: existingTestMCQModuleDraft.SelfApproved,
          DraftVersion: existingTestMCQModuleDraft.DraftVersion,
          TestMCQExpiry: existingTestMCQModuleDraft.TestMCQExpiry,
          MasterVersion: latestMasterVersion,
          TimeLimite: existingTestMCQModuleDraft.TimeLimite,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
          NeedAcceptance: existingTestMCQModuleDraft.NeedAcceptance,
          MinimumTime: existingTestMCQModuleDraft.MinimumTime,
        },
        { where: { ModuleTypeID, TestMCQID, ContentID }, transaction: t }
      ),
      TestMcqsModuleDraft.update(
        {
          TestMCQStatus: "Published",
          MasterVersion: latestMasterVersion,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: {
            ModuleTypeID,
            TestMCQDraftID: existingTestMCQModuleDraft.TestMCQDraftID,
            TestMCQID,
            ContentID,
          },
          transaction: t,
        }
      ),
    ]);
    const modulelinks = await UserModuleLink.findAll({
      where: {
        ModuleID: TestMCQID,
        StartDate: {
          [Op.lte]: literal("CURRENT_TIMESTAMP"),
        },
        DueDate: {
          [Op.gte]: literal("CURRENT_TIMESTAMP"),
        },
      },
      attributes: ["UserID"],
    });
    const assignUsers = [],
      notififactionBulk = [];
    for (const el of JSON.parse(JSON.stringify(modulelinks))) {
      assignUsers.push(el.UserID);
    }
    const notificationStatus = await Notification.findAll({
      where: {
        UserID: assignUsers,
        NotificationTypeForPublish: ["push", "both"],
      },
      attributes: ["UserID", "NotificationTypeForPublish"],
    });
    for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
      for (const UserID of assignMaker) {
        if (UserID == el.UserID) {
          notififactionBulk.push({
            UserID: el.UserID,
            Message: "Updated Element assign version is published",
            NotificationType: "assignment",
            LinkedType: "TestMCQ",
            LinkedID: TestMCQID,
            CreatedBy: currentUserId,
          });
        }
      }
    }

    // for (const el of notififactionBulk) {
    //   await UserNotification.create(el);
    // }
    // await sendNotification(notififactionBulk);

    if (notififactionBulk.length > 0) {
      await UserNotification.bulkCreate(notififactionBulk, {
        ignoreDuplicates: true,
        transaction: t,
      });
      await sendNotification(notififactionBulk);
    }

    await t.commit();
    return res
      .status(200)
      .json({ message: "Test MCQ Status updated successfully" });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const viewTestMCQModuleDraft = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID, TestMCQID } = req.body;

  try {
    const testMCQModuleDraft = await TestMcqsModuleDraft.findOne({
      where: {
        ModuleTypeID,
        TestMCQID,
        ContentID,
        IsDeleted: false,
      },
      attributes: {
        exclude: ["QuestionsAndAnswers"],
      },
      include: [
        {
          model: ModuleChecker,
          as: "Checkers",
          required: false, // This ensures testMCQModuleDraft is returned even if ModuleChecker doesn't exist
          where: {
            IsDeleted: false, // Include only if not deleted
          },
          attributes: ["UserID"],
          include: [
            {
              model: Users,
              as: "ModuleCheckerUser",
              attributes: ["UserID", "UserName"],
            },
          ],
        },
        {
          model: ModuleEscalation,
          as: "EscalationPersons",
          required: false, // This ensures testMCQModuleDraft is returned even if ModuleEscalation doesn't exist
          where: {
            IsDeleted: false, // Include only if not deleted
          },
          attributes: ["UserID"],
          include: [
            {
              model: Users,
              as: "ModuleEscalationUser",
              attributes: ["UserID", "UserName"],
            },
          ],
        },
        {
          model: ModuleOwner,
          as: "ModuleOwners",
          required: false,
          where: {
            IsDeleted: false,
          },
          attributes: ["UserID"],
          include: [
            {
              model: Users,
              as: "ModuleOwnerUser",
              attributes: ["UserID", "UserName"],
            },
          ],
        },
      ],
      order: [["CreatedDate", "DESC"]],
      transaction: t,
    });

    if (!testMCQModuleDraft) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "Test MCQ module draft not found" });
    }

    await t.commit();
    return res.status(200).json({
      message: "Test MCQ module draft fetched successfully",
      data: {
        testMCQModuleDraft,
      },
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const listTestMCQModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID } = req.body;

  try {
    const testMCQModuleList = await TestMcqsModuleDraft.findAll({
      where: {
        ModuleTypeID,
        ContentID,
        IsDeleted: false,
      },
      attributes: [
        "TestMCQID",
        "TestMCQName",
        "DraftVersion",
        "MasterVersion",
        "CreatedDate",
      ],
      where: {
        [Op.and]: [
          { ModuleTypeID },
          { ContentID },
          { IsDeleted: false },
          Sequelize.literal(`
        "CreatedDate" = (
          SELECT MAX("CreatedDate") 
          FROM "TestMcqsModuleDrafts" AS "sub" 
          WHERE 
            "sub"."TestMCQID" = "TestMcqsModuleDraft"."TestMCQID" 
            AND "sub"."IsDeleted" = false
        )
      `),
        ],
      },
      order: [["CreatedDate", "DESC"]],
      transaction: t,
    });

    await t.commit();
    return res.status(200).json({
      message: "Test MCQ module list fetched successfully",
      data: {
        testMCQModuleList,
      },
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const listMCQs = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID, TestMCQID, TestMCQDraftID } = req.body;

  try {
    const mcqs = await TestMcqsModuleDraft.findOne({
      where: {
        ModuleTypeID,
        TestMCQID,
        ContentID,
        TestMCQDraftID,
        IsDeleted: false,
      },
      attributes: ["QuestionsAndAnswers"],
      transaction: t,
    });

    if (!mcqs) {
      await t.rollback();
      return res.status(404).json({ message: "No MCQ's found for this draft" });
    }

    await t.commit();
    return res.status(200).json({
      message: "MCQ's fetched successfully",
      data: {
        mcqs,
      },
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const deleteTestMCQModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID, TestMCQID } = req.body;
  const { currentUserId } = req.payload;

  try {
    const existingTestMCQModuleDraft = await TestMcqsModuleDraft.findOne({
      where: { ModuleTypeID, TestMCQID, ContentID },
      order: [["CreatedDate", "DESC"]],
      transaction: t,
    });

    if (!existingTestMCQModuleDraft) {
      await t.rollback();
      return res.status(404).json({ message: "Test MCQ Module not found" });
    }

    const isUserPermissibleToDelete = await checkUserPermission(
      TestMcqsModuleDraft,
      ModuleTypeID,
      ContentID,
      "TestMCQID",
      TestMCQID,
      "TestMCQDraftID",
      existingTestMCQModuleDraft.TestMCQDraftID,
      currentUserId,
      t
    );

    if (!isUserPermissibleToDelete) {
      await t.rollback();
      return res.status(403).json({ message: "You are unathorized to delete" });
    }

    await Promise.all([
      TestMcqsModuleDraft.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: { ModuleTypeID, ContentID, TestMCQID },
          transaction: t,
        }
      ),
      TestMcqsModule.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: { ModuleTypeID, ContentID, TestMCQID },
          transaction: t,
        }
      ),
      ModuleChecker.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, TestMCQID, ContentID }, transaction: t }
      ),
      ModuleApprover.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, TestMCQID, ContentID }, transaction: t }
      ),
      ModuleEscalation.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, TestMCQID, ContentID }, transaction: t }
      ),
      ModuleOwner.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, TestMCQID, ContentID }, transaction: t }
      ),
      QuestionRepository.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: { TestMCQID },
          transaction: t,
        }
      ),
      QuestionAnswersLink.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: { TestMCQID },
          transaction: t,
        }
      ),
    ]);

    await t.commit();
    return res.status(200).json({
      message: "Test MCQ deleted successfully",
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

// category
const createUpdateCategory = async (req, res, next) => {
  const t = await sequelize.transaction();
  const {
    ContentID = null,
    ModuleTypeID,
    ParentContentID = null,
    ContentName,
    ContentDescription,
    CategoryStatus,
  } = req.body;

  const { currentUserId, lincense } = req.payload;
  try {
    const userDetails = await UserDetails.findOne({
      where: { UserID: currentUserId, IsDeleted: false },
      attributes: ["DesktopFolderSyncPath"],
    });

    if (ContentID) {
      let existingCategory = await ContentStructure.findOne({
        where: {
          ContentID,
          ModuleTypeID,
          ParentContentID,
          OrganizationStructureID: lincense?.EnterpriseID,
        },
        transaction: t,
      });

      if (!existingCategory) {
        await t.rollback();
        return res.status(400).json({ message: "Category doesn't exists" });
      }

      await existingCategory.update(
        {
          ContentName,
          ContentDescription,
          IsActive: CategoryStatus,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
        },
        { transaction: t }
      );

      if (userDetails?.DesktopFolderSyncPath) {
        const hierarchy = await helper.getHierarchicalStructure(
          ContentID,
          "TOP_TO_BOTTOM"
        );

        const rootDir = userDetails?.DesktopFolderSyncPath;

        syncRenameCategory(currentUserId, {
          hierarchy,
          rootDir,
          newName: ContentName,
        });

        await UserDetails.update(
          {
            LastSynced: new Date().toISOString(),
            ModifiedBy: currentUserId,
            ModifiedDate: new Date().toISOString(),
          },
          {
            where: {
              UserID: currentUserId,
            },
          }
        );
      }

      await t.commit();
      return res.status(201).json({
        message: "Category updated successfully",
      });
    } else {
      await ContentStructure.create(
        {
          ContentName,
          ContentDescription,
          ModuleTypeID,
          ParentContentID,
          OrganizationStructureID: lincense?.EnterpriseID,
          IsActive: CategoryStatus,
          CreatedBy: currentUserId,
        },
        { transaction: t }
      );

      if (userDetails?.DesktopFolderSyncPath) {
        const rootDir = userDetails?.DesktopFolderSyncPath;
        let hierarchy = [];
        if (!ParentContentID) {
          hierarchy = [];
        } else {
          hierarchy = await helper.getHierarchicalStructure(
            ParentContentID,
            "TOP_TO_BOTTOM"
          );
        }

        syncCreateCategory(currentUserId, {
          hierarchy,
          rootDir,
          newName: ContentName,
        });

        await UserDetails.update(
          {
            LastSynced: new Date().toISOString(),
            ModifiedBy: currentUserId,
            ModifiedDate: new Date().toISOString(),
          },
          {
            where: {
              UserID: currentUserId,
            },
          }
        );
      }

      await t.commit();
      return res.status(201).json({
        message: "Category created successfully",
      });
    }
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const deleteCategory = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID, ParentContentID } = req.body;
  const { currentUserId } = req.payload;

  try {
    await ContentStructure.update(
      {
        IsDeleted: true,
        DeletedBy: currentUserId,
        DeletedDate: literal("CURRENT_TIMESTAMP"),
      },
      { where: { ModuleTypeID, ContentID, ParentContentID }, transaction: t }
    );

    await t.commit();
    return res.status(200).json({
      message: "Category deleted successfully",
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const changeCategoryStatus = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID, ParentContentID, CategoryStatus } = req.body;
  const { currentUserId } = req.payload;

  try {
    await ContentStructure.update(
      {
        IsActive: CategoryStatus,
        ModifiedBy: currentUserId,
        ModifiedDate: literal("CURRENT_TIMESTAMP"),
      },
      { where: { ModuleTypeID, ContentID, ParentContentID }, transaction: t }
    );

    await t.commit();
    return res.status(200).json({
      message: "Category status updated successfully",
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const deleteAssignedUsers = async ({
  uniqueUsers,
  departments,
  roles,
  // groups,
  t,
  isSingleElement = false,
  updatedModules = {},
  moduleTypeID = null,
  moduleID = null,
}) => {
  try {
    const ModuleIds = [];
    const ModuleTypeIds = [];

    if (isSingleElement) {
      ModuleIds.push(moduleID);
      ModuleTypeIds.push(moduleTypeID);
    } else {
      if (Object.keys(updatedModules).length > 0) {
        ModuleTypeIds.push(...Object.keys(updatedModules));
        ModuleTypeIds.forEach((ModuleTypeID) => {
          const module = updatedModules[ModuleTypeID];
          if (module?.length > 0) {
            ModuleIds.push(...module);
          }
        });
      } else {
        throw error("No module found to delete");
      }
    }

    await UserModuleLink.destroy(
      {
        where: {
          [Op.and]: [
            {
              ModuleTypeID: {
                [Op.in]: ModuleTypeIds,
              },
              ModuleID: {
                [Op.in]: ModuleIds,
              },
              UserID: {
                [Op.in]: uniqueUsers,
              },
            },
            {
              [Op.or]: [
                {
                  DepartmentID: {
                    [Op.in]: departments,
                  },
                },
                {
                  RoleID: {
                    [Op.in]: roles,
                  },
                },
                // {
                //   GroupID: {
                //     [Op.in]: groups,
                //   },
                // },
              ],
            },
          ],
        },
      },
      { transaction: t }
    );
  } catch (error) {
    throw error;
  }
};

// Element assign to department and role
const assignElementToRoleAndDepartment = async (req, res, next) => {
  const t = await sequelize.transaction();

  const {
    departments = [],
    roles = [],
    // groups = [],
    modules,
    startDate,
    dueDate,
    auditors = [],
    isAllUsers,
    selectedUsers = [],
    usersiganture = [],
    EmailTemplateID,
  } = req.body;
  const { currentUserId } = req.payload;

  try {
    const elementAssignment = [];
    const user = [];
    const updatedModules = {};

    if (isAllUsers === "false" && selectedUsers.length > 0) {
      user.push(...selectedUsers);
    } else if (isAllUsers === "true") {
      if (
        departments &&
        departments.length > 0 &&
        roles &&
        roles.length > 0
        // groups &&
        // groups.length > 0
      ) {
        const [departmentUsers, roleUsers] = await Promise.all([
          UserDeparmentLink.findAll({
            where: {
              DepartmentID: {
                [Op.in]: departments,
              },
              IsDeleted: false,
            },
            separate: true,
            include: [
              {
                model: Users,
                required: true,
                where: {
                  IsDeleted: false,
                },
              },
            ],
            attributes: ["UserID"],
            distinct: true,
            transaction: t,
          }),
          UserRoleLink.findAll({
            where: {
              RoleID: {
                [Op.in]: roles,
              },
              IsDeleted: false,
            },
            separate: true,
            include: [
              {
                model: Users,
                required: true,
                where: {
                  IsDeleted: false,
                },
              },
            ],
            attributes: ["UserID"],
            distinct: true,
            transaction: t,
          }),
          // UserGroup.findAll({
          //   where: {
          //     GroupID: {
          //       [Op.in]: groups,
          //     }, // Filter by GroupID
          //     IsDeleted: false, // Ensure active records only
          //   },
          //   include: [
          //     {
          //       model: Users,
          //       as: "User", // Assuming you have set the association with Users in the UserGroup model
          //       required: true,
          //       where: {
          //         IsDeleted: false, // Ensure active users
          //       },
          //       attributes: ["UserID"], // You can adjust this as needed
          //     },
          //   ],
          // }),
        ]);

        user.push(...departmentUsers.map((department) => department.UserID));
        user.push(...roleUsers.map((role) => role.UserID));
        // user.push(...groupUsers.map((group) => group.UserID));
      } else if (departments && departments.length > 0) {
        const departmentUsers = await UserDeparmentLink.findAll({
          where: {
            DepartmentID: {
              [Op.in]: departments,
            },
            IsDeleted: false,
          },
          separate: true,
          include: [
            {
              model: Users,
              required: true,
              where: {
                IsDeleted: false,
              },
            },
          ],
          attributes: ["UserID"],
          distinct: true,
          transaction: t,
        });

        user.push(...departmentUsers.map((department) => department.UserID));
      } else if (roles && roles.length > 0) {
        const roleUsers = await UserRoleLink.findAll({
          where: {
            RoleID: {
              [Op.in]: roles,
            },
            IsDeleted: false,
          },
          separate: true,
          include: [
            {
              model: Users,
              required: true,
              where: {
                IsDeleted: false,
              },
            },
          ],
          attributes: ["UserID"],
          distinct: true,
          transaction: t,
        });

        user.push(...roleUsers.map((role) => role.UserID));
      }
      // else if (groups && groups.length > 0) {
      //   const groupUsers = await UserGroup.findAll({
      //     where: {
      //       GroupID: {
      //         [Op.in]: groups,
      //       },
      //       IsDeleted: false,
      //     },
      //     separate: true,
      //     include: [
      //       {
      //         model: Users,
      //         required: true,
      //         where: {
      //           IsDeleted: false,
      //         },
      //       },
      //     ],
      //     attributes: ["UserID"],
      //     distinct: true,
      //     transaction: t,
      //   });

      //   user.push(...groupUsers.map((grp) => grp.UserID));
      // }
    }

    if (user.length === 0) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "No linked user found for Department or Role" });
    }

    const uniqueUsers = [...new Set(user)];

    if (modules && modules.length > 0) {
      for (const module of modules) {
        updatedModules[module?.ModuleTypeID] = [];
        if (module?.data && module?.data.length > 0) {
          updatedModules[module?.ModuleTypeID] = updatedModules[
            module?.ModuleTypeID
          ].concat(module.data);
        }
      }
    }

    await deleteAssignedUsers({
      uniqueUsers,
      departments,
      roles,
      // groups,
      updatedModules,
      t,
    });

    if (departments && departments.length > 0 && roles && roles.length > 0) {
      uniqueUsers.forEach((UserID) => {
        departments.forEach((DepartmentID) => {
          roles.forEach((RoleID) => {
            const moduleKeys = Object.keys(updatedModules);
            if (moduleKeys?.length > 0) {
              moduleKeys.forEach((ModuleTypeID) => {
                const module = updatedModules[ModuleTypeID];
                if (module?.length > 0) {
                  module.forEach((ModuleID) => {
                    elementAssignment.push({
                      DepartmentID,
                      RoleID,
                      ModuleTypeID,
                      ModuleID,
                      UserID,
                      StartDate: startDate,
                      DueDate: dueDate,
                      CreatedBy: currentUserId,
                    });
                  });
                }
              });
            }
          });
        });
      });
    } else if (
      departments &&
      departments.length > 0 &&
      roles &&
      roles.length == 0
    ) {
      uniqueUsers.forEach((UserID) => {
        departments.forEach((DepartmentID) => {
          const moduleKeys = Object.keys(updatedModules);
          if (moduleKeys?.length > 0) {
            moduleKeys.forEach((ModuleTypeID) => {
              const module = updatedModules[ModuleTypeID];
              if (module?.length > 0) {
                module.forEach((ModuleID) => {
                  elementAssignment.push({
                    DepartmentID,
                    RoleID: null,
                    ModuleTypeID,
                    ModuleID,
                    UserID,
                    StartDate: startDate,
                    DueDate: dueDate,
                    CreatedBy: currentUserId,
                  });
                });
              }
            });
          }
        });
      });
    } else if (
      roles &&
      roles.length > 0 &&
      departments &&
      departments.length == 0
    ) {
      uniqueUsers.forEach((UserID) => {
        roles.forEach((RoleID) => {
          const moduleKeys = Object.keys(updatedModules);
          if (moduleKeys?.length > 0) {
            moduleKeys.forEach((ModuleTypeID) => {
              const module = updatedModules[ModuleTypeID];
              if (module?.length > 0) {
                module.forEach((ModuleID) => {
                  elementAssignment.push({
                    DepartmentID: null,
                    RoleID,
                    ModuleTypeID,
                    ModuleID,
                    UserID,
                    StartDate: startDate,
                    DueDate: dueDate,
                    CreatedBy: currentUserId,
                  });
                });
              }
            });
          }
        });
      });
    }

    const elementAssignmentsChunks = helper.chunkArray(elementAssignment, 300);
    const bulkBunch = elementAssignmentsChunks.map((chunk) =>
      UserModuleLink.bulkCreate(chunk, { transaction: t })
    );
    await Promise.all(bulkBunch);

    const auditorSignatureBulkData = [];
    if (auditors.length > 0 || usersiganture.length > 0) {
      for (const el of modules) {
        for (const e of el?.data) {
          auditorSignatureBulkData.push({
            ModuleTypeID: el.ModuleTypeID,
            ModuleID: e,
            AuditorIDs: auditors,
            StartDate: startDate,
            EndDate: dueDate,
            SignatureIDs: usersiganture,
            CreatedBy: currentUserId,
          });
        }
      }
      await AuditorSignature.bulkCreate(auditorSignatureBulkData, {
        transaction: t,
      });
    }
    const moduleKeys = Object.keys(updatedModules);
    const [emails, moduleTypes, notificationStatus] = await Promise.all([
      UserDetails.findAll({
        where: { UserID: uniqueUsers },
        attributes: [
          "UserEmail",
          "UserFirstName",
          "UserMiddleName",
          "UserLastName",
        ],
      }),
      ModuleMaster.findAll({
        where: {
          IsActive: true,
          ModuleTypeID: moduleKeys,
        },
        attributes: ["ModuleTypeID", "ModuleName"],
      }),
      Notification.findAll({
        where: {
          UserID: uniqueUsers,
          NotificationTypeForAction: {
            [Op.ne]: "none",
          },
        },
        attributes: ["UserID", "NotificationTypeForAction"],
      }),
    ]);
    const notififactionBulk = [];
    const clonedModuleTypes = JSON.parse(JSON.stringify(moduleTypes));
    const clonedNotificationStatus = JSON.parse(
      JSON.stringify(notificationStatus)
    );

    const BulkEmail = [];
    for (const el of clonedModuleTypes) {
      for (const element of elementAssignment) {
        for (const e of clonedNotificationStatus) {
          if (
            el.ModuleTypeID == element.ModuleTypeID &&
            e.UserID == element.UserID
          ) {
            if (["push", "both"].includes(e.NotificationTypeForAction)) {
              notififactionBulk.push({
                UserID: element.UserID,
                Message: "Element has been assigned to you",
                NotificationType: "assignment",
                LinkedType: el.ModuleName,
                LinkedID: element.ModuleID,
                CreatedBy: element.CreatedBy,
              });
            }

            if (["email", "both"].includes(e.NotificationTypeForAction)) {
              BulkEmail.push({
                Email: e.Email,
                UserFullName: e.FullName,
                ElementType: el.ModuleName,
                ElementName: el.ModuleName,
              });
            }
          }
        }
      }
    }

    // if (notififactionBulk.length > 0) {
    //   await UserNotification.bulkCreate(notififactionBulk);
    // }

    if (notififactionBulk.length > 0) {
      await UserNotification.bulkCreate(notififactionBulk, {
        ignoreDuplicates: true,
        transaction: t,
      });
      await sendNotification(notififactionBulk);
      console.log("End - Sending socket notification");
    }

    const ModuleDetails = [];

    // Create a generic function to handle module queries
    const fetchModuleData = async (
      moduleName,
      updatedModules,
      elModuleTypeID,
      model,
      moduleIdField,
      moduleNameField
    ) => {
      if (updatedModules[elModuleTypeID].length > 0) {
        const data = await model.findAll({
          where: {
            [moduleIdField]: updatedModules[elModuleTypeID],
            IsDeleted: false,
          },
          attributes: [moduleIdField, moduleNameField],
        });
        for (const e of JSON.parse(JSON.stringify(data))) {
          ModuleDetails.push({
            ModuleType: moduleName,
            ModuleName: e[moduleNameField],
          });
        }
      }
    };
    for (const el of JSON.parse(JSON.stringify(moduleTypes))) {
      // Use the generic function to handle each case
      if (el.ModuleName === "SOP") {
        await fetchModuleData(
          "SOP",
          updatedModules,
          el.ModuleTypeID,
          SopModule,
          "SOPID",
          "SOPName"
        );
      } else if (el.ModuleName === "Document") {
        await fetchModuleData(
          "Document",
          updatedModules,
          el.ModuleTypeID,
          DocumentModule,
          "DocumentID",
          "DocumentName"
        );
      } else if (el.ModuleName === "TrainingSimulation") {
        await fetchModuleData(
          "TrainingSimulation",
          updatedModules,
          el.ModuleTypeID,
          TrainingSimulationModule,
          "TrainingSimulationID",
          "TrainingSimulationName"
        );
      } else if (el.ModuleName === "TestSimulation") {
        await fetchModuleData(
          "TestSimulation",
          updatedModules,
          el.ModuleTypeID,
          TestSimulationModule,
          "TestSimulationID",
          "TestSimulationName"
        );
      } else if (el.ModuleName === "TestMCQ") {
        await fetchModuleData(
          "TestMCQ",
          updatedModules,
          el.ModuleTypeID,
          TestMcqsModule,
          "TestMCQID",
          "TestMCQName"
        );
      } else if (el.ModuleName === "Form") {
        await fetchModuleData(
          "Form",
          updatedModules,
          el.ModuleTypeID,
          FormModule,
          "FormID",
          "FormName"
        );
      }
    }
    const template = await EmailTemplate.findByPk(EmailTemplateID);

    let html = `<div class="container"> <h1>Element Assignment Notification</h1> <p>Element has been assigned to you</p> <table> <tr> <th>Module Type</th> <th>Module Name</th> </tr>`;
    const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header with Logo -->
            ${
              template?.logo
                ? `
            <div style="text-align: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #eeeeee;">
                <img src="${template?.logo}" alt="Company Logo" style="max-height: 60px;">
            </div>
            `
                : ""
            }
            
            <!-- Main Content -->
            <div style="color: #333333; line-height: 1.6;">
                <!-- Personalized Greeting -->
                <div style="font-size: 16px; margin-bottom: 20px;">
                    ${template?.GreetingName?.replace(
                      "manokaran,",
                      `<strong>"dear sir/mam",</strong>`
                    )}
                </div>
                
                <!-- Main Message -->
                <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #007cba; margin: 20px 0;">
                    ${template?.Body}
                </div>
                
                <!-- Assignment Details -->
                <div style="background: #fff8e1; border: 1px solid #ffd54f; border-radius: 6px; padding: 18px; margin: 25px 0;">
                    <h3 style="color: #e65100; margin-bottom: 12px; font-size: 16px;">📋 Assignment Details</h3>
                  
                    <p style="margin: 8px 0;">
                        <strong>Module Type:</strong> ${
                          ModuleDetails[0]?.ModuleType
                        }
                    </p>
                    <p style="margin: 8px 0;">
                        <strong>Module Name:</strong> ${
                          ModuleDetails[0]?.ModuleName
                        }
                    </p>
                </div>
                
                <!-- Action Instructions -->
                <div style="margin: 25px 0; padding: 15px; background: #e8f5e8; border-radius: 6px;">
                    <p style="margin-bottom: 10px;">
                        Please review the following information carefully and take appropriate action if necessary.
                    </p>
                    <p>
                        If you have any questions or concerns, do not hesitate to contact our support team.
                    </p>
                </div>
                
                <!-- Signature -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee;">
                    ${template?.signature}
                </div>
            </div>
            
            <!-- Footer -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee; text-align: center; font-size: 12px; color: #666666;">
                <p>This is an automated notification. Please do not reply to this email.</p>
                <p style="margin-top: 5px;">&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
            </div>
        </div>
    </div>
`;

    for (const el of ModuleDetails) {
      html += `<tr> <td>${el.ModuleType}</td> <td>${el.ModuleName}</td> </tr>`;
    }

    html += `</table> </div>`;
    if (JSON.parse(JSON.stringify(emails)).length > 0) {
      mailService({
        recipientEmail: JSON.parse(JSON.stringify(emails))
          .map((email) => email.UserEmail)
          .join(", "),
        subject: "Element Assignment Notification",
        body: {
          html: emailBody,
        },
      });
    }

    await t.commit();
    return res.status(200).json({
      message: "Elements assigned successfully",
    });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      userId: currentUserId,
    });
    return res
      .status(500)
      .json({ message: "Something went wrong while assigning element(s)!" });
  }
};

const listDepartmentsForElementAssignment = async (req, res, next) => {
  const t = await sequelize.transaction();
  const { lincense } = req.payload;
  try {
    const departmentList = await Departments.findAll({
      where: {
        IsDeleted: false,
        OrganizationStructureID: lincense.EnterpriseID,
      },
      attributes: ["DepartmentID", "DepartmentName"],
      transaction: t,
    });

    await t.commit();
    return res.status(200).json({
      message: "Department list fetched successfully",
      data: {
        departmentList,
      },
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const listRolesForElementAssignment = async (req, res, next) => {
  const t = await sequelize.transaction();
  const { lincense } = req.payload;
  try {
    const roleList = await Roles.findAll({
      where: {
        IsDeleted: false,
        OrganizationStructureID: lincense.EnterpriseID,
      },
      attributes: ["RoleID", "RoleName"],
      transaction: t,
    });
    await t.commit();
    return res.status(200).json({
      message: "Roles list fetched successfully",
      data: {
        roleList,
      },
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

// Module Activity Log
const viewElementDraftActivityLog = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID, ModuleID, ModuleName } = req.body;

  try {
    const moduleConfig = moduleMapping[ModuleName];

    if (!moduleConfig) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid module name" });
    }

    const { draftModel, idField, draftIdField, prefix } = moduleConfig;

    if (!draftModel || !idField || !draftIdField || !prefix) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid module configuration" });
    }

    const moduleStatus = `${prefix}Status`;
    const moduleName = `${prefix}Name`;

    const attributes = [
      draftIdField,
      idField,
      moduleName,
      moduleStatus,
      "ModuleTypeID",
      "ContentID",
      "SelfApproved",
      "EscalationType",
      "EscalationAfter",
      "NeedAcceptance",
      "CreatedBy",
      "CreatedDate",
    ];

    if (prefix === "Document") {
      attributes.push("NeedAcceptanceFromStakeHolder");
    }

    const moduleActivityLog = await draftModel.findOne({
      where: {
        ModuleTypeID,
        ContentID,
        [idField]: ModuleID,
        IsDeleted: false,
      },
      attributes,
      include: [
        {
          model: Users,
          as: "CreatedByUser",
          attributes: ["UserName", "UserType"],
          required: true,
          include: [
            {
              model: UserDetails,
              as: "UserDetail",
              attributes: ["UserFirstName", "UserMiddleName", "UserLastName"],
            },
          ],
        },
        {
          model: ModuleChecker,
          as: "Checkers",
          required: false,
          where: { IsDeleted: false },
          attributes: [
            "UserID",
            "Comment",
            "ApprovalStatus",
            "IsReviewSkipped",
            "ModifiedDate",
          ],
          include: [
            {
              model: Users,
              as: "ModuleCheckerUser",
              attributes: ["UserName"],
              include: [
                {
                  model: UserDetails,
                  as: "UserDetail",
                  attributes: [
                    "UserFirstName",
                    "UserMiddleName",
                    "UserLastName",
                  ],
                },
              ],
            },
          ],
        },
        {
          model: ModuleApprover,
          as: "Approvers",
          required: false,
          where: { IsDeleted: false },
          attributes: [
            "UserID",
            "Comment",
            "ApprovalStatus",
            "IsReviewSkipped",
            "ModifiedDate",
          ],
          include: [
            {
              model: Users,
              as: "ModuleApproverUser",
              attributes: ["UserName"],
              include: [
                {
                  model: UserDetails,
                  as: "UserDetail",
                  attributes: [
                    "UserFirstName",
                    "UserMiddleName",
                    "UserLastName",
                  ],
                },
              ],
            },
          ],
        },
        {
          model: ModuleStakeHolder,
          as: "StakeHolders",
          required: false,
          where: { IsDeleted: false },
          attributes: [
            "UserID",
            "Comment",
            "ApprovalStatus",
            "IsReviewSkipped",
            "ModifiedDate",
          ],
          include: [
            {
              model: Users,
              as: "ModuleStakeHolderUser",
              attributes: ["UserName"],
              include: [
                {
                  model: UserDetails,
                  as: "UserDetail",
                  attributes: [
                    "UserFirstName",
                    "UserMiddleName",
                    "UserLastName",
                  ],
                },
              ],
            },
          ],
        },
        {
          model: ModuleEscalation,
          as: "EscalationPersons",
          required: false,
          where: { IsDeleted: false },
          attributes: ["UserID", "Comment", "ApprovalStatus", "ModifiedDate"],
          include: [
            {
              model: Users,
              as: "ModuleEscalationUser",
              attributes: ["UserName"],
              include: [
                {
                  model: UserDetails,
                  as: "UserDetail",
                  attributes: [
                    "UserFirstName",
                    "UserMiddleName",
                    "UserLastName",
                  ],
                },
              ],
            },
          ],
        },
      ],
      order: [["CreatedDate", "DESC"]],
      transaction: t,
    });

    if (!moduleActivityLog) {
      await t.rollback();
      return res.status(404).json({ message: "Activity not found" });
    }

    const formattedResponse = {
      ...moduleActivityLog.toJSON(),
      userType: "Maker",
      isPublished: moduleActivityLog?.[moduleStatus] === "Published" || false,
      ActivityName: moduleActivityLog?.[moduleName] || null,
      CreatedBy: helper.formatUserName(moduleActivityLog?.CreatedByUser),
      CreatedDate: moment(moduleActivityLog?.CreatedDate).format("D MMM YYYY"),
      EscalationDate:
        moduleActivityLog?.EscalationType && moduleActivityLog?.EscalationAfter
          ? helper.calculateEscalationDate(
              moduleActivityLog?.CreatedDate,
              moduleActivityLog?.EscalationType,
              moduleActivityLog?.EscalationAfter
            )
          : null,
      IsEscalated:
        moduleActivityLog?.EscalationType && moduleActivityLog?.EscalationAfter
          ? helper.checkEscalationStatus(
              moduleActivityLog?.CreatedDate,
              moduleActivityLog?.EscalationType,
              moduleActivityLog?.EscalationAfter
            )
          : false,
      Checkers: moduleActivityLog?.Checkers.map((checker) => {
        return {
          user: helper.formatUserName(checker?.ModuleCheckerUser),
          userType: "Checker",
          comment: checker?.Comment,
          approvalStatus: checker?.ApprovalStatus,
          isReviewSkipped: checker?.IsReviewSkipped,
          modifiedDate: checker?.ModifiedDate
            ? moment(checker?.ModifiedDate).format("D MMM  YY , h:mm A")
            : null,
        };
      }),
      Approvers: moduleActivityLog?.Approvers.map((approver) => {
        return {
          user: helper.formatUserName(approver?.ModuleApproverUser),
          userType: "Approver",
          comment: approver?.Comment,
          approvalStatus: approver?.ApprovalStatus,
          isReviewSkipped: approver?.IsReviewSkipped,
          modifiedDate: approver?.ModifiedDate
            ? moment(approver?.ModifiedDate).format("D MMM  YY , h:mm A")
            : null,
        };
      }),
      StakeHolders: moduleActivityLog?.StakeHolders.map((StakeHolder) => {
        return {
          user: helper.formatUserName(StakeHolder?.ModuleStakeHolderUser),
          userType: "StakeHolder",
          comment: StakeHolder?.Comment,
          approvalStatus: StakeHolder?.ApprovalStatus,
          isReviewSkipped: StakeHolder?.IsReviewSkipped,
          modifiedDate: StakeHolder?.ModifiedDate
            ? moment(StakeHolder?.ModifiedDate).format("D MMM  YY , h:mm A")
            : null,
        };
      }),
      EscalationPersons: moduleActivityLog?.EscalationPersons.map(
        (escalation) => {
          return {
            user: helper.formatUserName(escalation?.ModuleEscalationUser),
            userType: "Escalation",
            comment: escalation?.Comment,
            approvalStatus: escalation?.ApprovalStatus,
            modifiedDate: escalation?.ModifiedDate
              ? moment(escalation?.ModifiedDate).format("D MMM  YY , h:mm A")
              : null,
          };
        }
      ),
    };

    delete formattedResponse.CreatedByUser;
    delete formattedResponse[moduleName];
    delete formattedResponse[moduleStatus];
    delete formattedResponse.EscalationType;
    delete formattedResponse.EscalationAfter;

    await t.commit();
    return res.status(200).json({
      message: "Activity fetched successfully",
      data: {
        moduleActivityLog: formattedResponse,
      },
    });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

// Module Activity Log History
const viewElementDraftActivityLogHistory = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID, ModuleID, ModuleName } = req.body;

  try {
    const moduleConfig = moduleMapping[ModuleName];

    if (!moduleConfig) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid module name" });
    }

    const { draftModel, idField, draftIdField, prefix } = moduleConfig;

    if (!draftModel || !idField || !draftIdField || !prefix) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid module configuration" });
    }

    const moduleStatus = `${prefix}Status`;
    const moduleName = `${prefix}Name`;

    const attributes = [
      draftIdField,
      idField,
      moduleName,
      moduleStatus,
      "ModuleTypeID",
      "ContentID",
      "SelfApproved",
      "EscalationType",
      "EscalationAfter",
      "NeedAcceptance",
      "MasterVersion",
      "DraftVersion",
      "CreatedBy",
      "CreatedDate",
    ];

    if (prefix === "Document") {
      attributes.push("NeedAcceptanceFromStakeHolder");
    }

    const moduleActivityLog = await draftModel.findAll({
      where: {
        ModuleTypeID,
        ContentID,
        [idField]: ModuleID,
        IsDeleted: false,
      },
      order: [["CreatedDate", "DESC"]],
      attributes,
      include: [
        {
          model: Users,
          as: "CreatedByUser",
          attributes: ["UserName", "UserType"],
          required: true,
          include: [
            {
              model: UserDetails,
              as: "UserDetail",
              attributes: ["UserFirstName", "UserMiddleName", "UserLastName"],
            },
          ],
        },
        {
          model: ModuleChecker,
          as: "Checkers",
          required: false,
          attributes: [
            "UserID",
            "Comment",
            "ApprovalStatus",
            "IsReviewSkipped",
            "ModifiedDate",
          ],
          include: [
            {
              model: Users,
              as: "ModuleCheckerUser",
              attributes: ["UserName"],
              include: [
                {
                  model: UserDetails,
                  as: "UserDetail",
                  attributes: [
                    "UserFirstName",
                    "UserMiddleName",
                    "UserLastName",
                  ],
                },
              ],
            },
          ],
        },
        {
          model: ModuleApprover,
          as: "Approvers",
          required: false,
          where: { IsDeleted: false },
          attributes: [
            "UserID",
            "Comment",
            "ApprovalStatus",
            "IsReviewSkipped",
            "ModifiedDate",
          ],
          include: [
            {
              model: Users,
              as: "ModuleApproverUser",
              attributes: ["UserName"],
              include: [
                {
                  model: UserDetails,
                  as: "UserDetail",
                  attributes: [
                    "UserFirstName",
                    "UserMiddleName",
                    "UserLastName",
                  ],
                },
              ],
            },
          ],
        },
        {
          model: ModuleStakeHolder,
          as: "StakeHolders",
          required: false,
          attributes: [
            "UserID",
            "Comment",
            "ApprovalStatus",
            "IsReviewSkipped",
            "ModifiedDate",
          ],
          include: [
            {
              model: Users,
              as: "ModuleStakeHolderUser",
              attributes: ["UserName"],
              include: [
                {
                  model: UserDetails,
                  as: "UserDetail",
                  attributes: [
                    "UserFirstName",
                    "UserMiddleName",
                    "UserLastName",
                  ],
                },
              ],
            },
          ],
        },
        {
          model: ModuleEscalation,
          as: "EscalationPersons",
          required: false,
          attributes: ["UserID", "Comment", "ApprovalStatus", "ModifiedDate"],
          include: [
            {
              model: Users,
              as: "ModuleEscalationUser",
              attributes: ["UserName"],
              include: [
                {
                  model: UserDetails,
                  as: "UserDetail",
                  attributes: [
                    "UserFirstName",
                    "UserMiddleName",
                    "UserLastName",
                  ],
                },
              ],
            },
          ],
        },
      ],
      transaction: t,
    });

    if (!moduleActivityLog || moduleActivityLog?.length === 0) {
      await t.rollback();
      return res.status(404).json({ message: "Activity not found" });
    }

    const modifiedResponse = [];

    if (moduleActivityLog && moduleActivityLog?.length > 0) {
      moduleActivityLog.forEach((module) => {
        const formattedResponse = {
          ...module.toJSON(),
          userType: "Maker",
          isPublished: module?.[moduleStatus] === "Published" || false,
          ActivityName: module?.[moduleName] || null,
          CreatedBy: helper.formatUserName(module?.CreatedByUser),
          CreatedDate: moment(module?.CreatedDate).format("D MMM YYYY"),
          EscalationDate:
            module?.EscalationType && module?.EscalationAfter
              ? helper.calculateEscalationDate(
                  module?.CreatedDate,
                  module?.EscalationType,
                  module?.EscalationAfter
                )
              : null,
          IsEscalated:
            module?.EscalationType && module?.EscalationAfter
              ? helper.checkEscalationStatus(
                  module?.CreatedDate,
                  module?.EscalationType,
                  module?.EscalationAfter
                )
              : false,
          Checkers: module?.Checkers.map((checker) => {
            return {
              user: helper.formatUserName(checker?.ModuleCheckerUser),
              userType: "Checker",
              comment: checker?.Comment,
              approvalStatus: checker?.ApprovalStatus,
              isReviewSkipped: checker?.IsReviewSkipped,
              modifiedDate: checker?.ModifiedDate
                ? moment(checker?.ModifiedDate).format("D MMM  YY , h:mm A")
                : null,
            };
          }),
          Approvers: module?.Approvers.map((approver) => {
            return {
              user: helper.formatUserName(approver?.ModuleApproverUser),
              userType: "Approver",
              comment: approver?.Comment,
              approvalStatus: approver?.ApprovalStatus,
              isReviewSkipped: approver?.IsReviewSkipped,
              modifiedDate: approver?.ModifiedDate
                ? moment(approver?.ModifiedDate).format("D MMM  YY , h:mm A")
                : null,
            };
          }),
          StakeHolders: module?.StakeHolders.map((StakeHolder) => {
            return {
              user: helper.formatUserName(StakeHolder?.ModuleStakeHolderUser),
              userType: "StakeHolder",
              comment: StakeHolder?.Comment,
              approvalStatus: StakeHolder?.ApprovalStatus,
              isReviewSkipped: StakeHolder?.IsReviewSkipped,
              modifiedDate: StakeHolder?.ModifiedDate
                ? moment(StakeHolder?.ModifiedDate).format("D MMM  YY , h:mm A")
                : null,
            };
          }),
          EscalationPersons: module?.EscalationPersons.map((escalation) => {
            return {
              user: helper.formatUserName(escalation?.ModuleEscalationUser),
              userType: "Escalation",
              comment: escalation?.Comment,
              approvalStatus: escalation?.ApprovalStatus,
              modifiedDate: escalation?.ModifiedDate
                ? moment(escalation?.ModifiedDate).format("D MMM  YY , h:mm A")
                : null,
            };
          }),
        };

        modifiedResponse.push(formattedResponse);

        delete formattedResponse.CreatedByUser;
        delete formattedResponse[moduleName];
        delete formattedResponse[moduleStatus];
        delete formattedResponse.EscalationType;
        delete formattedResponse.EscalationAfter;
      });
    }

    await t.commit();
    return res.status(200).json({
      message: "Activity history fetched successfully",
      data: {
        moduleActivityLogHistory: modifiedResponse,
      },
    });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const impactAnalysis = async (req, res, next) => {
  const t = await sequelize.transaction();
  const { lincense } = req.payload;
  const { ModuleID, ImpactAnalysisTarget } = req.body;

  try {
    if (ImpactAnalysisTarget == "Department") {
      const dpartmentLinks = await sequelize.query(
        `
      select uml."ModuleTypeID",mm."ModuleName" ,uml."ModuleID",
      rac."NoOfRisk" ,rac."NoOfCompliance" ,rac."NoOfClause" ,rac."RiskAndComplianceID",
      case 
        when sm."SOPName" is not null then sm."SOPName" 
        when dm."DocumentName" is not null then dm."DocumentName" 
        when tsm."TrainingSimulationName" is not null then tsm."TrainingSimulationName" 
        when tsm2."TestSimulationName" is not null then tsm2."TestSimulationName" 
        when tmm."TestMCQName" is not null then tmm."TestMCQName"
        when fm."FormName" is not null then fm."FormName" 
      end as "ElementName"
      from "UserModuleLinks" uml 
      inner join "Departments" osdl on osdl."DepartmentID" = uml."DepartmentID"
      AND osdl."OrganizationStructureID" = '${lincense?.EnterpriseID}'
      inner join "ModuleMasters" mm on mm."ModuleTypeID" = uml."ModuleTypeID" 
      left join "SopModules" sm on sm."SOPID" = uml."ModuleID" 
      left join "DocumentModules" dm on dm."DocumentID" = uml."ModuleID" 
      left join "TrainingSimulationModules" tsm on tsm."TrainingSimulationID" = uml."ModuleID" 
      left join "TestSimulationModules" tsm2 on tsm2."TestSimulationID" = uml."ModuleID" 
      left join "TestMcqsModules" tmm on tmm."TestMCQID" =  uml."ModuleID" 
      left join "FormModules" fm on fm."FormID" = uml."ModuleID" 
      left join "RiskAndCompliences" rac on rac."DocumentID" = dm."DocumentID" 
      and rac."MasterVersion"::text = dm."MasterVersion"::text
      where uml."DepartmentID"  = '${ModuleID}'
      and sm."IsDeleted" is not true
      and dm."IsDeleted" is not true
      and tsm."IsDeleted" is not true
      and tsm2."IsDeleted" is not true
      and tmm."IsDeleted" is not true
      and fm."IsDeleted" is not true
      group by uml."ModuleTypeID",uml."ModuleID",mm."ModuleName","ElementName",
      rac."NoOfRisk" ,rac."NoOfCompliance" ,rac."NoOfClause",rac."RiskAndComplianceID"
        `,
        {
          transaction: t,
          type: Sequelize.QueryTypes.SELECT,
        }
      );
      const groupedLinks = {
        doc: [],
        trs: [],
        tes: [],
        mcq: [],
        sop: [],
        frm: [],
      };
      for (const el of dpartmentLinks) {
        if (el.ModuleName == "SOP") {
          groupedLinks.sop.push({
            ContentLink: el.ModuleID,
            ContentLinkTitle: el.ElementName,
          });
        } else if (el.ModuleName == "TrainingSimulation") {
          groupedLinks.trs.push({
            ContentLink: el.ModuleID,
            ContentLinkTitle: el.ElementName,
          });
        } else if (el.ModuleName == "TestSimulation") {
          groupedLinks.tes.push({
            ContentLink: el.ModuleID,
            ContentLinkTitle: el.ElementName,
          });
        } else if (el.ModuleName == "Document") {
          if (el.NoOfRisk || el.NoOfClause || el.NoOfCompliance) {
            groupedLinks.doc.push({
              ContentLink: el.ModuleID,
              ContentLinkTitle: el.ElementName,
              RiskAndComplience: {
                NoOfRisk: el.NoOfRisk,
                NoOfCompliance: el.NoOfCompliance,
                NoOfClause: el.NoOfClause,
                RiskAndComplianceID: el.RiskAndComplianceID,
              },
            });
          } else {
            groupedLinks.doc.push({
              ContentLink: el.ModuleID,
              ContentLinkTitle: el.ElementName,
              RiskAndComplience: null,
            });
          }
        } else if (el.ModuleName == "TestMCQ") {
          groupedLinks.mcq.push({
            ContentLink: el.ModuleID,
            ContentLinkTitle: el.ElementName,
          });
        } else if (el.ModuleName == "Form") {
          groupedLinks.frm.push({
            ContentLink: el.ModuleID,
            ContentLinkTitle: el.ElementName,
          });
        }
      }

      await t.commit();
      return res.status(200).json({
        message: "Activity fetched successfully",
        data: {
          attachedLinks: groupedLinks,
          assignedDepartments: [],
          assignedRoles: [],
          uniqueAuditors: [],
          riskAndComplience: [],
          stakeHolders: [],
          sigatureUsers: [],
        },
      });
    } else if (ImpactAnalysisTarget == "Role") {
      const roleLinks = await sequelize.query(
        `
      select uml."ModuleTypeID",mm."ModuleName" ,uml."ModuleID",
      rac."NoOfRisk" ,rac."NoOfCompliance" ,rac."NoOfClause" ,rac."RiskAndComplianceID",
      case
      when sm."SOPName" is not null then sm."SOPName"
      when dm."DocumentName" is not null then dm."DocumentName"
      when tsm."TrainingSimulationName" is not null then tsm."TrainingSimulationName"
      when tsm2."TestSimulationName" is not null then tsm2."TestSimulationName"
      when tmm."TestMCQName" is not null then tmm."TestMCQName"
      when fm."FormName" is not null then fm."FormName"
      end as "ElementName"
      from "UserModuleLinks" uml
      inner join "Roles" osrl on osrl."RoleID" = uml."RoleID"
      AND osrl."OrganizationStructureID" = '${lincense?.EnterpriseID}'
      inner join "ModuleMasters" mm on mm."ModuleTypeID" = uml."ModuleTypeID"
      left join "SopModules" sm on sm."SOPID" = uml."ModuleID"
      left join "DocumentModules" dm on dm."DocumentID" = uml."ModuleID"
      left join "TrainingSimulationModules" tsm on tsm."TrainingSimulationID" = uml."ModuleID"
      left join "TestSimulationModules" tsm2 on tsm2."TestSimulationID" = uml."ModuleID"
      left join "TestMcqsModules" tmm on tmm."TestMCQID" =  uml."ModuleID"
      left join "FormModules" fm on fm."FormID" = uml."ModuleID"
      left join "RiskAndCompliences" rac on rac."DocumentID" = dm."DocumentID"
      and rac."MasterVersion"::text = dm."MasterVersion"::text
      AND osrl."RoleID" ='${ModuleID}'
      and sm."IsDeleted" is not true
      and dm."IsDeleted" is not true
      and tsm."IsDeleted" is not true
      and tsm2."IsDeleted" is not true
      and tmm."IsDeleted" is not true
      and fm."IsDeleted" is not true
      group by uml."ModuleTypeID",uml."ModuleID",mm."ModuleName","ElementName",
      rac."NoOfRisk" ,rac."NoOfCompliance" ,rac."NoOfClause",rac."RiskAndComplianceID"
      `,
        {
          transaction: t,
          type: Sequelize.QueryTypes.SELECT,
        }
      );
      const groupedLinks = {
        doc: [],
        trs: [],
        tes: [],
        mcq: [],
        sop: [],
        frm: [],
      };
      for (const el of roleLinks) {
        if (el.ModuleName == "SOP") {
          groupedLinks.sop.push({
            ContentLink: el.ModuleID,
            ContentLinkTitle: el.ElementName,
          });
        } else if (el.ModuleName == "TrainingSimulation") {
          groupedLinks.trs.push({
            ContentLink: el.ModuleID,
            ContentLinkTitle: el.ElementName,
          });
        } else if (el.ModuleName == "TestSimulation") {
          groupedLinks.tes.push({
            ContentLink: el.ModuleID,
            ContentLinkTitle: el.ElementName,
          });
        } else if (el.ModuleName == "Document") {
          if (el.NoOfRisk || el.NoOfClause || el.NoOfCompliance) {
            groupedLinks.doc.push({
              ContentLink: el.ModuleID,
              ContentLinkTitle: el.ElementName,
              RiskAndComplience: {
                NoOfRisk: el.NoOfRisk,
                NoOfCompliance: el.NoOfCompliance,
                NoOfClause: el.NoOfClause,
                RiskAndComplianceID: el.RiskAndComplianceID,
              },
            });
          } else {
            groupedLinks.doc.push({
              ContentLink: el.ModuleID,
              ContentLinkTitle: el.ElementName,
              RiskAndComplience: null,
            });
          }
        } else if (el.ModuleName == "TestMCQ") {
          groupedLinks.mcq.push({
            ContentLink: el.ModuleID,
            ContentLinkTitle: el.ElementName,
          });
        } else if (el.ModuleName == "Form") {
          groupedLinks.frm.push({
            ContentLink: el.ModuleID,
            ContentLinkTitle: el.ElementName,
          });
        }
      }
      await t.commit();
      return res.status(200).json({
        message: "Activity fetched successfully",
        data: {
          attachedLinks: groupedLinks,
          assignedDepartments: [],
          assignedRoles: [],
          uniqueAuditors: [],
          riskAndComplience: [],
          stakeHolders: [],
          sigatureUsers: [],
        },
      });
    } else if (ImpactAnalysisTarget == "StakeHolder") {
      const stakeHolders = await sequelize.query(
        `
        select mo."ModuleTypeID",mm."ModuleName" ,
        rac."NoOfRisk" ,rac."NoOfCompliance" ,rac."NoOfClause" ,rac."RiskAndComplianceID" ,
        case 
          when sm."SOPID" is not null then sm."SOPID" 
          when dm."DocumentID" is not null then dm."DocumentID" 
          when tsm."TrainingSimulationID" is not null then tsm."TrainingSimulationID" 
          when tsm2."TestSimulationID" is not null then tsm2."TestSimulationID" 
          when tmm."TestMCQID" is not null then tmm."TestMCQID"
          when fm."FormID" is not null then fm."FormID" 
        end as "ModuleID",
        case 
          when sm."SOPName" is not null then sm."SOPName" 
          when dm."DocumentName" is not null then dm."DocumentName" 
          when tsm."TrainingSimulationName" is not null then tsm."TrainingSimulationName" 
          when tsm2."TestSimulationName" is not null then tsm2."TestSimulationName" 
          when tmm."TestMCQName" is not null then tmm."TestMCQName"
          when fm."FormName" is not null then fm."FormName" 
        end as "ElementName"
        from "ModuleOwners" mo 
        inner join "ModuleMasters" mm on mm."ModuleTypeID" = mo."ModuleTypeID" 
        left join "SopModules" sm on sm."SOPID" = mo."SOPID" 
        left join "DocumentModules" dm on dm."DocumentID" = mo."DocumentID" 
        left join "TrainingSimulationModules" tsm on tsm."TrainingSimulationID" = mo."TrainingSimulationID"
        left join "TestSimulationModules" tsm2 on tsm2."TestSimulationID" = mo."TestSimulationID" 
        left join "TestMcqsModules" tmm on tmm."TestMCQID" =  mo."TestMCQID" 
        left join "FormModules" fm on fm."FormID" = mo."FormID" 
        left join "RiskAndCompliences" rac on rac."DocumentID" = dm."DocumentID" 
        and rac."MasterVersion"::text = dm."MasterVersion"::text
        where mo."UserID"  = '${ModuleID}'
        and sm."IsDeleted" is not true
        and dm."IsDeleted" is not true
        and tsm."IsDeleted" is not true
        and tsm2."IsDeleted" is not true
        and tmm."IsDeleted" is not true
        and fm."IsDeleted" is not true
        group by mo."ModuleTypeID",mm."ModuleName","ElementName","ModuleID",
        rac."NoOfRisk" ,rac."NoOfCompliance" ,rac."NoOfClause" ,rac."RiskAndComplianceID"
        `,
        {
          transaction: t,
          type: Sequelize.QueryTypes.SELECT,
        }
      );
      const groupedLinks = {
        doc: [],
        trs: [],
        tes: [],
        mcq: [],
        sop: [],
        frm: [],
      };
      for (const el of stakeHolders) {
        if (el.ModuleName == "SOP") {
          groupedLinks.sop.push({
            ContentLink: el.ModuleID,
            ContentLinkTitle: el.ElementName,
          });
        } else if (el.ModuleName == "TrainingSimulation") {
          groupedLinks.trs.push({
            ContentLink: el.ModuleID,
            ContentLinkTitle: el.ElementName,
          });
        } else if (el.ModuleName == "TestSimulation") {
          groupedLinks.tes.push({
            ContentLink: el.ModuleID,
            ContentLinkTitle: el.ElementName,
          });
        } else if (el.ModuleName == "Document") {
          if (el.NoOfRisk || el.NoOfClause || el.NoOfCompliance) {
            groupedLinks.doc.push({
              ContentLink: el.ModuleID,
              ContentLinkTitle: el.ElementName,
              RiskAndComplience: {
                NoOfRisk: el.NoOfRisk,
                NoOfCompliance: el.NoOfCompliance,
                NoOfClause: el.NoOfClause,
                RiskAndComplianceID: el.RiskAndComplianceID,
              },
            });
          } else {
            groupedLinks.doc.push({
              ContentLink: el.ModuleID,
              ContentLinkTitle: el.ElementName,
              RiskAndComplience: null,
            });
          }
        } else if (el.ModuleName == "TestMCQ") {
          groupedLinks.mcq.push({
            ContentLink: el.ModuleID,
            ContentLinkTitle: el.ElementName,
          });
        } else if (el.ModuleName == "Form") {
          groupedLinks.frm.push({
            ContentLink: el.ModuleID,
            ContentLinkTitle: el.ElementName,
          });
        }
      }
      await t.commit();
      return res.status(200).json({
        message: "Activity fetched successfully",
        data: {
          attachedLinks: groupedLinks,
          assignedDepartments: [],
          assignedRoles: [],
          uniqueAuditors: [],
          riskAndComplience: [],
          stakeHolders: [],
          sigatureUsers: [],
        },
      });
    } else if (
      ImpactAnalysisTarget == "Auditor" ||
      ImpactAnalysisTarget == "UserSignature"
    ) {
      let conditions = `
      where sm."IsDeleted" is not true
      and dm."IsDeleted" is not true
      and tsm."IsDeleted" is not true
      and tsm2."IsDeleted" is not true
      and tmm."IsDeleted" is not true
      and fm."IsDeleted" is not true
      `;
      if (ImpactAnalysisTarget == "Auditor") {
        conditions += `and '${ModuleID}' = ANY(as2."AuditorIDs")`;
      } else if (ImpactAnalysisTarget == "UserSignature") {
        conditions += `and '${ModuleID}' = ANY(as2."SignatureIDs")`;
      }
      const auditors = await sequelize.query(
        `
        select mm."ModuleTypeID",mm."ModuleName" , as2."ModuleID",
        rac."NoOfRisk" ,rac."NoOfCompliance" ,rac."NoOfClause",rac."RiskAndComplianceID",
        case 
          when sm."SOPName" is not null then sm."SOPName" 
          when dm."DocumentName" is not null then dm."DocumentName" 
          when tsm."TrainingSimulationName" is not null then tsm."TrainingSimulationName" 
          when tsm2."TestSimulationName" is not null then tsm2."TestSimulationName" 
          when tmm."TestMCQName" is not null then tmm."TestMCQName"
          when fm."FormName" is not null then fm."FormName" 
        end as "ElementName"
        from "AuditorSignatures" as2 
        inner join "ModuleMasters" mm on mm."ModuleTypeID" = as2."ModuleTypeID" 
        left join "SopModules" sm on sm."SOPID" =  as2."ModuleID"  
        left join "DocumentModules" dm on dm."DocumentID" =  as2."ModuleID" 
        left join "TrainingSimulationModules" tsm on tsm."TrainingSimulationID" =  as2."ModuleID" 
        left join "TestSimulationModules" tsm2 on tsm2."TestSimulationID" =  as2."ModuleID" 
        left join "TestMcqsModules" tmm on tmm."TestMCQID" =  as2."ModuleID" 
        left join "FormModules" fm on fm."FormID" =  as2."ModuleID"
        left join "RiskAndCompliences" rac on rac."DocumentID" = dm."DocumentID" 
        and rac."MasterVersion"::text = dm."MasterVersion"::text ${conditions}
        group by mm."ModuleTypeID",mm."ModuleName","ElementName",as2."ModuleID",
        rac."NoOfRisk" ,rac."NoOfCompliance" ,rac."NoOfClause",rac."RiskAndComplianceID"
        `,
        {
          transaction: t,
          type: Sequelize.QueryTypes.SELECT,
        }
      );
      const groupedLinks = {
        doc: [],
        trs: [],
        tes: [],
        mcq: [],
        sop: [],
        frm: [],
      };
      for (const el of auditors) {
        if (el.ModuleName == "SOP") {
          groupedLinks.sop.push({
            ContentLink: el.ModuleID,
            ContentLinkTitle: el.ElementName,
          });
        } else if (el.ModuleName == "TrainingSimulation") {
          groupedLinks.trs.push({
            ContentLink: el.ModuleID,
            ContentLinkTitle: el.ElementName,
          });
        } else if (el.ModuleName == "TestSimulation") {
          groupedLinks.tes.push({
            ContentLink: el.ModuleID,
            ContentLinkTitle: el.ElementName,
          });
        } else if (el.ModuleName == "Document") {
          if (el.NoOfRisk || el.NoOfClause || el.NoOfCompliance) {
            groupedLinks.doc.push({
              ContentLink: el.ModuleID,
              ContentLinkTitle: el.ElementName,
              RiskAndComplience: {
                NoOfRisk: el.NoOfRisk,
                NoOfCompliance: el.NoOfCompliance,
                NoOfClause: el.NoOfClause,
                RiskAndComplianceID: el.RiskAndComplianceID,
              },
            });
          } else {
            groupedLinks.doc.push({
              ContentLink: el.ModuleID,
              ContentLinkTitle: el.ElementName,
              RiskAndComplience: null,
            });
          }
        } else if (el.ModuleName == "TestMCQ") {
          groupedLinks.mcq.push({
            ContentLink: el.ModuleID,
            ContentLinkTitle: el.ElementName,
          });
        } else if (el.ModuleName == "Form") {
          groupedLinks.frm.push({
            ContentLink: el.ModuleID,
            ContentLinkTitle: el.ElementName,
          });
        }
      }
      await t.commit();
      return res.status(200).json({
        message: "Activity fetched successfully",
        data: {
          attachedLinks: groupedLinks,
          assignedDepartments: [],
          assignedRoles: [],
          uniqueAuditors: [],
          riskAndComplience: [],
          stakeHolders: [],
          sigatureUsers: [],
        },
      });
    } else {
      const SOPDetails = await SopDetails.findAll({
        where: {
          SopID: ModuleID,
          IsActive: true,
        },
        attributes: ["SopDetailsID"],
        transaction: t,
      });

      const SOPDetailsID = [];
      if (SOPDetails.length > 0) {
        SOPDetails.forEach((sop) => {
          SOPDetailsID.push(sop?.SopDetailsID);
        });
      }

      let attachedLinks = await SopAttachmentLinks.findAll({
        where: {
          SopDetailsID: SOPDetailsID,
          IsActive: true,
        },
        attributes: [
          "ContentLink",
          "ContentLinkType",
          "ContentLinkTitle",
          [
            sequelize.literal(`
            (
              select json_build_object('NoOfRisk',coalesce(rac."NoOfRisk",0),
              'NoOfCompliance',coalesce(rac."NoOfCompliance",0),
              'NoOfClause',coalesce(rac."NoOfClause",0))  
              from "DocumentModules" dm
              inner join "RiskAndCompliences" rac on rac."DocumentID"::text = "SopAttachmentLinks"."ContentLink"::text 
              and rac."MasterVersion"::text = dm."MasterVersion"::text
              where dm."DocumentID"::text = "SopAttachmentLinks"."ContentLink"::text
              and "SopAttachmentLinks"."ContentLinkType" = 'doc'
              )
            `),
            "RiskAndComplience",
          ],
        ],
        transaction: t,
      });

      const assignedDepartmentsAndRoles = await UserModuleLink.findAll({
        where: {
          ModuleID,
          IsDeleted: false,
          [Op.or]: [
            {
              DepartmentID: {
                [Op.ne]: null,
              },
            },
            {
              RoleID: {
                [Op.ne]: null,
              },
            },
          ],
        },
        attributes: ["DepartmentID", "RoleID", "IsAuditor", "UserID"],
        include: [
          {
            model: Departments,
            as: "AssignedDepartments",
            attributes: ["DepartmentName"],
          },
          {
            model: Roles,
            as: "AssignedRoles",
            attributes: ["RoleName"],
          },
        ],
        group: [
          "UserModuleLink.DepartmentID",
          "AssignedDepartments.DepartmentID",
          "UserModuleLink.RoleID",
          "AssignedRoles.RoleID",
          "UserModuleLink.IsAuditor",
          "UserModuleLink.UserID",
        ],
        transaction: t,
      });
      const riskAndComplience = await RiskAndCompliences.findOne({
        where: {
          DocumentID: ModuleID,
          MasterVersion: sequelize.literal(
            `"MasterVersion"::text IN (select "MasterVersion"::text from "DocumentModules" where "DocumentID" = '${ModuleID}' limit 1)`
          ),
        },
        attributes: [
          "RiskAndComplianceID",
          "NoOfRisk",
          "NoOfCompliance",
          "NoOfClause",
        ],
        transaction: t,
      });
      const conditions = {};
      if (ImpactAnalysisTarget == "SOP") {
        conditions.SOPID = ModuleID;
      } else if (ImpactAnalysisTarget == "TrainingSimulation") {
        conditions.TrainingSimulationID = ModuleID;
      } else if (ImpactAnalysisTarget == "TestSimulation") {
        conditions.TestSimulationID = ModuleID;
      } else if (ImpactAnalysisTarget == "Document") {
        conditions.DocumentID = ModuleID;
      } else if (ImpactAnalysisTarget == "TestMCQ") {
        conditions.TestMCQID = ModuleID;
      } else if (ImpactAnalysisTarget == "Form") {
        conditions.FormID = ModuleID;
      }
      const ownerList = await ModuleOwner.findAll({
        where: {
          ...conditions,
          IsDeleted: false,
          IsActive: true,
        },
        attributes: ["UserID"],
        include: {
          model: UserDetails,
          as: "User",
          attributes: [
            "UserFirstName",
            "UserLastName",
            "UserMiddleName",
            "UserID",
          ],
        },
        group: ["ModuleOwner.UserID", "User.UserID"],
      });
      // Process results to separate unique departments and roles
      const uniqueDepartmentsMap = new Map();
      const uniqueRolesMap = new Map();
      assignedDepartmentsAndRoles.forEach((record) => {
        // Add unique departments
        if (record.DepartmentID !== null) {
          uniqueDepartmentsMap.set(record.DepartmentID, {
            DepartmentID: record.DepartmentID,
            DepartmentName: record.AssignedDepartments.DepartmentName,
          });
        }

        // Add unique roles
        if (record.RoleID !== null) {
          uniqueRolesMap.set(record.RoleID, {
            RoleID: record.RoleID,
            RoleName: record.AssignedRoles.RoleName,
          });
        }
      });

      // Convert the Maps back to arrays
      const assignedDepartments = Array.from(uniqueDepartmentsMap.values());
      const assignedRoles = Array.from(uniqueRolesMap.values());

      if (ImpactAnalysisTarget !== "SOP") {
        const modulesOtherThanSOP = await SopAttachmentLinks.findAll({
          where: {
            ContentLink: {
              [Op.eq]: ModuleID,
            },
            IsActive: true,
          },
          attributes: [
            "ContentLink",
            "ContentLinkType",
            "ContentLinkTitle",
            "SopDetailsID",
          ],
          include: [
            {
              model: SopDetails,
              as: "SopDetails",
              attributes: ["SopID"],
              where: {
                SopID: {
                  [Op.ne]: null, // Ensures SopDetails exists (i.e., SopID is not null)
                },
              },
              include: [
                {
                  required: true,
                  model: SopModule,
                  as: "SopModule",
                  attributes: ["SOPName", "SOPID"],
                },
              ],
            },
          ],
          transaction: t,
        });

        const modifiedRes = modulesOtherThanSOP.map((res) => ({
          ContentLink: res.SopDetails?.SopModule?.SOPID,
          ContentLinkTitle: res.SopDetails?.SopModule?.SOPName,
          ContentLinkType: "sop",
        }));

        attachedLinks = [...attachedLinks, ...modifiedRes];
      }

      if (
        attachedLinks.length === 0 &&
        assignedDepartments.length === 0 &&
        assignedRoles.length === 0
      ) {
        await t.rollback();
        return res
          .status(404)
          .json({ message: "No assigned and linked elements found!" });
      }

      const groupedLinks = attachedLinks.reduce(
        (acc, link) => {
          const { ContentLinkType } = link;

          if (!acc[ContentLinkType]) {
            acc[ContentLinkType] = [];
          }

          if (ContentLinkType == "doc") {
            acc[ContentLinkType].push({
              ContentLink: link.ContentLink,
              ContentLinkTitle: link.ContentLinkTitle,
              RiskAndComplience: JSON.parse(JSON.stringify(link))
                .RiskAndComplience,
            });
          } else {
            acc[ContentLinkType].push({
              ContentLink: link.ContentLink,
              ContentLinkTitle: link.ContentLinkTitle,
            });
          }

          return acc;
        },
        {
          doc: [],
          trs: [],
          tes: [],
          mcq: [],
          sop: [],
        }
      );
      const auditorAndSigatureUsers = await sequelize.query(
        `SELECT 
          'Auditor' as "UserType",
          "ud"."UserID",
          "ud"."UserFirstName",
          "ud"."UserLastName",
          "ud"."UserMiddleName"
      FROM "AuditorSignatures"
      INNER JOIN "UserDetails" ud
          ON ud."UserID" = ANY ("AuditorSignatures"."AuditorIDs")
          WHERE "AuditorSignatures"."ModuleID" = '${ModuleID}'
          GROUP BY "ud"."UserID"
      UNION ALL 
       SELECT 
          'Signature' as "UserType",
          "ud"."UserID",
          "ud"."UserFirstName",
          "ud"."UserLastName",
          "ud"."UserMiddleName"
      FROM "AuditorSignatures"
      INNER JOIN "UserDetails" ud
          ON ud."UserID" = ANY ("AuditorSignatures"."SignatureIDs")
          WHERE "AuditorSignatures"."ModuleID" = '${ModuleID}'
          GROUP BY "ud"."UserID";
      `,
        {
          type: sequelize.QueryTypes.SELECT,
        }
      );
      const uniqueAuditors = [],
        sigatureUsers = [];
      for (const el of auditorAndSigatureUsers) {
        if (el.UserType == "Auditor") {
          uniqueAuditors.push({
            UserID: el.UserID,
            UserFirstName: el.UserFirstName,
            UserLastName: el.UserLastName,
            UserMiddleName: el.UserMiddleName,
          });
        } else if (el.UserType == "Signature") {
          sigatureUsers.push({
            UserID: el.UserID,
            UserFirstName: el.UserFirstName,
            UserLastName: el.UserLastName,
            UserMiddleName: el.UserMiddleName,
          });
        }
      }

      await t.commit();
      return res.status(200).json({
        message: "Activity fetched successfully",
        data: {
          attachedLinks: groupedLinks,
          assignedDepartments,
          assignedRoles,
          uniqueAuditors,
          riskAndComplience,
          stakeHolders: ownerList.map((x) => x.User),
          sigatureUsers,
        },
      });
    }
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

// Form Modules
const createFormModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const {
    ModuleTypeID,
    ContentID = null,
    FormID = null,
    FormName,
    FormDescription,
    FormIsActive,
    FormTags,
    FormOwner,
    Checker,
    Approver,
    EscalationPerson,
    EscalationType = null,
    EscalationAfter = null,
    SelfApproved,
    FormExpiry,
    NeedAcceptance = false,
  } = req.body;

  const { currentUserId } = req.payload;
  let newFormModuleDraft = null;
  let createdFormModule = null;
  let createdFormModuleDraft = null;

  try {
    const assignUsers = [];
    const assignMaker = [...JSON.parse(JSON.stringify(FormOwner))];
    let assignChecker = [];
    if (
      Checker &&
      Checker.length > 0 &&
      EscalationPerson &&
      EscalationPerson.length > 0
    ) {
      assignChecker = [...JSON.parse(JSON.stringify(Checker))];
      assignEscalation = [...JSON.parse(JSON.stringify(EscalationPerson))];
    }
    let moduleDetails, draftDetails;

    if (FormID) {
      moduleDetails = { FormID, FormName };
      let existingFormModuleDraft = await FormModuleDraft.findOne({
        where: { ModuleTypeID, FormID, ContentID },
        order: [["CreatedDate", "DESC"]],
        transaction: t,
      });
      if (!existingFormModuleDraft) {
        await t.rollback();
        return res.status(404).json({ message: "Form not found" });
      }

      existingFormModuleDraft = existingFormModuleDraft.toJSON();

      const isUserPermissibleToDelete = await checkUserPermission(
        FormModuleDraft,
        ModuleTypeID,
        ContentID,
        "FormID",
        FormID,
        "FormModuleDraftID",
        existingFormModuleDraft.FormModuleDraftID,
        currentUserId,
        t
      );

      if (!isUserPermissibleToDelete) {
        await t.rollback();
        return res
          .status(403)
          .json({ message: "You are unathorized to edit or publish" });
      }

      let latestDraftVersion;
      let latestMasterVersion = null;
      if (SelfApproved === "true") {
        if (existingFormModuleDraft.MasterVersion) {
          latestMasterVersion = (
            parseFloat(existingFormModuleDraft.MasterVersion) + 1.0
          ).toFixed(1);
        } else {
          latestMasterVersion = Math.ceil(
            parseFloat(existingFormModuleDraft.DraftVersion)
          ).toFixed(1);
        }

        latestDraftVersion = (parseFloat(latestMasterVersion) - 0.9).toFixed(1);
      } else {
        if (existingFormModuleDraft.MasterVersion) {
          latestDraftVersion = (
            parseFloat(existingFormModuleDraft.MasterVersion) + 0.1
          ).toFixed(1);
        } else {
          latestDraftVersion = (
            parseFloat(existingFormModuleDraft.DraftVersion) + 0.1
          ).toFixed(1);
        }
      }

      newFormModuleDraft = await FormModuleDraft.create(
        {
          ModuleTypeID,
          FormID,
          ContentID,
          FormName,
          FormDescription,
          FormIsActive,
          FormStatus: SelfApproved === "true" ? "Published" : "InProgress",
          DraftVersion: latestDraftVersion.toString(),
          MasterVersion: SelfApproved === "true" ? latestMasterVersion : null,
          FormTags,
          SelfApproved,
          CreatedBy: currentUserId,
          FormExpiry,
          FormJSON: existingFormModuleDraft.FormJSON,
          FormCreatedBy: existingFormModuleDraft.CreatedBy,
          FormCreatedDate: existingFormModuleDraft.CreatedDate,
          FormModifiedBy: existingFormModuleDraft.FormModifiedBy,
          FormModifiedDate: existingFormModuleDraft.FormModifiedDate,
          NeedAcceptance,
        },
        { transaction: t }
      );

      if (FormOwner && FormOwner.length > 0) {
        await ModuleOwner.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              FormID,
              ContentID,
              FormModuleDraftID: existingFormModuleDraft.FormModuleDraftID,
            },
            transaction: t,
          }
        );

        const ownerData = FormOwner.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            FormID,
            FormModuleDraftID: newFormModuleDraft.FormModuleDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });
        draftDetails = {
          FormModuleDraftID: newFormModuleDraft.FormModuleDraftID,
          FormName,
        };
        await ModuleOwner.bulkCreate(ownerData, { transaction: t });
      }

      if (SelfApproved === "true") {
        await FormModule.update(
          {
            FormName,
            FormDescription,
            FormIsActive,
            FormTags,
            SelfApproved,
            FormStatus: "Published",
            DraftVersion: latestDraftVersion.toString(),
            MasterVersion: latestMasterVersion,
            ModifiedBy: currentUserId,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
            FormExpiry,
            FormJSON: existingFormModuleDraft.FormJSON,
            FormCreatedBy: existingFormModuleDraft.CreatedBy,
            FormCreatedDate: existingFormModuleDraft.CreatedDate,
            FormModifiedBy: existingFormModuleDraft.FormModifiedBy,
            FormModifiedDate: existingFormModuleDraft.FormModifiedDate,
          },
          { where: { ModuleTypeID, FormID, ContentID }, transaction: t }
        );
      }

      if (SelfApproved === "false") {
        await FormModuleDraft.update(
          { EscalationType, EscalationAfter },
          {
            where: {
              ModuleTypeID,
              FormModuleDraftID: newFormModuleDraft.FormModuleDraftID,
              FormID,
              ContentID,
            },
            transaction: t,
          }
        );
      } else {
        await FormModuleDraft.update(
          {
            EscalationType: null,
            EscalationAfter: null,
          },
          {
            where: {
              ModuleTypeID,
              FormModuleDraftID: newFormModuleDraft.FormModuleDraftID,
              FormID,
              ContentID,
            },
            transaction: t,
          }
        );
      }

      if (SelfApproved === "false" && Checker && Checker.length > 0) {
        await ModuleChecker.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              FormID,
              ContentID,
              FormModuleDraftID: existingFormModuleDraft.FormModuleDraftID,
            },
            transaction: t,
          }
        );
        const checkerData = Checker.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            FormModuleDraftID: newFormModuleDraft.FormModuleDraftID,
            FormID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleChecker.bulkCreate(checkerData, { transaction: t });
        sentModuleBulkEmail(checkerData, "Checker");
      } else if (SelfApproved === "true") {
        await ModuleChecker.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              FormID,
              ContentID,
              FormModuleDraftID: existingFormModuleDraft.FormModuleDraftID,
            },
            transaction: t,
          }
        );
      }

      if (SelfApproved === "false" && Approver && Approver.length > 0) {
        await ModuleApprover.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              FormID,
              ContentID,
              FormModuleDraftID: existingFormModuleDraft.FormModuleDraftID,
            },
            transaction: t,
          }
        );
        const approverData = Approver.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            FormModuleDraftID: newFormModuleDraft.FormModuleDraftID,
            FormID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleApprover.bulkCreate(approverData, { transaction: t });
      } else if (SelfApproved === "true") {
        await ModuleApprover.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              FormID,
              ContentID,
              FormModuleDraftID: existingFormModuleDraft.FormModuleDraftID,
            },
            transaction: t,
          }
        );
      }

      if (
        SelfApproved === "false" &&
        EscalationPerson &&
        EscalationPerson.length > 0
      ) {
        await ModuleEscalation.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              FormID,
              ContentID,
              FormModuleDraftID: existingFormModuleDraft.FormModuleDraftID,
            },
            transaction: t,
          }
        );

        const escalationData = EscalationPerson.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            FormModuleDraftID: newFormModuleDraft.FormModuleDraftID,
            FormID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleEscalation.bulkCreate(escalationData, { transaction: t });
      } else if (SelfApproved === "true") {
        await ModuleEscalation.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              FormID,
              ContentID,
              FormModuleDraftID: existingFormModuleDraft.FormModuleDraftID,
            },
            transaction: t,
          }
        );
      }
    } else {
      createdFormModule = await FormModule.create(
        {
          ModuleTypeID,
          FormName,
          FormDescription,
          FormIsActive,
          FormTags,
          ContentID,
          SelfApproved,
          FormStatus: SelfApproved === "true" ? "Published" : "InProgress",
          MasterVersion: SelfApproved === "true" ? "1.0" : null,
          CreatedBy: currentUserId,
          FormExpiry,
          NeedAcceptance,
        },
        { transaction: t }
      );

      createdFormModuleDraft = await FormModuleDraft.create(
        {
          ModuleTypeID,
          FormID: createdFormModule.FormID,
          FormName,
          FormDescription,
          FormIsActive,
          FormTags,
          DraftVersion: "0.1",
          FormStatus: SelfApproved === "true" ? "Published" : "InProgress",
          MasterVersion: SelfApproved === "true" ? "1.0" : null,
          ContentID,
          SelfApproved,
          CreatedBy: currentUserId,
          FormExpiry,
          NeedAcceptance,
        },
        { transaction: t }
      );
      moduleDetails = {
        FormID: createdFormModule.FormID,
        FormName,
      };
      draftDetails = {
        FormModuleDraftID: createdFormModuleDraft.FormModuleDraftID,
        FormName,
      };
      if (FormOwner && FormOwner.length > 0) {
        const ownerData = FormOwner.map((userId) => {
          return {
            ModuleTypeID,
            FormID: createdFormModule.FormID,
            ContentID,
            FormModuleDraftID: createdFormModuleDraft.FormModuleDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleOwner.bulkCreate(ownerData, { transaction: t });
      }

      if (SelfApproved === "false" && Checker && Checker.length > 0) {
        const checkerData = Checker.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            FormModuleDraftID: createdFormModuleDraft.FormModuleDraftID,
            FormID: createdFormModule.FormID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleChecker.bulkCreate(checkerData, { transaction: t });
        sentModuleBulkEmail(checkerData, "Checker");
      }

      if (SelfApproved === "false" && Approver && Approver.length > 0) {
        const approverData = Approver.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            FormModuleDraftID: createdFormModuleDraft.FormModuleDraftID,
            FormID: createdFormModule.FormID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleApprover.bulkCreate(approverData, { transaction: t });
      }

      if (
        SelfApproved === "false" &&
        EscalationPerson &&
        EscalationPerson.length > 0
      ) {
        const escalationData = EscalationPerson.map((userId) => {
          return {
            ModuleTypeID,
            ContentID,
            FormModuleDraftID: createdFormModuleDraft.FormModuleDraftID,
            FormID: createdFormModule.FormID,
            UserID: userId,
            CreatedBy: currentUserId,
            CreatedDate: literal("CURRENT_TIMESTAMP"),
          };
        });

        await ModuleEscalation.bulkCreate(escalationData, { transaction: t });
      }

      if (SelfApproved === "false") {
        await FormModule.update(
          { EscalationType, EscalationAfter },
          {
            where: {
              ModuleTypeID,
              ContentID,
              FormID: createdFormModule.FormID,
            },
            transaction: t,
          }
        );
        await FormModuleDraft.update(
          { EscalationType, EscalationAfter },
          {
            where: {
              ModuleTypeID,
              ContentID,
              FormModuleDraftID: createdFormModuleDraft.FormModuleDraftID,
              FormID: createdFormModule.FormID,
            },
            transaction: t,
          }
        );
      }
    }
    const notififactionBulk = [];
    if (SelfApproved == "true") {
      const modulelinks = await UserModuleLink.findAll({
        where: {
          ModuleID: moduleDetails.FormID,
          StartDate: {
            [Op.lte]: literal("CURRENT_TIMESTAMP"),
          },
          DueDate: {
            [Op.gte]: literal("CURRENT_TIMESTAMP"),
          },
        },
        attributes: ["UserID"],
      });
      for (const el of JSON.parse(JSON.stringify(modulelinks))) {
        assignUsers.push(el.UserID);
      }
      const notificationStatus = await Notification.findAll({
        where: {
          UserID: [...assignMaker, ...assignUsers],
          NotificationTypeForPublish: ["push", "both"],
        },
        attributes: ["UserID", "NotificationTypeForPublish"],
      });
      for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
        for (const UserID of assignMaker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Module Owner",
              NotificationType: "update",
              LinkedType: "Form",
              LinkedID: moduleDetails.FormID,
              CreatedBy: currentUserId,
            });
          }
        }
        for (const UserID of assignUsers) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Updated Element assign version is published",
              NotificationType: "assignment",
              LinkedType: "Form",
              LinkedID: moduleDetails.FormID,
              CreatedBy: currentUserId,
            });
          }
        }
      }
    } else {
      const notificationStatus = await Notification.findAll({
        where: {
          UserID: [...assignMaker, ...assignChecker],
          NotificationTypeForAction: ["push", "both"],
        },
        attributes: ["UserID", "NotificationTypeForAction"],
      });
      for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
        for (const UserID of assignMaker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Module InProgress Owner",
              NotificationType: "update",
              LinkedType: "Form",
              LinkedID: draftDetails.FormModuleDraftID,
              CreatedBy: currentUserId,
            });
          }
        }
        for (const UserID of assignChecker) {
          if (UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assign as a Checker",
              NotificationType: "actionable",
              LinkedType: "Form",
              LinkedID: draftDetails.FormModuleDraftID,
              CreatedBy: currentUserId,
            });
          }
        }
      }
    }

    // for (const el of notififactionBulk) {
    //   await UserNotification.create(el);
    // }
    // await sendNotification(notififactionBulk);

    if (notififactionBulk.length > 0) {
      await UserNotification.bulkCreate(notififactionBulk, {
        ignoreDuplicates: true,
        transaction: t,
      });
      await sendNotification(notififactionBulk);
    }

    await t.commit();
    return res.status(201).json({
      message: "Form Module created successfully",
      data: {
        formModuleDraftID:
          newFormModuleDraft?.FormModuleDraftID ||
          createdFormModuleDraft?.FormModuleDraftID,
        FormID: FormID ?? createdFormModule?.FormID,
      },
    });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const publishFormModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, FormID, ContentID } = req.body;
  const { currentUserId } = req.payload;

  try {
    let existingFormModuleDraft = await FormModuleDraft.findOne({
      where: { ModuleTypeID, FormID, ContentID },
      order: [["CreatedDate", "DESC"]], // Order by the creation date to get the last record
      transaction: t,
    });

    if (!existingFormModuleDraft) {
      await t.rollback();
      return res.status(404).json({ message: "Form not found" });
    }

    existingFormModuleDraft = existingFormModuleDraft.toJSON();

    const isUserPermissibleToDelete = await checkUserPermission(
      FormModuleDraft,
      ModuleTypeID,
      ContentID,
      "FormID",
      FormID,
      "FormModuleDraftID",
      existingFormModuleDraft.FormModuleDraftID,
      currentUserId,
      t
    );

    if (!isUserPermissibleToDelete) {
      await t.rollback();
      return res.status(403).json({ message: "You are unathorized publish" });
    }

    const parsedDraftVersion = parseFloat(existingFormModuleDraft.DraftVersion);

    const latestMasterVersion = Math.ceil(parsedDraftVersion).toFixed(1);

    await Promise.all([
      FormModule.update(
        {
          FormName: existingFormModuleDraft.FormName,
          FormDescription: existingFormModuleDraft.FormDescription,
          FormStatus: "Published",
          FormIsActive: existingFormModuleDraft.FormIsActive,
          FormTags: existingFormModuleDraft.FormTags,
          EscalationType: existingFormModuleDraft.EscalationType,
          EscalationAfter: existingFormModuleDraft.EscalationAfter,
          SelfApproved: existingFormModuleDraft.SelfApproved,
          DraftVersion: existingFormModuleDraft.DraftVersion,
          MasterVersion: latestMasterVersion,
          FormJSON: existingFormModuleDraft.FormJSON,
          FormExpiry: existingFormModuleDraft.FormExpiry,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
          FormCreatedBy: existingFormModuleDraft.FormCreatedBy,
          FormCreatedDate: existingFormModuleDraft.FormCreatedDate,
          FormModifiedBy: existingFormModuleDraft.FormModifiedBy,
          FormModifiedDate: existingFormModuleDraft.FormModifiedDate,
          NeedAcceptance: existingFormModuleDraft.NeedAcceptance,
        },
        { where: { ModuleTypeID, FormID, ContentID }, transaction: t }
      ),
      FormModuleDraft.update(
        {
          FormStatus: "Published",
          MasterVersion: latestMasterVersion,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: {
            ModuleTypeID,
            FormModuleDraftID: existingFormModuleDraft.FormModuleDraftID,
            FormID,
            ContentID,
          },
          transaction: t,
        }
      ),
    ]);
    const modulelinks = await UserModuleLink.findAll({
      where: {
        ModuleID: FormID,
        StartDate: {
          [Op.lte]: literal("CURRENT_TIMESTAMP"),
        },
        DueDate: {
          [Op.gte]: literal("CURRENT_TIMESTAMP"),
        },
      },
      attributes: ["UserID"],
    });
    const assignUsers = [],
      notififactionBulk = [];
    for (const el of JSON.parse(JSON.stringify(modulelinks))) {
      assignUsers.push(el.UserID);
    }
    const notificationStatus = await Notification.findAll({
      where: {
        UserID: assignUsers,
        NotificationTypeForPublish: ["push", "both"],
      },
      attributes: ["UserID", "NotificationTypeForPublish"],
    });
    for (const el of JSON.parse(JSON.stringify(notificationStatus))) {
      for (const UserID of assignUsers) {
        if (UserID == el.UserID) {
          notififactionBulk.push({
            UserID: el.UserID,
            Message: "Updated Element assign version is published",
            NotificationType: "assignment",
            LinkedType: "Form",
            LinkedID: FormID,
            CreatedBy: currentUserId,
          });
        }
      }
    }

    // for (const el of notififactionBulk) {
    //   await UserNotification.create(el);
    // }
    // await sendNotification(notififactionBulk);

    if (notififactionBulk.length > 0) {
      await UserNotification.bulkCreate(notififactionBulk, {
        ignoreDuplicates: true,
        transaction: t,
      });
      await sendNotification(notififactionBulk);
    }

    await t.commit();
    return res
      .status(200)
      .json({ message: "Form Module Status published successfully" });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const viewFormModuleDraft = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID, FormID } = req.body;

  try {
    const formDraft = await FormModuleDraft.findOne({
      where: { ModuleTypeID, FormID, ContentID, IsDeleted: false },
      include: [
        {
          model: ModuleChecker,
          as: "Checkers",
          required: false, // This ensures FormModuleDraft is returned even if ModuleChecker doesn't exist
          where: {
            IsDeleted: false, // Include only if not deleted
          },
          attributes: ["UserID"],
          include: [
            {
              model: Users,
              as: "ModuleCheckerUser",
              attributes: ["UserID", "UserName"],
            },
          ],
        },
        {
          model: ModuleEscalation,
          as: "EscalationPersons",
          required: false, // This ensures FormModuleDraft is returned even if ModuleEscalation doesn't exist
          where: {
            IsDeleted: false, // Include only if not deleted
          },
          attributes: ["UserID"],
          include: [
            {
              model: Users,
              as: "ModuleEscalationUser",
              attributes: ["UserID", "UserName"],
            },
          ],
        },
        {
          model: ModuleOwner,
          as: "ModuleOwners",
          required: false,
          where: {
            IsDeleted: false,
          },
          attributes: ["UserID"],
          include: [
            {
              model: Users,
              as: "ModuleOwnerUser",
              attributes: ["UserID", "UserName"],
            },
          ],
        },
      ],
      order: [["CreatedDate", "DESC"]],
      transaction: t,
    });

    if (!formDraft) {
      await t.rollback();
      return res.status(404).json({ message: "Form not found" });
    }

    await t.commit();
    return res.status(200).json({
      message: "Form fetched successfully",
      data: {
        formDraft,
      },
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const listFormModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID } = req.body;

  try {
    const formList = await FormModuleDraft.findAll({
      where: {
        ModuleTypeID,
        ContentID,
        IsDeleted: false,
      },
      attributes: [
        "FormID",
        "FormName",
        "DraftVersion",
        "MasterVersion",
        "CreatedDate",
      ],
      where: {
        [Op.and]: [
          { ModuleTypeID },
          { ContentID },
          { IsDeleted: false },
          Sequelize.literal(`
        "CreatedDate" = (
          SELECT MAX("CreatedDate") 
          FROM "FormModuleDrafts" AS "sub" 
          WHERE 
            "sub"."FormID" = "FormModuleDraft"."FormID" 
            AND "sub"."IsDeleted" = false
        )
      `),
        ],
      },
      order: [["CreatedDate", "DESC"]],
      transaction: t,
    });

    await t.commit();
    return res.status(200).json({
      message: "Forms list fetched successfully",
      data: {
        formList,
      },
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const deleteFormModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID, FormID } = req.body;
  const { currentUserId } = req.payload;

  try {
    const existingFormModuleDraft = await FormModuleDraft.findOne({
      where: { ModuleTypeID, FormID, ContentID },
      order: [["CreatedDate", "DESC"]],
      transaction: t,
    });

    if (!existingFormModuleDraft) {
      await t.rollback();
      return res.status(404).json({ message: "Form not found" });
    }

    const isUserPermissibleToDelete = await checkUserPermission(
      FormModuleDraft,
      ModuleTypeID,
      ContentID,
      "FormID",
      FormID,
      "FormModuleDraftID",
      existingFormModuleDraft.FormModuleDraftID,
      currentUserId,
      t
    );

    if (!isUserPermissibleToDelete) {
      await t.rollback();
      return res.status(403).json({ message: "You are unathorized to delete" });
    }

    await Promise.all([
      FormModuleDraft.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, ContentID, FormID }, transaction: t }
      ),
      FormModule.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, ContentID, FormID }, transaction: t }
      ),
      ModuleChecker.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, FormID, ContentID }, transaction: t }
      ),
      ModuleApprover.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, FormID, ContentID }, transaction: t }
      ),
      ModuleEscalation.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, FormID, ContentID }, transaction: t }
      ),
      ModuleOwner.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ModuleTypeID, FormID, ContentID }, transaction: t }
      ),
    ]);

    await t.commit();
    return res.status(200).json({
      message: "Form deleted successfully",
    });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const verifyUserPermissionToEditForm = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { ModuleTypeID, ContentID, FormID, FormModuleDraftID } = req.body;
  const { currentUserId } = req.payload;

  try {
    const isUserPermissibleToDelete = await checkUserPermission(
      FormModuleDraft,
      ModuleTypeID,
      ContentID,
      "FormID",
      FormID,
      "FormModuleDraftID",
      FormModuleDraftID,
      currentUserId,
      t
    );

    if (!isUserPermissibleToDelete) {
      await t.rollback();
      return res.status(403).json({ message: "You are unathorized to edit" });
    }

    await t.commit();
    return res.status(200).json({
      message: "User is authorized to edit the form",
    });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const createForm = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { FormModuleDraftID, FormBuilderData, Mode } = req.body;
  const { currentUserId } = req.payload;

  try {
    let creationData = {};
    if (Mode === "edit") {
      creationData = {
        FormModifiedBy: currentUserId,
        FormModifiedDate: literal("CURRENT_TIMESTAMP"),
      };
    } else if (Mode === "create") {
      creationData = {
        FormCreatedBy: currentUserId,
        FormCreatedDate: literal("CURRENT_TIMESTAMP"),
      };
    } else {
      await t.rollback();
      return res.status(400).json({ message: "Invalid mode" });
    }

    await FormModuleDraft.update(
      {
        FormJSON: FormBuilderData,
        ...creationData,
      },
      { where: { FormModuleDraftID }, transaction: t }
    );

    await t.commit();
    return res.status(200).json({
      message: "Form created successfully",
    });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const viewForm = async (req, res, next) => {
  const { FormModuleDraftID } = req.body;
  const { currentUserId } = req.payload;

  try {
    const formBuilderData = await FormModuleDraft.findOne({
      where: { FormModuleDraftID, IsDeleted: false },
      attributes: ["FormJSON"],
    });

    return res.status(200).json({
      message: "Form fetched successfully",
      data: {
        formBuilderData: formBuilderData.FormJSON,
      },
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const generateToken = async (payload, currentUserId, t) => {
  try {
    const users = [];

    const resourceAccessData = payload.map((data) => {
      const encryptedPayload = helper.encryptPayload(data);

      const token = jwt.sign(
        encryptedPayload,
        process.env.DYNAMIC_FORM_SECRET_KEY
      );

      users.push({
        UserEmail: data?.OtherData?.Email,
        token: token,
      });

      return {
        ResourceID: data?.FormModuleDraftID,
        OtherData: data?.OtherData,
        AccessToken: token,
        CreatedBy: currentUserId,
      };
    });

    await ResourceAccess.bulkCreate(resourceAccessData, { transaction: t });
    return users;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const createCampaign = async (req, res, next) => {
  const t = await sequelize.transaction();

  const {
    Step,
    FormID,
    FormModuleDraftID,
    FormFields,
    CampaignName,
    CampaignDescription,
    CampaignCode,
    CampaignEmailReferenceNumber,
    CampaignEmailSubject,
    CampaignEmailMessage,
    CampaignEmailCC,
    Users,
  } = req.body;
  const { currentUserId, lincense } = req.payload;

  try {
    if (Step === "1") {
      await t.commit();
      return res.status(200).json({
        message: "Campaign created successfully",
      });
    } else if (Step === "2") {
      await t.commit();
      return res.status(200).json({
        message: "Users added successfully",
      });
    } else if (Step === "3") {
      const createdCampaign = await Campaign.create(
        {
          FormID,
          FormModuleDraftID,
          FormFields,
          CampaignName,
          CampaignDescription,
          CampaignCode,
          CampaignEmailReferenceNumber,
          CampaignEmailSubject,
          CampaignEmailMessage,
          CampaignEmailCC,
          OrganizationStructureID: lincense.EnterpriseID,
          CreatedBy: currentUserId,
        },
        { transaction: t }
      );

      const campaignParticipants = Users.map((user) => {
        return {
          CampaignID: createdCampaign.CampaignID,
          FirstName: user.FirstName,
          LastName: user.LastName,
          UnitCode: user.UnitCode,
          MobileNumber: user.MobileNumber,
          Email: user.Email,
          CreatedBy: currentUserId,
        };
      });

      await CampaignParticipant.bulkCreate(campaignParticipants, {
        transaction: t,
      });

      const payload = [];
      for (const user of Users) {
        payload.push({
          FormModuleDraftID,
          OtherData: {
            PathAccessType: "campaign",
            CampaignID: createdCampaign.CampaignID,
            IsCampaign: true,
            ...user,
          },
        });
      }

      const usersGeneratedToken = await generateToken(
        payload,
        currentUserId,
        t
      );

      const emailStructure = [];
      for (const user of usersGeneratedToken) {
        const data = await ejs.renderFile(
          path.dirname(path.basename(__dirname)) +
            "/src/utils/mails/campaign.ejs",
          {
            message: CampaignEmailMessage,
            url: `${process.env.FORM_BUILDER_URL}campaign?token=${user.token}`,
          }
        );

        emailStructure.push({
          recipientEmail: [user.UserEmail],
          subject: CampaignEmailSubject,
          body: {
            html: data,
          },
        });
      }

      helper.sendBulkEmails(emailStructure);

      await t.commit();
      return res.status(200).json({
        message: "Mail sent successfully",
      });
    } else {
      await t.rollback();
      return res.status(400).json({ message: "Invalid Step" });
    }
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const campaignList = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { currentUserId, lincense } = req.payload;

  const {
    page = 1,
    pageSize = 50,
    sortField = "CreatedDate",
    sortOrder = "DESC",
    search = "",
  } = req.body;

  try {
    const { limit, offset } = helper.getLimitAndOffset(page, pageSize);
    const sort = helper.sorting(sortField, sortOrder);

    const filter = [];

    if (search) {
      filter.push({
        [Op.or]: [
          { CampaignName: { [Op.iLike]: `%${search}%` } },
          { CampaignCode: { [Op.iLike]: `%${search}%` } },
        ],
      });
    }

    const { rows, count } = await Campaign.findAndCountAll({
      where: {
        [Op.and]: filter,
        OrganizationStructureID: lincense.EnterpriseID,
      },
      attributes: ["CampaignID", "CampaignName"],
      limit: limit,
      offset: offset,
      order: [sort],
      distinct: true,
    });

    const pagination = await helper.pagination(page, pageSize, count);

    await t.commit();
    return res.status(200).json({
      message: "Campaign list fetched successfully!",
      data: {
        campaignList: rows,
        pagination,
      },
    });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const campaignReportList = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { currentUserId } = req.payload;

  const {
    CampaignID,
    page = 1,
    pageSize = 10,
    sortField = "CreatedDate",
    sortOrder = "DESC",
    search = "",
  } = req.body;

  try {
    if (!CampaignID) {
      await t.rollback();
      return res.status(400).json({ message: "Campaign ID is required!" });
    }

    const { limit, offset } = helper.getLimitAndOffset(page, pageSize);
    const sort = helper.sorting(sortField, sortOrder);

    const filter = [
      {
        CampaignID: CampaignID,
      },
    ];

    if (search) {
      filter.push({
        [Op.or]: [
          { FirstName: { [Op.iLike]: `%${search}%` } },
          { LastName: { [Op.iLike]: `%${search}%` } },
          { Status: { [Op.iLike]: `%${search}%` } },
          { UnitCode: { [Op.iLike]: `%${search}%` } },
          { MobileNumber: { [Op.iLike]: `%${search}%` } },
          { Email: { [Op.iLike]: `%${search}%` } },
        ],
      });
    }

    const { rows, count } = await CampaignParticipant.findAndCountAll({
      where: {
        [Op.and]: filter,
      },
      attributes: [
        "CampaignParticipantID",
        "CampaignID",
        "FirstName",
        "LastName",
        "Status",
        "UnitCode",
        "MobileNumber",
        "Email",
      ],
      limit: limit,
      offset: offset,
      order: [sort],
      distinct: true,
    });

    const pagination = await helper.pagination(page, pageSize, count);

    await t.commit();
    return res.status(200).json({
      message: "Campaign participants fetched successfully!",
      data: {
        participantList: rows,
        pagination,
      },
    });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const exportCampaignExcel = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { currentUserId } = req.payload;

  const { CampaignID } = req.body;

  try {
    const formData = await CampaignParticipant.findAll({
      where: {
        CampaignID: CampaignID,
        Status: "Submitted",
      },
      include: [
        {
          model: Campaign,
          required: true,
          attributes: [
            "CampaignName",
            "CampaignDescription",
            "CampaignCode",
            "FormFields",
          ],
        },
      ],
      attributes: [
        "FirstName",
        "LastName",
        "Status",
        "UnitCode",
        "MobileNumber",
        "Email",
        "FormJSON",
      ],
      transaction: t,
    });

    function mapCampaignData(data = []) {
      return data?.map((campaign) => {
        const { CampaignName, CampaignDescription, CampaignCode } =
          campaign?.Campaign;
        const { FirstName, LastName, Status, UnitCode, MobileNumber, Email } =
          campaign;

        const formFields = campaign?.FormJSON
          ? campaign?.FormJSON?.map((jsonItem) => {
              const field = campaign?.Campaign?.FormFields?.find(
                (field) => field?.FieldID === jsonItem?.name
              );
              return field
                ? { Label: field?.FieldLabel, Value: jsonItem?.value }
                : null;
            }).filter(Boolean)
          : [];

        return {
          CampaignName,
          CampaignDescription,
          CampaignCode,
          FirstName,
          LastName,
          Status,
          UnitCode,
          MobileNumber,
          Email,
          FormFields: formFields,
        };
      });
    }

    await t.commit();
    return res.status(200).json({
      message: "Data exported fetched successfully!",
      data: {
        campaignData: mapCampaignData(formData),
      },
    });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const fetchAssignedDataForElement = async (req, res, next) => {
  const { ModuleTypeID, ModuleID } = req.body;

  try {
    const [uniqueDepartments, uniqueRoles] = await Promise.all([
      UserModuleLink.findAll({
        where: {
          ModuleTypeID,
          ModuleID,
        },
        include: [
          {
            model: Departments,
            attributes: ["DepartmentID", "DepartmentName"],
            as: "AssignedDepartments",
          },
        ],
        attributes: [
          [
            Sequelize.fn(
              "DISTINCT",
              Sequelize.col("UserModuleLink.DepartmentID")
            ),
            "DepartmentID",
          ],
        ],
        raw: true,
      }),
      UserModuleLink.findAll({
        where: {
          ModuleTypeID,
          ModuleID,
        },
        include: [
          {
            model: Roles,
            attributes: ["RoleID", "RoleName"],
            as: "AssignedRoles",
          },
        ],
        attributes: [
          [
            Sequelize.fn("DISTINCT", Sequelize.col("UserModuleLink.RoleID")),
            "RoleID",
          ],
        ],
        raw: true,
      }),
    ]);

    const departments = uniqueDepartments
      .map((department) => ({
        DepartmentID: department["AssignedDepartments.DepartmentID"],
        DepartmentName: department["AssignedDepartments.DepartmentName"],
      }))
      .filter(
        (department) => department.DepartmentID && department.DepartmentName
      );

    const roles = uniqueRoles
      .map((role) => ({
        RoleID: role["AssignedRoles.RoleID"],
        RoleName: role["AssignedRoles.RoleName"],
      }))
      .filter((role) => role.RoleID && role.RoleName);

    if (departments.length === 0 && roles.length === 0) {
      return res.status(404).json({
        message: "Module not assigned to any user yet",
      });
    }

    return res.status(200).json({
      message: "Assigned data fetched successfully",
      data: {
        departments,
        roles,
      },
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const revokeAssignedUsersFromElement = async (req, res, next) => {
  const t = await sequelize.transaction();

  const {
    Departments = [],
    Roles = [],
    ModuleTypeID,
    ModuleID,
    IsAllUsers,
    SelectedUsers = [],
  } = req.body;
  const { currentUserId } = req.payload;

  try {
    const user = [];

    if (IsAllUsers === "false" && SelectedUsers.length > 0) {
      user.push(...SelectedUsers);
    } else if (IsAllUsers === "true") {
      if (Departments && Departments.length > 0 && Roles && Roles.length > 0) {
        const [departmentUsers, roleUsers] = await Promise.all([
          UserDeparmentLink.findAll({
            where: {
              DepartmentID: {
                [Op.in]: Departments,
              },
              IsDeleted: false,
            },
            separate: true,
            include: [
              {
                model: Users,
                required: true,
                where: {
                  IsDeleted: false,
                },
              },
            ],
            attributes: ["UserID"],
            distinct: true,
            transaction: t,
          }),
          UserRoleLink.findAll({
            where: {
              RoleID: {
                [Op.in]: Roles,
              },
              IsDeleted: false,
            },
            separate: true,
            include: [
              {
                model: Users,
                required: true,
                where: {
                  IsDeleted: false,
                },
              },
            ],
            attributes: ["UserID"],
            distinct: true,
            transaction: t,
          }),
        ]);

        user.push(...departmentUsers.map((department) => department.UserID));
        user.push(...roleUsers.map((role) => role.UserID));
      } else if (Departments && Departments.length > 0) {
        const departmentUsers = await UserDeparmentLink.findAll({
          where: {
            DepartmentID: {
              [Op.in]: Departments,
            },
            IsDeleted: false,
          },
          separate: true,
          include: [
            {
              model: Users,
              required: true,
              where: {
                IsDeleted: false,
              },
            },
          ],
          attributes: ["UserID"],
          distinct: true,
          transaction: t,
        });

        user.push(...departmentUsers.map((department) => department.UserID));
      } else if (Roles && Roles.length > 0) {
        const roleUsers = await UserRoleLink.findAll({
          where: {
            RoleID: {
              [Op.in]: Roles,
            },
            IsDeleted: false,
          },
          separate: true,
          include: [
            {
              model: Users,
              required: true,
              where: {
                IsDeleted: false,
              },
            },
          ],
          attributes: ["UserID"],
          distinct: true,
          transaction: t,
        });

        user.push(...roleUsers.map((role) => role.UserID));
      }
    }

    if (user.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: "No users have assigned yet" });
    }

    const uniqueUsers = [...new Set(user)];

    await deleteAssignedUsers({
      uniqueUsers,
      departments: Departments,
      roles: Roles,
      t,
      moduleTypeID: ModuleTypeID,
      moduleID: ModuleID,
      isSingleElement: true,
    });

    await t.commit();
    return res.status(200).json({
      message: "Assignment revoked successfully",
    });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      userId: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const exportDocuments = async (req, res, next) => {
  const { currentUserId } = req.payload;

  const { ModuleTypeID, ContentID } = req.body;

  if (!ModuleTypeID) {
    return res.status(400).json({ message: "Please select a Module" });
  }
  if (!ContentID) {
    return res.status(400).json({ message: "Please select a Folder" });
  }

  const isFolderExistQuery = ContentStructure.count({
    ContentID,
    IsDeleted: false,
  });

  const isModuleExistQuery = ModuleMaster.count({
    ModuleTypeID,
    IsActive: true,
  });

  const [isFolderExist, isModuleExist] = await Promise.all([
    isFolderExistQuery,
    isModuleExistQuery,
  ]);

  if (!isFolderExist) {
    return res.status(404).json({ message: "Folder not found" });
  }

  if (!isModuleExist) {
    return res.status(404).json({ message: "Module not found" });
  }

  const filter = [
    {
      ModuleTypeID,
    },
    {
      ContentID,
    },
    {
      IsDeleted: false,
    },
  ];

  try {
    const allDocuments = await DocumentModule.findAll({
      where: {
        [Op.and]: filter,
      },
      include: [
        {
          separate: true,
          model: ModuleOwner,
          as: "ModuleOwners",
          required: true,
          attributes: ["UserID"],
          include: [
            {
              model: Users,
              as: "ModuleOwnerUser",
              attributes: ["UserName"],
              required: true,
            },
          ],
        },
        {
          model: UserModuleLink,
          as: "UserModule",
          required: false,
          attributes: ["CreatedDate"],
        },
        {
          required: true,
          model: Users,
          as: "CreatedByUser",
          attributes: ["UserName"],
        },
        {
          model: Users,
          as: "ModifiedByUser",
          attributes: ["UserName"],
        },
      ],
      attributes: [
        "DocumentName",
        "DocumentDescription",
        "DocumentIsActive",
        "DocumentExpiry",
        "SelfApproved",
        "CreatedBy",
        "CreatedDate",
        "ModifiedBy",
        "ModifiedDate",
      ],
    });

    const mapDocumentData = (data = []) => {
      return data.map((document) => {
        const {
          DocumentName,
          DocumentDescription,
          DocumentIsActive,
          DocumentExpiry,
          SelfApproved,
          CreatedByUser,
          CreatedDate,
          ModifiedByUser,
          ModifiedDate,
          ModuleOwners,
          UserModule,
        } = document;

        const owners =
          (ModuleOwners &&
            ModuleOwners?.length &&
            ModuleOwners.map((owner) => owner.ModuleOwnerUser.UserName).join(
              " , "
            )) ||
          "";

        const assignedUser =
          UserModule && UserModule.CreatedDate
            ? moment(UserModule.CreatedDate).format("D MMM  YY , h:mm A")
            : "";

        return {
          Name: DocumentName,
          Description: DocumentDescription,
          "Is active": DocumentIsActive,
          "Expiry date": DocumentExpiry
            ? moment(DocumentExpiry).format("D MMM  YY , h:mm A")
            : "",
          "Self Approved": SelfApproved,
          "Created by": CreatedByUser.UserName,
          "Created date": moment(CreatedDate).format("D MMM  YY , h:mm A"),
          "Modified by": ModifiedByUser?.UserName || "",
          "Modified date": ModifiedDate
            ? moment(ModifiedDate).format("D MMM  YY , h:mm A")
            : "",
          Owners: owners,
          "Assignment Date": assignedUser,
        };
      });
    };

    return res.status(200).json({
      message: "Documents exported successfully!",
      data: {
        documentData: mapDocumentData(allDocuments),
      },
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const hideUnhideModule = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { currentUserId } = req.payload;

  const { Modules = [] } = req.body;
  let isHide;

  try {
    const queries = [];

    if (Modules && Modules?.length > 0) {
      isHide = Modules[0]?.IsHidden === "true";
      for (const module of Modules) {
        const moduleConfig = moduleMapping[module?.ModuleName];

        if (!moduleConfig) {
          await t.rollback();
          return res.status(400).json({ message: "Invalid module name" });
        }

        const { idField, model } = moduleConfig;

        if (!idField || !model) {
          await t.rollback();
          return res
            .status(400)
            .json({ message: "Invalid module configuration" });
        }

        const query = model.update(
          {
            IsHidden: module?.IsHidden,
            ModifiedBy: currentUserId,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              [idField]: module?.ModuleID,
              ModuleTypeID: module?.ModuleTypeID,
              ContentID: module?.ContentID,
            },
            transaction: t,
          }
        );

        queries.push(query);
      }
    }

    if (queries && queries?.length > 0) {
      const chunks = helper.chunkArray(queries, 300);
      for (const chunk of chunks) {
        await Promise.all(chunk);
      }
    }

    await t.commit();
    return res.status(200).json({
      message: `Module ${isHide ? "hidden" : "unhidden"} successfully`,
    });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const syncModule = async (req, res, next) => {
  const { currentUserId } = req.payload;

  try {
    const userDetails = await UserDetails.findOne({
      where: { UserID: currentUserId, IsDeleted: false },
      attributes: [
        "DesktopFolderSyncPath",
        "SyncedModules",
        "IsConnectedToDesktopClient",
      ],
    });

    if (
      !userDetails ||
      !userDetails?.DesktopFolderSyncPath ||
      !userDetails?.IsConnectedToDesktopClient
    ) {
      return res.status(404).send({
        message:
          "Please login to the desktop client to sync the files, if already connected try restarting the application",
      });
    }

    if (!userDetails?.toJSON()?.SyncedModules?.includes("DocumentModule")) {
      await UserDetails.update(
        {
          LastSynced: new Date().toISOString(),
          SyncedModules: literal(
            `array_append("SyncedModules", 'DocumentModule')`
          ),
          ModifiedBy: currentUserId,
          ModifiedDate: new Date().toISOString(),
        },
        {
          where: {
            UserID: currentUserId,
          },
        }
      );
    } else {
      await UserDetails.update(
        {
          LastSynced: new Date().toISOString(),
          ModifiedBy: currentUserId,
          ModifiedDate: new Date().toISOString(),
        },
        {
          where: {
            UserID: currentUserId,
          },
        }
      );
    }

    const documents = await DocumentModule.findAll({
      where: {
        IsDeleted: false,
      },
      attributes: ["ContentID", "DocumentName", "DocumentPath"],
    });

    const hierarchy = {};

    const documentChunks = helper.chunkArray(documents, 10);

    for (const chunk of documentChunks) {
      const chunkResults = await Promise.all(
        chunk.map(async (document) => {
          const { ContentID, DocumentName, DocumentPath } = document;
          const documentHierarchy = await helper.getHierarchicalStructure(
            ContentID,
            "BOTTOM_TO_TOP"
          );
          return documentHierarchy && documentHierarchy?.length
            ? { DocumentName, DocumentPath, documentHierarchy }
            : null;
        })
      );

      chunkResults
        .filter(Boolean)
        .forEach(({ DocumentName, DocumentPath, documentHierarchy }) => {
          hierarchy[DocumentName] = documentHierarchy.map((folder) => ({
            ...folder,
            DocumentPath,
          }));
        });
    }

    if (Object.keys(hierarchy).length !== 0) {
      sendSync(currentUserId, {
        hierarchy,
        rootDir: userDetails?.DesktopFolderSyncPath,
      });
    }

    return res.status(200).json({
      message: `Sent to desktop client successfully`,
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      currentUserId: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const validateWorkflowText = (jsonData) => {
  let errors = [];

  const traverse = (obj, path = "") => {
    if (
      typeof obj !== "object" ||
      obj === null ||
      (typeof obj === "object" && Object.keys(obj).length === 0)
    ) {
      errors.push(
        `Invalid data at "${path}": Expected an object with non empty main key.`
      );
      return;
    }

    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;

      // If value is an object, check for "main" only if it has nested keys
      if (typeof value === "object" && value !== null) {
        const hasSubKeys = Object.keys(value).some((k) => k !== "main");

        if (hasSubKeys) {
          if (!value.hasOwnProperty("main")) {
            errors.push(`Missing "main" key at "${currentPath}".`);
          } else if (
            typeof value.main !== "string" ||
            value.main.trim() === ""
          ) {
            errors.push(
              `Invalid "main" at "${currentPath}": "main" cannot be empty.`
            );
          }
        }

        traverse(value, currentPath);
      }
      // If value is a string, it's valid (leaf node)
      else if (typeof value !== "string" || value.trim() === "") {
        errors.push(`Invalid value at "${currentPath}": Expected a string.`);
      }
    });
  };

  traverse(jsonData);

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
};

const parseWorkflow = (data) => {
  let nodes = [];
  let edges = [];
  let nodeMap = {};

  const traverseJson = (
    data,
    parentId = null,
    depth = 0,
    position = { x: 100, y: 50 }
  ) => {
    Object.entries(data).forEach(([key, value], index) => {
      let nodeId = uuidv4();
      nodeMap[key] = nodeId;

      // Define node
      let node = {
        id: nodeId,
        type: "default",
        data: {
          label: typeof value === "object" && value.main ? value.main : value,
        },
        position: { x: position.x + depth * 200, y: position.y + index * 100 },
      };

      nodes.push(node);

      // Create edge if parent exists
      if (parentId) {
        edges.push({
          id: uuidv4(),
          source: parentId,
          target: nodeId,
        });
      }

      // If value is an object, recurse through its children
      if (typeof value === "object") {
        traverseJson(
          Object.fromEntries(
            Object.entries(value).filter(([k]) => k !== "main")
          ),
          nodeId,
          depth + 1,
          { x: position.x, y: position.y + index * 100 }
        );
      }
    });
  };

  traverseJson(data);

  return { nodes, edges };
};

const createFlowWithNormalText = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { currentUserId } = req.payload;

  const { FileUrl } = req.body;

  const basePath = path.posix.join(
    "src",
    "infrastructure",
    "media",
    "SopFlowDocument"
  );

  try {
    if (!FileUrl) {
      await t.rollback();
      return res.status(400).json({ message: "File Url is required" });
    }

    const fileBasePath = path.basename(FileUrl);
    const fullFileUrl = path.posix.join(basePath, fileBasePath);

    if (!fs.existsSync(fullFileUrl)) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "Uploaded file is corrupt, please upload again" });
    }

    const formData = new FormData();
    formData.append("file", fs.createReadStream(fullFileUrl));

    let jsonData;
    try {
      const externalApiUrl = process.env.GPT_API_URL;
      const response = await axios.post(externalApiUrl, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      if (
        !response ||
        !response?.data?.success ||
        !response?.data?.data ||
        !response?.data?.data?.json_data
      ) {
        await t.rollback();
        return res
          .status(404)
          .json({ message: "Failed to get the JSON from the external API" });
      }

      jsonData = response?.data?.data?.json_data;
    } catch (error) {
      await t.rollback();
      logger.error({
        message: error.message,
        details: error,
        currentUserId,
      });
      return res
        .status(500)
        .json({ message: "Failed to get the JSON from the external API" });
    }

    const validation = validateWorkflowText(jsonData);

    if (!validation?.valid) {
      await t.rollback();
      logger.error({
        message: "Invalid json format",
        details: validation.message,
        currentUserId,
      });
      return res.status(400).json({ message: "Invalid json format" });
    }

    const workflowJson = parseWorkflow(jsonData);

    try {
      fs.unlinkSync(fullFileUrl);
    } catch (error) {
      logger.error({
        message: error.message,
        details: error,
        currentUserId,
      });
    }

    await t.commit();
    return res.status(200).json({
      message: "Workflow created successfully",
      data: {
        workflow: workflowJson,
      },
    });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

//group Management
const createGroup = async (req, res) => {
  const t = await sequelize.transaction(); // Start a transaction
  const { GroupName, GroupDescription, UserIDs } = req.body;
  const { currentUserId, lincense } = req.payload;
  try {
    const existingGroup = await Group.findOne({
      where: {
        GroupName: {
          [Op.iLike]: GroupName,
        },
        IsDeleted: false,
        OrganizationStructureID: lincense?.EnterpriseID,
      },
    });

    if (existingGroup) {
      return res.status(400).json({
        message: "A group with this name already exists.",
      });
    }

    // 1. Create the new Group
    const group = await Group.create(
      {
        GroupName,
        GroupDescription,
        OrganizationStructureID: lincense?.EnterpriseID,
        CreatedBy: currentUserId,
      },
      { transaction: t }
    );

    // 2. Create associations in UserGroup for each user
    if (UserIDs && UserIDs.length > 0) {
      const userGroups = UserIDs.map((userId) => ({
        UserID: userId,
        GroupID: group.GroupID,
        CreatedBy: currentUserId,
      }));

      await UserGroup.bulkCreate(userGroups, { transaction: t });
    }

    // Commit the transaction
    await t.commit();

    return res.status(201).json({
      message: `Group created Successfully.`,
      group,
    });
  } catch (error) {
    await t.rollback(); // Rollback the transaction on error
    console.error("Error during group creation:", error);
    return res.status(500).json({
      message: "Error creating group or assigning users.",
      error: error.message,
    });
  }
};

// Get all Groups for Admin
const getAllGroups = async (req, res) => {
  try {
    const { search = "" } = req.body;
    const { lincense } = req.payload;
    // Only filter by GroupName (case-insensitive)
    const groupWhere = {
      IsActive: true,
      IsDeleted: false,
      ...(search && {
        GroupName: {
          [Op.iLike]: `%${search}%`, // ✅ Fix: wrap pattern in quotes
        },
      }),
      OrganizationStructureID: lincense?.EnterpriseID,
    };

    const groups = await Group.findAll({
      include: [
        {
          model: Users,
          as: "UsersInGroup",
          attributes: ["UserID", "UserName"],
        },
      ],
      where: groupWhere,
      order: [["CreatedDate", "DESC"]],
    });

    if (!groups || groups.length === 0) {
      return res.status(200).json({ data: [], message: "No groups found." });
    }

    return res.status(200).json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    return res.status(500).json({
      message: "Error fetching groups.",
      error: error.message,
    });
  }
};

// Get a single Group with associated users (using POST method)
const getGroupById = async (req, res) => {
  const { GroupID } = req.body;
  const { lincense } = req.payload;
  try {
    const group = await Group.findOne({
      where: { GroupID: GroupID }, // Find the group by GroupID from the request body
      include: [
        {
          model: Users,
          as: "UsersInGroup",
          attributes: ["UserID", "UserName"], // Adjust as needed
        },
      ],
      OrganizationStructureID: lincense?.EnterpriseID,
    });

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    return res.status(200).json(group);
  } catch (error) {
    console.error("Error fetching group by ID:", error);
    return res.status(500).json({
      message: "Error fetching group.",
      error: error.message,
    });
  }
};

const modifyGroup = async (req, res) => {
  const t = await sequelize.transaction();
  const { GroupID, GroupName, GroupDescription, UserIDs, RemoveUserIDs } =
    req.body;
  const { currentUserId } = req.payload;

  try {
    if (!GroupID) {
      return res.status(400).json({ message: "GroupID is required." });
    }

    // 1. Check if the group exists
    const group = await Group.findOne({ where: { GroupID } });
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    // 2. Update group details (if provided)
    if (GroupName || GroupDescription) {
      await Group.update(
        {
          ...(GroupName && { GroupName }),
          ...(GroupDescription && { GroupDescription }),
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: { GroupID },
          transaction: t,
        }
      );
    }

    // 3. Remove users from group (if provided)
    if (
      RemoveUserIDs &&
      Array.isArray(RemoveUserIDs) &&
      RemoveUserIDs.length > 0
    ) {
      const existingUserGroups = await UserGroup.findAll({
        where: {
          GroupID,
          UserID: { [Op.in]: RemoveUserIDs },
        },
        transaction: t,
      });

      const usersToRemove = existingUserGroups.map((ug) => ug.UserID);
      if (usersToRemove.length > 0) {
        await UserGroup.destroy({
          where: {
            GroupID,
            UserID: { [Op.in]: usersToRemove },
          },
          transaction: t,
        });
      }
    }

    // 4. Update (sync) UserIDs to group if provided
    if (UserIDs && Array.isArray(UserIDs)) {
      // Get current users in the group
      const currentUserGroups = await UserGroup.findAll({
        where: { GroupID },
        transaction: t,
      });

      const currentUserIDs = currentUserGroups.map((ug) => ug.UserID);
      const usersToAdd = UserIDs.filter((uid) => !currentUserIDs.includes(uid));
      const usersToRemove = currentUserIDs.filter(
        (uid) => !UserIDs.includes(uid)
      );

      // Remove extra users
      if (usersToRemove.length > 0) {
        await UserGroup.destroy({
          where: {
            GroupID,
            UserID: { [Op.in]: usersToRemove },
          },
          transaction: t,
        });
      }

      // Add new users
      if (usersToAdd.length > 0) {
        const newAssociations = usersToAdd.map((userId) => ({
          UserID: userId,
          GroupID,
          CreatedBy: currentUserId,
          ModifiedBy: currentUserId,
        }));
        await UserGroup.bulkCreate(newAssociations, { transaction: t });
      }
    }

    await t.commit();
    return res.status(200).json({ message: "Group modified successfully." });
  } catch (error) {
    await t.rollback();
    console.error("Error modifying group:", error);
    return res.status(500).json({
      message: "Error modifying group.",
      error: error.message,
    });
  }
};

//Delete the group
const deleteGroup = async (req, res) => {
  const t = await sequelize.transaction();
  const { GroupID } = req.body;
  const { currentUserId } = req.payload;
  try {
    // 1. Mark the group as deleted (soft delete)
    const group = await Group.update(
      {
        IsDeleted: true,
        DeletedBy: currentUserId,
        DeletedDate: literal("CURRENT_TIMESTAMP"),
      },
      {
        where: { GroupID: GroupID },
        transaction: t,
      }
    );

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    // 2. Soft delete associated UserGroup records (update IsDeleted to true)
    await UserGroup.update(
      {
        IsDeleted: true,
        DeletedBy: currentUserId,
        DeletedDate: literal("CURRENT_TIMESTAMP"),
      },
      {
        where: { GroupID: GroupID },
        transaction: t,
      }
    );

    // Commit the transaction
    await t.commit();

    return res
      .status(200)
      .json({ message: "Group has been marked as deleted." });
  } catch (error) {
    await t.rollback(); // Rollback the transaction on error
    console.error("Error deleting group:", error);
    return res.status(500).json({
      message: "Error deleting group or associated users.",
      error: error.message,
    });
  }
};

const createOrUpdateRisk = async (req, res) => {
  const riskData = req.body;

  const { currentUserId } = req.payload;
  const basePath = path.posix.join("src", "infrastructure", "media", "Risk");
  if (!riskData.RiskID) {
    const existingRisk = await RiskModule.findOne({
      where: {
        RiskName: {
          [Op.iLike]: riskData.RiskName,
        },
        IsDeleted: false,
      },
    });

    if (existingRisk) {
      return res.status(400).json({
        message: `Risk with name ${riskData.RiskName}" already exists.`,
      });
    }
  }

  // Only validate SOPID when creating new RiskSopLink, not for updates
  if (!riskData.RiskID && !riskData.SOPID) {
    return res.status(400).json({
      message: "SopID is mandatory for creating RiskSopLink",
    });
  }

  const t = await sequelize.transaction();

  try {
    let riskModule;
    let riskModuleDraft;

    if (riskData.RiskID) {
      // Update the existing RiskModule if RiskID is provided
      riskModule = await RiskModule.findByPk(riskData.RiskID, {
        transaction: t,
      });
      if (!riskModule) {
        return res.status(404).json({ message: "Risk not found!!" });
      }

      // Retrieve associated RiskModuleDraft if it exists (for updates)
      riskModuleDraft = await RiskModuleDraft.findOne({
        where: { RiskID: riskModule.RiskID },
        transaction: t,
      });

      // If RiskState is provided in riskData, update the RiskState
      if (riskData.RiskState) {
        // Update the RiskModule state
        riskModule = await riskModule.update(
          { RiskState: riskData.RiskState },
          { transaction: t }
        );

        // If RiskState is "Risk Identification", create a new RiskModuleDraft with incremented draft version
        if (riskData.RiskState === "Risk Identification") {
          // Increment draft version from "0.1" to "0.2"
          const draftVersionParts = (
            riskModuleDraft.DraftVersion || "0.0"
          ).split(".");
          const newDraftVersion = `${parseInt(draftVersionParts[0], 10)}.${
            parseInt(draftVersionParts[1], 10) + 1
          }`;

          // Create a new draft record with the updated version
          riskModuleDraft = await RiskModuleDraft.create(
            {
              RiskID: riskModule.RiskID,
              RiskName: riskData.RiskName,
              RiskDescription: riskData.RiskDescription,
              RiskCategory: riskData.RiskCategory,
              DepartmentID: riskData.DepartmentID,
              RiskState: "Risk Identification",
              Status: riskData.Status,
              RiskSource: riskData.RiskSource,
              DetectionDifficulty: riskData.DetectionDifficulty,
              InitialSeverity: riskData.InitialSeverity,
              RiskOwner: riskData.RiskOwner,
              DraftVersion: newDraftVersion, // Incremented version
              CreatedBy: currentUserId,
              IdentifiedBy: currentUserId,
            },
            { transaction: t }
          );

          // Update the version in the RiskModule
          await riskModule.update(
            { DraftVersion: newDraftVersion },
            { transaction: t }
          );
        } else {
          // If RiskState is updated to something else, update the draft as necessary
          riskModuleDraft = await riskModuleDraft.update(
            { RiskState: riskData.RiskState },
            { transaction: t }
          );
        }
      }
    } else {
      // Create a new RiskModule if no RiskID is provided
      riskModule = await RiskModule.create(
        {
          RiskName: riskData?.RiskName,
          RiskDescription: riskData?.RiskDescription,
          RiskCategory: riskData?.RiskCategory,
          DepartmentID: riskData?.DepartmentID,
          RiskState: "Risk Identification", // Default state
          Status: riskData?.Status,
          RiskSource: riskData?.RiskSource,
          DetectionDifficulty: riskData?.DetectionDifficulty,
          InitialSeverity: riskData?.InitialSeverity,
          RiskOwner: riskData?.RiskOwner,
          CreatedBy: currentUserId,
          IdentifiedBy: currentUserId,
        },
        { transaction: t }
      );

      // Create the RiskModuleDraft right after creating the RiskModule
      riskModuleDraft = await RiskModuleDraft.create(
        {
          RiskID: riskModule.RiskID,
          RiskName: riskData?.RiskName,
          RiskDescription: riskData?.RiskDescription,
          RiskCategory: riskData?.RiskCategory,
          DepartmentID: riskData?.DepartmentID,
          RiskState: "Risk Identification",
          Status: riskData?.Status,
          DraftVersion: "0.1", // Initial draft version
          RiskSource: riskData?.RiskSource,
          DetectionDifficulty: riskData?.DetectionDifficulty,
          InitialSeverity: riskData?.InitialSeverity,
          RiskOwner: riskData?.RiskOwner,
          CreatedBy: currentUserId,
          IdentifiedBy: currentUserId,
        },
        { transaction: t }
      );

      if (riskData?.FileUrl) {
        const incomingFile = path.posix.join(riskData.FileUrl);
        const incomingFileExtension = helper.getFileExtension(incomingFile);
        const incomingFileFullPath = path.posix.join(
          basePath,
          path.basename(incomingFile)
        );

        if (!fs.existsSync(incomingFileFullPath)) {
          await t.rollback();
          return res
            .status(404)
            .json({ message: "Uploaded file is corrupt, Please re-upload" });
        }

        //start create versioning of document
        const incomingFileContent = fs.readFileSync(incomingFileFullPath);
        const newFilePathForDraft = path.posix.join(
          basePath,
          `${riskModuleDraft.RiskModuleDraftID}${incomingFileExtension}`
        );
        fs.writeFileSync(newFilePathForDraft, incomingFileContent);
        //end create versioning of document

        // creating for Risk module
        const newPath = path.posix.join(
          basePath,
          `${riskModule.RiskID}${incomingFileExtension}`
        );
        fs.writeFileSync(newPath, incomingFileContent);
        newFilePathTemp = newPath;

        await Promise.all([
          RiskModuleDraft.update(
            { RiskDocumentPath: newFilePathForDraft },
            {
              where: {
                RiskModuleDraftID: riskModuleDraft.RiskModuleDraftID,
              },
              transaction: t,
            }
          ),
          RiskModule.update(
            { RiskDocumentPath: newPath },
            {
              where: {
                RiskID: riskModule.RiskID,
              },
              transaction: t,
            }
          ),
        ]);
      }
    }

    // Ensure the draft record is created or found before proceeding
    if (!riskModuleDraft) {
      throw new Error("RiskModuleDraft creation failed");
    }

    // Create RiskSopLink only if SOPID is provided and we are creating a new RiskModule
    if (riskData?.NodeIDs && !riskData.RiskID) {
      for (const Nid of riskData.NodeIDs) {
        await RiskSopLink.create(
          {
            RiskID: riskModule.RiskID,
            SOPID: riskData?.SOPID,
            SopFlowID: riskData?.SopFlowID,
            RiskDraftID: riskModuleDraft?.RiskModuleDraftID || null,
            SopDraftID: riskData?.SopDraftID,
            NodeID: Nid,
            CreatedBy: currentUserId,
          },
          { transaction: t }
        );
      }
    }

    if (riskData?.BPMNNodeIDs && !riskData.RiskID) {
      for (const Nid of riskData.BPMNNodeIDs) {
        await RiskSopLink.create(
          {
            RiskID: riskModule.RiskID,
            SOPID: riskData?.SOPID,
            SopFlowID: riskData?.SopFlowID,
            RiskDraftID: riskModuleDraft?.RiskModuleDraftID || null,
            SopDraftID: riskData?.SopDraftID,
            BPMNNodeID: Nid,
            CreatedBy: currentUserId,
          },
          { transaction: t }
        );
      }
    }

    // Update or Transition to Risk Assessment, Risk Analysis, or Risk Treatment
    if (riskData.RiskState === "Risk Assessment") {
      await RiskAssessment.create(
        {
          RiskID: riskModule?.RiskID,
          RiskConsequences: riskData?.RiskConsequences,
          Likelihood: riskData?.Likelihood,
          Impact: riskData?.Impact,
          Severity: riskData?.Severity,
          RiskValue: riskData?.RiskValue,
          AffectedAreas: riskData?.AffectedAreas,
          Frequency: riskData?.Frequency,
          // AssessmentDate: riskData?.AssessmentDate,
          AssessmentNotes: riskData?.AssessmentNotes,
          RiskModuleDraftID: riskModuleDraft?.RiskModuleDraftID,
          CreatedBy: currentUserId,
        },
        { transaction: t }
      );
    }

    if (riskData.RiskState === "Risk Analysis Form") {
      await RiskAnalysis.create(
        {
          RiskID: riskModule.RiskID,
          CurrentControls: riskData?.CurrentControls,
          ControlEffectiveness: riskData?.ControlEffectiveness,
          RiskExposure: riskData?.RiskExposure,
          RootCause: riskData?.RootCause,
          PotentialConsequences: riskData?.PotentialConsequences,
          TriggerIndicators: riskData?.TriggerIndicators,
          RiskModuleDraftID: riskModuleDraft?.RiskModuleDraftID,
          CreatedBy: currentUserId,
        },
        { transaction: t }
      );
    }

    if (riskData.RiskState === "Risk Treatment") {
      const RiskTreatmentData = await RiskTreatment.create(
        {
          RiskID: riskModule.RiskID,
          TreatmentStrategy: riskData?.TreatmentStrategy,
          TreatmentActions: riskData?.TreatmentActions,
          TargetCompletionDate: riskData?.TargetCompletionDate,
          TreatmentStatus: riskData?.TreatmentStatus,
          ResidualRisk: riskData?.ResidualRisk,
          TreatmentEffectiveness: riskData?.TreatmentEffectiveness,
          ResourcesRequired: riskData?.ResourcesRequired,
          ApprovalStatus: riskData?.ApprovalStatus,
          ControlMeasures: riskData?.ControlMeasures,
          BudgetRequired: riskData?.BudgetRequired,
          RiskModuleDraftID: riskModuleDraft?.RiskModuleDraftID,
          CreatedBy: currentUserId,
        },
        { transaction: t }
      );

      if (Array.isArray(riskData.TreatmentActionItems)) {
        for (const actionItem of riskData.TreatmentActionItems) {
          await RiskTreatmentActionItem.create(
            {
              RiskTreatmentID: RiskTreatmentData?.RiskTreatmentID,
              TreatmentDescription: actionItem?.TreatmentDescription,
              TreatmentOwner: actionItem?.TreatmentOwner,
              TreatmentDueDate: actionItem?.TreatmentDueDate,
              TreatmentActionStatus: actionItem?.TreatmentActionStatus,
              CreatedBy: currentUserId,
            },
            { transaction: t }
          );
        }
      }

      if (riskData?.TreatmentFileUrl) {
        const incomingFile = path.posix.join(riskData.TreatmentFileUrl);
        const incomingFileExtension = helper.getFileExtension(incomingFile);
        const incomingFileFullPath = path.posix.join(
          basePath,
          path.basename(incomingFile)
        );

        if (!fs.existsSync(incomingFileFullPath)) {
          await t.rollback();
          return res
            .status(404)
            .json({ message: "Uploaded file is corrupt, Please re-upload" });
        }

        //start create versioning of document
        const incomingFileContent = fs.readFileSync(incomingFileFullPath);
        const newFilePathForDraft = path.posix.join(
          basePath,
          `${RiskTreatmentData.RiskTreatmentID}${incomingFileExtension}`
        );
        fs.writeFileSync(newFilePathForDraft, incomingFileContent);
        //end create versioning of document

        await Promise.all([
          RiskTreatment.update(
            { RiskTreatmentDocumentPath: newFilePathForDraft },
            {
              where: {
                RiskTreatmentID: RiskTreatmentData.RiskTreatmentID,
              },
              transaction: t,
            }
          ),
        ]);
      }
    }
    // Step 6: Transition to Risk Monitoring & Review
    if (riskData.RiskState === "Risk Monitoring & Review") {
      await RiskMonitoringReview.create(
        {
          RiskID: riskModule.RiskID,
          MonitoringFrequency: riskData?.MonitoringFrequency,
          LastReviewDate: riskData?.LastReviewDate,
          NextReviewDate: riskData?.NextReviewDate,
          ReviewFindings: riskData?.ReviewFindings,
          AlertCondition: riskData?.AlertCondition,
          AlertAction: riskData?.AlertAction,
          KPI: riskData.KPI,
          ControlEffectiveness: riskData?.ControlEffectiveness,
          RiskModuleDraftID: riskModuleDraft?.RiskModuleDraftID,
          CreatedBy: currentUserId,
        },
        { transaction: t }
      );
    }

    await t.commit();

    return res
      .status(200)
      .json({ message: "Risk data saved successfully", riskModule });
  } catch (error) {
    await t.rollback();
    console.error("Error saving risk data:", error);
    return res.status(500).json({ message: "Error saving risk data", error });
  }
};

//update
const updateRiskModule = async (req, res) => {
  const riskData = req.body;
  const { currentUserId } = req.payload;
  const basePath = path.posix.join("src", "infrastructure", "media", "Risk");

  if (!riskData.RiskID) {
    return res
      .status(400)
      .json({ message: "RiskID is required to update the Risk" });
  }

  const t = await sequelize.transaction();
  let transactionCompleted = false;

  try {
    // Fetch existing records
    const riskModule = await RiskModule.findByPk(riskData.RiskID, {
      transaction: t,
    });
    if (!riskModule) {
      await t.rollback();
      transactionCompleted = true;
      return res.status(404).json({ message: "Risk not found!" });
    }
    if (riskData.RiskName && riskData.RiskName !== riskModule.RiskName) {
      const existingRisk = await RiskModule.findOne({
        where: {
          RiskName: riskData.RiskName,
          IsDeleted: false,
          RiskID: { [Op.ne]: riskData.RiskID }, // Exclude current risk from check
        },
        transaction: t,
      });

      if (existingRisk) {
        await t.rollback();
        transactionCompleted = true;
        return res.status(400).json({
          message: `Risk with name "${riskData.RiskName}" already exists.`,
        });
      }
    }
    const riskModuleDraft = await RiskModuleDraft.findOne({
      where: { RiskID: riskModule.RiskID },
      transaction: t,
    });
    if (!riskModuleDraft) {
      await t.rollback();
      transactionCompleted = true;
      return res.status(404).json({ message: "Risk draft not found!" });
    }

    // Update main risk module
    await riskModule.update(
      {
        RiskState: riskData.RiskState || riskModule.RiskState,
        RiskName: riskData.RiskName || riskModule.RiskName,
        RiskDescription: riskData.RiskDescription || riskModule.RiskDescription,
        RiskCategory: riskData.RiskCategory || riskModule.RiskCategory,
        DepartmentID: riskData.DepartmentID || riskModule.DepartmentID,
        Status: riskData.Status || riskModule.Status,
        RiskSource: riskData.RiskSource || riskModule.RiskSource,
        DetectionDifficulty:
          riskData.DetectionDifficulty || riskModule.DetectionDifficulty,
        InitialSeverity: riskData.InitialSeverity || riskModule.InitialSeverity,
        RiskOwner: riskData.RiskOwner || riskModule.RiskOwner,
      },
      { transaction: t }
    );

    // Update risk module draft
    await riskModuleDraft.update(
      {
        RiskState: riskData.RiskState || riskModuleDraft.RiskState,
        RiskName: riskData.RiskName || riskModuleDraft.RiskName,
        RiskDescription:
          riskData.RiskDescription || riskModuleDraft.RiskDescription,
        RiskCategory: riskData.RiskCategory || riskModuleDraft.RiskCategory,
        DepartmentID: riskData.DepartmentID || riskModuleDraft.DepartmentID,
        Status: riskData.Status || riskModuleDraft.Status,
        RiskSource: riskData.RiskSource || riskModuleDraft.RiskSource,
        DetectionDifficulty:
          riskData.DetectionDifficulty || riskModuleDraft.DetectionDifficulty,
        InitialSeverity:
          riskData.InitialSeverity || riskModuleDraft.InitialSeverity,
        RiskOwner: riskData.RiskOwner || riskModuleDraft.RiskOwner,
      },
      { transaction: t }
    );

    // Handle RiskSopLink updates
    // if (riskData.NodeIDs) {
    //   await RiskSopLink.destroy({
    //     where: { RiskID: riskModule.RiskID, BPMNNodeID: null },
    //     transaction: t,
    //   });

    //   const sopLinkPromises = riskData.NodeIDs.map((nodeId) =>
    //     RiskSopLink.create(
    //       {
    //         RiskID: riskModule.RiskID,
    //         SOPID: riskData.SOPID,
    //         SopFlowID: riskData.SopFlowID,
    //         RiskDraftID: riskModuleDraft.RiskModuleDraftID,
    //         SopDraftID: riskData.SopDraftID,
    //         NodeID: nodeId,
    //         CreatedBy: currentUserId,
    //       },
    //       { transaction: t }
    //     )
    //   );
    //   await Promise.all(sopLinkPromises);
    // }

    // if (riskData.BPMNNodeIDs) {
    //   await RiskSopLink.destroy({
    //     where: { RiskID: riskModule.RiskID, NodeID: null },
    //     transaction: t,
    //   });

    //   const bpmnLinkPromises = riskData.BPMNNodeIDs.map((bpmnNodeId) =>
    //     RiskSopLink.create(
    //       {
    //         RiskID: riskModule.RiskID,
    //         SOPID: riskData.SOPID,
    //         SopFlowID: riskData.SopFlowID,
    //         RiskDraftID: riskModuleDraft.RiskModuleDraftID,
    //         SopDraftID: riskData.SopDraftID,
    //         BPMNNodeID: bpmnNodeId,
    //         CreatedBy: currentUserId,
    //       },
    //       { transaction: t }
    //     )
    //   );
    //   await Promise.all(bpmnLinkPromises);
    // }

    if (riskData?.FileUrl) {
      const incomingFile = path.posix.join(riskData.FileUrl);
      const incomingFileExtension = helper.getFileExtension(incomingFile);
      const incomingFileFullPath = path.posix.join(
        basePath,
        path.basename(incomingFile)
      );

      if (!fs.existsSync(incomingFileFullPath)) {
        await t.rollback();
        transactionCompleted = true;
        return res.status(404).json({
          message: "Uploaded file is corrupt, Please re-upload",
        });
      }

      // Create versioning of document for draft
      const incomingFileContent = fs.readFileSync(incomingFileFullPath);
      const newFilePathForDraft = path.posix.join(
        basePath,
        `${riskModuleDraft.RiskModuleDraftID}${incomingFileExtension}`
      );
      fs.writeFileSync(newFilePathForDraft, incomingFileContent);

      // Create file for Risk module
      const newPath = path.posix.join(
        basePath,
        `${riskModule.RiskID}${incomingFileExtension}`
      );
      fs.writeFileSync(newPath, incomingFileContent);
      newFilePathTemp = newPath;

      await Promise.all([
        RiskModuleDraft.update(
          { RiskDocumentPath: newFilePathForDraft },
          {
            where: {
              RiskModuleDraftID: riskModuleDraft.RiskModuleDraftID,
            },
            transaction: t,
          }
        ),
        RiskModule.update(
          { RiskDocumentPath: newPath },
          {
            where: {
              RiskID: riskModule.RiskID,
            },
            transaction: t,
          }
        ),
      ]);
    }

    // State-specific updates
    if (riskData.RiskState === "Risk Assessment") {
      const [assessment] = await RiskAssessment.findOrCreate({
        where: {
          RiskID: riskModule.RiskID,
          RiskModuleDraftID: riskModuleDraft.RiskModuleDraftID,
        },
        defaults: { CreatedBy: currentUserId },
        transaction: t,
      });

      await assessment.update(
        {
          RiskConsequences: riskData.RiskConsequences,
          Likelihood: riskData.Likelihood,
          Impact: riskData.Impact,
          Severity: riskData.Severity,
          RiskValue: riskData.RiskValue,
          AffectedAreas: riskData.AffectedAreas,
          Frequency: riskData.Frequency,
          AssessmentNotes: riskData.AssessmentNotes,
        },
        { transaction: t }
      );
    }

    if (riskData.RiskState === "Risk Analysis Form") {
      const [analysis] = await RiskAnalysis.findOrCreate({
        where: {
          RiskID: riskModule.RiskID,
          RiskModuleDraftID: riskModuleDraft.RiskModuleDraftID,
        },
        defaults: { CreatedBy: currentUserId },
        transaction: t,
      });

      await analysis.update(
        {
          CurrentControls: riskData.CurrentControls,
          ControlEffectiveness: riskData.ControlEffectiveness,
          RiskExposure: riskData.RiskExposure,
          RootCause: riskData.RootCause,
          PotentialConsequences: riskData.PotentialConsequences,
          TriggerIndicators: riskData.TriggerIndicators,
        },
        { transaction: t }
      );
    }

    if (riskData.RiskState === "Risk Treatment") {
      const [treatment] = await RiskTreatment.findOrCreate({
        where: {
          RiskID: riskModule.RiskID,
          RiskModuleDraftID: riskModuleDraft.RiskModuleDraftID,
        },
        defaults: { CreatedBy: currentUserId },
        transaction: t,
      });

      await treatment.update(
        {
          TreatmentStrategy: riskData.TreatmentStrategy,
          TreatmentActions: riskData.TreatmentActions,
          TargetCompletionDate: riskData.TargetCompletionDate,
          TreatmentStatus: riskData.TreatmentStatus,
          ResidualRisk: riskData.ResidualRisk,
          TreatmentEffectiveness: riskData.TreatmentEffectiveness,
          ResourcesRequired: riskData.ResourcesRequired,
          ApprovalStatus: riskData.ApprovalStatus,
          ControlMeasures: riskData.ControlMeasures,
          BudgetRequired: riskData.BudgetRequired,
        },
        { transaction: t }
      );

      // Update treatment action items
      await RiskTreatmentActionItem.destroy({
        where: { RiskTreatmentID: treatment.RiskTreatmentID },
        transaction: t,
      });

      if (Array.isArray(riskData.TreatmentActionItems)) {
        const actionItemPromises = riskData.TreatmentActionItems.map(
          (actionItem) =>
            RiskTreatmentActionItem.create(
              {
                RiskTreatmentID: treatment.RiskTreatmentID,
                TreatmentDescription: actionItem.TreatmentDescription,
                TreatmentOwner: actionItem.TreatmentOwner,
                TreatmentDueDate: actionItem.TreatmentDueDate,
                TreatmentActionStatus: actionItem.TreatmentActionStatus,
                CreatedBy: currentUserId,
              },
              { transaction: t }
            )
        );
        await Promise.all(actionItemPromises);
      }

      // Handle treatment file update
      if (riskData.TreatmentFileUrl) {
        const incomingFile = path.posix.join(riskData.TreatmentFileUrl);
        const incomingFileExtension = helper.getFileExtension(incomingFile);
        const incomingFileFullPath = path.posix.join(
          basePath,
          path.basename(incomingFile)
        );

        if (!fs.existsSync(incomingFileFullPath)) {
          await t.rollback();
          transactionCompleted = true;
          return res.status(404).json({
            message: "Uploaded file is corrupt, Please re-upload",
          });
        }

        const incomingFileContent = fs.readFileSync(incomingFileFullPath);
        const newFilePath = path.posix.join(
          basePath,
          `${treatment.RiskTreatmentID}${incomingFileExtension}`
        );
        fs.writeFileSync(newFilePath, incomingFileContent);

        await treatment.update(
          { RiskTreatmentDocumentPath: newFilePath },
          { transaction: t }
        );
      }
    }

    if (riskData.RiskState === "Risk Monitoring & Review") {
      const [monitoring] = await RiskMonitoringReview.findOrCreate({
        where: {
          RiskID: riskModule.RiskID,
          RiskModuleDraftID: riskModuleDraft.RiskModuleDraftID,
        },
        defaults: { CreatedBy: currentUserId },
        transaction: t,
      });

      await monitoring.update(
        {
          MonitoringFrequency: riskData.MonitoringFrequency,
          LastReviewDate: riskData.LastReviewDate,
          NextReviewDate: riskData.NextReviewDate,
          ReviewFindings: riskData.ReviewFindings,
          AlertCondition: riskData.AlertCondition,
          AlertAction: riskData.AlertAction,
          KPI: riskData.KPI,
          ControlEffectiveness: riskData.ControlEffectiveness,
        },
        { transaction: t }
      );
    }

    await t.commit();
    transactionCompleted = true;

    const updatedRisk = await RiskModuleDraft.findOne({
      where: { RiskID: riskModule.RiskID },
    });

    return res.status(200).json({
      message: "Risk updated successfully",
      riskModule: updatedRisk,
    });
  } catch (error) {
    if (!transactionCompleted) {
      try {
        await t.rollback();
      } catch (rollbackError) {
        console.error("Error rolling back transaction:", rollbackError);
      }
    }

    console.error("Error updating risk:", error);
    return res.status(500).json({
      message: "Error updating risk",
      error: error.message,
    });
  }
};

// const fetchAllRiskData = async (req, res) => {
//   const {
//     searchQuery,
//     SOPDraftID,
//     page = 1,
//     pageSize = 7,
//     RiskState,
//   } = req.body;
//   try {
//     const { limit, offset } = helper.getLimitAndOffset(page, pageSize);

//     const baseWhereClause = {
//       IsDeleted: false,
//       RiskIsActive: true,
//     };

//     let riskIdsFromSOP = [];
//     if (SOPDraftID) {
//       const riskSopLinks = await RiskSopLink.findAll({
//         where: {
//           SopDraftID: SOPDraftID,
//           IsDeleted: false,
//         },
//         include: [
//           {
//             model: RiskModuleDraft,
//             attributes: ["RiskID"],
//             where: baseWhereClause,
//             as: "RiskDraftModule",
//           },
//         ],
//         attributes: [],
//         raw: true,
//       });

//       if (riskSopLinks.length === 0) {
//         return res
//           .status(404)
//           .json({ message: `No Risk found for SOPDraftID: ${SOPDraftID}` });
//       }

//       riskIdsFromSOP = [
//         ...new Set(riskSopLinks.map((link) => link["RiskDraftModule.RiskID"])),
//       ];
//     }

//     // Build the final where clause
//     const finalWhereClause = {
//       ...baseWhereClause,
//       ...(searchQuery && {
//         [Op.or]: [
//           { RiskName: { [Op.iLike]: `%${searchQuery}%` } },
//           Sequelize.where(Sequelize.cast(Sequelize.col("RiskIndex"), "TEXT"), {
//             [Op.iLike]: `%${searchQuery}%`,
//           }),
//         ],
//       }),
//       ...(riskIdsFromSOP.length > 0 && {
//         RiskID: {
//           [Op.in]: riskIdsFromSOP,
//         },
//       }),
//       ...(RiskState && {
//         RiskState: RiskState,
//       }),
//     };

//     // Get all risk drafts that match our conditions
//     const { rows, count } = await RiskModuleDraft.findAndCountAll({
//       where: finalWhereClause,
//       include: [
//         {
//           model: RiskAssessment,
//           as: "RiskAssessments",
//           required: false,
//         },
//         {
//           model: RiskAnalysis,
//           as: "RiskAnalysiss",
//           required: false,
//         },
//         {
//           model: RiskTreatment,
//           as: "RiskTreatments",
//           required: false,
//           include: [
//             {
//               model: RiskTreatmentActionItem,
//               as: "RiskTreatmentActionItems",
//             },
//           ],
//         },
//         {
//           model: RiskMonitoringReview,
//           as: "RiskMonitoringReviews",
//           required: false,
//         },
//       ],
//       order: [["RiskID"], ["CreatedDate", "DESC"]],
//       limit: limit,
//       offset: offset,
//       distinct: true,
//     });

//     const pagination = await helper.pagination(page, pageSize, count);

//     // Filter to keep only the latest draft for each RiskID
//     const latestDraftsMap = new Map();
//     rows.forEach((draft) => {
//       if (!latestDraftsMap.has(draft.RiskID)) {
//         latestDraftsMap.set(draft.RiskID, draft);
//       }
//     });
//     // Convert Map values to array and sort by CreatedDate DESC
//     const latestDrafts = Array.from(latestDraftsMap.values()).sort((a, b) => {
//       return new Date(b.CreatedDate) - new Date(a.CreatedDate);
//     });

//     return res.status(200).json({
//       message: "Risk data fetched successfully",
//       data: latestDrafts,
//       pagination,
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: "Error fetching risk data", error });
//   }
// };

const fetchAllRiskData = async (req, res) => {
  const {
    searchQuery,
    SOPDraftID,
    page = 1,
    pageSize = 7,
    RiskState,
  } = req.body;
  try {
    const { limit, offset } = helper.getLimitAndOffset(page, pageSize);

    const baseWhereClause = {
      IsDeleted: false,
      RiskIsActive: true,
    };

    let riskIdsFromSOP = [];
    if (SOPDraftID) {
      const riskSopLinks = await RiskSopLink.findAll({
        where: {
          SopDraftID: SOPDraftID,
          IsDeleted: false,
        },
        include: [
          {
            model: RiskModuleDraft,
            attributes: ["RiskID"],
            where: baseWhereClause,
            as: "RiskDraftModule",
          },
        ],
        attributes: [],
        raw: true,
      });

      if (riskSopLinks.length === 0) {
        return res
          .status(404)
          .json({ message: `No Risk found for SOPDraftID: ${SOPDraftID}` });
      }

      riskIdsFromSOP = [
        ...new Set(riskSopLinks.map((link) => link["RiskDraftModule.RiskID"])),
      ];
    }

    // Build the final where clause
    const finalWhereClause = {
      ...baseWhereClause,
      ...(searchQuery && {
        [Op.or]: [
          { RiskName: { [Op.iLike]: `%${searchQuery}%` } },
          Sequelize.where(Sequelize.cast(Sequelize.col("RiskIndex"), "TEXT"), {
            [Op.iLike]: `%${searchQuery}%`,
          }),
        ],
      }),
      ...(riskIdsFromSOP.length > 0 && {
        RiskID: {
          [Op.in]: riskIdsFromSOP,
        },
      }),
      ...(RiskState && {
        RiskState: RiskState,
      }),
    };

    // First get all RiskIDs that match our conditions
    const allRiskIds = await RiskModuleDraft.findAll({
      where: finalWhereClause,
      attributes: ["RiskID"],
      group: ["RiskID"],
      raw: true,
    });

    if (allRiskIds.length === 0) {
      return res.status(200).json({
        message: "No risk data found",
        data: [],
        pagination: await helper.pagination(page, pageSize, 0),
      });
    }

    // Then get the latest draft for each RiskID
    const latestDrafts = await RiskModuleDraft.findAll({
      where: {
        RiskID: allRiskIds.map((r) => r.RiskID),
        IsDeleted: false,
        RiskIsActive: true,
      },
      include: [
        {
          model: RiskAssessment,
          as: "RiskAssessments",
          required: false,
        },
        {
          model: RiskAnalysis,
          as: "RiskAnalysiss",
          required: false,
        },
        {
          model: RiskTreatment,
          as: "RiskTreatments",
          required: false,
          include: [
            {
              model: RiskTreatmentActionItem,
              as: "RiskTreatmentActionItems",
            },
          ],
        },
        {
          model: RiskMonitoringReview,
          as: "RiskMonitoringReviews",
          required: false,
        },
      ],
      order: [["CreatedDate", "DESC"]],
    });

    // Group by RiskID and keep only the latest
    const latestDraftsMap = new Map();
    latestDrafts.forEach((draft) => {
      if (!latestDraftsMap.has(draft.RiskID)) {
        latestDraftsMap.set(draft.RiskID, draft);
      }
    });

    const latestDraftsArray = Array.from(latestDraftsMap.values());

    // Apply pagination
    const paginatedResults = latestDraftsArray.slice(offset, offset + limit);
    const pagination = await helper.pagination(
      page,
      pageSize,
      latestDraftsArray.length
    );

    return res.status(200).json({
      message: "Risk data fetched successfully",
      data: paginatedResults,
      pagination,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching risk data", error });
  }
};

const fetchRiskDashboardData = async (req, res) => {
  const { SOPDraftID } = req.body;

  try {
    if (!SOPDraftID) {
      return res.status(400).json({
        message: "SOPDraftID is required",
      });
    }

    const baseWhereClause = {
      IsDeleted: false,
      RiskIsActive: true,
    };

    const riskSopLinks = await RiskSopLink.findAll({
      where: {
        SopDraftID: SOPDraftID,
        IsDeleted: false,
      },
      include: [
        {
          model: RiskModuleDraft,
          attributes: ["RiskID"],
          where: baseWhereClause,
          as: "RiskDraftModule",
        },
      ],
      attributes: [],
      raw: true,
    });

    if (riskSopLinks.length === 0) {
      return res.status(404).json({
        message: `No Risk found for SOPDraftID: ${SOPDraftID}`,
        data: {
          summary: {
            totalRisks: 0,
            riskAnalysisProgress: 0,
            closedRisks: 0,
            responseInProgress: 0,
            highPriorityRisks: 0,
          },
        },
      });
    }

    const riskIdsFromSOP = [
      ...new Set(riskSopLinks.map((link) => link["RiskDraftModule.RiskID"])),
    ];

    // Fetch all relevant data for these risks
    const allRiskDrafts = await RiskModuleDraft.findAll({
      where: {
        ...baseWhereClause,
        RiskID: {
          [Op.in]: riskIdsFromSOP,
        },
      },
      include: [
        {
          model: RiskAssessment,
          as: "RiskAssessments",
          required: false,
        },
        {
          model: RiskAnalysis,
          as: "RiskAnalysiss",
          required: false,
        },
        {
          model: RiskTreatment,
          as: "RiskTreatments",
          required: false,
          include: [
            {
              model: RiskTreatmentActionItem,
              as: "RiskTreatmentActionItems",
            },
          ],
        },
        {
          model: RiskMonitoringReview,
          as: "RiskMonitoringReviews",
          required: false,
        },
      ],
      order: [["RiskID"], ["CreatedDate", "DESC"]],
    });

    const latestDraftsMap = new Map();
    allRiskDrafts.forEach((draft) => {
      if (!latestDraftsMap.has(draft.RiskID)) {
        latestDraftsMap.set(draft.RiskID, draft);
      }
    });
    const latestDrafts = Array.from(latestDraftsMap.values());

    const summary = {
      totalRisks: latestDrafts.length,
      riskAnalysisProgress: latestDrafts.filter(
        (draft) => draft.RiskState && draft.RiskState === "Risk Analysis Form"
      ).length,
      closedRisks: latestDrafts.filter(
        (draft) =>
          draft.RiskState && draft.RiskState === "Risk Monitoring & Review"
      ).length,
      responseInProgress: latestDrafts.filter(
        (draft) =>
          draft.RiskState && draft.RiskState !== "Risk Monitoring & Review"
      ).length,
      highPriorityRisks: latestDrafts.filter(
        (draft) =>
          draft.RiskAssessments &&
          draft.RiskAssessments.some(
            (assessment) => assessment.RiskValue === "High"
          )
      ).length,
    };

    const actionPlanCounts = [0, 0, 0, 0]; // [Pending, Approved, Rejected, OnHold]

    latestDrafts.forEach((draft) => {
      if (draft.RiskTreatments && draft.RiskTreatments.length > 0) {
        draft.RiskTreatments.forEach((treatment) => {
          switch (treatment.ApprovalStatus) {
            case "Pending":
              actionPlanCounts[0]++;
              break;
            case "Approved":
              actionPlanCounts[1]++;
              break;
            case "Rejected":
              actionPlanCounts[2]++;
              break;
            case "OnHold":
              actionPlanCounts[3]++;
              break;
            default:
              // Handle any unexpected statuses by counting as Pending
              actionPlanCounts[0]++;
          }
        });
      }
    });

    const actionPlanData = {
      counts: actionPlanCounts,
      labels: ["Pending", "Approved", "Rejected", "OnHold"],
    };

    const riskbreakdownCounts = [0, 0, 0]; // [Low, Medium, High]

    latestDrafts.forEach((draft) => {
      if (draft.RiskAssessments && draft.RiskAssessments.length > 0) {
        draft.RiskAssessments.forEach((assesment) => {
          switch (assesment.RiskValue) {
            case "Low":
              riskbreakdownCounts[0]++;
              break;
            case "Medium":
              riskbreakdownCounts[1]++;
              break;
            case "High":
              riskbreakdownCounts[2]++;
              break;
            default:
              riskbreakdownCounts[0]++;
          }
        });
      }
    });

    const riskbreakdownData = {
      counts: riskbreakdownCounts,
      labels: ["Low", "Medium", "High"],
    };

    return res.status(200).json({
      message: "Risk dashboard data fetched successfully",
      data: {
        summary,
        actionPlanData,
        riskbreakdownData,
      },
    });
  } catch (error) {
    console.error("Error fetching risk dashboard data:", error);
    return res.status(500).json({
      message: "Error fetching risk dashboard data",
      error: error.message,
    });
  }
};

// Heatmap data processor
// function processRiskLevelHeatmap(riskDrafts) {
//   // State to Level Mapping
//   const stateLevelMap = {
//     "Risk Identification": 1,
//     "Risk Assessment": 2,
//     "Risk Analysis Form": 3,
//     "Risk Treatment": 4,
//     "Risk Monitoring & Review": 5,
//   };

//   // Initialize data structure
//   const heatmapData = {
//     series: [],
//     riskNames: [],
//     levels: [1, 2, 3, 4, 5],
//   };

//   // Process each risk
//   riskDrafts.forEach((draft) => {
//     const riskName = draft.RiskName || "Unnamed Risk";
//     const level = stateLevelMap[draft.RiskState] || 5;

//     heatmapData.riskNames.push(riskName);

//     heatmapData.series.push({
//       name: riskName,
//       data: [
//         {
//           x: level,
//           value: 1, // Each risk counts as 1
//         },
//       ],
//     });
//   });

//   return heatmapData;
// }

const fetchRiskByIds = async (req, res) => {
  const { RiskIDs } = req.body;

  if (!Array.isArray(RiskIDs) || RiskIDs.length === 0) {
    return res.status(400).json({
      message: "RiskIDs must be a non-empty array",
    });
  }

  try {
    const risks = await RiskModuleDraft.findAll({
      where: {
        RiskModuleDraftID: {
          [Op.in]: RiskIDs,
        },
        IsDeleted: false,
      },
      include: [
        {
          model: RiskAssessment,
          as: "RiskAssessments",
          required: false,
        },
        {
          model: RiskAnalysis,
          as: "RiskAnalysiss",
          required: false,
        },
        {
          model: RiskTreatment,
          as: "RiskTreatments",
          required: false,
        },
        {
          model: RiskMonitoringReview,
          as: "RiskMonitoringReviews",
          required: false,
        },
      ],
    });

    if (!risks || risks.length === 0) {
      return res.status(404).json({
        message: "No risks found with the provided RiskModuleDraftID",
      });
    }

    const processedRisks = risks.map((risk) => {
      const riskData = risk.get({ plain: true });

      // Transform main risk document path
      const transformedRisk = {
        ...riskData,
        RiskDocumentPath: riskData.RiskDocumentPath
          ? path.posix.join("file/r/", path.basename(riskData.RiskDocumentPath))
          : null,
      };

      // Transform RiskTreatments if they exist
      if (riskData.RiskTreatments && riskData.RiskTreatments.length > 0) {
        transformedRisk.RiskTreatments = riskData.RiskTreatments.map(
          (treatment) => ({
            ...treatment,
            RiskTreatmentDocumentPath: treatment.RiskTreatmentDocumentPath
              ? path.posix.join(
                  "file/r/",
                  path.basename(treatment.RiskTreatmentDocumentPath)
                )
              : null,
          })
        );
      }

      return transformedRisk;
    });

    // Convert to object with numeric keys
    const risksObject = processedRisks.reduce((acc, risk, index) => {
      acc[index] = risk;
      return acc;
    }, {});

    const mergedData = Object.values(risksObject);

    return res.status(200).json({
      message: "Risk data fetched successfully",
      data: mergedData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching risk data", error });
  }
};

const fetchSopModuleDraftBasedOnRiskSopLink = async (req, res) => {
  try {
    const riskSopLinks = await RiskSopLink.findAll({
      where: {
        IsDeleted: false,
      },
      attributes: ["SopDraftID"],
    });

    if (riskSopLinks.length === 0) {
      return res.status(404).json({ message: "No SOPs found in RiskSopLink" });
    }

    const sopIds = [...new Set(riskSopLinks.map((link) => link.SopDraftID))];

    const sopModuleDrafts = await SopModuleDraft.findAll({
      where: {
        SOPDraftID: {
          [Op.in]: sopIds,
        },
        IsDeleted: false,
      },
      attributes: ["SOPDraftID", "SOPID", "SOPName", "IsReactFlow"],
      order: [["CreatedDate", "DESC"]],
      distinct: true,
    });

    if (sopModuleDrafts.length === 0) {
      return res
        .status(404)
        .json({ message: "No SopModuleDrafts found for the SOPIDs." });
    }

    return res.status(200).json({
      message: "SopModuleDraft data fetched successfully",
      data: sopModuleDrafts,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error fetching SopModuleDraft data", error });
  }
};

const softDeleteRisk = async (req, res) => {
  const { RiskID } = req.body;
  const { currentUserId } = req.payload;

  const t = await sequelize.transaction();

  try {
    const riskModule = await RiskModule.findByPk(RiskID, { transaction: t });

    if (!riskModule) {
      await t.rollback();
      return res.status(404).json({ message: "Risk not found!" });
    }

    // Soft delete RiskModule
    await riskModule.update(
      {
        IsDeleted: true,
        DeletedBy: currentUserId,
        DeletedDate: literal("CURRENT_TIMESTAMP"),
      },
      { transaction: t }
    );

    // Soft delete all RiskModuleDrafts
    await RiskModuleDraft.update(
      {
        IsDeleted: true,
        DeletedBy: currentUserId,
        DeletedDate: literal("CURRENT_TIMESTAMP"),
      },
      { where: { RiskID: RiskID }, transaction: t }
    );

    // Soft delete related RiskSopLinks
    await RiskSopLink.update(
      {
        IsDeleted: true,
        DeletedBy: currentUserId,
        DeletedDate: literal("CURRENT_TIMESTAMP"),
      },
      { where: { RiskID: RiskID }, transaction: t }
    );

    // Soft delete RiskAssessment
    await RiskAssessment.update(
      {
        IsDeleted: true,
        DeletedBy: currentUserId,
        DeletedDate: literal("CURRENT_TIMESTAMP"),
      },
      { where: { RiskID: RiskID }, transaction: t }
    );

    // Soft delete RiskAnalysis
    await RiskAnalysis.update(
      {
        IsDeleted: true,
        DeletedBy: currentUserId,
        DeletedDate: literal("CURRENT_TIMESTAMP"),
      },
      { where: { RiskID: RiskID }, transaction: t }
    );

    // Soft delete RiskTreatment
    await RiskTreatment.update(
      {
        IsDeleted: true,
        DeletedBy: currentUserId,
        DeletedDate: literal("CURRENT_TIMESTAMP"),
      },
      { where: { RiskID: RiskID }, transaction: t }
    );

    // Soft delete RiskMonitoringReview
    await RiskMonitoringReview.update(
      {
        IsDeleted: true,
        DeletedBy: currentUserId,
        DeletedDate: literal("CURRENT_TIMESTAMP"),
      },
      { where: { RiskID: RiskID }, transaction: t }
    );

    await t.commit();
    return res.status(200).json({ message: "Risk deleted successfully." });
  } catch (error) {
    await t.rollback();
    console.error("Error soft deleting risk:", error);
    return res.status(500).json({ message: "Failed to delete risk", error });
  }
};

// Get all Groups for Admin
const fetchBlankPage = async (req, res) => {
  try {
    // Path to your Template/Blank folder
    const basePath = path.join(
      "src",
      "infrastructure",
      "media",
      "Template",
      "Blank"
    );

    // Read files from the folder
    const files = fs.readdirSync(basePath);

    if (!files.length) {
      return res.status(404).json({
        success: false,
        message: "No blank template files found",
      });
    }

    const originalFileName = files[0];

    const ext = path.extname(originalFileName); // ".docx"
    const name = path.basename(originalFileName, ext); // "BlankTemplate"

    const completeFileName = `${name}${ext}`;

    const filePath = path.posix.join("file/tb", completeFileName);

    return res.status(200).json({
      success: true,
      url: filePath,
    });
  } catch (error) {
    console.error("Error generating blank page url:", error);
    return res.status(500).json({
      message: "Error generating blank page url.",
      error: error.message,
    });
  }
};

const upsertDocumentTemplate = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    let {
      DocumentTemplateID,
      ElementAttributeTypeID,
      ModuleTypeID,
      DocumentName,
      DocumentDescription,
      DocumentIsActive,
      DocumentExpiry,
      DraftVersion = "0.1",
      MasterVersion = null,
      SelfApproved = false,
      DocumentPath,
      EditedDocumentPath,
      ContentID,
      IsPublic = false,
    } = req.body;

    const { currentUserId, lincense } = req.payload;

    if (!ModuleTypeID || !ContentID || !DocumentName) {
      throw new Error(
        "Missing required fields: ModuleTypeID, ContentID, DocumentName"
      );
    }

    let template;

    if (DocumentTemplateID) {
      template = await DocumentTemplate.findOne({
        where: {
          DocumentTemplateID,
          CreatedBy: currentUserId,
          OrganizationStructureID: lincense.EnterpriseID,
          IsDeleted: false,
        },
      });

      if (!template) {
        await t.rollback();
        return res.status(403).send({
          message:
            "You are not allowed to edit this template or it does not exist",
        });
      }

      const existing = await DocumentTemplate.findOne({
        where: {
          DocumentName,
          ContentID,
          OrganizationStructureID: lincense.EnterpriseID,
          IsDeleted: false,
          DocumentTemplateID: { [Op.ne]: DocumentTemplateID },
          [Op.or]: [{ CreatedBy: currentUserId }, { IsPublic: true }],
        },
      });

      if (existing) {
        await t.rollback();
        return res.status(400).send({
          message: "A template with the same name already exists",
        });
      }
      // update fields
      await template.update(
        {
          ElementAttributeTypeID,
          ModuleTypeID,
          DocumentName,
          DocumentDescription,
          DocumentIsActive,
          DocumentExpiry,
          DraftVersion,
          MasterVersion,
          SelfApproved,
          DocumentPath,
          EditedDocumentPath,
          ContentID,
          IsPublic,
          UpdatedBy: currentUserId,
          UpdatedDate: literal("CURRENT_TIMESTAMP"),
        },
        { transaction: t }
      );

      await t.commit();
      return res.status(200).send({
        message: "Document Template updated successfully",
        data: {
          DocumentTemplateID: template.DocumentTemplateID,
          DocumentName: template.DocumentName,
          IsPublic: template.IsPublic,
        },
      });
    } else {
      const existing = await DocumentTemplate.findOne({
        where: {
          DocumentName,
          ContentID,
          OrganizationStructureID: lincense.EnterpriseID,
          IsDeleted: false,
          [Op.or]: [{ CreatedBy: currentUserId }, { IsPublic: true }],
        },
      });

      if (existing) {
        await t.rollback();
        return res.status(400).send({
          message: "A template with the same name already exists",
        });
      }
      const templatePayload = {
        ElementAttributeTypeID,
        ModuleTypeID,
        DocumentName,
        DocumentDescription,
        DocumentIsActive,
        DocumentExpiry,
        DraftVersion,
        MasterVersion,
        SelfApproved,
        DocumentPath,
        ContentID,
        IsPublic,
        OrganizationStructureID: lincense.EnterpriseID,
        CreatedBy: currentUserId,
        CreatedDate: literal("CURRENT_TIMESTAMP"),
      };

      template = await DocumentTemplate.create(templatePayload, {
        transaction: t,
      });

      await t.commit();
      return res.status(201).send({
        message: "Document Template created successfully",
        data: {
          DocumentTemplateID: template.DocumentTemplateID,
          DocumentName: template.DocumentName,
          IsPublic: template.IsPublic,
        },
      });
    }
  } catch (error) {
    await t.rollback();
    console.error(error);
    return res.status(500).send({
      message: error.message || "Something went wrong!",
    });
  }
};

const getTemplateResponse = async (req, res) => {
  try {
    const { ModuleTypeID, ParentContentID, IsGlobalView } = req.body;
    const { currentUserId, lincense } = req.payload;

    const baseWhere = {
      ModuleTypeID,
      ContentID: ParentContentID,
      OrganizationStructureID: lincense.EnterpriseID,
      IsDeleted: false,
    };

    const whereCondition = IsGlobalView
      ? baseWhere
      : {
          ...baseWhere,
          [Op.or]: [{ IsPublic: true }, { CreatedBy: currentUserId }],
        };

    const templates = await DocumentTemplate.findAll({
      where: whereCondition,
      attributes: [
        ["DocumentTemplateID", "DocumentID"],
        ["DocumentName", "DocumentName"],
        "ModuleTypeID",
        "IsPublic",
        "CreatedBy",
      ],
    });

    const docs = templates.map((tpl) => ({
      Authority:
        tpl.get("IsPublic") === true
          ? "Public"
          : tpl.get("CreatedBy") === currentUserId
          ? "Owner"
          : "OtherUser",
      ContentID: ParentContentID,
      IsCanEdit: tpl.get("CreatedBy") === currentUserId,
      DocumentID: tpl.get("DocumentID"),
      ModuleName: "Document",
      DocumentName: tpl.get("DocumentName"),
      ModuleTypeID: tpl.get("ModuleTypeID"),
      DocumentStatus: "InDraft",
      SequenceNumber: null,
      DocumentIsHidden: false,
      IsPublic: tpl.get("IsPublic"),
    }));

    return res.json({
      message: "Templates fetched successfully",
      bredcrumbs: [
        {
          level: 0,
          breadcrumbId: ParentContentID,
          breadcrumbName: "Create Template",
        },
      ],
      data: [],
      docs,
      lastSynced: new Date().toISOString(),
      moduleType: "Document",
      SOPState: "ReactFlow",
    });
  } catch (error) {
    console.error("Error preparing response:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getDocumentTemplateById = async (req, res) => {
  try {
    const { currentUserId, lincense } = req.payload;
    const { DocumentTemplateID, IsGlobalView } = req.body;

    const baseWhere = {
      DocumentTemplateID,
      OrganizationStructureID: lincense.EnterpriseID,
      IsDeleted: false,
    };

    const whereCondition = IsGlobalView
      ? baseWhere
      : {
          ...baseWhere,
          [Op.or]: [
            { IsPublic: true }, // anyone can fetch public
            { CreatedBy: currentUserId }, // private only owner can fetch
          ],
        };

    let template = await DocumentTemplate.findOne({ where: whereCondition });

    if (!template) {
      return res.status(404).send({ message: "Document Template not found" });
    }
    if (template) {
      template = {
        ...template.toJSON(),
        DocumentPath: template?.DocumentPath
          ? path.posix.join(
              "file/td/",
              `${path.basename(template?.DocumentPath)}`
            )
          : null,
      };
    }
    // Format breadcrumb
    const breadcrumbs = [
      {
        ContentID: template?.ContentID,
        ContentName: "Create Template",
        ModuleTypeID: template?.ModuleTypeID,
        depth: 0, // you can compute depth if hierarchy needed
      },
    ];
    return res.status(200).send({
      message: "Document Template fetched successfully",
      data: template,
      bredcrumbs: breadcrumbs,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      message: error.message || "Something went wrong!",
    });
  }
};

const getDocumentTemplatesByUser = async (req, res) => {
  try {
    const { currentUserId, lincense } = req.payload;
    const { IsGlobalView } = req.body;

    const baseWhere = {
      OrganizationStructureID: lincense.EnterpriseID,
      IsDeleted: false,
    };

    const whereCondition = IsGlobalView
      ? baseWhere
      : {
          ...baseWhere,
          [Op.or]: [{ IsPublic: true }, { CreatedBy: currentUserId }],
        };

    let templates = await DocumentTemplate.findAll({
      where: whereCondition,
      order: [["CreatedDate", "DESC"]],
    });

    templates = templates.map((t) => {
      const obj = t.toJSON();
      return {
        ...obj,
        DocumentPath: obj?.DocumentPath
          ? path.posix.join("file/td/", `${path.basename(obj?.DocumentPath)}`)
          : null,
      };
    });
    return res.status(200).send({
      message: "Templates fetched successfully",
      data: templates,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      message: error.message || "Something went wrong!",
    });
  }
};

const deleteDocumentTemplate = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { currentUserId, lincense } = req.payload;
    const { DocumentTemplateID } = req.body;

    if (!DocumentTemplateID) {
      return res
        .status(400)
        .send({ message: "DocumentTemplateID is required" });
    }

    // Find the template
    const template = await DocumentTemplate.findOne({
      where: {
        DocumentTemplateID,
        OrganizationStructureID: lincense.EnterpriseID,
        IsDeleted: false,
      },
    });

    if (!template) {
      return res.status(404).send({ message: "Document Template not found" });
    }

    if (template.CreatedBy !== currentUserId) {
      return res.status(403).send({
        message: "You are not authorized to delete this template",
      });
    }

    await template.update(
      {
        IsDeleted: true,
        DeletedBy: currentUserId,
        DeletedDate: sequelize.literal("CURRENT_TIMESTAMP"),
      },
      { transaction: t }
    );

    await t.commit();

    return res.status(200).send({
      message: "Document Template deleted successfully",
      data: {
        DocumentTemplateID: template.DocumentTemplateID,
        DocumentName: template.DocumentName,
      },
    });
  } catch (error) {
    await t.rollback();
    console.error(error);
    return res.status(500).send({
      message: error.message || "Something went wrong!",
    });
  }
};

const saveEmailTemplate = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { EmailTemplateID, GreetingName, Subject, Body, signature, logo } =
      req.body;

    const { currentUserId } = req.payload;

    const requiredFields = ["GreetingName", "Subject", "Body"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).send({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    let finalCreatedBy = currentUserId;
    let finalUpdatedBy = currentUserId;
    if (currentUserId) {
      if (!EmailTemplateID) {
        finalCreatedBy = currentUserId;
      }
      finalUpdatedBy = currentUserId;
    }
    let existingTemplate = null;
    if (EmailTemplateID) {
      existingTemplate = await EmailTemplate.findByPk(EmailTemplateID, {
        transaction: t,
      });
    }

    let result;
    let message;

    if (existingTemplate) {
      await existingTemplate.update(
        {
          GreetingName,
          Subject,
          Body,
          signature:
            signature !== undefined ? signature : existingTemplate.signature,
          logo: logo !== undefined ? logo : existingTemplate.logo,
          UpdatedBy: finalUpdatedBy,
          UpdatedAt: new Date(),
        },
        { transaction: t }
      );

      result = existingTemplate;
      message = "Email Template updated successfully";
    } else {
      const createData = {
        GreetingName,
        Subject,
        Body,
        signature,
        logo,
        CreatedBy: finalCreatedBy,
        UpdatedBy: finalUpdatedBy,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      };

      if (EmailTemplateID) {
        createData.EmailTemplateID = EmailTemplateID;
      }

      const newEmailTemplate = await EmailTemplate.create(createData, {
        transaction: t,
      });

      result = newEmailTemplate;
      message = "Email Template created successfully";
    }

    await t.commit();

    return res.status(existingTemplate ? 200 : 201).send({
      message,
      data: result,
    });
  } catch (error) {
    await t.rollback();
    console.error(error);

    // Handle unique constraint violation for GreetingName
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).send({
        message: "GreetingName already exists. Please use a unique name.",
      });
    }

    return res.status(500).send({
      message: error.message || "Something went wrong!",
    });
  }
};

const getLatestEmailTemplate = async () => {
  return await EmailTemplate.findOne({
    order: [["CreatedDate", "DESC"]],
  });
};

const getAllEmailTemplates = async (req, res) => {
  try {
    const templates = await EmailTemplate.findAll();

    if (!templates || templates.length === 0) {
      return res.status(404).send({
        message: "No email templates found.",
        data: [],
      });
    }

    return res.status(200).send({
      message: "Email templates fetched successfully.",
      data: templates,
    });
  } catch (error) {
    console.error("Error fetching email templates:", error);
    return res.status(500).send({
      message: "Something went wrong while fetching email templates.",
      error: error.message,
    });
  }
};

const getMailById = async (id) => {
  return await EmailTemplate.findByPk(id);
};

const getEmailTemplateById = async (req, res) => {
  try {
    const { EmailTemplateID } = req.body;

    if (!EmailTemplateID) {
      return res.status(400).send({
        message: "EmailTemplateID is required.",
      });
    }

    const template = await EmailTemplate.findByPk(EmailTemplateID);

    if (!template) {
      return res.status(404).send({
        message: `Email template with ID ${EmailTemplateID} not found.`,
      });
    }

    return res.status(200).send({
      message: "Email template fetched successfully.",
      data: template,
    });
  } catch (error) {
    console.error("Error fetching email template by ID:", error);
    return res.status(500).send({
      message: "Something went wrong while fetching the email template.",
      error: error.message,
    });
  }
};

const deleteEmailTemplateById = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { EmailTemplateID } = req.body;
    if (!EmailTemplateID) {
      return res.status(400).send({ message: "EmailTemplateID is required" });
    }
    const template = await EmailTemplate.findByPk(EmailTemplateID);

    if (!template) {
      return res.status(404).send({ message: "Email Template not found" });
    }
    await template.destroy({ transaction: t });
    await t.commit();
    return res.status(200).send({
      message: "Email Template deleted successfully",
      data: {
        EmailTemplateID: template.EmailTemplateID,
        GreetingName: template.GreetingName,
      },
    });
  } catch (error) {
    await t.rollback();
    console.error("Error deleting email template:", error);
    return res.status(500).send({
      message: "Something went wrong while deleting the email template.",
      error: error.message,
    });
  }
};

const ConvertDocxToPDF = async (req, res) => {
  try {
    const { DocumentModuleDraftID } = req.body;
    const basePath = path.posix.join(
      "src",
      "infrastructure",
      "media",
      "Document"
    );

    const NewFileDraft = await DocumentModuleDraft.findByPk(
      DocumentModuleDraftID
    );

    // Validation checks
    if (NewFileDraft.DocumentPath.includes(".pdf")) {
      return res.status(400).json({ error: "File is Already in PDF" });
    }

    if (NewFileDraft.OnlyOfficeResponceUrl !== null) {
      return res.status(400).json({ error: "File Has Some Changes!!" });
    }

    // Update draft
    await DocumentModuleDraft.update(
      { EditedDocumentPath: NewFileDraft.DocumentPath },
      { where: { DocumentModuleDraftID } }
    );
    console.log(NewFileDraft.DocumentPath, "asasd");
    // Correct file path handling
    const incomingFile = path.basename(NewFileDraft.DocumentPath);
    const incomingFileExtension = helper.getFileExtension(
      NewFileDraft.DocumentPath
    );
    const existingFilePath = path.posix.join(basePath, incomingFile);
    console.log(existingFilePath, "existingFilePath");
    if (!fs.existsSync(existingFilePath)) {
      return res
        .status(404)
        .json({ error: "File does not exist at the specified path" });
    }

    const incomingFileFullPath = path.posix.join(
      basePath,
      `${DocumentModuleDraftID}.pdf`
    );
    const docFileFullPath = path.posix.join(
      basePath,
      `${NewFileDraft.DocumentID}.pdf`
    );
    console.log(incomingFileFullPath, "incomingFileFullPath");
    // Update database records
    await Promise.all([
      DocumentModule.update(
        { DocumentPath: docFileFullPath },
        { where: { DocumentID: NewFileDraft.DocumentID } }
      ),
      DocumentModuleDraft.update(
        { DocumentPath: incomingFileFullPath },
        { where: { DocumentModuleDraftID } }
      ),
    ]);

    // Convert files sequentially
    const fileUrl = process.env.BACKEND_URL + "file/d/" + incomingFile;
    // const fileUrl = "https://0c8e582380a6.ngrok-free.app/" + "file/d/" + incomingFile;

    convertWithOnlyOffice(fileUrl, incomingFileFullPath);
    convertWithOnlyOffice(fileUrl, docFileFullPath);

    res.json({
      success: true,
      message: "Conversion started successfully",
      draftPdfPath: incomingFileFullPath,
      documentPdfPath: docFileFullPath,
    });
  } catch (error) {
    console.error("Conversion error:", error);
    res.status(500).json({ error: "Internal server error during conversion" });
  }
};

async function convertWithOnlyOffice(inputUrl, outputPath) {
  try {
    console.log(inputUrl, "inputUrl");
    console.log(outputPath, "outputPath");
    // Build request body for ONLYOFFICE ConvertService
    const body = {
      async: false, // wait until conversion finishes
      filetype: "docx", // input file type
      outputtype: "pdf", // desired output
      key: `${Date.now()}`, // unique key for this conversion
      title: path.basename(inputUrl),
      url: inputUrl, // DOCX file URL accessible by DocumentServer
    };

    // Send request to ONLYOFFICE DocumentServer
    const response = await axios.post(
      `${process.env.ONLYOFFICE_SERVER_URL}/ConvertService.ashx`, // replace localhost if running elsewhere
      body,
      { headers: { "Content-Type": "application/json" } }
    );

    if (!response.data || !response.data.fileUrl) {
      throw new Error("Conversion failed: No fileUrl returned.");
    }

    const pdfUrl = response.data.fileUrl;
    console.log("✅ PDF Generated:", pdfUrl);

    // Download the converted PDF
    const pdfResponse = await axios.get(pdfUrl, {
      responseType: "arraybuffer",
    });
    fs.writeFileSync(outputPath, pdfResponse.data);

    console.log(`📂 PDF saved to: ${outputPath}`);
  } catch (err) {
    console.error("❌ Error converting with ONLYOFFICE:", err.message);
  }
}

module.exports = {
  createDocumentModule,
  createBulkDocumentModule,
  publishDocumentModule,
  viewDocumentModuleDraft,
  listDocumentModule,
  deleteDocumentModule,
  updateDocumentStatus,
  createTrainingSimulationModule,
  publishTrainingSimulationModule,
  viewTrainingSimulationModuleDraft,
  listTrainingSimulationModule,
  deleteTrainingSimulationtModule,
  createTestSimulationModule,
  publishTestSimulationModule,
  viewTestSimulationModuleDraft,
  listTestSimulationModule,
  deleteTestSimulationtModule,
  createSOPModule,
  createSOPFlowModule,
  publishSOPModule,
  publishSOPFlowModule,
  viewSOPModuleDraft,
  viewSOPFlowModuleDraft,
  listSOPModule,
  deleteSOPModule,
  deleteSOPFlowModule,
  createBulkTestMCQ,
  createTestMCQModule,
  publishTestMCQModule,
  viewTestMCQModuleDraft,
  listTestMCQModule,
  listMCQs,
  deleteTestMCQModule,
  createUpdateCategory,
  deleteCategory,
  changeCategoryStatus,
  assignElementToRoleAndDepartment,
  listDepartmentsForElementAssignment,
  listRolesForElementAssignment,
  viewElementDraftActivityLog,
  viewElementDraftActivityLogHistory,
  impactAnalysis,
  createFormModule,
  publishFormModule,
  viewFormModuleDraft,
  listFormModule,
  deleteFormModule,
  verifyUserPermissionToEditForm,
  createForm,
  viewForm,
  createCampaign,
  campaignList,
  campaignReportList,
  exportCampaignExcel,
  fetchAssignedDataForElement,
  revokeAssignedUsersFromElement,
  exportDocuments,
  hideUnhideModule,
  syncModule,
  createFlowWithNormalText,
  createGroup,
  getAllGroups,
  getGroupById,
  modifyGroup,
  deleteGroup,
  getLatestSopData,
  createOrUpdateRisk,
  fetchAllRiskData,
  fetchRiskByIds,
  fetchSopModuleDraftBasedOnRiskSopLink,
  softDeleteRisk,
  fetchRiskDashboardData,
  updateRiskModule,
  fetchBlankPage,
  upsertDocumentTemplate,
  getDocumentTemplateById,
  getTemplateResponse,
  getDocumentTemplatesByUser,
  deleteDocumentTemplate,
  saveEmailTemplate,
  getAllEmailTemplates,
  deleteEmailTemplateById,
  getLatestEmailTemplate,
  getEmailTemplateById,
  ConvertDocxToPDF,
};
