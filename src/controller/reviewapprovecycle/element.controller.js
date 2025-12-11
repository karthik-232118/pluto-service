const { Op, literal, QueryTypes } = require("sequelize");
const { sequelize } = require("../../model");
const ModuleApprover = require("../../model/ModuleApprover");
const ModuleChecker = require("../../model/ModuleChecker");
const ModuleEscalation = require("../../model/ModuleEscalation");
const ModuleOwner = require("../../model/ModuleOwner");
const ModuleStakeHolder = require("../../model/ModuleStakeHolder");
const Notification = require("../../model/Notification");
const SopDetails = require("../../model/SopDetails");
const SopModule = require("../../model/SopModule");
const UserNotification = require("../../model/UserNotification");
const { logger } = require("../../utils/services/logger");
const DocumentModule = require("../../model/DocumentModule");
const DocumentModuleDraft = require("../../model/DocumentModuleDraft");
const UserDetails = require("../../model/UserDetails");
const path = require("path");
const fs = require("fs");
const helper = require("../../utils/helper");
const { sendNotification } = require("../../utils/services/socket");
const UserModuleLink = require("../../model/UserModuleLink");
const RiskAndCompliences = require("../../model/RiskAndCompliences");
const SopModuleDraft = require("../../model/SopModuleDraft");
const SopAttachmentLinks = require("../../model/SopAttachmentLinks");
const { mailService } = require("../../utils/services/nodemailer");
const adminController = require("../admin/admin.controller");
const DocumentInProgress = require("../../model/DocumentInProgress");
const Users = require("../../model/Users");
const ElementAttributeType = require("../../model/ElementAttributeType");
const ElementAttributeUsers = require("../../model/ElementAttributeUsers");
const { default: axios } = require("axios");
require("dotenv").config();

