const { Op, Sequelize, literal, QueryTypes } = require("sequelize");
const { sequelize } = require("../model");
const moment = require("moment");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const { sign, verify } = require("jsonwebtoken");
const ContentStructure = require("../model/ContentStructure");
const DocumentModule = require("../model/DocumentModule");
const ModuleMaster = require("../model/ModuleMaster");
const SopAttachmentLinks = require("../model/SopAttachmentLinks");
const SopDetails = require("../model/SopDetails");
const SopModule = require("../model/SopModule");
const TestMcqsModule = require("../model/TestMcqsModule");
const TestSimulationModule = require("../model/TestSimulationModule");
const TrainingSimulationModule = require("../model/TrainingSimulationModule");
const QuestionRepository = require("../model/QuestionRepository");
const QuestionAnswersLink = require("../model/QuestionAnswersLink");
const UserAttempts = require("../model/UserAttempts");
const UserAttemptDetails = require("../model/UserAttemptDetails");
const UserModuleAccessLog = require("../model/UserModuleAccessLog");
const UserAccessLinks = require("../model/UserAccessLinks");
const Users = require("../model/Users");
const UserDetails = require("../model/UserDetails");
const Notification = require("../model/Notification");
const FormModuleDraft = require("../model/FormModuleDraft");
const FormModule = require("../model/FormModule");
const FormModuleSubmission = require("../model/FormModuleSubmission");
const adminController = require("./admin/admin.controller");
const { logger } = require("../utils/services/logger");
const {
  comparePassword,
  generatePasswordHash,
} = require("../utils/services/passwordHash");
const Favorite = require("../model/Favorite");
const SopModuleDraft = require("../model/SopModuleDraft");
const ModuleChecker = require("../model/ModuleChecker");
const OrganizationAdvertisement = require("../model/OrganizationAdvertisement");
const UserModuleLink = require("../model/UserModuleLink");
const UserAgent = require("user-agent");
const FileAccessAttempt = require("../model/FileAccessAttempt");
const ModuleEscalation = require("../model/ModuleEscalation");
const TestSimulationReport = require("../model/TestSimulationReport");
const ESignRequest = require("../model/ESignRequest");
const ESignDocument = require("../model/ESignDocument");
const ESignReceiver = require("../model/ESignReceiver");
const ESignActivity = require("../model/ESignActivity");
const {
  placeMarkersOnPDF,
  addActivityLogOnPDF,
} = require("../utils/pdfMarker");
const helper = require("../utils/helper");
const { mailService } = require("../utils/services/nodemailer");
const DocumentModuleDraft = require("../model/DocumentModuleDraft");
const TrainingSimulationModuleDraft = require("../model/TrainingSimulationModuleDraft");
const TestSimulationModuleDraft = require("../model/TestSimulationModuleDraft");
const TestMcqsModuleDraft = require("../model/TestMcqsModuleDraft");
const ChatMessages = require("../model/ChatMessages");
const {
  sendChatMessage,
  syncDeleteCategory,
  sendNotification,
} = require("../utils/services/socket");
const Notes = require("../model/Notes");
const UserNotification = require("../model/UserNotification");
const RiskAndCompliences = require("../model/RiskAndCompliences");
const CampaignParticipant = require("../model/CampaignParticipant");
const Campaign = require("../model/Campaign");
const ModuleStakeHolder = require("../model/ModuleStakeHolder");
const WorkflowActionable = require("../model/WorkflowActionable");
const ModuleOwner = require("../model/ModuleOwner");
const { moduleMapping } = require("../utils/moduleConfig");
const RiskSopLink = require("../model/RiskSopLink");
const ModuleApprover = require("../model/ModuleApprover");
const { default: axios } = require("axios");
const DocumentReadingTimer = require("../model/DocumentReadingTimer");

const checkIsWhetherSendEmailNotification = async (
  ModuleID,
  approveStatus,
  currentUserId,
  userType
) => {
  try {
    const query = `
   WITH CheckerData as (
          select smd."SOPDraftID" AS "ModuleDraftID",smd."NeedAcceptance",smd."SOPName" AS "ModuleName",
          sum (case when mc."ApprovalStatus" is not null then 1 else 0 end) as action_count,'SOP' AS "ModuleType",'Checker' as "ActionType",
          CASE
            WHEN smd."EscalationType" = 'Minutes' THEN smd."CreatedDate" + INTERVAL '1 minute' * smd."EscalationAfter"
            WHEN smd."EscalationType" = 'Hours' THEN smd."CreatedDate" + INTERVAL '1 hour' * smd."EscalationAfter"
            WHEN smd."EscalationType" = 'Days' THEN smd."CreatedDate" + INTERVAL '1 day' * smd."EscalationAfter"
            WHEN smd."EscalationType" = 'Weeks' THEN smd."CreatedDate" + INTERVAL '1 week' * smd."EscalationAfter"
            WHEN smd."EscalationType" = 'Months' THEN smd."CreatedDate" + INTERVAL '1 month' * smd."EscalationAfter"
            WHEN smd."EscalationType" = 'Years' THEN smd."CreatedDate" + INTERVAL '1 year' * smd."EscalationAfter"
            ELSE null
          END AS "EscalationDate",
          MAX(mc."ModifiedDate") FILTER (WHERE mc."ApprovalStatus" IS NOT NULL) AS "ActionDate",
          ROW_NUMBER() OVER (PARTITION BY smd."SOPID" ORDER BY smd."CreatedDate" DESC) AS rn,
          count(mc."SOPDraftID") FILTER (WHERE mc."ApprovalStatus" ='Rejected') as reject_count,
          count(smd."SOPDraftID") as total_count from "ModuleCheckers" mc
          inner join "SopModuleDrafts" smd on smd."SOPDraftID" = mc."SOPDraftID"
          where smd."IsDeleted" is not true and smd."SOPStatus" = 'InProgress'
          group by smd."SOPDraftID",smd."NeedAcceptance",smd."SOPName"
          UNION ALL
          select dmd."DocumentModuleDraftID" AS "ModuleDraftID",dmd."NeedAcceptance",dmd."DocumentName" AS "ModuleName",
          sum (case when mc."ApprovalStatus" is not null then 1 else 0 end) as action_count,'Document' AS "ModuleType",'Checker' as "ActionType",
          CASE
            WHEN dmd."EscalationType" = 'Minutes' THEN dmd."CreatedDate" + INTERVAL '1 minute' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Hours' THEN dmd."CreatedDate" + INTERVAL '1 hour' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Days' THEN dmd."CreatedDate" + INTERVAL '1 day' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Weeks' THEN dmd."CreatedDate" + INTERVAL '1 week' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Months' THEN dmd."CreatedDate" + INTERVAL '1 month' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Years' THEN dmd."CreatedDate" + INTERVAL '1 year' * dmd."EscalationAfter"
            ELSE null
          END AS "EscalationDate",
          MAX(mc."ModifiedDate") FILTER (WHERE mc."ApprovalStatus" IS NOT NULL) AS "ActionDate",
          ROW_NUMBER() OVER (PARTITION BY dmd."DocumentID" ORDER BY dmd."CreatedDate" DESC) AS rn,
          count(mc."DocumentModuleDraftID") FILTER (WHERE mc."ApprovalStatus" ='Rejected') as reject_count,
          count(mc."DocumentModuleDraftID") as total_count from "ModuleCheckers" mc
          inner join "DocumentModuleDrafts" dmd on dmd."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
          where dmd."IsDeleted" is not true and dmd."DocumentStatus" = 'InProgress'
          group by dmd."DocumentModuleDraftID",dmd."NeedAcceptance",dmd."DocumentName"
          UNION ALL
          select dmd."DocumentModuleDraftID" AS "ModuleDraftID" ,dmd."NeedAcceptanceFromStakeHolder" as "NeedAcceptance",dmd."DocumentName" AS "ModuleName",
          sum (case when msh."ApprovalStatus" is not null then 1 else 0 end) as action_count,'Document' AS "ModuleType",'StakeHolder' as "ActionType",
          CASE
            WHEN dmd."EscalationType" = 'Minutes' THEN dmd."CreatedDate" + INTERVAL '1 minute' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Hours' THEN dmd."CreatedDate" + INTERVAL '1 hour' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Days' THEN dmd."CreatedDate" + INTERVAL '1 day' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Weeks' THEN dmd."CreatedDate" + INTERVAL '1 week' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Months' THEN dmd."CreatedDate" + INTERVAL '1 month' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Years' THEN dmd."CreatedDate" + INTERVAL '1 year' * dmd."EscalationAfter"
            ELSE null
          END AS "EscalationDate",
          MAX(msh."ModifiedDate") FILTER (WHERE msh."ApprovalStatus" IS NOT NULL) AS "ActionDate",
          ROW_NUMBER() OVER (PARTITION BY dmd."DocumentID" ORDER BY dmd."CreatedDate" DESC) AS rn,
          count(msh."DocumentModuleDraftID") FILTER (WHERE msh."ApprovalStatus" ='Rejected') as reject_count,
          count(msh."SOPDraftID") as total_count from "ModuleStakeHolders" msh
          inner join "DocumentModuleDrafts" dmd on dmd."DocumentModuleDraftID" = msh."DocumentModuleDraftID"
          where dmd."IsDeleted" is not true and dmd."DocumentStatus" = 'InProgress'
          group by dmd."DocumentModuleDraftID",dmd."NeedAcceptance",dmd."DocumentName"
          ),

          EscalatorData as (
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
          UNION ALL
          select dmd."DocumentModuleDraftID" AS "ModuleDraftID" ,dmd."DocumentName" AS "ModuleName",
          sum (case when me."ApprovalStatus" is not null then 1 else 0 end) as action_count,'Document' AS "ModuleType",'Escalator' as "ActionType",
          CASE
            WHEN dmd."EscalationType" = 'Minutes' THEN dmd."CreatedDate" + INTERVAL '1 minute' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Hours' THEN dmd."CreatedDate" + INTERVAL '1 hour' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Days' THEN dmd."CreatedDate" + INTERVAL '1 day' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Weeks' THEN dmd."CreatedDate" + INTERVAL '1 week' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Months' THEN dmd."CreatedDate" + INTERVAL '1 month' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Years' THEN dmd."CreatedDate" + INTERVAL '1 year' * dmd."EscalationAfter"
            ELSE dmd."CreatedDate"
          END AS "EscalationDate",
          MAX(me."ModifiedDate") FILTER (WHERE me."ApprovalStatus" IS NOT NULL) AS "ActionDate",
          ROW_NUMBER() OVER (PARTITION BY dmd."DocumentID" ORDER BY dmd."CreatedDate" DESC) AS rn,
          COUNT(me."DocumentModuleDraftID") FILTER (WHERE me."ApprovalStatus" ='Rejected') as reject_count,
          count(me."DocumentModuleDraftID") as total_count from "ModuleEscalations" me
          inner join "DocumentModuleDrafts" dmd on dmd."DocumentModuleDraftID" = me."DocumentModuleDraftID"
          where dmd."IsDeleted" is not true and dmd."DocumentStatus" = 'InProgress'
          group by dmd."DocumentModuleDraftID",dmd."DocumentName"
          ),
          SendMailToApprover as (
          SELECT COALESCE(ma."SOPDraftID",ma."DocumentModuleDraftID") AS "ModuleDraftID",ma."UserID" FROM "ModuleApprovers" ma
          LEFT JOIN CheckerData cd ON cd."ModuleDraftID" = COALESCE(ma."SOPDraftID",ma."DocumentModuleDraftID") AND cd.rn = 1
          LEFT JOIN EscalatorData ed ON ed."ModuleDraftID" = COALESCE(ma."SOPDraftID",ma."DocumentModuleDraftID") AND ed.rn = 1
          WHERE CASE WHEN (cd."EscalationDate" >= CURRENT_TIMESTAMP OR cd."EscalationDate" IS NULL) AND cd."NeedAcceptance" = true
                     THEN cd.action_count = cd.total_count AND cd.reject_count = 0
                     WHEN (cd."EscalationDate" >= CURRENT_TIMESTAMP OR cd."EscalationDate" IS NULL ) AND cd."NeedAcceptance" = false
                     THEN cd.action_count > 0 AND cd.reject_count = 0
                     WHEN ed."EscalationDate" < CURRENT_TIMESTAMP
                     THEN ed.reject_count = 0 AND ed.action_count > 0 ELSE FALSE END
          GROUP BY ma."SOPDraftID",ma."DocumentModuleDraftID",ma."UserID"
          )
      
    SELECT m."ModuleID",m."ModuleName",m."CreatedBy",mm."ModuleName" AS "ModuleType",u."UserEmail" FROM (
    SELECT sm."SOPDraftID" AS "ModuleID", sm."SOPName" AS "ModuleName", sm."CreatedBy",sm."ModuleTypeID"
    FROM "SopModuleDrafts" sm
    UNION ALL
    SELECT dm."DocumentModuleDraftID" AS "ModuleID", dm."DocumentName" AS "ModuleName", dm."CreatedBy",dm."ModuleTypeID"
    FROM "DocumentModuleDrafts" dm
    ) AS m
     INNER JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = m."ModuleTypeID"
     INNER JOIN SendMailToApprover s ON s."ModuleDraftID" = m."ModuleID"
     INNER JOIN "UserDetails" u ON u."UserID" = s."UserID"
     INNER JOIN "Notifications" n ON n."UserID" = u."UserID"
     WHERE m."ModuleID" = :ModuleID AND n."NotificationTypeForAction" IN ('email','both' )
    `;
    const query2 = `
        SELECT m."ModuleID",m."ModuleName",m."CreatedBy",mm."ModuleName" AS "ModuleType",u."UserEmail",
        CONCAT( u2."UserFirstName", ' ',u2."UserMiddleName",' ', u2."UserLastName") AS "UserName" FROM (
        SELECT sm."SOPDraftID" AS "ModuleID", sm."SOPName" AS "ModuleName", sm."CreatedBy",sm."ModuleTypeID"
        FROM "SopModuleDrafts" sm
        UNION ALL
        SELECT dm."DocumentModuleDraftID" AS "ModuleID", dm."DocumentName" AS "ModuleName", dm."CreatedBy",dm."ModuleTypeID"
        FROM "DocumentModuleDrafts" dm
        ) AS m
        INNER JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = m."ModuleTypeID"
        INNER JOIN "UserDetails" u ON u."UserID" = m."CreatedBy"
        INNER JOIN "UserDetails" u2 ON u2."UserID" = :UserID
        INNER JOIN "Notifications" n ON n."UserID" = u."UserID"
        WHERE m."ModuleID" = :ModuleID AND n."NotificationTypeForAction" IN ('email','both' ) LIMIT 1;
    `;
    if (userType == "Approver" && approveStatus == "Approved") {
      const data = await sequelize.query(query2, {
        type: QueryTypes.SELECT,
        replacements: {
          ModuleID,
          UserID: currentUserId,
        },
      });
      if (data.length > 0) {
        const mailData = data[0];
        let html = `<div class="container"> <h1>Element Approved Notification</h1> <p>Element has been Approved By ${mailData.UserName}</p> <table> <tr> <th>Module Type</th> <th>Module Name</th> </tr>
          <tr> <td>${mailData?.ModuleType}</td> <td>${mailData?.ModuleName}</td> </tr></table> 
          <p> Please check the element, ready to assign.</p>
          </div>`;
        if (mailData?.UserEmail) {
          mailService({
            recipientEmail: mailData?.UserEmail,
            subject: "Element Approved Notification",
            body: {
              html,
            },
          });
        }
      }
    }
    if (approveStatus == "Rejected") {
      const data = await sequelize.query(query2, {
        type: QueryTypes.SELECT,
        replacements: {
          ModuleID,
          UserID: currentUserId,
        },
      });
      if (data.length > 0) {
        const mailData = data[0];
        let html = `<div class="container"> <h1>Element Rejection Notification</h1> <p>Element has been Rejected By ${mailData.UserName}</p> <table> <tr> <th>Module Type</th> <th>Module Name</th> </tr>
          <tr> <td>${mailData?.ModuleType}</td> <td>${mailData?.ModuleName}</td> </tr></table> </div>`;
        if (mailData?.UserEmail) {
          mailService({
            recipientEmail: mailData?.UserEmail,
            subject: "Element Rejection Notification",
            body: {
              html,
            },
          });
        }
      }
    } else if (approveStatus == "Approved") {
      const data = await sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements: {
          ModuleID,
        },
      });
      const userEmails = [];
      for (const el of data) {
        userEmails.push(el.UserEmail);
      }
      let html = `<div class="container"> <h1>Approver Element Assignment Notification</h1> <p>Element has been assigned to you as an Approver</p> <table> <tr> <th>Module Type</th> <th>Module Name</th> </tr>
  <tr> <td>${data?.[0]?.ModuleType}</td> <td>${data?.[0]?.ModuleName}</td> </tr></table> </div>`;
      if (userEmails.length > 0) {
        mailService({
          recipientEmail: userEmails.join(", "),
          subject: "Element Assignment Notification",
          body: {
            html,
          },
        });
      }
    }
  } catch (error) {
    console.log(error);
  }
};

exports.getUserDetails = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const data = await sequelize.query(
      `
      SELECT u."UserID",u."UserName",u."UserType",ud."UserFirstName",ud."UserLastName",
      ud."UserMiddleName",ud."UserEmail",ud."UserPhoneNumber",ud."UserAddress",
      ud."UserDateOfBirth",ud."Gender",ud."UserPhoto",ud."UserEmployeeNumber",
      ud."UserSupervisorID",ud."UserSiganture",ud."ESignUserName",ud."ESignFirstName",
      r."RoleID",r."RoleName",os1."OrganizationStructureID" AS "ZoneID",
	    os1."OrganizationStructureName" AS "ZoneName",os."OrganizationStructureID" AS "UnitID",
      os."OrganizationStructureName" AS "UnitName",os."OrganizationStructureTypeID",
	    n."NotificationTypeForPublish",n."NotificationTypeForAction",
      os2."OrganizationStructureName", os2."OrganizationStructureID",u."IsContentAndmin",
      ost."OrganizationStructureTypeName",d."DepartmentID",d."DepartmentName"  FROM "Users" u
      INNER JOIN "UserDetails" ud ON ud."UserID" = u."UserID"
      LEFT JOIN "UserRoleLinks" url ON url."UserID" = u."UserID"
      LEFT JOIN "Roles" r ON r."RoleID" = url."RoleID"
      LEFT JOIN "UserUnitLinks" uosl ON uosl."UserID" = u."UserID"
      LEFT JOIN "OrganizationStructures" os ON os."OrganizationStructureID" = uosl."OrganizationStructureID"   
	    LEFT JOIN "OrganizationStructures" os1 ON os1."OrganizationStructureID" = os."ParentID"  
	    LEFT JOIN "OrganizationStructures" os2 ON os2."OrganizationStructureID" = os1."ParentID"  
      LEFT JOIN "OrganizationStructureTypes" ost ON ost."OrganizationStructureTypeID" = os."OrganizationStructureTypeID"
      LEFT JOIN "UserDeparmentLinks" udl ON udl."UserID" = u."UserID"
      LEFT JOIN "Departments" d ON d."DepartmentID" = udl."DepartmentID"
	    LEFT JOIN "Notifications" n ON n."UserID" = u."UserID"
      WHERE u."UserID" = :UserID LIMIT 1`,
      {
        replacements: { UserID: currentUserId },
        type: QueryTypes.SELECT,
      }
    );
    // const resp = data.length > 0 ? data[0].length > 0 ? data[0][0] : {} : {}
    res.status(200).send({ data: data[0] });
  } catch (error) {
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

exports.updateXMLData = async (req, res) => {
  const t = await sequelize.transaction();
  const { currentUserId } = req.payload;
  const { xml, SOPID, ModuleTypeID, ContentID } = req.body;
  try {
    await SopModule.update(
      {
        SOPXMLElement: xml,
        ModifiedBy: currentUserId,
        ModifiedDate: new Date().toISOString(),
      },
      { where: { SOPID, ModuleTypeID, ContentID }, transaction: t }
    );

    const latestSopModuleDraft = await SopModuleDraft.findOne(
      {
        where: { SOPID, ModuleTypeID, ContentID },
        order: [["CreatedDate", "DESC"]],
      },
      { transaction: t }
    );

    if (latestSopModuleDraft) {
      await latestSopModuleDraft.update(
        {
          SOPXMLElement: xml,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
        },
        { transaction: t }
      );
    }

    await t.commit();

    res.status(201).send({ message: "XML updated successfully" });
  } catch (error) {
    await t.rollback();
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

exports.saveOrUpdateShapeDetails = async (req, res) => {
  const { currentUserId } = req.payload;
  const {
    SopID,
    SopShapeID,
    AttachmentIcon,
    HeaderProperties,
    FooterProperties,
  } = req.body;
  try {
    const shape = await SopDetails.findOne({
      where: {
        SopID,
        SopShapeID,
      },
    });
    if (shape) {
      await SopDetails.update({
        AttachmentIcon,
        HeaderProperties,
        FooterProperties,
        ModifiedBy: currentUserId,
        ModifiedDate: new Date().toISOString(),
      });
      res.status(200).send({ message: "Shape Details updated successfully" });
      return;
    } else {
      await SopDetails.create({
        SopID,
        SopShapeID,
        AttachmentIcon,
        HeaderProperties,
        FooterProperties,
        CreatedBy: currentUserId,
      });
      res.status(201).send({ message: "Shape Details saved successfully" });
    }
  } catch (error) {
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

exports.deleteShapeDetails = async (req, res) => {
  const { currentUserId } = req.payload;
  const { SopID, SopShapeID } = req.body;
  try {
    await SopDetails.destroy({ where: { SopID, SopShapeID } });
    res.status(200).send({ message: "Shape Details deleted successfully" });
  } catch {
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
exports.linkElementSearch = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  const { SearchText } = req.body;
  try {
    const elements = await sequelize.query(`
      select 'sop' as "ContentLinkType",'SOPID' as "IdName",sm."SOPID" as "ContentLink",sm."SOPName" as "ContentLinkTitle" 
      from "SopModules" sm where sm."IsDeleted" is not true and sm."SOPName" ilike '%${SearchText}%' and sm."ContentID" in (
      SELECT "ContentID" FROM "ContentStructures"
      WHERE "OrganizationStructureID" = '${lincense.EnterpriseID}'
      )
      union all
      select 'doc' as "ContentLinkType",'DocumentID' as "IdName",dm."DocumentID" as "ContentLink",dm."DocumentName" as "ContentLinkTitle" 
      from "DocumentModules" dm where dm."IsDeleted" is not true and dm."DocumentName" ilike '%${SearchText}%' and dm."ContentID" in (
      SELECT "ContentID" FROM "ContentStructures"
      WHERE "OrganizationStructureID" = '${lincense.EnterpriseID}'
      )
      union all 
      select 'trs' as "ContentLinkType",'TrainingSimulationID' as "IdName",tsm."TrainingSimulationID" as "ContentLink",tsm."TrainingSimulationName" as "ContentLinkTitle" 
      from "TrainingSimulationModules" tsm where tsm."IsDeleted" is not true and tsm."TrainingSimulationName" ilike '%${SearchText}%' and tsm."ContentID" in (
      SELECT "ContentID" FROM "ContentStructures"
      WHERE "OrganizationStructureID" = '${lincense.EnterpriseID}'
      )
      union all 
      select 'tes' as "ContentLinkType",'TestSimulationID' as "IdName",tsm2."TestSimulationID" as "ContentLink",tsm2."TestSimulationName" as "ContentLinkTitle" 
      from "TestSimulationModules" tsm2 where tsm2."IsDeleted" is not true and tsm2."TestSimulationName" ilike '%${SearchText}%' and tsm2."ContentID" in (
      SELECT "ContentID" FROM "ContentStructures"
      WHERE "OrganizationStructureID" = '${lincense.EnterpriseID}'
      )
      union all 
      select 'mcq' as "ContentLinkType",'TestMCQID' as "IdName",tmm."TestMCQID" as "ContentLink",tmm."TestMCQName" as "ContentLinkTitle" 
      from "TestMcqsModules" tmm where tmm."TestMCQName" ilike '%${SearchText}%' and tmm."ContentID" in (
      SELECT "ContentID" FROM "ContentStructures"
      WHERE "OrganizationStructureID" = '${lincense.EnterpriseID}'
      )
            `);
    res.status(200).send({ data: elements[0] });
  } catch (error) {
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
exports.updateAttachedLink = async (req, res) => {
  const { currentUserId } = req.payload;
  const transaction = await sequelize.transaction();
  try {
    const { LinkItems, SopDetailsID } = req.bady;
    const elements = [];
    for (const e of LinkItems) {
      elements.push({
        SopDetailsID,
        ContentLinkTitle: e.ContentLinkTitle,
        ContentLink: e.ContentLink,
        ContentLinkType: e.ContentLinkType,
        CreatedBy: currentUserId,
      });
    }
    await SopAttachmentLinks.destroy(
      {
        where: {
          SopDetailsID,
        },
      },
      { transaction }
    );
    await SopAttachmentLinks.bulkCreate(elements, { transaction });
    await transaction.commit();
    res.status(200).send({ message: "Link updated successfully" });
  } catch (error) {
    await transaction.rollback();
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
exports.getModuleTypes = async (req, res) => {
  const { currentUserId, ModuleTypeIDs } = req.payload;
  try {
    if (!ModuleTypeIDs?.length) {
      res.status(200).send({ data: [] });
      return;
    }
    const moduleTypes = await ModuleMaster.findAll({
      where: {
        IsActive: true,
        ModuleTypeID: ModuleTypeIDs,
      },
      attributes: ["ModuleTypeID", "ModuleName"],
    });
    res.status(200).send({ data: moduleTypes });
  } catch (error) {
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
exports.getModuleTypesForKey = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const moduleTypes = await ModuleMaster.findAll({
      where: {
        IsActive: true,
      },
      attributes: ["ModuleTypeID", "ModuleName"],
    });
    res.status(200).send({ data: moduleTypes });
  } catch (error) {
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

exports.getElements = async (req, res) => {
  const {
    currentUserId,
    ModuleTypeIDs,
    currentUserType,
    lincense,
    currentUserSOPState,
  } = req.payload;
  const {
    ModuleTypeID,
    ParentContentID,
    IsEnableMyTask = false,
    IsGlobalView = false,
  } = req.body;
  try {
    const availContaints = [];
    const authFilter = {};
    let con1 = "",
      con2 = "",
      con3 = "",
      con4 = "",
      con5 = "",
      con6 = "",
      con7 = "",
      con8 = "",
      con9 = "",
      con10 = "",
      con11 = "",
      con12 = "",
      accessIds = [],
      countFilter = "";

    const ModuleType = await ModuleMaster.findOne({
      where: {
        ModuleTypeID,
        IsActive: true,
      },
    });

    const userDetails = await UserDetails.findOne({
      where: {
        UserID: currentUserId,
      },
      attributes: ["LastSynced"],
    });

    if (currentUserType === "EndUser" || IsEnableMyTask) {
      accessIds = await sequelize.query(
        `
      select uml."UserModuleLinkID",uml."ModuleID",dm."ContentID" from "UserModuleLinks" uml
      inner join "SopModules" dm on dm."ModuleTypeID" = uml."ModuleTypeID"
      and dm."SOPID" = uml."ModuleID"
      where uml."UserID" = :UserID
      AND CURRENT_DATE BETWEEN uml."StartDate" AND uml."DueDate"
      union all
      select uml."UserModuleLinkID",uml."ModuleID",dm."ContentID" from "UserModuleLinks" uml
      inner join "DocumentModules" dm on dm."ModuleTypeID" = uml."ModuleTypeID"
      and dm."DocumentID" = uml."ModuleID"
      where uml."UserID" = :UserID  
      AND CURRENT_DATE BETWEEN uml."StartDate" AND uml."DueDate"
      union all
      select uml."UserModuleLinkID",uml."ModuleID",dm."ContentID" from "UserModuleLinks" uml
      inner join "TrainingSimulationModules" dm on dm."ModuleTypeID" = uml."ModuleTypeID"
      and dm."TrainingSimulationID" = uml."ModuleID"
      where uml."UserID" = :UserID
      AND CURRENT_DATE BETWEEN uml."StartDate" AND uml."DueDate"
      union all
      select uml."UserModuleLinkID",uml."ModuleID",dm."ContentID" from "UserModuleLinks" uml
      inner join "TestSimulationModules" dm on dm."ModuleTypeID" = uml."ModuleTypeID"
      and dm."TestSimulationID" = uml."ModuleID"
      where uml."UserID" = :UserID
      AND CURRENT_DATE BETWEEN uml."StartDate" AND uml."DueDate"
      union all
      select uml."UserModuleLinkID",uml."ModuleID",dm."ContentID" from "UserModuleLinks" uml
      inner join "TestMcqsModules" dm on dm."ModuleTypeID" = uml."ModuleTypeID"
      and dm."TestMCQID" = uml."ModuleID"
      where uml."UserID" = :UserID
      AND CURRENT_DATE BETWEEN uml."StartDate" AND uml."DueDate"
      union all
      select uml."UserModuleLinkID",uml."ModuleID",dm."ContentID" from "UserModuleLinks" uml
      inner join "FormModules" dm on dm."ModuleTypeID" = uml."ModuleTypeID"
      and dm."FormID" = uml."ModuleID"
      where uml."UserID" = :UserID
      AND CURRENT_DATE BETWEEN uml."StartDate" AND uml."DueDate"`,
        {
          replacements: { UserID: currentUserId },
          type: sequelize.QueryTypes.SELECT,
        }
      );
      const ModuleIDs = new Set();
      const ContentIDs = new Set();
      for (const el of accessIds) {
        ModuleIDs.add(el.ModuleID);
        ContentIDs.add(el.ContentID);
      }
      authFilter["ContentID"] =
        ContentIDs.size > 0 ? Array.from(ContentIDs) : null;
      if (!authFilter["ContentID"]) {
        return res.status(404).send({ message: "No any assign elements" });
      }
      for (const el of Array.from(ContentIDs)) {
        const gePCID = async (parentID) => {
          availContaints.push(parentID);
          const ContentData = await ContentStructure.findOne({
            where: {
              ContentID: parentID,
              IsDeleted: {
                [Op.not]: true,
              },
              OrganizationStructureID: lincense?.EnterpriseID,
            },
            attributes: ["ParentContentID"],
          });
          if (ContentData && ContentData?.ParentContentID) {
            await gePCID(ContentData.ParentContentID);
          }
        };
        await gePCID(el);
      }
      countFilter = `AND `;
      authFilter["ContentID"] = { [Op.in]: availContaints };
      con1 = `AND sop."SOPStatus" = 'Published' AND sop."SOPID" IN ('${Array.from(
        ModuleIDs
      ).join("','")}')`;
      con2 = `AND "SOPStatus" = 'Published' AND "SOPID" IN ('${Array.from(
        ModuleIDs
      ).join("','")}')`;
      con3 = `AND doc."DocumentStatus" = 'Published' AND doc."DocumentID" IN ('${Array.from(
        ModuleIDs
      ).join("','")}')`;
      con4 = `AND "DocumentStatus" = 'Published' AND "DocumentID" IN ('${Array.from(
        ModuleIDs
      ).join("','")}')`;
      con5 = `AND tr."TrainingSimulationStatus" = 'Published' AND tr."TrainingSimulationID" IN ('${Array.from(
        ModuleIDs
      ).join("','")}')`;
      con6 = `AND "TrainingSimulationStatus" = 'Published' AND "TrainingSimulationID" IN ('${Array.from(
        ModuleIDs
      ).join("','")}')`;
      con7 = `AND te."TestSimulationStatus" = 'Published' AND te."TestSimulationID" IN ('${Array.from(
        ModuleIDs
      ).join("','")}')`;
      con8 = `AND "TestSimulationStatus" = 'Published' AND "TestSimulationID" IN ('${Array.from(
        ModuleIDs
      ).join("','")}')`;
      con9 = `AND mcq."TestMCQStatus" = 'Published' AND mcq."TestMCQID" IN ('${Array.from(
        ModuleIDs
      ).join("','")}')`;
      con10 = `AND "TestMCQStatus" = 'Published' AND "TestMCQID" IN ('${Array.from(
        ModuleIDs
      ).join("','")}')`;
      con11 = `AND fm."FormStatus" = 'Published' AND fm."FormID" IN ('${Array.from(
        ModuleIDs
      ).join("','")}')`;
      con12 = `AND "FormStatus" = 'Published' AND "FormID" IN ('${Array.from(
        ModuleIDs
      ).join("','")}')`;
    }
    const data = await ContentStructure.findAll({
      where: {
        ModuleTypeID,
        ParentContentID,
        OrganizationStructureID: lincense?.EnterpriseID,
        IsDeleted: { [Op.not]: true },
        ...authFilter,
      },
      include: {
        model: ModuleMaster,
        as: "ModuleMaster",
        attributes: ["ModuleName"],
        where: {
          ModuleTypeID: ModuleTypeIDs,
        },
      },
      attributes: [
        "ContentID",
        "ContentName",
        "ContentDescription",
        "ModuleTypeID",
        "IsActive",
        [
          literal(`(
          (SELECT COUNT(*) FROM "SopModules" WHERE "ContentID" = "ContentStructure"."ContentID" AND "IsDeleted" IS NOT TRUE AND "IsHidden" = TRUE ${con2})+
          (SELECT COUNT(*) FROM "DocumentModules" WHERE "ContentID" = "ContentStructure"."ContentID" AND "IsDeleted" IS NOT TRUE AND "IsHidden" = TRUE ${con4})+
          (SELECT COUNT(*) FROM "TrainingSimulationModules" WHERE "ContentID" = "ContentStructure"."ContentID" AND "IsDeleted" IS NOT TRUE ${con6} )+
          (SELECT COUNT(*) FROM "TestSimulationModules" WHERE "ContentID" = "ContentStructure"."ContentID" AND "IsDeleted" IS NOT TRUE ${con8} )+
          (SELECT COUNT(*) FROM "TestMcqsModules" WHERE "ContentID" = "ContentStructure"."ContentID" AND "IsDeleted" IS NOT TRUE ${con10} )+
          (SELECT COUNT(*) FROM "FormModules" WHERE "ContentID" = "ContentStructure"."ContentID" AND "IsDeleted" IS NOT TRUE AND "IsHidden" = TRUE ${con12} )
          )`),
          "NosOfChildElements",
        ],
      ],
    });

    let docFile = [];
    if (ParentContentID) {
      const docs = await sequelize.query(
        `
        SELECT
            cs."ContentID",
            sop."SOPID", sop."SOPName", COALESCE(sopd."SOPStatus"::text, sop."SOPStatus"::text) AS "SOPStatus", sopd."SOPStatus"::text AS "PublishStatus",sop."IsHidden" AS "SOPIsHidden",sop."SOPExpiry",sop."IsReactFlow",
            doc."DocumentID", doc."DocumentName", COALESCE(docd."DocumentStatus"::text, doc."DocumentStatus"::text) AS "DocumentStatus", docd."DocumentStatus"::text AS "PublishStatus",doc."IsHidden" AS "DocumentIsHidden",doc."DocumentExpiry",
            tr."TrainingSimulationID", tr."TrainingSimulationName", COALESCE(trd."TrainingSimulationStatus"::text, tr."TrainingSimulationStatus"::text) AS "TrainingSimulationStatus", trd."TrainingSimulationStatus"::text AS "PublishStatus",tr."TrainingSimulationExpiry",
            te."TestSimulationID", te."TestSimulationName", COALESCE(ted."TestSimulationStatus"::text, te."TestSimulationStatus"::text) AS "TestSimulationStatus", ted."TestSimulationStatus"::text AS "PublishStatus",te."TestSimulationExpiry",
            mcq."TestMCQID", mcq."TestMCQName", COALESCE(mcqd."TestMCQStatus"::text, mcq."TestMCQStatus"::text) AS "TestMCQStatus", mcqd."TestMCQStatus"::text AS "PublishStatus",mcq."TestMCQExpiry",
            fm."FormID", fm."FormName", COALESCE(fmd."FormStatus"::text, fm."FormStatus"::text) AS "FormStatus", fmd."FormStatus"::text AS "PublishStatus",fmd."FormModuleDraftID",fm."IsHidden" AS "FormIsHidden",fm."FormExpiry",
            mm."ModuleName", mm."ModuleTypeID"
        FROM "ContentStructures" cs
        LEFT JOIN "SopModules" sop ON sop."ContentID" = cs."ContentID"
            AND sop."ModuleTypeID" = cs."ModuleTypeID" AND sop."IsDeleted" IS NOT TRUE ${con1}
        LEFT JOIN (
            SELECT DISTINCT ON ("SOPID") * FROM "SopModuleDrafts"
            WHERE "IsDeleted" IS NOT TRUE ${con2}
            ORDER BY "SOPID", "CreatedDate" DESC
        ) sopd ON sopd."SOPID" = sop."SOPID"
        LEFT JOIN "DocumentModules" doc ON doc."ContentID" = cs."ContentID"
            AND doc."ModuleTypeID" = cs."ModuleTypeID" AND doc."IsDeleted" IS NOT TRUE ${con3}
        LEFT JOIN (
            SELECT DISTINCT ON ("DocumentID") * FROM "DocumentModuleDrafts"
            WHERE "IsDeleted" IS NOT TRUE ${con4}
            ORDER BY "DocumentID", "CreatedDate" DESC
        ) docd ON docd."DocumentID" = doc."DocumentID"
        LEFT JOIN "TrainingSimulationModules" tr ON tr."ContentID" = cs."ContentID"
            AND tr."ModuleTypeID" = cs."ModuleTypeID" AND tr."IsDeleted" IS NOT TRUE ${con5}
        LEFT JOIN (
            SELECT DISTINCT ON ("TrainingSimulationID") * FROM "TrainingSimulationModuleDrafts"
            WHERE "IsDeleted" IS NOT TRUE ${con6}
            ORDER BY "TrainingSimulationID", "CreatedDate" DESC
        ) trd ON trd."TrainingSimulationID" = tr."TrainingSimulationID"
        LEFT JOIN "TestSimulationModules" te ON te."ContentID" = cs."ContentID"
            AND te."ModuleTypeID" = cs."ModuleTypeID" AND te."IsDeleted" IS NOT TRUE ${con7}
        LEFT JOIN (
            SELECT DISTINCT ON ("TestSimulationID") * FROM "TestSimulationModuleDrafts"
            WHERE "IsDeleted" IS NOT TRUE ${con8}
            ORDER BY "TestSimulationID", "CreatedDate" DESC
        ) ted ON ted."TestSimulationID" = te."TestSimulationID"
        LEFT JOIN "TestMcqsModules" mcq ON mcq."ContentID" = cs."ContentID"
            AND mcq."ModuleTypeID" = cs."ModuleTypeID" AND mcq."IsDeleted" IS NOT TRUE ${con9}
        LEFT JOIN (
            SELECT DISTINCT ON ("TestMCQID") * FROM "TestMcqsModuleDrafts"
            WHERE "IsDeleted" IS NOT TRUE ${con10}
            ORDER BY "TestMCQID", "CreatedDate" DESC
        ) mcqd ON mcqd."TestMCQID" = mcq."TestMCQID"
        LEFT JOIN "FormModules" fm ON fm."ContentID" = cs."ContentID"
            AND fm."ModuleTypeID" = cs."ModuleTypeID" AND fm."IsDeleted" IS NOT TRUE ${con11}
        LEFT JOIN (
            SELECT DISTINCT ON ("FormID") * FROM "FormModuleDrafts"
            WHERE "IsDeleted" IS NOT TRUE ${con12}
            ORDER BY "FormID", "CreatedDate" DESC
        ) fmd ON fmd."FormID" = fm."FormID"
        LEFT JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = cs."ModuleTypeID"
            AND mm."ModuleTypeID" IN ('${ModuleTypeIDs.join("','")}')
        WHERE
            sop."IsDeleted" IS NOT TRUE
            AND doc."IsDeleted" IS NOT TRUE
            AND tr."IsDeleted" IS NOT TRUE
            AND te."IsDeleted" IS NOT TRUE
            AND mcq."IsDeleted" IS NOT TRUE
            AND fm."IsDeleted" IS NOT TRUE
            AND cs."OrganizationStructureID" = '${lincense?.EnterpriseID}'
            AND cs."ContentID" = '${ParentContentID}'
            ${
              currentUserType === "EndUser"
                ? 'AND sop."IsHidden" IS NOT TRUE AND doc."IsHidden" IS NOT TRUE AND fm."IsHidden" IS NOT TRUE'
                : IsGlobalView
                ? ""
                : 'AND (sop."CreatedBy" = :UserID OR doc."CreatedBy" = :UserID OR fm."CreatedBy" = :UserID OR tr."CreatedBy" = :UserID OR te."CreatedBy" = :UserID OR mcq."CreatedBy" = :UserID)'
            }
    `,
        {
          type: QueryTypes.SELECT,
          replacements: {
            UserID: currentUserId,
          },
        }
      );

      const jsonDocs = JSON.parse(JSON.stringify(docs));

      for (const element of jsonDocs) {
        for (const [k, v] of Object.entries(element)) {
          if (!v && typeof v != "boolean") {
            delete element[k];
          }
        }
      }
      docFile =
        jsonDocs.length && Object.keys(jsonDocs[0]).length > 4 ? jsonDocs : [];
    }
    const ancestors = [];
    let level = 0;
    const getAncestors = async (pElementId) => {
      const parentElement = await ContentStructure.findOne({
        where: {
          ContentID: pElementId,
          ModuleTypeID,
          OrganizationStructureID: lincense?.EnterpriseID,
        },
        attributes: ["ContentID", "ContentName", "ParentContentID"],
      });
      if (parentElement) {
        ancestors.push({ ...JSON.parse(JSON.stringify(parentElement)), level });
        level++;
        if (parentElement.ParentContentID) {
          await getAncestors(parentElement.ParentContentID);
        }
      }
    };
    await getAncestors(ParentContentID);
    const bredcrumbs = ancestors
      .map((e) => ({
        breadcrumbId: e.ContentID,
        breadcrumbName: e.ContentName,
        level: ancestors.length - e.level,
      }))
      .sort((a, b) => a.level - b.level);
    for (const el of docFile) {
      for (const e of accessIds) {
        if (el?.FormID == e?.ModuleID) {
          el["UserModuleLinkID"] = e?.UserModuleLinkID;
        }
      }
    }
    return res.status(200).send({
      data,
      docs: docFile,
      bredcrumbs,
      moduleType: ModuleType.toJSON().ModuleName,
      SOPState: currentUserSOPState,
      lastSynced: userDetails.toJSON()?.LastSynced || null,
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(500).send({ message: error.message });
  }
};
exports.getElementData = async (req, res) => {
  const {
    currentUserId,
    ModuleTypeIDs,
    currentUserType,
    lincense,
    currentUserSOPState,
  } = req.payload;
  const {
    ModuleTypeID,
    ParentContentID = null,
    IsEnableMyTask = false,
    IsGlobalView = false,
  } = req.body;
  try {
    if (ModuleTypeIDs.some((el) => el === ModuleTypeID) === false) {
      return res.status(404).send({
        message:
          "Don't have Licence to access the Module. Please Contact Adminstrator",
      });
    }
    const data = await sequelize.query(
      `
              WITH RECURSIVE ancestors AS (
                SELECT 
                    "ContentID", 
                    "ParentContentID", 
                    "ContentName",
                "ModuleTypeID",
                    0 AS depth
                FROM "ContentStructures"
              WHERE "ContentID" = :ParentContentID
                UNION ALL
                SELECT 
                    c."ContentID", 
                    c."ParentContentID", 
                    c."ContentName",
                c."ModuleTypeID",
                    a.depth + 1
                FROM "ContentStructures" c
                JOIN ancestors a ON c."ContentID" = a."ParentContentID"
            ),
            UserDetails AS (
            SELECT "LastSynced" FROM "UserDetails"
            WHERE "UserID" = :UserID
            ),
            ModuleAndContent AS (
            SELECT uml."ModuleID", COALESCE(sm."ContentID", dm."ContentID", tr."ContentID", te."ContentID", tm."ContentID", fm."ContentID" ) AS "ContentID"
            FROM "UserModuleLinks" uml
            LEFT JOIN "SopModules" sm ON sm."SOPID" = uml."ModuleID" 
            LEFT JOIN "DocumentModules" dm ON dm."DocumentID" = uml."ModuleID" 
            LEFT JOIN "TrainingSimulationModules" tr ON tr."TrainingSimulationID" = uml."ModuleID" 
            LEFT JOIN "TestSimulationModules" te ON te."TestSimulationID" = uml."ModuleID" 
            LEFT JOIN "TestMcqsModules" tm ON tm."TestMCQID" = uml."ModuleID" 
            LEFT JOIN "FormModules" fm ON fm."FormID" = uml."ModuleID" 
            WHERE uml."UserID" = :UserID
            AND uml."ModuleTypeID" = :ModuleTypeID
            AND CURRENT_DATE BETWEEN uml."StartDate" AND uml."DueDate"  
            ),
            CategoryIds AS (
              SELECT "ContentID","ParentContentID" FROM "ContentStructures"
              WHERE "ContentID" IN (SELECT "ContentID" FROM ModuleAndContent)
              UNION ALL
              SELECT c."ContentID",c."ParentContentID" FROM "ContentStructures" c
              JOIN CategoryIds a ON c."ContentID" = a."ParentContentID"
            ),
            ModuleElementStatus AS (
            SELECT "DocumentModuleDraftID" AS "ModuleDraftID", "DocumentStatus"::text AS "Status", "CreatedBy","CoOwnerUserID", "DocumentPath" FROM "DocumentModuleDrafts" 
            UNION ALL
            SELECT "SOPDraftID" AS "ModuleDraftID","SOPStatus"::text AS "Status", "CreatedBy","CoOwnerUserID", 'temp.pdf' as "DocumentPath" FROM "SopModuleDrafts"
            ),
            AnyRejectCount AS (
            SELECT "ModuleDraftID", ((("Status" = 'Published' AND "DocumentPath" ILIKE '%.pdf') OR "Status" = 'Draft') AND ("CreatedBy" = :UserID OR :UserID = ANY("CoOwnerUserID"))) 
            OR (("CreatedBy" = :UserID OR :UserID = ANY("CoOwnerUserID")) AND "RejectCount" > 0) AS "IsCanEdit" FROM (
              SELECT mes."ModuleDraftID",mes."Status",mes."CreatedBy","CoOwnerUserID",
              COUNT(ms."ApprovalStatus") FILTER (WHERE ms."ApprovalStatus" = 'Rejected') +
              COUNT(mc."ApprovalStatus") FILTER (WHERE mc."ApprovalStatus" = 'Rejected') +
              COUNT(me."ApprovalStatus") FILTER (WHERE me."ApprovalStatus" = 'Rejected') +
              COUNT(ma."ApprovalStatus") FILTER (WHERE ma."ApprovalStatus" = 'Rejected') AS "RejectCount",
              mes."DocumentPath"
              FROM ModuleElementStatus mes
              LEFT JOIN "ModuleStakeHolders" ms ON COALESCE( ms."DocumentModuleDraftID", ms."SOPDraftID") = mes."ModuleDraftID"
              LEFT JOIN "ModuleCheckers" mc ON COALESCE( mc."DocumentModuleDraftID", mc."SOPDraftID") = mes."ModuleDraftID"
              LEFT JOIN "ModuleEscalations" me ON COALESCE( me."DocumentModuleDraftID", me."SOPDraftID") = mes."ModuleDraftID"
              LEFT JOIN "ModuleApprovers" ma ON COALESCE( ma."DocumentModuleDraftID", ma."SOPDraftID") = mes."ModuleDraftID"
              GROUP BY mes."ModuleDraftID",mes."Status",mes."CreatedBy",mes."CoOwnerUserID", mes."DocumentPath"
              ) AS q
            ),
            ElementCountOriginalData AS (
            SELECT cs."ContentID", COALESCE(sm."SOPID",dm."DocumentID",tr."TrainingSimulationID",te."TestSimulationID",tm."TestMCQID",fm."FormID") AS "ElementID",
            COALESCE(sm."SOPStatus"::TEXT,dm."DocumentStatus"::TEXT,tr."TrainingSimulationStatus"::TEXT,te."TestSimulationStatus"::TEXT,tm."TestMCQStatus"::TEXT,fm."FormStatus"::TEXT) AS "ElementStatus",
            COALESCE(sm."CreatedDate",dm."CreatedDate",tr."CreatedDate",te."CreatedDate",tm."CreatedDate",fm."CreatedDate") AS "ElementCreatedDate"
            FROM "ContentStructures" cs
            LEFT JOIN "SopModuleDrafts" sm ON sm."ContentID" = cs."ContentID" 
            LEFT JOIN "DocumentModuleDrafts" dm ON dm."ContentID" = cs."ContentID" 
            LEFT JOIN "TrainingSimulationModuleDrafts" tr ON tr."ContentID" = cs."ContentID" 
            LEFT JOIN "TestSimulationModuleDrafts" te ON te."ContentID" = cs."ContentID" 
            LEFT JOIN "TestMcqsModuleDrafts" tm ON tm."ContentID" = cs."ContentID" 
            LEFT JOIN "FormModuleDrafts" fm ON fm."ContentID" = cs."ContentID"
            WHERE
            sm."IsDeleted" IS NOT TRUE
            AND dm."IsDeleted" IS NOT TRUE
            AND tr."IsDeleted" IS NOT TRUE
            AND te."IsDeleted" IS NOT TRUE
            AND tm."IsDeleted" IS NOT TRUE
            AND fm."IsDeleted" IS NOT TRUE ${
              IsGlobalView ||
              IsEnableMyTask ||
              currentUserType === "EndUser" ||
              currentUserType === "Auditor"
                ? ""
                : `AND (sm."CreatedBy" = :UserID OR dm."CreatedBy" = :UserID OR tr."CreatedBy" = :UserID OR te."CreatedBy" = :UserID OR tm."CreatedBy" = :UserID OR fm."CreatedBy" = :UserID
                OR :UserID = ANY(sm."CoOwnerUserID") OR :UserID = ANY(dm."CoOwnerUserID") )`
            }
            ${
              IsEnableMyTask || currentUserType === "EndUser"
                ? `AND  COALESCE(sm."SOPID",dm."DocumentID",tr."TrainingSimulationID",te."TestSimulationID",tm."TestMCQID",fm."FormID") IN (SELECT "ModuleID" FROM ModuleAndContent)`
                : ""
            }
            ),
            CategoryCountFilter AS (
            SELECT ecd.*, ROW_NUMBER() OVER (PARTITION BY ecd."ElementID" ORDER BY ecd."ElementCreatedDate" DESC) AS rn FROM ElementCountOriginalData ecd
            ),
            ElementCounts AS (
            SELECT ecf."ContentID", COUNT(*) AS "ChildElementCount",
            COUNT(*) FILTER (WHERE ecf."ElementStatus" = 'Published') AS "ChildPublishElementCount"
            FROM CategoryCountFilter ecf
            WHERE ecf.rn = 1 ${
              currentUserType === "Auditor"
                ? `AND ecf."ElementStatus" = 'Published'`
                : ""
            }
            GROUP BY ecf."ContentID"
            ),
            Bredcrums AS (
            SELECT "ContentID" AS "breadcrumbId","ContentName" AS "breadcrumbName","depth" as "level" FROM ancestors
            ),
            Category as (
            SELECT qq."ContentID", qq."ContentDescription",qq."ContentName",qq."IsActive",qq."ModuleTypeID",
            COALESCE("NosOfChildCategories",0) AS "NosOfChildCategories", COALESCE(ec."ChildElementCount",0) AS "NosOfChildElements",COALESCE(ec."ChildPublishElementCount",0) AS "NosOfChildPublishElements",
            qq."ModuleMaster",qq."CreatedBy" FROM (
            SELECT cs."ContentID", cs."ContentDescription",cs."ContentName",cs."IsActive",cs."ModuleTypeID",
            COUNT(DISTINCT cs1."ContentID") FILTER (WHERE cs1."ContentID" IS NOT NULL ${
              IsEnableMyTask || currentUserType === "EndUser"
                ? `AND cs1."ContentID" IN (SELECT "ContentID" FROM CategoryIds)`
                : ""
            }) AS "NosOfChildCategories",
            jsonb_build_object('ModuleName',mm."ModuleName") AS "ModuleMaster",cs."CreatedBy"
            FROM "ContentStructures" cs 
            INNER JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = cs."ModuleTypeID"
            LEFT JOIN "ContentStructures" cs1 ON cs1."ParentContentID" = cs."ContentID" AND cs1."IsActive" = true AND cs1."IsDeleted" = false
            WHERE cs."ParentContentID" ${
              !ParentContentID ? "IS NULL" : "= :ParentContentID"
            } AND cs."OrganizationStructureID" = :OrganizationStructureID AND cs."IsActive" = true AND cs."IsDeleted" = false
            AND cs."ModuleTypeID" = :ModuleTypeID ${
              IsEnableMyTask || currentUserType === "EndUser"
                ? `AND cs."ContentID" IN (SELECT "ContentID" FROM CategoryIds)`
                : ""
            }
            GROUP BY cs."ContentID", cs."ContentDescription",cs."ContentName",cs."IsActive",cs."ModuleTypeID",mm."ModuleName",cs."CreatedBy"
            ) qq
            LEFT JOIN ElementCounts ec ON ec."ContentID" = qq."ContentID"
            GROUP BY qq."ContentID", qq."ContentDescription",qq."ContentName",qq."IsActive",qq."ModuleTypeID",
            qq."NosOfChildCategories", qq."ModuleMaster",ec."ChildElementCount",ec."ChildPublishElementCount",qq."CreatedBy"
            ),
            Elements AS (
              SELECT "ContentID", CASE WHEN "ContentID" IS NOT NULL THEN jsonb_agg(jsonb_build_object(
                        'ContentID',"ContentID",
                        'DocumentID',"DocumentID",
                        'DocumentName',"DocumentName",
                        'DocumentStatus',"DocumentStatus",
                        'DocumentIsHidden',"IsHidden",
                        'ModuleName',"ModuleName",
                        'SequenceNumber',"SequenceNumber",
                        'ModuleTypeID',"ModuleTypeID",
                        'IsCanEdit',"IsCanEdit",
                        'Authority',"Authority",
                        'IsCanAssign',"IsCanAssign"
                    )) ELSE NULL END AS "Elements" FROM (
            SELECT dm."ContentID", dm."DocumentID", dm."DocumentName", dm."DocumentStatus"::text, d."IsHidden", mm."ModuleName", mm."ModuleTypeID",
            ROW_NUMBER() OVER (PARTITION BY dm."DocumentID" ORDER BY dm."CreatedDate" DESC) AS rn,d."SequenceNumber",ar."IsCanEdit",
            CASE WHEN dm."CreatedBy" = :UserID OR d."CreatedBy" = :UserID THEN 'Owner'
            WHEN :UserID = ANY(dm."CoOwnerUserID") OR :UserID = ANY(d."CoOwnerUserID") THEN 'Co-Owner' ELSE 'Others' END AS "Authority",
            CASE WHEN dm."DocumentPath" ILIKE '%.pdf' AND dm."DocumentStatus" = 'Published' THEN TRUE ELSE FALSE END AS "IsCanAssign"
            FROM "ContentStructures" cs 
            LEFT JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = cs."ModuleTypeID"
            LEFT JOIN "DocumentModuleDrafts" dm ON dm."ContentID" = cs."ContentID" 
            LEFT JOIN "DocumentModules" d ON d."DocumentID" = dm."DocumentID" 
            LEFT JOIN AnyRejectCount ar ON ar."ModuleDraftID" = dm."DocumentModuleDraftID"
            WHERE dm."IsDeleted" IS NOT TRUE AND cs."IsActive" = true ${
              (IsGlobalView && currentUserType != "Auditor") ||
              IsEnableMyTask ||
              currentUserType === "EndUser" ||
              currentUserType === "Auditor"
                ? ""
                : `AND (dm."CreatedBy" = :UserID OR d."CreatedBy" = :UserID OR :UserID = ANY(d."CoOwnerUserID") OR :UserID = ANY(dm."CoOwnerUserID"))`
            }
            ${
              (IsEnableMyTask && currentUserType != "Auditor") ||
              currentUserType === "EndUser"
                ? `AND dm."DocumentID" IN (SELECT "ModuleID" FROM ModuleAndContent) AND dm."DocumentStatus" = 'Published'`
                : ""
            }
            GROUP BY dm."ContentID", dm."DocumentID", dm."DocumentName", dm."DocumentStatus", d."IsHidden", mm."ModuleName", mm."ModuleTypeID",dm."CreatedDate", d."SequenceNumber",ar."IsCanEdit",
            d."CreatedBy",d."CoOwnerUserID",dm."CreatedBy",dm."CoOwnerUserID",dm."DocumentPath"
            ) dm WHERE rn = 1 ${
              currentUserType === "Auditor"
                ? `AND dm."DocumentStatus" = 'Published'`
                : ""
            } GROUP BY "ContentID"
            UNION ALL
                    SELECT "ContentID", CASE WHEN "ContentID" IS NOT NULL THEN jsonb_agg(jsonb_build_object(
                      'ContentID',"ContentID",
                      'SOPID',"SOPID",
                      'SOPName',"SOPName",
                      'SOPStatus',"SOPStatus",
                      'SOPIsHidden',"IsHidden",
                      'ModuleName',"ModuleName",
                      'SequenceNumber',"SequenceNumber",
                      'ModuleTypeID',"ModuleTypeID",
                      'IsCanEdit',"IsCanEdit",
                      'Authority',"Authority")) ELSE NULL END AS "Elements" FROM (
            SELECT sm."ContentID",sm."SOPID", sm."SOPName", sm."SOPStatus"::text, s."IsHidden", mm."ModuleName", mm."ModuleTypeID",
            ROW_NUMBER() OVER (PARTITION BY sm."SOPID" ORDER BY sm."CreatedDate" DESC) AS rn,s."SequenceNumber", ar."IsCanEdit",
            CASE WHEN sm."CreatedBy" = :UserID OR s."CreatedBy" = :UserID THEN 'Owner'
            WHEN :UserID = ANY(sm."CoOwnerUserID") OR :UserID = ANY(s."CoOwnerUserID") THEN 'Co-Owner' ELSE 'Others' END AS "Authority"
            FROM "ContentStructures" cs
            LEFT JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = cs."ModuleTypeID"
            LEFT JOIN "SopModuleDrafts" sm ON sm."ContentID" = cs."ContentID"
            LEFT JOIN "SopModules" s ON s."SOPID" = sm."SOPID" 
            LEFT JOIN AnyRejectCount ar ON ar."ModuleDraftID" = sm."SOPDraftID"
            WHERE sm."IsDeleted" IS NOT TRUE AND cs."IsActive" = true ${
              (IsGlobalView && currentUserType !== "Auditor") ||
              IsEnableMyTask ||
              currentUserType === "EndUser" ||
              currentUserType === "Auditor"
                ? ""
                : `AND (sm."CreatedBy" = :UserID OR s."CreatedBy" = :UserID OR :UserID = ANY(sm."CoOwnerUserID") OR :UserID = ANY(s."CoOwnerUserID"))`
            }
            ${
              (IsEnableMyTask && currentUserType != "Auditor") ||
              currentUserType === "EndUser"
                ? `AND sm."SOPID" IN (SELECT "ModuleID" FROM ModuleAndContent) AND sm."SOPStatus" = 'Published'`
                : ""
            }
            GROUP BY sm."ContentID",sm."SOPID", sm."SOPName", sm."SOPStatus", s."IsHidden", mm."ModuleName", mm."ModuleTypeID",sm."CreatedDate",s."SequenceNumber",ar."IsCanEdit",
            s."CreatedBy",s."CoOwnerUserID",sm."CreatedBy",sm."CoOwnerUserID"
            ) sm WHERE sm.rn = 1 ${
              currentUserType === "Auditor"
                ? `AND sm."SOPStatus" = 'Published'`
                : ""
            } GROUP BY "ContentID"
            UNION ALL
                    SELECT "ContentID", CASE WHEN "ContentID" IS NOT NULL THEN jsonb_agg(jsonb_build_object(
                      'ContentID',"ContentID",
                      'TrainingSimulationID',"TrainingSimulationID",
                      'TrainingSimulationName',"TrainingSimulationName",
                      'TrainingSimulationStatus',"TrainingSimulationStatus",
                      'TrainingSimulationExpiry',"TrainingSimulationExpiry",
                      'ModuleName',"ModuleName",
                      'SequenceNumber',"SequenceNumber",
                      'ModuleTypeID',"ModuleTypeID")) ELSE NULL END AS "Elements" FROM (
            SELECT tsm."ContentID", tsm."TrainingSimulationID", tsm."TrainingSimulationName", tsm."TrainingSimulationStatus"::TEXT, tsm."TrainingSimulationExpiry",
            mm."ModuleName", mm."ModuleTypeID",
            ROW_NUMBER() OVER (PARTITION BY tsm."TrainingSimulationID" ORDER BY tsm."CreatedDate" DESC) AS rn,tsm2."SequenceNumber"
            FROM "ContentStructures" cs
            LEFT JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = cs."ModuleTypeID"
            LEFT JOIN "TrainingSimulationModuleDrafts" tsm ON tsm."ContentID" = cs."ContentID"
            LEFT JOIN "TrainingSimulationModules" tsm2 ON tsm2."TrainingSimulationID" = tsm."TrainingSimulationID"
            WHERE tsm."IsDeleted" IS NOT TRUE AND cs."IsActive" = true ${
              (IsGlobalView && currentUserType !== "Auditor") ||
              IsEnableMyTask ||
              currentUserType === "EndUser" ||
              currentUserType === "Auditor"
                ? ""
                : `AND tsm."CreatedBy" = :UserID `
            }
            ${
              (IsEnableMyTask && currentUserType != "Auditor") ||
              currentUserType === "EndUser"
                ? `AND tsm."TrainingSimulationID" IN (SELECT "ModuleID" FROM ModuleAndContent) AND tsm."TrainingSimulationStatus" = 'Published'`
                : ""
            }
            GROUP BY tsm."ContentID", tsm."TrainingSimulationID", tsm."TrainingSimulationName", tsm."TrainingSimulationStatus", tsm."TrainingSimulationExpiry",
            mm."ModuleName", mm."ModuleTypeID",tsm."CreatedDate", tsm2."SequenceNumber"
            ) tsm WHERE rn = 1 ${
              currentUserType === "Auditor"
                ? `AND tsm."TrainingSimulationStatus" = 'Published'`
                : ""
            } GROUP BY "ContentID"
            UNION ALL
                    SELECT "ContentID", CASE WHEN "ContentID" IS NOT NULL THEN jsonb_agg(jsonb_build_object(
                      'ContentID',"ContentID",
                      'TestSimulationID',"TestSimulationID",
                      'TestSimulationName',"TestSimulationName",
                      'TestSimulationStatus',"TestSimulationStatus",
                      'TestSimulationExpiry',"TestSimulationExpiry",
                      'ModuleName',"ModuleName",
                      'SequenceNumber',"SequenceNumber",
                      'ModuleTypeID',"ModuleTypeID")) ELSE NULL END AS "Elements" FROM (
            SELECT tsm2."ContentID", tsm2."TestSimulationID", tsm2."TestSimulationName", tsm2."TestSimulationStatus"::TEXT, tsm2."TestSimulationExpiry",
            mm."ModuleName", mm."ModuleTypeID",
            ROW_NUMBER() OVER (PARTITION BY tsm2."TestSimulationID" ORDER BY tsm2."CreatedDate" DESC) AS rn,tsm."SequenceNumber"
            FROM "ContentStructures" cs
            LEFT JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = cs."ModuleTypeID"
            LEFT JOIN "TestSimulationModuleDrafts" tsm2 ON tsm2."ContentID" = cs."ContentID"
            LEFT JOIN "TestSimulationModules" tsm ON tsm."TestSimulationID" = tsm2."TestSimulationID"
            WHERE tsm2."IsDeleted" IS NOT TRUE AND cs."IsActive" = true ${
              (IsGlobalView && currentUserType !== "Auditor") ||
              IsEnableMyTask ||
              currentUserType === "EndUser" ||
              currentUserType === "Auditor"
                ? ""
                : `AND tsm2."CreatedBy" = :UserID`
            }
            ${
              IsEnableMyTask || currentUserType === "EndUser"
                ? `AND tsm2."TestSimulationID" IN (SELECT "ModuleID" FROM ModuleAndContent) AND tsm2."TestSimulationStatus" = 'Published'`
                : ""
            }
            GROUP BY tsm2."ContentID", tsm2."TestSimulationID", tsm2."TestSimulationName", tsm2."TestSimulationStatus", tsm2."TestSimulationExpiry",
            mm."ModuleName", mm."ModuleTypeID",tsm2."CreatedDate", tsm."SequenceNumber"
            ) tsm2 WHERE tsm2.rn = 1 ${
              currentUserType === "Auditor"
                ? `AND tsm2."TestSimulationStatus" = 'Published'`
                : ""
            } GROUP BY "ContentID"
            UNION ALL
            SELECT "ContentID", CASE WHEN "ContentID" IS NOT NULL THEN jsonb_agg(jsonb_build_object(
                      'ContentID',"ContentID",
                      'TestMCQID',"TestMCQID",
                      'TestMCQName',"TestMCQName",
                      'TestMCQStatus',"TestMCQStatus",
                      'TestMCQExpiry',"TestMCQExpiry",
                      'ModuleName',"ModuleName",
                      'SequenceNumber',"SequenceNumber",
                      'ModuleTypeID',"ModuleTypeID")) ELSE NULL END AS "Elements" FROM (
            SELECT tmm."ContentID", tmm."TestMCQID", tmm."TestMCQName", tmm."TestMCQStatus"::TEXT, tmm."TestMCQExpiry",mm."ModuleName", mm."ModuleTypeID",
            ROW_NUMBER() OVER (PARTITION BY tmm."TestMCQID" ORDER BY tmm."CreatedDate" DESC) AS rn,mcq."SequenceNumber"
            FROM "ContentStructures" cs
            LEFT JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = cs."ModuleTypeID"
            LEFT JOIN "TestMcqsModuleDrafts" tmm ON tmm."ContentID" = cs."ContentID"
            LEFT JOIN "TestMcqsModules" mcq ON mcq."TestMCQID" = tmm."TestMCQID"
            WHERE tmm."IsDeleted" IS NOT TRUE AND cs."IsActive" = true ${
              (IsGlobalView && currentUserType !== "Auditor") ||
              IsEnableMyTask ||
              currentUserType === "EndUser" ||
              currentUserType === "Auditor"
                ? ""
                : `AND tmm."CreatedBy" = :UserID `
            }
            ${
              IsEnableMyTask || currentUserType === "EndUser"
                ? `AND tmm."TestMCQID" IN (SELECT "ModuleID" FROM ModuleAndContent) AND tmm."TestMCQStatus" = 'Published'`
                : ""
            }
            GROUP BY tmm."ContentID", tmm."TestMCQID", tmm."TestMCQName", tmm."TestMCQStatus", tmm."TestMCQExpiry",mm."ModuleName", mm."ModuleTypeID",tmm."CreatedDate",mcq."SequenceNumber"
            ) tmm WHERE rn = 1 ${
              currentUserType === "Auditor"
                ? `AND tmm."TestMCQStatus" = 'Published'`
                : ""
            } GROUP BY "ContentID"
            UNION ALL
                    SELECT "ContentID", CASE WHEN "ContentID" IS NOT NULL THEN jsonb_agg(jsonb_build_object(
                      'ContentID',"ContentID",
                      'FormID',"FormID",
                      'FormName',"FormName",
                      'FormStatus',"FormStatus",
                      'FormIsHidden',"IsHidden",
                      'FormExpiry',"FormExpiry",
                      'FormModuleDraftID',"FormModuleDraftID",
                      'ModuleName',"ModuleName",
                      'SequenceNumber',"SequenceNumber",
                      'ModuleTypeID',"ModuleTypeID")) ELSE NULL END AS "Elements" FROM (
            SELECT fm."ContentID",fm."FormID", fm."FormName", fm."FormStatus"::TEXT, f."IsHidden", fm."FormExpiry", fm."FormModuleDraftID",
            mm."ModuleName", mm."ModuleTypeID",
            ROW_NUMBER() OVER (PARTITION BY fm."FormID" ORDER BY fm."CreatedDate" DESC) AS rn,f."SequenceNumber"
            FROM "ContentStructures" cs
            LEFT JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = cs."ModuleTypeID"
            LEFT JOIN "FormModuleDrafts" fm ON fm."ContentID" = cs."ContentID"
            LEFT JOIN "FormModules" f ON f."FormID" = fm."FormID" 
            WHERE fm."IsDeleted" IS NOT TRUE AND cs."IsActive" = true ${
              (IsGlobalView && currentUserType !== "Auditor") ||
              IsEnableMyTask ||
              currentUserType === "EndUser" ||
              currentUserType === "Auditor"
                ? ""
                : `AND (fm."CreatedBy" = :UserID OR f."CreatedBy" = :UserID)`
            }
            ${
              IsEnableMyTask || currentUserType === "EndUser"
                ? `AND fm."FormID" IN (SELECT "ModuleID" FROM ModuleAndContent) AND fm."FormStatus" = 'Published'`
                : ""
            }
            GROUP BY fm."ContentID",fm."FormID", fm."FormName", fm."FormStatus", f."IsHidden", fm."FormExpiry", fm."FormModuleDraftID",
            mm."ModuleName", mm."ModuleTypeID",fm."CreatedDate",f."SequenceNumber"
            ) fm WHERE rn = 1 ${
              currentUserType === "Auditor"
                ? `AND fm."FormStatus" = 'Published'`
                : ""
            } GROUP BY "ContentID"
            ),
            BreadcrumData AS (
            SELECT jsonb_agg(jsonb_build_object('breadcrumbId', "breadcrumbId", 'breadcrumbName', "breadcrumbName", 'level', "level")) AS "Bredcrumbs"
            FROM Bredcrums
            ),
            CategoryData AS (
            SELECT jsonb_agg(jsonb_build_object(
                'ContentID', "ContentID",
                'ContentDescription', "ContentDescription",
                'ContentName', "ContentName",
                'IsActive', "IsActive",
                'NosOfChildCategories', "NosOfChildCategories",
                'NosOfChildElements', "NosOfChildElements",
                'NosOfChildPublishElements', "NosOfChildPublishElements",
                'ModuleMaster', "ModuleMaster",
                'IsCanEdit',CASE WHEN "CreatedBy" = :UserID THEN TRUE ELSE FALSE END)) AS "Categories"
            FROM Category
            )

            SELECT 
            COALESCE(bd."Bredcrumbs", '[]'::jsonb) as bredcrumbs,
            COALESCE(cd."Categories", '[]'::jsonb) as data,
            COALESCE(e."Elements", '[]'::jsonb) as docs,
            ud."LastSynced" as "lastSynced",
            mm."ModuleName" as "moduleType",
            '${currentUserSOPState}' as "SOPState"
            FROM "ModuleMasters" mm
            LEFT JOIN BreadcrumData bd ON true
            LEFT JOIN CategoryData cd ON true
            LEFT JOIN Elements e ON e."ContentID" = :ParentContentID
            LEFT JOIN UserDetails ud ON true
            WHERE mm."ModuleTypeID" = :ModuleTypeID
      `,
      {
        type: QueryTypes.SELECT,
        replacements: {
          UserID: currentUserId,
          ModuleTypeID,
          OrganizationStructureID: lincense?.EnterpriseID,
          ParentContentID,
        },
      }
    );
    if (!data || data.length === 0) {
      return res.status(404).send({ message: "No any assign elements !" });
    }
    res.status(200).send({ ...data[0] });
  } catch (error) {
    console.error(error);
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(500).send({ message: error.message });
  }
};

exports.deleteElement = async (req, res) => {
  const t = await sequelize.transaction();
  const { currentUserId } = req.payload;
  const { ContentID } = req.body;
  try {
    if (!ContentID) {
      await t.rollback();
      res.status(400).send({ message: "ContentID is required" });
      return;
    }
    const data = await sequelize.query(
      `
                WITH RECURSIVE "CategoryHierarchy" AS (
                SELECT 
                    cs."ContentID", 
                    cs."ModuleTypeID", 
                    cs."ParentContentID", 
                    cs."ContentName"
                FROM 
                    "ContentStructures" cs
                WHERE 
                    cs."ContentID" = :ContentID
                    AND cs."IsDeleted" IS NOT TRUE
                UNION ALL
                SELECT 
                    cs."ContentID", 
                    cs."ModuleTypeID", 
                    cs."ParentContentID", 
                    cs."ContentName"
                FROM 
                    "ContentStructures" cs
                INNER JOIN 
                    "CategoryHierarchy" ch 
                ON 
                    ch."ContentID" = cs."ParentContentID"
                WHERE 
                     cs."IsDeleted" IS NOT TRUE
            )
            SELECT 
                mm."ModuleName", 
                ch.*, 
                    CASE 
                        WHEN mm."ModuleName" = 'SOP' THEN
                            (SELECT 
                                json_agg(json_build_object(
                                    'ElementID', sm."SOPID",
                                    'ElementName', sm."SOPName",
                                    'LinkedSOPID', sm2."SOPID",
                                    'LinkedSOPName', sm2."SOPName"
                                ))
                            FROM 
                                "SopModules" sm
                            LEFT JOIN 
                                "SopAttachmentLinks" sal 
                                ON sal."ContentLink"::text = sm."SOPID"::text
                            LEFT JOIN 
                                "SopDetails" sd 
                                ON sd."SopDetailsID" = sal."SopDetailsID"
                            LEFT JOIN 
                                "SopModules" sm2 
                                ON sm2."SOPID" = sd."SopID"
                            WHERE 
                      sm."ContentID" = ch."ContentID"
                                AND sm."SOPStatus" = 'Published' 
                                AND sm."SOPIsActive" = TRUE 
                                AND sm."IsDeleted" IS NOT TRUE)
                        WHEN mm."ModuleName" = 'Document' THEN
                            (SELECT 
                                json_agg(json_build_object(
                                    'ElementID', dm."DocumentID",
                                    'ElementName', dm."DocumentName",
                                    'LinkedSOPID', sm2."SOPID",
                                    'LinkedSOPName', sm2."SOPName"
                                ))
                            FROM 
                                "DocumentModules" dm
                            LEFT JOIN 
                                "SopAttachmentLinks" sal 
                                ON sal."ContentLink"::text = dm."DocumentID"::text
                            LEFT JOIN 
                                "SopDetails" sd 
                                ON sd."SopDetailsID" = sal."SopDetailsID"
                            LEFT JOIN 
                                "SopModules" sm2 
                                ON sm2."SOPID" = sd."SopID"
                            WHERE 
                      dm."ContentID" = ch."ContentID"
                                AND dm."DocumentStatus" = 'Published' 
                                AND dm."DocumentIsActive" = TRUE 
                                AND dm."IsDeleted" IS NOT TRUE)
                        WHEN mm."ModuleName" = 'Skill Building' THEN
                            (SELECT 
                                json_agg(json_build_object(
                                    'ElementID', tsm."TrainingSimulationID",
                                    'ElementName', tsm."TrainingSimulationName",
                                    'LinkedSOPID', sm2."SOPID",
                                    'LinkedSOPName', sm2."SOPName"
                                ))
                            FROM 
                                "TrainingSimulationModules" tsm
                            LEFT JOIN 
                                "SopAttachmentLinks" sal 
                                ON sal."ContentLink"::text = tsm."TrainingSimulationID"::text
                            LEFT JOIN 
                                "SopDetails" sd 
                                ON sd."SopDetailsID" = sal."SopDetailsID"
                            LEFT JOIN 
                                "SopModules" sm2 
                                ON sm2."SOPID" = sd."SopID"
                            WHERE 
                      tsm."ContentID" = ch."ContentID"
                                AND tsm."TrainingSimulationStatus" = 'Published' 
                                AND tsm."TrainingSimulationIsActive" = TRUE 
                                AND tsm."IsDeleted" IS NOT TRUE)
                        WHEN mm."ModuleName" = 'Skill Assessment' THEN
                            (SELECT 
                                json_agg(json_build_object(
                                    'ElementID', tsm."TestSimulationID",
                                    'ElementName', tsm."TestSimulationName",
                                    'LinkedSOPID', sm2."SOPID",
                                    'LinkedSOPName', sm2."SOPName"
                                ))
                            FROM 
                                "TestSimulationModules" tsm
                            LEFT JOIN 
                                "SopAttachmentLinks" sal 
                                ON sal."ContentLink"::text = tsm."TestSimulationID"::text
                            LEFT JOIN 
                                "SopDetails" sd 
                                ON sd."SopDetailsID" = sal."SopDetailsID"
                            LEFT JOIN 
                                "SopModules" sm2 
                                ON sm2."SOPID" = sd."SopID"
                            WHERE 
                      tsm."ContentID" = ch."ContentID"
                                AND tsm."TestSimulationStatus" = 'Published' 
                                AND tsm."TestSimulationIsActive" = TRUE 
                                AND tsm."IsDeleted" IS NOT TRUE)
                        WHEN mm."ModuleName" = 'TestMCQ' THEN
                            (SELECT 
                                json_agg(json_build_object(
                                    'ElementID', mcq."TestMCQID",
                                    'ElementName', mcq."TestMCQName",
                                    'LinkedSOPID', sm2."SOPID",
                                    'LinkedSOPName', sm2."SOPName"
                                ))
                            FROM 
                                "TestMcqsModules" mcq
                            LEFT JOIN 
                                "SopAttachmentLinks" sal 
                                ON sal."ContentLink"::text = mcq."TestMCQID"::text
                            LEFT JOIN 
                                "SopDetails" sd 
                                ON sd."SopDetailsID" = sal."SopDetailsID"
                            LEFT JOIN 
                                "SopModules" sm2 
                                ON sm2."SOPID" = sd."SopID"
                            WHERE 
                      mcq."ContentID" = ch."ContentID"
                                AND mcq."TestMCQStatus" = 'Published' 
                                AND mcq."TestMCQIsActive" = TRUE 
                                AND mcq."IsDeleted" IS NOT TRUE)
                    END AS "ContentElements"
            FROM 
                "CategoryHierarchy" ch
            INNER JOIN 
                "ModuleMasters" mm 
                ON mm."ModuleTypeID" = ch."ModuleTypeID"
            GROUP BY 
                mm."ModuleName", ch."ContentID", ch."ModuleTypeID", ch."ParentContentID", ch."ContentName";

      `,
      {
        type: QueryTypes.SELECT,
        replacements: { ContentID },
      }
    );
    if (
      data.length > 1 ||
      (data.length == 1 &&
        data[0]?.ContentID == ContentID &&
        data[0]?.ContentElements?.length > 1) ||
      (data.length == 1 &&
        data[0]?.ContentID == ContentID &&
        data[0]?.ContentElements != null)
    ) {
      await t.rollback();
      res.status(400).send({
        data,
        message:
          "Multiple Nested elements/linked elements need to remove first",
      });
    } else if (
      data.length == 1 &&
      data[0]?.ContentID == ContentID &&
      data[0]?.ContentElements == null
    ) {
      await ContentStructure.update(
        {
          IsActive: false,
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        { where: { ContentID }, transaction: t }
      );

      const hierarchy = await helper.getHierarchicalStructure(
        ContentID,
        "TOP_TO_BOTTOM"
      );

      const userDetails = await UserDetails.findOne({
        where: { UserID: currentUserId, IsDeleted: false },
        attributes: ["DesktopFolderSyncPath"],
      });

      if (userDetails?.DesktopFolderSyncPath) {
        const rootDir = userDetails?.DesktopFolderSyncPath;

        syncDeleteCategory(currentUserId, {
          hierarchy,
          rootDir,
          contentID: ContentID,
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
      res.status(200).send({ message: "Element deleted successfully" });
    } else {
      await t.rollback();
      res.status(404).send({ message: "Element not found" });
    }
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(500).send({ message: error.message });
  }
};
exports.testGetElements = async (req, res) => {
  const { currentUserId } = req.payload;
  const { ModuleTypeID, ParentContentID } = req.body;
  try {
    const assignedElements = await UserModuleLink.findAll({
      where: {
        UserID: currentUserId,
        StartDate: { [Op.lte]: new Date() },
        [Op.or]: [{ DueDate: { [Op.gte]: new Date() } }, { DueDate: null }],
      },
      attributes: ["ModuleTypeID", "ModuleID"],
    });

    res.status(200).send({ assignedElements });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(500).send({ message: error.message });
  }
};

exports.getElementDetails = async (req, res) => {
  const { currentUserId, currentUserType, lincense } = req.payload;
  const {
    SOPID = null,
    DocumentID = null,
    TrainingSimulationID = null,
    TestSimulationID = null,
    TestMCQID = null,
    IsActionable = false,
    IsDraft = false,
    IsEnableMyTask = false,
  } = req.body;
  try {
    let moduleData, moduleDetails;
    const ancestors = [];
    let level = 0;
    if (IsActionable || IsDraft) {
      if (SOPID) {
        // First get the SopModuleDraft
        const sopModuleDraft = await SopModuleDraft.findOne({
          where: { SOPDraftID: SOPID },
          attributes: {
            include: [
              [
                sequelize.literal(`
                  (
                    SELECT
                      uml."IsAncknowledged"
                    FROM "UserModuleAccessLogs" uml
                    WHERE
                      uml."ModuleID" = "SopModuleDraft"."SOPID"
                      and uml."UserID"= '${currentUserId}'
                      and uml."IsAncknowledged" = true
                      and uml."MasterVersion"::text = "SopModuleDraft"."MasterVersion"::text
                  )
                  `),
                "IsAncknowledged",
              ],
              [
                sequelize.literal(`
                  ( SELECT "SequenceNumber" FROM "SopModules" WHERE "SOPID" = "SopModuleDraft"."SOPID" )`),
                "SequenceNumber",
              ],
              [
                sequelize.literal(`(
                    SELECT json_agg(json_build_object(
                      'MasterVersion',am."MasterVersion",
                      'DraftVersion',am."DraftVersion",
                      'CommentText',am."CommentText",
                      'CreatedDateTime',am."CreatedDateTime",
                      'ActionType',am."ActionType",
                      'CommentBy', CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName") 
                    ))
                    FROM "AuditorComments" am 
                    INNER JOIN "UserDetails" ud ON ud."UserID" = am."UserID"
                    WHERE am."ModuleID" = "SopModuleDraft"."SOPDraftID"                  
                      )`),
                "AuditorMessages",
              ],
              [
                sequelize.literal(`
                (
                  select json_build_object('NoOfRisk',coalesce(sum(rac."NoOfRisk"),0),
                  'NoOfCompliance',coalesce(sum(rac."NoOfCompliance"),0),
                  'NoOfClause',coalesce(sum(rac."NoOfClause"),0))  
                  from "SopModuleDrafts" smd
                  inner join "SopDetails" sd on sd."SopID" = smd."SOPDraftID" 
                  inner join "SopAttachmentLinks" sal on sal."SopDetailsID" = sd."SopDetailsID" 
                  and sal."ContentLinkType" = 'doc'
                  inner join "DocumentModules" dm on dm."DocumentID"::text = sal."ContentLink"::text 
                  inner join "RiskAndCompliences" rac on rac."DocumentID"::text = sal."ContentLink"::text 
                  and (rac."MasterVersion"::text = dm."MasterVersion"::text OR rac."DraftVersion"::text = dm."DraftVersion"::text)
                  where smd."SOPDraftID" = "SopModuleDraft"."SOPDraftID"
                  )
                `),
                "RiskAndComplience",
              ],
            ],
          },
          include: [
            {
              model: SopDetails,
              as: "SOPDetails",
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
              attributes: [
                "DocumentPath",
                "DocumentName",
                "MasterVersion",
                "DraftVersion",
              ],
              include: {
                model: RiskAndCompliences,
                attributes: [
                  "RiskAndComplianceID",
                  "NoOfRisk",
                  "NoOfCompliance",
                  "NoOfClause",
                  "RiskDetailsArrays",
                  "ComplianceDetailsArrays",
                  "ClauseDetailsArrays",
                ],
                required: false,
              },
            },
          ],
        });
        moduleData = sopModuleDraft;
        moduleDetails = await sequelize.query(
          `
        SELECT
            CASE
              WHEN sm."ModifiedDate" IS NOT NULL THEN (
                SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
                FROM "UserDetails"
                WHERE "UserID" = sm."ModifiedBy"
              )
              ELSE (
                SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
                FROM "UserDetails"
                WHERE "UserID" = sm."CreatedBy"
              )
            END AS "UploadeBy",
            COALESCE(sm."ModifiedDate", sm."CreatedDate") AS "UploadedOn",
            (
              SELECT json_agg(json_build_object(
                'CreatedDate', d."CreatedDate",
                'CreatedBy', CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName"),
                'MasterVersion', d."MasterVersion",
                'DraftVersion', d."DraftVersion",
                'SOPID', d."SOPDraftID"
              ))
              FROM "SopModuleDrafts" d
              JOIN "UserDetails" ud ON ud."UserID" = d."CreatedBy"
              WHERE d."SOPID" = sm."SOPID" 
            ) AS "History"
          FROM "SopModuleDrafts" sm
          WHERE sm."SOPDraftID" = :SOPID
          ORDER BY sm."CreatedDate" DESC
          LIMIT 1;
        `,
          {
            replacements: { SOPID },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        if (moduleData?.DocumentModule) {
          moduleData.DocumentModule["DocumentPath"] = path.posix.join(
            "file/d/",
            `${path.basename(
              JSON.parse(JSON.stringify(moduleData))?.DocumentModule
                ?.DocumentPath
            )}`
          );
        }

        // Fetch master SopModule with all SopDetails to ensure complete data
        if (sopModuleDraft?.SOPID) {
          const masterSopModule = await SopModule.findOne({
            where: { SOPID: sopModuleDraft.SOPID },
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
          });

          // Merge master SOPDetails into moduleData
          if (masterSopModule && masterSopModule.SOPDetails && moduleData) {
            moduleData = moduleData.toJSON ? moduleData.toJSON() : moduleData;
            moduleData.SOPDetails = masterSopModule.SOPDetails;
          }
        }
      } else if (DocumentID) {
        const docCondition = {};
        if (IsDraft) {
          docCondition.DocumentID = DocumentID;
        } else {
          docCondition.DocumentModuleDraftID = DocumentID;
        }
        moduleData = await DocumentModuleDraft.findOne({
          where: docCondition,
          order: [["DraftVersion", "DESC"]],
          attributes: {
            include: [
              [
                sequelize.literal(`
                  (
                    SELECT
                      uml."IsAncknowledged"
                    FROM "UserModuleAccessLogs" uml
                    WHERE
                      uml."ModuleID" = "DocumentModuleDraft"."DocumentID"
                      and uml."UserID"= '${currentUserId}'
                      and uml."IsAncknowledged" = true
                      and uml."MasterVersion"::text = "DocumentModuleDraft"."MasterVersion"::text
                  )
                  `),
                "IsAncknowledged",
              ],
              [
                sequelize.literal(`
                  (
                  SELECT json_agg(json_build_object("Type","Value")) FROM (
                     SELECT
                      json_agg(json_build_object('userId', ma."UserID",'ApprovalStatus', ma."ApprovalStatus",'IsDelegated', ma."IsDelegated",'DelegateStatus', ma."DelegateStatus",'approverId',ma."ModuleApproverID")) as "Value",'Approver' AS "Type"
                    FROM "ModuleApprovers" ma
                    WHERE
                      ma."DocumentModuleDraftID" IN 
                      (SELECT "DocumentModuleDraftID" FROM "DocumentModuleDrafts" 
                      WHERE "DocumentID" = "DocumentModuleDraft"."DocumentID" ORDER BY "CreatedDate" DESC LIMIT 1)
                    UNION ALL
                  SELECT
                      json_agg(json_build_object('userId', mc."UserID",'ApprovalStatus', mc."ApprovalStatus",'IsDelegated', mc."IsDelegated",'DelegateStatus', mc."DelegateStatus",'checkerId',mc."ModuleCheckerID")) as "Value",'Checker' AS "Type"
                    FROM "ModuleCheckers" mc
                    WHERE
                      mc."DocumentModuleDraftID" IN 
                      (SELECT "DocumentModuleDraftID" FROM "DocumentModuleDrafts" 
                      WHERE "DocumentID" = "DocumentModuleDraft"."DocumentID" ORDER BY "CreatedDate" DESC LIMIT 1)
                    UNION ALL
                    SELECT
                      json_agg(json_build_object('userId', msh."UserID",'ApprovalStatus', msh."ApprovalStatus",'IsDelegated', msh."IsDelegated",'DelegateStatus', msh."DelegateStatus",'stakeHolderId',msh."ModuleStakeHolderID")) AS "Value",'StakeHolder' as "Type"
                    FROM "ModuleStakeHolders" msh
                    WHERE
                      msh."DocumentModuleDraftID" IN 
                      (SELECT "DocumentModuleDraftID" FROM "DocumentModuleDrafts" 
                      WHERE "DocumentID" = "DocumentModuleDraft"."DocumentID" ORDER BY "CreatedDate" DESC LIMIT 1)
                      UNION ALL
                    SELECT
                      json_agg(json_build_object('userId', me."UserID",'ApprovalStatus', me."ApprovalStatus",'IsReviewer', me."IsReviewer",'IsStakeHolder', me."IsStakeHolder")) AS "Value",'Escalation' as "Type"
                    FROM "ModuleEscalations" me
                    WHERE
                      me."DocumentModuleDraftID" IN 
                      (SELECT "DocumentModuleDraftID" FROM "DocumentModuleDrafts" 
                      WHERE "DocumentID" = "DocumentModuleDraft"."DocumentID" ORDER BY "CreatedDate" DESC LIMIT 1)
                      UNION ALL
                      SELECT
                     json_agg(json_build_object('userId', mo."UserID")) AS "Value",'Owner' as "Type"
                    FROM "ModuleOwners" mo
                    WHERE
                      mo."DocumentModuleDraftID" IN 
                      (SELECT "DocumentModuleDraftID" FROM "DocumentModuleDrafts" 
                      WHERE "DocumentID" = "DocumentModuleDraft"."DocumentID" ORDER BY "CreatedDate" DESC LIMIT 1)
                    ) as tt
                      )
                  `),
                "CheckerAndStakeHolderIDs",
              ],
              [
                sequelize.literal(`
                    (
                      SELECT json_agg(json_build_object('SOPID', q."SOPID", 'SOPName', q."SOPName",'MasterVersion', q."MasterVersion",'DraftVersion', q."DraftVersion",'RiskAndCompliance', "RiskAndCompliance"))
                      FROM (
                        SELECT smd."SOPID", smd."SOPName", smd."MasterVersion", smd."DraftVersion", json_build_object(
                        'RiskAndComplianceID', "RiskAndComplianceID", 
                        'NoOfRisk', "NoOfRisk", 
                        'NoOfCompliance', "NoOfCompliance", 
                        'NoOfClause', "NoOfClause", 
                        'RiskDetailsArrays', "RiskDetailsArrays", 
                        'ComplianceDetailsArrays', "ComplianceDetailsArrays", 
                        'ClauseDetailsArrays', "ClauseDetailsArrays"
                        ) AS "RiskAndCompliance"
                        FROM "SopModuleDrafts" smd
                        LEFT JOIN "SopDetails" sd ON sd."SopID" = smd."SOPDraftID"
                        LEFT JOIN "SopAttachmentLinks" sal ON sal."SopDetailsID" = sd."SopDetailsID"
                        LEFT JOIN "RiskAndCompliences" rac ON rac."DocumentID"::text = sal."ContentLink"::text 
                        and (rac."MasterVersion"::text = smd."MasterVersion"::text OR rac."DraftVersion"::text = smd."DraftVersion"::text)
                        WHERE smd."SOPDocID" = "DocumentModuleDraft"."DocumentID"
                        ORDER BY smd."CreatedDate" DESC
                      ) q
                    )
                `),
                "DocLinkedSOP",
              ],
              [
                sequelize.literal(`
                    (SELECT json_agg(json_build_object(
                    'DocumentModuleCommentID',"DocumentModuleCommentID",
                    'HighlightedText',"HighlightedText",
                    'HighlightedTextPosition',"HighlightedTextPosition",
                    'CommentText', "CommentText",
                    'CommentedDateTime', "CommentedDateTime",
                    'ActionType', "ActionType",
                    'UserID', dc."UserID",
                    'Replies', COALESCE(dc2."Replies", '[]'),
                    'DraftVersion', dc."DraftVersion",
                    'MasterVersion', dc."MasterVersion",
                    'CommentedBy',CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName")))
                        FROM "DocumentModuleComments" dc
                        INNER JOIN "UserDetails" ud ON ud."UserID" = dc."UserID"
                        INNER JOIN "DocumentModules" dm ON dm."DocumentID" = "DocumentModuleDraft"."DocumentID"
                        LEFT JOIN (
                        SELECT  dc2."ParentCommentID", json_agg(json_build_object(
                        'ReplyText', dc2."ReplyText",
                        'ReplyDateTime', dc2."CommentedDateTime",
                        'RepliedBy', CONCAT(ud2."UserFirstName", ' ', ud2."UserLastName", ' ', ud2."UserMiddleName"),
                        'ActionType',dc2."ActionType")) AS "Replies" FROM "DocumentModuleComments" dc2
                        INNER JOIN "UserDetails" ud2 ON ud2."UserID" = dc2."UserID"
                        WHERE dc2."ParentCommentID" IS NOT NULL AND dc2."ActionType" IN ('Resolve', 'Reply')
                        GROUP BY dc2."ParentCommentID"
                        ) dc2 ON dc2."ParentCommentID" = dc."DocumentModuleCommentID"
                        WHERE dc."DocumentID" = "DocumentModuleDraft"."DocumentID" AND dc."ActionType" = 'Comment'
                        AND dc."MasterVersion"::NUMERIC <= COALESCE(dm."MasterVersion"::NUMERIC,0)
                    )`),
                "Comments",
              ],
              [
                sequelize.literal(`
                    (SELECT "SequenceNumber" FROM "DocumentModules" WHERE "DocumentID" = "DocumentModuleDraft"."DocumentID" )
                `),
                "SequenceNumber",
              ],
              [
                sequelize.literal(`(
                    SELECT json_agg(json_build_object(
                      'MasterVersion',am."MasterVersion",
                      'DraftVersion',am."DraftVersion",
                      'CommentText',am."CommentText",
                      'CreatedDateTime',am."CreatedDateTime",
                      'ActionType',am."ActionType",
                      'CommentBy', CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName") 
                    ))
                    FROM "AuditorComments" am 
                    INNER JOIN "UserDetails" ud ON ud."UserID" = am."UserID"
                    WHERE am."ModuleID" IN (SELECT "DocumentModuleDraftID" FROM "DocumentModuleDrafts" 
                    WHERE "DocumentID" = "DocumentModuleDraft"."DocumentID" AND "DraftVersion" <= "DocumentModuleDraft"."DraftVersion" )
                      )`),
                "AuditorMessages",
              ],
            ],
          },
          include: {
            model: RiskAndCompliences,
            attributes: [
              "RiskAndComplianceID",
              "NoOfRisk",
              "NoOfCompliance",
              "NoOfClause",
            ],
            required: false,
          },
        });
        moduleDetails = await sequelize.query(
          `
                  SELECT
            CASE
              WHEN sm."ModifiedDate" IS NOT NULL THEN (
                SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
                FROM "UserDetails"
                WHERE "UserID" = sm."ModifiedBy"
              )
              ELSE (
                SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
                FROM "UserDetails"
                WHERE "UserID" = sm."CreatedBy"
              )
            END AS "UploadeBy",
            COALESCE(sm."ModifiedDate", sm."CreatedDate") AS "UploadedOn",
            (
              SELECT json_agg(json_build_object(
                'CreatedDate', d."CreatedDate",
                'CreatedBy', CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName"),
                'MasterVersion', d."MasterVersion",
                'DraftVersion', d."DraftVersion",
                'DocumentID', d."DocumentModuleDraftID"
              ))
              FROM "DocumentModuleDrafts" d
              JOIN "UserDetails" ud ON ud."UserID" = d."CreatedBy"
              WHERE d."DocumentID" = sm."DocumentID"
            ) AS "History"
          FROM "DocumentModuleDrafts" sm
          WHERE sm."DocumentModuleDraftID" = :DocumentID
          LIMIT 1;`,
          {
            replacements: { DocumentID },
            type: sequelize.QueryTypes.SELECT,
          }
        );

        if (moduleData) {
          moduleData = {
            ...moduleData.toJSON(),
            DocumentPath: path.posix.join(
              "file/d/",
              `${path.basename(moduleData?.DocumentPath)}`
            ),
            EditedDocumentPath: moduleData?.EditedDocumentPath
              ? path.posix.join(
                  "file/d/",
                  `${path.basename(moduleData?.EditedDocumentPath)}`
                )
              : null,
          };
        }
      } else if (TrainingSimulationID) {
        moduleData = await TrainingSimulationModuleDraft.findOne({
          where: { TrainingSimulationDraftID: TrainingSimulationID },
          attributes: {
            include: [
              [
                sequelize.literal(`
                  (
                    SELECT "SequenceNumber"
                    FROM "TrainingSimulationModules"
                    WHERE "TrainingSimulationID" = "TrainingSimulationModuleDraft"."TrainingSimulationID"
                  )
                `),
                "SequenceNumber",
              ],
            ],
          },
        });
        moduleDetails = await sequelize.query(
          `
        SELECT
            CASE
              WHEN sm."ModifiedDate" IS NOT NULL THEN (
                SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
                FROM "UserDetails"
                WHERE "UserID" = sm."ModifiedBy"
              )
              ELSE (
                SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
                FROM "UserDetails"
                WHERE "UserID" = sm."CreatedBy"
              )
            END AS "UploadeBy",
            COALESCE(sm."ModifiedDate", sm."CreatedDate") AS "UploadedOn",
            (
              SELECT json_agg(json_build_object(
                'CreatedDate', d."CreatedDate",
                'CreatedBy', CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName"),
                'MasterVersion', d."MasterVersion",
                'DraftVersion', d."DraftVersion",
                'TrainingSimulationID', d."TrainingSimulationDraftID"
              ))
              FROM "TrainingSimulationModuleDrafts" d
              JOIN "UserDetails" ud ON ud."UserID" = d."CreatedBy"
              WHERE d."TrainingSimulationID" = sm."TrainingSimulationID"
            ) AS "History"
          FROM "TrainingSimulationModuleDrafts" sm
          WHERE sm."TrainingSimulationDraftID" = :TrainingSimulationID
          LIMIT 1;
        `,
          {
            replacements: { TrainingSimulationID },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        moduleData = {
          ...moduleData.toJSON(),
          TrainingSimulationPath: path.posix.join(
            "file/trs/",
            `${path.basename(moduleData?.TrainingSimulationPath)}`
          ),
        };
      } else if (TestSimulationID) {
        moduleData = await TestSimulationModuleDraft.findOne({
          where: { TestSimulationDraftID: TestSimulationID },
          attributes: {
            include: [
              [
                sequelize.literal(`
                  (
                    SELECT "SequenceNumber"
                    FROM "TestSimulationModules"
                    WHERE "TestSimulationID" = "TestSimulationModuleDraft"."TestSimulationID"
                  )
                `),
                "SequenceNumber",
              ],
            ],
          },
        });
        moduleDetails = await sequelize.query(
          `
        SELECT
          CASE
            WHEN sm."ModifiedDate" IS NOT NULL THEN (
              SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
              FROM "UserDetails"
              WHERE "UserID" = sm."ModifiedBy"
            )
            ELSE (
              SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
              FROM "UserDetails"
              WHERE "UserID" = sm."CreatedBy"
            )
          END AS "UploadeBy",
          COALESCE(sm."ModifiedDate", sm."CreatedDate") AS "UploadedOn",
          (
            SELECT json_agg(json_build_object(
              'CreatedDate', d."CreatedDate",
              'CreatedBy', CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName"),
              'MasterVersion', d."MasterVersion",
              'DraftVersion', d."DraftVersion",
              'TestSimulationID', d."TestSimulationDraftID"
            ))
            FROM "TestSimulationModuleDrafts" d
            JOIN "UserDetails" ud ON ud."UserID" = d."CreatedBy"
            WHERE d."TestSimulationID" = sm."TestSimulationID"
          ) AS "History"
        FROM "TestSimulationModuleDrafts" sm
        WHERE sm."TestSimulationDraftID" = :TestSimulationID
        LIMIT 1;`,
          {
            replacements: { TestSimulationID },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        moduleData = {
          ...moduleData.toJSON(),
          TestSimulationPath: path.posix.join(
            "file/ts/",
            `${path.basename(moduleData?.TestSimulationPath)}`
          ),
        };
      } else if (TestMCQID) {
        moduleData = await TestMcqsModuleDraft.findOne({
          where: { TestMCQDraftID: TestMCQID },
          attributes: {
            include: [
              [
                sequelize.literal(`
                  (
                    SELECT "SequenceNumber"
                    FROM "TestMcqsModules"
                    WHERE "TestMCQID" = "TestMcqsModuleDraft"."TestMCQID"
                  )
                `),
                "SequenceNumber",
              ],
            ],
          },
        });
        moduleDetails = await sequelize.query(
          `
        SELECT
          CASE
            WHEN sm."ModifiedDate" IS NOT NULL THEN (
              SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
              FROM "UserDetails"
              WHERE "UserID" = sm."ModifiedBy"
            )
            ELSE (
              SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
              FROM "UserDetails"
              WHERE "UserID" = sm."CreatedBy"
            )
          END AS "UploadeBy",
          COALESCE(sm."ModifiedDate", sm."CreatedDate") AS "UploadedOn",
          (
            SELECT json_agg(json_build_object(
              'CreatedDate', d."CreatedDate",
              'CreatedBy', CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName"),
              'MasterVersion', d."MasterVersion",
              'DraftVersion', d."DraftVersion",
              'TestMCQID', d."TestMCQDraftID"
            ))
            FROM "TestMcqsModuleDrafts" d
            JOIN "UserDetails" ud ON ud."UserID" = d."CreatedBy"
            WHERE d."TestMCQID" = sm."TestMCQID"
          ) AS "History"
        FROM "TestMcqsModuleDrafts" sm
        WHERE sm."TestMCQDraftID" = :TestMCQID
        LIMIT 1;
        `,
          {
            replacements: { TestMCQID },
            type: sequelize.QueryTypes.SELECT,
          }
        );
      } else {
        res.status(404).send({ message: "Respective Module Id is required" });
        return;
      }
      const bredcrumbs = await sequelize.query(
        `WITH RECURSIVE ancestors AS (
                SELECT 
                    "ContentID", 
                    "ParentContentID", 
                    "ContentName",
                "ModuleTypeID",
                    0 AS depth
                FROM "ContentStructures"
              WHERE "ContentID" = :ContentID
                UNION ALL
                SELECT 
                    c."ContentID", 
                    c."ParentContentID", 
                    c."ContentName",
                c."ModuleTypeID",
                    a.depth + 1
                FROM "ContentStructures" c
                JOIN ancestors a ON c."ContentID" = a."ParentContentID"
				)
				SELECT * FROM ancestors;
      `,
        {
          type: sequelize.QueryTypes.SELECT,
          replacements: { ContentID: moduleData?.ContentID },
        }
      );
      return res.status(200).send({
        data: moduleData,
        details: moduleDetails[0],
        bredcrumbs,
      });
    } else if (
      (currentUserType != "EndUser" && !IsEnableMyTask) ||
      currentUserType == "Auditor"
    ) {
      if (SOPID) {
        moduleData = await SopModuleDraft.findOne({
          where: { SOPID },
          attributes: {
            include: [
              [
                sequelize.literal(`
                  (
                    SELECT
                      uml."IsAncknowledged"
                    FROM "UserModuleAccessLogs" uml
                    WHERE
                      uml."ModuleID" = "SopModuleDraft"."SOPID"
                      and uml."UserID"= '${currentUserId}'
                      and uml."IsAncknowledged" = true
                      and uml."MasterVersion"::text = "SopModuleDraft"."MasterVersion"::text
                  )
                  `),
                "IsAncknowledged",
              ],
              [
                sequelize.literal(`
                    ( SELECT "SequenceNumber" FROM "SopModules" WHERE "SOPID" = "SopModuleDraft"."SOPID" )`),
                "SequenceNumber",
              ],
              [
                sequelize.literal(`(
                    SELECT json_agg(json_build_object(
                      'MasterVersion',am."MasterVersion",
                      'DraftVersion',am."DraftVersion",
                      'CommentText',am."CommentText",
                      'CreatedDateTime',am."CreatedDateTime",
                      'ActionType',am."ActionType",
                      'CommentBy', CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName") 
                    ))
                    FROM "AuditorComments" am 
                    INNER JOIN "UserDetails" ud ON ud."UserID" = am."UserID"
                    WHERE am."ModuleID" = "SopModuleDraft"."SOPDraftID"                   
                      )`),
                "AuditorMessages",
              ],
              [
                sequelize.literal(`
                (
                  select json_build_object('NoOfRisk',coalesce(sum(rac."NoOfRisk"),0),
                  'NoOfCompliance',coalesce(sum(rac."NoOfCompliance"),0),
                  'NoOfClause',coalesce(sum(rac."NoOfClause"),0))  
                  from "SopModuleDrafts" smd
                  inner join "SopDetails" sd on sd."SopID" = smd."SOPDraftID" OR sd."SopID" = smd."SOPID"
                  inner join "SopAttachmentLinks" sal on sal."SopDetailsID" = sd."SopDetailsID" 
                  and sal."ContentLinkType" = 'doc'
                  inner join "DocumentModuleDrafts" dm on dm."DocumentID"::text = sal."ContentLink"::text OR dm."DocumentModuleDraftID"::text = sal."ContentLink"::text
                  inner join "RiskAndCompliences" rac on rac."DocumentModuleDraftID"::text = sal."ContentLink"::text OR rac."DocumentID"::text = sal."ContentLink"::text
                  and (rac."MasterVersion"::text = dm."MasterVersion"::text OR rac."DraftVersion"::text = dm."DraftVersion"::text)
                  where smd."SOPDraftID" = "SopModuleDraft"."SOPDraftID"
                  )
                `),
                "RiskAndComplience",
              ],
            ],
          },
          include: [
            {
              model: SopDetails,
              as: "SOPDetails",
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
              include: {
                model: RiskAndCompliences,
                attributes: [
                  "RiskAndComplianceID",
                  "NoOfRisk",
                  "NoOfCompliance",
                  "NoOfClause",
                  "RiskDetailsArrays",
                  "ComplianceDetailsArrays",
                  "ClauseDetailsArrays",
                ],
                required: false,
              },
            },
          ],
          order: [["CreatedDate", "DESC"]],
        });
        moduleDetails = await sequelize.query(
          `SELECT
              CASE
                WHEN sm."ModifiedDate" IS NOT NULL THEN (
                  SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
                  FROM "UserDetails"
                  WHERE "UserID" = sm."ModifiedBy"
                )
                ELSE (
                  SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
                  FROM "UserDetails"
                  WHERE "UserID" = sm."CreatedBy"
                )
              END AS "UploadeBy",
              COALESCE(sm."ModifiedDate", sm."CreatedDate") AS "UploadedOn",
               ( SELECT json_agg(json_build_object(
                  'CreatedDate', d."CreatedDate",
                  'CreatedBy', CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName"),
                  'MasterVersion', d."MasterVersion",
                  'DraftVersion', d."DraftVersion",
                  'SOPID', d."SOPDraftID"
                ))
                FROM "SopModuleDrafts" d
                JOIN "UserDetails" ud ON ud."UserID" = d."CreatedBy"
                WHERE d."SOPID" = :SOPID
              ) AS "History"
            FROM "SopModuleDrafts" sm
            WHERE sm."SOPID" = :SOPID
            ORDER BY sm."CreatedDate" DESC
            LIMIT 1;`,
          {
            replacements: { SOPID },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        if (moduleData?.DocumentModule) {
          moduleData.DocumentModule["DocumentPath"] = path.posix.join(
            "file/d/",
            `${path.basename(
              JSON.parse(JSON.stringify(moduleData))?.DocumentModule
                ?.DocumentPath
            )}`
          );
        }

        // Fetch master SopModule with all SopDetails to ensure complete data
        const sopModuleDraftData = await SopModuleDraft.findOne({
          where: { SOPID },
          attributes: ["SOPID"],
        });

        if (sopModuleDraftData?.SOPID) {
          const masterSopModule = await SopModule.findOne({
            where: { SOPID: sopModuleDraftData.SOPID },
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
          });

          // Merge master SOPDetails into moduleData
          if (masterSopModule && masterSopModule.SOPDetails && moduleData) {
            moduleData = moduleData.toJSON ? moduleData.toJSON() : moduleData;
            moduleData.SOPDetails = masterSopModule.SOPDetails;
          }
        }
      } else if (DocumentID) {
        moduleData = await DocumentModuleDraft.findOne({
          where: { DocumentID },
          order: [["CreatedDate", "DESC"]],
          attributes: {
            include: [
              [
                sequelize.literal(`
                  (
                    SELECT
                      uml."IsAncknowledged"
                    FROM "UserModuleAccessLogs" uml
                    WHERE
                      uml."ModuleID" = "DocumentModuleDraft"."DocumentID"
                      and uml."UserID"= '${currentUserId}'
                      and uml."IsAncknowledged" = true
                      and uml."MasterVersion"::text = "DocumentModuleDraft"."MasterVersion"::text
                  )
                  `),
                "IsAncknowledged",
              ],
              [
                sequelize.literal(`
                  (
                  SELECT json_agg(json_build_object("Type","Value")) FROM (
                  SELECT
                      json_agg(json_build_object('userId', ma."UserID",'ApprovalStatus', ma."ApprovalStatus",'IsDelegated', ma."IsDelegated",'DelegateStatus', ma."DelegateStatus",'approverId',ma."ModuleApproverID")) as "Value",'Approver' AS "Type"
                    FROM "ModuleApprovers" ma
                    WHERE
                      ma."DocumentModuleDraftID" IN 
                      (SELECT "DocumentModuleDraftID" FROM "DocumentModuleDrafts" 
                      WHERE "DocumentID" = "DocumentModuleDraft"."DocumentID" ORDER BY "CreatedDate" DESC LIMIT 1)
                    UNION ALL
                    SELECT
                      json_agg(json_build_object('userId', mc."UserID",'ApprovalStatus', mc."ApprovalStatus",'IsDelegated', mc."IsDelegated",'DelegateStatus', mc."DelegateStatus",'checkerId',mc."ModuleCheckerID")) as "Value",'Checker' AS "Type"
                    FROM "ModuleCheckers" mc
                    WHERE
                      mc."DocumentModuleDraftID" IN 
                      (SELECT "DocumentModuleDraftID" FROM "DocumentModuleDrafts" 
                      WHERE "DocumentID" = "DocumentModuleDraft"."DocumentID" ORDER BY "CreatedDate" DESC LIMIT 1)
                    UNION ALL
                    SELECT
                      json_agg(json_build_object('userId', msh."UserID",'ApprovalStatus', msh."ApprovalStatus",'IsDelegated', msh."IsDelegated",'DelegateStatus', msh."DelegateStatus",'stakeHolderId',msh."ModuleStakeHolderID")) AS "Value",'StakeHolder' as "Type"
                    FROM "ModuleStakeHolders" msh
                    WHERE
                      msh."DocumentModuleDraftID" IN 
                      (SELECT "DocumentModuleDraftID" FROM "DocumentModuleDrafts" 
                      WHERE "DocumentID" = "DocumentModuleDraft"."DocumentID" ORDER BY "CreatedDate" DESC LIMIT 1)
                      UNION ALL
                    SELECT
                      json_agg(json_build_object('userId', me."UserID",'ApprovalStatus', me."ApprovalStatus", 'IsReviewer', me."IsReviewer",'IsStakeHolder', me."IsStakeHolder")) AS "Value",'Escalation' as "Type"
                    FROM "ModuleEscalations" me
                    WHERE
                      me."DocumentModuleDraftID" IN 
                      (SELECT "DocumentModuleDraftID" FROM "DocumentModuleDrafts" 
                      WHERE "DocumentID" = "DocumentModuleDraft"."DocumentID" ORDER BY "CreatedDate" DESC LIMIT 1)
                      UNION ALL
                      SELECT
                     json_agg(json_build_object('userId', mo."UserID")) AS "Value",'Owner' as "Type"
                    FROM "ModuleOwners" mo
                    WHERE
                      mo."DocumentModuleDraftID" IN 
                      (SELECT "DocumentModuleDraftID" FROM "DocumentModuleDrafts" 
                      WHERE "DocumentID" = "DocumentModuleDraft"."DocumentID" ORDER BY "CreatedDate" DESC LIMIT 1)
                    ) as tt
                      )
                  `),
                "CheckerAndStakeHolderIDs",
              ],
              [
                sequelize.literal(`
                    (
                      SELECT json_agg(json_build_object('SOPID', q."SOPID", 'SOPName', q."SOPName",'MasterVersion', q."MasterVersion",'DraftVersion', q."DraftVersion",'RiskAndCompliance', "RiskAndCompliance"))
                      FROM (
                        SELECT smd."SOPID", smd."SOPName",smd."MasterVersion", smd."DraftVersion",
                        json_build_object(
                        'RiskAndComplianceID', "RiskAndComplianceID",
                        'NoOfRisk', "NoOfRisk",
                        'NoOfCompliance', "NoOfCompliance",
                        'NoOfClause', "NoOfClause",
                        'RiskDetailsArrays', "RiskDetailsArrays",
                        'ComplianceDetailsArrays', "ComplianceDetailsArrays",
                        'ClauseDetailsArrays', "ClauseDetailsArrays") AS "RiskAndCompliance"
                        FROM "SopModuleDrafts" smd
                        LEFT JOIN "SopDetails" sd ON sd."SopID" = smd."SOPDraftID"
                        LEFT JOIN "SopAttachmentLinks" sal ON sal."SopDetailsID" = sd."SopDetailsID"
                        LEFT JOIN "RiskAndCompliences" rac ON rac."DocumentID"::text = sal."ContentLink"::text 
                        and (rac."MasterVersion"::text = smd."MasterVersion"::text OR rac."DraftVersion"::text = smd."DraftVersion"::text)
                        WHERE smd."SOPDocID" = "DocumentModuleDraft"."DocumentID"
                        ORDER BY smd."CreatedDate" DESC
                      ) q
                    )
                `),
                "DocLinkedSOP",
              ],
              [
                sequelize.literal(`
                    (SELECT json_agg(json_build_object(
                    'DocumentModuleCommentID',"DocumentModuleCommentID",
                    'HighlightedText',"HighlightedText",
                    'HighlightedTextPosition',"HighlightedTextPosition",
                    'CommentText', "CommentText",
                    'CommentedDateTime', "CommentedDateTime",
                    'ActionType', "ActionType",
                    'UserID', dc."UserID",
                    'Replies', COALESCE(dc2."Replies", '[]'),
                    'DraftVersion', dc."DraftVersion",
                    'MasterVersion', dc."MasterVersion",
                    'CommentedBy',CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName")))
                        FROM "DocumentModuleComments" dc
                        INNER JOIN "UserDetails" ud ON ud."UserID" = dc."UserID"
                        INNER JOIN "DocumentModules" dm ON dm."DocumentID" = "DocumentModuleDraft"."DocumentID"
                        LEFT JOIN (
                        SELECT  dc2."ParentCommentID", json_agg(json_build_object(
                        'ReplyText', dc2."ReplyText",
                        'ReplyDateTime', dc2."CommentedDateTime",
                        'RepliedBy', CONCAT(ud2."UserFirstName", ' ', ud2."UserLastName", ' ', ud2."UserMiddleName"),
                        'ActionType',dc2."ActionType")) AS "Replies" FROM "DocumentModuleComments" dc2
                        INNER JOIN "UserDetails" ud2 ON ud2."UserID" = dc2."UserID"
                        WHERE dc2."ParentCommentID" IS NOT NULL AND dc2."ActionType" IN ('Resolve', 'Reply')
                        GROUP BY dc2."ParentCommentID"
                        ) dc2 ON dc2."ParentCommentID" = dc."DocumentModuleCommentID"
                        WHERE dc."DocumentID" = "DocumentModuleDraft"."DocumentID" AND dc."ActionType" = 'Comment'
                      AND dc."MasterVersion"::NUMERIC <= COALESCE(dm."MasterVersion"::NUMERIC,0)
                    )`),
                "Comments",
              ],
              [
                sequelize.literal(`
                    (SELECT "SequenceNumber" FROM "DocumentModules" WHERE "DocumentID" = "DocumentModuleDraft"."DocumentID" )
                `),
                "SequenceNumber",
              ],
              [
                sequelize.literal(`(
                    SELECT json_agg(json_build_object(
                      'MasterVersion',am."MasterVersion",
                      'DraftVersion',am."DraftVersion",
                      'CommentText',am."CommentText",
                      'CreatedDateTime',am."CreatedDateTime",
                      'ActionType',am."ActionType",
                      'CommentBy', CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName")
                    ))
                    FROM "AuditorComments" am 
                    INNER JOIN "UserDetails" ud ON ud."UserID" = am."UserID"
                    WHERE am."ModuleID" IN (SELECT "DocumentModuleDraftID" FROM "DocumentModuleDrafts" 
                    WHERE "DocumentID" = "DocumentModuleDraft"."DocumentID" AND "DraftVersion" <= "DocumentModuleDraft"."DraftVersion" )
                      )`),
                "AuditorMessages",
              ],
            ],
          },
          include: {
            model: RiskAndCompliences,
            attributes: [
              "RiskAndComplianceID",
              "NoOfRisk",
              "NoOfCompliance",
              "NoOfClause",
            ],
            required: false,
          },
        });
        moduleDetails = await sequelize.query(
          `
         SELECT
            CASE
              WHEN sm."ModifiedDate" IS NOT NULL THEN (
                SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
                FROM "UserDetails"
                WHERE "UserID" = sm."ModifiedBy"
              )
              ELSE (
                SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
                FROM "UserDetails"
                WHERE "UserID" = sm."CreatedBy"
              )
            END AS "UploadeBy",
            COALESCE(sm."ModifiedDate", sm."CreatedDate") AS "UploadedOn",
            (
              SELECT json_agg(json_build_object(
                'CreatedDate', d."CreatedDate",
                'CreatedBy', CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName"),
                'MasterVersion', d."MasterVersion",
                'DraftVersion', d."DraftVersion",
                'DocumentID', d."DocumentModuleDraftID"
              ))
              FROM "DocumentModuleDrafts" d
              JOIN "UserDetails" ud ON ud."UserID" = d."CreatedBy"
              WHERE d."DocumentID" = sm."DocumentID"
            ) AS "History"
          FROM "DocumentModuleDrafts" sm
          WHERE sm."DocumentID" = :DocumentID
          ORDER BY sm."CreatedDate" DESC
          LIMIT 1;`,
          {
            replacements: { DocumentID },
            type: sequelize.QueryTypes.SELECT,
          }
        );

        if (moduleData) {
          moduleData = {
            ...moduleData.toJSON(),
            DocumentPath: moduleData?.DocumentPath
              ? path.posix.join(
                  "file/d/",
                  `${path.basename(moduleData.DocumentPath)}`
                )
              : null,
            EditedDocumentPath: moduleData?.EditedDocumentPath
              ? path.posix.join(
                  "file/d/",
                  `${path.basename(moduleData.EditedDocumentPath)}`
                )
              : null,
          };
        }
      } else if (TrainingSimulationID) {
        moduleData = await TrainingSimulationModuleDraft.findOne({
          where: { TrainingSimulationID },
          order: [["DraftVersion", "DESC"]],
          attributes: {
            include: [
              [
                sequelize.literal(`
                  (
                    SELECT "SequenceNumber"
                    FROM "TrainingSimulationModules"
                    WHERE "TrainingSimulationID" = "TrainingSimulationModuleDraft"."TrainingSimulationID"
                  )
                `),
                "SequenceNumber",
              ],
            ],
          },
        });

        moduleDetails = await sequelize.query(
          `
      SELECT
          CASE
            WHEN sm."ModifiedDate" IS NOT NULL THEN (
              SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
              FROM "UserDetails"
              WHERE "UserID" = sm."ModifiedBy"
            )
            ELSE (
              SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
              FROM "UserDetails"
              WHERE "UserID" = sm."CreatedBy"
            )
          END AS "UploadeBy",
          COALESCE(sm."ModifiedDate", sm."CreatedDate") AS "UploadedOn",
          (
            SELECT json_agg(json_build_object(
              'CreatedDate', s."CreatedDate",
              'CreatedBy', CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName"),
              'MasterVersion', s."MasterVersion",
              'DraftVersion', s."DraftVersion",
              'TrainingSimulationID', s."TrainingSimulationDraftID"
            ))
            FROM "TrainingSimulationModuleDrafts" s
            JOIN "UserDetails" ud ON ud."UserID" = sm."CreatedBy"
            WHERE sm."TrainingSimulationID" = s."TrainingSimulationID"
          ) AS "History"
        FROM "TrainingSimulationModuleDrafts" sm
        WHERE sm."TrainingSimulationID" = :TrainingSimulationID
        ORDER BY sm."CreatedDate" DESC
        LIMIT 1;
        `,
          {
            replacements: { TrainingSimulationID },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        moduleData = {
          ...moduleData.toJSON(),
          TrainingSimulationPath: path.posix.join(
            "file/trs/",
            `${path.basename(moduleData?.TrainingSimulationPath)}`
          ),
        };
      } else if (TestSimulationID) {
        moduleData = await TestSimulationModuleDraft.findOne({
          where: { TestSimulationID },
          order: [["DraftVersion", "DESC"]],
          attributes: {
            include: [
              [
                sequelize.literal(`
                  (
                    SELECT "SequenceNumber"
                    FROM "TestSimulationModules"
                    WHERE "TestSimulationID" = "TestSimulationModuleDraft"."TestSimulationID"
                  )
                `),
                "SequenceNumber",
              ],
            ],
          },
        });
        moduleDetails = await sequelize.query(
          `
        SELECT
          CASE
            WHEN sm."ModifiedDate" IS NOT NULL THEN (
              SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
              FROM "UserDetails"
              WHERE "UserID" = sm."ModifiedBy"
            )
            ELSE (
              SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
              FROM "UserDetails"
              WHERE "UserID" = sm."CreatedBy" 
            )
          END AS "UploadeBy",
          COALESCE(sm."ModifiedDate", sm."CreatedDate") AS "UploadedOn",
          (
            SELECT json_agg(json_build_object(
              'CreatedDate', s."CreatedDate",
              'CreatedBy', CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName"),
              'MasterVersion', s."MasterVersion",
              'DraftVersion', s."DraftVersion",
              'TestSimulationID', s."TestSimulationDraftID"
            ))
            FROM "TestSimulationModuleDrafts" s
            JOIN "UserDetails" ud ON ud."UserID" = sm."CreatedBy"
            WHERE sm."TestSimulationID" = s."TestSimulationID"
          ) AS "History"
        FROM "TestSimulationModuleDrafts" sm
        WHERE sm."TestSimulationID" = :TestSimulationID
        ORDER BY sm."CreatedDate" DESC
        LIMIT 1;
        `,
          {
            replacements: { TestSimulationID },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        moduleData = {
          ...moduleData.toJSON(),
          TestSimulationPath: path.posix.join(
            "file/ts/",
            `${path.basename(moduleData?.TestSimulationPath)}`
          ),
        };
      } else if (TestMCQID) {
        moduleData = await TestMcqsModuleDraft.findOne({
          where: { TestMCQID },
          order: [["DraftVersion", "DESC"]],
          attributes: {
            include: [
              [
                sequelize.literal(`
                  (
                    SELECT "SequenceNumber"
                    FROM "TestMcqsModules"
                    WHERE "TestMCQID" = "TestMcqsModuleDraft"."TestMCQID"
                )`),
                "SequenceNumber",
              ],
            ],
          },
        });
        moduleDetails = await sequelize.query(
          `
        SELECT
          CASE
            WHEN sm."ModifiedDate" IS NOT NULL THEN (
              SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
              FROM "UserDetails"
              WHERE "UserID" = sm."ModifiedBy"
            )
            ELSE (
              SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
              FROM "UserDetails"
              WHERE "UserID" = sm."CreatedBy"
            )
          END AS "UploadeBy",
          COALESCE(sm."ModifiedDate", sm."CreatedDate") AS "UploadedOn",
          (
            SELECT json_agg(json_build_object(
              'CreatedDate', s."CreatedDate",
              'CreatedBy', CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName"),
              'MasterVersion', s."MasterVersion",
              'DraftVersion', s."DraftVersion",
              'TestMCQID', s."TestMCQDraftID"
            ))
            FROM "TestMcqsModuleDrafts" s
            JOIN "UserDetails" ud ON ud."UserID" = sm."CreatedBy"
            WHERE sm."TestMCQID" = s."TestMCQID"
          ) AS "History"
        FROM "TestMcqsModuleDrafts" sm
        WHERE sm."TestMCQID" = :TestMCQID
        ORDER BY sm."CreatedDate" DESC
        LIMIT 1;
        `,
          {
            replacements: { TestMCQID },
            type: sequelize.QueryTypes.SELECT,
          }
        );
      } else {
        res.status(404).send({ message: "Respective Module Id is required" });
        return;
      }
      const bredcrumbs = await sequelize.query(
        `WITH RECURSIVE ancestors AS (
                SELECT 
                    "ContentID", 
                    "ParentContentID", 
                    "ContentName",
                "ModuleTypeID",
                    0 AS depth
                FROM "ContentStructures"
              WHERE "ContentID" = :ContentID
                UNION ALL
                SELECT 
                    c."ContentID", 
                    c."ParentContentID", 
                    c."ContentName",
                c."ModuleTypeID",
                    a.depth + 1
                FROM "ContentStructures" c
                JOIN ancestors a ON c."ContentID" = a."ParentContentID"
				)
				SELECT * FROM ancestors;
      `,
        {
          type: sequelize.QueryTypes.SELECT,
          replacements: { ContentID: moduleData?.ContentID },
        }
      );
      return res.status(200).send({
        data: moduleData,
        details: moduleDetails[0],
        bredcrumbs,
      });
    } else {
      if (SOPID) {
        const accessCount = await UserModuleLink.count({
          where: {
            ModuleID: SOPID,
            UserID: currentUserId,
            StartDate: {
              [Op.lte]: literal("CURRENT_TIMESTAMP"),
            },
            DueDate: {
              [Op.gte]: literal("CURRENT_TIMESTAMP"),
            },
          },
          distinct: true,
          col: "ModuleID",
        });
        moduleData = await SopModule.findOne({
          where: { SOPID },
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
            {
              model: RiskSopLink,
              as: "RiskSopLinks",
              where: {
                IsDeleted: false,
              },
              required: false,
              attributes: ["BPMNNodeID", "RiskDraftID"],
            },
            {
              model: Favorite,
              as: "UserFavorite",
              where: {
                UserID: currentUserId,
              },
              required: false,
              attributes: ["FavoriteID"],
            },
            {
              model: DocumentModule,
              required: false,
              attributes: [
                "DocumentPath",
                "DocumentName",
                "MasterVersion",
                "DraftVersion",
              ],
              include: {
                model: RiskAndCompliences,
                attributes: [
                  "RiskAndComplianceID",
                  "NoOfRisk",
                  "NoOfCompliance",
                  "NoOfClause",
                  "RiskDetailsArrays",
                  "ComplianceDetailsArrays",
                  "ClauseDetailsArrays",
                ],
                required: false,
              },
            },
          ],
          attributes: {
            include: [
              [
                sequelize.literal(`
                (
                  SELECT
                    uml."IsAncknowledged"
                  FROM "UserModuleAccessLogs" uml
                  WHERE
                    uml."ModuleID" = "SopModule"."SOPID"
                    and uml."UserID"= '${currentUserId}'
                    and uml."IsAncknowledged" = true
                    and uml."MasterVersion"::text = "SopModule"."MasterVersion"::text
                )
                `),
                "IsAncknowledged",
              ],
              [
                sequelize.literal(`
                (
                  select json_build_object('NoOfRisk',coalesce(sum(rac."NoOfRisk"),0),
                  'NoOfCompliance',coalesce(sum(rac."NoOfCompliance"),0),
                  'NoOfClause',coalesce(sum(rac."NoOfClause"),0))  
                  from "SopModules" sm 
                  inner join "SopDetails" sd on sd."SopID" = sm."SOPID" 
                  inner join "SopAttachmentLinks" sal on sal."SopDetailsID" = sd."SopDetailsID" 
                  and sal."ContentLinkType" = 'doc'
                  inner join "DocumentModules" dm on dm."DocumentID"::text = sal."ContentLink"::text 
                  inner join "RiskAndCompliences" rac on rac."DocumentID"::text = sal."ContentLink"::text 
                  and rac."MasterVersion"::text = dm."MasterVersion"::text
                  where sm."SOPID" = "SopModule"."SOPID"
                  )
                `),
                "RiskAndComplience",
              ],
            ],
          },
        });
        if (accessCount) {
          await UserModuleAccessLog.create({
            ModuleID: SOPID,
            UserID: currentUserId,
            AccessedDate: new Date().toISOString(),
            MasterVersion: moduleData.MasterVersion,
            CreatedBy: currentUserId,
          });
        }
        moduleDetails = await sequelize.query(
          `
        SELECT
            CASE
              WHEN sm."ModifiedDate" IS NOT NULL THEN (
                SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
                FROM "UserDetails"
                WHERE "UserID" = sm."ModifiedBy"
              )
              ELSE (
                SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
                FROM "UserDetails"
                WHERE "UserID" = sm."CreatedBy"
              )
            END AS "UploadeBy",
            COALESCE(sm."ModifiedDate", sm."CreatedDate") AS "UploadedOn",
            (
              SELECT json_agg(json_build_object(
                'CreatedDate', smd."CreatedDate",
                'CreatedBy', CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName"),
                'MasterVersion', smd."MasterVersion",
                'DraftVersion', smd."DraftVersion",
                'SOPID', smd."SOPDraftID"
              ))
              FROM "SopModuleDrafts" smd
              LEFT JOIN "UserDetails" ud ON ud."UserID" = smd."CreatedBy"
              WHERE smd."SOPID" = sm."SOPID"
            ) AS "History"
          FROM "SopModules" sm
          WHERE sm."SOPID" = :SOPID
          LIMIT 1;
        `,
          {
            replacements: { SOPID },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        if (moduleData?.DocumentModule) {
          moduleData.DocumentModule["DocumentPath"] = path.posix.join(
            "file/d/",
            `${path.basename(
              JSON.parse(JSON.stringify(moduleData))?.DocumentModule
                ?.DocumentPath
            )}`
          );
        }
        ancestors.push({
          ContentID: moduleData?.SOPID,
          ContentName: moduleData?.SOPName,
          level,
        });
        level++;
      } else if (DocumentID) {
        const accessCount = await UserModuleLink.count({
          where: {
            ModuleID: DocumentID,
            UserID: currentUserId,
            StartDate: {
              [Op.lte]: literal("CURRENT_TIMESTAMP"),
            },
            DueDate: {
              [Op.gte]: literal("CURRENT_TIMESTAMP"),
            },
          },
          distinct: true,
          col: "ModuleID",
        });
        moduleData = await DocumentModule.findOne({
          where: { DocumentID },
          attributes: {
            include: [
              [
                sequelize.literal(`
                (
                  SELECT
                    uml."IsAncknowledged"
                  FROM "UserModuleAccessLogs" uml
                  WHERE
                    uml."ModuleID" = "DocumentModule"."DocumentID"
                    and uml."UserID"= '${currentUserId}'
                    and uml."IsAncknowledged" = true
                    and uml."MasterVersion"::text = "DocumentModule"."MasterVersion"::text
                )
                `),
                "IsAncknowledged",
              ],
              [
                sequelize.literal(`
                (
                SELECT json_agg(json_build_object("Type","Value")) FROM (
                  SELECT
                    json_agg(json_build_object('userId', mc."UserID",'ApprovalStatus', mc."ApprovalStatus",'checkerId',mc."ModuleCheckerID")) as "Value",'Checker' AS "Type"
                  FROM "ModuleCheckers" mc
                  WHERE
                    mc."DocumentModuleDraftID" IN 
                    (SELECT "DocumentModuleDraftID" FROM "DocumentModuleDrafts" 
                    WHERE "DocumentID" = "DocumentModule"."DocumentID" ORDER BY "CreatedDate" DESC LIMIT 1)
                  UNION ALL
                  SELECT
                    json_agg(json_build_object('userId', msh."UserID",'ApprovalStatus', msh."ApprovalStatus",'stakeHolderId',msh."ModuleStakeHolderID")) AS "Value",'StakeHolder' as "Type"
                  FROM "ModuleStakeHolders" msh
                  WHERE
                    msh."DocumentModuleDraftID" IN 
                    (SELECT "DocumentModuleDraftID" FROM "DocumentModuleDrafts" 
                    WHERE "DocumentID" = "DocumentModule"."DocumentID" ORDER BY "CreatedDate" DESC LIMIT 1)
                    UNION ALL
                    SELECT
                    json_agg(json_build_object('userId', mo."UserID")) AS "Value",'Owner' as "Type"
                  FROM "ModuleOwners" mo
                  WHERE
                    mo."DocumentModuleDraftID" IN 
                    (SELECT "DocumentModuleDraftID" FROM "DocumentModuleDrafts" 
                    WHERE "DocumentID" = "DocumentModule"."DocumentID" ORDER BY "CreatedDate" DESC LIMIT 1)
                  ) as tt
                    )
                `),
                "CheckerAndStakeHolderIDs",
              ],
              [
                sequelize.literal(`
                    (
                      SELECT json_agg(json_build_object('SOPID', q."SOPID", 'SOPName', q."SOPName",'MasterVersion', q."MasterVersion",'DraftVersion', q."DraftVersion",'RiskAndCompliance', q."RiskAndCompliance"))
                      FROM (
                        SELECT smd."SOPID", smd."SOPName", smd."MasterVersion", smd."DraftVersion", json_build_object(
                          'RiskAndComplianceID', rac."RiskAndComplianceID",
                          'NoOfRisk', rac."NoOfRisk",
                          'NoOfCompliance', rac."NoOfCompliance",
                          'NoOfClause', rac."NoOfClause",
                          'RiskDetailsArrays', rac."RiskDetailsArrays",
                          'ComplianceDetailsArrays', rac."ComplianceDetailsArrays",
                          'ClauseDetailsArrays', rac."ClauseDetailsArrays"
                        ) AS "RiskAndCompliance"
                        FROM "SopModuleDrafts" smd
                        LEFT JOIN "SopDetails" sd ON sd."SopID" = smd."SOPDraftID"
                        LEFT JOIN "SopAttachmentLinks" sal ON sal."SopDetailsID" = sd."SopDetailsID"
                        LEFT JOIN "RiskAndCompliences" rac ON rac."DocumentID"::text = sal."ContentLink"::text 
                        and (rac."MasterVersion"::text = smd."MasterVersion"::text OR rac."DraftVersion"::text = smd."DraftVersion"::text)
                        WHERE smd."SOPDocID" = "DocumentModule"."DocumentID"
                        ORDER BY smd."CreatedDate" DESC
                      ) q
                    )
                `),
                "DocLinkedSOP",
              ],
            ],
          },
          include: [
            {
              model: RiskAndCompliences,
              where: literal(
                '"RiskAndComplience"."MasterVersion"::text = "DocumentModule"."MasterVersion"::text'
              ),
              attributes: [
                "RiskAndComplianceID",
                "NoOfRisk",
                "NoOfCompliance",
                "NoOfClause",
              ],
              required: false,
            },
            {
              model: Favorite,
              as: "UserFavorite",
              where: {
                UserID: currentUserId,
              },
              required: false,
              attributes: ["FavoriteID"],
            },
          ],
        });
        if (accessCount) {
          await UserModuleAccessLog.create({
            ModuleID: DocumentID,
            UserID: currentUserId,
            AccessedDate: new Date().toISOString(),
            MasterVersion: moduleData.MasterVersion,
            CreatedBy: currentUserId,
          });
        }
        moduleDetails = await sequelize.query(
          `
        SELECT
          CASE
            WHEN sm."ModifiedDate" IS NOT NULL THEN (
              SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
              FROM "UserDetails"
              WHERE "UserID" = sm."ModifiedBy"
            )
            ELSE (
              SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
              FROM "UserDetails"
              WHERE "UserID" = sm."CreatedBy"
            )
          END AS "UploadeBy",
          COALESCE(sm."ModifiedDate", sm."CreatedDate") AS "UploadedOn",
          (
            SELECT json_agg(json_build_object(
              'CreatedDate', smd."CreatedDate",
              'CreatedBy', CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName"),
              'MasterVersion', smd."MasterVersion",
              'DraftVersion', smd."DraftVersion",
              'DocumentID', smd."DocumentModuleDraftID"
            ))
            FROM "DocumentModuleDrafts" smd
            LEFT JOIN "UserDetails" ud ON ud."UserID" = smd."CreatedBy"
            WHERE smd."DocumentID" = sm."DocumentID"
          ) AS "History"
          FROM "DocumentModules" sm
          WHERE sm."DocumentID" = :DocumentID
          ORDER BY sm."CreatedDate" DESC
          LIMIT 1;
       `,
          {
            replacements: { DocumentID },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        ancestors.push({
          ContentID: moduleData?.DocumentID,
          ContentName: moduleData?.DocumentName,
          level,
        });
        level++;
        if (moduleData) {
          moduleData = {
            ...moduleData.toJSON(),
            DocumentPath: moduleData?.DocumentPath
              ? path.posix.join(
                  "file/d/",
                  `${path.basename(moduleData.DocumentPath)}`
                )
              : null,
            EditedDocumentPath: moduleData?.EditedDocumentPath
              ? path.posix.join(
                  "file/d/",
                  `${path.basename(moduleData.EditedDocumentPath)}`
                )
              : null,
          };
        }
      } else if (TrainingSimulationID) {
        moduleData = await TrainingSimulationModule.findOne({
          where: { TrainingSimulationID },
          include: [
            {
              model: UserModuleAccessLog,
              as: "Logs",
              where: {
                UserID: currentUserId,
              },
              required: false,
              attributes: ["AccessedDate"],
            },
            {
              model: Favorite,
              as: "UserFavorite",
              where: {
                UserID: currentUserId,
              },
              required: false,
              attributes: ["FavoriteID"],
            },
          ],
          attributes: {
            include: [
              [
                sequelize.literal(`
            (
              SELECT "UserName"  FROM (
              SELECT
                CONCAT("UserFirstName" ,
                ' ' ,
                "UserLastName" ,
                ' ' ,
                "UserMiddleName") AS "UserName",
                ROW_NUMBER() OVER (ORDER BY "UserFirstName" DESC) as "RowNumber"
              FROM "UserModuleLinks" uml
               LEFT JOIN "UserDetails" ud ON ud."UserID" = uml."CreatedBy"
              WHERE
                uml."ModuleID" = "TrainingSimulationModule"."TrainingSimulationID"
                and uml."UserID"= '${currentUserId}'
            ) q1 WHERE "RowNumber" = 1)
            `),
                "AssignByUser",
              ],
              [
                sequelize.literal(`
            (
              SELECT "UserPhoto"  FROM (
              SELECT
                "UserPhoto", ROW_NUMBER() OVER (ORDER BY "UserPhoto" DESC) as "RowNumber"
              FROM "UserModuleLinks" uml
               LEFT JOIN "UserDetails" ud ON ud."UserID" = uml."CreatedBy"
              WHERE
                uml."ModuleID" = "TrainingSimulationModule"."TrainingSimulationID"
                and uml."UserID"= '${currentUserId}'
            ) q2 WHERE "RowNumber" = 1)
            `),
                "AssignByUserPhoto",
              ],
              [
                sequelize.literal(`(
              SELECT "DueDate"  FROM (
              SELECT "DueDate", ROW_NUMBER() OVER (ORDER BY "DueDate" DESC) as "RowNumber"
              FROM "UserModuleLinks"
              WHERE
                "ModuleID" = "TrainingSimulationModule"."TrainingSimulationID"
                and "UserID"= '${currentUserId}'
              ) q3 WHERE "RowNumber" = 1)`),
                "DueDate",
              ],
            ],
          },
        });
        moduleDetails = await sequelize.query(
          `
      SELECT
          CASE
            WHEN sm."ModifiedDate" IS NOT NULL THEN (
              SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
              FROM "UserDetails"
              WHERE "UserID" = sm."ModifiedBy"
            )
            ELSE (
              SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
              FROM "UserDetails"
              WHERE "UserID" = sm."CreatedBy"
            )
          END AS "UploadeBy",
          COALESCE(sm."ModifiedDate", sm."CreatedDate") AS "UploadedOn",
          (
            SELECT json_agg(json_build_object(
              'CreatedDate', s."CreatedDate",
              'CreatedBy', CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName"),
              'MasterVersion', s."MasterVersion",
              'DraftVersion', s."DraftVersion",
              'TrainingSimulationID', s."TrainingSimulationDraftID"
            ))
            FROM "TrainingSimulationModuleDrafts" s
            JOIN "UserDetails" ud ON ud."UserID" = sm."CreatedBy"
            WHERE sm."TrainingSimulationID" = s."TrainingSimulationID"
          ) AS "History"
        FROM "TrainingSimulationModules" sm
        WHERE sm."TrainingSimulationID" = :TrainingSimulationID
        ORDER BY sm."CreatedDate" DESC
        LIMIT 1;
        `,
          {
            replacements: { TrainingSimulationID },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        ancestors.push({
          ContentID: moduleData?.TrainingSimulationID,
          ContentName: moduleData?.TrainingSimulationName,
          level,
        });
        level++;
        moduleData = {
          ...moduleData.toJSON(),
          TrainingSimulationPath: path.posix.join(
            "file/trs/",
            `${path.basename(moduleData?.TrainingSimulationPath)}`
          ),
        };
      } else if (TestSimulationID) {
        moduleData = await TestSimulationModule.findOne({
          where: { TestSimulationID },
          include: [
            {
              model: TestSimulationReport,
              as: "PreviousAttempts",
              where: {
                UserID: currentUserId,
              },
              required: false,
            },
            {
              model: Favorite,
              as: "UserFavorite",
              where: {
                UserID: currentUserId,
              },
              required: false,
              attributes: ["FavoriteID"],
            },
          ],
          attributes: {
            include: [
              [
                sequelize.literal(`
            (
              SELECT "UserName"  FROM (
              SELECT
                CONCAT("UserFirstName" ,
                ' ' ,
                "UserLastName" ,
                ' ' ,
                "UserMiddleName") AS "UserName",
                ROW_NUMBER() OVER (ORDER BY "UserFirstName" DESC) as "RowNumber"
              FROM "UserModuleLinks" uml
               LEFT JOIN "UserDetails" ud ON ud."UserID" = uml."CreatedBy"
              WHERE
                uml."ModuleID" = "TestSimulationModule"."TestSimulationID"
                and uml."UserID" = '${currentUserId}' LIMIT 1
            ) q1 WHERE "RowNumber" = 1)
            `),
                "AssignByUser",
              ],
              [
                sequelize.literal(`
            (
              SELECT "UserPhoto"  FROM (
              SELECT
               "UserPhoto", ROW_NUMBER() OVER (ORDER BY "UserPhoto" DESC) as "RowNumber"
              FROM "UserModuleLinks" uml
               LEFT JOIN "UserDetails" ud ON ud."UserID" = uml."CreatedBy"
              WHERE
                uml."ModuleID" = "TestSimulationModule"."TestSimulationID"
                and uml."UserID" = '${currentUserId}' LIMIT 1
            ) q2 WHERE "RowNumber" = 1)
            `),
                "AssignByUserPhoto",
              ],
              [
                sequelize.literal(`(
              SELECT "DueDate"  FROM (
              SELECT "DueDate", ROW_NUMBER() OVER (ORDER BY "DueDate" DESC) as "RowNumber"
              FROM "UserModuleLinks"
              WHERE
                "ModuleID" = "TestSimulationModule"."TestSimulationID"
                and "UserID" = '${currentUserId}' LIMIT 1
              ) q3 WHERE "RowNumber" = 1)`),
                "DueDate",
              ],
            ],
          },
        });
        moduleDetails = await sequelize.query(
          `
        SELECT
          CASE
            WHEN sm."ModifiedDate" IS NOT NULL THEN (
              SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
              FROM "UserDetails"
              WHERE "UserID" = sm."ModifiedBy"
            )
            ELSE (
              SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
              FROM "UserDetails"
              WHERE "UserID" = sm."CreatedBy"
            )
          END AS "UploadeBy",
          COALESCE(sm."ModifiedDate", sm."CreatedDate") AS "UploadedOn",
          (
            SELECT json_agg(json_build_object(
              'CreatedDate', smd."CreatedDate",
              'CreatedBy', CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName"),
              'MasterVersion', smd."MasterVersion",
              'DraftVersion', smd."DraftVersion",
              'TestSimulationID', smd."TestSimulationDraftID"
            ))
            FROM "TestSimulationModuleDrafts" smd
            LEFT JOIN "UserDetails" ud ON ud."UserID" = smd."CreatedBy"
            WHERE smd."TestSimulationID" = sm."TestSimulationID"
          ) AS "History"
        FROM "TestSimulationModules" sm
        WHERE sm."TestSimulationID" = :TestSimulationID
        ORDER BY sm."CreatedDate" DESC
        LIMIT 1;
        `,
          {
            replacements: { TestSimulationID },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        ancestors.push({
          ContentID: moduleData?.TestSimulationID,
          ContentName: moduleData?.TestSimulationName,
          level,
        });
        level++;
        moduleData = {
          ...moduleData.toJSON(),
          TestSimulationPath: path.posix.join(
            "file/ts/",
            `${path.basename(moduleData?.TestSimulationPath)}`
          ),
        };
      } else if (TestMCQID) {
        moduleData = await TestMcqsModule.findOne({
          where: { TestMCQID },
          include: [
            {
              model: UserAttempts,
              as: "PreviousAttempts",
              where: {
                UserID: currentUserId,
              },
              required: false,
            },
            {
              model: Favorite,
              as: "UserFavorite",
              where: {
                UserID: currentUserId,
              },
              required: false,
              attributes: ["FavoriteID"],
            },
          ],
          attributes: {
            include: [
              [
                sequelize.literal(`
            (
              SELECT "UserName"  FROM (
              SELECT
                CONCAT("UserFirstName" ,
                ' ' ,
                "UserLastName" ,
                ' ' ,
                "UserMiddleName") AS "UserName",
                ROW_NUMBER() OVER (ORDER BY "UserFirstName" DESC) as "RowNumber"
              FROM "UserModuleLinks" uml
               LEFT JOIN "UserDetails" ud ON ud."UserID" = uml."CreatedBy"
              WHERE
                uml."ModuleID" = "TestMcqsModule"."TestMCQID"
                and uml."UserID"= '${currentUserId}'
            ) q1 WHERE "RowNumber" = 1)
            `),
                "AssignByUser",
              ],
              [
                sequelize.literal(`
             (
              SELECT "UserPhoto"  FROM (
              SELECT
               "UserPhoto", ROW_NUMBER() OVER (ORDER BY "UserPhoto" DESC) as "RowNumber"
              FROM "UserModuleLinks" uml
               LEFT JOIN "UserDetails" ud ON ud."UserID" = uml."CreatedBy"
              WHERE
                uml."ModuleID" = "TestMcqsModule"."TestMCQID"
                and uml."UserID"= '${currentUserId}'
            ) q2 WHERE "RowNumber" = 1)
            `),
                "AssignByUserPhoto",
              ],
              [
                sequelize.literal(` (
              SELECT "DueDate"  FROM (
              SELECT "DueDate", ROW_NUMBER() OVER (ORDER BY "DueDate" DESC) as "RowNumber"
              FROM "UserModuleLinks"
              WHERE
                "ModuleID" = "TestMcqsModule"."TestMCQID"
                and "UserID"= '${currentUserId}'
              ) q3 WHERE "RowNumber" = 1)`),
                "DueDate",
              ],
            ],
          },
        });
        moduleDetails = await sequelize.query(
          `
        SELECT
          CASE
            WHEN sm."ModifiedDate" IS NOT NULL THEN (
              SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
              FROM "UserDetails"
              WHERE "UserID" = sm."ModifiedBy"
            )
            ELSE (
              SELECT CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
              FROM "UserDetails"
              WHERE "UserID" = sm."CreatedBy"
            )
          END AS "UploadeBy",
          COALESCE(sm."ModifiedDate", sm."CreatedDate") AS "UploadedOn",
          (
            SELECT json_agg(json_build_object(
              'CreatedDate', smd."CreatedDate",
              'CreatedBy', CONCAT(ud."UserFirstName", ' ', ud."UserLastName", ' ', ud."UserMiddleName"),
              'MasterVersion', smd."MasterVersion",
              'DraftVersion', smd."DraftVersion",
              'TestMCQID', smd."TestMCQDraftID"
            ))
            FROM "TestMcqsModuleDrafts" smd
            LEFT JOIN "UserDetails" ud ON ud."UserID" = smd."CreatedBy"
            WHERE smd."TestMCQID" = sm."TestMCQID"
          ) AS "History"
        FROM "TestMcqsModules" sm
        WHERE sm."TestMCQID" = :TestMCQID
        ORDER BY sm."CreatedDate" DESC
        LIMIT 1;
        `,
          {
            replacements: { TestMCQID },
            type: sequelize.QueryTypes.SELECT,
          }
        );
        ancestors.push({
          ContentID: moduleData?.TestMCQID,
          ContentName: moduleData?.TestMCQName,
          level,
        });
        level++;
      } else {
        res.status(404).send({ message: "Respective Module Id is required" });
        return;
      }
    }

    const bredcrumbs = await sequelize.query(
      `WITH RECURSIVE ancestors AS (
                SELECT 
                    "ContentID", 
                    "ParentContentID", 
                    "ContentName",
                "ModuleTypeID",
                    0 AS depth
                FROM "ContentStructures"
              WHERE "ContentID" = :ContentID
                UNION ALL
                SELECT 
                    c."ContentID", 
                    c."ParentContentID", 
                    c."ContentName",
                c."ModuleTypeID",
                    a.depth + 1
                FROM "ContentStructures" c
                JOIN ancestors a ON c."ContentID" = a."ParentContentID"
				)
				SELECT * FROM ancestors;
      `,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: { ContentID: moduleData?.ContentID },
      }
    );
    res.status(200).send({
      data: moduleData,
      details: moduleDetails[0],
      bredcrumbs,
    });
  } catch (error) {
    console.log(error);
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

exports.getSopContentList = async (req, res) => {
  const { currentUserId } = req.payload;
  const { SopDetailsID } = req.body;
  try {
    const contentList = await SopDetails.findOne({
      where: {
        SopDetailsID,
      },
      include: {
        model: SopAttachmentLinks,
        as: "SopAttachmentLinks",
        attributes: [
          "SopContentLinkID",
          "SopDetailsID",
          "ContentLinkTitle",
          "ContentLink",
          "ContentLinkType",
          "IsActive",
          [
            sequelize.literal(`
          (
            select json_build_object('NoOfRisk', coalesce(rac."NoOfRisk", 0),
              'NoOfCompliance', coalesce(rac."NoOfCompliance", 0),
              'NoOfClause', coalesce(rac."NoOfClause", 0), 'RiskAndComplianceID', rac."RiskAndComplianceID")  
              from "DocumentModules" dm
              inner join "RiskAndCompliences" rac on rac."DocumentID":: text = "SopAttachmentLinks"."ContentLink":: text 
              and rac."MasterVersion":: text = dm."MasterVersion":: text
              where dm."DocumentID":: text = "SopAttachmentLinks"."ContentLink":: text
              and "SopAttachmentLinks"."ContentLinkType" = 'doc'
          )
          `),
            "RiskAndComplience",
          ],
        ],
      },
      attributes: {
        exclude: ["CreatedBy", "ModifiedBy", "CreatedDate", "ModifiedDate"],
      },
    });
    res.status(200).send({ data: contentList });
  } catch (error) {
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

exports.getQuestionList = async (req, res) => {
  const transaction = await sequelize.transaction();
  const { currentUserId } = req.payload;
  const { TestMCQID, IsMyAssignment = true } = req.body;
  try {
    if (IsMyAssignment) {
      const { TotalQuestions, TotalAttempts, MasterVersion } =
        await TestMcqsModule.findOne({
          where: {
            TestMCQID,
          },
          attributes: ["TotalQuestions", "TotalAttempts", "MasterVersion"],
        });
      const count = await UserAttempts.count({
        where: {
          ModuleID: TestMCQID,
          UserID: currentUserId,
        },
      });
      if (count >= TotalAttempts) {
        res
          .status(403)
          .send({ message: "You have reached the maximum attempts" });
        return;
      }
      // if (new Date(DueDate) < new Date()) {
      //     res.status(403).send({ message: "Test is expired" });
      //     return;
      // }
      const accessCount = await UserModuleLink.count({
        where: {
          ModuleID: TestMCQID,
          UserID: currentUserId,
          StartDate: {
            [Op.lte]: literal("CURRENT_TIMESTAMP"),
          },
          DueDate: {
            [Op.gte]: literal("CURRENT_TIMESTAMP"),
          },
        },
        distinct: true,
        col: "ModuleID",
      });
      if (accessCount) {
        await UserModuleAccessLog.create(
          {
            ModuleID: TestMCQID,
            UserID: currentUserId,
            AccessedDate: new Date().toISOString(),
            CreatedBy: currentUserId,
            MasterVersion,
          },
          { transaction }
        );
      }
      const questions = await QuestionRepository.findAll({
        where: {
          TestMCQID,
          IsDeleted: false,
        },
        attributes: [
          "QuestionID",
          "QuestionHeading",
          "QuestionText",
          "QuestionImage",
          "IsMultipleAnswer",
          "IsAnswerWithImage",
          "IsRequired",
        ],
        include: {
          model: QuestionAnswersLink,
          as: "AnswerOptions",
          attributes: ["AnswerID", "OptionText", "Ordering"],
        },
        order: literal("random()"),
        limit: TotalQuestions,
      });
      const { AttemptID, NumberOfQuestions, StartedOn } =
        await UserAttempts.create(
          {
            ModuleID: TestMCQID,
            UserID: currentUserId,
            NumberOfQuestions: TotalQuestions,
            StartedOn: new Date().toISOString(),
            CreatedBy: currentUserId,
            MasterVersion,
          },
          { transaction }
        );
      await transaction.commit();
      res.status(200).send({
        data: questions,
        attemptDetails: { AttemptID, NumberOfQuestions, StartedOn },
      });
    } else {
      const mcqDraft = await TestMcqsModuleDraft.findOne({
        where: {
          TestMCQID,
        },
        order: [["CreatedDate", "DESC"]],
      });
      if (!mcqDraft) {
        await transaction.rollback();
        return res.status(404).send({ message: "Test not found" });
      }
      const newDraft = JSON.parse(JSON.stringify(mcqDraft));

      const questions = await QuestionRepository.findAll({
        where: {
          TestMCQID,
          IsDeleted: false,
        },
        attributes: [
          "QuestionID",
          "QuestionHeading",
          "QuestionText",
          "QuestionImage",
          "IsMultipleAnswer",
          "IsAnswerWithImage",
          "IsRequired",
        ],
        include: {
          model: QuestionAnswersLink,
          as: "AnswerOptions",
          attributes: ["AnswerID", "OptionText", "Ordering"],
        },
        order: literal("random()"),
        limit: newDraft.TotalQuestions,
      });

      res.status(200).send({
        data: questions,
        attemptDetails: {
          AttemptID: null,
          NumberOfQuestions: newDraft.TotalQuestions,
          StartedOn: null,
        },
      });
    }
  } catch (error) {
    await transaction.rollback();
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

exports.updateQuestionStatus = async (req, res) => {
  const transaction = await sequelize.transaction();
  const { currentUserId } = req.payload;
  const { AttemptID, QuestionAnswerIDs } = req.body;
  try {
    const { IsFinished, ModuleID } = await UserAttempts.findOne({
      where: {
        AttemptID,
      },
      attributes: ["IsFinished", "ModuleID"],
    });
    const { TotalQuestions, IsMandatoryAllQuestions, TestMCQName } =
      await TestMcqsModule.findOne({
        where: {
          TestMCQID: ModuleID,
        },
        attributes: [
          "TotalQuestions",
          "IsMandatoryAllQuestions",
          "TestMCQName",
        ],
      });
    const uniqueData = {};
    for (const el of QuestionAnswerIDs) {
      uniqueData[el.QuestionID] = el.AnswerID;
    }

    if (
      IsMandatoryAllQuestions &&
      Object.keys(uniqueData).length < TotalQuestions
    ) {
      res.status(400).send({ error: "All Questions are Mandatory" });
      return;
    }

    if (IsFinished) {
      res.status(400).send({ error: "Test already submitted" });
      return;
    }
    const answers = await QuestionAnswersLink.findAll({
      where: {
        AnswerID: {
          [Op.in]: Object.values(uniqueData),
        },
      },
      attributes: ["AnswerID", "QuestionID", "IsCorrect"],
    });
    const answersDetailsArray = [];
    let correctCount = 0;
    for (const { AnswerID, QuestionID, IsCorrect } of JSON.parse(
      JSON.stringify(answers)
    )) {
      if (IsCorrect) {
        correctCount++;
      }
      answersDetailsArray.push({
        AttemptID,
        QuestionID,
        AnswerID,
        IsCorrect,
        CreatedBy: currentUserId,
      });
    }
    await UserAttemptDetails.bulkCreate(answersDetailsArray, { transaction });
    await UserAttempts.update(
      {
        QuestionsCorrect: correctCount,
        QuestionsIncorrect: answersDetailsArray.length - correctCount,
        Score: (correctCount / TotalQuestions) * 100,
        CompletedOn: new Date().toISOString(),
        IsFinished: true,
        ModifiedBy: currentUserId,
        ModifiedDate: new Date().toISOString(),
      },
      {
        where: {
          AttemptID,
        },
      },
      { transaction }
    );
    const data = await UserAttempts.findOne({
      where: {
        AttemptID,
      },
      attributes: {
        include: [
          [
            sequelize.literal(`(
          SELECT tmm."PassPercentage"
          FROM "TestMcqsModules" tmm 
          WHERE tmm."TestMCQID" = "UserAttempts"."ModuleID"
        )`),
            "PassPercentage",
          ],
          [
            sequelize.literal(`(
          SELECT tm."TestMCQName"
          FROM "TestMcqsModules" tm
          WHERE tm."TestMCQID" = "UserAttempts"."ModuleID"
        )`),
            "ModuleName",
          ],
        ],
      },
      transaction,
    });

    await transaction.commit();
    res.status(200).send({ message: "Attempt submitted successfully", data });
  } catch (error) {
    await transaction.rollback();
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

exports.addAccessToUser = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  const { UserID, LinkDetails, PublishStartDate, PublishEndDate } = req.body;
  try {
    const bulkData = [];
    let elementId;
    for (const el of LinkDetails) {
      if (!el.ContentID && el.ModuleTypeID) {
        bulkData.push({
          UserID,
          ContentID: null,
          ModuleTypeID: el.ModuleTypeID,
          PublishStartDate,
          PublishEndDate,
          CreatedBy: currentUserId,
        });
      }
      if (el.ElementID && el.ModuleTypeID) {
        elementId = el.ContentID;
        bulkData.push({
          UserID,
          ContentID: el.ContentID,
          ModuleTypeID: el.ModuleTypeID,
          PublishStartDate,
          PublishEndDate,
          CreatedBy: currentUserId,
        });
      }
    }
    const getAncestors = async (pElementId) => {
      const parentElement = await ContentStructure.findOne({
        where: {
          ContentID: pElementId,
          OrganizationStructureID: lincense?.EnterpriseID,
        },
        attributes: ["ContentID", "ContentName", "ParentContentID"],
      });
      if (parentElement) {
        bulkData.push({
          UserID,
          ContentID: parentElement.ContentID,
          ModuleTypeID: parentElement.ModuleTypeID,
          PublishStartDate,
          PublishEndDate,
          CreatedBy: currentUserId,
        });
        if (parentElement.ParentContentID) {
          await getAncestors(parentElement.ParentContentID);
        }
      }
    };
    if (elementId) {
      await getAncestors(elementId);
    }
    await UserAccessLinks.bulkCreate(bulkData, { ignoreDuplicates: true });
  } catch (error) {
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

exports.addUserAccessLog = async (req, res) => {
  const { currentUserId } = req.payload;
  const { ModuleID, IsAncknowledged = false, MasterVersion = null } = req.body;
  try {
    if (IsAncknowledged) {
      if (!MasterVersion) {
        res.status(423).send({ error: "MasterVersion is required" });
        return;
      }
      const ancknowledge = await UserModuleAccessLog.count({
        where: {
          ModuleID,
          IsAncknowledged,
          MasterVersion,
          UserID: currentUserId,
        },
      });
      if (ancknowledge) {
        res.status(423).send({ error: "Already Ancknowledged" });
        return;
      }
    }
    const accessCount = await UserModuleLink.count({
      where: {
        ModuleID: ModuleID,
        UserID: currentUserId,
        StartDate: {
          [Op.lte]: literal("CURRENT_TIMESTAMP"),
        },
        DueDate: {
          [Op.gte]: literal("CURRENT_TIMESTAMP"),
        },
      },
      distinct: true,
      col: "ModuleID",
    });
    if (!accessCount) {
      res.status(403).send({ message: "Access Denied due to non assign User" });
      return;
    }
    const data = await TestSimulationModule.findOne({
      where: {
        TestSimulationID: ModuleID,
      },
      attributes: ["TotalAttempts"],
      include: {
        model: UserModuleAccessLog,
        as: "Logs",
        attributes: ["AccessID"],
        required: false,
        where: {
          UserID: currentUserId,
        },
      },
    });
    if (data) {
      const Respdata = JSON.parse(JSON.stringify(data));
      if (Respdata.TotalAttempts <= Respdata?.Logs.length) {
        res.status(400).send({ error: "Maximum attempts reached" });
        return;
      }
    }
    await UserModuleAccessLog.create({
      ModuleID,
      UserID: currentUserId,
      AccessedDate: new Date().toISOString(),
      IsAncknowledged,
      MasterVersion,
      CreatedBy: currentUserId,
    });
    res.status(201).send({ message: "Access added successfully" });
  } catch (error) {
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

exports.addOrUpdateUserDetails = async (req, res) => {
  const { currentUserId } = req.payload;
  const {
    UserFirstName,
    UserLastName,
    UserMiddleName,
    UserEmail,
    UserPhoneNumber,
    UserPhoto,
    UserAddress,
    UserDateOfBirth,
    Gender,
    UserEmployeeNumber,
    UserSupervisorID,
  } = req.body;
  try {
    const count = await UserDetails.count({
      where: {
        UserID: currentUserId,
      },
    });
    if (count > 0) {
      await UserDetails.update(
        {
          UserFirstName,
          UserLastName,
          UserMiddleName,
          UserEmail,
          UserPhoneNumber,
          UserPhoto,
          UserAddress,
          UserDateOfBirth,
          Gender,
          UserEmployeeNumber,
          UserSupervisorID,
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
      await UserDetails.create({
        UserID: currentUserId,
        UserFirstName,
        UserLastName,
        UserMiddleName,
        UserEmail,
        UserPhoneNumber,
        UserPhoto,
        UserAddress,
        UserDateOfBirth,
        Gender,
        UserEmployeeNumber,
        UserSupervisorID,
        CreatedBy: currentUserId,
      });
    }
    res.status(200).send({ message: "User Details updated successfully" });
  } catch (error) {
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
exports.updateUserNotificationConfig = async (req, res) => {
  const { currentUserId } = req.payload;
  const { NotificationTypeForPublish, NotificationTypeForAction } = req.body;
  try {
    const count = await Notification.count({
      where: {
        UserID: currentUserId,
      },
    });
    if (count) {
      await Notification.update(
        {
          NotificationTypeForPublish,
          NotificationTypeForAction,
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
      await Notification.create({
        UserID: currentUserId,
        NotificationTypeForPublish,
        NotificationTypeForAction,
        CreatedBy: currentUserId,
      });
    }
    res.status(200).send({
      message: "User Notification Configuration updated successfully",
    });
  } catch (error) {
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

exports.changeUserPassword = async (req, res) => {
  const { currentUserId } = req.payload;
  const { OldPassword, NewPassword, ConfirmPassword } = req.body;
  try {
    if (NewPassword.length < 8) {
      res
        .status(400)
        .send({ error: "Password must be at least 8 characters long" });
      return;
    }
    if (NewPassword != ConfirmPassword) {
      res
        .status(400)
        .send({ error: "New Password and ConfirmPassword must be match" });
      return;
    }
    if (OldPassword === NewPassword) {
      res
        .status(400)
        .send({ error: "Old password cannot be the same as new password" });
      return;
    }
    const { Password } = await Users.findOne({
      where: {
        UserID: currentUserId,
      },
    });
    const IsMatch = comparePassword(OldPassword, Password);
    if (!IsMatch) {
      res.status(400).send({ error: "Old password entered is incorrect" });
      return;
    }
    const passHash = generatePasswordHash(NewPassword);
    await Users.update(
      {
        Password: passHash,
      },
      {
        where: {
          UserID: currentUserId,
        },
      }
    );
    res.status(200).send({ message: "User Password updated successfully" });
  } catch (error) {
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
exports.getAchivements = async (req, res) => {
  const { currentUserId } = req.payload;
  const { ModuleType } = req.body;
  try {
    let achivements = [];
    if (ModuleType == "mcqs") {
      achivements = await sequelize.query(
        `
        SELECT
        tmm."TestMCQID",
          tmm."TestMCQName",
            uai."NumberOfQuestions",
              uai."QuestionsCorrect",
                uai."QuestionsIncorrect",
                  uai."Score",
                    uai."StartedOn",
                      uai."CompletedOn",
                        uai."MasterVersion"
        FROM
        "TestMcqsModules" tmm
          INNER JOIN(
          SELECT 
                  ua."NumberOfQuestions",
          ua."ModuleID",
          ua."QuestionsCorrect",
          ua."QuestionsIncorrect",
          ua."Score",
          ua."StartedOn",
          ua."CompletedOn",
          ua."MasterVersion",
          ROW_NUMBER() OVER(PARTITION BY ua."ModuleID", ua."MasterVersion" ORDER BY ua."Score" DESC) AS "RowNumber"
              FROM 
                  "UserAttempts" ua
              WHERE 
                  ua."IsFinished" = true
                  AND ua."UserID" = :UserID
        ) uai
        ON
        tmm."TestMCQID" = uai."ModuleID" 
              AND uai."RowNumber" = 1;

        `,
        {
          replacements: { UserID: currentUserId },
          type: sequelize.QueryTypes.SELECT,
        }
      );
    } else if (ModuleType == "test") {
      achivements = await sequelize.query(
        `
        SELECT
        tsm."TestSimulationID",
          tsm."TestSimulationName",
            (tsr."RightAnswerClick" + tsr."WrongAnswerClick") as "NumberOfClick",
              tsr."RightAnswerClick",
                tsr."WrongAnswerClick",
                  tsr."TotalPercentage",
                    tsr."CreatedDate" as "CompletedOn",
                      tsr."MasterVersion"
        FROM
        "TestSimulationModules" tsm
          INNER JOIN(
          SELECT 
                  tsr."TestSimulationID",
          tsr."RightAnswerClick",
          tsr."WrongAnswerClick",
          tsr."TotalPercentage",
          tsr."CreatedDate",
          tsr."MasterVersion",
          ROW_NUMBER() OVER(PARTITION BY tsr."TestSimulationID", tsr."MasterVersion" ORDER BY tsr."TotalPercentage" DESC) AS "RowNumber"
              FROM 
                  "TestSimulationReports" tsr
              WHERE 
                  tsr."UserID" = :UserID
        ) tsr
        ON
        tsr."TestSimulationID" = tsm."TestSimulationID"
              AND tsr."RowNumber" = 1;
        `,
        {
          replacements: { UserID: currentUserId },
          type: sequelize.QueryTypes.SELECT,
        }
      );
    } else {
      res.status(400).send({ error: "Invalid ModuleType ! " });
      return;
    }
    res.status(200).send({ achivements });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(500).send({ error: "Internal Server Error" });
  }
};
exports.globalSearch = async (req, res) => {
  const { currentUserId, ModuleTypeIDs, lincense } = req.payload;
  const { SearchParam } = req.body;
  console.log(req.body, "search param");
  try {
    const moduleFilter = {};
    if (req.body.ModuleTypeIDs.length > 0) {
      const filterIds = [];
      for (const el of ModuleTypeIDs) {
        if (req.body.ModuleTypeIDs.includes(el)) {
          filterIds.push(el);
        }
      }
      if (filterIds) {
        moduleFilter["ModuleTypeID"] = { [Op.in]: filterIds };
      } else {
        moduleFilter["ModuleTypeID"] = { [Op.in]: ModuleTypeIDs };
      }
    }
    const moduleMaster = await ModuleMaster.findAll({
      where: {
        ...moduleFilter,
        IsActive: true,
      },
      attributes: ["ModuleTypeID", "ModuleName"],
    });
    const response = {};
    for (const el of JSON.parse(JSON.stringify(moduleMaster))) {
      if (el.ModuleName === "SOP") {
        response[el.ModuleName] = await SopModule.findAll({
          where: {
            SOPName: { [Op.iLike]: `% ${SearchParam}% ` },
            ContentID: {
              [Op.in]: literal(
                `(SELECT "ContentID" FROM "ContentStructures" WHERE "OrganizationStructureID" = '${lincense.EnterpriseID}')`
              ),
            },
            SOPStatus: "Published",
          },
          attributes: [
            "SOPID",
            "SOPName",
            "ContentID",
            [Sequelize.fn("concat", el.ModuleName), "ModuleName"],
          ],
        });
      }
      if (el.ModuleName === "TestSimulation") {
        response[el.ModuleName] = await TestSimulationModule.findAll({
          where: {
            TestSimulationName: { [Op.iLike]: `% ${SearchParam}% ` },
            ContentID: {
              [Op.in]: literal(
                `(SELECT "ContentID" FROM "ContentStructures" WHERE "OrganizationStructureID" = '${lincense.EnterpriseID}')`
              ),
            },
            TestSimulationStatus: "Published",
          },
          attributes: [
            "TestSimulationID",
            "TestSimulationName",
            "ContentID",
            [Sequelize.fn("concat", el.ModuleName), "ModuleName"],
          ],
        });
      }
      if (el.ModuleName === "TestMCQ") {
        response[el.ModuleName] = await TestMcqsModule.findAll({
          where: {
            TestMCQName: { [Op.iLike]: `% ${SearchParam}% ` },
            ContentID: {
              [Op.in]: literal(
                `(SELECT "ContentID" FROM "ContentStructures" WHERE "OrganizationStructureID" = '${lincense.EnterpriseID}')`
              ),
            },
            TestMCQStatus: "Published",
          },
          attributes: [
            "TestMCQID",
            "TestMCQName",
            "ContentID",
            [Sequelize.fn("concat", el.ModuleName), "ModuleName"],
          ],
        });
      }
      if (el.ModuleName === "TrainingSimulation") {
        response[el.ModuleName] = await TrainingSimulationModule.findAll({
          where: {
            TrainingSimulationName: { [Op.iLike]: `% ${SearchParam}% ` },
            ContentID: {
              [Op.in]: literal(
                `(SELECT "ContentID" FROM "ContentStructures" WHERE "OrganizationStructureID" = '${lincense.EnterpriseID}')`
              ),
            },
            TrainingSimulationStatus: "Published",
          },
          attributes: [
            "TrainingSimulationID",
            "TrainingSimulationName",
            "ContentID",
            [Sequelize.fn("concat", el.ModuleName), "ModuleName"],
          ],
        });
      }
      if (el.ModuleName === "Document") {
        response[el.ModuleName] = await DocumentModule.findAll({
          where: {
            DocumentName: { [Op.iLike]: `% ${SearchParam}% ` },
            ContentID: {
              [Op.in]: literal(
                `(SELECT "ContentID" FROM "ContentStructures" WHERE "OrganizationStructureID" = '${lincense.EnterpriseID}')`
              ),
            },
            DocumentStatus: "Published",
          },

          attributes: [
            "DocumentID",
            "DocumentName",
            "ContentID",
            [Sequelize.fn("concat", el.ModuleName), "ModuleName"],
          ],
        });
      }
    }

    res.status(200).send({ data: response });
  } catch (error) {
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

exports.getUserFavorites = async (req, res) => {
  const { currentUserId } = req.payload;
  const { ModuleTypeID } = req.body;
  try {
    const moduleFilter = {};
    const moduleLimit = { limit: 12 };
    if (ModuleTypeID) {
      moduleFilter["ModuleTypeID"] = ModuleTypeID;
      delete moduleLimit.limit;
    }
    const favorite = await Favorite.findAll({
      where: {
        UserID: currentUserId,
        ...moduleFilter,
      },
      attributes: ["ModuleID", "ModuleTypeID"],
    });
    const moduleMaster = await ModuleMaster.findAll({
      where: {
        ...moduleFilter,
        IsActive: true,
      },
      attributes: ["ModuleTypeID", "ModuleName"],
    });
    const favlist = JSON.parse(JSON.stringify(favorite));
    if (!favlist.length) {
      res.status(200).send({ data: {} });
      return;
    }
    const moduleTypeList = JSON.parse(JSON.stringify(moduleMaster));
    const moduleWiseFavorites = {};
    for (const el of moduleTypeList) {
      if (!Array.isArray(moduleWiseFavorites[el.ModuleTypeID])) {
        moduleWiseFavorites[el.ModuleTypeID] = [];
      }
    }
    for (const el of favlist) {
      if (!Array.isArray(moduleWiseFavorites[el.ModuleTypeID])) {
        moduleWiseFavorites[el.ModuleTypeID] = [];
      }
      moduleWiseFavorites[el.ModuleTypeID].push(el.ModuleID);
    }
    const response = {};
    for (const el of moduleTypeList) {
      if (el.ModuleName === "SOP") {
        response[el.ModuleName] = await SopModule.findAndCountAll({
          where: {
            SOPID: { [Op.in]: moduleWiseFavorites[el.ModuleTypeID] },
          },
          ...moduleLimit,
          attributes: [
            "SOPID",
            "SOPName",
            [Sequelize.fn("concat", el.ModuleName), "ModuleName"],
          ],
        });
        response[el.ModuleName].ModuleTypeID = el.ModuleTypeID;
      }
      if (el.ModuleName === "TestSimulation") {
        response[el.ModuleName] = await TestSimulationModule.findAndCountAll({
          where: {
            TestSimulationID: { [Op.in]: moduleWiseFavorites[el.ModuleTypeID] },
          },
          ...moduleLimit,
          attributes: [
            "TestSimulationID",
            "TestSimulationName",
            [Sequelize.fn("concat", el.ModuleName), "ModuleName"],
          ],
        });
        response[el.ModuleName].ModuleTypeID = el.ModuleTypeID;
      }
      if (el.ModuleName === "TestMCQ") {
        response[el.ModuleName] = await TestMcqsModule.findAndCountAll({
          where: {
            TestMCQID: { [Op.in]: moduleWiseFavorites[el.ModuleTypeID] },
          },
          ...moduleLimit,
          attributes: [
            "TestMCQID",
            "TestMCQName",
            [Sequelize.fn("concat", el.ModuleName), "ModuleName"],
          ],
        });
        response[el.ModuleName].ModuleTypeID = el.ModuleTypeID;
      }
      if (el.ModuleName === "TrainingSimulation") {
        response[el.ModuleName] =
          await TrainingSimulationModule.findAndCountAll({
            where: {
              TrainingSimulationID: {
                [Op.in]: moduleWiseFavorites[el.ModuleTypeID],
              },
            },
            ...moduleLimit,
            attributes: [
              "TrainingSimulationID",
              "TrainingSimulationName",
              [Sequelize.fn("concat", el.ModuleName), "ModuleName"],
            ],
          });
        response[el.ModuleName].ModuleTypeID = el.ModuleTypeID;
      }
      if (el.ModuleName === "SkillBuilding") {
        response[el.ModuleName] =
          await TrainingSimulationModule.findAndCountAll({
            where: {
              TrainingSimulationID: {
                [Op.in]: moduleWiseFavorites[el.ModuleTypeID],
              },
            },
            ...moduleLimit,
            attributes: [
              "TrainingSimulationID",
              "TrainingSimulationName",
              [Sequelize.fn("concat", el.ModuleName), "ModuleName"],
            ],
          });
        response[el.ModuleName].ModuleTypeID = el.ModuleTypeID;
      }
      if (el.ModuleName === "SkillAssessment") {
        response[el.ModuleName] = await TestSimulationModule.findAndCountAll({
          where: {
            TestSimulationID: {
              [Op.in]: moduleWiseFavorites[el.ModuleTypeID],
            },
          },
          ...moduleLimit,
          attributes: [
            "TestSimulationID",
            "TestSimulationName",
            [Sequelize.fn("concat", el.ModuleName), "ModuleName"],
          ],
        });
        response[el.ModuleName].ModuleTypeID = el.ModuleTypeID;
      }
      if (el.ModuleName === "Document") {
        response[el.ModuleName] = await DocumentModule.findAndCountAll({
          where: {
            DocumentID: { [Op.in]: moduleWiseFavorites[el.ModuleTypeID] },
          },
          ...moduleLimit,
          attributes: [
            "DocumentID",
            "DocumentName",
            [Sequelize.fn("concat", el.ModuleName), "ModuleName"],
          ],
        });
        response[el.ModuleName].ModuleTypeID = el.ModuleTypeID;
      }
    }
    res.status(200).send({ data: response });
  } catch (error) {
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

exports.addToFavorite = async (req, res) => {
  const { currentUserId } = req.payload;
  const { ModuleID, ModuleTypeID } = req.body;
  try {
    await Favorite.create({
      UserID: currentUserId,
      ModuleID,
      ModuleTypeID,
      CreatedBy: currentUserId,
    });
    res.status(200).send({ message: "Added to Favorites Successfully" });
  } catch (error) {
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

exports.getDashboardData = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const [resp, coutData, banner] = await Promise.all([
      //resp
      sequelize.query(
        `WITH
              REF AS (
                SELECT
                  DATE_TRUNC('month',NOW()) AS REF_MONTH
              ),
              "MonthLists" AS (
                SELECT
                  TO_CHAR(REF_MONTH + (I || ' month')::INTERVAL, 'YYYY-MM') AS YEAR_MONTH,
                  TO_CHAR(REF_MONTH + (I || ' month')::INTERVAL, 'Mon') AS MONTH_NAME,
                  (REF_MONTH + (I || ' month')::INTERVAL) AS MONTH_START,
                  (REF_MONTH + ((I + 1) || ' month')::INTERVAL) AS MONTH_END,
                  I AS MONTH_ORDER
                FROM
                  REF,
                  GENERATE_SERIES(-4, 1) G (I)
              ),
            "MonthWiseAssignings" AS (
              SELECT
                M.*,
                L."ModuleID",
                L."ModuleTypeID",
                L."UserID",
                MM."ModuleName"
              FROM
                "ModuleMasters" MM
                LEFT JOIN "MonthLists" M ON TRUE
                LEFT JOIN "UserModuleLinks" L ON L."StartDate" < M.MONTH_END
                AND L."DueDate" >= M.MONTH_START
                AND MM."ModuleTypeID" = L."ModuleTypeID"
                AND L."UserID" = :UserID
            ),
            "LImitedSixMonthData" AS (
              SELECT
                A.*,
                L."AccessedDate"
              FROM
                "MonthWiseAssignings" A
                LEFT JOIN "UserModuleAccessLogs" L ON L."ModuleID" = A."ModuleID"
                AND L."AccessedDate" >= A.MONTH_START
                AND L."AccessedDate" < A.MONTH_END
                AND L."UserID" = :UserID
            ),
            "MonthWiseElementAssignAndAccess" AS (
              SELECT
                MONTH_NAME,
                MONTH_ORDER,
                "ModuleTypeID",
                "ModuleName",
                COUNT(DISTINCT "ModuleID") AS "AssignElement",
                COUNT(DISTINCT "ModuleID") FILTER (
                  WHERE
                    "AccessedDate" IS NOT NULL
                ) AS "AccessElement"
              FROM
                "LImitedSixMonthData"
              GROUP BY
                MONTH_NAME,
                MONTH_ORDER,
                "ModuleTypeID",
                "ModuleName"
            )
            SELECT
              MA."ModuleName",
              JSON_AGG(
                JSON_BUILD_OBJECT(
                  'Month',
                  MA.MONTH_NAME,
                  'Total',
                  COALESCE(MA."AssignElement", 0),
                  'Attempt',
                  COALESCE(MA."AccessElement", 0)
                )
                ORDER BY MA.MONTH_ORDER
              ) AS DATES
            FROM
              "MonthWiseElementAssignAndAccess" MA
            WHERE MA."ModuleTypeID" IN (:ModuleTypeIDs)
            GROUP BY
              MA."ModuleName"
                  `,
        {
          replacements: {
            UserID: currentUserId,
            ModuleTypeIDs: lincense.ModuleTypeIDs,
          },
          type: sequelize.QueryTypes.SELECT,
        }
      ),
      //coutData
      sequelize.query(
        `
                WITH RECURSIVE descendants AS (
          SELECT 
              c."ContentID", 
              c."ParentContentID", 
              c."ContentName",
              c."ModuleTypeID",
              c."IsDeleted", 
              0 AS depth
          FROM "ContentStructures" c
          WHERE c."ParentContentID" IS NULL
        AND c."IsDeleted" IS NOT TRUE
        AND c."OrganizationStructureID" = :OrganizationStructureID
          UNION ALL
          SELECT 
              child."ContentID", 
              child."ParentContentID", 
              child."ContentName",
              child."ModuleTypeID",
              child."IsDeleted",
              d.depth + 1
          FROM "ContentStructures" child
          JOIN descendants d 
              ON child."ParentContentID" = d."ContentID"
          WHERE d."IsDeleted" = false  
      ),
      "SelectedContentIds" AS (
      SELECT "ContentID","ModuleTypeID"
      FROM descendants
      WHERE "IsDeleted" = false
      )
      SELECT 'sop' AS name, COUNT(DISTINCT uml."ModuleID") AS count FROM "SopModules" m
      INNER JOIN "UserModuleLinks" uml ON uml."ModuleID" = m."SOPID" 
      INNER JOIN "ContentStructures" cs ON cs."ContentID" = m."ContentID" AND cs."IsDeleted" IS NOT TRUE
      AND CURRENT_DATE BETWEEN uml."StartDate" AND uml."DueDate" AND uml."UserID"=:UserID
      WHERE m."IsDeleted" IS NOT TRUE
      AND cs."ContentID" IN (SELECT "ContentID" FROM "SelectedContentIds" s WHERE s."ModuleTypeID" = cs."ModuleTypeID")
      UNION ALL
      SELECT 'doc' AS name, COUNT(DISTINCT uml."ModuleID") AS count FROM "DocumentModules" m
      INNER JOIN "UserModuleLinks" uml ON uml."ModuleID" = m."DocumentID" 
      INNER JOIN "ContentStructures" cs ON cs."ContentID" = m."ContentID" AND cs."IsDeleted" IS NOT TRUE
      AND CURRENT_DATE BETWEEN uml."StartDate" AND uml."DueDate" AND uml."UserID"=:UserID
      WHERE m."IsDeleted" IS NOT TRUE 
      AND cs."ContentID" IN (SELECT "ContentID" FROM "SelectedContentIds" s WHERE s."ModuleTypeID" = cs."ModuleTypeID")
      UNION ALL
      SELECT 'mcq' AS name, COUNT(DISTINCT uml."ModuleID") AS count FROM "TestMcqsModules" m
      INNER JOIN "UserModuleLinks" uml ON uml."ModuleID" = m."TestMCQID" 
      INNER JOIN "ContentStructures" cs ON cs."ContentID" = m."ContentID" AND cs."IsDeleted" IS NOT TRUE
      AND CURRENT_DATE BETWEEN uml."StartDate" AND uml."DueDate" AND uml."UserID"=:UserID
      WHERE m."IsDeleted" IS NOT TRUE
      AND cs."ContentID" IN (SELECT "ContentID" FROM "SelectedContentIds" s WHERE s."ModuleTypeID" = cs."ModuleTypeID")
      UNION ALL
      SELECT 'tes' AS name, COUNT(DISTINCT uml."ModuleID") AS count FROM "TestSimulationModules" m
      INNER JOIN "UserModuleLinks" uml ON uml."ModuleID" = m."TestSimulationID" 
      INNER JOIN "ContentStructures" cs ON cs."ContentID" = m."ContentID" AND cs."IsDeleted" IS NOT TRUE
      AND CURRENT_DATE BETWEEN uml."StartDate" AND uml."DueDate" AND uml."UserID"=:UserID
      WHERE m."IsDeleted" IS NOT TRUE
      AND cs."ContentID" IN (SELECT "ContentID" FROM "SelectedContentIds" s WHERE s."ModuleTypeID" = cs."ModuleTypeID")
      UNION ALL
      SELECT 'trs' AS name, COUNT(DISTINCT uml."ModuleID") AS count FROM "TrainingSimulationModules" m
      INNER JOIN "UserModuleLinks" uml ON uml."ModuleID" = m."TrainingSimulationID" 
      INNER JOIN "ContentStructures" cs ON cs."ContentID" = m."ContentID" AND cs."IsDeleted" IS NOT TRUE
      AND CURRENT_DATE BETWEEN uml."StartDate" AND uml."DueDate" AND uml."UserID"=:UserID
      WHERE m."IsDeleted" IS NOT TRUE
      AND cs."ContentID" IN (SELECT "ContentID" FROM "SelectedContentIds" s WHERE s."ModuleTypeID" = cs."ModuleTypeID") `,
        {
          replacements: {
            UserID: currentUserId,
            OrganizationStructureID: lincense?.EnterpriseID,
          },
          type: sequelize.QueryTypes.SELECT,
        }
      ),
      //performance
      //         sequelize.query(
      //           `
      //               SELECT 'Progress' AS "Key"
      //           , (100 * count(DISTINCT umal."ModuleID") / count(DISTINCT uml."ModuleID")) AS "Value"
      //               FROM "UserModuleLinks" uml
      //               LEFT JOIN "UserModuleAccessLogs" umal ON umal."UserID" = uml."UserID"
      //               AND umal."ModuleID" IN(Select "ModuleID" FROM "UserModuleLinks" WHERE "UserID" = :UserID)
      //               WHERE uml."UserID" = :UserID AND uml."StartDate" <= CURRENT_TIMESTAMP
      //               UNION ALL
      //           (SELECT 'MCQAverage' AS "Key"
      //             , AVG(COALESCE("Score", 0)) AS "Value"
      //               FROM "UserAttempts" ua
      //               WHERE ua."UserID" = :UserID)
      //               UNION ALL
      //               select 'TestAverage' AS "Key", avg(coalesce(tsr."TotalPercentage", 0)) AS "Value"
      //               from "TestSimulationReports" tsr where tsr."UserID" = :UserID
      //               UNION ALL
      //               SELECT 'CompletedTask' AS "Key"
      //           , count(*) AS "Value"
      //               FROM "ModuleCheckers" mc
      //               WHERE mc."UserID" = :UserID AND mc."ModifiedBy" IS NOT NULL
      //               UNION ALL
      //               SELECT 'PendingTask' AS "Key"
      //           , Count(*) as "Value"
      //         FROM(
      //           SELECT
      //                      CASE
      //                             WHEN mc."SOPDraftID" IS NOT NULL THEN(
      //             (
      //               SELECT Count(*)
      //                                           FROM   "ModuleCheckers" mc1
      //                                           INNER JOIN "SopModuleDrafts" smd ON smd."SOPDraftID" = mc."SOPDraftID"
      //                                           WHERE  mc1."SOPDraftID" = mc."SOPDraftID"
      //                                           AND(
      //                 CASE
      //                                                           WHEN smd."NeedAcceptance" IS TRUE
      //                                                           THEN mc1."ModifiedBy" = :UserID
      //                                                         ELSE mc1."ModifiedBy" IS NOT NULL END
      //                                                  OR     mc1."IsDeleted" IS TRUE)) +
      //         (
      //           SELECT Count(*)
      //                                           FROM   "ModuleEscalations" mc1
      //                                           WHERE  mc1."SOPDraftID" = mc."SOPDraftID"
      //                                           AND(
      //             mc1."ModifiedBy" IS NOT NULL
      //                                                  OR     mc1."IsDeleted" IS TRUE)))
      //                             WHEN mc."DocumentModuleDraftID" IS NOT NULL THEN(
      //               (
      //                 SELECT Count(*)
      //                                           FROM   "ModuleCheckers" mc1
      //                                           INNER JOIN  "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
      //                                           WHERE  mc1."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
      //                                           AND(
      //                   CASE
      //                                                           WHEN dmd."NeedAcceptance" IS TRUE
      //                                                           THEN mc1."ModifiedBy" = :UserID
      //                                                         ELSE mc1."ModifiedBy" IS NOT NULL END
      //                                                  OR     mc1."IsDeleted" IS TRUE)) +
      //           (
      //             SELECT Count(*)
      //                                           FROM   "ModuleEscalations" mc1
      //                                           WHERE  mc1."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
      //         AND(
      //           mc1."ModifiedBy" IS NOT NULL
      //                                                  OR     mc1."IsDeleted" IS TRUE)))
      //                             WHEN mc."TrainingSimulationDraftID" IS NOT NULL THEN(
      //             (
      //               SELECT Count(*)
      //                                           FROM   "ModuleCheckers" mc1
      //                                           INNER JOIN "TrainingSimulationModuleDrafts" tsmd ON tsmd."TrainingSimulationDraftID" = mc."TrainingSimulationDraftID"
      //                                           WHERE  mc1."TrainingSimulationDraftID" = mc."TrainingSimulationDraftID"
      //                                           AND(
      //                 CASE
      //                                                           WHEN tsmd."NeedAcceptance" IS TRUE
      //                                                           THEN mc1."ModifiedBy" = :UserID
      //                                                         ELSE mc1."ModifiedBy" IS NOT NULL END
      //                                                  OR     mc1."IsDeleted" IS TRUE)) +
      //           (
      //             SELECT Count(*)
      //                                           FROM   "ModuleEscalations" mc1
      //                                           WHERE  mc1."TrainingSimulationDraftID" = mc."TrainingSimulationDraftID"
      //         AND(
      //           mc1."ModifiedBy" IS NOT NULL
      //                                                  OR     mc1."IsDeleted" IS TRUE)))
      //                             WHEN mc."TestSimulationDraftID" IS NOT NULL THEN(
      //             (
      //               SELECT Count(*)
      //                                           FROM   "ModuleCheckers" mc1
      //                                           INNER JOIN "TestSimulationModuleDrafts" tsmd ON tsmd."TestSimulationDraftID" = mc."TestSimulationDraftID"
      //                                           WHERE  mc1."TestSimulationDraftID" = mc."TestSimulationDraftID"
      //                                           AND(
      //                 CASE
      //                                                           WHEN tsmd."NeedAcceptance" IS TRUE
      //                                                           THEN mc1."ModifiedBy" = :UserID
      //                                                         ELSE mc1."ModifiedBy" IS NOT NULL END
      //                                                         OR     mc1."IsDeleted" IS TRUE)) +
      //           (
      //             SELECT Count(*)
      //                                           FROM   "ModuleEscalations" mc1
      //                                           WHERE  mc1."TestSimulationDraftID" = mc."TestSimulationDraftID"
      //         AND(
      //           mc1."ModifiedBy" IS NOT NULL
      //                                                  OR     mc1."IsDeleted" IS TRUE)))
      //                             WHEN mc."TestMCQDraftID" IS NOT NULL THEN(
      //             (
      //               SELECT Count(*)
      //                                           FROM   "ModuleCheckers" mc1
      //                                           INNER JOIN "TestMcqsModuleDrafts" tmd ON tmd."TestMCQDraftID" = mc."TestMCQDraftID"
      //                                           WHERE  mc1."TestMCQDraftID" = mc."TestMCQDraftID"
      //                                           AND(
      //                 CASE
      //                                                           WHEN tmd."NeedAcceptance" IS TRUE
      //                                                           THEN mc1."ModifiedBy" = :UserID
      //                                                         ELSE mc1."ModifiedBy" IS NOT NULL END
      //                                                       OR     mc1."IsDeleted" IS TRUE)) +
      //           (
      //             SELECT Count(*)
      //                                           FROM   "ModuleEscalations" mc1
      //                                           WHERE  mc1."TestMCQDraftID" = mc."TestMCQDraftID"
      //         AND(
      //           mc1."ModifiedBy" IS NOT NULL
      //                                                  OR     mc1."IsDeleted" IS TRUE)))
      //                             ELSE 0
      //                      end AS "NumberOfActionPersion",
      //           CASE
      //                             WHEN mc."TrainingSimulationDraftID" IS NOT NULL THEN
      //           (
      //             SELECT
      //                                                  CASE
      //                                                         WHEN "EscalationType" = 'Minutes' THEN "CreatedDate" + INTERVAL '1 minute' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Hours' THEN "CreatedDate" + INTERVAL '1 hour' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Days' THEN "CreatedDate" + INTERVAL '1 day' * "EscalationAfter"
      //                                                         when "EscalationType" = 'Weeks' THEN "CreatedDate" + INTERVAL '1 week' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Years' THEN "CreatedDate" + INTERVAL '1 year' * "EscalationAfter"
      //                                                         ELSE "CreatedDate"
      //                                                  end
      //                                           FROM   "TrainingSimulationModuleDrafts"
      //                                           WHERE  "TrainingSimulationDraftID" = mc."TrainingSimulationDraftID" limit 1)
      //                             WHEN mc."TestSimulationDraftID" IS NOT NULL THEN
      //           (
      //             SELECT
      //                                                  CASE
      //                                                         WHEN "EscalationType" = 'Minutes' THEN "CreatedDate" + INTERVAL '1 minute' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Hours' THEN "CreatedDate" + INTERVAL '1 hour' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Days' THEN "CreatedDate" + INTERVAL '1 day' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Weeks' THEN "CreatedDate" + INTERVAL '1 week' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Years' THEN "CreatedDate" + INTERVAL '1 year' * "EscalationAfter"
      //                                                         ELSE "CreatedDate"
      //                                                  end
      //                                           FROM   "TestSimulationModuleDrafts"
      //                                           WHERE  "TestSimulationDraftID" = mc."TestSimulationDraftID" limit 1)
      //                             WHEN mc."DocumentModuleDraftID" IS NOT NULL THEN
      //           (
      //             SELECT
      //                                                  CASE
      //                                                         WHEN "EscalationType" = 'Minutes' THEN "CreatedDate" + INTERVAL '1 minute' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Hours' THEN "CreatedDate" + INTERVAL '1 hour' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Days' THEN "CreatedDate" + INTERVAL '1 day' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Weeks' THEN "CreatedDate" + INTERVAL '1 week' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Years' THEN "CreatedDate" + INTERVAL '1 year' * "EscalationAfter"
      //                                                         ELSE "CreatedDate"
      //                                                  end
      //                                           FROM   "DocumentModuleDrafts"
      //                                           WHERE  "DocumentModuleDraftID" = mc."DocumentModuleDraftID" limit 1)
      //                             WHEN mc."SOPDraftID" IS NOT NULL THEN
      //           (
      //             SELECT
      //                                                  CASE
      //                                                         WHEN "EscalationType" = 'Minutes' THEN "CreatedDate" + INTERVAL '1 minute' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Hours' THEN "CreatedDate" + INTERVAL '1 hour' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Days' THEN "CreatedDate" + INTERVAL '1 day' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Weeks' THEN "CreatedDate" + INTERVAL '1 week' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Years' THEN "CreatedDate" + INTERVAL '1 year' * "EscalationAfter"
      //                                                         ELSE "CreatedDate"
      //                                                  end
      //                                           FROM   "SopModuleDrafts"
      //                                           WHERE  "SOPDraftID" = mc."SOPDraftID" limit 1)
      //                             WHEN mc."TestMCQDraftID" IS NOT NULL THEN
      //           (
      //             SELECT
      //                                                  CASE
      //                                                         WHEN "EscalationType" = 'Minutes' THEN "CreatedDate" + INTERVAL '1 minute' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Hours' THEN "CreatedDate" + INTERVAL '1 hour' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Days' THEN "CreatedDate" + INTERVAL '1 day' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Weeks' THEN "CreatedDate" + INTERVAL '1 week' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Years' THEN "CreatedDate" + INTERVAL '1 year' * "EscalationAfter"
      //                                                         ELSE "CreatedDate"
      //                                                  end
      //                                           FROM   "TestMcqsModuleDrafts"
      //                                           WHERE  "TestMCQDraftID" = mc."TestMCQDraftID" limit 1)
      //                             ELSE NULL
      //                      end AS "DueDate"
      //               FROM   "ModuleCheckers" mc
      //               WHERE  mc."UserID" = :UserID
      //               AND    mc."IsDeleted" IS NOT TRUE )
      //               WHERE  "NumberOfActionPersion" = 0
      // AND    "DueDate" >= CURRENT_TIMESTAMP`,
      //           {
      //             replacements: { UserID: currentUserId },
      //             type: sequelize.QueryTypes.SELECT,
      //           }
      //         ),
      //action
      //         sequelize.query(
      //           `SELECT "ElementID",
      //        "ElementName",
      //        "DueDate",
      //        "ModuleName",
      //        "ModuleTypeID"
      // FROM   (
      //                   SELECT
      //                              CASE
      //                                         WHEN mc."TrainingSimulationDraftID" IS NOT NULL THEN mc."TrainingSimulationDraftID"
      //                                         WHEN mc."TestSimulationDraftID" IS NOT NULL THEN mc."TestSimulationDraftID"
      //                                         WHEN mc."DocumentID" IS NOT NULL THEN mc."DocumentModuleDraftID"
      //                                         WHEN mc."SOPDraftID" IS NOT NULL THEN mc."SOPDraftID"
      //                                         WHEN mc."TestMCQDraftID" IS NOT NULL THEN mc."TestMCQDraftID"
      //                                         ELSE NULL
      //                              end AS "ElementID",
      //                              CASE
      //                                         WHEN mc."TrainingSimulationDraftID" IS NOT NULL THEN
      //                                                    (
      //                                                           SELECT "TrainingSimulationName"
      //                                                           FROM   "TrainingSimulationModuleDrafts"
      //                                                           WHERE  "TrainingSimulationDraftID" = mc."TrainingSimulationDraftID" )
      //                                         WHEN mc."TestSimulationDraftID" IS NOT NULL THEN
      //                                                    (
      //                                                           SELECT "TestSimulationName"
      //                                                           FROM   "TestSimulationModuleDrafts"
      //                                                           WHERE  "TestSimulationDraftID" = mc."TestSimulationDraftID" )
      //                                         WHEN mc."DocumentModuleDraftID" IS NOT NULL THEN
      //                                                    (
      //                                                           SELECT "DocumentName"
      //                                                           FROM   "DocumentModuleDrafts"
      //                                                           WHERE  "DocumentModuleDraftID" = mc."DocumentModuleDraftID" )
      //                                         WHEN mc."SOPDraftID" IS NOT NULL THEN
      //                                                    (
      //                                                           SELECT "SOPName"
      //                                                           FROM   "SopModuleDrafts"
      //                                                           WHERE  "SOPDraftID" = mc."SOPDraftID" )
      //                                         WHEN mc."TestMCQDraftID" IS NOT NULL THEN
      //                                                    (
      //                                                           SELECT "TestMCQName"
      //                                                           FROM   "TestMcqsModuleDrafts"
      //                                                           WHERE  "TestMCQDraftID" = mc."TestMCQDraftID" )
      //                                         ELSE NULL
      //                              end AS "ElementName",
      //                              CASE
      //                                         WHEN mc."SOPDraftID" IS NOT NULL THEN (
      //                                                    (
      //                                                           SELECT Count(*)
      //                                                           FROM   "ModuleCheckers" mc1
      //                                                           INNER JOIN "SopModuleDrafts" smd ON smd."SOPDraftID" = mc1."SOPDraftID"
      //                                                           WHERE  mc1."SOPDraftID" = mc."SOPDraftID"
      //                                                           AND    CASE
      //                                                                     WHEN smd."NeedAcceptance" IS TRUE
      //                                                                     THEN mc1."ModifiedBy" = :UserID
      //                                                                   ELSE mc1."ModifiedBy" IS NOT NULL END)+
      //                                                    (
      //                                                           SELECT Count(*)
      //                                                           FROM   "ModuleEscalations" mc1
      //                                                           WHERE  mc1."SOPDraftID" = mc."SOPDraftID"
      //                                                           AND    mc1."ModifiedBy" IS NOT NULL))
      //                                         WHEN mc."DocumentModuleDraftID" IS NOT NULL THEN (
      //                                                    (
      //                                                           SELECT Count(*)
      //                                                           FROM   "ModuleCheckers" mc1
      //                                                           INNER JOIN "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = mc1."DocumentModuleDraftID"
      //                                                           WHERE  mc1."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
      //                                                           AND    CASE
      //                                                                     WHEN dmd."NeedAcceptance" IS TRUE
      //                                                                     THEN mc1."ModifiedBy" = :UserID
      //                                                                   ELSE mc1."ModifiedBy" IS NOT NULL END)+
      //                                                    (
      //                                                           SELECT Count(*)
      //                                                           FROM   "ModuleEscalations" mc1
      //                                                           WHERE  mc1."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
      //                                                           AND    mc1."ModifiedBy" IS NOT NULL))
      //                                         WHEN mc."TrainingSimulationDraftID" IS NOT NULL THEN (
      //                                                    (
      //                                                           SELECT Count(*)
      //                                                           FROM   "ModuleCheckers" mc1
      //                                                           INNER JOIN "TrainingSimulationModuleDrafts" tmd ON tmd."TrainingSimulationDraftID" = mc1."TrainingSimulationDraftID"
      //                                                           WHERE  mc1."TrainingSimulationDraftID" = mc."TrainingSimulationDraftID"
      //                                                           AND    CASE
      //                                                                     WHEN tmd."NeedAcceptance" IS TRUE
      //                                                                     THEN mc1."ModifiedBy" = :UserID
      //                                                                   ELSE mc1."ModifiedBy" IS NOT NULL END)+
      //                                                    (
      //                                                           SELECT Count(*)
      //                                                           FROM   "ModuleEscalations" mc1
      //                                                           WHERE  mc1."TrainingSimulationDraftID" = mc."TrainingSimulationDraftID"
      //                                                           AND    mc1."ModifiedBy" IS NOT NULL))
      //                                         WHEN mc."TestSimulationDraftID" IS NOT NULL THEN (
      //                                                    (
      //                                                           SELECT Count(*)
      //                                                           FROM   "ModuleCheckers" mc1
      //                                                           INNER JOIN "TestSimulationModuleDrafts" tmd ON tmd."TestSimulationDraftID" = mc1."TestSimulationDraftID"
      //                                                           WHERE  mc1."TestSimulationDraftID" = mc."TestSimulationDraftID"
      //                                                           AND    CASE
      //                                                                     WHEN tmd."NeedAcceptance" IS TRUE
      //                                                                     THEN mc1."ModifiedBy" = :UserID
      //                                                                   ELSE mc1."ModifiedBy" IS NOT NULL END)+
      //                                                    (
      //                                                           SELECT Count(*)
      //                                                           FROM   "ModuleEscalations" mc1
      //                                                           WHERE  mc1."TestSimulationDraftID" = mc."TestSimulationDraftID"
      //                                                           AND    mc1."ModifiedBy" IS NOT NULL))
      //                                         WHEN mc."TestMCQDraftID" IS NOT NULL THEN (
      //                                                    (
      //                                                           SELECT Count(*)
      //                                                           FROM   "ModuleCheckers" mc1
      //                                                           INNER JOIN "TestMcqsModuleDrafts" tmd ON tmd."TestMCQDraftID" = mc1."TestMCQDraftID"
      //                                                           WHERE  mc1."TestMCQDraftID" = mc."TestMCQDraftID"
      //                                                           AND    CASE
      //                                                                     WHEN tmd."NeedAcceptance" IS TRUE
      //                                                                     THEN mc1."ModifiedBy" = :UserID
      //                                                                   ELSE mc1."ModifiedBy" IS NOT NULL END)+
      //                                                    (
      //                                                           SELECT Count(*)
      //                                                           FROM   "ModuleEscalations" mc1
      //                                                           WHERE  mc1."TestMCQDraftID" = mc."TestMCQDraftID"
      //                                                           AND    mc1."ModifiedBy" IS NOT NULL))
      //                                         ELSE 0
      //                              end AS "NumberOfActionPersion",
      //                              CASE
      //                                         WHEN mc."TrainingSimulationDraftID" IS NOT NULL THEN
      //                                                    (
      //                                                           SELECT
      //                                                                  CASE
      //                                                                         WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Days' THEN "CreatedDate"   + INTERVAL '1 day' * "EscalationAfter"
      //                                                                         when "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Years' THEN "CreatedDate"  + INTERVAL '1 year' * "EscalationAfter"
      //                                                                         ELSE "CreatedDate"
      //                                                                  end
      //                                                           FROM   "TrainingSimulationModuleDrafts"
      //                                                           WHERE  "TrainingSimulationDraftID" = mc."TrainingSimulationDraftID" limit 1 )
      //                                         WHEN mc."TestSimulationDraftID" IS NOT NULL THEN
      //                                                    (
      //                                                           SELECT
      //                                                                  CASE
      //                                                                         WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Days' THEN "CreatedDate"   + INTERVAL '1 day' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Years' THEN "CreatedDate"  + INTERVAL '1 year' * "EscalationAfter"
      //                                                                         ELSE "CreatedDate"
      //                                                                  end
      //                                                           FROM   "TestSimulationModuleDrafts"
      //                                                           WHERE  "TestSimulationDraftID" = mc."TestSimulationDraftID" limit 1 )
      //                                         WHEN mc."DocumentModuleDraftID" IS NOT NULL THEN
      //                                                    (
      //                                                           SELECT
      //                                                                  CASE
      //                                                                         WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Days' THEN "CreatedDate"   + INTERVAL '1 day' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Years' THEN "CreatedDate"  + INTERVAL '1 year' * "EscalationAfter"
      //                                                                         ELSE "CreatedDate"
      //                                                                  end
      //                                                           FROM   "DocumentModuleDrafts"
      //                                                           WHERE  "DocumentModuleDraftID" = mc."DocumentModuleDraftID" limit 1)
      //                                         WHEN mc."SOPDraftID" IS NOT NULL THEN
      //                                                    (
      //                                                           SELECT
      //                                                                  CASE
      //                                                                         WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Days' THEN "CreatedDate"   + INTERVAL '1 day' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Years' THEN "CreatedDate"  + INTERVAL '1 year' * "EscalationAfter"
      //                                                                         ELSE "CreatedDate"
      //                                                                  end
      //                                                           FROM   "SopModuleDrafts"
      //                                                           WHERE  "SOPDraftID" = mc."SOPDraftID" limit 1)
      //                                         WHEN mc."TestMCQDraftID" IS NOT NULL THEN
      //                                                    (
      //                                                           SELECT
      //                                                                  CASE
      //                                                                        WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
      //                                                                        WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Days' THEN "CreatedDate"   + INTERVAL '1 day' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
      //                                                                         WHEN "EscalationType" = 'Years' THEN "CreatedDate"  + INTERVAL '1 year' * "EscalationAfter"
      //                                                                         ELSE "CreatedDate"
      //                                                                  end
      //                                                           FROM   "TestMcqsModuleDrafts"
      //                                                           WHERE  "TestMCQDraftID" = mc."TestMCQDraftID" limit 1)
      //                                         ELSE NULL
      //                              end AS "DueDate",
      //                              mm."ModuleName",
      //                              mc."ModuleTypeID"
      //                   FROM       "ModuleCheckers" mc
      //                   INNER JOIN "ModuleMasters" mm
      //                   ON         mm."ModuleTypeID" = mc."ModuleTypeID"
      //                   WHERE      mc."UserID" = :UserID
      //                   AND        mc."IsDeleted" IS NOT TRUE )
      // WHERE  "NumberOfActionPersion" = 0
      // AND    "DueDate" >= CURRENT_TIMESTAMP`,
      //           {
      //             replacements: { UserID: currentUserId },
      //             type: sequelize.QueryTypes.SELECT,
      //           }
      //         ),
      //banner
      OrganizationAdvertisement.findAll({
        where: {
          OrganizationStructureID: lincense?.EnterpriseID,
          ExpireDate: {
            [Op.gte]: new Date().toISOString(),
          },
          IsDeleted: {
            [Op.not]: true,
          },
          IsActive: true,
        },
        attributes: {
          exclude: [
            "CreatedBy",
            "ModifiedBy",
            "CreatedDate",
            "ModifiedDate",
            "IsDeleted",
            "DeletedBy",
            "DeletedDate",
          ],
        },
      }),
      //flowAction
      // WorkflowActionable.findAll({
      //   where: {
      //     UserID: currentUserId,
      //     IsActive: true,
      //     ActionStatus: "ActionRequired",
      //   },
      //   attributes: [
      //     ["ActionURL", "ElementID"],
      //     ["FlowName", "ElementName"],
      //     ["EndDate", "DueDate"],
      //     [literal("'Workflow'"), "ModuleName"],
      //     ["FlowID", "ModuleTypeID"],
      //   ],
      // }),
    ]);
    // const flowActionData = JSON.parse(JSON.stringify(flowAction));

    // const performanceResp = {};
    // for (const el of performance) {
    //   performanceResp[el.Key] = el["Value"] == null ? 0 : el["Value"];
    // }
    // performanceResp["TotalTask"] =
    //   Number(performanceResp["PendingTask"]) +
    //   Number(performanceResp["CompletedTask"]);
    res.status(200).send({
      monthly: resp,
      module: coutData,
      // license: {
      //   ValidityFrom: lincense.ValidityFrom,
      //   ValidityTo: lincense.ValidityTo,
      // },
      banner,
      // performance: performanceResp,
      // actionable: [...action, ...flowActionData].sort(
      //   (a, b) => new Date(a.DueDate) - new Date(b.DueDate)
      // ),
    });
  } catch (error) {
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

exports.getActionableData = async (req, res) => {
  const { currentUserId, lincense, ModuleTypeIDs } = req.payload;
  try {
    const [action, flowAction] = await Promise.all([
      //action
      sequelize.query(
        `SELECT "ElementID",
       "ElementName",
       "DueDate",
       "ModuleName",
       "ModuleTypeID"
FROM   (
                  SELECT
                             CASE
                                        WHEN mc."TrainingSimulationDraftID" IS NOT NULL THEN mc."TrainingSimulationDraftID"
                                        WHEN mc."TestSimulationDraftID" IS NOT NULL THEN mc."TestSimulationDraftID"
                                        WHEN mc."DocumentID" IS NOT NULL THEN mc."DocumentModuleDraftID"
                                        WHEN mc."SOPDraftID" IS NOT NULL THEN mc."SOPDraftID"
                                        WHEN mc."TestMCQDraftID" IS NOT NULL THEN mc."TestMCQDraftID"
                                        ELSE NULL
                             end AS "ElementID",
                             CASE
                                        WHEN mc."TrainingSimulationDraftID" IS NOT NULL THEN
                                                   (
                                                          SELECT "TrainingSimulationName"
                                                          FROM   "TrainingSimulationModuleDrafts"
                                                          WHERE  "TrainingSimulationDraftID" = mc."TrainingSimulationDraftID" )
                                        WHEN mc."TestSimulationDraftID" IS NOT NULL THEN
                                                   (
                                                          SELECT "TestSimulationName"
                                                          FROM   "TestSimulationModuleDrafts"
                                                          WHERE  "TestSimulationDraftID" = mc."TestSimulationDraftID" )
                                        WHEN mc."DocumentModuleDraftID" IS NOT NULL THEN
                                                   (
                                                          SELECT "DocumentName"
                                                          FROM   "DocumentModuleDrafts"
                                                          WHERE  "DocumentModuleDraftID" = mc."DocumentModuleDraftID" )
                                        WHEN mc."SOPDraftID" IS NOT NULL THEN
                                                   (
                                                          SELECT "SOPName"
                                                          FROM   "SopModuleDrafts"
                                                          WHERE  "SOPDraftID" = mc."SOPDraftID" )
                                        WHEN mc."TestMCQDraftID" IS NOT NULL THEN
                                                   (
                                                          SELECT "TestMCQName"
                                                          FROM   "TestMcqsModuleDrafts"
                                                          WHERE  "TestMCQDraftID" = mc."TestMCQDraftID" )
                                        ELSE NULL
                             end AS "ElementName",
                             CASE
                                        WHEN mc."SOPDraftID" IS NOT NULL THEN (
                                                   (
                                                          SELECT Count(*)
                                                          FROM   "ModuleCheckers" mc1
                                                          INNER JOIN "SopModuleDrafts" smd ON smd."SOPDraftID" = mc1."SOPDraftID"
                                                          WHERE  mc1."SOPDraftID" = mc."SOPDraftID"
                                                          AND    CASE
                                                                    WHEN smd."NeedAcceptance" IS TRUE 
                                                                    THEN mc1."ModifiedBy" = :UserID
                                                                  ELSE mc1."ModifiedBy" IS NOT NULL END)+
                                                   (
                                                          SELECT Count(*)
                                                          FROM   "ModuleEscalations" mc1
                                                          WHERE  mc1."SOPDraftID" = mc."SOPDraftID"
                                                          AND    mc1."ModifiedBy" IS NOT NULL))
                                        WHEN mc."DocumentModuleDraftID" IS NOT NULL THEN (
                                                   (
                                                          SELECT Count(*)
                                                          FROM   "ModuleCheckers" mc1
                                                          INNER JOIN "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = mc1."DocumentModuleDraftID"
                                                          WHERE  mc1."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
                                                          AND    CASE
                                                                    WHEN dmd."NeedAcceptance" IS TRUE 
                                                                    THEN mc1."ModifiedBy" = :UserID
                                                                  ELSE mc1."ModifiedBy" IS NOT NULL END)+
                                                   (
                                                          SELECT Count(*)
                                                          FROM   "ModuleEscalations" mc1
                                                          WHERE  mc1."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
                                                          AND    mc1."ModifiedBy" IS NOT NULL))
                                        WHEN mc."TrainingSimulationDraftID" IS NOT NULL THEN (
                                                   (
                                                          SELECT Count(*)
                                                          FROM   "ModuleCheckers" mc1
                                                          INNER JOIN "TrainingSimulationModuleDrafts" tmd ON tmd."TrainingSimulationDraftID" = mc1."TrainingSimulationDraftID"
                                                          WHERE  mc1."TrainingSimulationDraftID" = mc."TrainingSimulationDraftID"
                                                          AND    CASE
                                                                    WHEN tmd."NeedAcceptance" IS TRUE 
                                                                    THEN mc1."ModifiedBy" = :UserID
                                                                  ELSE mc1."ModifiedBy" IS NOT NULL END)+
                                                   (
                                                          SELECT Count(*)
                                                          FROM   "ModuleEscalations" mc1
                                                          WHERE  mc1."TrainingSimulationDraftID" = mc."TrainingSimulationDraftID"
                                                          AND    mc1."ModifiedBy" IS NOT NULL))
                                        WHEN mc."TestSimulationDraftID" IS NOT NULL THEN (
                                                   (
                                                          SELECT Count(*)
                                                          FROM   "ModuleCheckers" mc1
                                                          INNER JOIN "TestSimulationModuleDrafts" tmd ON tmd."TestSimulationDraftID" = mc1."TestSimulationDraftID"
                                                          WHERE  mc1."TestSimulationDraftID" = mc."TestSimulationDraftID"
                                                          AND    CASE
                                                                    WHEN tmd."NeedAcceptance" IS TRUE 
                                                                    THEN mc1."ModifiedBy" = :UserID
                                                                  ELSE mc1."ModifiedBy" IS NOT NULL END)+
                                                   (
                                                          SELECT Count(*)
                                                          FROM   "ModuleEscalations" mc1
                                                          WHERE  mc1."TestSimulationDraftID" = mc."TestSimulationDraftID"
                                                          AND    mc1."ModifiedBy" IS NOT NULL))
                                        WHEN mc."TestMCQDraftID" IS NOT NULL THEN (
                                                   (
                                                          SELECT Count(*)
                                                          FROM   "ModuleCheckers" mc1
                                                          INNER JOIN "TestMcqsModuleDrafts" tmd ON tmd."TestMCQDraftID" = mc1."TestMCQDraftID"
                                                          WHERE  mc1."TestMCQDraftID" = mc."TestMCQDraftID"
                                                          AND    CASE
                                                                    WHEN tmd."NeedAcceptance" IS TRUE 
                                                                    THEN mc1."ModifiedBy" = :UserID
                                                                  ELSE mc1."ModifiedBy" IS NOT NULL END)+
                                                   (
                                                          SELECT Count(*)
                                                          FROM   "ModuleEscalations" mc1
                                                          WHERE  mc1."TestMCQDraftID" = mc."TestMCQDraftID"
                                                          AND    mc1."ModifiedBy" IS NOT NULL))
                                        ELSE 0
                             end AS "NumberOfActionPersion",
                             CASE
                                        WHEN mc."TrainingSimulationDraftID" IS NOT NULL THEN
                                                   (
                                                          SELECT
                                                                 CASE
                                                                        WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Days' THEN "CreatedDate"   + INTERVAL '1 day' * "EscalationAfter"
                                                                        when "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Years' THEN "CreatedDate"  + INTERVAL '1 year' * "EscalationAfter"
                                                                        ELSE "CreatedDate"
                                                                 end
                                                          FROM   "TrainingSimulationModuleDrafts"
                                                          WHERE  "TrainingSimulationDraftID" = mc."TrainingSimulationDraftID" limit 1 )
                                        WHEN mc."TestSimulationDraftID" IS NOT NULL THEN
                                                   (
                                                          SELECT
                                                                 CASE
                                                                        WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Days' THEN "CreatedDate"   + INTERVAL '1 day' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Years' THEN "CreatedDate"  + INTERVAL '1 year' * "EscalationAfter"
                                                                        ELSE "CreatedDate"
                                                                 end
                                                          FROM   "TestSimulationModuleDrafts"
                                                          WHERE  "TestSimulationDraftID" = mc."TestSimulationDraftID" limit 1 )
                                        WHEN mc."DocumentModuleDraftID" IS NOT NULL THEN
                                                   (
                                                          SELECT
                                                                 CASE
                                                                        WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Days' THEN "CreatedDate"   + INTERVAL '1 day' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Years' THEN "CreatedDate"  + INTERVAL '1 year' * "EscalationAfter"
                                                                        ELSE "CreatedDate"
                                                                 end
                                                          FROM   "DocumentModuleDrafts"
                                                          WHERE  "DocumentModuleDraftID" = mc."DocumentModuleDraftID" limit 1)
                                        WHEN mc."SOPDraftID" IS NOT NULL THEN
                                                   (
                                                          SELECT 
                                                                 CASE
                                                                        WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Days' THEN "CreatedDate"   + INTERVAL '1 day' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Years' THEN "CreatedDate"  + INTERVAL '1 year' * "EscalationAfter"
                                                                        ELSE "CreatedDate"
                                                                 end
                                                          FROM   "SopModuleDrafts"
                                                          WHERE  "SOPDraftID" = mc."SOPDraftID" limit 1)
                                        WHEN mc."TestMCQDraftID" IS NOT NULL THEN
                                                   (
                                                          SELECT 
                                                                 CASE
                                                                       WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
                                                                       WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Days' THEN "CreatedDate"   + INTERVAL '1 day' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
                                                                        WHEN "EscalationType" = 'Years' THEN "CreatedDate"  + INTERVAL '1 year' * "EscalationAfter"
                                                                        ELSE "CreatedDate"
                                                                 end
                                                          FROM   "TestMcqsModuleDrafts"
                                                          WHERE  "TestMCQDraftID" = mc."TestMCQDraftID" limit 1)
                                        ELSE NULL
                             end AS "DueDate",
                             mm."ModuleName",
                             mc."ModuleTypeID"
                  FROM       "ModuleCheckers" mc
                  INNER JOIN "ModuleMasters" mm
                  ON         mm."ModuleTypeID" = mc."ModuleTypeID"
                  WHERE      mc."UserID" = :UserID
                  AND        mc."IsDeleted" IS NOT TRUE )
WHERE  "NumberOfActionPersion" = 0
AND    "DueDate" >= CURRENT_TIMESTAMP`,
        {
          replacements: { UserID: currentUserId },
          type: sequelize.QueryTypes.SELECT,
        }
      ),

      //flowAction
      WorkflowActionable.findAll({
        where: {
          UserID: currentUserId,
          IsActive: true,
          ActionStatus: "ActionRequired",
        },
        attributes: [
          ["ActionURL", "ElementID"],
          ["FlowName", "ElementName"],
          ["EndDate", "DueDate"],
          [literal("'Workflow'"), "ModuleName"],
          ["FlowID", "ModuleTypeID"],
        ],
      }),
    ]);
    const flowActionData = JSON.parse(JSON.stringify(flowAction));

    res.status(200).send({
      actionable: [...action, ...flowActionData].sort(
        (a, b) => new Date(a.DueDate) - new Date(b.DueDate)
      ),
    });
  } catch (error) {
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

exports.leaderBoard = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { TestMCQIDs, TestSimulationIDs, Limit = 10, Page = 1 } = req.body;
    if (TestMCQIDs.length && TestSimulationIDs.length) {
      res.status(200).send({
        message:
          "Single ModuleIDs will Allow either TestMCQIDs or TestSimulationIDs",
      });
      return;
    } else if (!TestMCQIDs.length && !TestSimulationIDs.length) {
      res.status(200).send({
        message: "ModuleIDs is Required for TestMCQIDs or TestSimulationIDs",
      });
      return;
    }
    if (TestMCQIDs.length) {
      const leader = await sequelize.query(
        `
      select u."UserID",concat(ud."UserFirstName",' ',ud."UserMiddleName",' ',ud."UserLastName") as "UserName",
      AVG(ua."Score") as "Score", Count(*) as "Attempt", Max(tmm."TotalAttempts") as "TotalAttempts" from "Users" u 
      inner join "UserDetails" ud on ud."UserID" = u."UserID" 
      inner join "UserAttempts" ua on ua."UserID" = u."UserID" 
      inner join "TestMcqsModules" tmm on tmm."TestMCQID" = ua."ModuleID" 
      where u."UserType" = 'EndUser' and ua."ModuleID" IN ('${TestMCQIDs.join(
        "','"
      )}') and ua."Score" is not null
      group by u."UserID",ud."UserFirstName",ud."UserMiddleName",ud."UserLastName" 
      order by AVG(ua."Score") desc
      LIMIT ${Limit} OFFSET ${Limit * (Page - 1)}`,
        {
          replacements: {},
          type: sequelize.QueryTypes.SELECT,
        }
      );
      res.status(200).send({ mcq: leader, count: leader?.length });
    } else if (TestSimulationIDs.length) {
      const leader = await sequelize.query(
        `
      select u."UserID",concat(ud."UserFirstName",' ',ud."UserMiddleName",' ',ud."UserLastName") as "UserName",
      AVG(ua."TotalPercentage") as "Score", Count(*) as "Attempt", Max(tmm."TotalAttempts") as "TotalAttempts" from "Users" u 
      inner join "UserDetails" ud on ud."UserID" = u."UserID" 
      inner join "TestSimulationReports" ua on ua."UserID" = u."UserID" 
      inner join "TestSimulationModules" tmm on tmm."TestSimulationID" = ua."TestSimulationID" 
      WHERE u."UserType" = 'EndUser' AND ua."TestSimulationID" IN ('${TestSimulationIDs.join(
        "','"
      )}') and ua."TotalPercentage" is not null
      GROUP BY u."UserID",ud."UserFirstName",ud."UserMiddleName",ud."UserLastName" 
      order by AVG(ua."TotalPercentage") desc
      LIMIT ${Limit} OFFSET ${Limit * (Page - 1)}`,
        {
          replacements: {},
          type: sequelize.QueryTypes.SELECT,
        }
      );
      res.status(200).send({ tes: leader, count: leader?.length });
    }
  } catch (error) {
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

exports.getDashboardLeaderboardDDData = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { UserID = null } = req.body;
    const data = await sequelize.query(
      `
      select 'tes' as name,jsonb_agg(jsonb_build_object('TestSimulationID',"TestSimulationID",
      'TestSimulationName',"TestSimulationName")) as "values" from "TestSimulationModules"  
      where "TestSimulationID" in (select "ModuleID" from "UserModuleLinks" where "UserID"=:UserID)
      union all
      select 'mcq' as name,jsonb_agg(jsonb_build_object('TestMCQID',"TestMCQID",
      'TestMCQName',"TestMCQName")) as "values" from "TestMcqsModules"  
      where "TestMCQID" in (select "ModuleID" from "UserModuleLinks" where "UserID"=:UserID)`,
      {
        replacements: { UserID: UserID ? UserID : currentUserId },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const payload = {};
    for (const el of data) {
      payload[el.name] = el;
    }
    res.status(200).send({
      data: payload,
    });
  } catch (error) {
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

exports.getModuleWiseMakerCheckerData = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const {
      SOPID,
      DocumentID,
      TestMCQID,
      TrainingSimulationID,
      TestSimulationID,
    } = req.body;
    let where = "";
    let modulDraftIdName = "",
      moduleDraftName = "",
      modelName = "";
    if (SOPID) {
      where = `WHERE smd."SOPDraftID" = '${SOPID}'`;
      modulDraftIdName = `"SOPDraftID"`;
      moduleDraftName = `"SOPName"`;
      modelName = `"SopModuleDrafts"`;
    } else if (DocumentID) {
      where = `WHERE smd."DocumentModuleDraftID" = '${DocumentID}'`;
      modulDraftIdName = `"DocumentModuleDraftID"`;
      moduleDraftName = `"DocumentName"`;
      modelName = `"DocumentModuleDrafts"`;
    } else if (TestMCQID) {
      where = `WHERE smd."TestMCQDraftID" = '${TestMCQID}'`;
      modulDraftIdName = `"TestMCQDraftID"`;
      moduleDraftName = `"TestMCQName"`;
      modelName = `"TestMcqsModuleDrafts"`;
    } else if (TrainingSimulationID) {
      where = `WHERE smd."TrainingSimulationDraftID" = '${TrainingSimulationID}'`;
      modulDraftIdName = `"TrainingSimulationDraftID"`;
      moduleDraftName = `"TrainingSimulationName"`;
      modelName = `"TrainingSimulationModuleDrafts"`;
    } else if (TestSimulationID) {
      where = `WHERE smd."TestSimulationDraftID" = '${TestSimulationID}'`;
      modulDraftIdName = `"TestSimulationDraftID"`;
      moduleDraftName = `"TestSimulationName"`;
      modelName = `"TestSimulationModuleDrafts"`;
    } else {
      res.status(404).send({ message: "ModuleID is required" });
      return;
    }

    const resp = await sequelize.query(
      `
       SELECT
    "CreatedDate",
    ${moduleDraftName},
    "SelfApproved",
    "DraftVersion",
    "MasterVersion",
    "CreatedUserName",
    "CreatedUserPhoto",
    jsonb_agg(DISTINCT CASE
        WHEN LENGTH("CheckerUserName") > 1 THEN jsonb_build_object('UserName', "CheckerUserName", 'UserPhoto', "CheckerUserPhoto")
    END) AS "Checkers",
    jsonb_agg(DISTINCT CASE
        WHEN LENGTH("StakeHolderUserName") > 1 THEN jsonb_build_object('UserName', "StakeHolderUserName", 'UserPhoto', "StakeHolderUserPhoto")
    END) AS "StakeHolders",
    jsonb_agg(DISTINCT CASE
        WHEN LENGTH("EscalationUserName") > 1 THEN jsonb_build_object('UserName', "EscalationUserName", 'UserPhoto', "EscalationUserPhoto")
    END) AS "Escalators",
    jsonb_agg(DISTINCT CASE
        WHEN "CheckerModifiedDate" IS NOT NULL THEN jsonb_build_object(
            'ActionType', CASE
                WHEN "IsCheckerReviewSkipped"::text = 'true' THEN 'Skipped'
                WHEN "CheckerComment" IS NOT NULL THEN 'Reviewed'
                WHEN "CheckerApprovalStatus"::text IS NOT NULL THEN "CheckerApprovalStatus"::text
            END,
            'ActionValue', "CheckerComment",
            'UserName', "CheckerUserName",
            'UserPhoto', "CheckerUserPhoto",
            'CreatedDate', "CheckerModifiedDate"
        )
    END) AS "CheckerActions",
    jsonb_agg(DISTINCT CASE
        WHEN "StakeHolderModifiedDate" IS NOT NULL THEN jsonb_build_object(
            'ActionType', CASE
                WHEN "IsStakeHolderReviewSkipped"::text = 'true' THEN 'Skipped'
                WHEN "StakeHolderComment" IS NOT NULL THEN 'Reviewed'
                WHEN "StakeHolderApprovalStatus"::text IS NOT NULL THEN "StakeHolderApprovalStatus"::text
            END,
            'ActionValue', "StakeHolderComment",
            'UserName', "StakeHolderUserName",
            'UserPhoto', "StakeHolderUserPhoto",
            'CreatedDate', "StakeHolderModifiedDate"
        )
    END) AS "StakeHolderActions",
    jsonb_agg(DISTINCT CASE
        WHEN "EscalationModifiedDate" IS NOT NULL THEN jsonb_build_object(
            'ActionType', CASE
                WHEN "EscalationComment" IS NOT NULL THEN 'Reviewed'
                WHEN "EscalationApprovalStatus"::text IS NOT NULL THEN "EscalationApprovalStatus"::text
            END,
            'ActionValue', "EscalationComment",
            'UserName', "EscalationUserName",
            'UserPhoto', "EscalationUserPhoto",
            'CreatedDate', "EscalationModifiedDate"
        )
    END) AS "EscalationActions"
FROM (
    SELECT
        ${modulDraftIdName},
        "CreatedDate",
        ${moduleDraftName},
        "SelfApproved",
        "DraftVersion",
        "MasterVersion",
        "CreatedUserName",
        "CreatedUserPhoto",
        "CheckerUserName",
        "CheckerUserPhoto",
        "StakeHolderUserName",
        "StakeHolderUserPhoto",
        "EscalationUserName",
        "EscalationUserPhoto",
        "CheckerComment",
        "StakeHolderComment",
        "CheckerApprovalStatus",
        "IsCheckerReviewSkipped",
        "EscalationComment",
        "EscalationApprovalStatus",
        "CheckerCreatedDate",
        "StakeHolderModifiedDate",
        "StakeHolderApprovalStatus",
        "IsStakeHolderReviewSkipped",
        "StakeHolderCreatedDate",
        "CheckerModifiedDate",
        "EscalationCreatedDate",
        "EscalationModifiedDate"
    FROM (
        SELECT
            smd.${modulDraftIdName},
            smd."CreatedDate",
            smd.${moduleDraftName},
            smd."SelfApproved",
            smd."DraftVersion",
            smd."MasterVersion",
            CONCAT(ud."UserFirstName", ' ', ud."UserLastName") AS "CreatedUserName",
            ud."UserPhoto" AS "CreatedUserPhoto",
            CONCAT(ud1."UserFirstName", ' ', ud1."UserLastName") AS "CheckerUserName",
            ud1."UserPhoto" AS "CheckerUserPhoto",
            CONCAT(ud3."UserFirstName", ' ', ud3."UserLastName") AS "StakeHolderUserName",
            ud3."UserPhoto" AS "StakeHolderUserPhoto",
            CONCAT(ud2."UserFirstName", ' ', ud2."UserLastName") AS "EscalationUserName",
            ud2."UserPhoto" AS "EscalationUserPhoto",
            mc."Comment" AS "CheckerComment",
            msh."Comment" AS "StakeHolderComment",
            mc."ApprovalStatus" AS "CheckerApprovalStatus",
            msh."ApprovalStatus" AS "StakeHolderApprovalStatus",
            mc."IsReviewSkipped" AS "IsCheckerReviewSkipped",
            msh."IsReviewSkipped" AS "IsStakeHolderReviewSkipped",
            me."Comment" AS "EscalationComment",
            me."ApprovalStatus" AS "EscalationApprovalStatus",
            mc."CreatedDate" AS "CheckerCreatedDate",
            msh."CreatedDate" AS "StakeHolderCreatedDate",
            mc."ModifiedDate" AS "CheckerModifiedDate",
            msh."ModifiedDate" AS "StakeHolderModifiedDate",
            me."CreatedDate" AS "EscalationCreatedDate",
            me."ModifiedDate" AS "EscalationModifiedDate"
        FROM ${modelName} smd
        LEFT JOIN "ModuleCheckers" mc ON mc.${modulDraftIdName} = smd.${modulDraftIdName}
        LEFT JOIN "ModuleStakeHolders" msh ON msh.${modulDraftIdName} = smd.${modulDraftIdName}
        LEFT JOIN "ModuleEscalations" me ON me.${modulDraftIdName} = smd.${modulDraftIdName}
        LEFT JOIN "UserDetails" ud ON ud."UserID" = smd."CreatedBy"
        LEFT JOIN "UserDetails" ud1 ON ud1."UserID" = mc."UserID"
        LEFT JOIN "UserDetails" ud3 ON ud3."UserID" = msh."UserID"
        LEFT JOIN "UserDetails" ud2 ON ud2."UserID" = me."UserID"
        ${where}
    ) AS sub_query
    GROUP BY
        ${modulDraftIdName},
        "CreatedDate",
        ${moduleDraftName},
        "SelfApproved",
        "DraftVersion",
        "MasterVersion",
        "CreatedUserName",
        "CreatedUserPhoto",
        "CheckerUserName",
        "CheckerUserPhoto",
        "StakeHolderUserName",
        "StakeHolderUserPhoto",
        "EscalationUserName",
        "EscalationUserPhoto",
        "CheckerComment",
        "StakeHolderComment",
        "StakeHolderApprovalStatus",
        "IsStakeHolderReviewSkipped",
        "StakeHolderModifiedDate",
        "CheckerApprovalStatus",
        "IsCheckerReviewSkipped",
        "EscalationComment",
        "EscalationApprovalStatus",
        "CheckerCreatedDate",
        "CheckerModifiedDate",
        "StakeHolderCreatedDate",
        "EscalationCreatedDate",
        "EscalationModifiedDate"
    ORDER BY
        "CreatedDate" DESC,
        "CheckerCreatedDate" DESC,
        "CheckerModifiedDate" DESC,
        "StakeHolderCreatedDate" DESC,
        "StakeHolderModifiedDate" DESC,
        "EscalationCreatedDate" DESC,
        "EscalationModifiedDate" DESC
) AS final_query
GROUP BY
    "CreatedDate",
    ${moduleDraftName},
    "SelfApproved",
    "DraftVersion",
    "MasterVersion",
    "CreatedUserName",
    "CreatedUserPhoto";
      `,
      { type: QueryTypes.SELECT }
    );
    res.status(200).send({ data: resp });
  } catch (error) {
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
exports.addUserCheckerComment = async (req, res, next) => {
  const { currentUserId } = req.payload;
  try {
    const {
      SOPID = null,
      DocumentID = null,
      TestMCQID = null,
      TrainingSimulationID = null,
      TestSimulationID = null,
      Comment,
      ApprovalStatus,
      IsReviewSkipped,
    } = req.body;
    let documentDraft = {};
    let NeedAcceptance = false;
    let NeedAcceptanceFromStakeHolder = false;
    let ownerIds = [];

    if (!["Rejected", "Approved"].includes(ApprovalStatus)) {
      res
        .status(423)
        .send({ message: "ApprovalStatus should be Rejected or Approved" });
      return;
    }
    if (ApprovalStatus == "Rejected") {
      checkIsWhetherSendEmailNotification(
        SOPID ||
          DocumentID ||
          TestMCQID ||
          TrainingSimulationID ||
          TestSimulationID,
        ApprovalStatus,
        currentUserId,
        "Any"
      );
    }
    const checkIsAbleToPublish = await sequelize.query(
      `WITH DraftDetails AS (
          SELECT 
              smd."SOPID" AS "ModuleID",
              smd."SOPDraftID" AS "ModuleDraftID",
              smd."NeedAcceptance",
              cs."ContentID",
              cs."ModuleTypeID" 
          FROM "SopModuleDrafts" smd 
          JOIN "ContentStructures" cs ON cs."ContentID" = smd."ContentID"
          
          UNION ALL 
          
          SELECT 
              dmd."DocumentID" AS "ModuleID",
              dmd."DocumentModuleDraftID" AS "ModuleDraftID",
              COALESCE(dmd."NeedAcceptance", dmd."NeedAcceptanceFromStakeHolder") AS "NeedAcceptance",
              cs."ContentID",
              cs."ModuleTypeID" 
          FROM "DocumentModuleDrafts" dmd 
          JOIN "ContentStructures" cs ON cs."ContentID" = dmd."ContentID"
      ),

      RoleActions AS (
          SELECT 
              COALESCE("SOPDraftID", "DocumentModuleDraftID") AS "ModuleDraftID",
              'Checker' AS role,
              COUNT(*) AS total_count,
              COUNT("ApprovalStatus") FILTER (WHERE "ApprovalStatus" IS NOT NULL) AS action_count
          FROM "ModuleCheckers"
          GROUP BY 1

          UNION ALL
          
          SELECT 
              COALESCE("SOPDraftID", "DocumentModuleDraftID"),
              'StakeHolder' AS role,
              COUNT(*),
              COUNT("ApprovalStatus") FILTER (WHERE "ApprovalStatus" IS NOT NULL)
          FROM "ModuleStakeHolders"
          GROUP BY 1

          UNION ALL
          
          SELECT 
              COALESCE("SOPDraftID", "DocumentModuleDraftID"),
              'Escalator' AS role,
              NULL,  
              COUNT("ApprovalStatus") FILTER (WHERE "ApprovalStatus" IS NOT NULL)
          FROM "ModuleEscalations"
          GROUP BY 1
      ),

      Approvers AS (
          SELECT DISTINCT 
              COALESCE("SOPDraftID", "DocumentModuleDraftID") AS "ModuleDraftID",
              "UserID"
          FROM "ModuleApprovers"
      )

      SELECT 
          dd."ModuleDraftID",
          dd."ModuleID",
          dd."ContentID",
          dd."ModuleTypeID",
          a."UserID",
          CASE WHEN dd."NeedAcceptance" = true THEN
              BOOL_OR(ra.action_count = ra.total_count) 
              ELSE MAX(ra.action_count) > 0
          END AS "CanApprove"
      FROM DraftDetails dd
      LEFT JOIN RoleActions ra ON ra."ModuleDraftID" = dd."ModuleDraftID"
      LEFT JOIN Approvers a ON a."ModuleDraftID" = dd."ModuleDraftID"
      WHERE dd."ModuleDraftID" IN (:SOPID, :DocumentID) AND a."UserID" = :UserID
      GROUP BY dd."ModuleDraftID", dd."ContentID", dd."ModuleTypeID", a."UserID",dd."NeedAcceptance",dd."ModuleID";`,
      {
        replacements: {
          SOPID,
          DocumentID,
          UserID: currentUserId,
        },
        type: QueryTypes.SELECT,
      }
    );
    let approved = false;
    if (checkIsAbleToPublish?.some((x) => x.CanApprove)) {
      if (!checkIsAbleToPublish?.some((z) => z.UserID == currentUserId)) {
        return res.status(403).send({
          message: "You are not authorized to approve this module",
        });
      }
      const [resVal] = await ModuleApprover.update(
        {
          Comment,
          ApprovalStatus,
          IsReviewSkipped,
          IsActive: false,
          ModifiedDate: new Date().toISOString(),
          ModifiedBy: currentUserId,
        },
        {
          where: {
            SOPDraftID: SOPID,
            DocumentModuleDraftID: DocumentID,
            TestMCQDraftID: TestMCQID,
            TrainingSimulationDraftID: TrainingSimulationID,
            TestSimulationDraftID: TestSimulationID,
            ModifiedDate: null,
            UserID: currentUserId,
          },
        }
      );
      if (!resVal) {
        res.status(403).send({ message: "You are already update your review" });
        return;
      }
      if (ApprovalStatus == "Approved") {
        const publishFunction = DocumentID
          ? adminController.publishDocumentModule
          : SOPID
          ? adminController.publishSOPModule
          : null;

        if (publishFunction) {
          const userData = checkIsAbleToPublish.find(
            (xx) => xx.UserID == currentUserId
          );
          req.body = {
            ...req.body,
            ModuleTypeID: userData?.ModuleTypeID,
            ContentID: userData?.ContentID,
            DocumentID: userData?.ModuleID,
            SOPID: userData?.ModuleID,
            AuthorizedToPublish: "true",
          };
          await publishFunction(req, res, next);
        }
      }
      if (ApprovalStatus === "Approved") {
        checkIsWhetherSendEmailNotification(
          SOPID ||
            DocumentID ||
            TestMCQID ||
            TrainingSimulationID ||
            TestSimulationID,
          ApprovalStatus,
          currentUserId,
          "Approver"
        );
      }
      res.status(200).send({ message: "User Comment Added Successfully" });
      return;
    }

    let where = "";
    let count = 0;
    if (SOPID) {
      where = `WHERE mc."UserID" = '${currentUserId}' and mc."SOPDraftID" = '${SOPID}'`;
      count++;
    }
    if (DocumentID) {
      where = `WHERE mc."UserID" = '${currentUserId}' and mc."DocumentModuleDraftID" = '${DocumentID}'`;
      count++;
    }
    if (TestMCQID) {
      where = `WHERE mc."UserID" = '${currentUserId}' and mc."TestMCQDraftID" = '${TestMCQID}'`;
      count++;
    }
    if (TrainingSimulationID) {
      where = `WHERE mc."UserID" = '${currentUserId}' and mc."TrainingSimulationDraftID" = '${TrainingSimulationID}'`;
      count++;
    }
    if (TestSimulationID) {
      where = `WHERE mc."UserID" = '${currentUserId}' and mc."TestSimulationDraftID" = '${TestSimulationID}'`;
      count++;
    }
    if (count == 0) {
      res.status(404).send({ message: "ModuleID is required" });
      return;
    }
    if (count > 1) {
      res.status(404).send({ message: "Only one ModuleID can be provided" });
      return;
    }
    if (DocumentID) {
      console.log(DocumentID, "DocumentID)");
      documentDraft = await DocumentModuleDraft.findOne({
        where: { DocumentModuleDraftID: DocumentID },
        order: [["DraftVersion", "DESC"]],
        attributes: ["NeedAcceptance", "NeedAcceptanceFromStakeHolder"],
      });

      if (!documentDraft) {
        return res.status(404).send({ message: "Document not found" });
      }

      ({ NeedAcceptance, NeedAcceptanceFromStakeHolder } = documentDraft);
    }
    const dueDateCondition = `case
    WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
    WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
    when "EscalationType" = 'Days' THEN "CreatedDate" + interval '1 day' * "EscalationAfter"
    when "EscalationType" = 'Weeks' then "CreatedDate" + interval '1 week' * "EscalationAfter"
    when "EscalationType" = 'Months' THEN "CreatedDate" + interval '1 month' * "EscalationAfter"
    when "EscalationType" = 'Years' THEN "CreatedDate" + interval '1 year' * "EscalationAfter"
    else "CreatedDate"
  end`;
    const moduleCheckerDueDate = `case
                                    when mc."TrainingSimulationDraftID" is not null then (
                                    select MAX(${dueDateCondition}) from
                                      "TrainingSimulationModuleDrafts"
                                    where
                                      "TrainingSimulationDraftID" = mc."TrainingSimulationDraftID" )
                                    when mc."TestSimulationDraftID" is not null then (
                                    select MAX(${dueDateCondition}) from
                                      "TestSimulationModuleDrafts"
                                    where
                                      "TestSimulationDraftID" = mc."TestSimulationDraftID" )
                                    when mc."DocumentModuleDraftID" is not null then (
                                    select MAX(${dueDateCondition}) from
                                      "DocumentModules"
                                    where
                                      "DocumentModuleDraftID" = mc."DocumentModuleDraftID")
                                    when mc."SOPDraftID" is not null then (
                                    select MAX(${dueDateCondition}) from
                                      "SopModuleDrafts"
                                    where
                                      "SOPDraftID" = mc."SOPDraftID")
                                    when mc."TestMCQDraftID" is not null then (
                                    select MAX(${dueDateCondition}) from
                                      "TestMcqsModuleDrafts" 
                                    where
                                      "TestMCQDraftID" = mc."TestMCQDraftID")
                                    else null
                                  end`;
    const moduleStakeHolderDueDate = `case
                                  when mc."DocumentModuleDraftID" is not null then (
                                  select MAX(${dueDateCondition}) from
                                    "DocumentModules"
                                  where
                                    "DocumentModuleDraftID" = mc."DocumentModuleDraftID")
                                  else null
                                end`;
    const data1 = await sequelize.query(
      `
      select mc."CreatedBy", ${moduleStakeHolderDueDate} as "DueDate" from "ModuleStakeHolders" mc ${where}
      order by mc."CreatedDate" desc limit 1
      `,
      {
        type: QueryTypes.SELECT,
      }
    );

    const data = await sequelize.query(
      `
      select mc."CreatedBy", ${moduleCheckerDueDate} as "DueDate" from "ModuleCheckers" mc ${where}
      order by mc."CreatedDate" desc limit 1
      `,
      {
        type: QueryTypes.SELECT,
      }
    );

    const notififactionBulk = []; // Array to collect all notifications
    let userNotificationMessage = "";
    let creatorUserID = null;
    let creatorUserID1 = null;

    if (data.length > 0) {
      const dueDate = data[0]?.DueDate;
      creatorUserID = data[0]?.CreatedBy;

      if (new Date() < new Date(dueDate)) {
        const [resVal] = await ModuleChecker.update(
          {
            Comment,
            ApprovalStatus,
            IsReviewSkipped,
            IsActive: false,
            ModifiedDate: new Date().toISOString(),
            ModifiedBy: currentUserId,
          },
          {
            where: {
              SOPDraftID: SOPID,
              DocumentModuleDraftID: DocumentID,
              TestMCQDraftID: TestMCQID,
              TrainingSimulationDraftID: TrainingSimulationID,
              TestSimulationDraftID: TestSimulationID,
              ModifiedDate: null,
              UserID: currentUserId,
            },
          }
        );
        if (!resVal) {
          res
            .status(403)
            .send({ message: "You are already update your review" });
          return;
        }
        // Add notification here for approval/rejection
        if (ApprovalStatus === "Approved") {
          userNotificationMessage = "Your review has been approved.";
        } else if (ApprovalStatus === "Rejected") {
          userNotificationMessage = "Your review has been rejected.";
        }

        // Add to notification array
        notififactionBulk.push({
          UserID: creatorUserID, // Assuming the current user gets notified
          Message: userNotificationMessage,
          NotificationType: "actionable",
          LinkedType: "Document",
          LinkedID: DocumentID,
          CreatedBy: currentUserId,
        });
      } else {
        const [resVal] = await ModuleEscalation.update(
          {
            Comment,
            ApprovalStatus,
            IsActive: false,
            ModifiedDate: new Date().toISOString(),
            ModifiedBy: currentUserId,
          },
          {
            where: {
              SOPDraftID: SOPID,
              DocumentModuleDraftID: DocumentID,
              TestMCQDraftID: TestMCQID,
              TrainingSimulationDraftID: TrainingSimulationID,
              TestSimulationDraftID: TestSimulationID,
              ModifiedDate: null,
              UserID: currentUserId,
            },
          }
        );
        if (!resVal) {
          res.status(403).send({
            message:
              "You are already update your review/You are not an Escalation Persion",
          });
          return;
        }
        // Notification for escalation
        if (creatorUserID) {
          notififactionBulk.push({
            UserID: creatorUserID, // Notify the creator of the checker task
            Message: "The review you assigned has been escalated.",
            NotificationType: "actionable",
            LinkedType: "Document",
            LinkedID: DocumentID,
            CreatedBy: currentUserId,
          });
        }
      }
    } else if (data1.length > 0) {
      const dueDate = data1[0]?.DueDate;
      creatorUserID1 = data1[0]?.CreatedBy;
      if (new Date() < new Date(dueDate)) {
        const [resVal] = await ModuleStakeHolder.update(
          {
            Comment,
            ApprovalStatus,
            IsReviewSkipped,
            IsActive: false,
            ModifiedDate: new Date().toISOString(),
            ModifiedBy: currentUserId,
          },
          {
            where: {
              DocumentModuleDraftID: DocumentID,
              ModifiedDate: null,
              UserID: currentUserId,
            },
          }
        );
        if (!resVal) {
          res
            .status(403)
            .send({ message: "You are already update your review" });
          return;
        }
        // Add notification here for approval/rejection
        if (ApprovalStatus === "Approved") {
          userNotificationMessage = "Your review has been approved.";
        } else if (ApprovalStatus === "Rejected") {
          userNotificationMessage = "Your review has been rejected.";
        }

        // Add to notification array
        notififactionBulk.push({
          UserID: creatorUserID1, // Assuming the current user gets notified
          Message: userNotificationMessage,
          NotificationType: "actionable",
          LinkedType: "Document",
          LinkedID: DocumentID,
          CreatedBy: currentUserId,
        });
      } else {
        const [resVal] = await ModuleEscalation.update(
          {
            Comment,
            ApprovalStatus,
            IsActive: false,
            ModifiedDate: new Date().toISOString(),
            ModifiedBy: currentUserId,
          },
          {
            where: {
              SOPDraftID: SOPID,
              DocumentModuleDraftID: DocumentID,
              TestMCQDraftID: TestMCQID,
              TrainingSimulationDraftID: TrainingSimulationID,
              TestSimulationDraftID: TestSimulationID,
              ModifiedDate: null,
              UserID: currentUserId,
            },
          }
        );
        if (!resVal) {
          res.status(403).send({
            message:
              "You are already update your review/You are not an Escalation Persion",
          });
          return;
        }
        // Notification for escalation
        if (creatorUserID) {
          notififactionBulk.push({
            UserID: creatorUserID, // Notify the creator of the checker task
            Message: "The review you assigned has been escalated.",
            NotificationType: "escalation",
            LinkedType: "Document",
            LinkedID: DocumentID,
            CreatedBy: currentUserId,
          });
        }
      }
    } else if (IsReviewSkipped) {
      res.staus(403).send({
        message: "You are not allowed to skip this review as a escalator",
      });
    } else {
      const [resVal] = await ModuleEscalation.update(
        {
          Comment,
          ApprovalStatus,
          IsActive: false,
          ModifiedDate: new Date().toISOString(),
          ModifiedBy: currentUserId,
        },
        {
          where: {
            SOPDraftID: SOPID,
            DocumentModuleDraftID: DocumentID,
            TestMCQDraftID: TestMCQID,
            TrainingSimulationDraftID: TrainingSimulationID,
            TestSimulationDraftID: TestSimulationID,
            ModifiedDate: null,
            UserID: currentUserId,
          },
        }
      );
      if (!resVal) {
        res.status(403).send({
          message:
            "You are already update your review/You are not an Escalation Persion",
        });
        return;
      }
      // Notification for escalation
      if (creatorUserID) {
        notififactionBulk.push({
          UserID: creatorUserID, // Notify the creator of the checker task
          Message: "The review you assigned has been escalated.",
          NotificationType: "escalation",
          LinkedType: "Document",
          LinkedID: DocumentID,
          CreatedBy: currentUserId,
        });
      }
    }
    let approvalRequired = false; // Flag to determine if we should update PendingApprovals to false

    if (NeedAcceptance === false) {
      // First, check if there are ModuleCheckers
      const checkers = await ModuleChecker.findAll({
        where: {
          SOPDraftID: SOPID,
          DocumentModuleDraftID: DocumentID,
          TestMCQDraftID: TestMCQID,
          TrainingSimulationDraftID: TrainingSimulationID,
          TestSimulationDraftID: TestSimulationID,
          IsDeleted: false,
          IsActive: false,
        },
        attributes: ["ApprovalStatus"],
      });

      if (checkers.length > 0) {
        // If there are checkers, check if at least one is approved
        approvalRequired = checkers.some((checker) =>
          ["Approved", "Rejected"].includes(checker.ApprovalStatus)
        );
      } else {
        // If no checkers, check NeedAcceptanceFromStakeHolder condition
        if (NeedAcceptanceFromStakeHolder === false) {
          // If NeedAcceptanceFromStakeHolder is false, check ModuleStakeHolders
          const stakeHolders = await ModuleStakeHolder.findAll({
            where: {
              DocumentModuleDraftID: DocumentID,
              IsDeleted: false,
              IsActive: false,
            },
            attributes: ["ApprovalStatus"],
          });

          // Check if at least one stakeholder has approved
          approvalRequired = stakeHolders.some((stakeholder) =>
            ["Approved", "Rejected"].includes(stakeholder.ApprovalStatus)
          );
        } else if (NeedAcceptanceFromStakeHolder === true) {
          // If NeedAcceptanceFromStakeHolder is true, all ModuleStakeHolders must approve
          const stakeHolders = await ModuleStakeHolder.findAll({
            where: {
              DocumentModuleDraftID: DocumentID,
              IsDeleted: false,
              // IsActive: false,
            },
            attributes: ["ApprovalStatus"],
          });

          // All stakeholders must approve
          approvalRequired = stakeHolders.every((stakeholder) =>
            ["Approved", "Rejected"].includes(stakeholder.ApprovalStatus)
          );
        }
      }
    }

    // 2. If NeedAcceptance is true, all ModuleCheckers must approve
    else if (NeedAcceptance === true) {
      // All ModuleCheckers must approve
      const checkers = await ModuleChecker.findAll({
        where: {
          SOPDraftID: SOPID,
          DocumentModuleDraftID: DocumentID,
          TestMCQDraftID: TestMCQID,
          TrainingSimulationDraftID: TrainingSimulationID,
          TestSimulationDraftID: TestSimulationID,
          IsDeleted: false,
          // IsActive: false,
        },
        attributes: ["ApprovalStatus"],
      });

      approvalRequired = checkers.every((checker) =>
        ["Approved", "Rejected"].includes(checker.ApprovalStatus)
      );
    }

    // If approval is required based on conditions, update PendingApprovals to false in ModuleOwner
    if (approvalRequired) {
      const owners = await ModuleOwner.findAll({
        where: {
          SOPDraftID: SOPID,
          DocumentModuleDraftID: DocumentID,
          TestMCQDraftID: TestMCQID,
          TrainingSimulationDraftID: TrainingSimulationID,
          TestSimulationDraftID: TestSimulationID,
          IsDeleted: false,
          IsActive: true,
        },
        attributes: ["UserID"],
      });

      ownerIds = owners.map((owner) => owner.UserID); // Extract owner IDs

      // Update PendingApprovals to false for all owners
      await ModuleOwner.update(
        {
          PendingApprovals: false, // Set to false once approvals are met
          ModifiedDate: new Date().toISOString(),
          ModifiedBy: currentUserId,
        },
        {
          where: {
            DocumentModuleDraftID: DocumentID,
            UserID: {
              [Op.in]: ownerIds, // Update all owners associated with the document
            },
          },
        }
      );
    }
    if (approvalRequired) {
      for (const owner of ownerIds) {
        notififactionBulk.push({
          UserID: owner, // Notify the creator of the checker task
          Message: "The review you assigned has been completed.",
          NotificationType: "actionable",
          LinkedType: "Document",
          LinkedID: DocumentID,
          CreatedBy: currentUserId,
        });
      }
    }
    // Send notifications in bulk
    if (notififactionBulk.length > 0) {
      // const notificationChunks = helper.chunkArray(notififactionBulk, 300);
      // const bulkNotificationBunch = notificationChunks.map((chunk) =>
      //   UserNotification.bulkCreate(chunk)
      // );
      await UserNotification.bulkCreate(notififactionBulk, {
        ignoreDuplicates: true,
      });
      await sendNotification(notififactionBulk);
    }
    if (ApprovalStatus === "Approved") {
      checkIsWhetherSendEmailNotification(
        SOPID ||
          DocumentID ||
          TestMCQID ||
          TrainingSimulationID ||
          TestSimulationID,
        ApprovalStatus,
        currentUserId,
        "Reviewer"
      );
    }
    res.status(200).send({ message: "User Comment Added Successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.delegateUser = async (req, res) => {
  const t = await sequelize.transaction(); // Start a new transaction

  const { NewUserID, DocumentID, userType } = req.body; // NewUserID is the UserID of new stakeholder or checker
  const { currentUserId } = req.payload; // Assumed to come from JWT or session
  const notififactionBulk = []; // Array to collect notifications

  if (!currentUserId || !NewUserID || !DocumentID) {
    return res.status(400).json({
      message:
        "Missing required parameters (currentUserId, NewUserID, DocumentID)",
    });
  }

  try {
    // 1. Check if current user (Checker or StakeHolder) exists for the document
    let currentRecord;
    if (userType === "EndUser") {
      currentRecord = await ModuleChecker.findOne({
        where: {
          UserID: currentUserId,
          DocumentModuleDraftID: DocumentID, // Ensure we are looking for the correct document draft
          IsDeleted: false, // Make sure the current record is active
        },
        transaction: t,
      });
    } else if (userType === "ProcessOwner") {
      currentRecord = await ModuleStakeHolder.findOne({
        where: {
          UserID: currentUserId,
          DocumentModuleDraftID: DocumentID, // Ensure we are looking for the correct document draft
          IsDeleted: false, // Make sure the current record is active
        },
        transaction: t,
      });
    }

    if (!currentRecord) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "Current user not found or is inactive." });
    }

    // 2. Check if new user (stakeholder or checker) exists
    const newUser = await Users.findOne({
      where: {
        UserID: NewUserID,
      },
      transaction: t,
    });

    if (!newUser) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "New user (stakeholder/checker) not found." });
    }

    // 3. Check if the new user is already assigned to the document draft
    let existingRecord;
    if (userType === "EndUser") {
      existingRecord = await ModuleChecker.findOne({
        where: {
          UserID: NewUserID, // Check if the new user (checker) is already assigned
          DocumentModuleDraftID: DocumentID, // Check for the specific document draft
          IsDeleted: false, // Ensure the record is not deleted
        },
        transaction: t,
      });
    } else if (userType === "ProcessOwner") {
      existingRecord = await ModuleStakeHolder.findOne({
        where: {
          UserID: NewUserID, // Check if the new user (stakeholder) is already assigned
          DocumentModuleDraftID: DocumentID, // Check for the specific document draft
          IsDeleted: false, // Ensure the record is not deleted
        },
        transaction: t,
      });
    }

    if (existingRecord) {
      await t.rollback();
      return res.status(400).json({
        message: "New user is already assigned to this document draft.",
      });
    }

    // 4. Delete the current user (checker or stakeholder)
    if (userType === "EndUser") {
      await ModuleChecker.update(
        {
          IsActive: false,
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
          Comment: "Delegated to " + newUser.UserName,
        },
        {
          where: {
            ModuleCheckerID: currentRecord.ModuleCheckerID,
          },
          transaction: t,
        }
      );
    } else if (userType === "ProcessOwner") {
      await ModuleStakeHolder.update(
        {
          IsActive: false,
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
          Comment: "Delegated to " + newUser.UserName,
        },
        {
          where: {
            ModuleStakeHolderID: currentRecord.ModuleStakeHolderID,
          },
          transaction: t,
        }
      );
    }

    // 5. Find the latest draft version for the document
    let latestDraft = await sequelize.query(
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
          D."DocumentModuleDraftID" =:DocumentID
        ORDER BY
          D."CreatedDate" DESC
        LIMIT
          1;
      `,
      {
        type: QueryTypes.SELECT,
        replacements: {
          DocumentID,
          UserID: currentUserId,
        },
        transaction: t,
      }
    );

    if (!latestDraft && latestDraft.length > 0) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "No drafts found for the document." });
    } else {
      latestDraft = latestDraft[0];
    }

    // 6. Create a new record (ModuleChecker or ModuleStakeHolder) for the new user for the latest draft
    if (userType === "EndUser") {
      await ModuleChecker.create(
        {
          ModuleTypeID: latestDraft.ModuleTypeID,
          ContentID: latestDraft.ContentID,
          DocumentModuleDraftID: latestDraft.DocumentModuleDraftID,
          DocumentID: latestDraft.DocumentID,
          IsDelegated: true,
          DelegatedBy: currentUserId, // The current user who delegated the task
          DelegatedDate: literal("CURRENT_TIMESTAMP"), // Current timestamp for delegation
          UserID: NewUserID, // New user's UserID
          CreatedBy: currentUserId,
          CreatedDate: literal("CURRENT_TIMESTAMP"),
        },
        { transaction: t }
      );
    } else if (userType === "ProcessOwner") {
      await ModuleStakeHolder.create(
        {
          ModuleTypeID: latestDraft.ModuleTypeID,
          ContentID: latestDraft.ContentID,
          DocumentModuleDraftID: latestDraft.DocumentModuleDraftID,
          DocumentID: latestDraft.DocumentID,
          IsDelegated: true,
          DelegatedBy: currentUserId, // The current user who delegated the task
          DelegatedDate: literal("CURRENT_TIMESTAMP"), // Current timestamp for delegation
          UserID: NewUserID, // New user's UserID
          CreatedBy: currentUserId,
          CreatedDate: literal("CURRENT_TIMESTAMP"),
        },
        { transaction: t }
      );
    }
    const payload = {};
    if (latestDraft.UserType == "StakeHolder") {
      payload["AcceptedByStakeHolder"] = [NewUserID];
    } else if (latestDraft.UserType == "Reviewer") {
      payload["AcceptedByReviewer"] = [NewUserID];
    } else if (latestDraft.UserType == "Approver") {
      payload["AcceptedByApprover"] = [NewUserID];
    }
    // 7. Update the AcceptedBy field for the latest document draft
    await DocumentModuleDraft.update(
      {
        ...payload, // Set the AcceptedBy field to the new user's ID
        ModifiedDate: new Date().toISOString(),
        ModifiedBy: currentUserId, // Set the current user as the one modifying the record
      },
      {
        where: {
          DocumentModuleDraftID: DocumentID,
        },
        transaction: t,
      }
    );

    // 8. Send notification to new user (actionable items should always notify)
    const notificationMessage = `You have received a document for review.`;
    notififactionBulk.push({
      UserID: NewUserID,
      Message: notificationMessage,
      NotificationType: "actionable",
      LinkedType: "Document",
      LinkedID: DocumentID,
      CreatedBy: currentUserId,
      CreatedDate: literal("CURRENT_TIMESTAMP"),
    });

    if (notififactionBulk.length > 0) {
      await UserNotification.bulkCreate(notififactionBulk, {
        ignoreDuplicates: true,
        transaction: t,
      });
      // Send all notifications in bulk

      await sendNotification(notififactionBulk); // Call the function to send notifications
    }
    // Commit the transaction
    await t.commit();

    return res.status(200).json({
      message: `Delegation successful: ${newUser.username} has been assigned as a stakeholder for the latest draft of document.`,
    });
  } catch (error) {
    await t.rollback();
    return res
      .status(500)
      .json({ message: "Something went wrong during delegation. " + error });
  }
};

exports.updateDelegateStatus = async (req, res) => {
  const t = await sequelize.transaction(); // Start a new transaction
  try {
    let record;
    const { id, idType, delegateStatus } = req.body;
    const { currentUserId } = req.payload;
    const notififactionBulk = []; // Array to collect notifications

    // Check if it's for ModuleChecker or ModuleStakeHolder and find the record first
    if (idType === "ModuleCheckerID") {
      // Check if the ModuleCheckerID exists
      record = await ModuleChecker.findOne({
        where: {
          ModuleCheckerID: id, // Find the correct checker by ID
        },
        transaction: t,
      });

      if (!record) {
        return res
          .status(404)
          .send({ message: "Data Not Found: ModuleCheckerID does not exist." });
      }

      if (delegateStatus === "Accepted") {
        // Only update DelegateStatus and Modified fields for accepted
        await ModuleChecker.update(
          {
            DelegateStatus: delegateStatus, // Update delegate status
            // ModifiedDate: new Date().toISOString(), // Update the modified date
            // ModifiedBy: currentUserId, // Set the current user as the one modifying the record
          },
          {
            where: {
              ModuleCheckerID: id, // Update the correct checker by ID
            },
            transaction: t,
          }
        );
        const delegator = await ModuleChecker.findOne({
          where: {
            UserID: record.DelegatedBy, // The user who delegated the task
            IsDeleted: true, // Ensure the delegator's record is deleted
            IsActive: false, // Ensure the delegator's record is inactive
          },
          order: [["CreatedDate", "DESC"]], // Get the latest record (based on CreatedDate)
          transaction: t,
        });

        if (delegator) {
          // Undo deletion for the delegator (set IsDeleted to false and clear DeletedBy and DeletedDate)
          await ModuleChecker.update(
            {
              IsActive: true, // Set the delegator's record back to active
            },
            {
              where: {
                ModuleCheckerID: delegator.ModuleCheckerID, // Update the delegator's record
              },
              transaction: t,
            }
          );
        }
      } else if (delegateStatus === "Rejected") {
        // Update DelegateStatus and Modified fields for rejected
        await ModuleChecker.update(
          {
            DelegateStatus: delegateStatus, // Update delegate status
            IsDeleted: true, // Ensure the delegator's record is deleted
            // IsActive: false, // Ensure the delegator's record is inactive
            DeletedBy: currentUserId, // Set the current user as the one deleting the record
            DeletedDate: literal("CURRENT_TIMESTAMP"), // Set current timestamp for deletion
            Comment: "Delegate Rejected",
            // ModifiedDate: new Date().toISOString(), // Update the modified date
            // ModifiedBy: currentUserId, // Set the current user as the one modifying the record
          },
          {
            where: {
              ModuleCheckerID: id, // Update the correct checker by ID
            },
            transaction: t,
          }
        );

        // Find the delegator (the person who delegated the task) by DelegatedBy field
        const delegator = await ModuleChecker.findOne({
          where: {
            UserID: record.DelegatedBy, // The user who delegated the task
            IsDeleted: true, // Ensure the delegator's record is deleted
            IsActive: false, // Ensure the delegator's record is inactive
          },
          order: [["CreatedDate", "DESC"]], // Get the latest record (based on CreatedDate)
          transaction: t,
        });

        if (delegator) {
          // Undo deletion for the delegator (set IsDeleted to false and clear DeletedBy and DeletedDate)
          await ModuleChecker.update(
            {
              IsDeleted: false, // Undo deletion for the delegator
              DeletedBy: null, // Remove DeletedBy
              DeletedDate: null, // Remove DeletedDate
              IsActive: true, // Set the delegator's record back to active
              Comment: null, // Clear the comment field
            },
            {
              where: {
                ModuleCheckerID: delegator.ModuleCheckerID, // Update the delegator's record
              },
              transaction: t,
            }
          );
        }
        // 7. Update the AcceptedBy field for the latest document draft
        await DocumentModuleDraft.update(
          {
            AcceptedByReviewer: [record.DelegatedBy], // Set the AcceptedBy field to the new user's ID
            ModifiedDate: new Date().toISOString(),
            ModifiedBy: currentUserId, // Set the current user as the one modifying the record
          },
          {
            where: {
              DocumentModuleDraftID: record.DocumentModuleDraftID,
            },
            transaction: t,
          }
        );
      }

      // Send notification to the delegator
      const notificationStatus = await Notification.findOne({
        where: {
          UserID: record.DelegatedBy, // The delegator
          NotificationTypeForAction: { [Op.in]: ["push", "both"] }, // Check if the notification type is 'push' or 'both'
        },
        attributes: ["UserID", "NotificationTypeForAction"],
      });

      if (notificationStatus) {
        let notificationMessage;
        if (delegateStatus === "Accepted") {
          notificationMessage = `Your task delegation has been accepted.`;
        } else if (delegateStatus === "Rejected") {
          notificationMessage = `Your task delegation has been rejected.`;
        }

        notififactionBulk.push({
          UserID: record.DelegatedBy, // The user to notify
          Message: notificationMessage,
          NotificationType: "actionable", // Type of notification
          LinkedType: "Document", // Linked to Document or any other context
          LinkedID: record.DocumentModuleDraftID, // Linked to the document ID
          CreatedBy: currentUserId, // Who created the notification
          CreatedDate: literal("CURRENT_TIMESTAMP"), // Set current timestamp
        });
      }
    } else if (idType === "ModuleStakeHolderID") {
      // Check if the ModuleStakeHolderID exists
      record = await ModuleStakeHolder.findOne({
        where: {
          ModuleStakeHolderID: id, // Find the correct stakeholder by ID
        },
        transaction: t,
      });

      if (!record) {
        return res.status(404).send({
          message: "Data Not Found: ModuleStakeHolderID does not exist.",
        });
      }

      if (delegateStatus === "Accepted") {
        // Only update DelegateStatus and Modified fields for accepted
        await ModuleStakeHolder.update(
          {
            DelegateStatus: delegateStatus, // Update delegate status
            // ModifiedDate: new Date().toISOString(), // Update the modified date
            // ModifiedBy: currentUserId, // Set the current user as the one modifying the record
          },
          {
            where: {
              ModuleStakeHolderID: id, // Update the correct stakeholder by ID
            },
            transaction: t,
          }
        );
        const delegator = await ModuleStakeHolder.findOne({
          where: {
            UserID: record.DelegatedBy, // The user who delegated the task
            IsDeleted: true, // Ensure the delegator's record is deleted
            IsActive: false, // Ensure the delegator's record is inactive
          },
          order: [["CreatedDate", "DESC"]], // Get the latest record (based on CreatedDate)
          transaction: t,
        });

        if (delegator) {
          // Undo deletion for the delegator (set IsDeleted to false and clear DeletedBy and DeletedDate)
          await ModuleStakeHolder.update(
            {
              IsActive: true, // Set the delegator's record back to active
            },
            {
              where: {
                ModuleStakeHolderID: delegator.ModuleStakeHolderID, // Update the delegator's record
              },
              transaction: t,
            }
          );
        }
      } else if (delegateStatus === "Rejected") {
        // Update DelegateStatus and Modified fields for rejected
        await ModuleStakeHolder.update(
          {
            DelegateStatus: delegateStatus, // Update delegate status
            IsDeleted: true, // Ensure the delegator's record is deleted
            // IsActive: false, // Ensure the delegator's record is inactive
            DeletedBy: currentUserId, // Set the current user as the one deleting the record
            DeletedDate: literal("CURRENT_TIMESTAMP"), // Set current timestamp for deletion
            Comment: "Delegate Rejected",
            // ModifiedDate: new Date().toISOString(), // Update the modified date
            // ModifiedBy: currentUserId, // Set the current user as the one modifying the record
          },
          {
            where: {
              ModuleStakeHolderID: id, // Update the correct stakeholder by ID
            },
            transaction: t,
          }
        );

        // Find the delegator (the person who delegated the task) by DelegatedBy field
        const delegator = await ModuleStakeHolder.findOne({
          where: {
            UserID: record.DelegatedBy, // The user who delegated the task
            IsDeleted: true, // Ensure the delegator's record is deleted
            IsActive: false, // Ensure the delegator's record is inactive
          },
          order: [["CreatedDate", "DESC"]], // Get the latest record (based on CreatedDate)
        });

        if (delegator) {
          // Undo deletion for the delegator (set IsDeleted to false and clear DeletedBy and DeletedDate)
          await ModuleStakeHolder.update(
            {
              IsDeleted: false, // Undo deletion for the delegator
              DeletedBy: null, // Remove DeletedBy
              DeletedDate: null, // Remove DeletedDate
              IsActive: true, // Set the delegator's record back to active
              Comment: null, // Clear the comment field
              // ModifiedDate: new Date().toISOString(), // Update the modified date
              // ModifiedBy: currentUserId, // Set the current user as the one modifying the record
            },
            {
              where: {
                ModuleStakeHolderID: delegator.ModuleStakeHolderID, // Update the delegator's record
              },
              transaction: t,
            }
          );
        }
        // 7. Update the AcceptedBy field for the latest document draft
        await DocumentModuleDraft.update(
          {
            AcceptedByStakeHolder: [record.DelegatedBy], // Set the AcceptedBy field to the new user's ID
            ModifiedDate: new Date().toISOString(),
            ModifiedBy: currentUserId, // Set the current user as the one modifying the record
          },
          {
            where: {
              DocumentModuleDraftID: record.DocumentModuleDraftID,
            },
            transaction: t,
          }
        );
      }

      // Send notification to the delegator (actionable items should always notify)
      let notificationMessage;
      if (delegateStatus === "Accepted") {
        notificationMessage = `Your task delegation has been accepted.`;
      } else if (delegateStatus === "Rejected") {
        notificationMessage = `Your task delegation has been rejected.`;
      }

      notififactionBulk.push({
        UserID: record.DelegatedBy, // The user to notify
        Message: notificationMessage,
        NotificationType: "actionable", // Type of notification
        LinkedType: "Document", // Linked to Document or any other context
        LinkedID: record.DocumentModuleDraftID, // Linked to the document ID
        CreatedBy: currentUserId, // Who created the notification
        CreatedDate: literal("CURRENT_TIMESTAMP"), // Set current timestamp
      });
    } else {
      return res.status(400).send({ message: "Invalid idType provided." });
    }

    if (notififactionBulk.length > 0) {
      await UserNotification.bulkCreate(notififactionBulk, {
        ignoreDuplicates: true,
        transaction: t,
      });
      // Send all notifications in bulk

      await sendNotification(notififactionBulk); // Call the function to send notifications
    }
    await t.commit();
    return res.status(200).send({
      success: delegateStatus === "Accepted" ? true : false,
      message: `Delegate Status ${delegateStatus}`,
    });
  } catch (error) {
    return res
      .status(500)
      .send({ message: error.message || "Failed to update DelegateStatus." });
  }
};

exports.listUserAchievement = async (req, res) => {
  const { currentUserId } = req.payload;

  try {
    const achievementList = await sequelize.query(
      `
      SELECT "ua"."AttemptID", "ua"."IsFinished", "ua"."Score", "ua"."CreatedDate",
             "tm"."TestMCQID", "tm"."TestMCQName", "tm"."MasterVersion"
      FROM "UserAttempts" AS "ua"
      INNER JOIN "TestMcqsModules" AS "tm"
      ON "ua"."ModuleID" = "tm"."TestMCQID"
      WHERE "ua"."UserID" = :currentUserId
      AND "ua"."CreatedDate" = (
        SELECT MAX("ua2"."CreatedDate")
        FROM "UserAttempts" AS "ua2"
        WHERE "ua2"."ModuleID" = "ua"."ModuleID"
        AND "ua2"."UserID" = :currentUserId
      )
      ORDER BY "tm"."TestMCQID" ASC
      `,
      {
        replacements: { currentUserId },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Check if no achievements were found
    if (!achievementList || achievementList.length === 0) {
      throw new Error("No achievements found for the current user.");
    }

    res.status(200).send({
      message: "Achievements fetched Successfully",
      data: achievementList,
    });
  } catch (error) {
    console.log(error);
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

exports.viewUserAchievement = async (req, res) => {
  const { AttemptID } = req.body;
  const { currentUserId } = req.payload;
  try {
    const achievement = await UserAttempts.findOne({
      where: {
        AttemptID: AttemptID,
        UserID: currentUserId,
      },
      attributes: ["AttemptID", "CompletedOn"],
      include: [
        {
          required: true,
          model: TestMcqsModule,
          as: "TestMcqAttempt",
          where: {
            DueDate: {
              [Op.lt]: moment().format("HH:mm:ssZ"),
            },
          },
          attributes: ["TestMCQName"],
        },
        {
          required: true,
          model: Users,
          as: "AttemptUser",
          attributes: ["UserName"],
        },
      ],
      order: [["CreatedDate", "DESC"]],
      limit: 1,
    });

    if (!achievement) {
      return res.status(200).send({
        message: "No Achievement found",
        data: null,
      });
    }

    const modifiedAchievement = {
      ...achievement.toJSON(),
      user: achievement.AttemptUser.UserName,
      course: achievement.TestMcqAttempt.TestMCQName,
      completionDate: achievement.CompletedOn,
      companyName: "",
      logoUrl: "",
    };

    delete modifiedAchievement.AttemptUser;
    delete modifiedAchievement.TestMcqAttempt;
    delete modifiedAchievement.CompletedOn;

    res.status(200).send({
      message: "Achievement fetched Successfully",
      data: {
        achievement: modifiedAchievement,
      },
    });
  } catch (error) {
    console.log(error);
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

exports.generateSignedUrl = async (req, res) => {
  const t = await sequelize.transaction();
  const { ModuleTypeID, ModuleID, FileTypeName = null } = req.body;
  const { currentUserId } = req.payload;
  try {
    const { ModuleName } = await ModuleMaster.findOne({
      where: {
        ModuleTypeID,
      },
      attributes: ["ModuleName"],
      transaction: t,
    });

    if (!ModuleName) {
      return res.status(404).send({
        error: `Module not found`,
      });
    }

    // Mapping models for different file types
    const modelMapping = {
      TestSimulation: TestSimulationModule,
      TrainingSimulation: TrainingSimulationModule,
      Document: DocumentModule,
    };

    // Get the appropriate model based on ModuleName
    const model = modelMapping[ModuleName];

    if (!model) {
      return res.status(400).send({
        error: "Invalid Module Type",
      });
    }

    // Query the database to get the file path
    const fileRecord = await model.findOne({
      where: {
        [`${ModuleName}ID`]: ModuleID,
      },
      attributes: [`${ModuleName}Path`],
      transaction: t,
    });

    if (!fileRecord) {
      return res.status(404).send({
        error: `File not found `,
      });
    }

    const { FileAccessAttemptID } = await FileAccessAttempt.create(
      {
        ModuleTypeID,
        ModuleTypeName: ModuleName,
        ModuleID,
        FileTypeName,
        UserID: currentUserId,
        CreatedBy: currentUserId,
      },
      {
        transaction: t,
      }
    );

    let url;
    if (ModuleName === "Document") {
      url = `/file/${ModuleName}/${ModuleID}?access=${FileAccessAttemptID}`;
      // url = `${fileRecord[ModuleName + "Path"]}`;
    } else {
      if (!FileTypeName) {
        return res.status(400).send({
          error: "Invalid File Type",
        });
      }
      url = `/file/${ModuleName}/${ModuleID}/${FileTypeName}.html?access=${FileAccessAttemptID}`;
      // url = `${fileRecord[ModuleName + "Path"]}/${FileTypeName}.html`;
    }

    if (!url) {
      return res.status(404).send({
        error: `File not found`,
      });
    }

    // Get user agent info (OS and browser)
    const userAgent = UserAgent.parse(req.headers["user-agent"]);
    const userIp = req.ip || req.connection.remoteAddress;

    const userAgentAndIP = {
      os: userAgent?.os?.name,
      browser: userAgent?.browser?.name,
      ip: userIp,
    };

    const tokenPayload = {
      url,
      currentUserId,
      userAgentAndIP,
    };

    // Generate a signed URL with expiration
    const signedUrl = sign(
      tokenPayload,
      "secretKey", // Replace with a secure key from environment
      { expiresIn: "1d" }
    );

    await FileAccessAttempt.update(
      {
        Token: signedUrl,
        Url: url,
        UserAgentAndIP: userAgentAndIP,
      },
      {
        where: {
          FileAccessAttemptID,
        },
        transaction: t,
      }
    );

    await t.commit();
    res.status(200).send({
      message: "URL generated successfully",
      data: { url },
    });
  } catch (error) {
    await t.rollback();
    console.log(error);
    logger.error({
      message: "Error generating URL",
      details: error.message,
      stack: error.stack,
      UserID: currentUserId,
    });
    res.status(500).send({
      error:
        "An error occurred while generating the URL. Please try again later.",
    });
  }
};

exports.getFileUrl = async (req, res, next) => {
  const { access, user } = req.query;

  let token;
  if (access && user) {
    const { UserID, Token } = await FileAccessAttempt.findOne({
      where: {
        FileAccessAttemptID: access,
        UserID: user,
      },
      attributes: ["Token"],
    });

    if (!Token || !UserID) {
      return res.status(404).send({
        error: "Unauthorized access to this file.",
      });
    }

    token = Token;
    await FileAccessAttempt.update(
      {
        AccessedUserID: user,
        IsAccessed: true,
      },
      {
        where: {
          FileAccessAttemptID: access,
          UserId: user,
        },
      }
    );
  } else {
  }

  const path = req.path.split("/") || [];
  if (path.length === 3) {
    const ModuleTypeName = path[0];
    const ModuleID = path[1];
    const FileTypeName = path[2];
    const { ModuleTypeID } = await ModuleMaster.findOne({
      where: {
        ModuleName: ModuleTypeName,
      },
      attributes: ["ModuleTypeID"],
    });

    const { UserAgentAndIP, IsAccessed } = await FileAccessAttempt.findOne({
      where: {
        ModuleTypeID,
        ModuleID,
        ModuleTypeName,
        FileTypeName,
      },
      attributes: ["UserAgentAndIP"],
    });

    if (IsAccessed && access) {
      return res.status(403).send({
        error: "File has already been accessed. Please generate a new URL.",
      });
    }

    if (UserAgentAndIP) {
      const userAgent = UserAgent.parse(req.headers["user-agent"]);
      const currentIp = req.ip || req.connection.remoteAddress;

      if (
        UserAgentAndIP.os !== userAgent?.os?.name ||
        UserAgentAndIP.browser !== userAgent?.browser?.name ||
        UserAgentAndIP.ip !== currentIp
      ) {
        return res.status(403).send({
          error: "Unauthorized access to this file.",
        });
      }
    } else {
      return res.status(403).send({
        error: "Unauthorized access to this file.",
      });
    }
  } else if (path.length === 2) {
    const ModuleTypeName = path[0];
    const ModuleID = path[1];
    const { ModuleTypeID } = await ModuleMaster.findOne({
      where: {
        ModuleName: ModuleTypeName,
      },
      attributes: ["ModuleTypeID"],
    });

    const { UserAgentAndIP, IsAccessed } = await FileAccessAttempt.findOne({
      where: {
        ModuleTypeID,
        ModuleID,
        ModuleTypeName,
      },
      attributes: ["UserAgentAndIP"],
    });

    if (IsAccessed && access) {
      return res.status(403).send({
        error: "File has already been accessed. Please generate a new URL.",
      });
    }

    if (UserAgentAndIP) {
      const userAgent = UserAgent.parse(req.headers["user-agent"]);
      const currentIp = req.ip || req.connection.remoteAddress;

      if (
        UserAgentAndIP.os !== userAgent?.os?.name ||
        UserAgentAndIP.browser !== userAgent?.browser?.name ||
        UserAgentAndIP.ip !== currentIp
      ) {
        return res.status(403).send({
          error: "Unauthorized access to this file.",
        });
      }
    } else {
      return res.status(403).send({
        error: "Unauthorized access to this file.",
      });
    }
  } else {
    return res.status(404).send({
      error: "File not found",
    });
  }

  try {
    // Verify the signed file
    let decoded;
    try {
      decoded = verify(sessionFile, "secretKey");
    } catch (error) {
      return res.status(403).send({
        error: "File access token is invalid or has expired.",
      });
    }

    // Get user agent info (OS and browser)
    const userAgent = UserAgent.parse(req.headers["user-agent"]);
    const currentIp = req.ip || req.connection.remoteAddress;

    // Validate OS, browser, and IP
    if (
      decoded.os !== userAgent?.os?.name ||
      decoded.browser !== userAgent?.browser?.name ||
      decoded.ip !== currentIp
    ) {
      return res.status(403).send({
        error: "Unauthorized access to this file.",
      });
    }

    if (decoded?.currentUserId !== sessionUser) {
      return res.status(403).send({
        error: "Unauthorized access to this file.",
      });
    }

    // Mark the session to indicate the file has been accessed
    req.session.fileAccessed = true;

    return next();
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error:
        "An error occurred while retrieving the file. Please try again later.",
    });
  }
};

// exports.getFileUrl = async (req, res, next) => {
//   const { file, user } = req.query;

//   // Retrieve file and user information from session if not provided in query
//   let sessionFile = file || req?.session?.file;
//   let sessionUser = user || req?.session?.user;

//   if (file && user) {
//     req.session.file = file;
//     req.session.user = user;
//   }

//   // Check if the file has already been accessed successfully
//   if (req.session.fileAccessed && file && user) {
//     return res.status(403).json({
//       error: "File has already been accessed. Please generate a new URL.",
//     });
//   }

//   try {
//     // Verify the signed file
//     let decoded;
//     try {
//       decoded = verify(sessionFile, "secretKey");
//     } catch (error) {
//       return res.status(403).send({
//         error: "File access token is invalid or has expired.",
//       });
//     }

//     // Get user agent info (OS and browser)
//     const userAgent = UserAgent.parse(req.headers["user-agent"]);
//     const currentIp = req.ip || req.connection.remoteAddress;

//     // Validate OS, browser, and IP
//     if (
//       decoded.os !== userAgent?.os?.name ||
//       decoded.browser !== userAgent?.browser?.name ||
//       decoded.ip !== currentIp
//     ) {
//       return res.status(403).send({
//         error: "Unauthorized access to this file.",
//       });
//     }

//     if (decoded?.currentUserId !== sessionUser) {
//       return res.status(403).send({
//         error: "Unauthorized access to this file.",
//       });
//     }

//     // Mark the session to indicate the file has been accessed
//     req.session.fileAccessed = true;

//     return next();
//   } catch (error) {
//     console.log(error);
//     res.status(500).send({
//       error:
//         "An error occurred while retrieving the file. Please try again later.",
//     });
//   }
// };
exports.getMessages = async (req, res) => {
  const { currentUserId, currentUserType } = req.payload;
  try {
    const {
      ModuleID,
      ModuleAccessorID = null,
      Limit = 20,
      Page = 1,
    } = req.body;
    const owner = await sequelize.query(
      `
    select sm."MasterVersion"::text from "SopModules" sm 
    where sm."SOPID" = :ModuleID
    union all 
    select sm."MasterVersion"::text from "DocumentModules" sm 
    where sm."DocumentID" = :ModuleID
    union all 
    select sm."MasterVersion"::text from "TrainingSimulationModules" sm 
    where sm."TrainingSimulationID" = :ModuleID
    union all 
    select sm."MasterVersion"::text from "TestSimulationModules" sm 
    where sm."TestSimulationID" = :ModuleID
    union all 
    select sm."MasterVersion"::text from "TestMcqsModules" sm 
    where sm."TestMCQID" = :ModuleID`,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: {
          ModuleID,
        },
      }
    );
    if (currentUserType === "EndUser") {
      const messages = await ChatMessages.findAll({
        where: {
          ModuleID,
          ModuleAccessorID: currentUserId,
          MasterVersion: owner[0].MasterVersion,
        },
        include: [
          {
            model: UserDetails,
            as: "RepliedByUser",
            attributes: [
              "UserID",
              "UserFirstName",
              "UserLastName",
              "UserPhoto",
            ],
          },
        ],
        order: [["MessageDate", "DESC"]],
        limit: Limit,
        offset: (Page - 1) * Limit,
      });
      res.status(200).send({
        data: JSON.parse(JSON.stringify(messages)).reverse(
          (a, b) => new Date(a.MessageDate) - new Date(b.MessageDate)
        ),
      });
    } else if (currentUserType === "ProcessOwner") {
      const messages = await ChatMessages.findAll({
        where: {
          ModuleID,
          ModuleAccessorID,
          MasterVersion: owner[0].MasterVersion,
        },
        include: [
          {
            model: UserDetails,
            as: "RepliedByUser",
            attributes: [
              "UserID",
              "UserFirstName",
              "UserLastName",
              "UserPhoto",
            ],
          },
        ],
        order: [["MessageDate", "DESC"]],
        limit: Limit,
        offset: (Page - 1) * Limit,
      });

      res.status(200).send({
        data: JSON.parse(JSON.stringify(messages)).reverse(
          (a, b) => new Date(a.MessageDate) - new Date(b.MessageDate)
        ),
      });
    } else {
      res.status(424).send({
        error: "Don't have any messages",
      });
    }
  } catch (error) {
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

exports.sendMessage = async (req, res) => {
  const { currentUserId, currentUserType } = req.payload;
  try {
    const {
      RepliedChatID = null,
      ModuleID,
      ModuleAccessorID = null,
      Message,
    } = req.body;
    const owner = await sequelize.query(
      `
      select mo."UserID",sm."MasterVersion"::text from "SopModules" sm 
      inner join "SopModuleDrafts" smd on smd."SOPID" = sm."SOPID" and smd."MasterVersion" = sm."MasterVersion" and smd."SOPStatus" = 'Published'
      inner join "ModuleOwners" mo on mo."SOPID" = sm."SOPID" and mo."SOPDraftID" = smd."SOPDraftID" 
      where sm."SOPID" = :ModuleID
      union all 
      select mo."UserID",sm."MasterVersion"::text from "DocumentModules" sm 
      inner join "DocumentModuleDrafts" smd on smd."DocumentID" = sm."DocumentID" and smd."MasterVersion"::text = sm."MasterVersion"::text and smd."DocumentStatus" = 'Published'
      inner join "ModuleOwners" mo on mo."DocumentID" = sm."DocumentID" and mo."DocumentModuleDraftID" = smd."DocumentModuleDraftID" 
      where sm."DocumentID" = :ModuleID
      union all 
      select mo."UserID",sm."MasterVersion"::text from "TrainingSimulationModules" sm 
      inner join "TrainingSimulationModuleDrafts" smd on smd."TrainingSimulationID" = sm."TrainingSimulationID" and smd."MasterVersion"::text = sm."MasterVersion"::text and smd."TrainingSimulationStatus" = 'Published'
      inner join "ModuleOwners" mo on mo."TrainingSimulationID" = sm."TrainingSimulationID" and mo."TrainingSimulationDraftID" = smd."TrainingSimulationDraftID" 
      where sm."TrainingSimulationID" = :ModuleID
      union all 
      select mo."UserID",sm."MasterVersion"::text from "TestSimulationModules" sm 
      inner join "TestSimulationModuleDrafts" smd on smd."TestSimulationID" = sm."TestSimulationID" and smd."MasterVersion"::text = sm."MasterVersion"::text and smd."TestSimulationStatus" = 'Published'
      inner join "ModuleOwners" mo on mo."TestSimulationID" = sm."TestSimulationID" and mo."TestSimulationDraftID" = smd."TestSimulationDraftID" 
      where sm."TestSimulationID" = :ModuleID
      union all 
      select mo."UserID",sm."MasterVersion"::text from "TestMcqsModules" sm 
      inner join "TestMcqsModuleDrafts" smd on smd."TestMCQID" = sm."TestMCQID" and smd."MasterVersion" = sm."MasterVersion" and smd."TestMCQStatus" = 'Published'
      inner join "ModuleOwners" mo on mo."TestMCQID" = sm."TestMCQID" and mo."TestMCQDraftID" = smd."TestMCQDraftID" 
      where sm."TestMCQID" = :ModuleID`,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: {
          ModuleID,
        },
      }
    );
    let isOwner = false,
      ownerIds = [];
    for (const el of owner) {
      ownerIds.push(el.UserID);
      if (el.UserID == currentUserId) {
        isOwner = true;
      }
    }
    if (!isOwner && currentUserType == "ProcessOwner") {
      return res.status(423).send({
        error: "You are not owner of this module",
      });
    }
    const data = await ChatMessages.create(
      {
        RepliedChatID,
        ModuleID,
        MasterVersion: owner[0].MasterVersion,
        ModuleAccessorID:
          currentUserType == "EndUser" ? currentUserId : ModuleAccessorID,
        SenderID: currentUserId,
        Message,
      },
      { returning: true }
    );
    const userDetails = await UserDetails.findOne({
      where: {
        UserID: currentUserId,
      },
      attributes: ["UserID", "UserFirstName", "UserLastName", "UserPhoto"],
    });

    await ChatMessages.update(
      {
        IsRead: true,
      },
      {
        where: {
          SenderID: { [Op.not]: currentUserId },
          ModuleID,
          ModuleAccessorID:
            currentUserType == "EndUser" ? currentUserId : ModuleAccessorID,
          IsRead: false,
        },
      }
    );
    const dataWithUser = {
      ...JSON.parse(JSON.stringify(data)),
      RepliedByUser: JSON.parse(JSON.stringify(userDetails)),
    };
    let remainingOwner = [];
    if (currentUserType == "ProcessOwner") {
      remainingOwner = ownerIds.filter((el) => el != currentUserId);
    }
    sendChatMessage(
      currentUserType == "EndUser"
        ? ownerIds
        : [ModuleAccessorID, ...remainingOwner],
      currentUserType,

      dataWithUser
    );
    res.status(201).send({
      message: "Successfully sent message",
      data: dataWithUser,
    });
  } catch (error) {
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
exports.getUserListWithLastMessages = async (req, res) => {
  const { currentUserId, currentUserType } = req.payload;
  try {
    const { ModuleID } = req.body;
    const data = await sequelize.query(
      `
            SELECT 
                u."UserID", 
                u."UserFirstName", 
                u."UserLastName", 
                u."UserPhoto", 
                MAX(cm."MessageDate") AS "LastMessageDate", 
                COUNT(CASE WHEN cm."IsRead" = FALSE THEN 1 END) AS "UnreadMessages",
                last_message."Message" AS "LastMessage"
            FROM "UserDetails" u
            INNER JOIN "ChatMessages" cm 
                ON u."UserID" = cm."ModuleAccessorID"
                AND cm."MasterVersion"::text IN (
                SELECT "MasterVersion"::text FROM "SopModules" WHERE "SOPID" = '${ModuleID}'
                UNION ALL
                SELECT "MasterVersion"::text FROM "DocumentModules" WHERE "DocumentID" = '${ModuleID}'
                UNION ALL
                SELECT "MasterVersion"::text FROM "TrainingSimulationModules" WHERE "TrainingSimulationID" = '${ModuleID}'
                UNION ALL
                SELECT "MasterVersion"::text FROM "TestSimulationModules" WHERE "TestSimulationID" = '${ModuleID}'
                UNION ALL
                SELECT "MasterVersion"::text FROM "TestMcqsModules" WHERE "TestMCQID" = '${ModuleID}'
                )
            INNER JOIN "ModuleOwners" mo ON mo."UserID" = '${currentUserId}'
            AND (
            mo."SOPID" = '${ModuleID}' 
            OR mo."DocumentID" = '${ModuleID}'  
            OR mo."TrainingSimulationID" = '${ModuleID}'  
            OR mo."TestSimulationID" = '${ModuleID}'  
            OR mo."TestMCQID" = '${ModuleID}'  
            )
            LEFT JOIN LATERAL (
                SELECT "Message"
                FROM "ChatMessages"
                WHERE "ModuleID" = '${ModuleID}' 
                  AND "ModuleAccessorID" = u."UserID"
                ORDER BY "MessageDate" DESC
                LIMIT 1
            ) last_message ON TRUE
            WHERE 
                cm."ModuleID" = '${ModuleID}'
            GROUP BY 
                u."UserID", 
                u."UserFirstName", 
                u."UserLastName", 
                u."UserPhoto", 
                last_message."Message"
            ORDER BY 
                "LastMessageDate" DESC;
    `,
      {
        type: Sequelize.QueryTypes.SELECT,
      }
    );
    res.status(200).send({
      data,
    });
  } catch (error) {
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
exports.readMessage = async (req, res) => {
  const { currentUserId, currentUserType } = req.payload;
  const { ModuleID, ModuleAccessorID } = req.body;
  try {
    if (currentUserType == "EndUser") {
      await ChatMessages.update(
        {
          IsRead: true,
        },
        {
          where: {
            SenderID: { [Op.not]: currentUserId },
            ModuleAccessorID: currentUserId,
            ModuleID,
            IsRead: false,
          },
        }
      );
    } else if (currentUserType == "ProcessOwner") {
      await ChatMessages.update(
        {
          IsRead: true,
        },
        {
          where: {
            ModuleID,
            SenderID: { [Op.not]: currentUserId },
            ModuleAccessorID,
            IsRead: false,
          },
        }
      );
    }
    res.status(200).send({
      message: "Successfully read messages",
    });
  } catch (error) {
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
exports.addNotes = async (req, res) => {
  const { currentUserId } = req.payload;
  const { Title, Content, ModuleTypeID, ModuleID, MasterVersion } = req.body;
  try {
    await Notes.create({
      Title,
      Content,
      ModuleTypeID,
      ModuleID,
      MasterVersion,
      CreatedBy: currentUserId,
    });
    res.status(201).send({
      message: "Successfully added note",
    });
  } catch (error) {
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
exports.updateNote = async (req, res) => {
  const { currentUserId } = req.payload;
  const { NoteID, Content } = req.body;
  try {
    await Notes.update(
      {
        Content,
        ModifiedBy: currentUserId,
        ModifiedDate: literal("CURRENT_TIMESTAMP"),
      },
      { where: { NoteID } }
    );
    res.status(200).send({
      message: "Successfully updated note",
    });
  } catch (error) {
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

exports.deleteNote = async (req, res) => {
  const { currentUserId } = req.payload;
  const { NoteID } = req.body;
  try {
    await Notes.destroy({
      where: { NoteID },
    });
    res.status(200).send({
      message: "Successfully deleted note",
    });
  } catch (error) {
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
exports.getNotes = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { ModuleID, ModuleTypeID, MasterVersion, SearchText } = req.body;
    if (ModuleID && ModuleTypeID && MasterVersion) {
      const data = await Notes.findOne({
        where: {
          ModuleID,
          ModuleTypeID,
          MasterVersion,
          CreatedBy: currentUserId,
        },
        attributes: {
          exclude: ["ModifiedBy", "ModifiedDate"],
        },
        order: [["CreatedDate", "DESC"]],
      });
      res.status(200).send({
        data,
      });
    } else if (ModuleTypeID) {
      const data = await Notes.findAll({
        where: {
          CreatedBy: currentUserId,
          ModuleTypeID,
        },
        attributes: {
          exclude: ["ModifiedBy", "ModifiedDate"],
        },
        order: [["CreatedDate", "DESC"]],
      });
      res.status(200).send({
        data,
      });
    } else if (SearchText) {
      const data = await Notes.findAll({
        where: {
          CreatedBy: currentUserId,
          Title: { [Op.iLike]: `%${SearchText}%` },
        },
        attributes: {
          exclude: ["ModifiedBy", "ModifiedDate"],
        },
        order: [["CreatedDate", "DESC"]],
      });
      res.status(200).send({
        data,
      });
    } else {
      const data = await Notes.findAll({
        where: {
          CreatedBy: currentUserId,
          ModuleID: null,
          ModuleTypeID: null,
        },
        attributes: {
          exclude: ["ModifiedBy", "ModifiedDate"],
        },
        order: [["CreatedDate", "DESC"]],
      });
      res.status(200).send({
        data,
      });
    }
  } catch (error) {
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
exports.addRiskAndComplience = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const {
      DocumentID,
      DocumentModuleDraftID,
      MasterVersion,
      DraftVersion,
      RiskDetailsArrays,
      ComplianceDetailsArrays,
      ClauseDetailsArrays,
      RiskPropertiesDetails,
      CompliancePropertiesDetails,
      ClausePropertiesDetails,
    } = req.body;
    await RiskAndCompliences.create({
      DocumentID,
      DocumentModuleDraftID,
      MasterVersion,
      DraftVersion,
      NoOfRisk: RiskDetailsArrays.length,
      NoOfCompliance: ComplianceDetailsArrays.length,
      NoOfClause: ClauseDetailsArrays.length,
      RiskDetailsArrays,
      ClauseDetailsArrays,
      ComplianceDetailsArrays,
      RiskPropertiesDetails,
      CompliancePropertiesDetails,
      ClausePropertiesDetails,
      CreatedBy: currentUserId,
    });
    res.status(201).send({ message: "Risk and Compliance added successfully" });
  } catch (error) {
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
exports.getRiskAndComplience = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const {
      RiskAndComplianceID,
      SOPID,
      AuditorID,
      UserSignatureID,
      StakeHolderID,
      RoleID,
      DepartmentID,
    } = req.body;

    if (RiskAndComplianceID) {
      const data = await RiskAndCompliences.findOne({
        where: {
          RiskAndComplianceID,
        },
        attributes: [
          "RiskDetailsArrays",
          "ComplianceDetailsArrays",
          "ClauseDetailsArrays",
          "RiskPropertiesDetails",
          "CompliancePropertiesDetails",
          "ClausePropertiesDetails",
          "DocumentID",
        ],
      });
      res.status(200).send({
        data,
      });
    } else if (SOPID) {
      const data = await sequelize.query(
        `
          select json_agg(json_build_object('RiskDetailsArrays',rac."RiskDetailsArrays",
          'ComplianceDetailsArrays',rac."ComplianceDetailsArrays",'ClauseDetailsArrays',rac."ClauseDetailsArrays",
          'DocumentID',rac."DocumentID")) as "RiskAndComplience" ,
          sal."ContentLinkTitle"  as "DocumentName" from "SopModuleDrafts" sm 
          inner join "SopDetails" sd on sd."SopID" = sm."SOPDraftID" OR sd."SopID" = sm."SOPID"
          inner join "SopAttachmentLinks" sal on sal."SopDetailsID" = sd."SopDetailsID" 
          and sal."ContentLinkType" = 'doc'
          inner join "DocumentModuleDrafts" dm on dm."DocumentID"::text = sal."ContentLink"::text OR dm."DocumentModuleDraftID"::text = sal."ContentLink"::text
          inner join "RiskAndCompliences" rac on rac."DocumentModuleDraftID"::text = sal."ContentLink"::text OR rac."DocumentID"::text = sal."ContentLink"::text 
          and ( rac."MasterVersion"::text = dm."MasterVersion"::text OR rac."DraftVersion"::text = dm."DraftVersion"::text )
          where COALESCE(sm."SOPID",sm."SOPDraftID") = :SOPID
          group by sal."ContentLinkTitle" 
      `,
        {
          type: sequelize.QueryTypes.SELECT,
          replacements: { SOPID },
        }
      );
      res.status(200).send({
        data,
      });
    } else if (AuditorID || UserSignatureID) {
      let where = "";
      if (AuditorID) {
        where = `where :UserID = any(as2."AuditorIDs")`;
      }
      if (UserSignatureID) {
        where = `where :UserID = any(as2."SignatureIDs")`;
      }
      const data = await sequelize.query(
        `
          select json_agg(json_build_object('RiskDetailsArrays',rac."RiskDetailsArrays",
          'ComplianceDetailsArrays',rac."ComplianceDetailsArrays",'ClauseDetailsArrays',rac."ClauseDetailsArrays",
          'DocumentID',rac."DocumentID")) as "RiskAndComplience" ,
          dm."DocumentName" from "AuditorSignatures" as2 
          inner join "DocumentModules" dm on dm."DocumentID" = as2."ModuleID" 
          inner join "RiskAndCompliences" rac on rac."DocumentID" = as2."ModuleID" 
          and rac."MasterVersion"::text = dm."MasterVersion"::text ${where}
          group by dm."DocumentID" 
      `,
        {
          type: Sequelize.QueryTypes.SELECT,
          replacements: { UserID: AuditorID ? AuditorID : UserSignatureID },
        }
      );
      res.status(200).send({
        data,
      });
    } else if (RoleID || DepartmentID) {
      const { RoleID, DepartmentID } = req.body;
      let where = "";
      if (RoleID) {
        where = `where uml."RoleID" = '${RoleID}'`;
      }
      if (DepartmentID) {
        where = `where uml."DepartmentID" = '${DepartmentID}'`;
      }
      const data = await sequelize.query(
        `
        select json_agg(json_build_object('RiskDetailsArrays',rac."RiskDetailsArrays",
          'ComplianceDetailsArrays',rac."ComplianceDetailsArrays",'ClauseDetailsArrays',rac."ClauseDetailsArrays",
          'DocumentID',rac."DocumentID")) as "RiskAndComplience" ,
          dm."DocumentName" from "UserModuleLinks" uml 
          inner join "DocumentModules" dm on dm."DocumentID" = uml."ModuleID" 
          inner join "RiskAndCompliences" rac on rac."DocumentID" = uml."ModuleID" 
          and rac."MasterVersion"::text = dm."MasterVersion"::text ${where}
          group by dm."DocumentID"
        `,
        {
          type: Sequelize.QueryTypes.SELECT,
        }
      );
      res.status(200).send({
        data,
      });
    } else if (StakeHolderID) {
      const data = await sequelize.query(
        `
select json_agg(json_build_object('RiskDetailsArrays',rac."RiskDetailsArrays",
          'ComplianceDetailsArrays',rac."ComplianceDetailsArrays",'ClauseDetailsArrays',rac."ClauseDetailsArrays",
          'DocumentID',rac."DocumentID")) as "RiskAndComplience" ,
          dm."DocumentName" from "ModuleOwners" mo 
          inner join "DocumentModules" dm on dm."DocumentID" = mo."DocumentID"
          inner join "RiskAndCompliences" rac on rac."DocumentID" = mo."DocumentID"
          and rac."MasterVersion"::text = dm."MasterVersion"::text
          where mo."UserID" = :UserID
          group by dm."DocumentID"
      `,
        {
          type: Sequelize.QueryTypes.SELECT,
          replacements: { UserID: StakeHolderID },
        }
      );
      res.status(200).send({
        data,
      });
    } else {
      res.status(404).send({ message: "Request ID is required" });
      return;
    }
  } catch (error) {
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

exports.viewForm = async (req, res, next) => {
  const { FormModuleDraftID } = req.body;
  const { currentUserId } = req.payload;

  try {
    const formBuilderData = await FormModuleDraft.findOne({
      where: { FormModuleDraftID, IsDeleted: false },
      attributes: ["FormID"],
      include: [
        {
          model: FormModule,
          required: true,
          IsDeleted: false,
          attributes: ["FormJSON"],
        },
      ],
    });

    return res.status(200).json({
      message: "Form fetched successfully",
      data: {
        formBuilderData: formBuilderData?.FormModule?.FormJSON,
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

exports.fillForm = async (req, res, next) => {
  const t = await sequelize.transaction();

  const {
    FormAnswerData,
    UserModuleLinkID,
    FormModuleDraftID,
    CallBack = null,
  } = req.body;
  const { currentUserId } = req.payload;

  try {
    if (!FormAnswerData) {
      return res.status(400).json({ message: "Form answer is required" });
    }
    const questionJSON = await FormModuleDraft.findOne({
      where: { FormModuleDraftID },
      attributes: ["FormJSON"],
    });
    const extractedFormValues = helper.formatFormModuleData(
      questionJSON.toJSON().FormJSON,
      FormAnswerData
    );
    if (CallBack) {
      const FormValues = {};
      for await (const el of extractedFormValues) {
        FormValues[el.question] = el.answer;
      }
      const fetch = (await import("node-fetch")).default;
      fetch(CallBack, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ FormValues }),
      });
      await t.commit();
      return res.status(200).json({
        message: "Form submitted successfully",
      });
    }

    await FormModuleSubmission.create(
      {
        UserModuleLinkID,
        FormModuleDraftID,
        FormJSON: FormAnswerData,
        ExtractedFormValues: extractedFormValues,
        CreatedBy: currentUserId,
        CreatedDate: literal("CURRENT_TIMESTAMP"),
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(200).json({
      message: "Form submitted successfully",
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
        `SELECT "ElementID","ElementName","ElementTypeName","DueDate" FROM (
            SELECT uml."ModuleID" AS "ElementID",
                COALESCE(
                    sm."SOPName", 
                    dm."DocumentName", 
                    tsm."TrainingSimulationName", 
                    tsm2."TestSimulationName", 
                    tmm."TestMCQName", 
                    fm."FormName"
                ) AS "ElementName",
                mm."ModuleName" AS "ElementTypeName",
                uml."DueDate",
              COUNT(umal."IsAncknowledged") FILTER (WHERE umal."IsAncknowledged" IS TRUE) AS "AncknowledgedCount"
            FROM "UserModuleLinks" uml
            INNER JOIN "ModuleMasters" mm 
                ON mm."ModuleTypeID" = uml."ModuleTypeID"
            LEFT JOIN "SopModules" sm 
                ON sm."SOPID" = uml."ModuleID"
            LEFT JOIN "DocumentModules" dm 
                ON dm."DocumentID" = uml."ModuleID"
            LEFT JOIN "TrainingSimulationModules" tsm 
                ON tsm."TrainingSimulationID" = uml."ModuleID"
            LEFT JOIN "TestSimulationModules" tsm2 
                ON tsm2."TestSimulationID" = uml."ModuleID"
            LEFT JOIN "TestMcqsModules" tmm 
                ON tmm."TestMCQID" = uml."ModuleID"
            LEFT JOIN "FormModules" fm 
                ON fm."FormID" = uml."ModuleID"
            LEFT JOIN "UserModuleAccessLogs" umal ON umal."ModuleID" = uml."ModuleID" AND umal."UserID" = uml."UserID"
            WHERE
                uml."UserID" = :UserID
                AND COALESCE(
                    sm."SOPName", 
                    dm."DocumentName", 
                    tsm."TrainingSimulationName", 
                    tsm2."TestSimulationName", 
                    tmm."TestMCQName", 
                    fm."FormName"
                ) IS NOT NULL
              AND sm."IsDeleted" IS NOT TRUE
                    AND dm."IsDeleted" IS NOT TRUE
                    AND tsm."IsDeleted" IS NOT TRUE
                    AND tsm2."IsDeleted" IS NOT TRUE
                    AND tmm."IsDeleted" IS NOT TRUE
                    AND fm."IsDeleted" IS NOT TRUE
                    AND uml."IsDeleted" IS NOT TRUE
            GROUP BY sm."SOPName", 
                    dm."DocumentName", 
                    tsm."TrainingSimulationName", 
                    tsm2."TestSimulationName", 
                    tmm."TestMCQName", 
                    fm."FormName",
                mm."ModuleName",
                uml."DueDate",
                uml."ModuleID"
                ) AS p WHERE "AncknowledgedCount" = 0 AND "DueDate" >= CURRENT_TIMESTAMP;
      `,
        {
          type: Sequelize.QueryTypes.SELECT,
          replacements: { UserID: currentUserId },
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
          type: Sequelize.QueryTypes.SELECT,
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
          type: Sequelize.QueryTypes.SELECT,
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
            WHEN dmd."EscalationType" = 'Minutes' THEN dmd."CreatedDate" + INTERVAL '1 minute' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Hours' THEN dmd."CreatedDate" + INTERVAL '1 hour' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Days' THEN dmd."CreatedDate" + INTERVAL '1 day' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Weeks' THEN dmd."CreatedDate" + INTERVAL '1 week' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Months' THEN dmd."CreatedDate" + INTERVAL '1 month' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Years' THEN dmd."CreatedDate" + INTERVAL '1 year' * dmd."EscalationAfter"
            ELSE dmd."CreatedDate"
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
            WHEN dmd."EscalationType" = 'Minutes' THEN dmd."CreatedDate" + INTERVAL '1 minute' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Hours' THEN dmd."CreatedDate" + INTERVAL '1 hour' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Days' THEN dmd."CreatedDate" + INTERVAL '1 day' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Weeks' THEN dmd."CreatedDate" + INTERVAL '1 week' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Months' THEN dmd."CreatedDate" + INTERVAL '1 month' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Years' THEN dmd."CreatedDate" + INTERVAL '1 year' * dmd."EscalationAfter"
            ELSE dmd."CreatedDate"
          END AS "EscalationDate",
          MAX(msh."ModifiedDate") FILTER (WHERE msh."ApprovalStatus" IS NOT NULL) AS "ActionDate",
          ROW_NUMBER() OVER (PARTITION BY dmd."DocumentID" ORDER BY dmd."CreatedDate" DESC) AS rn,
          count(msh."DocumentModuleDraftID") FILTER (WHERE msh."ApprovalStatus" ='Rejected') as reject_count,
          count(msh."SOPDraftID") as total_count from "ModuleStakeHolders" msh
          inner join "DocumentModuleDrafts" dmd on dmd."DocumentModuleDraftID" = msh."DocumentModuleDraftID"
          where dmd."IsDeleted" is not true and dmd."DocumentStatus" = 'InProgress'
          group by dmd."DocumentModuleDraftID",dmd."NeedAcceptance",dmd."DocumentName"
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

          EscalatorDocument as (
          select dmd."DocumentModuleDraftID" AS "ModuleDraftID" ,dmd."DocumentName" AS "ModuleName",
          sum (case when me."ApprovalStatus" is not null then 1 else 0 end) as action_count,'Document' AS "ModuleType",'Escalator' as "ActionType",
          CASE
            WHEN dmd."EscalationType" = 'Minutes' THEN dmd."CreatedDate" + INTERVAL '1 minute' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Hours' THEN dmd."CreatedDate" + INTERVAL '1 hour' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Days' THEN dmd."CreatedDate" + INTERVAL '1 day' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Weeks' THEN dmd."CreatedDate" + INTERVAL '1 week' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Months' THEN dmd."CreatedDate" + INTERVAL '1 month' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Years' THEN dmd."CreatedDate" + INTERVAL '1 year' * dmd."EscalationAfter"
            ELSE dmd."CreatedDate"
          END AS "EscalationDate",me."IsReviewer",me."IsStakeHolder",
          MAX(me."ModifiedDate") FILTER (WHERE me."ApprovalStatus" IS NOT NULL) AS "ActionDate",
          ROW_NUMBER() OVER (PARTITION BY dmd."DocumentID" ORDER BY dmd."CreatedDate" DESC) AS rn,
          COUNT(me."DocumentModuleDraftID") FILTER (WHERE me."ApprovalStatus" ='Rejected') as reject_count,
          count(me."DocumentModuleDraftID") as total_count from "ModuleEscalations" me
          inner join "DocumentModuleDrafts" dmd on dmd."DocumentModuleDraftID" = me."DocumentModuleDraftID"
          where dmd."IsDeleted" is not true and dmd."DocumentStatus" = 'InProgress'
          group by dmd."DocumentModuleDraftID",dmd."DocumentName",me."IsReviewer",me."IsStakeHolder"
          ),
          AproverSOP as (
          select smd."SOPDraftID" AS "ModuleDraftID",smd."SOPName" AS "ModuleName",MAX(ma."ModifiedDate") FILTER (WHERE ma."ApprovalStatus" IS NOT NULL) as "ActionDate",
          sum (case when ma."ApprovalStatus" is not null then 1 else 0 end) as action_count,'SOP' AS "ModuleType",'Approver' as "ActionType",
          ROW_NUMBER() OVER (PARTITION BY smd."SOPID" ORDER BY smd."CreatedDate" DESC) AS rn,
          count(ma."SOPDraftID") FILTER (WHERE ma."ApprovalStatus" ='Rejected') as reject_count,
          count(smd."SOPDraftID") as total_count from "ModuleApprovers" ma
          inner join "SopModuleDrafts" smd on smd."SOPDraftID" = ma."SOPDraftID"
          where smd."IsDeleted" is not true and smd."SOPStatus" = 'InProgress'
          group by smd."SOPDraftID",smd."SOPName"
          ),
          AproverDocument as (
          select dmd."DocumentModuleDraftID" AS "ModuleDraftID" ,dmd."DocumentName" AS "ModuleName",MAX(ma."ModifiedDate") FILTER (WHERE ma."ApprovalStatus" IS NOT NULL) as "ActionDate",
          sum (case when ma."ApprovalStatus" is not null then 1 else 0 end) as action_count,'Document' AS "ModuleType",'Approver' as "ActionType",
          ROW_NUMBER() OVER (PARTITION BY dmd."DocumentID" ORDER BY dmd."CreatedDate" DESC) AS rn,
          count(ma."DocumentModuleDraftID") FILTER (WHERE ma."ApprovalStatus" ='Rejected') as reject_count,
          count(ma."DocumentModuleDraftID") as total_count from "ModuleApprovers" ma
          inner join "DocumentModuleDrafts" dmd on dmd."DocumentModuleDraftID" = ma."DocumentModuleDraftID"
          where dmd."IsDeleted" is not true and dmd."DocumentStatus" = 'InProgress'
          group by dmd."DocumentModuleDraftID",dmd."DocumentName"
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
                    WHERE mc."IsReviewer" = true
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
                    WHERE mc."IsStakeHolder" = true
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
            LEFT join CheckerSOP cs on  cs."ModuleDraftID" = smd."SOPDraftID"
            WHERE case when mc."ApprovalStatus" is null and cs."EscalationDate" >= CURRENT_TIMESTAMP then true else false end
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
            LEFT join CheckerDocument cd on  cd."ModuleDraftID" = dmd."DocumentModuleDraftID"
            WHERE case when mc."ApprovalStatus" is null and cd."EscalationDate" >= CURRENT_TIMESTAMP then true else false end
            AND CASE WHEN cd."NeedAcceptance" IS TRUE THEN cd.action_count != cd.total_count
            WHEN cd."NeedAcceptance" IS NOT TRUE THEN cd.action_count = 0 ELSE false END
            and cd.rn = 1 AND cd.reject_count = 0
            group by cd."ModuleDraftID" ,cd."ModuleName",cd."ModuleType",cd."ActionType",cd."EscalationDate",mc."UserID",cu."UserDetails",ud."UserFirstName",ud."UserLastName",ud."UserMiddleName"

            union all

            select es."ModuleDraftID" ,es."ModuleName",es."ModuleType",es."ActionType",es."EscalationDate",me."UserID",cu."UserDetails",
            ud."UserFirstName",ud."UserLastName",ud."UserMiddleName" from "SopModuleDrafts" smd
            inner join "ModuleEscalations" me on me."SOPDraftID" = smd."SOPDraftID"
            inner join EscalatorSOP es on  es."ModuleDraftID" = smd."SOPDraftID"
            inner join CheckerSOP cs on  cs."ModuleDraftID" = smd."SOPDraftID"
            INNER JOIN ApproverUsers cu on cu."ModuleDraftID" = smd."SOPDraftID"
            inner join "UserDetails" ud on ud."UserID" = smd."CreatedBy"
            WHERE case when me."ApprovalStatus" is null and es."EscalationDate" < CURRENT_TIMESTAMP
            and es.action_count = 0 then true else false end
            and case when cs."NeedAcceptance" IS TRUE then cs.action_count != cs.total_count
            when cs."NeedAcceptance" IS NOT TRUE then cs.action_count = 0 else false end
            and es.rn = 1
            group by es."ModuleDraftID" ,es."ModuleName",es."ModuleType",es."ActionType",es."EscalationDate",me."UserID",cu."UserDetails",ud."UserFirstName",ud."UserLastName",ud."UserMiddleName"

            union all

            select ed."ModuleDraftID" ,ed."ModuleName",ed."ModuleType",ed."ActionType",ed."EscalationDate",me."UserID",cu."UserDetails",
            ud."UserFirstName",ud."UserLastName",ud."UserMiddleName" from "DocumentModuleDrafts" dmd
            inner join "ModuleEscalations" me on me."DocumentModuleDraftID" = dmd."DocumentModuleDraftID"
            inner join EscalatorDocument ed on  ed."ModuleDraftID" = dmd."DocumentModuleDraftID"
            inner join CheckerDocument cd on  cd."ModuleDraftID" = dmd."DocumentModuleDraftID"
            inner join SteakHolderDocument sd on  sd."ModuleDraftID" = dmd."DocumentModuleDraftID"
			      INNER JOIN ApproverUsers cu on cu."ModuleDraftID" = dmd."DocumentModuleDraftID"
            inner join "UserDetails" ud on ud."UserID" = dmd."CreatedBy"
            WHERE case when me."ApprovalStatus" is null and ed."EscalationDate" < CURRENT_TIMESTAMP
            and ed.action_count = 0 then true else false end
            and (case when cd."NeedAcceptance" IS TRUE then cd.action_count != cd.total_count
            when cd."NeedAcceptance" IS NOT TRUE then cd.action_count = 0 else false end
            or case when sd."NeedAcceptance" IS TRUE then sd.action_count != sd.total_count
            when sd."NeedAcceptance" IS NOT TRUE then sd.action_count = 0 else false end)
            and ed.rn = 1
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
            INNER JOIN ApproverUsers cu on cu."ModuleDraftID" = mc."DocumentModuleDraftID"
            inner join "UserDetails" ud on ud."UserID" = dmd."CreatedBy"
            WHERE case when mc."ApprovalStatus" is null and cd."EscalationDate" >= CURRENT_TIMESTAMP then true else false end
            and cd.rn = 1
            group by cd."ModuleDraftID" ,cd."ModuleName",cd."ModuleType",cd."ActionType",cd."EscalationDate",mc."UserID",ud."UserFirstName",ud."UserLastName",ud."UserMiddleName",cu."UserDetails"
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
            inner join AproverSOP asd on  asd."ModuleDraftID" = smd."SOPDraftID"
            inner join CheckerSOP cs on  cs."ModuleDraftID" = smd."SOPDraftID"
            inner join EscalatorSOP es on  es."ModuleDraftID" = smd."SOPDraftID"
            inner join CheckerUsers cu on cu."ModuleDraftID" = smd."SOPDraftID"
            inner join "UserDetails" ud on ud."UserID" = smd."CreatedBy"
            WHERE ma."ApprovalStatus" is null and (es.action_count > 0 or
            case when cs."NeedAcceptance" = true then cs.action_count = cs.total_count
            when cs."NeedAcceptance" = false then cs.action_count > 0 else false end)
            and asd.rn = 1 and cs.reject_count = 0 and es.reject_count = 0
            group by asd."ModuleDraftID" ,asd."ModuleName",asd."ModuleType",asd."ActionType",ma."UserID",cu."UserDetails",
            ud."UserFirstName",ud."UserLastName",ud."UserMiddleName",
            case when es."ActionDate" is not null then es."ActionDate" else cs."ActionDate" end

            union all
            select ad."ModuleDraftID" ,ad."ModuleName",ad."ModuleType",ad."ActionType",ma."UserID",cu."UserDetails",
            ud."UserFirstName",ud."UserLastName",ud."UserMiddleName",
            case when ed."ActionDate" is not null then ed."ActionDate" else cd."ActionDate" end as "ActionDate" from "DocumentModuleDrafts" dmd
            inner join "ModuleApprovers" ma on ma."DocumentModuleDraftID" = dmd."DocumentModuleDraftID"
            inner join AproverDocument ad on  ad."ModuleDraftID" = dmd."DocumentModuleDraftID"
            inner join CheckerDocument cd on  cd."ModuleDraftID" = dmd."DocumentModuleDraftID"
            inner join EscalatorDocument ed on  ed."ModuleDraftID" = dmd."DocumentModuleDraftID"
            inner join CheckerUsers cu on cu."ModuleDraftID" = dmd."DocumentModuleDraftID"
            inner join "UserDetails" ud on ud."UserID" = dmd."CreatedBy"
            WHERE ma."ApprovalStatus" is null and (ed.action_count > 0 or
            case when cd."NeedAcceptance" = true then cd.action_count = cd.total_count
            when cd."NeedAcceptance" = false then cd.action_count > 0 else false end)
            and ad.rn = 1 and cd.reject_count = 0 and ed.reject_count = 0
            group by ad."ModuleDraftID" ,ad."ModuleName",ad."ModuleType",ad."ActionType",ma."UserID",cu."UserDetails",
            ud."UserFirstName",ud."UserLastName",ud."UserMiddleName",
            case when ed."ActionDate" is not null then ed."ActionDate" else cd."ActionDate" end
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
            inner join EscalatorDocument ed on  ed."ModuleDraftID" = dmd."DocumentModuleDraftID"
            inner join "UserDetails" ud on ud."UserID" = dmd."CreatedBy"
            WHERE mc."ApprovalStatus" is null and COALESCE(cd."EscalationDate", sd."EscalationDate") < CURRENT_TIMESTAMP and ed.action_count = 0
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
            and case when cs."NeedAcceptance" = true then cs.action_count != cs.total_count
            when cs."NeedAcceptance" = false then cs.action_count = 0 else false end
            and cs.rn = 1
            group by cs."ModuleDraftID" ,cs."ModuleName",cs."ModuleType",cs."ActionType",cs."EscalationDate",mc."UserID",ud."UserFirstName",ud."UserLastName",ud."UserMiddleName"
            union all
            select cd."ModuleDraftID" ,cd."ModuleName",cd."ModuleType",cd."ActionType",cd."EscalationDate",mc."UserID",
            ud."UserFirstName",ud."UserLastName",ud."UserMiddleName"
            from "DocumentModuleDrafts" dmd
            inner join "ModuleCheckers" mc on mc."DocumentModuleDraftID" = dmd."DocumentModuleDraftID"
            inner join CheckerDocument cd on  cd."ModuleDraftID" = dmd."DocumentModuleDraftID"
            inner join SteakHolderDocument sd on  sd."ModuleDraftID" = dmd."DocumentModuleDraftID"
            inner join EscalatorDocument ed on  ed."ModuleDraftID" = dmd."DocumentModuleDraftID"
            inner join "UserDetails" ud on ud."UserID" = dmd."CreatedBy"
            WHERE ed.action_count = 0 and cd.reject_count = 0
            and (case when cd."NeedAcceptance" = true then cd.action_count != cd.total_count
            when cd."NeedAcceptance" = false then cd.action_count = 0 else false end
            or case when sd."NeedAcceptance" = true then sd.action_count != sd.total_count
            when sd."NeedAcceptance" = false then sd.action_count = 0 else false end)
            and cd.rn = 1
            group by cd."ModuleDraftID" ,cd."ModuleName",cd."ModuleType",cd."ActionType",cd."EscalationDate",mc."UserID",ud."UserFirstName",ud."UserLastName",ud."UserMiddleName"
      ) as ongoing_review_data
      GROUP BY "UserID"
      ),
      ApprovedData as (
        SELECT * FROM (
              select
                COALESCE("UserID","CreatedBy") AS "UserID",
                  jsonb_agg(
                    jsonb_build_object(
                      'ModuleDraftID', "ModuleDraftID",
                      'ModuleName', "ModuleName",
                      'ModuleType', "ModuleType",
                      'EscalationDate', COALESCE("ModifiedDate", "CreatedDate"),
                      'ActionType', 'Approved',
                      'CreatedBy', CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName")
                    )
                  ) AS "Approved" from (
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
          GROUP BY "UserID", "CreatedBy"
        ) AS final_approved_data
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
                  'ActionType', "ActionType"
                )
              ) AS "MyCompletion" FROM (
      SELECT COALESCE(mc."SOPDraftID", mc."DocumentModuleDraftID") AS "ModuleDraftID",
      COALESCE(smd."SOPName", dmd."DocumentName") AS "ModuleName",'Checker' AS "ActionType",
      CASE
        WHEN mc."SOPDraftID" IS NOT NULL THEN 'SOP'
        WHEN mc."DocumentModuleDraftID" IS NOT NULL THEN 'Document'
        ELSE NULL
      END AS "ModuleType",mc."ModifiedDate",au."UserDetails",
      mc."UserID",ud."UserFirstName", ud."UserLastName", ud."UserMiddleName"
      FROM "ModuleCheckers" mc
      INNER JOIN "UserDetails" ud ON ud."UserID" = mc."CreatedBy"
      LEFT JOIN "SopModuleDrafts" smd ON smd."SOPDraftID" = mc."SOPDraftID"
      LEFT JOIN "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
      LEFT JOIN ActionUsers au ON au."ModuleDraftID" = COALESCE(mc."SOPDraftID", mc."DocumentModuleDraftID")
      WHERE mc."ApprovalStatus" is not null
      GROUP BY mc."SOPDraftID", mc."DocumentModuleDraftID", smd."SOPName", dmd."DocumentName", mc."ModifiedDate", mc."UserID", ud."UserFirstName", ud."UserLastName", ud."UserMiddleName", au."UserDetails"
      UNION ALL
      SELECT ma."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName",'StakeHolder' AS "ActionType",
      'Document' AS "ModuleType",ma."ModifiedDate",au."UserDetails",
      ma."UserID",ud."UserFirstName", ud."UserLastName", ud."UserMiddleName"
      FROM "ModuleStakeHolders" ma
      INNER JOIN "UserDetails" ud ON ud."UserID" = ma."CreatedBy"
      LEFT JOIN "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = ma."DocumentModuleDraftID"
      LEFT JOIN ActionUsers au ON au."ModuleDraftID" = ma."DocumentModuleDraftID"
      WHERE ma."ApprovalStatus" is not null
      GROUP BY ma."SOPDraftID", ma."DocumentModuleDraftID", dmd."DocumentName", ma."ModifiedDate", ma."UserID", ud."UserFirstName", ud."UserLastName", ud."UserMiddleName", au."UserDetails"
      UNION ALL
      SELECT COALESCE(ma."SOPDraftID", ma."DocumentModuleDraftID") AS "ModuleDraftID",
      COALESCE(smd."SOPName", dmd."DocumentName") AS "ModuleName",'Escalator' AS "ActionType",
      CASE
        WHEN ma."SOPDraftID" IS NOT NULL THEN 'SOP'
        WHEN ma."DocumentModuleDraftID" IS NOT NULL THEN 'Document'
        ELSE NULL
      END AS "ModuleType",ma."ModifiedDate",au."UserDetails",
      ma."UserID",ud."UserFirstName", ud."UserLastName", ud."UserMiddleName"
      FROM "ModuleEscalations" ma
      INNER JOIN "UserDetails" ud ON ud."UserID" = ma."CreatedBy"
      LEFT JOIN "SopModuleDrafts" smd ON smd."SOPDraftID" = ma."SOPDraftID"
      LEFT JOIN "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = ma."DocumentModuleDraftID"
      LEFT JOIN ActionUsers au ON au."ModuleDraftID" = COALESCE(ma."SOPDraftID", ma."DocumentModuleDraftID")
      WHERE ma."ApprovalStatus" is not null
      GROUP BY ma."SOPDraftID", ma."DocumentModuleDraftID", smd."SOPName", dmd."DocumentName", ma."ModifiedDate", ma."UserID", ud."UserFirstName", ud."UserLastName", ud."UserMiddleName",au."UserDetails"
      UNION ALL
      SELECT COALESCE(ma."SOPDraftID", ma."DocumentModuleDraftID") AS "ModuleDraftID",
      COALESCE(smd."SOPName", dmd."DocumentName") AS "ModuleName",'Approver' AS "ActionType",
      CASE
        WHEN ma."SOPDraftID" IS NOT NULL THEN 'SOP'
        WHEN ma."DocumentModuleDraftID" IS NOT NULL THEN 'Document'
        ELSE NULL
      END AS "ModuleType",ma."ModifiedDate",au."UserDetails",
      ma."UserID",ud."UserFirstName", ud."UserLastName", ud."UserMiddleName"
      FROM "ModuleApprovers" ma
      INNER JOIN "UserDetails" ud ON ud."UserID" = ma."CreatedBy"
      LEFT JOIN "SopModuleDrafts" smd ON smd."SOPDraftID" = ma."SOPDraftID"
      LEFT JOIN "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = ma."DocumentModuleDraftID"
      LEFT JOIN ActionUsers au ON au."ModuleDraftID" = COALESCE(ma."SOPDraftID", ma."DocumentModuleDraftID")
      WHERE ma."ApprovalStatus" is not null
      GROUP BY ma."SOPDraftID", ma."DocumentModuleDraftID", smd."SOPName", dmd."DocumentName", ma."ModifiedDate", ma."UserID", ud."UserFirstName", ud."UserLastName", ud."UserMiddleName",au."UserDetails"
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
        AND sd.rn = 1 AND sd."EscalationDate" >= CURRENT_TIMESTAMP
        AND CASE WHEN sd."NeedAcceptance" = true THEN sd.action_count != sd.total_count
        WHEN sd."NeedAcceptance" = false THEN sd.action_count = 0 ELSE false END
        GROUP BY dmd."DocumentModuleDraftID", dmd."DocumentName", dmd."CreatedBy", sd."EscalationDate", su."UserDetails"

        UNION ALL

       SELECT dmd."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName", 'Document' AS "ModuleType",
       dmd."CreatedBy",ed."EscalationDate" AS "EscalationDate",su."UserDetails"
       FROM "DocumentModuleDrafts" dmd 
        LEFT JOIN SteakHolderDocument sd ON sd."ModuleDraftID" = dmd."DocumentModuleDraftID"
        LEFT JOIN EscalatorDocument ed ON ed."ModuleDraftID" = dmd."DocumentModuleDraftID"
        LEFT JOIN SteakHolderUsers su ON su."ModuleDraftID" = dmd."DocumentModuleDraftID"
        WHERE dmd."IsDeleted" = false AND dmd."DocumentStatus" = 'InProgress'
        AND ed.action_count = 0 AND sd.rn = 1 AND sd."EscalationDate" < CURRENT_TIMESTAMP
        AND CASE WHEN sd."NeedAcceptance" = true THEN sd.action_count != sd.total_count
        WHEN sd."NeedAcceptance" = false THEN sd.action_count = 0 ELSE false END
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
        AND cs.rn = 1 AND cs."EscalationDate" >= CURRENT_TIMESTAMP  
        AND CASE WHEN cs."NeedAcceptance" = true THEN cs.action_count != cs.total_count
        WHEN cs."NeedAcceptance" = false THEN cs.action_count = 0 ELSE false END
        GROUP BY smd."SOPDraftID", smd."SOPName", smd."CreatedBy", cs."EscalationDate", su."UserDetails"
        UNION ALL
        SELECT dmd."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName", 'Document' AS "ModuleType",
        dmd."CreatedBy", cd."EscalationDate" AS "EscalationDate", su."UserDetails"
        FROM "DocumentModuleDrafts" dmd
        LEFT JOIN CheckerDocument cd ON cd."ModuleDraftID" = dmd."DocumentModuleDraftID"
        LEFT JOIN ActionUsers su ON su."ModuleDraftID" = dmd."DocumentModuleDraftID"
        WHERE dmd."DocumentStatus" = 'InProgress' AND dmd."IsDeleted" = false
        AND cd.rn = 1 AND cd."EscalationDate" >= CURRENT_TIMESTAMP
        AND CASE WHEN cd."NeedAcceptance" = true THEN cd.action_count != cd.total_count
        WHEN cd."NeedAcceptance" = false THEN cd.action_count = 0 ELSE false END
        GROUP BY dmd."DocumentModuleDraftID", dmd."DocumentName", dmd."CreatedBy", cd."EscalationDate", su."UserDetails"
        UNION ALL
        SELECT smd."SOPDraftID" AS "ModuleDraftID", smd."SOPName" AS "ModuleName", 'SOP' AS "ModuleType",
        smd."CreatedBy", es."EscalationDate" AS "EscalationDate", su."UserDetails"
        FROM "SopModuleDrafts" smd
        LEFT JOIN EscalatorSOP es ON es."ModuleDraftID" = smd."SOPDraftID"
        LEFT JOIN CheckerSOP cs ON cs."ModuleDraftID" = smd."SOPDraftID"
        LEFT JOIN ActionUsers su ON su."ModuleDraftID" = smd."SOPDraftID"
        WHERE smd."SOPStatus" = 'InProgress' AND smd."IsDeleted" = false
        AND es.action_count = 0 AND es.rn = 1 AND es."EscalationDate" < CURRENT_TIMESTAMP
        AND CASE WHEN cs."NeedAcceptance" = true THEN cs.action_count != cs.total_count
        WHEN cs."NeedAcceptance" = false THEN cs.action_count = 0 ELSE false END
        GROUP BY smd."SOPDraftID", smd."SOPName", smd."CreatedBy", es."EscalationDate", su."UserDetails"
        UNION ALL
        SELECT dmd."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName", 'Document' AS "ModuleType",
        dmd."CreatedBy", ed."EscalationDate" AS "EscalationDate", su."UserDetails"
        FROM "DocumentModuleDrafts" dmd
        LEFT JOIN EscalatorDocument ed ON ed."ModuleDraftID" = dmd."DocumentModuleDraftID"
        LEFT JOIN CheckerDocument cd ON cd."ModuleDraftID" = dmd."DocumentModuleDraftID"
        LEFT JOIN ActionUsers su ON su."ModuleDraftID" = dmd."DocumentModuleDraftID"
        WHERE dmd."DocumentStatus" = 'InProgress' AND dmd."IsDeleted" = false
        AND ed.action_count = 0 AND ed.rn = 1 AND ed."EscalationDate" < CURRENT_TIMESTAMP
        AND CASE WHEN cd."NeedAcceptance" = true THEN cd.action_count != cd.total_count
        WHEN cd."NeedAcceptance" = false THEN cd.action_count = 0 ELSE false END
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
        AND cs.rn = 1 AND CASE WHEN cs."NeedAcceptance" = true THEN cs.action_count = cs.total_count
        WHEN cs."NeedAcceptance" = false THEN cs.action_count > 0 ELSE false END
        AND cs.reject_count = 0
        GROUP BY smd."SOPDraftID", smd."SOPName", smd."CreatedBy", su."UserDetails"
        UNION ALL
        SELECT dmd."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName", 'Document' AS "ModuleType",
        dmd."CreatedBy", MAX(cd."ActionDate") AS "EscalationDate", su."UserDetails"
        FROM "DocumentModuleDrafts" dmd
        LEFT JOIN CheckerDocument cd ON cd."ModuleDraftID" = dmd."DocumentModuleDraftID"
        LEFT JOIN ActionUsers su ON su."ModuleDraftID" = dmd."DocumentModuleDraftID"
        WHERE dmd."DocumentStatus" = 'InProgress' AND dmd."IsDeleted" = false
        AND cd.rn = 1 AND CASE WHEN cd."NeedAcceptance" = true THEN cd.action_count = cd.total_count
        WHEN cd."NeedAcceptance" = false THEN cd.action_count > 0 ELSE false END
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
        LEFT JOIN EscalatorDocument ed ON ed."ModuleDraftID" = dmd."DocumentModuleDraftID"
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
      mc."UserID", smd."ModifiedDate" AS "EscalationDate",
      'Checker' AS "ActionType"
      FROM "ModuleCheckers" mc
      INNER JOIN CheckerSOP cs ON cs."ModuleDraftID" = mc."SOPDraftID"
      INNER JOIN "SopModuleDrafts" smd ON smd."SOPDraftID" = mc."SOPDraftID"
      WHERE mc."ApprovalStatus" = 'Rejected' AND smd."SOPStatus" = 'InProgress' AND smd."IsDeleted" = false
      AND cs.rn = 1
      GROUP BY mc."SOPDraftID", smd."SOPName", mc."UserID", smd."ModifiedDate", mc."ApprovalStatus"
      UNION ALL
      SELECT ma."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName", 'Document' AS "ModuleType",
      ma."UserID", dmd."ModifiedDate" AS "EscalationDate",
      'Checker' AS "ActionType"
      FROM "ModuleCheckers" ma
      INNER JOIN CheckerDocument cd ON cd."ModuleDraftID" = ma."DocumentModuleDraftID"
      INNER JOIN "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = ma."DocumentModuleDraftID"
      WHERE ma."ApprovalStatus" = 'Rejected' AND dmd."DocumentStatus" = 'InProgress' AND dmd."IsDeleted" = false
      AND cd.rn = 1
      GROUP BY ma."DocumentModuleDraftID", dmd."DocumentName", ma."UserID", dmd."ModifiedDate", ma."ApprovalStatus"
      UNION ALL
      SELECT ms."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName", 'Document' AS "ModuleType",
      ms."UserID", ms."ModifiedDate" AS "EscalationDate",
      'StakeHolder' AS "ActionType"
      FROM "ModuleStakeHolders" ms
      INNER JOIN SteakHolderDocument sd ON sd."ModuleDraftID" = ms."DocumentModuleDraftID"
      INNER JOIN "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = ms."DocumentModuleDraftID"
      WHERE ms."ApprovalStatus" = 'Rejected' AND dmd."DocumentStatus" = 'InProgress' AND dmd."IsDeleted" = false
      AND sd.rn = 1
      GROUP BY ms."DocumentModuleDraftID", dmd."DocumentName", ms."UserID", ms."ModifiedDate", ms."ApprovalStatus"
      UNION ALL
      SELECT mc."SOPDraftID" AS "ModuleDraftID", smd."SOPName" AS "ModuleName", 'SOP' AS "ModuleType",
      mc."UserID", es."EscalationDate" AS "EscalationDate",
      'Escalator' AS "ActionType"
      FROM "ModuleEscalations" mc
      INNER JOIN EscalatorSOP es ON es."ModuleDraftID" = mc."SOPDraftID"
      INNER JOIN "SopModuleDrafts" smd ON smd."SOPDraftID" = mc."SOPDraftID"
      WHERE mc."ApprovalStatus" = 'Rejected' AND smd."SOPStatus" = 'InProgress' AND smd."IsDeleted" = false
      AND es.rn = 1
      GROUP BY mc."SOPDraftID", smd."SOPName", mc."UserID", es."EscalationDate", mc."ApprovalStatus"
      UNION ALL
      SELECT ma."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName", 'Document' AS "ModuleType",
      ma."UserID", ed."EscalationDate" AS "EscalationDate",
      'Escalator' AS "ActionType"
      FROM "ModuleEscalations" ma
      INNER JOIN EscalatorDocument ed ON ed."ModuleDraftID" = ma."DocumentModuleDraftID"
      INNER JOIN "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = ma."DocumentModuleDraftID"
      WHERE ma."ApprovalStatus" = 'Rejected' AND dmd."DocumentStatus" = 'InProgress' AND dmd."IsDeleted" = false
      AND ed.rn = 1
      GROUP BY ma."DocumentModuleDraftID", dmd."DocumentName", ma."UserID", ed."EscalationDate", ma."ApprovalStatus"
      UNION ALL
      SELECT ma."SOPDraftID" AS "ModuleDraftID", smd."SOPName" AS "ModuleName", 'SOP' AS "ModuleType",
      ma."UserID", smd."ModifiedDate" AS "EscalationDate",  
      'Approver' AS "ActionType"
      FROM "ModuleApprovers" ma
      INNER JOIN AproverSOP as asop ON asop."ModuleDraftID" = ma."SOPDraftID"
      INNER JOIN "SopModuleDrafts" smd ON smd."SOPDraftID" = ma."SOPDraftID"
      WHERE ma."ApprovalStatus" = 'Rejected' AND smd."SOPStatus" = 'InProgress' AND smd."IsDeleted" = false
      AND asop.rn = 1
      GROUP BY ma."SOPDraftID", smd."SOPName", ma."UserID", smd."ModifiedDate", ma."ApprovalStatus"
      UNION ALL
      SELECT ma."DocumentModuleDraftID" AS "ModuleDraftID", dmd."DocumentName" AS "ModuleName", 'Document' AS "ModuleType",
      ma."UserID", dmd."ModifiedDate" AS "EscalationDate",
      'Approver' AS "ActionType"
      FROM "ModuleApprovers" ma
      INNER JOIN AproverDocument adoc ON adoc."ModuleDraftID" = ma."DocumentModuleDraftID"
      INNER JOIN "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = ma."DocumentModuleDraftID"
      WHERE ma."ApprovalStatus" = 'Rejected' AND dmd."DocumentStatus" = 'InProgress' AND dmd."IsDeleted" = false
      AND adoc.rn = 1
      GROUP BY ma."DocumentModuleDraftID", dmd."DocumentName", ma."UserID", dmd."ModifiedDate", ma."ApprovalStatus"
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

exports.moveToOtherFolder = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { FileIDs, ModuleTypeID, MovingFolderID, ModuleName } = req.body;
  const { currentUserId } = req.payload;
  try {
    const moduleConfig = moduleMapping[ModuleName];

    if (!moduleConfig) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid module name" });
    }

    const { idField, draftIdField, model, draftModel } = moduleConfig;

    if (!draftModel || !model || !idField || !draftIdField) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid module configuration" });
    }

    // First, check if any files exist before attempting to move
    const existingMainRecords = await model.findAll({
      where: {
        ModuleTypeID,
        [idField]: {
          [Op.in]: FileIDs,
        },
      },
      attributes: [idField, "ContentID"],
      transaction: t,
    });

    if (existingMainRecords.length === 0) {
      await t.rollback();
      return res.status(404).json({
        message: `No ${ModuleName} files found with the provided IDs in the specified module type`,
      });
    }

    // Determine the correct field name for draft model lookup
    // Draft records are linked to main records via foreign key, not by their own primary key
    let draftWhereField;

    switch (ModuleName) {
      case "SOP":
        draftWhereField = "SOPID";
        break;
      case "Document":
        draftWhereField = "DocumentID";
        break;
      case "TestMCQ":
        draftWhereField = "TestMCQID";
        break;
      case "SkillBuilding":
        draftWhereField = "TrainingSimulationID";
        break;
      case "SkillAssessment":
        draftWhereField = "TestSimulationID";
        break;
      case "Form":
        draftWhereField = "FormID";
        break;
      default:
        // Fallback to idField if no specific mapping
        draftWhereField = idField;
    }

    logger.info({
      message: `Moving ${ModuleName} files - found ${existingMainRecords.length} existing records`,
      details: {
        FileIDs,
        ModuleTypeID,
        MovingFolderID,
        idField,
        draftIdField,
        draftWhereField,
      },
      UserID: currentUserId,
    });

    // For most modules, update both main and draft records
    let updatePromises = [];

    // Update main model records
    updatePromises.push(
      model.update(
        {
          ContentID: MovingFolderID,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: {
            ModuleTypeID,
            [idField]: {
              [Op.in]: FileIDs,
            },
            ContentID: {
              [Op.ne]: MovingFolderID, // Only move files not already in the target folder
            },
          },
          transaction: t,
        }
      )
    );
    // Update draft records using the foreign key field
    updatePromises.push(
      draftModel.update(
        {
          ContentID: MovingFolderID,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: {
            ModuleTypeID,
            [draftWhereField]: {
              [Op.in]: FileIDs,
            },
            ContentID: {
              [Op.ne]: MovingFolderID, // Only move files not already in the target folder
            },
          },
          transaction: t,
        }
      )
    );

    const updateResults = await Promise.all(updatePromises);
    const totalAffectedRows = updateResults[0][0] + updateResults[1][0];

    logger.info({
      message: `Move operation completed`,
      details: {
        mainModelAffectedRows: updateResults[0][0],
        draftModelAffectedRows: updateResults[1][0],
        totalAffectedRows,
      },
      UserID: currentUserId,
    });

    if (totalAffectedRows === 0) {
      await t.rollback();
      return res.status(400).json({
        message:
          "No files were moved. Files may already be in the target folder or not found.",
      });
    }

    await t.commit();
    return res.status(200).json({
      message: "Files moved successfully",
      details: {
        filesProcessed: FileIDs.length,
        mainRecordsUpdated: updateResults[0][0],
        draftRecordsUpdated: updateResults[1][0],
        totalRecordsUpdated: totalAffectedRows,
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

exports.getTransitionData = async (req, res, next) => {
  const { currentUserId } = req.payload;
  try {
    const transitionData = await sequelize.query(
      `
         WITH SteakHolderDocument as (
          select dmd."DocumentModuleDraftID" AS "ModuleDraftID" ,dmd."NeedAcceptanceFromStakeHolder" as "NeedAcceptance",dmd."DocumentName" AS "ModuleName",
          sum (case when msh."ApprovalStatus" is not null then 1 else 0 end) as action_count,'Document' AS "ModuleType",'StakeHolder' as "ActionType",
          CASE
            WHEN dmd."EscalationType" = 'Minutes' THEN dmd."CreatedDate" + INTERVAL '1 minute' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Hours' THEN dmd."CreatedDate" + INTERVAL '1 hour' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Days' THEN dmd."CreatedDate" + INTERVAL '1 day' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Weeks' THEN dmd."CreatedDate" + INTERVAL '1 week' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Months' THEN dmd."CreatedDate" + INTERVAL '1 month' * dmd."EscalationAfter"
            WHEN dmd."EscalationType" = 'Years' THEN dmd."CreatedDate" + INTERVAL '1 year' * dmd."EscalationAfter"
            ELSE dmd."CreatedDate"
          END AS "EscalationDate",
          MAX(msh."ModifiedDate") FILTER (WHERE msh."ApprovalStatus" IS NOT NULL) AS "ActionDate",
          ROW_NUMBER() OVER (PARTITION BY dmd."DocumentID" ORDER BY dmd."CreatedDate" DESC) AS rn,
          count(msh."DocumentModuleDraftID") FILTER (WHERE msh."ApprovalStatus" ='Rejected') as reject_count,
          count(msh."SOPDraftID") as total_count from "ModuleStakeHolders" msh
          inner join "DocumentModuleDrafts" dmd on dmd."DocumentModuleDraftID" = msh."DocumentModuleDraftID"
          where dmd."IsDeleted" is not true and dmd."DocumentStatus" = 'InProgress'
          group by dmd."DocumentModuleDraftID",dmd."NeedAcceptance",dmd."DocumentName"
          ),
          SteakHolderUsers as (
          SELECT "ModuleDraftID",
          jsonb_agg(
                jsonb_build_object(
                'UserName',CONCAT("UserFirstName", ' ', "UserLastName", ' ', "UserMiddleName"),
                'UserID',"UserID"
                )) as "UserDetails"
                 FROM (
                    SELECT ud."UserFirstName", ud."UserLastName", ud."UserMiddleName",ud."UserID",
                    mc."DocumentModuleDraftID" as "ModuleDraftID"
                    FROM "ModuleStakeHolders" mc
                    INNER JOIN "UserDetails" ud on ud."UserID" = mc."UserID"
                 ) steakholder_links
            WHERE "ModuleDraftID" IS NOT NULL
            GROUP BY "ModuleDraftID"
          ),
      `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );
  } catch (error) {
    console.log(error);
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

exports.addDocumentReadingTimer = async (req, res, next) => {
  const { currentUserId } = req.payload;
  const {
    DocumentID,
    NoOfPageRead,
    Days = 0,
    Hours = 0,
    Minutes = 0,
    Seconds = 0,
  } = req.body;
  try {
    const docDraft = await DocumentModuleDraft.findOne({
      where: {
        [Op.or]: [{ DocumentID }, { DocumentModuleDraftID: DocumentID }],
        IsDeleted: false,
        DocumentStatus: "Published",
      },
      attributes: [
        "DocumentModuleDraftID",
        "DocumentID",
        "MasterVersion",
        "DraftVersion",
      ],
      order: [["CreatedDate", "DESC"]],
    });
    if (!docDraft) {
      throw new Error("Not a Published Document");
    }
    const {
      DocumentModuleDraftID,
      DocumentID: docId,
      MasterVersion,
      DraftVersion,
    } = docDraft;
    await DocumentReadingTimer.create({
      DocumentID: docId,
      DocumentModuleDraftID,
      MasterVersion,
      DraftVersion,
      UserID: currentUserId,
      NoOfPageRead,
      Days,
      Hours,
      Minutes,
      Seconds,
      StartDateAndTime: literal("CURRENT_TIMESTAMP"),
      EndDateAndTime: literal(
        `CURRENT_TIMESTAMP + INTERVAL '1 second' * ${
          Days * 86400 + Hours * 3600 + Minutes * 60 + Seconds
        }`
      ),
      CreatedBy: currentUserId,
    });
    return res
      .status(201)
      .send({ message: "Reading timer added successfully" });
  } catch (error) {
    console.log(error);
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