exports.createSOPModule = async (req, res) => {
  const t = await sequelize.transaction();
  const { currentUserId } = req.payload;
  try {
    let {
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
      TemplateFontFamly,
      TemplateFooter,
      TemplateHeader,
      CoOwnerUserID,
      CTQImageURL,
    } = req.body;

    // Validate required fields
    if (!ElementAttributeTypeID) {
      throw new Error("ElementAttributeTypeID is required");
    }
    if (!ModuleTypeID) {
      throw new Error("ModuleTypeID is required");
    }
    if (!ContentID) {
      throw new Error("ContentID is required (must be a valid UUID)");
    }
    if (!SOPName || SOPName.trim() === "") {
      throw new Error("SOPName is required and cannot be empty");
    }
    if (!SOPOwner || !Array.isArray(SOPOwner) || SOPOwner.length === 0) {
      throw new Error(
        "SOPOwner is required and must be a non-empty array of user IDs"
      );
    }
    if (!shapeList || !Array.isArray(shapeList)) {
      throw new Error("shapeList is required and must be an array");
    }
    if (!selectedElements || !Array.isArray(selectedElements)) {
      throw new Error("selectedElements is required and must be an array");
    }

    SelfApproved =
      typeof SelfApproved === "boolean"
        ? SelfApproved
        : SelfApproved === "true";
    let letestSopModuleDraft,
      DraftVersion = null,
      MasterVersion = null;
    const commonPayload = {
      ElementAttributeTypeID,
      ModuleTypeID,
      ContentID, // ContentID is now guaranteed to be valid from validation above
      SOPName,
      SOPDescription,
      SOPIsActive,
      SOPTags,
      SelfApproved,
      SOPXMLElement,
      SOPExpiry,
      NeedAcceptance,
      NeedAcceptanceForApprover,
      IsTemplate,
      IsReactFlow,
      SOPDocID,
      ...(SelfApproved === false && {
        EscalationType: EscalationType || null,
        EscalationAfter: EscalationAfter || null,
      }),
      TemplateFontFamly,
      TemplateFooter,
      TemplateHeader,
      CoOwnerUserID,
      CTQImageURL,
    };

    console.log(commonPayload);
    if (Checker && Checker.length > 0 && SelfApproved === false) {
      if (!Approver || Approver.length === 0) {
        throw new Error("Approver is required when Checker is present");
      }
    }
    if (SOPID) {
      letestSopModuleDraft = await SopModuleDraft.findOne({
        where: { ModuleTypeID, SOPID, ContentID },
        order: [["CreatedDate", "DESC"]],
      });

      if (letestSopModuleDraft) {
        letestSopModuleDraft = JSON.parse(JSON.stringify(letestSopModuleDraft));
        DraftVersion = letestSopModuleDraft.DraftVersion;
        MasterVersion = letestSopModuleDraft.MasterVersion || null;
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
              SOPDraftID: letestSopModuleDraft.SOPDraftID,
            },
          },
          { transaction: t }
        );
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
              SOPDraftID: letestSopModuleDraft.SOPDraftID,
            },
          },
          { transaction: t }
        );
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
              SOPDraftID: letestSopModuleDraft.SOPDraftID,
            },
          },
          { transaction: t }
        );
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
              SOPDraftID: letestSopModuleDraft.SOPDraftID,
            },
          },
          { transaction: t }
        );
        // get the latest draft version for the SOP
      }
    }
    const commonSopDetailsAndLinkCreation = async (sopDraft) => {
      await ModuleOwner.bulkCreate(
        SOPOwner.map((userId) => ({
          ModuleTypeID,
          SOPID: sopDraft.SOPID,
          ContentID: sopDraft.ContentID,
          SOPDraftID: sopDraft.SOPDraftID,
          UserID: userId,
          CreatedBy: currentUserId,
        })),
        { transaction: t }
      );

      // Delete existing SOP details and attachments if updating an existing SOP
      if (SOPID && sopDraft.DraftVersion !== "0.1") {
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
            replacements: { SOPID: sopDraft.SOPID },
            transaction: t,
          }
        );
      }

      // Create SOP details and links for each shape
      for (const x of shapeList) {
        const details = await SopDetails.create(
          {
            SopID: sopDraft.SOPID,
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

        if (linkedElm.length > 0) {
          await SopAttachmentLinks.bulkCreate(
            linkedElm.map((y) => ({
              SopDetailsID: details.SopDetailsID,
              ContentLinkTitle: y.ContentLinkTitle,
              ContentLink: y.ContentLink,
              ContentLinkType: y.ContentLinkType,
              CreatedBy: currentUserId,
            })),
            { transaction: t }
          );
        }
      }
      return "Successfully created SOP details and links";
    };

    if (SelfApproved === true) {
      const createNotification = async (ModuleID) => {
        const modulelinks = await UserModuleLink.findAll({
          where: {
            ModuleID,
            StartDate: {
              [Op.lte]: literal("CURRENT_TIMESTAMP"),
            },
            DueDate: {
              [Op.gte]: literal("CURRENT_TIMESTAMP"),
            },
          },
          attributes: ["UserID"],
        });
        const notififactionBulk = [];
        if (modulelinks) {
          const data = await Notification.findAll({
            where: {
              UserID: modulelinks.map((el) => el.UserID),
              NotificationTypeForPublish: {
                [Op.or]: ["push", "both"],
              },
            },
          });
          if (data && data.length > 0) {
            for (const el of data) {
              notififactionBulk.push({
                UserID: el.UserID,
                Message: "Updated assign Element version is published",
                NotificationType: "actionable",
                LinkedType: "SOP",
                LinkedID: letestSopModuleDraft.SOPDraftID,
                CreatedBy: currentUserId,
              });
            }
          }
        }
        if (notififactionBulk.length > 0) {
          await UserNotification.bulkCreate(notififactionBulk, {
            ignoreDuplicates: true,
            transaction: t,
          });
          sendNotification(notififactionBulk);
        }
        return notififactionBulk;
      };
      // If the SOP is self-approved, increment the MasterVersion and set DraftVersion accordingly
      if (DraftVersion) {
        MasterVersion = Math.ceil(parseFloat(DraftVersion)).toFixed(1);
        DraftVersion =
          MasterVersion && parseFloat(DraftVersion) < parseFloat(MasterVersion)
            ? (parseFloat(MasterVersion) + 0.1).toFixed(1)
            : (parseFloat(DraftVersion) + 0.1).toFixed(1);
      } else {
        MasterVersion = "1.0";
        DraftVersion = "0.1";
      }
      const publishCommonPayload = {
        ...commonPayload,
        SOPStatus: "Published",
        DraftVersion,
        MasterVersion,
      };
      // If SOPID exists, update the existing SOP module else create a new one
      if (SOPID) {
        await SopModule.update(
          {
            ...publishCommonPayload,
            ModifiedBy: currentUserId,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: { ModuleTypeID, SOPID, ContentID },
          },
          { transaction: t }
        );
        await createNotification(SOPID);
      } else {
        const newSopModule = await SopModule.create(
          {
            ...publishCommonPayload,
            CreatedBy: currentUserId,
          },
          { transaction: t }
        );
        SOPID = newSopModule.SOPID;
      }
      // Create the SOP module draft
      const sopDraft = await SopModuleDraft.create(
        {
          SOPID,
          ...publishCommonPayload,
          CreatedBy: currentUserId,
        },
        { transaction: t }
      );
      // Create the SOP details and links
      await commonSopDetailsAndLinkCreation(sopDraft);
    } else if (SelfApproved === false) {
      // If the SOP is not self-approved, increment the DraftVersion and set MasterVersion to null
      if (DraftVersion) {
        DraftVersion =
          MasterVersion && parseFloat(DraftVersion) < parseFloat(MasterVersion)
            ? (parseFloat(MasterVersion) + 0.1).toFixed(1)
            : (parseFloat(DraftVersion) + 0.1).toFixed(1);
      } else {
        DraftVersion = "0.1";
      }
      // Create the common payload for the SOP module
      const draftCommonPayload = {
        ...commonPayload,
        SOPStatus: "InProgress",
        DraftVersion,
        MasterVersion,
        CreatedBy: currentUserId,
      };
      if (!SOPID) {
        const newSopModule = await SopModule.create(
          {
            ...draftCommonPayload,
          },
          { transaction: t }
        );
        SOPID = newSopModule.SOPID;
      }
      // Create the SOP module draft
      const sopDraft = await SopModuleDraft.create(
        {
          SOPID,
          ...draftCommonPayload,
        },
        { transaction: t }
      );
      // Create the SOP details and links
      await commonSopDetailsAndLinkCreation(sopDraft);
      const createChecker = async () => {
          if (Checker && Checker.length > 0) {
            return await ModuleChecker.bulkCreate(
              Checker.map((userId) => ({
                ModuleTypeID,
                SOPID,
                ContentID,
                SOPDraftID: sopDraft.SOPDraftID,
                UserID: userId,
                CreatedBy: currentUserId,
              })),
              { transaction: t }
            );
          }
        },
        createEscalationPerson = async () => {
          if (EscalationPerson && EscalationPerson.length > 0) {
            return await ModuleEscalation.bulkCreate(
              EscalationPerson.map((userId) => ({
                ModuleTypeID,
                SOPID,
                ContentID,
                SOPDraftID: sopDraft.SOPDraftID,
                UserID: userId,
                CreatedBy: currentUserId,
              })),
              { transaction: t }
            );
          }
          return [];
        },
        createApprover = async () => {
          if (Approver && Approver.length > 0) {
            return await ModuleApprover.bulkCreate(
              Approver.map((userId) => ({
                ModuleTypeID,
                SOPID,
                ContentID,
                SOPDraftID: sopDraft.SOPDraftID,
                UserID: userId,
                CreatedBy: currentUserId,
              })),
              { transaction: t }
            );
          }
          return [];
        },
        notififactionBulk = [],
        createNotification = async (users, type) => {
          if (users && users.length > 0) {
            // First check if users have notification preferences set
            const data = await Notification.findAll({
              where: {
                UserID: users,
                NotificationTypeForAction: {
                  [Op.or]: ["push", "both"],
                },
              },
            });

            // If users have preferences set, use those
            if (data && data.length > 0) {
              for (const el of data) {
                notififactionBulk.push({
                  UserID: el.UserID,
                  Message: "Element assign as a " + type,
                  NotificationType: "actionable",
                  LinkedType: "SOP",
                  LinkedID: sopDraft.SOPDraftID,
                  CreatedBy: currentUserId,
                });
              }
            } else {
              // If no users have push/both enabled, send to all users anyway
              // (actionable items should always notify)
              for (const userId of users) {
                notififactionBulk.push({
                  UserID: userId,
                  Message: "Element assign as a " + type,
                  NotificationType: "actionable",
                  LinkedType: "SOP",
                  LinkedID: sopDraft.SOPDraftID,
                  CreatedBy: currentUserId,
                });
              }
            }
          }
        };
      if (Checker && Checker.length > 0) {
        await createChecker();
        // notification to checkers
        await createNotification(Checker, "Checker");
        await createEscalationPerson();
        await createApprover();
      } else if (Approver && Approver.length > 0) {
        await createApprover();
        // notification to approvers
        await createNotification(Approver, "Approver");
      }

      // Send all accumulated notifications at once
      if (notififactionBulk.length > 0) {
        await UserNotification.bulkCreate(notififactionBulk, {
          ignoreDuplicates: true,
          transaction: t,
        });
        sendNotification(notififactionBulk);
      }
      // notification
    }
    await t.commit();
    return res.status(201).json({ message: "SOP Module created successfully" });
  } catch (error) {
    console.error("createSOPModule - Full error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      validationErrors: error.errors,
      sqlError: error.original,
    });
    try {
      await t.rollback();
    } catch (rbErr) {
      console.error("rollback error:", rbErr);
    }
    logger.error({
      message: error.message,
      details: {
        stack: error.stack,
        errorName: error.name,
        validationErrors: error.errors?.map((e) => ({
          field: e.path,
          message: e.message,
          value: e.value,
        })),
        sqlMessage: error.original?.message,
      },
      UserID: currentUserId,
    });

    const status =
      error.statusCode ||
      (error.name && /Sequelize/.test(error.name) ? 400 : 500);

    const errorMessage = error.errors
      ? error.errors.map((e) => `${e.path}: ${e.message}`).join(", ")
      : error.message || "Something went wrong!";

    return res.status(status).json({
      message: errorMessage,
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
        validationErrors: error.errors,
      }),
    });
  }
};
async function convertWithOnlyOffice(inputUrl, outputPath) {
  try {
    const body = {
      async: false,
      filetype: "docx",
      outputtype: "pdf",
      key: `${Date.now()}`,
      title: path.basename(inputUrl),
      url: inputUrl,
    };

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
exports.createDocumentModule = async (req, res) => {
  const t = await sequelize.transaction();
  const { currentUserId } = req.payload;
  let {
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
    FileUrl,
    TemplateFontFamaly,
    TemplateFontSize,
    CoOwnerUserID,
    TemplateID,
  } = req.body;
  SelfApproved =
    typeof SelfApproved === "boolean" ? SelfApproved : SelfApproved === "true";

  // Ensure arrays are properly initialized
  RiskDetailsArrays = Array.isArray(RiskDetailsArrays) ? RiskDetailsArrays : [];
  ComplianceDetailsArrays = Array.isArray(ComplianceDetailsArrays)
    ? ComplianceDetailsArrays
    : [];
  ClauseDetailsArrays = Array.isArray(ClauseDetailsArrays)
    ? ClauseDetailsArrays
    : [];
  CoOwnerUserID = Array.isArray(CoOwnerUserID) ? CoOwnerUserID : [];
  DocumentOwner = Array.isArray(DocumentOwner) ? DocumentOwner : [];

  // Validate required arrays
  if (!DocumentOwner || DocumentOwner.length === 0) {
    return res
      .status(400)
      .send({ message: "DocumentOwner is required and cannot be empty" });
  }

  // Convert and validate ReadingTimeUnit to proper enum case
  if (ReadingTimeUnit && ReadingTimeUnit !== "") {
    ReadingTimeUnit =
      ReadingTimeUnit.charAt(0).toUpperCase() +
      ReadingTimeUnit.slice(1).toLowerCase();
    if (!["Minutes", "Hours", "Days"].includes(ReadingTimeUnit)) {
      ReadingTimeUnit = null; // Set to null instead of default when invalid
    }
  } else {
    ReadingTimeUnit = null;
  }

  // Convert ReadingTimeValue to integer if it's a string, handle empty strings
  if (ReadingTimeValue && typeof ReadingTimeValue === "string") {
    ReadingTimeValue = parseInt(ReadingTimeValue, 10);
    // If parsing resulted in NaN, set to null
    if (isNaN(ReadingTimeValue)) {
      ReadingTimeValue = null;
    }
  } else if (ReadingTimeValue === "" || ReadingTimeValue === undefined) {
    ReadingTimeValue = null;
  }

  const basePath = path.posix.join(
    "src",
    "infrastructure",
    "media",
    "Document"
  );
  const tempPath = path.posix.join(
    "src",
    "infrastructure",
    "media",
    "Template",
    "TemplateDocument"
  );
  const blankPath = path.posix.join(
    "src",
    "infrastructure",
    "media",
    "Template",
    "Blank"
  );
  let docDraftData,
    docData = null,
    DraftVersion = null,
    MasterVersion = null,
    previousDraft = null;
  try {
    //Validation
    if (StakeHolder && StakeHolder.length > 0 && SelfApproved === false) {
      if (!Checker || Checker.length === 0) {
        throw new Error("Checker is required when StakeHolder is present");
      }
      if (!Approver || Approver.length === 0) {
        throw new Error(
          "Approver is required when StakeHolder and Checker is present"
        );
      }
    } else if (Checker && Checker.length > 0 && SelfApproved === false) {
      if (!Approver || Approver.length === 0) {
        throw new Error("Approver is required when Checker is present");
      }
    }

    const commonPayload = {
      ElementAttributeTypeID,
      ModuleTypeID,
      ContentID,
      DocumentName,
      DocumentDescription,
      DocumentIsActive,
      DocumentTags,
      SelfApproved,
      ReadingTimeValue,
      ReadingTimeUnit,
      DocumentExpiry,
      // Only include escalation fields when SelfApproved is false
      ...(SelfApproved === false && {
        EscalationType: EscalationType || null,
        EscalationAfter: EscalationAfter || null,
        StakeHolderEscalationType: StakeHolderEscalationType || null,
        StakeHolderEscalationAfter: StakeHolderEscalationAfter || null,
      }),
      NeedAcceptance,
      NeedAcceptanceFromStakeHolder,
      NeedAcceptanceForApprover,
      TemplateFontFamaly,
      TemplateFontSize,
      CoOwnerUserID,
      TemplateID,
    };
    if (DocumentID) {
      let letestDocumentModuleDraft = await DocumentModuleDraft.findOne({
        where: { ModuleTypeID, DocumentID, ContentID },
        order: [["CreatedDate", "DESC"]],
      });

      if (letestDocumentModuleDraft) {
        if (!FileUrl) {
          FileUrl = letestDocumentModuleDraft.DocumentPath;
        }
        letestDocumentModuleDraft = JSON.parse(
          JSON.stringify(letestDocumentModuleDraft)
        );
        previousDraft = letestDocumentModuleDraft;
        DraftVersion = letestDocumentModuleDraft.DraftVersion;
        MasterVersion = letestDocumentModuleDraft.MasterVersion || null;
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
                letestDocumentModuleDraft.DocumentModuleDraftID,
            },
          },
          { transaction: t }
        );
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
                letestDocumentModuleDraft.DocumentModuleDraftID,
            },
          },
          { transaction: t }
        );
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
                letestDocumentModuleDraft.DocumentModuleDraftID,
            },
          },
          { transaction: t }
        );
        await ModuleEscalation.update(
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
                letestDocumentModuleDraft.DocumentModuleDraftID,
            },
          },
          { transaction: t }
        );
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
                letestDocumentModuleDraft.DocumentModuleDraftID,
            },
          },
          { transaction: t }
        );
      }
    }
    const createRiskCompliance = async (docDraft) => {
      try {
        console.log(
          "Creating risk compliance for draft:",
          docDraft.DocumentModuleDraftID
        );
        return await RiskAndCompliences.create(
          {
            DocumentID,
            DocumentModuleDraftID: docDraft.DocumentModuleDraftID,
            DraftVersion: docDraft.DraftVersion,
            MasterVersion: docDraft.MasterVersion,
            NoOfRisk: RiskDetailsArrays.length || 0,
            NoOfCompliance: ComplianceDetailsArrays.length || 0,
            NoOfClause: ClauseDetailsArrays.length || 0,
            RiskDetailsArrays: RiskDetailsArrays || [],
            ComplianceDetailsArrays: ComplianceDetailsArrays || [],
            ClauseDetailsArrays: ClauseDetailsArrays || [],
            RiskPropertiesDetails,
            CompliancePropertiesDetails,
            ClausePropertiesDetails,
            CreatedBy: currentUserId,
          },
          { transaction: t }
        );
      } catch (error) {
        console.error("Error creating risk compliance:", error);
        throw error;
      }
    };
    const createDocumentFile = async (docDraft, doc) => {
      try {
        console.log("createDocumentFile - Input FileUrl:", FileUrl);
        console.log(
          "createDocumentFile - docDraft ID:",
          docDraft.DocumentModuleDraftID
        );
        console.log("createDocumentFile - previousDraft:", previousDraft);

        // If we're editing and FileUrl references a draft file, we need to find the source
        if (DocumentID && FileUrl.includes("file/d/")) {
          // This is an edit operation with a draft file reference
          console.log(
            "createDocumentFile - This is an edit operation with draft file reference"
          );

          // Try to find the actual source file from the previous draft
          if (previousDraft) {
            if (
              previousDraft.DocumentPath &&
              fs.existsSync(previousDraft.DocumentPath)
            ) {
              FileUrl = previousDraft.DocumentPath;
              console.log(
                "createDocumentFile - Using previous draft DocumentPath:",
                FileUrl
              );
            } else if (
              previousDraft.EditedDocumentPath &&
              fs.existsSync(previousDraft.EditedDocumentPath)
            ) {
              FileUrl = previousDraft.EditedDocumentPath;
              console.log(
                "createDocumentFile - Using previous draft EditedDocumentPath:",
                FileUrl
              );
            } else {
              // If no previous draft files exist, try to use the current file reference as-is
              console.log(
                "createDocumentFile - No previous draft files found, using current reference"
              );
            }
          }
        }

        if (
          previousDraft &&
          FileUrl.includes(previousDraft.DocumentModuleDraftID) &&
          previousDraft.EditedDocumentPath &&
          previousDraft.EditedDocumentPath.includes(".doc") &&
          FileUrl.includes(".pdf")
        ) {
          FileUrl = previousDraft.EditedDocumentPath;
          console.log(
            "createDocumentFile - Using previous draft edited path:",
            FileUrl
          );
        }

        const incomingFile = path.posix.join(FileUrl);
        const incomingFileExtension = helper.getFileExtension(incomingFile);
        console.log(
          "createDocumentFile - File extension:",
          incomingFileExtension
        );

        let incomingFileFullPath;

        // Check if FileUrl is already a full path
        if (FileUrl.startsWith("src/") || path.isAbsolute(FileUrl)) {
          incomingFileFullPath = FileUrl;
        } else if (FileUrl.includes("file/td/")) {
          incomingFileFullPath = path.posix.join(
            tempPath,
            path.basename(incomingFile)
          );
        } else if (FileUrl.includes("file/tb/")) {
          incomingFileFullPath = path.posix.join(
            blankPath,
            path.basename(incomingFile)
          );
        } else if (FileUrl.includes("file/d/")) {
          // Handle existing document files - try multiple locations
          incomingFileFullPath = path.posix.join(
            basePath,
            path.basename(incomingFile)
          );
        } else {
          incomingFileFullPath = path.posix.join(
            basePath,
            path.basename(incomingFile)
          );
        }

        console.log(
          "createDocumentFile - Looking for file at:",
          incomingFileFullPath
        );

        if (!fs.existsSync(incomingFileFullPath)) {
          console.error(
            "createDocumentFile - File not found at primary location:",
            incomingFileFullPath
          );

          // If editing and file not found, try to skip file operations
          if (DocumentID) {
            console.log(
              "createDocumentFile - This is an edit operation, skipping file copy since source not found"
            );

            // For edits, we just update the database records without copying files
            const newFilePathForDraft = path.posix.join(
              basePath,
              `${docDraft.DocumentModuleDraftID}${incomingFileExtension}`
            );

            const docDraftPath = {};
            if (newFilePathForDraft.includes(".doc") && SelfApproved === true) {
              const pdfPath = path.posix.join(
                basePath,
                `${docDraft.DocumentModuleDraftID}.pdf`
              );
              docDraftPath.EditedDocumentPath = newFilePathForDraft;
              docDraftPath.DocumentPath = pdfPath;
            } else {
              docDraftPath.DocumentPath = newFilePathForDraft;
            }

            console.log(
              "createDocumentFile - Updating draft record without file copy:",
              docDraftPath
            );
            await docDraft.update(
              {
                ...docDraftPath,
              },
              { transaction: t }
            );

            // Also update main document if needed
            if (SelfApproved === true) {
              const newPath = path.posix.join(
                basePath,
                `${docDraft.DocumentID}${incomingFileExtension}`
              );
              const docPath = {};
              if (newPath.includes(".doc") && SelfApproved === true) {
                const pdfPath = path.posix.join(
                  basePath,
                  `${docDraft.DocumentID}.pdf`
                );
                docPath.EditedDocumentPath = newPath;
                docPath.DocumentPath = pdfPath;
              } else {
                docPath.DocumentPath = newPath;
              }

              await DocumentModule.update(
                {
                  ...docPath,
                },
                {
                  where: { DocumentID: docDraft.DocumentID },
                },
                { transaction: t }
              );
            }

            console.log(
              "createDocumentFile - Edit operation completed without file copy"
            );
            return "file transaction completed (edit mode - no file copy)";
          } else {
            throw new Error(
              `File does not exist at the specified path: ${incomingFileFullPath}`
            );
          }
        }

        // Ensure the basePath directory exists
        console.log(
          "createDocumentFile - Ensuring base directory exists:",
          basePath
        );
        if (!fs.existsSync(basePath)) {
          fs.mkdirSync(basePath, { recursive: true });
        }

        //start create versioning of document
        console.log("createDocumentFile - Reading file content...");
        const incomingFileContent = fs.readFileSync(incomingFileFullPath);
        console.log(
          "createDocumentFile - File content size:",
          incomingFileContent.length
        );

        const newFilePathForDraft = path.posix.join(
          basePath,
          `${docDraft.DocumentModuleDraftID}${incomingFileExtension}`
        );
        console.log(
          "createDocumentFile - New draft file path:",
          newFilePathForDraft
        );

        const docDraftPath = {};
        if (newFilePathForDraft.includes(".doc") && SelfApproved === true) {
          const pdfPath = path.posix.join(
            basePath,
            `${docDraft.DocumentModuleDraftID}.pdf`
          );
          docDraftPath.EditedDocumentPath = newFilePathForDraft;
          docDraftPath.DocumentPath = pdfPath;
        } else {
          docDraftPath.DocumentPath = newFilePathForDraft;
        }
        console.log("createDocumentFile - Draft path object:", docDraftPath);

        //end create versioning of document
        console.log("createDocumentFile - Updating draft record...");
        await docDraft.update(
          {
            ...docDraftPath,
          },
          { transaction: t }
        );

        console.log("createDocumentFile - Writing draft file...");
        fs.writeFileSync(newFilePathForDraft, incomingFileContent);
        // convert doc to pdf
        if (newFilePathForDraft.includes(".doc") && SelfApproved === true) {
          convertWithOnlyOffice(
            process.env.BACKEND_URL +
              "file/d/" +
              docDraft.DocumentModuleDraftID +
              incomingFileExtension,
            docDraftPath.DocumentPath
          );
        }
        const newPath = path.posix.join(
          basePath,
          `${docDraft.DocumentID}${incomingFileExtension}`
        );
        const docPath = {};
        if (newPath.includes(".doc") && SelfApproved === true) {
          const pdfPath = path.posix.join(
            basePath,
            `${docDraft.DocumentID}.pdf`
          );
          docPath.EditedDocumentPath = newPath;
          docPath.DocumentPath = pdfPath;
        } else {
          docPath.DocumentPath = newPath;
        }
        console.log("createDocumentFile - Main document path object:", docPath);

        if (doc) {
          console.log("createDocumentFile - Updating main document record...");
          await doc.update(
            {
              ...docPath,
            },
            { transaction: t }
          );
          console.log("createDocumentFile - Writing main document file...");
          fs.writeFileSync(newPath, incomingFileContent);
        } else if (SelfApproved === true) {
          console.log(
            "createDocumentFile - Updating DocumentModule for self-approved..."
          );
          await DocumentModule.update(
            {
              ...docPath,
            },
            {
              where: { DocumentID: docDraft.DocumentID },
            },
            { transaction: t }
          );
          console.log(
            "createDocumentFile - Writing self-approved document file..."
          );
          fs.writeFileSync(newPath, incomingFileContent);
          // convert doc to pdf
          if (newPath.includes(".doc") && SelfApproved === true) {
            console.log("createDocumentFile - Converting doc to pdf...");
            convertWithOnlyOffice(
              process.env.BACKEND_URL +
                "file/d/" +
                docDraft.DocumentID +
                incomingFileExtension,
              docPath.DocumentPath
            );
          }
        }
        // fs.unlinkSync(incomingFileFullPath); // remove the original file after processing
        console.log(
          "createDocumentFile - File operations completed successfully"
        );
        return "file transaction completed";
      } catch (error) {
        console.error("createDocumentFile - Error details:", {
          message: error.message,
          stack: error.stack,
          FileUrl,
          incomingFileFullPath: error.path || "unknown",
        });
        throw new Error(`Failed to create document file: ${error.message}`);
      }
    };
    if (SelfApproved === true) {
      const createNotification = async (ModuleID) => {
        const modulelinks = await UserModuleLink.findAll({
          where: {
            ModuleID,
            StartDate: {
              [Op.lte]: literal("CURRENT_TIMESTAMP"),
            },
            DueDate: {
              [Op.gte]: literal("CURRENT_TIMESTAMP"),
            },
          },
          attributes: ["UserID"],
        });
        const notififactionBulk = [];
        if (modulelinks) {
          const data = await Notification.findAll({
            where: {
              UserID: modulelinks.map((el) => el.UserID),
              NotificationTypeForPublish: {
                [Op.or]: ["push", "both"],
              },
            },
          });
          if (data && data.length > 0) {
            for (const el of data) {
              notififactionBulk.push({
                UserID: el.UserID,
                Message: "Updated assign Element version is published",
                NotificationType: "assignment",
                LinkedType: "Document",
                LinkedID: ModuleID,
                CreatedBy: currentUserId,
              });
            }
          }
        }
        if (notififactionBulk.length > 0) {
          await UserNotification.bulkCreate(notififactionBulk, {
            ignoreDuplicates: true,
            transaction: t,
          });
          sendNotification(notififactionBulk);
        }
        return notififactionBulk;
      };
      if (DraftVersion) {
        DraftVersion =
          MasterVersion && parseFloat(DraftVersion) < parseFloat(MasterVersion)
            ? (parseFloat(MasterVersion) + 0.1).toFixed(1)
            : (parseFloat(DraftVersion) + 0.1).toFixed(1);
        MasterVersion = Math.ceil(parseFloat(DraftVersion)).toFixed(1);
      } else {
        DraftVersion = "0.1";
        MasterVersion = "1.0";
      }
      const publishCommonPayload = {
        ...commonPayload,
        DocumentStatus: "Published",
        DraftVersion,
        MasterVersion,
      };
      if (DocumentID) {
        await DocumentModule.update(
          {
            ...publishCommonPayload,
            ModifiedBy: currentUserId,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: { DocumentID },
          },
          { transaction: t }
        );
        await createNotification(DocumentID);
      } else {
        const newDocument = await DocumentModule.create(
          {
            ...publishCommonPayload,
            CreatedBy: currentUserId,
          },
          { transaction: t }
        );
        DocumentID = newDocument.DocumentID;
      }
      const docDraft = await DocumentModuleDraft.create(
        {
          ...publishCommonPayload,
          DocumentID,
          CreatedBy: currentUserId,
        },
        { transaction: t }
      );
      docDraftData = docDraft;
      await ModuleOwner.bulkCreate(
        DocumentOwner.map((userId) => ({
          ModuleTypeID,
          DocumentID: docDraft.DocumentID,
          ContentID: docDraft.ContentID,
          DocumentModuleDraftID: docDraft.DocumentModuleDraftID,
          UserID: userId,
          CreatedBy: currentUserId,
        })),
        { transaction: t }
      );
      await createRiskCompliance(docDraft);
    } else if (SelfApproved === false) {
      if (DraftVersion) {
        DraftVersion =
          MasterVersion && parseFloat(DraftVersion) < parseFloat(MasterVersion)
            ? (parseFloat(MasterVersion) + 0.1).toFixed(1)
            : (parseFloat(DraftVersion) + 0.1).toFixed(1);
      } else {
        DraftVersion = "0.1";
      }
      const draftCommonPayload = {
        ...commonPayload,
        DocumentStatus: "InProgress",
        DraftVersion,
        MasterVersion,
        CreatedBy: currentUserId,
      };
      const extension = helper.getFileExtension(FileUrl);
      let attributeUsersList = [];
      if (!DocumentID) {
        const newDocument = await DocumentModule.create(
          {
            ...draftCommonPayload,
          },
          { transaction: t }
        );
        DocumentID = newDocument.DocumentID;
        docData = newDocument;
      }
      if (ElementAttributeTypeID) {
        const attributeUsers = await ElementAttributeType.findOne({
          where: { ElementAttributeTypeID },
          attributes: [],
          include: [
            {
              model: ElementAttributeUsers,
              as: "EscalationUsers",
              attributes: ["UserID"],
            },
            {
              model: ElementAttributeUsers,
              as: "StakeHolderEscalationUsers",
              attributes: ["UserID"],
            },
          ],
        });
        if (attributeUsers) {
          attributeUsersList = JSON.parse(JSON.stringify(attributeUsers));
        }
      }
      const docDraft = await DocumentModuleDraft.create(
        {
          DocumentID,
          ...draftCommonPayload,
        },
        { transaction: t, returning: true }
      );
      docDraftData = docDraft;
      await ModuleOwner.bulkCreate(
        DocumentOwner.map((userId) => ({
          ModuleTypeID,
          DocumentID: docDraft.DocumentID,
          ContentID: docDraft.ContentID,
          DocumentModuleDraftID: docDraft.DocumentModuleDraftID,
          UserID: userId,
          CreatedBy: currentUserId,
        })),
        { transaction: t }
      );
      await createRiskCompliance(docDraft);
      const createStakeHolder = async () => {
          if (
            StakeHolder &&
            StakeHolder.length > 0 &&
            extension.includes("doc")
          ) {
            return await ModuleStakeHolder.bulkCreate(
              StakeHolder.map((userId) => ({
                ModuleTypeID,
                DocumentID,
                ContentID,
                DocumentModuleDraftID: docDraft.DocumentModuleDraftID,
                UserID: userId,
                WasEscalationPersonNotified:
                  attributeUsersList.StakeHolderEscalationUsers?.length > 0
                    ? attributeUsersList.StakeHolderEscalationUsers.some(
                        (e) => e.UserID == userId
                      )
                    : false,
                CreatedBy: currentUserId,
              })),
              { transaction: t }
            );
          }
          return [];
        },
        createStakeHolderEscalation = async () => {
          if (
            StakeHolderEscalationPerson &&
            StakeHolderEscalationPerson.length > 0 &&
            extension.includes("doc")
          ) {
            return await ModuleEscalation.bulkCreate(
              StakeHolderEscalationPerson.map((userId) => ({
                ModuleTypeID,
                DocumentID,
                ContentID,
                DocumentModuleDraftID: docDraft.DocumentModuleDraftID,
                UserID: userId,
                CreatedBy: currentUserId,
                IsReviewer: false,
                IsStakeHolder: true,
              })),
              { transaction: t }
            );
          }
          return [];
        },
        createChecker = async () => {
          if (Checker && Checker.length > 0) {
            return await ModuleChecker.bulkCreate(
              Checker.map((userId) => ({
                ModuleTypeID,
                DocumentID,
                ContentID,
                DocumentModuleDraftID: docDraft.DocumentModuleDraftID,
                UserID: userId,
                WasEscalationPersonNotified:
                  attributeUsersList.EscalationUsers?.length > 0
                    ? attributeUsersList.EscalationUsers.some(
                        (e) => e.UserID == userId
                      )
                    : false,
                CreatedBy: currentUserId,
              })),
              { transaction: t }
            );
          }
          return [];
        },
        createEscalationPerson = async () => {
          if (EscalationPerson && EscalationPerson.length > 0) {
            return await ModuleEscalation.bulkCreate(
              EscalationPerson.map((userId) => ({
                ModuleTypeID,
                DocumentID,
                ContentID,
                DocumentModuleDraftID: docDraft.DocumentModuleDraftID,
                UserID: userId,
                CreatedBy: currentUserId,
              })),
              { transaction: t }
            );
          }
          return [];
        },
        createApprover = async () => {
          if (Approver && Approver.length > 0) {
            return await ModuleApprover.bulkCreate(
              Approver.map((userId) => ({
                ModuleTypeID,
                DocumentID,
                ContentID,
                DocumentModuleDraftID: docDraft.DocumentModuleDraftID,
                UserID: userId,
                CreatedBy: currentUserId,
              })),
              { transaction: t }
            );
          }
          return [];
        },
        notififactionBulk = [],
        createNotification = async (users, type) => {
          if (users && users.length > 0) {
            // First check if users have notification preferences set
            const data = await Notification.findAll({
              where: {
                UserID: users,
                NotificationTypeForAction: {
                  [Op.or]: ["push", "both"],
                },
              },
            });

            // If users have preferences set, use those
            if (data && data.length > 0) {
              for (const el of data) {
                notififactionBulk.push({
                  UserID: el.UserID,
                  Message: "Element assign as a " + type,
                  NotificationType: "actionable",
                  LinkedType: "Document",
                  LinkedID: docDraft.DocumentModuleDraftID,
                  CreatedBy: currentUserId,
                });
              }
            } else {
              // If no users have push/both enabled, send to all users anyway
              // (actionable items should always notify)
              for (const userId of users) {
                notififactionBulk.push({
                  UserID: userId,
                  Message: "Element assign as a " + type,
                  NotificationType: "actionable",
                  LinkedType: "Document",
                  LinkedID: docDraft.DocumentModuleDraftID,
                  CreatedBy: currentUserId,
                });
              }
            }
          }
        };

      const checkForSteakHoldeAssignStatus =
        previousDraft &&
        FileUrl.includes(previousDraft.DocumentModuleDraftID) &&
        previousDraft.EditedDocumentPath &&
        previousDraft.EditedDocumentPath.includes(".doc") &&
        FileUrl.includes(".pdf");

      if (
        StakeHolder &&
        StakeHolder.length > 0 &&
        (checkForSteakHoldeAssignStatus || extension.includes("doc"))
      ) {
        await createStakeHolder();
        await createStakeHolderEscalation();
        await createChecker();
        await createEscalationPerson();
        await createApprover();
        // notification to stake holders
        await createNotification(StakeHolder, "StakeHolder");
      } else if (Checker && Checker.length > 0) {
        await createChecker();
        // notification to checkers
        await createEscalationPerson();
        await createApprover();
        await createNotification(Checker, "Checker");
      } else if (Approver && Approver.length > 0) {
        await createApprover();
        // notification to approvers
        await createNotification(Approver, "Approver");
      }

      // Send all accumulated notifications at once
      if (notififactionBulk.length > 0) {
        await UserNotification.bulkCreate(notififactionBulk, {
          ignoreDuplicates: true,
          transaction: t,
        });
        sendNotification(notififactionBulk);
      }
    }
    console.log("Updating user details...");
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
        transaction: t,
      }
    );

    console.log("Creating document file...");
    await createDocumentFile(docDraftData, docData);
    await t.commit();
    return res.status(201).send({
      message: "Document Module created successfully",
      DocumentID,
      DocumentName,
    });
  } catch (error) {
    console.error("Document creation/edit error:", error);

    // Log specific error details for debugging
    logger.error({
      message: error.message,
      details: {
        stack: error.stack,
        errorName: error.name,
        sqlMessage: error.original?.message,
        validationErrors: error.errors?.map((e) => ({
          field: e.path,
          message: e.message,
          value: e.value,
        })),
      },
      UserID: currentUserId,
      requestBody: {
        DocumentID,
        DocumentName,
        SelfApproved,
        ReadingTimeValue,
        ReadingTimeUnit,
      },
    });

    try {
      await t.rollback();
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError);
    }

    // Return more specific error message if available
    const errorMessage =
      error.errors?.[0]?.message || error.message || "Something went wrong!";
    return res.status(500).send({
      message: errorMessage,
      ...(process.env.NODE_ENV === "development" && {
        details: error.message,
        type: error.name,
      }),
    });
  }
};
const sendInAppAndEmailNotification = async (user, CreatedBy) => {
  try {
    if (user && user.UserType == "STAKEHOLDER") {
      const data = await sequelize.query(
        `
                    WITH "StakeHolderStatus" AS (
                        SELECT COALESCE(mc."SOPDraftID",mc."DocumentModuleDraftID") AS "ModuleDraftID",
                        COUNT(*) AS total_count,COUNT(*) FILTER (WHERE mc."ApprovalStatus" = 'Rejected') AS reject_count,
                        COUNT(*) FILTER (WHERE mc."ApprovalStatus" IS NOT NULL) AS action_count
                        FROM "ModuleStakeHolders" mc
                        GROUP BY mc."SOPDraftID",mc."DocumentModuleDraftID"
                    ),
                    "CheckerUsersWithThereStatus" AS (
                        SELECT ss."ModuleDraftID",mc."UserID" FROM "ModuleCheckers" mc 
                        INNER JOIN "StakeHolderStatus" ss ON ss."ModuleDraftID" = COALESCE(mc."SOPDraftID",mc."DocumentModuleDraftID")
                        WHERE CASE WHEN ss.total_count = ss.action_count AND 'all' = :AceptanceStatus THEN TRUE
                        WHEN ss.action_count > 0 AND 'single' = :AceptanceStatus THEN TRUE ELSE FALSE END
                        AND ss.reject_count = 0 
                    ),
                    "LinkedUserAndCheckNotification" AS (
                        SELECT cu.*, trim(concat_ws(' ', ud."UserFirstName", ud."UserMiddleName", ud."UserLastName")) AS "UserFullName", 
                        ud."UserEmail",n."NotificationTypeForAction"
                        FROM "CheckerUsersWithThereStatus" cu
                        INNER JOIN "UserDetails" ud ON ud."UserID" = cu."UserID"
                        INNER JOIN "Notifications" n ON n."UserID" = cu."UserID"
                    )
                    SELECT * FROM "LinkedUserAndCheckNotification" lu
                    WHERE lu."ModuleDraftID" = :ModuleDraftID;`,
        {
          type: QueryTypes.SELECT,
          replacements: {
            ModuleDraftID: user.ModuleDraftID,
            AceptanceStatus: user.NeedAcceptanceFromStakeHolder
              ? "all"
              : "single",
          },
        }
      );

      // Check if any users have push/both notification preferences
      const usersWithPushPreference = data.filter(
        (el) =>
          el.NotificationTypeForAction === "push" ||
          el.NotificationTypeForAction === "both"
      );

      // If users have preferences set, use those; otherwise notify all eligible users
      const usersToNotify =
        usersWithPushPreference.length > 0 ? usersWithPushPreference : data;

      if (usersToNotify && usersToNotify.length > 0) {
        const notificationData = [];
        await DocumentModuleDraft.update(
          { AllowFileChanges: true },
          {
            where: { DocumentModuleDraftID: user.ModuleDraftID },
          }
        );
        for (const el of usersToNotify) {
          // Create notification for actionable items
          notificationData.push({
            UserID: el.UserID,
            Message: `Element assigned as a Checker`,
            NotificationType: "actionable",
            LinkedType: user.ModuleTypeName,
            LinkedID: user.ModuleDraftID,
            CreatedBy: CreatedBy,
          });

          // Send email only if user has email notification enabled
          if (
            el.NotificationTypeForAction === "email" ||
            el.NotificationTypeForAction === "both"
          ) {
            const LatestEmailTemplate =
              await adminController?.getLatestEmailTemplate();
            console.log(LatestEmailTemplate, "LatestEmailTemplate");
            // this mail send to reviewer
            const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header with Logo -->
            ${
              LatestEmailTemplate?.logo
                ? `
            <div style="text-align: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #eeeeee;">
                <img src="${LatestEmailTemplate?.logo}" alt="Company Logo" style="max-height: 60px;">
            </div>
            `
                : ""
            }
            
            <!-- Main Content -->
            <div style="color: #333333; line-height: 1.6;">
                <!-- Personalized Greeting -->
                <div style="font-size: 16px; margin-bottom: 20px;">
                    ${LatestEmailTemplate?.GreetingName.replace(
                      "manokaran,",
                      `<strong>${el?.UserFullName},</strong>`
                    )}
                </div>
                
                <!-- Main Message -->
                <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #007cba; margin: 20px 0;">
                    ${LatestEmailTemplate?.Body}
                </div>
                
                <!-- Assignment Details -->
                <div style="background: #fff8e1; border: 1px solid #ffd54f; border-radius: 6px; padding: 18px; margin: 25px 0;">
                    <h3 style="color: #e65100; margin-bottom: 12px; font-size: 16px;">📋 Assignment Details</h3>
                    <p style="margin: 8px 0;">
                        <strong>User Type:</strong> ${user?.UserType}
                    </p>
                     <p style="margin: 8px 0;">
                        <strong>User Full Name:</strong> ${el?.UserFullName}
                    </p>
                    <p style="margin: 8px 0;">
                        <strong>Module Type:</strong> ${user?.ModuleTypeName}
                    </p>
                    <p style="margin: 8px 0;">
                        <strong>Module Name:</strong> ${user?.ModuleName}
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
                    ${LatestEmailTemplate?.signature}
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

            const emailData = {
              recipientEmail: el.UserEmail,
              subject:
                LatestEmailTemplate.Subject ||
                `Important: You've been assigned as ${el.UserType}`,
              body: {
                html: emailBody,
              },
            };

            mailService(emailData);
          }
        }
        await UserNotification.bulkCreate(notificationData, {
          ignoreDuplicates: true,
        });
        sendNotification(notificationData);
      }
    } else if (user && user.UserType == "STAKEHOLDER_ESCALATION") {
      // Handle stakeholder escalation notifications
      const data = await sequelize.query(
        `
                    WITH "LinkedUserAndCheckNotification" AS (
                        SELECT COALESCE(cu."SOPDraftID",cu."DocumentModuleDraftID") AS "ModuleDraftID", 
                        trim(concat_ws(' ', ud."UserFirstName", ud."UserMiddleName", ud."UserLastName")) AS "UserFullName", 
                        ud."UserEmail",n."NotificationTypeForAction"
                        FROM "ModuleCheckers" cu
                        INNER JOIN "UserDetails" ud ON ud."UserID" = cu."UserID"
                        INNER JOIN "Notifications" n ON n."UserID" = cu."UserID"
                    )
                    SELECT * FROM "LinkedUserAndCheckNotification" lu
                    WHERE lu."ModuleDraftID" = :ModuleDraftID;
            `,
        {
          type: QueryTypes.SELECT,
          replacements: { ModuleDraftID: user.ModuleDraftID },
        }
      );

      // Check if any users have push/both notification preferences
      const usersWithPushPreference = data.filter(
        (el) =>
          el.NotificationTypeForAction === "push" ||
          el.NotificationTypeForAction === "both"
      );

      // If users have preferences set, use those; otherwise notify all eligible users
      const usersToNotify =
        usersWithPushPreference.length > 0 ? usersWithPushPreference : data;

      if (usersToNotify && usersToNotify.length > 0) {
        await DocumentModuleDraft.update(
          { AllowFileChanges: true },
          {
            where: { DocumentModuleDraftID: user.ModuleDraftID },
          }
        );
        const notificationData = [];
        for (const el of usersToNotify) {
          // Create notification for actionable items
          notificationData.push({
            UserID: el.UserID,
            Message: `Element assigned as a Checker`,
            NotificationType: "actionable",
            LinkedType: user.ModuleTypeName,
            LinkedID: user.ModuleDraftID,
            CreatedBy: CreatedBy,
          });

          // Send email only if user has email notification enabled
          if (
            el.NotificationTypeForAction === "email" ||
            el.NotificationTypeForAction === "both"
          ) {
            const LatestEmailTemplate =
              await adminController.getLatestEmailTemplate();
            console.log(LatestEmailTemplate, "LatestEmailTemplate");

            const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header with Logo -->
            ${
              LatestEmailTemplate.logo
                ? `
            <div style="text-align: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #eeeeee;">
                <img src="${LatestEmailTemplate.logo}" alt="Company Logo" style="max-height: 60px;">
            </div>
            `
                : ""
            }
            
            <!-- Main Content -->
            <div style="color: #333333; line-height: 1.6;">
                <!-- Personalized Greeting -->
                <div style="font-size: 16px; margin-bottom: 20px;">
                    ${LatestEmailTemplate.GreetingName.replace(
                      "manokaran,",
                      `<strong>${el.UserFullName},</strong>`
                    )}
                </div>
                
                <!-- Main Message -->
                <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #007cba; margin: 20px 0;">
                    ${LatestEmailTemplate.Body}
                </div>
                
                <!-- Assignment Details -->
                <div style="background: #fff8e1; border: 1px solid #ffd54f; border-radius: 6px; padding: 18px; margin: 25px 0;">
                    <h3 style="color: #e65100; margin-bottom: 12px; font-size: 16px;">📋 Assignment Details</h3>
                    <p style="margin: 8px 0;"></p>
                        <strong>User Type:</strong> ${el.UserType}
                    </p>
                     <p style="margin: 8px 0;">
                        <strong>User Full Name:</strong> ${el.UserFullName}
                    </p>
                    <p style="margin: 8px 0;">
                        <strong>Module Type:</strong> ${user.ModuleTypeName}
                    </p>
                    <p style="margin: 8px 0;">
                        <strong>Module Name:</strong> ${user.ModuleName}
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
                    ${LatestEmailTemplate.signature}
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

            const emailData = {
              recipientEmail: el.UserEmail,
              subject:
                LatestEmailTemplate.Subject ||
                `Important: You've been assigned as ${el.UserType}`,
              body: {
                html: emailBody,
              },
            };

            mailService(emailData);
          }
        }
        await UserNotification.bulkCreate(notificationData, {
          ignoreDuplicates: true,
        });
        sendNotification(notificationData);
      }
    } else if (user && user.UserType == "REVIEWER") {
      const data = await sequelize.query(
        `
                    WITH "ReviewerStatus" AS (
                        SELECT COALESCE(mc."SOPDraftID",mc."DocumentModuleDraftID") AS "ModuleDraftID",
                        COUNT(*) AS total_count,COUNT(*) FILTER (WHERE mc."ApprovalStatus" = 'Rejected') AS reject_count,
                        COUNT(*) FILTER (WHERE mc."ApprovalStatus" IS NOT NULL) AS action_count
                        FROM "ModuleCheckers" mc
                        GROUP BY mc."SOPDraftID",mc."DocumentModuleDraftID"
                    ),
                    "CheckerUsersWithThereStatus" AS (
                        SELECT ss."ModuleDraftID",mc."UserID" FROM "ModuleApprovers" mc
                        INNER JOIN "ReviewerStatus" ss ON ss."ModuleDraftID" = COALESCE(mc."SOPDraftID",mc."DocumentModuleDraftID")
                        WHERE CASE WHEN ss.total_count = ss.action_count AND 'all' = :AceptanceStatus THEN TRUE
                        WHEN ss.action_count > 0 AND 'single' = :AceptanceStatus THEN TRUE ELSE FALSE END
                        AND ss.reject_count = 0 
                    ),
                    "LinkedUserAndCheckNotification" AS (
                        SELECT cu.*, trim(concat_ws(' ', ud."UserFirstName", ud."UserMiddleName", ud."UserLastName")) AS "UserFullName", 
                        ud."UserEmail",n."NotificationTypeForAction"
                        FROM "CheckerUsersWithThereStatus" cu
                        INNER JOIN "UserDetails" ud ON ud."UserID" = cu."UserID"
                        INNER JOIN "Notifications" n ON n."UserID" = cu."UserID"
                    )
                    SELECT * FROM "LinkedUserAndCheckNotification" lu
                    WHERE lu."ModuleDraftID" = :ModuleDraftID;`,
        {
          type: QueryTypes.SELECT,
          replacements: {
            ModuleDraftID: user.ModuleDraftID,
            AceptanceStatus: user.NeedAcceptance ? "all" : "single",
          },
        }
      );

      // Check if any users have push/both notification preferences
      const usersWithPushPreference = data.filter(
        (el) =>
          el.NotificationTypeForAction === "push" ||
          el.NotificationTypeForAction === "both"
      );

      // If users have preferences set, use those; otherwise notify all eligible users
      const usersToNotify =
        usersWithPushPreference.length > 0 ? usersWithPushPreference : data;

      if (usersToNotify && usersToNotify.length > 0) {
        const notificationData = [];
        for (const el of usersToNotify) {
          // Create notification for actionable items
          notificationData.push({
            UserID: el.UserID,
            Message: `Element assigned as a Approver`,
            NotificationType: "actionable",
            LinkedType: user.ModuleTypeName,
            LinkedID: user.ModuleDraftID,
            CreatedBy: CreatedBy,
          });

          // Send email only if user has email notification enabled
          if (
            el.NotificationTypeForAction === "email" ||
            el.NotificationTypeForAction === "both"
          ) {
            const LatestEmailTemplate =
              await adminController?.getLatestEmailTemplate();
            console.log(LatestEmailTemplate, "LatestEmailTemplate");

            // this mail sending to approver

            const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header with Logo -->
            ${
              LatestEmailTemplate?.logo
                ? `
            <div style="text-align: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #eeeeee;">
                <img src="${LatestEmailTemplate?.logo}" alt="Company Logo" style="max-height: 60px;">
            </div>
            `
                : ""
            }
            
            <!-- Main Content -->
            <div style="color: #333333; line-height: 1.6;">
                <!-- Personalized Greeting -->
                <div style="font-size: 16px; margin-bottom: 20px;">
                    ${LatestEmailTemplate?.GreetingName?.replace(
                      "manokaran,",
                      `<strong>${el.UserFullName},</strong>`
                    )}
                </div>
                
                <!-- Main Message -->
                <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #007cba; margin: 20px 0;">
                    ${LatestEmailTemplate?.Body}
                </div>
                
                <!-- Assignment Details -->
                <div style="background: #fff8e1; border: 1px solid #ffd54f; border-radius: 6px; padding: 18px; margin: 25px 0;">
                    <h3 style="color: #e65100; margin-bottom: 12px; font-size: 16px;">📋 Assignment Details</h3>
                    <p style="margin: 8px 0;">
                        <strong>User Type:</strong> ${user?.UserType}
                    </p>
                    <p style="margin: 8px 0;">
                        <strong>User Full Name:</strong> ${el?.UserFullName}
                    </p>
                    <p style="margin: 8px 0;">
                        <strong>Module Type:</strong> ${user?.ModuleTypeName}
                    </p>
                    <p style="margin: 8px 0;">
                        <strong>Module Name:</strong> ${user?.ModuleName}
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
                    ${LatestEmailTemplate.signature}
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

            const emailData = {
              recipientEmail: el.UserEmail,
              subject:
                LatestEmailTemplate.Subject ||
                `Important: You've been assigned as ${el.UserType}`,
              body: {
                html: emailBody,
              },
            };

            mailService(emailData);
          }
        }
        await UserNotification.bulkCreate(notificationData, {
          ignoreDuplicates: true,
        });
        sendNotification(notificationData);
      }
    } else if (user && user.UserType == "REVIEWER_ESCALATION") {
      // Handle reviewer escalation notifications
      const data = await sequelize.query(
        `
                    WITH "LinkedUserAndCheckNotification" AS (
                        SELECT COALESCE(cu."SOPDraftID",cu."DocumentModuleDraftID") AS "ModuleDraftID", 
                        trim(concat_ws(' ', ud."UserFirstName", ud."UserMiddleName", ud."UserLastName")) AS "UserFullName", 
                        ud."UserEmail",n."NotificationTypeForAction"
                        FROM "ModuleApprovers" cu
                        INNER JOIN "UserDetails" ud ON ud."UserID" = cu."UserID"
                        INNER JOIN "Notifications" n ON n."UserID" = cu."UserID"
                    )
                    SELECT * FROM "LinkedUserAndCheckNotification" lu
                    WHERE lu."ModuleDraftID" = :ModuleDraftID;
            `,
        {
          type: QueryTypes.SELECT,
          replacements: { ModuleDraftID: user.ModuleDraftID },
        }
      );

      // Check if any users have push/both notification preferences
      const usersWithPushPreference = data.filter(
        (el) =>
          el.NotificationTypeForAction === "push" ||
          el.NotificationTypeForAction === "both"
      );

      // If users have preferences set, use those; otherwise notify all eligible users
      const usersToNotify =
        usersWithPushPreference.length > 0 ? usersWithPushPreference : data;

      if (usersToNotify && usersToNotify.length > 0) {
        const notificationData = [];
        for (const el of usersToNotify) {
          // Create notification for actionable items
          notificationData.push({
            UserID: el.UserID,
            Message: `Element assigned as a Approver`,
            NotificationType: "actionable",
            LinkedType: user.ModuleTypeName,
            LinkedID: user.ModuleDraftID,
            CreatedBy: CreatedBy,
          });

          // Send email only if user has email notification enabled
          if (
            el.NotificationTypeForAction === "email" ||
            el.NotificationTypeForAction === "both"
          ) {
            const LatestEmailTemplate =
              await adminController?.getLatestEmailTemplate();
            console.log(LatestEmailTemplate, "LatestEmailTemplate");

            const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header with Logo -->
            ${
              LatestEmailTemplate?.logo
                ? `
            <div style="text-align: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #eeeeee;">
                <img src="${LatestEmailTemplate?.logo}" alt="Company Logo" style="max-height: 60px;">
            </div>
            `
                : ""
            }
            
            <!-- Main Content -->
            <div style="color: #333333; line-height: 1.6;">
                <!-- Personalized Greeting -->
                <div style="font-size: 16px; margin-bottom: 20px;">
                    ${LatestEmailTemplate?.GreetingName?.replace(
                      "manokaran,",
                      `<strong>${el?.UserFullName},</strong>`
                    )}
                </div>
                
                <!-- Main Message -->
                <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #007cba; margin: 20px 0;">
                    ${LatestEmailTemplate?.Body}
                </div>
                
                <!-- Assignment Details -->
                <div style="background: #fff8e1; border: 1px solid #ffd54f; border-radius: 6px; padding: 18px; margin: 25px 0;">
                    <h3 style="color: #e65100; margin-bottom: 12px; font-size: 16px;">📋 Assignment Details</h3>
                    <p style="margin: 8px 0;"></p>
                        <strong>User Type:</strong> ${user?.UserType}
                    </p>
                     <p style="margin: 8px 0;">
                        <strong>User Full Name:</strong> ${el?.UserFullName}
                    </p>
                   <p style="margin: 8px 0;">
                        <strong>Module Type:</strong> ${user?.ModuleTypeName}
                    </p>
                    <p style="margin: 8px 0;">
                        <strong>Module Name:</strong> ${user?.ModuleName}
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
                    ${LatestEmailTemplate?.signature}
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

            const emailData = {
              recipientEmail: el.UserEmail,
              subject:
                LatestEmailTemplate.Subject ||
                `Important: You've been assigned as ${el.UserType}`,
              body: {
                html: emailBody,
              },
            };

            mailService(emailData);
          }
        }
        await UserNotification.bulkCreate(notificationData, {
          ignoreDuplicates: true,
        });
        sendNotification(notificationData);
      }
    }
  } catch (error) {
    console.error("Error sending notifications:", error);
  }
};
exports.auditAndReviewApprovalCycle = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const {
      SOPID = null,
      DocumentID = null,
      Comment,
      ApprovalStatus,
      IsReviewSkipped,
    } = req.body;
    if (!["Rejected", "Approved"].includes(ApprovalStatus)) {
      throw new Error("ApprovalStatus should be Rejected or Approved");
    }
    const data = await sequelize.query(
      `
            WITH "ModuleDraft" AS (
                SELECT md."SOPDraftID" AS "ModuleDraftID",md."SOPID" AS "ModuleID", md."SOPName" AS "ModuleName", md."NeedAcceptance", FALSE AS "NeedAcceptanceFromStakeHolder", md."NeedAcceptanceForApprover",
                CASE
                        WHEN md."EscalationAfter" IS NOT NULL AND md."EscalationType" = 'Minutes' THEN md."CreatedDate" + INTERVAL '1 minute' * md."EscalationAfter"
                        WHEN md."EscalationAfter" IS NOT NULL AND md."EscalationType" = 'Hours' THEN md."CreatedDate" + INTERVAL '1 hour' * md."EscalationAfter"
                        WHEN md."EscalationAfter" IS NOT NULL AND md."EscalationType" = 'Days' THEN md."CreatedDate" + INTERVAL '1 day' * md."EscalationAfter"
                        WHEN md."EscalationAfter" IS NOT NULL AND md."EscalationType" = 'Weeks' THEN md."CreatedDate" + INTERVAL '1 week' * md."EscalationAfter"
                        WHEN md."EscalationAfter" IS NOT NULL AND md."EscalationType" = 'Months' THEN md."CreatedDate" + INTERVAL '1 month' * md."EscalationAfter"
                        WHEN md."EscalationAfter" IS NOT NULL AND md."EscalationType" = 'Years' THEN md."CreatedDate" + INTERVAL '1 year' * md."EscalationAfter"
                        ELSE NULL
                    END AS "EscalationDate", NULL AS "StakeHolderEscalationDate",md."CreatedBy", mm."ModuleName" as "ModuleTypeName",mm."ModuleTypeID",md."ContentID"
                FROM "SopModuleDrafts" md
                INNER JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = md."ModuleTypeID"
                UNION ALL
                SELECT dd."DocumentModuleDraftID" AS "ModuleDraftID",dd."DocumentID" AS "ModuleID", dd."DocumentName" AS "ModuleName", dd."NeedAcceptance", dd."NeedAcceptanceFromStakeHolder", dd."NeedAcceptanceForApprover",
                    CASE
                        WHEN dd."EscalationAfter" IS NOT NULL AND dd."EscalationType" = 'Minutes' THEN dd."EscalationSourceDate" + INTERVAL '1 minute' * dd."EscalationAfter"
                        WHEN dd."EscalationAfter" IS NOT NULL AND dd."EscalationType" = 'Hours' THEN dd."EscalationSourceDate" + INTERVAL '1 hour' * dd."EscalationAfter"
                        WHEN dd."EscalationAfter" IS NOT NULL AND dd."EscalationType" = 'Days' THEN dd."EscalationSourceDate" + INTERVAL '1 day' * dd."EscalationAfter"
                        WHEN dd."EscalationAfter" IS NOT NULL AND dd."EscalationType" = 'Weeks' THEN dd."EscalationSourceDate" + INTERVAL '1 week' * dd."EscalationAfter"
                        WHEN dd."EscalationAfter" IS NOT NULL AND dd."EscalationType" = 'Months' THEN dd."EscalationSourceDate" + INTERVAL '1 month' * dd."EscalationAfter"
                        WHEN dd."EscalationAfter" IS NOT NULL AND dd."EscalationType" = 'Years' THEN dd."EscalationSourceDate" + INTERVAL '1 year' * dd."EscalationAfter"
                        ELSE NULL
                    END AS "EscalationDate",
                    CASE
                        WHEN dd."StakeHolderEscalationAfter" IS NOT NULL AND dd."StakeHolderEscalationType" = 'Minutes' THEN dd."CreatedDate" + INTERVAL '1 minute' * dd."StakeHolderEscalationAfter"
                        WHEN dd."StakeHolderEscalationAfter" IS NOT NULL AND dd."StakeHolderEscalationType" = 'Hours' THEN dd."CreatedDate" + INTERVAL '1 hour' * dd."StakeHolderEscalationAfter"
                        WHEN dd."StakeHolderEscalationAfter" IS NOT NULL AND dd."StakeHolderEscalationType" = 'Days' THEN dd."CreatedDate" + INTERVAL '1 day' * dd."StakeHolderEscalationAfter"
                        WHEN dd."StakeHolderEscalationAfter" IS NOT NULL AND dd."StakeHolderEscalationType" = 'Weeks' THEN dd."CreatedDate" + INTERVAL '1 week' * dd."StakeHolderEscalationAfter"
                        WHEN dd."StakeHolderEscalationAfter" IS NOT NULL AND dd."StakeHolderEscalationType" = 'Months' THEN dd."CreatedDate" + INTERVAL '1 month' * dd."StakeHolderEscalationAfter"
                        WHEN dd."StakeHolderEscalationAfter" IS NOT NULL AND dd."StakeHolderEscalationType" = 'Years' THEN dd."CreatedDate" + INTERVAL '1 year' * dd."StakeHolderEscalationAfter"
                        ELSE NULL
                    END AS "StakeHolderEscalationDate",dd."CreatedBy",mm."ModuleName" as "ModuleTypeName",mm."ModuleTypeID",dd."ContentID"
                FROM "DocumentModuleDrafts" dd
                INNER JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = dd."ModuleTypeID"
            ),
            "SteakHolderReviewer" AS (
                SELECT COALESCE(msh."SOPID",msh."DocumentID") AS "ModuleID",
                COALESCE(msh."SOPDraftID",msh."DocumentModuleDraftID") AS "ModuleDraftID",
                msh."UserID",md."NeedAcceptance",md."NeedAcceptanceFromStakeHolder",md."NeedAcceptanceForApprover",msh."ApprovalStatus",
                md."EscalationDate", 'StekHolder' AS "UseType"
                FROM "ModuleStakeHolders" msh
                INNER JOIN "ModuleDraft" md ON md."ModuleDraftID" = COALESCE(msh."SOPDraftID",msh."DocumentModuleDraftID")
            ),
            "Reviewer" AS (
                SELECT COALESCE(mc."SOPID",mc."DocumentID") AS "ModuleID",
                COALESCE(mc."SOPDraftID",mc."DocumentModuleDraftID") AS "ModuleDraftID",
                mc."UserID",md."NeedAcceptance",md."NeedAcceptanceFromStakeHolder",md."NeedAcceptanceForApprover",mc."ApprovalStatus",
                md."EscalationDate", 'Checker' AS "UseType"
                FROM "ModuleCheckers" mc
                INNER JOIN "ModuleDraft" md ON md."ModuleDraftID" = COALESCE(mc."SOPDraftID",mc."DocumentModuleDraftID")
            ),
            "Escalation" AS (
                SELECT COALESCE(me."SOPID",me."DocumentID") AS "ModuleID",
                COALESCE(me."SOPDraftID",me."DocumentModuleDraftID") AS "ModuleDraftID",
                me."UserID",me."IsReviewer",me."IsStakeHolder",me."ApprovalStatus",md."EscalationDate",
                CASE WHEN me."IsStakeHolder" IS TRUE THEN 'StekHolderEscalation' ELSE 'ReviewerEscalation' END AS "UseType"
                FROM "ModuleEscalations" me
                INNER JOIN "ModuleDraft" md ON md."ModuleDraftID" = COALESCE(me."SOPDraftID",me."DocumentModuleDraftID")
            ),
            "Approver" AS (
                SELECT COALESCE(ma."SOPID",ma."DocumentID") AS "ModuleID",
                COALESCE(ma."SOPDraftID",ma."DocumentModuleDraftID") AS "ModuleDraftID",
                ma."UserID",md."NeedAcceptance",md."NeedAcceptanceFromStakeHolder",md."NeedAcceptanceForApprover",
                ma."ApprovalStatus", 'Approver' AS "UseType"
                FROM "ModuleApprovers" ma
                INNER JOIN "ModuleDraft" md ON md."ModuleDraftID" = COALESCE(ma."SOPDraftID",ma."DocumentModuleDraftID")
            ),
            "CountsAction" AS (
                SELECT md."ModuleDraftID",
                COUNT(DISTINCT shr."UserID") FILTER (WHERE shr."UseType" = 'StekHolder') AS "TotalStekHolderCount",
                COUNT(DISTINCT shr."UserID") FILTER (WHERE shr."UseType" = 'StekHolder' AND shr."ApprovalStatus" = 'Approved') AS "ApproveStekHolderCount",
                COUNT(DISTINCT shr."UserID") FILTER (WHERE shr."UseType" = 'StekHolder' AND shr."ApprovalStatus" = 'Rejected') AS "RejectedStekHolderCount",
                JSONB_AGG(DISTINCT shr."UserID") FILTER (WHERE shr."UseType" = 'StekHolder' AND shr."ApprovalStatus" IS NULL) "StekHolderUserList",
                COUNT(DISTINCT r."UserID") FILTER (WHERE r."UseType" = 'Checker') AS "TotalReviewerCount",
                COUNT(DISTINCT r."UserID") FILTER (WHERE r."UseType" = 'Checker' AND r."ApprovalStatus" = 'Approved') AS "ApproveReviewerCount",
                COUNT(DISTINCT r."UserID") FILTER (WHERE r."UseType" = 'Checker' AND r."ApprovalStatus" = 'Rejected') AS "RejectedReviewerCount",
                JSONB_AGG(DISTINCT r."UserID") FILTER (WHERE r."UseType" = 'Checker' AND r."ApprovalStatus" IS NULL) AS "ReviewerUserList",
                COUNT(DISTINCT e."UserID") FILTER (WHERE e."UseType" = 'StekHolderEscalation') AS "TotalStekHolderEscalationCount",
                COUNT(DISTINCT e."UserID") FILTER (WHERE e."UseType" = 'StekHolderEscalation' AND e."ApprovalStatus" = 'Approved') AS "ApproveStekHolderEscalationCount",
                COUNT(DISTINCT e."UserID") FILTER (WHERE e."UseType" = 'StekHolderEscalation' AND e."ApprovalStatus" = 'Rejected') AS "RejectedStekHolderEscalationCount",
                JSONB_AGG(DISTINCT e."UserID") FILTER (WHERE e."UseType" = 'StekHolderEscalation' AND e."ApprovalStatus" IS NULL) AS "StekHolderEscalationUserList",
                COUNT(DISTINCT e."UserID") FILTER (WHERE e."UseType" = 'ReviewerEscalation') AS "TotalReviewerEscalationCount",
                COUNT(DISTINCT e."UserID") FILTER (WHERE e."UseType" = 'ReviewerEscalation' AND e."ApprovalStatus" = 'Approved') AS "ApproveReviewerEscalationCount",
                COUNT(DISTINCT e."UserID") FILTER (WHERE e."UseType" = 'ReviewerEscalation' AND e."ApprovalStatus" = 'Rejected') AS "RejectedReviewerEscalationCount",
                JSONB_AGG(DISTINCT e."UserID") FILTER (WHERE e."UseType" = 'ReviewerEscalation' AND e."ApprovalStatus" IS NULL) AS "ReviewerEscalationUserList",
                COUNT(DISTINCT a."UserID") FILTER (WHERE a."UseType" = 'Approver') AS "TotalApproverCount",
                COUNT(DISTINCT a."UserID") FILTER (WHERE a."UseType" = 'Approver' AND a."ApprovalStatus" = 'Approved') AS "ApproveApproverCount",
                COUNT(DISTINCT a."UserID") FILTER (WHERE a."UseType" = 'Approver' AND a."ApprovalStatus" = 'Rejected') AS "RejectedApproverCount",
                JSONB_AGG(DISTINCT a."UserID") FILTER (WHERE a."UseType" = 'Approver' AND a."ApprovalStatus" IS NULL) AS "ApproverUserList",
                md."NeedAcceptance",md."NeedAcceptanceFromStakeHolder",md."NeedAcceptanceForApprover",md."EscalationDate",md."StakeHolderEscalationDate",
                md."ModuleName",md."CreatedBy"
                FROM "ModuleDraft" md
                LEFT JOIN "SteakHolderReviewer" shr ON shr."ModuleDraftID" = md."ModuleDraftID"
                LEFT JOIN "Reviewer" r ON r."ModuleDraftID" = md."ModuleDraftID"
                LEFT JOIN "Escalation" e ON e."ModuleDraftID" = md."ModuleDraftID"
                LEFT JOIN "Approver" a ON a."ModuleDraftID" = md."ModuleDraftID"
                GROUP BY md."ModuleDraftID", md."NeedAcceptance",md."NeedAcceptanceFromStakeHolder",md."NeedAcceptanceForApprover",md."EscalationDate",md."StakeHolderEscalationDate",
                md."ModuleName",md."CreatedBy"
            ),
            "GeneRateActionableUserDetails" AS (
                SELECT ca."ModuleDraftID",ca."ModuleName",ca."CreatedBy",ca."TotalApproverCount",ca."ApproveApproverCount",ca."RejectedApproverCount",
                CASE 
                WHEN ca."RejectedStekHolderCount" > 0 OR ca."RejectedStekHolderEscalationCount" > 0 OR ca."RejectedReviewerCount" > 0 
                    OR ca."RejectedReviewerEscalationCount" > 0 OR ca."RejectedApproverCount" > 0 THEN NULL
                WHEN ca."TotalStekHolderCount" > 0 AND (ca."StakeHolderEscalationDate" > CURRENT_TIMESTAMP OR ca."TotalStekHolderEscalationCount" = 0)
                    AND ((ca."NeedAcceptanceFromStakeHolder" IS FALSE AND ca."ApproveStekHolderCount" = 0)
                    OR (ca."NeedAcceptanceFromStakeHolder" IS TRUE AND ca."ApproveStekHolderCount" != ca."TotalStekHolderCount")) THEN ca."StekHolderUserList"
                WHEN ca."TotalStekHolderEscalationCount" > 0 AND ca."ApproveStekHolderEscalationCount" = 0 AND
					((ca."NeedAcceptanceFromStakeHolder" IS FALSE AND ca."ApproveStekHolderCount" = 0)
                    OR (ca."NeedAcceptanceFromStakeHolder" IS TRUE AND ca."ApproveStekHolderCount" != ca."TotalStekHolderCount"))
                    AND ca."StakeHolderEscalationDate" < CURRENT_TIMESTAMP THEN ca."StekHolderEscalationUserList"
                WHEN ca."TotalReviewerCount" > 0 AND (ca."EscalationDate" > CURRENT_TIMESTAMP OR ca."TotalReviewerEscalationCount" = 0)
                    AND ((ca."NeedAcceptance" IS FALSE AND ca."ApproveReviewerCount" = 0)
                    OR (ca."NeedAcceptance" IS TRUE AND ca."ApproveReviewerCount" != ca."TotalReviewerCount")) THEN ca."ReviewerUserList"
                WHEN ca."TotalReviewerEscalationCount" > 0 AND ca."ApproveReviewerEscalationCount" = 0 AND 
					((ca."NeedAcceptance" IS FALSE AND ca."ApproveReviewerCount" = 0)
                    OR (ca."NeedAcceptance" IS TRUE AND ca."ApproveReviewerCount" != ca."TotalReviewerCount"))
                    AND ca."EscalationDate" < CURRENT_TIMESTAMP THEN ca."ReviewerEscalationUserList"
                WHEN ca."TotalApproverCount" > 0 AND ((ca."NeedAcceptanceForApprover" IS FALSE AND ca."ApproveApproverCount" = 0)
                    OR (ca."NeedAcceptanceForApprover" IS TRUE AND ca."ApproveApproverCount" != ca."TotalApproverCount")) THEN ca."ApproverUserList"
                ELSE NULL END AS "UserIds",
                CASE 
                WHEN ca."RejectedStekHolderCount" > 0 OR ca."RejectedStekHolderEscalationCount" > 0 OR ca."RejectedReviewerCount" > 0 
                    OR ca."RejectedReviewerEscalationCount" > 0 OR ca."RejectedApproverCount" > 0 THEN 'INVALID'
                WHEN ca."TotalStekHolderCount" > 0 AND (ca."StakeHolderEscalationDate" > CURRENT_TIMESTAMP OR ca."TotalStekHolderEscalationCount" = 0)
                    AND ((ca."NeedAcceptanceFromStakeHolder" IS FALSE AND ca."ApproveStekHolderCount" = 0)
                    OR (ca."NeedAcceptanceFromStakeHolder" IS TRUE AND ca."ApproveStekHolderCount" != ca."TotalStekHolderCount")) THEN 'STAKEHOLDER'
                WHEN ca."TotalStekHolderEscalationCount" > 0 AND ca."ApproveStekHolderEscalationCount" = 0 AND
					((ca."NeedAcceptanceFromStakeHolder" IS FALSE AND ca."ApproveStekHolderCount" = 0)
                    OR (ca."NeedAcceptanceFromStakeHolder" IS TRUE AND ca."ApproveStekHolderCount" != ca."TotalStekHolderCount"))
                    AND ca."StakeHolderEscalationDate" < CURRENT_TIMESTAMP THEN 'STAKEHOLDER_ESCALATION'
                WHEN ca."TotalReviewerCount" > 0 AND (ca."EscalationDate" > CURRENT_TIMESTAMP OR ca."TotalReviewerEscalationCount" = 0)
                    AND ((ca."NeedAcceptance" IS FALSE AND ca."ApproveReviewerCount" = 0)
                    OR (ca."NeedAcceptance" IS TRUE AND ca."ApproveReviewerCount" != ca."TotalReviewerCount")) THEN 'REVIEWER'
                WHEN ca."TotalReviewerEscalationCount" > 0 AND ca."ApproveReviewerEscalationCount" = 0 AND
					((ca."NeedAcceptance" IS FALSE AND ca."ApproveReviewerCount" = 0)
                    OR (ca."NeedAcceptance" IS TRUE AND ca."ApproveReviewerCount" != ca."TotalReviewerCount"))
                    AND ca."EscalationDate" < CURRENT_TIMESTAMP THEN 'REVIEWER_ESCALATION'
                WHEN ca."TotalApproverCount" > 0 AND ((ca."NeedAcceptanceForApprover" IS FALSE AND ca."ApproveApproverCount" = 0)
                    OR (ca."NeedAcceptanceForApprover" IS TRUE AND ca."ApproveApproverCount" != ca."TotalApproverCount")) THEN 'APPROVER'
                ELSE 'INVALID' END AS "UserType",ca."NeedAcceptance",ca."NeedAcceptanceFromStakeHolder",ca."NeedAcceptanceForApprover"
                FROM "CountsAction" ca
            )
            SELECT 
                shr."ModuleDraftID",
                md."ModuleID",
                shr."ModuleName",
                shr."UserType",
                u."UserFullName",
                u."UserEmail",
                u."UserID",
                n."NotificationTypeForAction",
                u."UserRole",
                md."ModuleTypeName",
				md."ModuleTypeID",
				md."ContentID",
                shr."NeedAcceptance",
                shr."NeedAcceptanceFromStakeHolder",
                shr."NeedAcceptanceForApprover",
				shr."TotalApproverCount",
				shr."ApproveApproverCount",
				shr."RejectedApproverCount"
            FROM "GeneRateActionableUserDetails" shr
            LEFT JOIN LATERAL (
                SELECT 
                    trim(concat_ws(' ', ud."UserFirstName", ud."UserMiddleName", ud."UserLastName")) AS "UserFullName",
                    ud.*,
                    CASE 
                        WHEN ud."UserID" = shr."CreatedBy" 
                            AND EXISTS (
                                SELECT 1 
                                FROM jsonb_array_elements_text(shr."UserIds") ids
                                WHERE ids::uuid = shr."CreatedBy"
                            )
                        THEN 'CreatorAndActioner'
                        WHEN ud."UserID" = shr."CreatedBy" THEN 'Creator'
                        ELSE 'Actioner' 
                    END AS "UserRole"
                FROM "UserDetails" ud
                WHERE ud."UserID" IN (
                    SELECT uid::uuid
                    FROM (
                        SELECT shr."CreatedBy"::text AS uid
                        UNION ALL
                        SELECT jsonb_array_elements_text(shr."UserIds")
                    ) sub
                )
            ) u ON true
            INNER JOIN "ModuleDraft" md ON md."ModuleDraftID" = shr."ModuleDraftID"
            LEFT JOIN "Notifications" n 
                ON n."UserID" = u."UserID"
            WHERE shr."ModuleDraftID" = :ModuleDraftID;`,
      {
        type: QueryTypes.SELECT,
        replacements: {
          ModuleDraftID: SOPID || DocumentID,
        },
      }
    );

    if (data) {
      // Handle the data as needed
      if (data[0].UserType === "INVALID") {
        throw new Error(
          "Invalid action, no users available for this module draft."
        );
      }
      const actionUser = data.find(
        (user) =>
          user.UserID == currentUserId &&
          ["CreatorAndActioner", "Actioner"].includes(user.UserRole)
      );
      if (!actionUser) {
        throw new Error("You are not authorized to perform this action.");
      }

      // if (DocumentID) {
      //   await UserNotification.update(
      //     {
      //       IsActive: false,
      //       IsDeleted: true,
      //       DeletedBy: currentUserId,
      //       DeletedDate: literal("CURRENT_TIMESTAMP"),
      //     },
      //     {
      //       where: {
      //         LinkedID: DocumentID, // This is actually DocumentModuleDraftID
      //         UserID: currentUserId,
      //         LinkedType: "Document",
      //       },
      //     }
      //   );
      // }

      // // Remove notifications for SOPID if present
      // if (SOPID) {
      //   await UserNotification.update(
      //     {
      //       IsActive: false,
      //       IsDeleted: true,
      //       DeletedBy: currentUserId,
      //       DeletedDate: literal("CURRENT_TIMESTAMP"),
      //     },
      //     {
      //       where: {
      //         LinkedID: SOPID,
      //         UserID: currentUserId,
      //         LinkedType: "SOP",
      //       },
      //     }
      //   );
      // }

      const moduleDraftId = SOPID || DocumentID; // Current draft ID passed in request
      const moduleId = data[0].ModuleID; // Underlying module ID
      const linkedType =
        actionUser.ModuleTypeName === "Document" ? "Document" : "SOP";

      const notificationDeletePayload = {
        IsActive: false,
        IsDeleted: true,
        DeletedBy: currentUserId,
        DeletedDate: literal("CURRENT_TIMESTAMP"),
      };

      const notificationWhereClauses = [
        {
          LinkedID: moduleDraftId,
          UserID: currentUserId,
          LinkedType: linkedType,
        },
        {
          LinkedID: moduleId,
          UserID: currentUserId,
          LinkedType: linkedType,
        },
      ];

      await Promise.all(
        notificationWhereClauses.map((where) =>
          UserNotification.update(notificationDeletePayload, { where })
        )
      );

      if (actionUser.UserType === "STAKEHOLDER") {
        await ModuleStakeHolder.update(
          {
            Comment,
            ApprovalStatus,
            IsReviewSkipped,
            IsActive: false,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
            ModifiedBy: currentUserId,
          },
          {
            where: {
              DocumentModuleDraftID: DocumentID,
              SOPDraftID: SOPID,
              UserID: currentUserId,
            },
          }
        );
        await DocumentModuleDraft.update(
          {
            EscalationSourceDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: { DocumentModuleDraftID: DocumentID },
          }
        );
      } else if (actionUser.UserType === "STAKEHOLDER_ESCALATION") {
        await ModuleEscalation.update(
          {
            Comment,
            ApprovalStatus,
            IsReviewSkipped,
            IsActive: false,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
            ModifiedBy: currentUserId,
          },
          {
            where: {
              DocumentModuleDraftID: DocumentID,
              SOPDraftID: SOPID,
              UserID: currentUserId,
              IsReviewer: false,
              IsStakeHolder: true,
            },
          }
        );
        await DocumentModuleDraft.update(
          {
            EscalationSourceDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: { DocumentModuleDraftID: DocumentID },
          }
        );
      } else if (actionUser.UserType === "REVIEWER") {
        await ModuleChecker.update(
          {
            Comment,
            ApprovalStatus,
            IsReviewSkipped,
            IsActive: false,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
            ModifiedBy: currentUserId,
          },
          {
            where: {
              DocumentModuleDraftID: DocumentID,
              SOPDraftID: SOPID,
              UserID: currentUserId,
            },
          }
        );
      } else if (actionUser.UserType === "REVIEWER_ESCALATION") {
        await ModuleEscalation.update(
          {
            Comment,
            ApprovalStatus,
            IsReviewSkipped,
            IsActive: false,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
            ModifiedBy: currentUserId,
          },
          {
            where: {
              DocumentModuleDraftID: DocumentID,
              SOPDraftID: SOPID,
              UserID: currentUserId,
              IsReviewer: true,
              IsStakeHolder: false,
            },
          }
        );
      } else if (actionUser.UserType === "APPROVER") {
        await ModuleApprover.update(
          {
            Comment,
            ApprovalStatus,
            IsReviewSkipped,
            IsActive: false,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
            ModifiedBy: currentUserId,
          },
          {
            where: {
              DocumentModuleDraftID: DocumentID,
              SOPDraftID: SOPID,
              UserID: currentUserId,
            },
          }
        );
      }
      const owner = data.find((user) =>
        ["CreatorAndActioner", "Creator"].includes(user.UserRole)
      );
      if (owner) {
        if (
          owner.NotificationTypeForAction === "push" ||
          owner.NotificationTypeForAction === "both"
        ) {
          const pushNotification = {
            UserID: owner.UserID,
            Message: `Activity action on the module draft ${data[0].ModuleName} has been recorded.`,
            NotificationType: "update",
            LinkedType: owner.ModuleTypeName,
            LinkedID: SOPID || DocumentID,
            CreatedBy: currentUserId,
          };
          try {
            await UserNotification.create(pushNotification);
            sendNotification([pushNotification]);
          } catch (error) {}
        }
        if (
          owner.NotificationTypeForAction === "email" ||
          owner.NotificationTypeForAction === "both"
        ) {
          // this mail send to owner
          const LatestEmailTemplate =
            await adminController?.getLatestEmailTemplate();
          console.log(LatestEmailTemplate, "LatestEmailTemplate");
          const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
        <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header with Logo -->
            ${
              LatestEmailTemplate?.logo
                ? `
            <div style="text-align: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #eeeeee;">
                <img src="${LatestEmailTemplate?.logo}" alt="Company Logo" style="max-height: 60px;">
            </div>
            `
                : ""
            }
            
            <!-- Main Content -->
            <div style="color: #333333; line-height: 1.6;">
                <!-- Personalized Greeting -->
                <div style="font-size: 16px; margin-bottom: 20px;">
                    ${LatestEmailTemplate?.GreetingName?.replace(
                      "manokaran,",
                      `<strong>${owner?.UserFullName},</strong>`
                    )}
                </div>
                
                <!-- Main Message -->
                <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #007cba; margin: 20px 0;">
                    ${LatestEmailTemplate?.Body}
                </div>
                
                <!-- Assignment Details -->
                <div style="background: #fff8e1; border: 1px solid #ffd54f; border-radius: 6px; padding: 18px; margin: 25px 0;">
                    <h3 style="color: #e65100; margin-bottom: 12px; font-size: 16px;">📋 Assignment Details</h3>
                      <p style="margin: 8px 0;">
                        <strong>User Full Name:</strong> ${
                          actionUser?.UserFullName
                        }
                    </p>
                     <p style="margin: 8px 0;">
                        <strong>Module Type:</strong> ${
                          actionUser?.ModuleTypeName
                        }
                    </p>
                    <p style="margin: 8px 0;">
                        <strong>Module Name:</strong> ${actionUser?.ModuleName}
                    </p>
                    <p style="margin: 8px 0;">
                        <strong>Approval Status:</strong> ${ApprovalStatus}
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
                    ${LatestEmailTemplate?.signature}
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

          const emailData = {
            recipientEmail: owner.UserEmail,
            subject:
              LatestEmailTemplate.Subject ||
              `Important: You've been assigned as ${owner.UserType}`,
            body: {
              html: emailBody,
            },
          };

          mailService(emailData);
        }
      }
      if (actionUser) {
        sendInAppAndEmailNotification(actionUser, currentUserId);
      }
      if (
        actionUser.UserType === "APPROVER" &&
        actionUser.RejectedApproverCount == 0 &&
        ApprovalStatus == "Approved" &&
        (actionUser.NeedAcceptanceForApprover == false ||
          (actionUser.NeedAcceptanceForApprover == true &&
            actionUser.TotalApproverCount - 1 ==
              actionUser.ApproveApproverCount))
      ) {
        await DocumentModuleDraft.update(
          { AllowFileChanges: true },
          {
            where: { DocumentModuleDraftID: DocumentID },
          }
        );
        const publishFunction = DocumentID
          ? adminController.publishDocumentModule
          : SOPID
          ? adminController.publishSOPModule
          : null;

        if (publishFunction) {
          req.body = {
            ...req.body,
            ModuleTypeID: actionUser?.ModuleTypeID,
            ContentID: actionUser?.ContentID,
            DocumentID: actionUser.ModuleID,
            SOPID: actionUser.ModuleID,
            AuthorizedToPublish: "true",
          };
          await publishFunction(req, res);
        }
      } else {
        res.status(200).send({
          message: "Activity Status Update Successfully",
        });
      }
    } else {
      throw new Error(
        "Invalid action, no users available for this module draft."
      );
    }
  } catch (error) {
    console.error(currentUserId, error);
    logger.error({
      message: error.message,
      details: error.stack || error.toString(),
      user: currentUserId,
    });
    return res.status(500).send({ message: error.message });
  }
};
exports.additionalEndUserDashboardData = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const { RequestedData = [] } = req.body;
    let PendingAcknowledge = [],
      DocumentList,
      UpcummingTest = [],
      FormData = [],
      ElementStatus = {};
    if (RequestedData.some((el) => el === "AcknowledgeData")) {
      PendingAcknowledge = await sequelize.query(
        `WITH RECURSIVE
              DESCENDANTS AS (
                SELECT
                  C."ContentID",
                  C."ParentContentID",
                  C."ContentName",
                  C."ModuleTypeID",
                  C."IsDeleted",
                  0 AS DEPTH
                FROM
                  "ContentStructures" C
                WHERE
                  C."ParentContentID" IS NULL
                  AND C."IsDeleted" IS NOT TRUE
                  AND C."OrganizationStructureID" = :OrganizationStructureID
                UNION ALL
                SELECT
                  CHILD."ContentID",
                  CHILD."ParentContentID",
                  CHILD."ContentName",
                  CHILD."ModuleTypeID",
                  CHILD."IsDeleted",
                  D.DEPTH + 1
                FROM
                  "ContentStructures" CHILD
                  JOIN DESCENDANTS D ON CHILD."ParentContentID" = D."ContentID"
                WHERE
                  D."IsDeleted" = FALSE
              ),
              "SelectedContentIds" AS (
                SELECT
                  "ContentID",
                  "ModuleTypeID"
                FROM
                  DESCENDANTS
                WHERE
                  "IsDeleted" = FALSE
              ),
              "DataAsPerAssignMOdules" AS (
                SELECT
                  UML."ModuleID" AS "ElementID",
                  COALESCE(
                    SM."SOPName",
                    DM."DocumentName",
                    TSM."TrainingSimulationName",
                    TSM2."TestSimulationName",
                    TMM."TestMCQName",
                    FM."FormName"
                  ) AS "ElementName",
                  MM."ModuleName" AS "ElementTypeName",
                  UML."DueDate",
                  UML."StartDate",
                  COUNT(UMAL."IsAncknowledged") FILTER (
                    WHERE
                      UMAL."IsAncknowledged" IS TRUE
                  ) AS "AncknowledgedCount"
                FROM
                  "UserModuleLinks" UML
                  INNER JOIN "ModuleMasters" MM ON MM."ModuleTypeID" = UML."ModuleTypeID"
                  LEFT JOIN "SopModules" SM ON SM."SOPID" = UML."ModuleID"
                  LEFT JOIN "DocumentModules" DM ON DM."DocumentID" = UML."ModuleID"
                  LEFT JOIN "TrainingSimulationModules" TSM ON TSM."TrainingSimulationID" = UML."ModuleID"
                  LEFT JOIN "TestSimulationModules" TSM2 ON TSM2."TestSimulationID" = UML."ModuleID"
                  LEFT JOIN "TestMcqsModules" TMM ON TMM."TestMCQID" = UML."ModuleID"
                  LEFT JOIN "FormModules" FM ON FM."FormID" = UML."ModuleID"
                  LEFT JOIN "UserModuleAccessLogs" UMAL ON UMAL."ModuleID" = UML."ModuleID"
                  AND UMAL."UserID" = UML."UserID"
                WHERE
                  UML."UserID" = :UserID
                  AND COALESCE(
                    SM."ContentID",
                    DM."ContentID",
                    TSM."ContentID",
                    TSM2."ContentID",
                    TMM."ContentID",
                    FM."ContentID"
                  ) IN (
                    SELECT
                      "ContentID"
                    FROM
                      "SelectedContentIds" S
                    WHERE
                      S."ModuleTypeID" = UML."ModuleTypeID"
                  )
                  AND COALESCE(
                    SM."SOPName",
                    DM."DocumentName",
                    TSM."TrainingSimulationName",
                    TSM2."TestSimulationName",
                    TMM."TestMCQName",
                    FM."FormName"
                  ) IS NOT NULL
                  AND SM."IsDeleted" IS NOT TRUE
                  AND DM."IsDeleted" IS NOT TRUE
                  AND TSM."IsDeleted" IS NOT TRUE
                  AND TSM2."IsDeleted" IS NOT TRUE
                  AND TMM."IsDeleted" IS NOT TRUE
                  AND FM."IsDeleted" IS NOT TRUE
                  AND UML."IsDeleted" IS NOT TRUE
                GROUP BY
                  SM."SOPName",
                  DM."DocumentName",
                  TSM."TrainingSimulationName",
                  TSM2."TestSimulationName",
                  TMM."TestMCQName",
                  FM."FormName",
                  MM."ModuleName",
                  UML."DueDate",
                  UML."StartDate",
                  UML."ModuleID"
              )
            SELECT
              "ElementID",
              "ElementName",
              "ElementTypeName",
              "DueDate"
            FROM
              "DataAsPerAssignMOdules"
            WHERE
              "AncknowledgedCount" = 0
              AND "DueDate" >= CURRENT_TIMESTAMP
              AND "StartDate" <= CURRENT_TIMESTAMP;
      `,
        {
          type: QueryTypes.SELECT,
          replacements: {
            UserID: currentUserId,
            OrganizationStructureID: lincense.EnterpriseID,
          },
        }
      );
    }
    if (RequestedData.some((el) => el === "DocumentData")) {
      DocumentList = await DocumentModule.findAll({
        where: literal(`"DocumentModule"."DocumentID" IN 
        (SELECT uml."ModuleID" FROM "UserModuleLinks" uml 
        WHERE uml."UserID" = '${currentUserId}'
        AND uml."DueDate" < (CURRENT_DATE + interval '1 day')::timestamp - interval '1 second')`),
        attributes: ["DocumentID", "DocumentName"],
      });
    }
    if (RequestedData.some((el) => el === "UpcummingTestData")) {
      UpcummingTest = await sequelize.query(
        `
      select 
      uml."ModuleID" as "ElementID",
      case 
        when tsm2."TestSimulationName" is not null then tsm2."TestSimulationName" 
        when tmm."TestMCQName" is not null then tmm."TestMCQName" 
      end as "ElementName",
      case 
        when tsm2."TestSimulationName" is not null then 'SkillAssessment' 
        when tmm."TestMCQName" is not null then 'TestMCQ'
      end as "ElementTypeName",
      uml."DueDate" 
      from "UserModuleLinks" uml 
      left join "TestSimulationModules" tsm2 on tsm2."TestSimulationID" = uml."ModuleID" 
      left join "TestMcqsModules" tmm on tmm."TestMCQID" = uml."ModuleID" 
      where uml."UserID" = :UserID
          and uml."StartDate" > CURRENT_DATE 
          and uml."ModuleID" in ( select umal."ModuleID" from "UserModuleAccessLogs" umal
                        where umal."UserID" = :UserID)`,
        {
          type: QueryTypes.SELECT,
          replacements: { UserID: currentUserId },
        }
      );
    }
    if (RequestedData.some((el) => el === "FormData")) {
      FormData = await sequelize.query(
        `
      select fm."FormID",fm."FormName",
      case 
        when fms."FormModuleSubmissionID" is not null then true else false
      end as "IsSubmitted"
      from "FormModules" fm 
      inner join "FormModuleDrafts" fmd on fm."FormID" = fmd."FormID" 
      inner  join "UserModuleLinks" uml on uml."ModuleID" = fm."FormID" 
      left join "FormModuleSubmissions" fms on fms."FormModuleDraftID" = fmd."FormModuleDraftID" 
              and fms."FormModuleDraftID" = fmd."FormModuleDraftID" 
              and fms."UserModuleLinkID" = uml."UserModuleLinkID" 
      where fm."MasterVersion" = fmd."MasterVersion" 
      and uml."UserID" = :UserID
      `,
        {
          type: QueryTypes.SELECT,
          replacements: { UserID: currentUserId },
        }
      );
    }
    if (RequestedData.some((el) => el === "ElementStatusCount")) {
      const elementDetaisCount = await sequelize.query(
        `WITH CheckerSOP as (
                    select smd."SOPDraftID" AS "ModuleDraftID",smd."NeedAcceptance",smd."SOPName" AS "ModuleName",
                    sum (case when mc."ApprovalStatus" is not null then 1 else 0 end) as action_count,'SOP' AS "ModuleType",'Checker' as "ActionType",
                    CASE
                        WHEN smd."EscalationType" = 'Minutes' THEN smd."CreatedDate" + INTERVAL '1 minute' * smd."EscalationAfter"
                        WHEN smd."EscalationType" = 'Hours' THEN smd."CreatedDate" + INTERVAL '1 hour' * smd."EscalationAfter"
                        WHEN smd."EscalationType" = 'Days' THEN smd."CreatedDate" + INTERVAL '1 day' * smd."EscalationAfter"
                        WHEN smd."EscalationType" = 'Weeks' THEN smd."CreatedDate" + INTERVAL '1 week' * smd."EscalationAfter"
                        WHEN smd."EscalationType" = 'Months' THEN smd."CreatedDate" + INTERVAL '1 month' * smd."EscalationAfter"
                        WHEN smd."EscalationType" = 'Years' THEN smd."CreatedDate" + INTERVAL '1 year' * smd."EscalationAfter"
                        ELSE smd."CreatedDate"
                    END AS "EscalationDate",
                    MAX(mc."ModifiedDate") FILTER (WHERE mc."ApprovalStatus" IS NOT NULL) AS "ActionDate",
                    ROW_NUMBER() OVER (PARTITION BY smd."SOPID" ORDER BY smd."CreatedDate" DESC) AS rn,
                    count(mc."SOPDraftID") FILTER (WHERE mc."ApprovalStatus" ='Rejected') as reject_count,
                    count(smd."SOPDraftID") as total_count from "ModuleCheckers" mc
                    inner join "SopModuleDrafts" smd on smd."SOPDraftID" = mc."SOPDraftID"
                    where smd."IsDeleted" is not true and smd."SOPStatus" = 'InProgress'
                    group by smd."SOPDraftID",smd."NeedAcceptance",smd."SOPName"
                    ),

                    CheckerDocument as (
                    select dmd."DocumentModuleDraftID" AS "ModuleDraftID",dmd."NeedAcceptance",dmd."DocumentName" AS "ModuleName",
                    sum (case when mc."ApprovalStatus" is not null then 1 else 0 end) as action_count,'Document' AS "ModuleType",'Checker' as "ActionType",
                    CASE
                        WHEN dmd."EscalationType" = 'Minutes' THEN dmd."EscalationSourceDate" + INTERVAL '1 minute' * dmd."EscalationAfter"
                        WHEN dmd."EscalationType" = 'Hours' THEN dmd."EscalationSourceDate" + INTERVAL '1 hour' * dmd."EscalationAfter"
                        WHEN dmd."EscalationType" = 'Days' THEN dmd."EscalationSourceDate" + INTERVAL '1 day' * dmd."EscalationAfter"
                        WHEN dmd."EscalationType" = 'Weeks' THEN dmd."EscalationSourceDate" + INTERVAL '1 week' * dmd."EscalationAfter"
                        WHEN dmd."EscalationType" = 'Months' THEN dmd."EscalationSourceDate" + INTERVAL '1 month' * dmd."EscalationAfter"
                        WHEN dmd."EscalationType" = 'Years' THEN dmd."EscalationSourceDate" + INTERVAL '1 year' * dmd."EscalationAfter"
                        ELSE dmd."EscalationSourceDate"
                    END AS "EscalationDate",
                    MAX(mc."ModifiedDate") FILTER (WHERE mc."ApprovalStatus" IS NOT NULL) AS "ActionDate",
                    ROW_NUMBER() OVER (PARTITION BY dmd."DocumentID" ORDER BY dmd."CreatedDate" DESC) AS rn,
                    count(mc."DocumentModuleDraftID") FILTER (WHERE mc."ApprovalStatus" ='Rejected') as reject_count,
                    count(mc."DocumentModuleDraftID") as total_count from "ModuleCheckers" mc
                    inner join "DocumentModuleDrafts" dmd on dmd."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
                    where dmd."IsDeleted" is not true and dmd."DocumentStatus" = 'InProgress'
                    group by dmd."DocumentModuleDraftID",dmd."NeedAcceptance",dmd."DocumentName"
                    ),

                    SteakHolderDocument as (
                    select dmd."DocumentModuleDraftID" AS "ModuleDraftID" ,dmd."NeedAcceptanceFromStakeHolder" as "NeedAcceptance",dmd."DocumentName" AS "ModuleName",
                    sum (case when msh."ApprovalStatus" is not null then 1 else 0 end) as action_count,'Document' AS "ModuleType",'StakeHolder' as "ActionType",
                    CASE
                        WHEN dmd."EscalationType" = 'Minutes' THEN dmd."CreatedDate" + INTERVAL '1 minute' * dmd."StakeHolderEscalationAfter"
                        WHEN dmd."EscalationType" = 'Hours' THEN dmd."CreatedDate" + INTERVAL '1 hour' * dmd."StakeHolderEscalationAfter"
                        WHEN dmd."EscalationType" = 'Days' THEN dmd."CreatedDate" + INTERVAL '1 day' * dmd."StakeHolderEscalationAfter"
                        WHEN dmd."EscalationType" = 'Weeks' THEN dmd."CreatedDate" + INTERVAL '1 week' * dmd."StakeHolderEscalationAfter"
                        WHEN dmd."EscalationType" = 'Months' THEN dmd."CreatedDate" + INTERVAL '1 month' * dmd."StakeHolderEscalationAfter"
                        WHEN dmd."EscalationType" = 'Years' THEN dmd."CreatedDate" + INTERVAL '1 year' * dmd."StakeHolderEscalationAfter"
                        ELSE dmd."CreatedDate"
                    END AS "EscalationDate",
                    MAX(msh."ModifiedDate") FILTER (WHERE msh."ApprovalStatus" IS NOT NULL) AS "ActionDate",
                    ROW_NUMBER() OVER (PARTITION BY dmd."DocumentID" ORDER BY dmd."CreatedDate" DESC) AS rn,
                    count(msh."DocumentModuleDraftID") FILTER (WHERE msh."ApprovalStatus" ='Rejected') as reject_count,
                    count(msh."DocumentModuleDraftID") as total_count from "ModuleStakeHolders" msh
                    inner join "DocumentModuleDrafts" dmd on dmd."DocumentModuleDraftID" = msh."DocumentModuleDraftID"
                    where dmd."IsDeleted" is not true and dmd."DocumentStatus" = 'InProgress'
                    group by dmd."DocumentModuleDraftID",dmd."NeedAcceptanceFromStakeHolder",dmd."DocumentName"
                    ),

                    EscalatorSOP as (
                    select smd."SOPDraftID" AS "ModuleDraftID",smd."SOPName" AS "ModuleName",
                    sum (case when me."ApprovalStatus" is not null then 1 else 0 end) as action_count,'SOP' AS "ModuleType",'Escalator' as "ActionType",
                    CASE
                        WHEN smd."EscalationType" = 'Minutes' THEN smd."CreatedDate" + INTERVAL '1 minute' * smd."EscalationAfter"
                        WHEN smd."EscalationType" = 'Hours' THEN smd."CreatedDate" + INTERVAL '1 hour' * smd."EscalationAfter"
                        WHEN smd."EscalationType" = 'Days' THEN smd."CreatedDate" + INTERVAL '1 day' * smd."EscalationAfter"
                        WHEN smd."EscalationType" = 'Weeks' THEN smd."CreatedDate" + INTERVAL '1 week' * smd."EscalationAfter"
                        WHEN smd."EscalationType" = 'Months' THEN smd."CreatedDate" + INTERVAL '1 month' * smd."EscalationAfter"
                        WHEN smd."EscalationType" = 'Years' THEN smd."CreatedDate" + INTERVAL '1 year' * smd."EscalationAfter"
                        ELSE smd."CreatedDate"
                    END AS "EscalationDate",
                    MAX(me."ModifiedDate") FILTER (WHERE me."ApprovalStatus" IS NOT NULL) AS "ActionDate",
                    ROW_NUMBER() OVER (PARTITION BY smd."SOPID" ORDER BY smd."CreatedDate" DESC) AS rn,
                    COUNT(me."SOPDraftID") FILTER (WHERE me."ApprovalStatus" ='Rejected') as reject_count,
                    count(smd."SOPDraftID") as total_count from "ModuleEscalations" me
                    inner join "SopModuleDrafts" smd on smd."SOPDraftID" = me."SOPDraftID"
                    where smd."IsDeleted" is not true and smd."SOPStatus" = 'InProgress'
                    group by smd."SOPDraftID",smd."SOPName"
                    ),

                    EscalatorDocumentForReviewer as (
                    select dmd."DocumentModuleDraftID" AS "ModuleDraftID" ,dmd."DocumentName" AS "ModuleName",
                    sum (case when me."ApprovalStatus" is not null then 1 else 0 end) as action_count,'Document' AS "ModuleType",'Escalator' as "ActionType",
                    CASE
                        WHEN dmd."EscalationType" = 'Minutes' THEN dmd."EscalationSourceDate" + INTERVAL '1 minute' * dmd."EscalationAfter"
                        WHEN dmd."EscalationType" = 'Hours' THEN dmd."EscalationSourceDate" + INTERVAL '1 hour' * dmd."EscalationAfter"
                        WHEN dmd."EscalationType" = 'Days' THEN dmd."EscalationSourceDate" + INTERVAL '1 day' * dmd."EscalationAfter"
                        WHEN dmd."EscalationType" = 'Weeks' THEN dmd."EscalationSourceDate" + INTERVAL '1 week' * dmd."EscalationAfter"
                        WHEN dmd."EscalationType" = 'Months' THEN dmd."EscalationSourceDate" + INTERVAL '1 month' * dmd."EscalationAfter"
                        WHEN dmd."EscalationType" = 'Years' THEN dmd."EscalationSourceDate" + INTERVAL '1 year' * dmd."EscalationAfter"
                        ELSE dmd."EscalationSourceDate"
                    END AS "EscalationDate",
                    MAX(me."ModifiedDate") FILTER (WHERE me."ApprovalStatus" IS NOT NULL) AS "ActionDate",
                    ROW_NUMBER() OVER (PARTITION BY dmd."DocumentID" ORDER BY dmd."CreatedDate" DESC) AS rn,
                    COUNT(me."DocumentModuleDraftID") FILTER (WHERE me."ApprovalStatus" ='Rejected') as reject_count,
                    count(me."DocumentModuleDraftID") as total_count from "ModuleEscalations" me
                    inner join "DocumentModuleDrafts" dmd on dmd."DocumentModuleDraftID" = me."DocumentModuleDraftID"
                    where dmd."IsDeleted" is not true and dmd."DocumentStatus" = 'InProgress' AND me."IsReviewer" IS TRUE      
                    group by dmd."DocumentModuleDraftID",dmd."DocumentName"
                    ),

                    EscalatorDocumentForSteakHolder as (
                    select dmd."DocumentModuleDraftID" AS "ModuleDraftID" ,dmd."DocumentName" AS "ModuleName",
                    sum (case when me."ApprovalStatus" is not null then 1 else 0 end) as action_count,'Document' AS "ModuleType",'Escalator' as "ActionType",
                    CASE
                        WHEN dmd."EscalationType" = 'Minutes' THEN dmd."CreatedDate" + INTERVAL '1 minute' * dmd."StakeHolderEscalationAfter"
                        WHEN dmd."EscalationType" = 'Hours' THEN dmd."CreatedDate" + INTERVAL '1 hour' * dmd."StakeHolderEscalationAfter"
                        WHEN dmd."EscalationType" = 'Days' THEN dmd."CreatedDate" + INTERVAL '1 day' * dmd."StakeHolderEscalationAfter"
                        WHEN dmd."EscalationType" = 'Weeks' THEN dmd."CreatedDate" + INTERVAL '1 week' * dmd."StakeHolderEscalationAfter"
                        WHEN dmd."EscalationType" = 'Months' THEN dmd."CreatedDate" + INTERVAL '1 month' * dmd."StakeHolderEscalationAfter"
                        WHEN dmd."EscalationType" = 'Years' THEN dmd."CreatedDate" + INTERVAL '1 year' * dmd."StakeHolderEscalationAfter"
                        ELSE dmd."CreatedDate"
                    END AS "EscalationDate",
                    MAX(me."ModifiedDate") FILTER (WHERE me."ApprovalStatus" IS NOT NULL) AS "ActionDate",
                    ROW_NUMBER() OVER (PARTITION BY dmd."DocumentID" ORDER BY dmd."CreatedDate" DESC) AS rn,
                    COUNT(me."DocumentModuleDraftID") FILTER (WHERE me."ApprovalStatus" ='Rejected') as reject_count,
                    count(me."DocumentModuleDraftID") as total_count from "ModuleEscalations" me
                    inner join "DocumentModuleDrafts" dmd on dmd."DocumentModuleDraftID" = me."DocumentModuleDraftID"
                    where dmd."IsDeleted" is not true and dmd."DocumentStatus" = 'InProgress' AND me."IsStakeHolder" IS TRUE
                    group by dmd."DocumentModuleDraftID",dmd."DocumentName"
                    ),

                    AproverSOP as (
                    select smd."SOPDraftID" AS "ModuleDraftID",smd."SOPName" AS "ModuleName",MAX(ma."ModifiedDate") FILTER (WHERE ma."ApprovalStatus" IS NOT NULL) as "ActionDate",
                    sum (case when ma."ApprovalStatus" is not null then 1 else 0 end) as action_count,'SOP' AS "ModuleType",'Approver' as "ActionType",
                    smd."NeedAcceptanceForApprover" as "NeedAcceptance",
                    ROW_NUMBER() OVER (PARTITION BY smd."SOPID" ORDER BY smd."CreatedDate" DESC) AS rn,
                    count(ma."SOPDraftID") FILTER (WHERE ma."ApprovalStatus" ='Rejected') as reject_count,
                    count(smd."SOPDraftID") as total_count from "ModuleApprovers" ma
                    inner join "SopModuleDrafts" smd on smd."SOPDraftID" = ma."SOPDraftID"
                    where smd."IsDeleted" is not true and smd."SOPStatus" = 'InProgress'
                    group by smd."SOPDraftID",smd."SOPName",smd."NeedAcceptanceForApprover"
                    ),
                    AproverDocument as (
                    select dmd."DocumentModuleDraftID" AS "ModuleDraftID" ,dmd."DocumentName" AS "ModuleName",MAX(ma."ModifiedDate") FILTER (WHERE ma."ApprovalStatus" IS NOT NULL) as "ActionDate",
                    sum (case when ma."ApprovalStatus" is not null then 1 else 0 end) as action_count,'Document' AS "ModuleType",'Approver' as "ActionType",
                    dmd."NeedAcceptanceForApprover" as "NeedAcceptance",
                    ROW_NUMBER() OVER (PARTITION BY dmd."DocumentID" ORDER BY dmd."CreatedDate" DESC) AS rn,
                    count(ma."DocumentModuleDraftID") FILTER (WHERE ma."ApprovalStatus" ='Rejected') as reject_count,
                    count(ma."DocumentModuleDraftID") as total_count from "ModuleApprovers" ma
                    inner join "DocumentModuleDrafts" dmd on dmd."DocumentModuleDraftID" = ma."DocumentModuleDraftID"
                    where dmd."IsDeleted" is not true and dmd."DocumentStatus" = 'InProgress'
                    group by dmd."DocumentModuleDraftID",dmd."DocumentName",dmd."NeedAcceptanceForApprover"
                    ),
                    CheckerUsers as (
                    SELECT "ModuleDraftID",
                    jsonb_agg(
                            jsonb_build_object(
                            'UserName',CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName"),
                            'UserID',"UserID",
                            'ApprovalStatus',"ApprovalStatus",
                            'Comment',"Comment"
                            )) as "UserDetails"
                            FROM (
                                SELECT ud."UserFirstName", ud."UserLastName", ud."UserMiddleName",
                                mc."Comment",mc."ApprovalStatus"::TEXT,ud."UserID",
                                COALESCE(mc."SOPDraftID",mc."DocumentModuleDraftID") as "ModuleDraftID"
                                FROM "ModuleCheckers" mc
                                INNER JOIN "UserDetails" ud on ud."UserID" = mc."UserID"
                                UNION ALL
                                SELECT ud."UserFirstName", ud."UserLastName", ud."UserMiddleName",
                                mc."Comment",mc."ApprovalStatus"::TEXT,ud."UserID",
                                COALESCE(mc."SOPDraftID",mc."DocumentModuleDraftID") as "ModuleDraftID"
                                FROM "ModuleEscalations" mc
                                INNER JOIN "UserDetails" ud on ud."UserID" = mc."UserID"
                                WHERE mc."IsReviewer" IS TRUE
                            ) checker_liks
                        WHERE "ModuleDraftID" IS NOT NULL
                        GROUP BY "ModuleDraftID"
                    ),
                    SteakHolderUsers as (
                    SELECT "ModuleDraftID",
                    jsonb_agg(
                            jsonb_build_object(
                            'UserName',CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName"),
                            'UserID',"UserID",
                            'ApprovalStatus',"ApprovalStatus",
                            'Comment',"Comment"
                            )) as "UserDetails"
                            FROM (
                                SELECT ud."UserFirstName", ud."UserLastName", ud."UserMiddleName",
                                mc."Comment",mc."ApprovalStatus"::TEXT,ud."UserID",
                                COALESCE(mc."SOPDraftID",mc."DocumentModuleDraftID") as "ModuleDraftID"
                                FROM "ModuleStakeHolders" mc
                                INNER JOIN "UserDetails" ud on ud."UserID" = mc."UserID"
                                UNION ALL
                                SELECT ud."UserFirstName", ud."UserLastName", ud."UserMiddleName",
                                mc."Comment",mc."ApprovalStatus"::TEXT,ud."UserID",
                                COALESCE(mc."SOPDraftID",mc."DocumentModuleDraftID") as "ModuleDraftID"
                                FROM "ModuleEscalations" mc
                                INNER JOIN "UserDetails" ud on ud."UserID" = mc."UserID"
                                WHERE mc."IsStakeHolder" IS TRUE
                            ) checker_liks
                        WHERE "ModuleDraftID" IS NOT NULL
                        GROUP BY "ModuleDraftID"
                    ),
                    ActionUsers as (
                    SELECT "ModuleDraftID",
                    jsonb_agg(
                            jsonb_build_object(
                            'UserName',CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName"),
                            'UserID',"UserID",
                            'ApprovalStatus',"ApprovalStatus",
                            'Comment',"Comment",
                            'UserType',"ActionType"
                            )) as "UserDetails"
                            FROM (
                                SELECT ud."UserFirstName", ud."UserLastName", ud."UserMiddleName",
                                mc."Comment",mc."ApprovalStatus"::TEXT,ud."UserID",'Checker' as "ActionType",
                                COALESCE(mc."SOPDraftID",mc."DocumentModuleDraftID") as "ModuleDraftID"
                                FROM "ModuleCheckers" mc
                                INNER JOIN "UserDetails" ud on ud."UserID" = mc."UserID"
                                WHERE mc."ApprovalStatus" IS NOT NULL
                                UNION ALL
                                SELECT ud."UserFirstName", ud."UserLastName", ud."UserMiddleName",
                                mc."Comment",mc."ApprovalStatus"::TEXT,ud."UserID",'StakeHolder' as "ActionType",
                                COALESCE(mc."SOPDraftID",mc."DocumentModuleDraftID") as "ModuleDraftID"
                                FROM "ModuleStakeHolders" mc
                                INNER JOIN "UserDetails" ud on ud."UserID" = mc."UserID"
                                WHERE mc."ApprovalStatus" IS NOT NULL
                                UNION ALL
                                SELECT ud."UserFirstName", ud."UserLastName", ud."UserMiddleName",
                                mc."Comment",mc."ApprovalStatus"::TEXT,ud."UserID",'Escalator' as "ActionType",
                                COALESCE(mc."SOPDraftID",mc."DocumentModuleDraftID") as "ModuleDraftID"
                                FROM "ModuleEscalations" mc
                                INNER JOIN "UserDetails" ud on ud."UserID" = mc."UserID"
                                WHERE mc."ApprovalStatus" IS NOT NULL
                                UNION ALL
                                SELECT ud."UserFirstName", ud."UserLastName", ud."UserMiddleName",
                                ma."Comment",ma."ApprovalStatus"::TEXT,ud."UserID",'Approver' as "ActionType",
                                COALESCE(ma."SOPDraftID",ma."DocumentModuleDraftID") as "ModuleDraftID"
                                FROM "ModuleApprovers" ma
                                INNER JOIN "UserDetails" ud on ud."UserID" = ma."UserID"
                                WHERE ma."ApprovalStatus" IS NOT NULL
                            ) checker_liks
                        WHERE "ModuleDraftID" IS NOT NULL
                        GROUP BY "ModuleDraftID"
                    ),
                    ApproverUsers as (
                    SELECT "ModuleDraftID",
                    jsonb_agg(
                            jsonb_build_object(
                            'UserName',CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName"),
                            'UserID',"UserID"
                            )) as "UserDetails"
                            FROM (
                                SELECT ud."UserFirstName", ud."UserLastName", ud."UserMiddleName",ud."UserID",
                                COALESCE(mc."SOPDraftID",mc."DocumentModuleDraftID") as "ModuleDraftID"
                                FROM "ModuleApprovers" mc
                                INNER JOIN "UserDetails" ud on ud."UserID" = mc."UserID"
                            ) approver_liks
                        WHERE "ModuleDraftID" IS NOT NULL
                        GROUP BY "ModuleDraftID"
                    ),
                    ReviewData as (
                    select
                        "UserID",
                        jsonb_agg(
                            jsonb_build_object(
                            'ModuleDraftID', "ModuleDraftID",
                            'ModuleName', "ModuleName",
                            'ModuleType', "ModuleType",
                            'EscalationDate', "EscalationDate",
                            'ActionType', "ActionType",
                            'Approver',"UserDetails",
                            'CreatedBy', CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
                            )
                        ) AS "ReviewState" from (
                        select cs."ModuleDraftID" ,cs."ModuleName",cs."ModuleType",cs."ActionType",cs."EscalationDate",mc."UserID",cu."UserDetails",
                        ud."UserFirstName",ud."UserLastName",ud."UserMiddleName" from "SopModuleDrafts" smd
                        inner join "ModuleCheckers" mc on mc."SOPDraftID" = smd."SOPDraftID"
                        INNER JOIN ApproverUsers cu on cu."ModuleDraftID" = smd."SOPDraftID"
                        inner join "UserDetails" ud on ud."UserID" = smd."CreatedBy"
                        INNER join CheckerSOP cs on  cs."ModuleDraftID" = smd."SOPDraftID"
						LEFT JOIN EscalatorSOP es ON es."ModuleDraftID" = smd."SOPDraftID"
                        WHERE mc."ApprovalStatus" is null and (cs."EscalationDate" >= CURRENT_TIMESTAMP OR es.total_count = 0 OR es.total_count IS NULL) 
                        AND CASE WHEN cs."NeedAcceptance" IS TRUE THEN cs.action_count != cs.total_count
                        WHEN cs."NeedAcceptance" IS NOT TRUE THEN cs.action_count = 0 ELSE false END
                        and cs.rn = 1 AND cs.reject_count = 0
                        group by cs."ModuleDraftID" ,cs."ModuleName",cs."ModuleType",cs."ActionType",cs."EscalationDate",mc."UserID",cu."UserDetails",ud."UserFirstName",ud."UserLastName",ud."UserMiddleName"

                        union all

                        select cd."ModuleDraftID" ,cd."ModuleName",cd."ModuleType",cd."ActionType",cd."EscalationDate",mc."UserID",cu."UserDetails",
                        ud."UserFirstName",ud."UserLastName",ud."UserMiddleName" from "DocumentModuleDrafts" dmd
                        inner join "ModuleCheckers" mc on mc."DocumentModuleDraftID" = dmd."DocumentModuleDraftID"
                        INNER JOIN ApproverUsers cu on cu."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        inner join "UserDetails" ud on ud."UserID" = dmd."CreatedBy"
                        INNER join CheckerDocument cd on  cd."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        LEFT JOIN SteakHolderDocument sd on sd."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        LEFT JOIN EscalatorDocumentForReviewer dr ON dr."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        LEFT JOIN EscalatorDocumentForSteakHolder ds ON ds."ModuleDraftID" = dmd."DocumentModuleDraftID"
						 WHERE mc."ApprovalStatus" is null AND (cd."EscalationDate" >= CURRENT_TIMESTAMP OR dr.total_count = 0 OR dr.total_count IS NULL) AND
						 CASE WHEN sd.total_count > 0 and sd."NeedAcceptance" IS TRUE AND sd.action_count = sd.total_count AND sd.reject_count = 0 THEN TRUE
						 WHEN sd.total_count > 0 and sd."NeedAcceptance" IS NOT TRUE AND sd.action_count > 0 AND sd.reject_count = 0 THEN TRUE
						 WHEN ds.total_count > 0 AND ds.action_count > 0 AND ds.reject_count = 0 THEN TRUE 
						 WHEN sd.total_count = 0 OR sd.total_count IS NULL THEN TRUE ELSE FALSE END AND
						 CASE WHEN cd."NeedAcceptance" IS TRUE AND cd.action_count != cd.total_count THEN TRUE
						 WHEN cd."NeedAcceptance" IS NOT TRUE AND cd.action_count = 0  THEN TRUE ELSE FALSE END
                        AND cd.rn = 1 AND cd.reject_count = 0
                        group by cd."ModuleDraftID" ,cd."ModuleName",cd."ModuleType",cd."ActionType",cd."EscalationDate",mc."UserID",cu."UserDetails",ud."UserFirstName",ud."UserLastName",ud."UserMiddleName"

                        union all

                        select es."ModuleDraftID" ,es."ModuleName",es."ModuleType",es."ActionType",es."EscalationDate",me."UserID",cu."UserDetails",
                        ud."UserFirstName",ud."UserLastName",ud."UserMiddleName" from "SopModuleDrafts" smd
                        inner join "ModuleEscalations" me on me."SOPDraftID" = smd."SOPDraftID"
                        inner join EscalatorSOP es on  es."ModuleDraftID" = smd."SOPDraftID"
                        inner join CheckerSOP cs on  cs."ModuleDraftID" = smd."SOPDraftID"
                        INNER JOIN ApproverUsers cu on cu."ModuleDraftID" = smd."SOPDraftID"
                        inner join "UserDetails" ud on ud."UserID" = smd."CreatedBy"
                        WHERE me."ApprovalStatus" is null and es."EscalationDate" < CURRENT_TIMESTAMP
                        and es.action_count = 0 AND cs.reject_count = 0 AND
                        CASE WHEN cs."NeedAcceptance" IS TRUE then cs.action_count != cs.total_count
                        WHEN cs."NeedAcceptance" IS NOT TRUE THEN cs.action_count = 0 ELSE false END
                        and es.rn = 1 AND es.reject_count = 0
                        group by es."ModuleDraftID" ,es."ModuleName",es."ModuleType",es."ActionType",es."EscalationDate",me."UserID",cu."UserDetails",ud."UserFirstName",ud."UserLastName",ud."UserMiddleName"

                        union all

                        select ed."ModuleDraftID" ,ed."ModuleName",ed."ModuleType",ed."ActionType",ed."EscalationDate",me."UserID",cu."UserDetails",
                        ud."UserFirstName",ud."UserLastName",ud."UserMiddleName" from "DocumentModuleDrafts" dmd
                        inner join "ModuleEscalations" me on me."DocumentModuleDraftID" = dmd."DocumentModuleDraftID"
                        inner join EscalatorDocumentForReviewer ed on  ed."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        inner join CheckerDocument cd on  cd."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        INNER JOIN ApproverUsers cu on cu."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        inner join "UserDetails" ud on ud."UserID" = dmd."CreatedBy"
						 LEFT JOIN SteakHolderDocument sd on sd."ModuleDraftID" = dmd."DocumentModuleDraftID"
						 LEFT JOIN EscalatorDocumentForSteakHolder ds ON ds."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        WHERE me."ApprovalStatus" is null and ed."EscalationDate" < CURRENT_TIMESTAMP
                        and ed.action_count = 0 AND cd.reject_count = 0 AND ed.reject_count = 0 AND
                        case when cd."NeedAcceptance" IS TRUE then cd.action_count != cd.total_count
                        when cd."NeedAcceptance" IS NOT TRUE then cd.action_count = 0 else false end and
						CASE WHEN sd.total_count > 0 and sd."NeedAcceptance" IS TRUE AND sd.action_count = sd.total_count AND sd.reject_count = 0 THEN TRUE
						 WHEN sd.total_count > 0 and sd."NeedAcceptance" IS NOT TRUE AND sd.action_count >0 AND sd.reject_count = 0 THEN TRUE
						 WHEN ds.total_count>0 AND ds.action_count > 0 AND ds.reject_count = 0 THEN TRUE 
						 WHEN sd.total_count = 0 OR sd.total_count IS NULL THEN TRUE ELSE FALSE END 
                        and ed.rn = 1 AND me."IsReviewer" IS TRUE
                        group by ed."ModuleDraftID" ,ed."ModuleName",ed."ModuleType",ed."ActionType",ed."EscalationDate",me."UserID",cu."UserDetails",ud."UserFirstName",ud."UserLastName",ud."UserMiddleName"
                    ) as review_data
                GROUP BY "UserID"
                ),
                StekHolderReviewData as (
                    select
                        "UserID",
                        jsonb_agg(
                            jsonb_build_object(
                            'ModuleDraftID', "ModuleDraftID",
                            'ModuleName', "ModuleName",
                            'ModuleType', "ModuleType",
                            'EscalationDate', "EscalationDate",
                            'ActionType', "ActionType",
                            'CreatedBy', CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName"),
                            'Approver',"UserDetails"
                            )
                        ) AS "ReviewState" from (
                    select cd."ModuleDraftID" ,cd."ModuleName",cd."ModuleType",cd."ActionType",cd."EscalationDate",mc."UserID",cu."UserDetails",
                    ud."UserFirstName",ud."UserLastName",ud."UserMiddleName" from "DocumentModuleDrafts" dmd
                        inner join "ModuleStakeHolders" mc on mc."DocumentModuleDraftID" = dmd."DocumentModuleDraftID"
                        inner join SteakHolderDocument cd on  cd."ModuleDraftID" = dmd."DocumentModuleDraftID"
						LEFT JOIN EscalatorDocumentForSteakHolder ds ON ds."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        LEFT JOIN CheckerUsers cu on cu."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        inner join "UserDetails" ud on ud."UserID" = dmd."CreatedBy"
                        WHERE mc."ApprovalStatus" is null and (cd."EscalationDate" >= CURRENT_TIMESTAMP OR ds.total_count = 0 OR ds.total_count IS NULL) AND
						CASE WHEN cd."NeedAcceptance" IS TRUE AND cd.action_count != cd.total_count THEN TRUE
						 WHEN cd."NeedAcceptance" IS NOT TRUE AND cd.action_count = 0 THEN TRUE ELSE FALSE END
                        and cd.rn = 1 AND cd.reject_count = 0
                        group by cd."ModuleDraftID" ,cd."ModuleName",cd."ModuleType",cd."ActionType",cd."EscalationDate",mc."UserID",ud."UserFirstName",ud."UserLastName",ud."UserMiddleName",cu."UserDetails"
                        union all
                        select es."ModuleDraftID" ,es."ModuleName",es."ModuleType",es."ActionType",es."EscalationDate",me."UserID",cu."UserDetails",
                        ud."UserFirstName",ud."UserLastName",ud."UserMiddleName" from "DocumentModuleDrafts" dmd
                        inner join "ModuleEscalations" me on me."DocumentModuleDraftID" = dmd."DocumentModuleDraftID"
                        INNER JOIN EscalatorDocumentForSteakHolder ds ON ds."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        inner join SteakHolderDocument es on es."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        inner join "UserDetails" ud on ud."UserID" = dmd."CreatedBy"
                        LEFT JOIN CheckerUsers cu on cu."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        WHERE me."ApprovalStatus" is null and es."EscalationDate" < CURRENT_TIMESTAMP and ds.action_count = 0 AND es.reject_count = 0 AND
                        CASE WHEN es."NeedAcceptance" IS TRUE AND es.action_count != es.total_count THEN TRUE
                        WHEN es."NeedAcceptance" IS NOT TRUE AND es.action_count = 0 THEN TRUE ELSE FALSE END
                        and ds.rn = 1 AND me."IsStakeHolder" IS TRUE AND ds.reject_count = 0
                        group by es."ModuleDraftID" ,es."ModuleName",es."ModuleType",es."ActionType",es."EscalationDate",me."UserID",cu."UserDetails",ud."UserFirstName",ud."UserLastName",ud."UserMiddleName"
                    ) as review_data
                GROUP BY "UserID"
                ),
                ApproverData as (
                    select
                        "UserID",
                        jsonb_agg(
                            jsonb_build_object(
                            'ModuleDraftID', "ModuleDraftID",
                            'ModuleName', "ModuleName",
                            'ModuleType', "ModuleType",
                            'ActionType', "ActionType",
                            'EscalationDate', "ActionDate",
                            'Checkers',"UserDetails",
                            'CreatedBy', CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
                            )
                        ) AS "PendingApproval" from (
                        select asd."ModuleDraftID" ,asd."ModuleName",asd."ModuleType",asd."ActionType",ma."UserID",cu."UserDetails",
                        ud."UserFirstName",ud."UserLastName",ud."UserMiddleName",
                        case when es."ActionDate" is not null then es."ActionDate" else cs."ActionDate" end as "ActionDate" from "SopModuleDrafts" smd
                        inner join "ModuleApprovers" ma on ma."SOPDraftID" = smd."SOPDraftID"
                        INNER join AproverSOP asd on  asd."ModuleDraftID" = smd."SOPDraftID"
                        inner join CheckerUsers cu on cu."ModuleDraftID" = smd."SOPDraftID"
                        inner join "UserDetails" ud on ud."UserID" = smd."CreatedBy"
                        LEFT join CheckerSOP cs on  cs."ModuleDraftID" = smd."SOPDraftID"
                        LEFT join EscalatorSOP es on  es."ModuleDraftID" = smd."SOPDraftID"
                        WHERE ma."ApprovalStatus" is null AND asd.reject_count = 0 AND
						CASE WHEN asd."NeedAcceptance" IS TRUE AND asd.action_count != asd.total_count THEN TRUE
						WHEN asd."NeedAcceptance" IS NOT TRUE AND asd.action_count = 0 THEN TRUE ELSE FALSE END AND
						CASE WHEN cs.total_count > 0 AND  cs."NeedAcceptance" IS TRUE AND cs.action_count = cs.total_count AND cs.reject_count = 0 THEN TRUE
						WHEN cs.total_count > 0 AND  cs."NeedAcceptance" IS NOT TRUE AND cs.action_count > 0 AND cs.reject_count = 0 THEN TRUE
						WHEN cs.total_count > 0 AND es.total_count > 0 AND es.action_count > 0 AND es.reject_count = 0 THEN TRUE
						WHEN cs.total_count = 0 OR cs.total_count IS NULL THEN TRUE ELSE FALSE END AND asd.rn = 1
                        group by asd."ModuleDraftID" ,asd."ModuleName",asd."ModuleType",asd."ActionType",ma."UserID",cu."UserDetails",
                        ud."UserFirstName",ud."UserLastName",ud."UserMiddleName",
                        case when es."ActionDate" is not null then es."ActionDate" else cs."ActionDate" end

                        union all
                        select ad."ModuleDraftID" ,ad."ModuleName",ad."ModuleType",ad."ActionType",ma."UserID",cu."UserDetails",
                        ud."UserFirstName",ud."UserLastName",ud."UserMiddleName",
                        case when dr."ActionDate" is not null then dr."ActionDate" else cd."ActionDate" end as "ActionDate" from "DocumentModuleDrafts" dmd
                        inner join "ModuleApprovers" ma on ma."DocumentModuleDraftID" = dmd."DocumentModuleDraftID"
                        inner join AproverDocument ad on  ad."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        left join CheckerUsers cu on cu."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        inner join "UserDetails" ud on ud."UserID" = dmd."CreatedBy"
                        LEFT join CheckerDocument cd on  cd."ModuleDraftID" = dmd."DocumentModuleDraftID"
						LEFT join SteakHolderDocument sd on  sd."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        LEFT JOIN EscalatorDocumentForReviewer dr ON dr."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        LEFT JOIN EscalatorDocumentForSteakHolder ds ON ds."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        WHERE ma."ApprovalStatus" is null and ad.reject_count = 0 and
						CASE WHEN ad."NeedAcceptance" IS TRUE AND ad.action_count != ad.total_count THEN TRUE
						WHEN ad."NeedAcceptance" IS NOT TRUE AND ad.action_count = 0 THEN TRUE ELSE FALSE END AND
						CASE WHEN cd.total_count > 0 AND  cd."NeedAcceptance" IS TRUE AND cd.action_count = cd.total_count AND cd.reject_count = 0 THEN TRUE
						WHEN cd.total_count > 0 AND  cd."NeedAcceptance" IS NOT TRUE AND cd.action_count > 0 AND cd.reject_count = 0 THEN TRUE
						WHEN cd.total_count > 0 AND dr.total_count > 0 AND dr.action_count > 0 AND dr.reject_count = 0 THEN TRUE
						WHEN cd.total_count = 0 OR cd.total_count IS NULL THEN TRUE ELSE FALSE END AND
						CASE WHEN sd.total_count > 0 AND  sd."NeedAcceptance" IS TRUE AND sd.action_count = sd.total_count AND sd.reject_count = 0 THEN TRUE
						WHEN sd.total_count > 0 AND  sd."NeedAcceptance" IS NOT TRUE AND sd.action_count > 0 AND sd.reject_count = 0 THEN TRUE
						WHEN sd.total_count > 0 AND ds.total_count > 0 AND ds.action_count > 0 AND ds.reject_count = 0 THEN TRUE
						WHEN sd.total_count = 0 OR sd.total_count IS NULL THEN TRUE ELSE FALSE END AND ad.rn = 1
                        group by ad."ModuleDraftID" ,ad."ModuleName",ad."ModuleType",ad."ActionType",ma."UserID",cu."UserDetails",
                        ud."UserFirstName",ud."UserLastName",ud."UserMiddleName",
                        case when dr."ActionDate" is not null then dr."ActionDate" else cd."ActionDate" end
                    ) as approver_data
                GROUP BY "UserID"
                ),
                MyEscalatorData as (
                        select
                        "UserID",
                        jsonb_agg(
                            jsonb_build_object(
                            'ModuleDraftID', "ModuleDraftID",
                            'ModuleName', "ModuleName",
                            'ModuleType', "ModuleType",
                            'EscalationDate', "EscalationDate",
                            'CreatedBy', CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
                            )
                        ) AS "MyEscalated" from (
                        select cs."ModuleDraftID" ,cs."ModuleName",cs."ModuleType",cs."ActionType",cs."EscalationDate",mc."UserID",
                        ud."UserFirstName",ud."UserLastName",ud."UserMiddleName"
                        from "SopModuleDrafts" smd
                        inner join "ModuleCheckers" mc on mc."SOPDraftID" = smd."SOPDraftID"
                        inner join CheckerSOP cs on  cs."ModuleDraftID" = smd."SOPDraftID"
                        inner join EscalatorSOP es on  es."ModuleDraftID" = smd."SOPDraftID"
                        inner join "UserDetails" ud on ud."UserID" = smd."CreatedBy"
                        where cs."EscalationDate" < CURRENT_TIMESTAMP AND es.action_count = 0
                        and mc."ApprovalStatus" is null and cs.rn = 1
                        group by cs."ModuleDraftID" ,cs."ModuleName",cs."ModuleType",cs."ActionType",cs."EscalationDate",mc."UserID",ud."UserFirstName",ud."UserLastName",ud."UserMiddleName"

                        union all

                        select cd."ModuleDraftID" ,cd."ModuleName",cd."ModuleType",cd."ActionType",cd."EscalationDate",mc."UserID",
                        ud."UserFirstName",ud."UserLastName",ud."UserMiddleName"
                        from "DocumentModuleDrafts" dmd
                        inner join "ModuleCheckers" mc on mc."DocumentModuleDraftID" = dmd."DocumentModuleDraftID"
                        inner join CheckerDocument cd on  cd."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        inner join SteakHolderDocument sd on  sd."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        inner join EscalatorDocumentForSteakHolder eds on  eds."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        inner join EscalatorDocumentForReviewer edr on  edr."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        inner join "UserDetails" ud on ud."UserID" = dmd."CreatedBy"
                        WHERE mc."ApprovalStatus" is null and COALESCE(cd."EscalationDate", sd."EscalationDate") < CURRENT_TIMESTAMP and (eds.action_count = 0 OR edr.action_count = 0)
                        and cd.rn = 1
                        group by cd."ModuleDraftID" ,cd."ModuleName",cd."ModuleType",cd."ActionType",cd."EscalationDate",mc."UserID",ud."UserFirstName",ud."UserLastName",ud."UserMiddleName"
                ) as escalator_data
                GROUP BY "UserID"
                ),
                OngoingReview as (
                        select
                        "UserID",
                        jsonb_agg(
                            jsonb_build_object(
                            'ModuleDraftID', "ModuleDraftID",
                            'ModuleName', "ModuleName",
                            'ModuleType', "ModuleType",
                            'EscalationDate', "EscalationDate",
                            'CreatedBy', CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
                            )
                        ) AS "OngoingReview" from (
                        select cs."ModuleDraftID" ,cs."ModuleName",cs."ModuleType",cs."ActionType",cs."EscalationDate",mc."UserID",
                        ud."UserFirstName",ud."UserLastName",ud."UserMiddleName"
                        from "SopModuleDrafts" smd
                        inner join "ModuleCheckers" mc on mc."SOPDraftID" = smd."SOPDraftID"
                        inner join CheckerSOP cs on  cs."ModuleDraftID" = smd."SOPDraftID"
                        inner join EscalatorSOP es on  es."ModuleDraftID" = smd."SOPDraftID"
                        inner join "UserDetails" ud on ud."UserID" = smd."CreatedBy"
                        WHERE es.action_count = 0 and cs.reject_count = 0
                        and case when cs."NeedAcceptance" IS TRUE then cs.action_count != cs.total_count
                        when cs."NeedAcceptance" IS NOT TRUE then cs.action_count = 0 else false end
                        and cs.rn = 1
                        group by cs."ModuleDraftID" ,cs."ModuleName",cs."ModuleType",cs."ActionType",cs."EscalationDate",mc."UserID",ud."UserFirstName",ud."UserLastName",ud."UserMiddleName"
                        union all
                        select cd."ModuleDraftID" ,cd."ModuleName",cd."ModuleType",cd."ActionType",cd."EscalationDate",mc."UserID",
                        ud."UserFirstName",ud."UserLastName",ud."UserMiddleName"
                        from "DocumentModuleDrafts" dmd
                        inner join "ModuleCheckers" mc on mc."DocumentModuleDraftID" = dmd."DocumentModuleDraftID"
                        inner join CheckerDocument cd on  cd."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        inner join EscalatorDocumentForReviewer ed on  ed."ModuleDraftID" = dmd."DocumentModuleDraftID"
                        inner join "UserDetails" ud on ud."UserID" = dmd."CreatedBy"
                        WHERE ed.action_count = 0 and cd.reject_count = 0
                        and case when cd."NeedAcceptance" IS TRUE then cd.action_count != cd.total_count
                        when cd."NeedAcceptance" IS NOT TRUE then cd.action_count = 0 else false end
                        and cd.rn = 1
                        group by cd."ModuleDraftID" ,cd."ModuleName",cd."ModuleType",cd."ActionType",cd."EscalationDate",mc."UserID",ud."UserFirstName",ud."UserLastName",ud."UserMiddleName"
                ) as ongoing_review_data
                GROUP BY "UserID"
                ),
                ApprovedData as (
                    SELECT "UserID",jsonb_agg(
                                jsonb_build_object(
                                    'ModuleDraftID', "ModuleDraftID",
                                    'ModuleName', "ModuleName",
                                    'ModuleType', "ModuleType",
                                    'EscalationDate', "EscalationDate",
                                    'ActionType', 'Approved',
                                    'CreatedBy', "CreatedUser"
                                )
                            ) AS "Approved" FROM (
                            SELECT
                                COALESCE("UserID","CreatedBy") AS "UserID", "ModuleDraftID", "ModuleName","ModuleType", COALESCE("ModifiedDate", "CreatedDate") AS "EscalationDate", 
                                CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName") AS "CreatedUser"
                            from (
                                select ma."SOPDraftID" AS"ModuleDraftID" ,smd."SOPName" AS "ModuleName",'SOP' AS "ModuleType",ma."UserID",smd."ModifiedDate",smd."CreatedBy",smd."CreatedDate",
                                ud."UserFirstName",ud."UserLastName",ud."UserMiddleName",
                                ROW_NUMBER() OVER (PARTITION BY smd."SOPID" ORDER BY COALESCE(smd."ModifiedDate", smd."CreatedDate") DESC) AS rn from "SopModuleDrafts" smd
                                left join "ModuleOwners" ma on ma."SOPDraftID" = smd."SOPDraftID"
                                inner join "UserDetails" ud on ud."UserID" = smd."CreatedBy"
                                Where smd."SOPStatus" = 'Published' and smd."IsDeleted" = false
                                group by ma."SOPDraftID" ,smd."SOPName",ma."UserID",smd."ModifiedDate",smd."CreatedBy",smd."SOPID",smd."CreatedDate",ud."UserFirstName",ud."UserLastName",ud."UserMiddleName"
                                union all
                                select ma."DocumentModuleDraftID" AS "ModuleDraftID" ,dmd."DocumentName" AS "ModuleName",'Document' AS "ModuleType",ma."UserID",dmd."ModifiedDate",dmd."CreatedBy",dmd."CreatedDate",
                                ud."UserFirstName",ud."UserLastName",ud."UserMiddleName",
                                ROW_NUMBER() OVER (PARTITION BY dmd."DocumentID" ORDER BY COALESCE(dmd."ModifiedDate", dmd."CreatedDate") DESC) AS rn from "DocumentModuleDrafts" dmd
                                left join "ModuleOwners" ma on ma."DocumentModuleDraftID" = dmd."DocumentModuleDraftID"
                                inner join "UserDetails" ud on ud."UserID" = dmd."CreatedBy"
                                Where dmd."DocumentStatus" = 'Published' and dmd."IsDeleted" = false
                                group by ma."DocumentModuleDraftID" ,dmd."DocumentName",ma."UserID",dmd."ModifiedDate",dmd."CreatedBy",dmd."DocumentID",dmd."CreatedDate",ud."UserFirstName",ud."UserLastName",ud."UserMiddleName"
                        ) as approved_data
                        WHERE rn = 1
                        GROUP BY "UserID", "CreatedBy", "ModuleDraftID", "ModuleName","ModuleType", "ModifiedDate", "CreatedDate", "UserFirstName", "UserLastName", "UserMiddleName"
                    ) AS final_approved_data GROUP BY "UserID"
                ),
               MyCompletion as (
    SELECT
    "UserID",
            jsonb_agg(
                jsonb_build_object(
                'ModuleDraftID', "ModuleDraftID",
                'ModuleName', "ModuleName",
                'ModuleType', "ModuleType",
                'EscalationDate', "ModifiedDate",
                'CreatedBy', CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName"),
                'Actioner',"UserDetails",
                'ActionType', "ActionType",
                'IsDeleted', "IsDeleted"
                )
            ) AS "MyCompletion" FROM (
    SELECT COALESCE(mc."SOPDraftID", mc."DocumentModuleDraftID") AS "ModuleDraftID",
    COALESCE(smd."SOPName", dmd."DocumentName") AS "ModuleName",'Checker' AS "ActionType",
    CASE
        WHEN mc."SOPDraftID" IS NOT NULL THEN 'SOP'
        WHEN mc."DocumentModuleDraftID" IS NOT NULL THEN 'Document'
        ELSE NULL
    END AS "ModuleType",mc."ModifiedDate",au."UserDetails",
    mc."UserID",ud."UserFirstName", ud."UserLastName", ud."UserMiddleName",
    COALESCE(smd."IsDeleted", dmd."IsDeleted", false) AS "IsDeleted"
    FROM "ModuleCheckers" mc
    INNER JOIN "UserDetails" ud ON ud."UserID" = mc."CreatedBy"
    LEFT JOIN "SopModuleDrafts" smd ON smd."SOPDraftID" = mc."SOPDraftID"
    LEFT JOIN "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
    LEFT JOIN ActionUsers au ON au."ModuleDraftID" = COALESCE(mc."SOPDraftID", mc."DocumentModuleDraftID")
    WHERE mc."ApprovalStatus" is not null
    GROUP BY mc."SOPDraftID", mc."DocumentModuleDraftID", smd."SOPName", dmd."DocumentName", mc."ModifiedDate", mc."UserID", ud."UserFirstName", ud."UserLastName", ud."UserMiddleName", au."UserDetails", COALESCE(smd."IsDeleted", dmd."IsDeleted", false)

    UNION ALL

    SELECT ma."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName",'StakeHolder' AS "ActionType",
    'Document' AS "ModuleType",ma."ModifiedDate",au."UserDetails",
    ma."UserID",ud."UserFirstName", ud."UserLastName", ud."UserMiddleName",
    COALESCE(dmd."IsDeleted", false) AS "IsDeleted"
    FROM "ModuleStakeHolders" ma
    INNER JOIN "UserDetails" ud ON ud."UserID" = ma."CreatedBy"
    LEFT JOIN "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = ma."DocumentModuleDraftID"
    LEFT JOIN ActionUsers au ON au."ModuleDraftID" = ma."DocumentModuleDraftID"
    WHERE ma."ApprovalStatus" is not null
    GROUP BY ma."SOPDraftID", ma."DocumentModuleDraftID", dmd."DocumentName", ma."ModifiedDate", ma."UserID", ud."UserFirstName", ud."UserLastName", ud."UserMiddleName", au."UserDetails", COALESCE(dmd."IsDeleted", false)

    UNION ALL

    SELECT COALESCE(ma."SOPDraftID", ma."DocumentModuleDraftID") AS "ModuleDraftID",
    COALESCE(smd."SOPName", dmd."DocumentName") AS "ModuleName",'Escalator' AS "ActionType",
    CASE
        WHEN ma."SOPDraftID" IS NOT NULL THEN 'SOP'
        WHEN ma."DocumentModuleDraftID" IS NOT NULL THEN 'Document'
        ELSE NULL
    END AS "ModuleType",ma."ModifiedDate",au."UserDetails",
    ma."UserID",ud."UserFirstName", ud."UserLastName", ud."UserMiddleName",
    COALESCE(smd."IsDeleted", dmd."IsDeleted", false) AS "IsDeleted"
    FROM "ModuleEscalations" ma
    INNER JOIN "UserDetails" ud ON ud."UserID" = ma."CreatedBy"
    LEFT JOIN "SopModuleDrafts" smd ON smd."SOPDraftID" = ma."SOPDraftID"
    LEFT JOIN "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = ma."DocumentModuleDraftID"
    LEFT JOIN ActionUsers au ON au."ModuleDraftID" = COALESCE(ma."SOPDraftID", ma."DocumentModuleDraftID")
    WHERE ma."ApprovalStatus" is not null
    GROUP BY ma."SOPDraftID", ma."DocumentModuleDraftID", smd."SOPName", dmd."DocumentName", ma."ModifiedDate", ma."UserID", ud."UserFirstName", ud."UserLastName", ud."UserMiddleName",au."UserDetails", COALESCE(smd."IsDeleted", dmd."IsDeleted", false)

    UNION ALL

    SELECT COALESCE(ma."SOPDraftID", ma."DocumentModuleDraftID") AS "ModuleDraftID",
    COALESCE(smd."SOPName", dmd."DocumentName") AS "ModuleName",'Approver' AS "ActionType",
    CASE
        WHEN ma."SOPDraftID" IS NOT NULL THEN 'SOP'
        WHEN ma."DocumentModuleDraftID" IS NOT NULL THEN 'Document'
        ELSE NULL
    END AS "ModuleType",ma."ModifiedDate",au."UserDetails",
    ma."UserID",ud."UserFirstName", ud."UserLastName", ud."UserMiddleName",
    COALESCE(smd."IsDeleted", dmd."IsDeleted", false) AS "IsDeleted"
    FROM "ModuleApprovers" ma
    INNER JOIN "UserDetails" ud ON ud."UserID" = ma."CreatedBy"
    LEFT JOIN "SopModuleDrafts" smd ON smd."SOPDraftID" = ma."SOPDraftID"
    LEFT JOIN "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = ma."DocumentModuleDraftID"
    LEFT JOIN ActionUsers au ON au."ModuleDraftID" = COALESCE(ma."SOPDraftID", ma."DocumentModuleDraftID")
    WHERE ma."ApprovalStatus" is not null
    GROUP BY ma."SOPDraftID", ma."DocumentModuleDraftID", smd."SOPName", dmd."DocumentName", ma."ModifiedDate", ma."UserID", ud."UserFirstName", ud."UserLastName", ud."UserMiddleName",au."UserDetails", COALESCE(smd."IsDeleted", dmd."IsDeleted", false)
    ) AS my_completion_data
    WHERE "ModuleDraftID" IS NOT NULL AND "ModuleName" IS NOT NULL
    GROUP BY "UserID"
),

                AutherSteakHolder AS (
                SELECT "CreatedBy", jsonb_agg(
                    jsonb_build_object(
                    'ModuleDraftID', "ModuleDraftID",
                    'ModuleName', "ModuleName",
                    'ModuleType', "ModuleType",
                    'EscalationDate', "EscalationDate",
                    'SteakHolders',"UserDetails"
                )) AS "SteakHolders" FROM (
                SELECT dmd."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName", 'Document' AS "ModuleType",
                dmd."CreatedBy",sd."EscalationDate" AS "EscalationDate",su."UserDetails"
                FROM "DocumentModuleDrafts" dmd
                LEFT JOIN SteakHolderDocument sd ON sd."ModuleDraftID" = dmd."DocumentModuleDraftID"
                LEFT JOIN SteakHolderUsers su ON su."ModuleDraftID" = dmd."DocumentModuleDraftID"
                    WHERE dmd."IsDeleted" = false AND dmd."DocumentStatus" = 'InProgress'
                    AND sd.rn = 1 AND (sd."EscalationDate" >= CURRENT_TIMESTAMP OR dmd."StakeHolderEscalationType" IS NULL OR dmd."StakeHolderEscalationAfter" IS NULL)
                    AND CASE WHEN sd."NeedAcceptance" IS TRUE THEN sd.action_count != sd.total_count
                    WHEN sd."NeedAcceptance" IS NOT TRUE THEN sd.action_count = 0 ELSE false END
                    GROUP BY dmd."DocumentModuleDraftID", dmd."DocumentName", dmd."CreatedBy", sd."EscalationDate", su."UserDetails"

                    UNION ALL

                SELECT dmd."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName", 'Document' AS "ModuleType",
                dmd."CreatedBy",ed."EscalationDate" AS "EscalationDate",su."UserDetails"
                FROM "DocumentModuleDrafts" dmd
                    LEFT JOIN SteakHolderDocument sd ON sd."ModuleDraftID" = dmd."DocumentModuleDraftID"
                    LEFT JOIN EscalatorDocumentForSteakHolder ed ON ed."ModuleDraftID" = dmd."DocumentModuleDraftID"
                    LEFT JOIN SteakHolderUsers su ON su."ModuleDraftID" = dmd."DocumentModuleDraftID"
                    WHERE dmd."IsDeleted" = false AND dmd."DocumentStatus" = 'InProgress'
                    AND ed.action_count = 0 AND sd.rn = 1 AND sd."EscalationDate" < CURRENT_TIMESTAMP AND dmd."EscalationType" IS NOT NULL AND dmd."EscalationAfter" IS NOT NULL
                    AND CASE WHEN sd."NeedAcceptance" IS TRUE THEN sd.action_count != sd.total_count
                    WHEN sd."NeedAcceptance" IS NOT TRUE THEN sd.action_count = 0 ELSE false END
                    GROUP BY dmd."DocumentModuleDraftID", dmd."DocumentName", dmd."CreatedBy", ed."EscalationDate", su."UserDetails"
                ) steakholders GROUP BY "CreatedBy"
                ),

                AutherReviewer AS (
                SELECT "CreatedBy", jsonb_agg(
                    jsonb_build_object(
                    'ModuleDraftID', "ModuleDraftID",
                    'ModuleName', "ModuleName",
                    'ModuleType', "ModuleType",
                    'EscalationDate', "EscalationDate",
                    'Reviewers',"UserDetails"
                )) AS "Reviewers" FROM (
                    SELECT smd."SOPDraftID" AS "ModuleDraftID", smd."SOPName" AS "ModuleName", 'SOP' AS "ModuleType",
                    smd."CreatedBy", cs."EscalationDate" AS "EscalationDate", su."UserDetails"
                    FROM "SopModuleDrafts" smd
                    LEFT JOIN CheckerSOP cs ON cs."ModuleDraftID" = smd."SOPDraftID"
                    LEFT JOIN ActionUsers su ON su."ModuleDraftID" = smd."SOPDraftID"
                    WHERE smd."SOPStatus" = 'InProgress' AND smd."IsDeleted" = false
                    AND cs.rn = 1 AND (cs."EscalationDate" >= CURRENT_TIMESTAMP OR smd."EscalationType" IS NULL OR smd."EscalationAfter" IS NULL)
                    AND CASE WHEN cs."NeedAcceptance" IS TRUE THEN cs.action_count != cs.total_count
                    WHEN cs."NeedAcceptance" IS NOT TRUE THEN cs.action_count = 0 ELSE false END
                    GROUP BY smd."SOPDraftID", smd."SOPName", smd."CreatedBy", cs."EscalationDate", su."UserDetails"
                    UNION ALL
                    SELECT dmd."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName", 'Document' AS "ModuleType",
                    dmd."CreatedBy", cd."EscalationDate" AS "EscalationDate", su."UserDetails"
                    FROM "DocumentModuleDrafts" dmd
                    LEFT JOIN CheckerDocument cd ON cd."ModuleDraftID" = dmd."DocumentModuleDraftID"
                    LEFT JOIN ActionUsers su ON su."ModuleDraftID" = dmd."DocumentModuleDraftID"
                    WHERE dmd."DocumentStatus" = 'InProgress' AND dmd."IsDeleted" = false
                    AND (cd.rn = 1 AND (cd."EscalationDate" >= CURRENT_TIMESTAMP OR dmd."EscalationType" IS NULL OR dmd."EscalationAfter" IS NULL))
                    AND CASE WHEN cd."NeedAcceptance" IS TRUE THEN cd.action_count != cd.total_count
                    WHEN cd."NeedAcceptance" IS NOT TRUE THEN cd.action_count = 0 ELSE false END
                    GROUP BY dmd."DocumentModuleDraftID", dmd."DocumentName", dmd."CreatedBy", cd."EscalationDate", su."UserDetails"
                    UNION ALL
                    SELECT smd."SOPDraftID" AS "ModuleDraftID", smd."SOPName" AS "ModuleName", 'SOP' AS "ModuleType",
                    smd."CreatedBy", es."EscalationDate" AS "EscalationDate", su."UserDetails"
                    FROM "SopModuleDrafts" smd
                    LEFT JOIN EscalatorSOP es ON es."ModuleDraftID" = smd."SOPDraftID"
                    LEFT JOIN CheckerSOP cs ON cs."ModuleDraftID" = smd."SOPDraftID"
                    LEFT JOIN ActionUsers su ON su."ModuleDraftID" = smd."SOPDraftID"
                    WHERE smd."SOPStatus" = 'InProgress' AND smd."IsDeleted" = false
                    AND es.action_count = 0 AND es.rn = 1 AND es."EscalationDate" < CURRENT_TIMESTAMP AND smd."EscalationType" IS NOT NULL AND smd."EscalationAfter" IS NOT NULL
                    AND CASE WHEN cs."NeedAcceptance" IS TRUE THEN cs.action_count != cs.total_count
                    WHEN cs."NeedAcceptance" IS NOT TRUE THEN cs.action_count = 0 ELSE false END
                    GROUP BY smd."SOPDraftID", smd."SOPName", smd."CreatedBy", es."EscalationDate", su."UserDetails"
                    UNION ALL
                    SELECT dmd."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName", 'Document' AS "ModuleType",
                    dmd."CreatedBy", ed."EscalationDate" AS "EscalationDate", su."UserDetails"
                    FROM "DocumentModuleDrafts" dmd
                    LEFT JOIN EscalatorDocumentForReviewer ed ON ed."ModuleDraftID" = dmd."DocumentModuleDraftID"
                    LEFT JOIN CheckerDocument cd ON cd."ModuleDraftID" = dmd."DocumentModuleDraftID"
                    LEFT JOIN ActionUsers su ON su."ModuleDraftID" = dmd."DocumentModuleDraftID"
                    WHERE dmd."DocumentStatus" = 'InProgress' AND dmd."IsDeleted" = false
                    AND ed.action_count = 0 AND ed.rn = 1 AND ed."EscalationDate" < CURRENT_TIMESTAMP AND dmd."EscalationType" IS NOT NULL AND dmd."EscalationAfter" IS NOT NULL
                    AND CASE WHEN cd."NeedAcceptance" IS TRUE THEN cd.action_count != cd.total_count
                    WHEN cd."NeedAcceptance" IS NOT TRUE THEN cd.action_count = 0 ELSE false END
                GROUP BY dmd."DocumentModuleDraftID", dmd."DocumentName", dmd."CreatedBy", ed."EscalationDate", su."UserDetails"
                ) reviewers GROUP BY "CreatedBy"
                ),
                AutherReviewed AS (
                    SELECT "CreatedBy", jsonb_agg(
                    jsonb_build_object(
                    'ModuleDraftID', "ModuleDraftID",
                    'ModuleName', "ModuleName",
                    'ModuleType', "ModuleType",
                    'ReviewedDate', "EscalationDate",
                    'ReviewedBy',"UserDetails")) AS "Reviewed" FROM (
                    SELECT smd."SOPDraftID" AS "ModuleDraftID", smd."SOPName" AS "ModuleName", 'SOP' AS "ModuleType",
                    smd."CreatedBy", MAX(cs."ActionDate") AS "EscalationDate", su."UserDetails"
                    FROM "SopModuleDrafts" smd
                    LEFT JOIN CheckerSOP cs ON cs."ModuleDraftID" = smd."SOPDraftID"
                    LEFT JOIN ActionUsers su ON su."ModuleDraftID" = smd."SOPDraftID"
                    WHERE smd."SOPStatus" = 'InProgress' AND smd."IsDeleted" = false
                    AND cs.rn = 1 AND CASE WHEN cs."NeedAcceptance" IS TRUE THEN cs.action_count = cs.total_count
                    WHEN cs."NeedAcceptance" IS NOT TRUE THEN cs.action_count > 0 ELSE false END
                    AND cs.reject_count = 0
                    GROUP BY smd."SOPDraftID", smd."SOPName", smd."CreatedBy", su."UserDetails"
                    UNION ALL
                    SELECT dmd."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName", 'Document' AS "ModuleType",
                    dmd."CreatedBy", MAX(cd."ActionDate") AS "EscalationDate", su."UserDetails"
                    FROM "DocumentModuleDrafts" dmd
                    LEFT JOIN CheckerDocument cd ON cd."ModuleDraftID" = dmd."DocumentModuleDraftID"
                    LEFT JOIN ActionUsers su ON su."ModuleDraftID" = dmd."DocumentModuleDraftID"
                    WHERE dmd."DocumentStatus" = 'InProgress' AND dmd."IsDeleted" = false
                    AND cd.rn = 1 AND CASE WHEN cd."NeedAcceptance" IS TRUE THEN cd.action_count = cd.total_count
                    WHEN cd."NeedAcceptance" IS NOT TRUE THEN cd.action_count > 0 ELSE false END
                    AND cd.reject_count = 0
                    GROUP BY dmd."DocumentModuleDraftID", dmd."DocumentName", dmd."CreatedBy", su."UserDetails"
                    UNION ALL
                    SELECT smd."SOPDraftID" AS "ModuleDraftID", smd."SOPName" AS "ModuleName", 'SOP' AS "ModuleType",
                    smd."CreatedBy", MAX(es."ActionDate") AS "EscalationDate", su."UserDetails"
                    FROM "SopModuleDrafts" smd
                    LEFT JOIN EscalatorSOP es ON es."ModuleDraftID" = smd."SOPDraftID"
                    LEFT JOIN ActionUsers su ON su."ModuleDraftID" = smd."SOPDraftID"
                    WHERE smd."SOPStatus" = 'InProgress' AND smd."IsDeleted" = false
                    AND es.action_count > 0 AND es.rn = 1
                    GROUP BY smd."SOPDraftID", smd."SOPName", smd."CreatedBy", su."UserDetails"
                    UNION ALL
                    SELECT dmd."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName", 'Document' AS "ModuleType",
                    dmd."CreatedBy", MAX(ed."ActionDate") AS "EscalationDate", su."UserDetails"
                    FROM "DocumentModuleDrafts" dmd
                    LEFT JOIN EscalatorDocumentForReviewer ed ON ed."ModuleDraftID" = dmd."DocumentModuleDraftID"
                    LEFT JOIN ActionUsers su ON su."ModuleDraftID" = dmd."DocumentModuleDraftID"
                    WHERE dmd."DocumentStatus" = 'InProgress' AND dmd."IsDeleted" = false
                    AND ed.action_count > 0 AND ed.rn = 1
                    GROUP BY dmd."DocumentModuleDraftID", dmd."DocumentName", dmd."CreatedBy", su."UserDetails"
                ) reviewed GROUP BY "CreatedBy"
                ),
                AssignCounts AS (
                SELECT COUNT(*) AS "Count", "ModuleID" FROM "UserModuleLinks" WHERE "IsDeleted" = false
                GROUP BY "ModuleID"
                ),
                AutherApproved AS (
                SELECT "CreatedBy", jsonb_agg(
                    jsonb_build_object(
                    'ModuleDraftID', "ModuleDraftID",
                    'ModuleName', "ModuleName",
                    'ModuleType', "ModuleType",
                    'ApprovedDate', "EscalationDate",
                    'ApprovedBy', "UserDetails"
                )) AS "Approved" FROM (
                    SELECT smd."SOPDraftID" AS "ModuleDraftID", smd."SOPName" AS "ModuleName", 'SOP' AS "ModuleType",
                    smd."CreatedBy", smd."ModifiedDate" AS "EscalationDate", su."UserDetails"
                    FROM "SopModuleDrafts" smd
                    LEFT JOIN ActionUsers su ON su."ModuleDraftID" = smd."SOPDraftID"
                    LEFT JOIN AssignCounts uml ON uml."ModuleID" = smd."SOPID"
                    WHERE smd."SOPStatus" = 'Published' AND smd."IsDeleted" = false
                    AND (uml."Count" = 0 OR uml."Count" IS NULL) AND smd."SelfApproved" = false
                    GROUP BY smd."SOPDraftID", smd."SOPName", smd."CreatedBy", smd."ModifiedDate", su."UserDetails"
                    UNION ALL
                    SELECT dmd."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName", 'Document' AS "ModuleType",
                    dmd."CreatedBy", dmd."ModifiedDate" AS "EscalationDate", su."UserDetails"
                    FROM "DocumentModuleDrafts" dmd
                    LEFT JOIN ActionUsers su ON su."ModuleDraftID" = dmd."DocumentModuleDraftID"
                    LEFT JOIN AssignCounts uml ON uml."ModuleID" = dmd."DocumentID"
                    WHERE dmd."DocumentStatus" = 'Published' AND dmd."IsDeleted" = false
                    AND (uml."Count" = 0 OR uml."Count" IS NULL) AND dmd."SelfApproved" = false
                    GROUP BY dmd."DocumentModuleDraftID", dmd."DocumentName", dmd."CreatedBy", dmd."ModifiedDate", su."UserDetails"
                ) approved GROUP BY "CreatedBy"
                    ),
                    MyRejection AS (
                SELECT "UserID", jsonb_agg(
                    jsonb_build_object(
                    'ModuleDraftID', "ModuleDraftID",
                    'ModuleName', "ModuleName",
                    'ModuleType', "ModuleType",
                    'RejectedDate', "EscalationDate",
                    'ActionType', "ActionType"
                    )
                ) AS "MyRejection" FROM (
                SELECT mc."SOPDraftID" AS "ModuleDraftID", smd."SOPName" AS "ModuleName", 'SOP' AS "ModuleType",
                smd."CreatedBy" AS "UserID", smd."ModifiedDate" AS "EscalationDate",
                'Checker' AS "ActionType"
                FROM "ModuleCheckers" mc
                INNER JOIN CheckerSOP cs ON cs."ModuleDraftID" = mc."SOPDraftID"
                INNER JOIN "SopModuleDrafts" smd ON smd."SOPDraftID" = mc."SOPDraftID"
                WHERE mc."ApprovalStatus" = 'Rejected' AND smd."SOPStatus" = 'InProgress' AND smd."IsDeleted" = false
                AND cs.rn = 1
                GROUP BY mc."SOPDraftID", smd."SOPName", smd."CreatedBy", smd."ModifiedDate", mc."ApprovalStatus"
                UNION ALL
                SELECT ma."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName", 'Document' AS "ModuleType",
                dmd."CreatedBy" AS "UserID", dmd."ModifiedDate" AS "EscalationDate",
                'Checker' AS "ActionType"
                FROM "ModuleCheckers" ma
                INNER JOIN CheckerDocument cd ON cd."ModuleDraftID" = ma."DocumentModuleDraftID"
                INNER JOIN "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = ma."DocumentModuleDraftID"
                WHERE ma."ApprovalStatus" = 'Rejected' AND dmd."DocumentStatus" = 'InProgress' AND dmd."IsDeleted" = false
                AND cd.rn = 1
                GROUP BY ma."DocumentModuleDraftID", dmd."DocumentName", dmd."CreatedBy", dmd."ModifiedDate", ma."ApprovalStatus"
                UNION ALL
                SELECT ms."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName", 'Document' AS "ModuleType",
                dmd."CreatedBy" AS "UserID", ms."ModifiedDate" AS "EscalationDate",
                'StakeHolder' AS "ActionType"
                FROM "ModuleStakeHolders" ms
                INNER JOIN SteakHolderDocument sd ON sd."ModuleDraftID" = ms."DocumentModuleDraftID"
                INNER JOIN "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = ms."DocumentModuleDraftID"
                WHERE ms."ApprovalStatus" = 'Rejected' AND dmd."DocumentStatus" = 'InProgress' AND dmd."IsDeleted" = false
                AND sd.rn = 1
                GROUP BY ms."DocumentModuleDraftID", dmd."DocumentName", dmd."CreatedBy", ms."ModifiedDate", ms."ApprovalStatus"
                UNION ALL
                SELECT mc."SOPDraftID" AS "ModuleDraftID", smd."SOPName" AS "ModuleName", 'SOP' AS "ModuleType",
                smd."CreatedBy" AS "UserID", es."EscalationDate" AS "EscalationDate",
                'Escalator' AS "ActionType"
                FROM "ModuleEscalations" mc
                INNER JOIN EscalatorSOP es ON es."ModuleDraftID" = mc."SOPDraftID"
                INNER JOIN "SopModuleDrafts" smd ON smd."SOPDraftID" = mc."SOPDraftID"
                WHERE mc."ApprovalStatus" = 'Rejected' AND smd."SOPStatus" = 'InProgress' AND smd."IsDeleted" = false
                AND es.rn = 1
                GROUP BY mc."SOPDraftID", smd."SOPName", smd."CreatedBy", es."EscalationDate", mc."ApprovalStatus"
                UNION ALL
                SELECT ma."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName", 'Document' AS "ModuleType",
                dmd."CreatedBy" AS "UserID", ed."EscalationDate" AS "EscalationDate",
                'Escalator' AS "ActionType"
                FROM "ModuleEscalations" ma
                INNER JOIN EscalatorDocumentForReviewer ed ON ed."ModuleDraftID" = ma."DocumentModuleDraftID"
                INNER JOIN "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = ma."DocumentModuleDraftID"
                WHERE ma."ApprovalStatus" = 'Rejected' AND dmd."DocumentStatus" = 'InProgress' AND dmd."IsDeleted" = false
                AND ed.rn = 1 AND ma."IsReviewer" IS TRUE
                GROUP BY ma."DocumentModuleDraftID", dmd."DocumentName", dmd."CreatedBy", ed."EscalationDate", ma."ApprovalStatus"
                UNION ALL
                SELECT ma."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName", 'Document' AS "ModuleType",
                dmd."CreatedBy" AS "UserID", ed."EscalationDate" AS "EscalationDate",
                'Escalator' AS "ActionType"
                FROM "ModuleEscalations" ma
                INNER JOIN EscalatorDocumentForSteakHolder ed ON ed."ModuleDraftID" = ma."DocumentModuleDraftID"
                INNER JOIN "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = ma."DocumentModuleDraftID"
                WHERE ma."ApprovalStatus" = 'Rejected' AND dmd."DocumentStatus" = 'InProgress' AND dmd."IsDeleted" = false
                AND ed.rn = 1 AND ma."IsStakeHolder" IS TRUE
                GROUP BY ma."DocumentModuleDraftID", dmd."DocumentName", dmd."CreatedBy", ed."EscalationDate", ma."ApprovalStatus"
                UNION ALL
                SELECT ma."SOPDraftID" AS "ModuleDraftID", smd."SOPName" AS "ModuleName", 'SOP' AS "ModuleType",
                smd."CreatedBy" AS "UserID", ma."ModifiedDate" AS "EscalationDate",
                'Approver' AS "ActionType"
                FROM "ModuleApprovers" ma
                INNER JOIN AproverSOP asop ON asop."ModuleDraftID" = ma."SOPDraftID"
                INNER JOIN "SopModuleDrafts" smd ON smd."SOPDraftID" = ma."SOPDraftID"
                WHERE ma."ApprovalStatus" = 'Rejected' AND smd."SOPStatus" = 'InProgress' AND smd."IsDeleted" = false
                AND asop.rn = 1
                GROUP BY ma."SOPDraftID", smd."SOPName", smd."CreatedBy", ma."ModifiedDate", ma."ApprovalStatus"
                UNION ALL
                SELECT ma."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName", 'Document' AS "ModuleType",
                dmd."CreatedBy" AS "UserID", ma."ModifiedDate" AS "EscalationDate",
                'Approver' AS "ActionType"
                FROM "ModuleApprovers" ma
                INNER JOIN AproverDocument adoc ON adoc."ModuleDraftID" = ma."DocumentModuleDraftID"
                INNER JOIN "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = ma."DocumentModuleDraftID"
                WHERE ma."ApprovalStatus" = 'Rejected' AND dmd."DocumentStatus" = 'InProgress' AND dmd."IsDeleted" = false
                AND adoc.rn = 1
                GROUP BY ma."DocumentModuleDraftID", dmd."DocumentName", dmd."CreatedBy", ma."ModifiedDate", ma."ApprovalStatus"
                ) AS rejection_data
                WHERE "ModuleDraftID" IS NOT NULL AND "ModuleName" IS NOT NULL
                GROUP BY "UserID"
                )
                SELECT
                    COALESCE(ld."ReviewState", '[]'::jsonb) AS "StekHolderPending",
                    COALESCE(rd."ReviewState", '[]'::jsonb) AS "ReviewPending",
                    COALESCE(ad."PendingApproval", '[]'::jsonb) AS "ApprovalPending",
                    COALESCE(md."MyEscalated", '[]'::jsonb) AS "MyEscalated",
                    COALESCE(orw."OngoingReview", '[]'::jsonb) AS "ReviewState",
                    COALESCE(add."Approved", '[]'::jsonb) AS "Approved",
                    COALESCE(mc."MyCompletion", '[]'::jsonb) AS "MyCompletion",
                    COALESCE(ld1."SteakHolders", '[]'::jsonb) AS "AutherStekHolder",
                    COALESCE(rd1."Reviewers", '[]'::jsonb) AS "AutherReviewers",
                    COALESCE(ad1."Reviewed", '[]'::jsonb) AS "AutherReviewed",
                    COALESCE(md1."Approved", '[]'::jsonb) AS "AutherApproved",
                    COALESCE(mr."MyRejection", '[]'::jsonb) AS "MyRejection"
                FROM "UserDetails" ud
                LEFT OUTER JOIN StekHolderReviewData ld ON ld."UserID" = ud."UserID"
                LEFT OUTER JOIN ReviewData rd ON ud."UserID" = rd."UserID"
                LEFT OUTER JOIN ApproverData ad ON ud."UserID" = ad."UserID"
                LEFT OUTER JOIN MyEscalatorData md ON ud."UserID" = md."UserID"
                LEFT OUTER JOIN OngoingReview orw ON ud."UserID" = orw."UserID"
                LEFT OUTER JOIN ApprovedData add ON ud."UserID" = add."UserID"
                LEFT OUTER JOIN MyCompletion mc ON ud."UserID" = mc."UserID"
                LEFT OUTER JOIN AutherSteakHolder ld1 ON ld1."CreatedBy" = ud."UserID"
                LEFT OUTER JOIN AutherReviewer rd1 ON rd1."CreatedBy" = ud."UserID"
                LEFT OUTER JOIN AutherReviewed ad1 ON ad1."CreatedBy" = ud."UserID"
                LEFT OUTER JOIN AutherApproved md1 ON md1."CreatedBy" = ud."UserID"
                LEFT OUTER JOIN MyRejection mr ON mr."UserID" = ud."UserID"
                WHERE ud."UserID" = :UserID
              `,
        {
          replacements: {
            OrganizationStructureID: lincense.EnterpriseID,
            UserID: currentUserId,
          },
          type: sequelize.QueryTypes.SELECT,
        }
      );
      const data = JSON.parse(JSON.stringify(elementDetaisCount));
      const ResponseData = {
        StekHolderPending: {
          count: 0,
          data: [],
        },
        ReviewState: {
          count: 0,
          data: [],
        },
        PendingApproval: {
          count: 0,
          data: [],
        },
        PendingReview: {
          count: 0,
          data: [],
        },
        MyEscalated: {
          count: 0,
          data: [],
        },
        Approved: {
          count: 0,
          data: [],
        },
        MyCompletion: {
          count: 0,
          data: [],
        },
        ToStakeHolder: {
          count: 0,
          data: [],
        },
        ToReviewer: {
          count: 0,
          data: [],
        },
        ToReviewed: {
          count: 0,
          data: [],
        },
        ToApproved: {
          count: 0,
          data: [],
        },
        MyRejection: {
          count: 0,
          data: [],
        },
      };
      if (data?.length > 0) {
        if (data[0].StekHolderPending) {
          ResponseData.StekHolderPending.data = data[0].StekHolderPending;
          ResponseData.StekHolderPending.count =
            data[0].StekHolderPending.length;
        }
        if (data[0].ReviewPending) {
          ResponseData.PendingReview.data = data[0].ReviewPending;
          ResponseData.PendingReview.count = data[0].ReviewPending.length;
        }
        if (data[0].ApprovalPending) {
          ResponseData.PendingApproval.data = data[0].ApprovalPending;
          ResponseData.PendingApproval.count = data[0].ApprovalPending.length;
        }
        if (data[0].MyEscalated) {
          ResponseData.MyEscalated.data = data[0].MyEscalated;
          ResponseData.MyEscalated.count = data[0].MyEscalated.length;
        }
        if (data[0].ReviewState) {
          ResponseData.ReviewState.data = data[0].ReviewState;
          ResponseData.ReviewState.count = data[0].ReviewState.length;
        }
        if (data[0].Approved) {
          ResponseData.Approved.data = data[0].Approved;
          ResponseData.Approved.count = data[0].Approved.length;
        }
        if (data[0].MyCompletion) {
          ResponseData.MyCompletion.data = data[0].MyCompletion;
          ResponseData.MyCompletion.count = data[0].MyCompletion.length;
        }
        if (data[0].AutherStekHolder) {
          ResponseData.ToStakeHolder.data = data[0].AutherStekHolder;
          ResponseData.ToStakeHolder.count = data[0].AutherStekHolder.length;
        }
        if (data[0].AutherReviewers) {
          ResponseData.ToReviewer.data = data[0].AutherReviewers;
          ResponseData.ToReviewer.count = data[0].AutherReviewers.length;
        }
        if (data[0].AutherReviewed) {
          ResponseData.ToReviewed.data = data[0].AutherReviewed;
          ResponseData.ToReviewed.count = data[0].AutherReviewed.length;
        }
        if (data[0].AutherApproved) {
          ResponseData.ToApproved.data = data[0].AutherApproved;
          ResponseData.ToApproved.count = data[0].AutherApproved.length;
        }
        if (data[0].MyRejection) {
          ResponseData.MyRejection.data = data[0].MyRejection;
          ResponseData.MyRejection.count = data[0].MyRejection.length;
        }
      }
      ElementStatus = ResponseData;
    }
    res.status(200).send({
      data: {
        PendingAcknowledge,
        DocumentList,
        UpcummingTest,
        FormData,
        ElementStatus,
      },
    });
  } catch (error) {
    // console.log(error);
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.wordDocumentPermissionsDetails = async (req, res) => {
  const { currentUserId } = req.payload;
  const { DocumentModuleDraftID, IsActionable = false } = req.body;
  try {
    if (DocumentModuleDraftID) {
      const permissions = await sequelize.query(
        `
       WITH
          "DocumentDraft" AS (
            SELECT
              "DocumentModuleDraftID",
              "DocumentStatus"::text,
              "CreatedBy"
            FROM
              "DocumentModuleDrafts"
          ),
          "StakeHolder" AS (
            SELECT
              "UserID",
              "ApprovalStatus",
              "DocumentModuleDraftID"
            FROM
              "ModuleStakeHolders"
            UNION ALL
            SELECT
              "UserID",
              "ApprovalStatus"::TEXT,
              "DocumentModuleDraftID"
            FROM
              "ModuleEscalations"
            WHERE
              "IsStakeHolder" IS TRUE
          ),
          "StakeHolderData" AS (
            SELECT
              (
                COUNT(*) FILTER (
                  WHERE
                    "UserID" = :UserID
                    AND "ApprovalStatus" IS NULL
                ) > 0
              ) AS "CurrentUserAction",
              COUNT(*) FILTER (
                WHERE
                  "ApprovalStatus" = 'Rejected'
              ) AS "RejectCount",
              BOOL_OR("UserID" = :UserID) AS "UserExists"
            FROM
              "StakeHolder"
            WHERE
              "DocumentModuleDraftID" = :DocumentModuleDraftID
            GROUP BY
              "DocumentModuleDraftID"
          ),
          "Reviewer" AS (
            SELECT
              "UserID",
              "ApprovalStatus",
              "DocumentModuleDraftID"
            FROM
              "ModuleCheckers"
            UNION ALL
            SELECT
              "UserID",
              "ApprovalStatus",
              "DocumentModuleDraftID"
            FROM
              "ModuleEscalations"
            WHERE
              "IsReviewer" IS TRUE
          ),
          "ReviewerData" AS (
            SELECT
              (
                COUNT(*) FILTER (
                  WHERE
                    "UserID" = :UserID
                    AND "ApprovalStatus" IS NULL
                ) > 0
              ) AS "CurrentUserAction",
              COUNT(*) FILTER (
                WHERE
                  "ApprovalStatus" = 'Rejected'
              ) AS "RejectCount",
              BOOL_OR("UserID" = :UserID) AS "UserExists"
            FROM
              "Reviewer"
            WHERE
              "DocumentModuleDraftID" = :DocumentModuleDraftID
            GROUP BY
              "DocumentModuleDraftID"
          ),
          "ApproverData" AS (
            SELECT
              (
                COUNT(*) FILTER (
                  WHERE
                    "UserID" = :UserID
                    AND "ApprovalStatus" IS NULL
                ) > 0
              ) AS "CurrentUserAction",
              COUNT(*) FILTER (
                WHERE
                  "ApprovalStatus" = 'Rejected'
              ) AS "RejectCount",
              BOOL_OR("UserID" = :UserID) AS "UserExists"
            FROM
              "ModuleApprovers"
            WHERE
              "DocumentModuleDraftID" = :DocumentModuleDraftID
            GROUP BY
              "DocumentModuleDraftID"
          )
        SELECT
          CASE
            WHEN D."CreatedBy" = U."UserID"
            AND (
              (
                COALESCE(S."RejectCount", 0) + COALESCE(R."RejectCount", 0) + COALESCE(A."RejectCount", 0)
              ) > 0
              OR D."DocumentStatus" = 'Published'
            ) THEN 'owner'
            WHEN S."CurrentUserAction" IS TRUE
            AND S."UserExists" IS TRUE
            AND ${IsActionable} IS TRUE THEN 'stakeholder'
            WHEN R."CurrentUserAction" IS TRUE
            AND R."UserExists" IS TRUE
            AND ${IsActionable} IS TRUE THEN 'reviewer'
            WHEN A."CurrentUserAction" IS TRUE
            AND A."UserExists" IS TRUE
            AND ${IsActionable} IS TRUE THEN 'approver'
            ELSE 'others'
          END AS "UserType",
          U."UserName",
          U."UserID"
        FROM
          "DocumentDraft" D
          INNER JOIN "Users" U ON U."UserID" = :UserID
          LEFT JOIN "StakeHolderData" S ON TRUE
          LEFT JOIN "ReviewerData" R ON TRUE
          LEFT JOIN "ApproverData" A ON TRUE
        WHERE
          D."DocumentModuleDraftID" = :DocumentModuleDraftID
            `,
        {
          type: QueryTypes.SELECT,
          replacements: { DocumentModuleDraftID, UserID: currentUserId },
        }
      );
      if (permissions.length === 0) {
        return res.status(404).send({ error: "No permissions found" });
      }
      res.status(200).send({ data: permissions[0] });
    } else {
      const data = await Users.findByPk(currentUserId, {
        attributes: ["UserID", "UserName", [literal("'others'"), "UserType"]],
      });
      if (!data) {
        return res.status(404).send({ error: "No permissions found" });
      }
      res.status(200).send({ data });
    }
  } catch (error) {
    // console.log(error);
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.createOrUpdateTemplateOrBlankDocument = async (req, res) => {
  const t = await sequelize.transaction();
  let {
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
    NeedAcceptance = false,
    NeedAcceptanceFromStakeHolder = false,
    NeedAcceptanceForApprover = false,
    FileUrl,
    CoOwnerUserID,
    TemplateID,
  } = req.body;

  const { currentUserId } = req.payload;

  if (!DocumentName || DocumentName.trim() === "") {
    await t.rollback();
    return res.status(400).send({ message: "DocumentName is required" });
  }

  const basePath = path.posix.join(
    "src",
    "infrastructure",
    "media",
    "Document"
  );
  const tempPath = path.posix.join(
    "src",
    "infrastructure",
    "media",
    "Template",
    "TemplateDocument"
  );
  const blankPath = path.posix.join(
    "src",
    "infrastructure",
    "media",
    "Template",
    "Blank"
  );

  try {
    const commonPayload = {
      ElementAttributeTypeID,
      ModuleTypeID,
      ContentID,
      DocumentName,
      DocumentDescription,
      DocumentIsActive,
      DocumentTags,
      SelfApproved,
      ReadingTimeValue,
      ReadingTimeUnit,
      DocumentExpiry,
      EscalationType,
      EscalationAfter,
      StakeHolderEscalationType,
      StakeHolderEscalationAfter,
      NeedAcceptance,
      NeedAcceptanceFromStakeHolder,
      NeedAcceptanceForApprover,
      CoOwnerUserID,
      TemplateID,
    };

    let newDocument, docDraft;
    let DraftVersion = "0.1";
    let MasterVersion = "1.0";

    if (DocumentID) {
      const duplicateDoc = await DocumentModule.findOne({
        where: {
          DocumentName,
          DocumentID: { [Op.ne]: DocumentID },
        },
        transaction: t,
      });

      if (duplicateDoc) {
        throw new Error(
          "A document with the same name already exists. Please choose a different name."
        );
      }

      newDocument = await DocumentModule.findByPk(DocumentID, {
        transaction: t,
      });
      if (!newDocument) {
        throw new Error("Document not found for update");
      }

      // Get latest draft to determine versioning
      const latestDraft = await DocumentModuleDraft.findOne({
        where: { DocumentID },
        order: [["CreatedDate", "DESC"]],
        transaction: t,
      });

      if (latestDraft) {
        DraftVersion = (parseFloat(latestDraft.DraftVersion) + 0.1).toFixed(1);
        MasterVersion = latestDraft.MasterVersion;
      }

      await newDocument.update(
        {
          ...commonPayload,
          UpdatedBy: currentUserId,
        },
        { transaction: t }
      );

      docDraft = await DocumentModuleDraft.findOne({
        where: { DocumentID },
        order: [["CreatedDate", "DESC"]],
        transaction: t,
      });

      if (!docDraft) {
        docDraft = await DocumentModuleDraft.create(
          {
            ...commonPayload,
            DocumentID,
            DocumentStatus: "Draft",
            DraftVersion,
            MasterVersion,
            CreatedBy: currentUserId,
          },
          { transaction: t }
        );
      } else {
        await docDraft.update(
          {
            ...commonPayload,
            DocumentStatus: "Draft",
            DraftVersion,
            MasterVersion,
            UpdatedBy: currentUserId,
          },
          { transaction: t }
        );
      }
    } else {
      const existingDoc = await DocumentModule.findOne({
        where: { DocumentName },
        transaction: t,
      });

      if (existingDoc) {
        throw new Error(
          "A document with the same name already exists. Please choose a different name."
        );
      }

      const inProgressPayload = {
        ...commonPayload,
        DocumentStatus: "Draft",
        DraftVersion,
        MasterVersion,
      };

      newDocument = await DocumentModule.create(
        {
          ...inProgressPayload,
          CreatedBy: currentUserId,
        },
        { transaction: t }
      );

      DocumentID = newDocument.DocumentID;

      docDraft = await DocumentModuleDraft.create(
        {
          ...inProgressPayload,
          DocumentID,
          CreatedBy: currentUserId,
        },
        { transaction: t }
      );
    }

    if (!FileUrl) {
      throw new Error("FileUrl is required");
    }

    const incomingFile = FileUrl;
    const incomingFileExtension = helper.getFileExtension(incomingFile);
    let incomingFileFullPath;

    if (FileUrl.includes("file/td/")) {
      incomingFileFullPath = path.posix.join(
        tempPath,
        path.basename(incomingFile)
      );
    } else if (FileUrl.includes("file/tb/")) {
      incomingFileFullPath = path.posix.join(
        blankPath,
        path.basename(incomingFile)
      );
    } else {
      incomingFileFullPath = path.posix.join(
        basePath,
        path.basename(incomingFile)
      );
    }

    if (!fs.existsSync(incomingFileFullPath)) {
      throw new Error("File does not exist at the specified path");
    }

    const incomingFileContent = fs.readFileSync(incomingFileFullPath);

    const newFilePathForDraft = path.posix.join(
      basePath,
      `${docDraft.DocumentModuleDraftID}${incomingFileExtension}`
    );
    await docDraft.update(
      { DocumentPath: newFilePathForDraft },
      { transaction: t }
    );
    fs.writeFileSync(newFilePathForDraft, incomingFileContent);

    const newPath = path.posix.join(
      basePath,
      `${newDocument.DocumentID}${incomingFileExtension}`
    );
    await newDocument.update({ DocumentPath: newPath }, { transaction: t });
    fs.writeFileSync(newPath, incomingFileContent);

    const existingInProgress = await DocumentInProgress.findOne({
      where: { DocumentID },
      transaction: t,
    });

    if (existingInProgress) {
      await existingInProgress.update(
        {
          Owners: DocumentOwner || [],
          Stakeholders: StakeHolder || [],
          Approvers: Approver || [],
          Reviewers: Checker || [],
          CoOwners: CoOwnerUserID || [],
          StakeHolderEscalationPerson: StakeHolderEscalationPerson || [],
          EscalationPerson: EscalationPerson || [],
          UpdatedBy: currentUserId,
        },
        { transaction: t }
      );
    } else {
      await DocumentInProgress.create(
        {
          DocumentID,
          DocumentModuleDraftID: docDraft.DocumentModuleDraftID,
          Owners: DocumentOwner || [],
          Stakeholders: StakeHolder || [],
          Approvers: Approver || [],
          Reviewers: Checker || [],
          CoOwners: CoOwnerUserID || [],
          StakeHolderEscalationPerson: StakeHolderEscalationPerson || [],
          EscalationPerson: EscalationPerson || [],
          CreatedBy: currentUserId,
        },
        { transaction: t }
      );
    }

    // NOTIFICATION LOGIC - Similar to createDocumentModule
    const notififactionBulk = [];
    const createNotification = async (users, type) => {
      if (users && users.length > 0) {
        // First check if users have notification preferences set
        const data = await Notification.findAll({
          where: {
            UserID: users,
            NotificationTypeForAction: {
              [Op.or]: ["push", "both"],
            },
          },
        });

        // If users have preferences set, use those
        if (data && data.length > 0) {
          for (const el of data) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: `Element assigned as ${type}`,
              NotificationType: "actionable",
              LinkedType: "Document",
              LinkedID: docDraft.DocumentModuleDraftID,
              CreatedBy: currentUserId,
            });
          }
        } else {
          // If no users have push/both enabled, send to all users anyway
          for (const userId of users) {
            notififactionBulk.push({
              UserID: userId,
              Message: `Element assigned as ${type}`,
              NotificationType: "actionable",
              LinkedType: "Document",
              LinkedID: docDraft.DocumentModuleDraftID,
              CreatedBy: currentUserId,
            });
          }
        }
      }
    };

    // Create module assignments and send notifications
    if (StakeHolder && StakeHolder.length > 0) {
      await ModuleStakeHolder.bulkCreate(
        StakeHolder.map((userId) => ({
          ModuleTypeID,
          DocumentID,
          ContentID,
          DocumentModuleDraftID: docDraft.DocumentModuleDraftID,
          UserID: userId,
          CreatedBy: currentUserId,
        })),
        { transaction: t }
      );
      await createNotification(StakeHolder, "StakeHolder");
    }

    if (Checker && Checker.length > 0) {
      await ModuleChecker.bulkCreate(
        Checker.map((userId) => ({
          ModuleTypeID,
          DocumentID,
          ContentID,
          DocumentModuleDraftID: docDraft.DocumentModuleDraftID,
          UserID: userId,
          CreatedBy: currentUserId,
        })),
        { transaction: t }
      );
      await createNotification(Checker, "Checker");
    }

    if (Approver && Approver.length > 0) {
      await ModuleApprover.bulkCreate(
        Approver.map((userId) => ({
          ModuleTypeID,
          DocumentID,
          ContentID,
          DocumentModuleDraftID: docDraft.DocumentModuleDraftID,
          UserID: userId,
          CreatedBy: currentUserId,
        })),
        { transaction: t }
      );
      await createNotification(Approver, "Approver");
    }

    if (DocumentOwner && DocumentOwner.length > 0) {
      await ModuleOwner.bulkCreate(
        DocumentOwner.map((userId) => ({
          ModuleTypeID,
          DocumentID,
          ContentID,
          DocumentModuleDraftID: docDraft.DocumentModuleDraftID,
          UserID: userId,
          CreatedBy: currentUserId,
        })),
        { transaction: t }
      );
      await createNotification(DocumentOwner, "Owner");
    }

    if (EscalationPerson && EscalationPerson.length > 0) {
      await ModuleEscalation.bulkCreate(
        EscalationPerson.map((userId) => ({
          ModuleTypeID,
          DocumentID,
          ContentID,
          DocumentModuleDraftID: docDraft.DocumentModuleDraftID,
          UserID: userId,
          CreatedBy: currentUserId,
        })),
        { transaction: t }
      );
    }

    if (StakeHolderEscalationPerson && StakeHolderEscalationPerson.length > 0) {
      await ModuleEscalation.bulkCreate(
        StakeHolderEscalationPerson.map((userId) => ({
          ModuleTypeID,
          DocumentID,
          ContentID,
          DocumentModuleDraftID: docDraft.DocumentModuleDraftID,
          UserID: userId,
          CreatedBy: currentUserId,
          IsStakeHolder: true,
        })),
        { transaction: t }
      );
    }

    // Send all accumulated notifications
    if (notififactionBulk.length > 0) {
      await UserNotification.bulkCreate(notififactionBulk, {
        ignoreDuplicates: true,
        transaction: t,
      });
      sendNotification(notififactionBulk);
    }

    // Update user sync timestamp
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

    await t.commit();

    return res.status(200).send({
      message: DocumentID
        ? "Document updated successfully"
        : "Document created successfully",
      DocumentID,
      DocumentName,
      DocumentDraftID: docDraft.DocumentModuleDraftID,
      Status: "Draft",
    });
  } catch (error) {
    await t.rollback();
    console.error(error);
    logger.error({
      message: error.message,
      details: error.stack || error.toString(),
      UserID: currentUserId,
    });
    return res
      .status(500)
      .send({ message: "Something went wrong!! " + error.message });
  }
};
exports.sendDocumentForReview = async (req, res) => {
  const t = await sequelize.transaction();
  const { currentUserId } = req.payload;
  try {
    const { DocumentModuleDraftID } = req.body;

    if (!DocumentModuleDraftID) {
      throw new Error("DocumentModuleDraftID is required");
    }

    const draft = await DocumentModuleDraft.findOne({
      where: { DocumentModuleDraftID },
      attributes: ["ModuleTypeID", "ContentID", "DocumentID"],
    });

    if (!draft) throw new Error("Document draft not found");
    const { ModuleTypeID, ContentID, DocumentID } = draft;

    const inProgress = await DocumentInProgress.findOne({
      where: { DocumentModuleDraftID },
    });
    if (!inProgress)
      throw new Error("No participants found in DocumentInProgress");

    const inserts = [];

    if (inProgress.Owners?.length > 0) {
      inserts.push(
        ModuleOwner.bulkCreate(
          inProgress.Owners.map((userId) => ({
            ModuleTypeID,
            DocumentID,
            ContentID,
            DocumentModuleDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
          })),
          { transaction: t }
        )
      );
    }

    if (inProgress.Stakeholders?.length > 0) {
      inserts.push(
        ModuleStakeHolder.bulkCreate(
          inProgress.Stakeholders.map((userId) => ({
            ModuleTypeID,
            DocumentID,
            ContentID,
            DocumentModuleDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
          })),
          { transaction: t }
        )
      );
    }

    if (inProgress.Approvers?.length > 0) {
      inserts.push(
        ModuleApprover.bulkCreate(
          inProgress.Approvers.map((userId) => ({
            ModuleTypeID,
            DocumentID,
            ContentID,
            DocumentModuleDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
          })),
          { transaction: t }
        )
      );
    }

    if (inProgress.Reviewers?.length > 0) {
      inserts.push(
        ModuleChecker.bulkCreate(
          inProgress.Reviewers.map((userId) => ({
            ModuleTypeID,
            DocumentID,
            ContentID,
            DocumentModuleDraftID,
            UserID: userId,
            CreatedBy: currentUserId,
          })),
          { transaction: t }
        )
      );
    }

    await Promise.all(inserts);

    // 4. Update statuses
    await Promise.all([
      DocumentModule.update(
        {
          DocumentStatus: "InProgress",
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { DocumentID }, transaction: t }
      ),
      DocumentModuleDraft.update(
        {
          DocumentStatus: "InProgress",
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { DocumentModuleDraftID }, transaction: t }
      ),
    ]);

    // 5. Notification helper
    let notififactionBulk = [];
    const createNotification = async (users, type) => {
      if (users && users.length > 0) {
        console.log(`Creating notifications for ${type}:`, users);

        // First check if users have notification preferences set
        const data = await Notification.findAll({
          where: {
            UserID: users,
            NotificationTypeForAction: {
              [Op.or]: ["push", "both"],
            },
          },
        });

        // If users have preferences set, use those
        if (data && data.length > 0) {
          for (const el of data) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assigned as a " + type,
              NotificationType: "actionable",
              LinkedType: "Document",
              LinkedID: DocumentModuleDraftID,
              CreatedBy: currentUserId,
            });
          }
        } else {
          // If no users have push/both enabled, send to all users anyway
          // (actionable items should always notify)
          for (const userId of users) {
            notififactionBulk.push({
              UserID: userId,
              Message: "Element assigned as a " + type,
              NotificationType: "actionable",
              LinkedType: "Document",
              LinkedID: DocumentModuleDraftID,
              CreatedBy: currentUserId,
            });
          }
        }

        console.log(`Created ${users.length} notifications for ${type}`);
      }
    };

    console.log("inProgress data:", {
      Stakeholders: inProgress.Stakeholders,
      Reviewers: inProgress.Reviewers,
      Approvers: inProgress.Approvers,
    });

    if (inProgress.Stakeholders?.length > 0) {
      await createNotification(inProgress.Stakeholders, "Stakeholder");
    }
    if (inProgress.Reviewers?.length > 0) {
      await createNotification(inProgress.Reviewers, "Checker");
    }
    if (inProgress.Approvers?.length > 0) {
      await createNotification(inProgress.Approvers, "Approver");
    }
    // if (inProgress.Owners?.length > 0) {
    //   await createNotification(inProgress.Owners, "Owner");
    // }

    // Send all accumulated notifications at once
    console.log(
      `Total notifications to send: ${notififactionBulk.length}`,
      notififactionBulk
    );
    if (notififactionBulk.length > 0) {
      await UserNotification.bulkCreate(notififactionBulk, {
        ignoreDuplicates: true,
        transaction: t,
      });
      sendNotification(notififactionBulk);
      console.log("Notifications sent successfully");
    } else {
      console.log(
        "No notifications to send - check Notification table settings"
      );
    }

    await t.commit();

    return res.status(200).send({
      message: "Document sent for review successfully",
      DocumentID,
      DocumentModuleDraftID,
    });
  } catch (error) {
    await t.rollback();
    console.error(error);
    logger.error({
      message: error.message,
      details: error.stack || error.toString(),
      UserID: currentUserId,
    });
    return res.status(500).send({ message: "Something went wrong!" });
  }
};
