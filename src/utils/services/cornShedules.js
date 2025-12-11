const { sequelize } = require("../../model");
const Notification = require("../../model/Notification");
const UserNotification = require("../../model/UserNotification");
const { mailService } = require("./nodemailer");
const { sendNotification } = require("./socket");

var cron = require("node-cron");
const helper = require("../helper");
const {
  getLatestEmailTemplate,
} = require("../../controller/admin/admin.controller");

const generateUserListWithNotificationData = async () => {
  try {
    const data = await sequelize.query(
      `
            SELECT "ElementID",
                "ElementName",
                "DueDate",
                "ModuleName",
                "ModuleTypeID",
                "UserID",
                "CreatedBy"

            FROM   (
                            SELECT
                                        CASE
                                                    WHEN mc."TrainingSimulationDraftID" IS NOT NULL THEN mc."TrainingSimulationDraftID"
                                                    WHEN mc."TestSimulationDraftID" IS NOT NULL THEN mc."TestSimulationDraftID"
                                                    WHEN mc."DocumentModuleDraftID" IS NOT NULL THEN mc."DocumentModuleDraftID"
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
                                                                    SELECT count(*)
                                                                    FROM   "ModuleCheckers" mc1
                                                                    WHERE  mc1."SOPDraftID" = mc."SOPDraftID"
                                                                    AND    mc1."ModifiedBy" IS NOT NULL)+
                                                            (
                                                                    SELECT count(*)
                                                                    FROM   "ModuleEscalations" mc1
                                                                    WHERE  mc1."SOPDraftID" = mc."SOPDraftID"
                                                                    AND    mc1."ModifiedBy" IS NOT NULL))
                                                    WHEN mc."DocumentModuleDraftID" IS NOT NULL THEN (
                                                            (
                                                                    SELECT count(*)
                                                                    FROM   "ModuleCheckers" mc1
                                                                    WHERE  mc1."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
                                                                    AND    mc1."ModifiedBy" IS NOT NULL)+
                                                                    (
                                                                    SELECT count(*)
                                                                    FROM   "ModuleStakeHolders" mc1
                                                                    WHERE  mc1."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
                                                                    AND    mc1."ModifiedBy" IS NOT NULL)+
                                                            (
                                                                    SELECT count(*)
                                                                    FROM   "ModuleEscalations" mc1
                                                                    WHERE  mc1."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
                                                                    AND    mc1."ModifiedBy" IS NOT NULL))
                                                    WHEN mc."TrainingSimulationDraftID" IS NOT NULL THEN (
                                                            (
                                                                    SELECT count(*)
                                                                    FROM   "ModuleCheckers" mc1
                                                                    WHERE  mc1."TrainingSimulationDraftID" = mc."TrainingSimulationDraftID"
                                                                    AND    mc1."ModifiedBy" IS NOT NULL)+
                                                            (
                                                                    SELECT count(*)
                                                                    FROM   "ModuleEscalations" mc1
                                                                    WHERE  mc1."TrainingSimulationDraftID" = mc."TrainingSimulationDraftID"
                                                                    AND    mc1."ModifiedBy" IS NOT NULL))
                                                    WHEN mc."TestSimulationDraftID" IS NOT NULL THEN (
                                                            (
                                                                    SELECT count(*)
                                                                    FROM   "ModuleCheckers" mc1
                                                                    WHERE  mc1."TestSimulationDraftID" = mc."TestSimulationDraftID"
                                                                    AND    mc1."ModifiedBy" IS NOT NULL)+
                                                            (
                                                                    SELECT count(*)
                                                                    FROM   "ModuleEscalations" mc1
                                                                    WHERE  mc1."TestSimulationDraftID" = mc."TestSimulationDraftID"
                                                                    AND    mc1."ModifiedBy" IS NOT NULL))
                                                    WHEN mc."TestMCQDraftID" IS NOT NULL THEN (
                                                            (
                                                                    SELECT count(*)
                                                                    FROM   "ModuleCheckers" mc1
                                                                    WHERE  mc1."TestMCQDraftID" = mc."TestMCQDraftID"
                                                                    AND    mc1."ModifiedBy" IS NOT NULL)+
                                                            (
                                                                    SELECT count(*)
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
                                                                                    WHEN "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
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
                                        mc."ModuleTypeID",
                                        mc."UserID",
                                        mc."CreatedBy"
                            FROM       "ModuleEscalations" mc
                            INNER JOIN "ModuleMasters" mm
                            ON         mm."ModuleTypeID" = mc."ModuleTypeID"
                            WHERE      mc."IsDeleted" IS NOT TRUE )
            WHERE  "NumberOfActionPersion" = 0
            AND    "DueDate" BETWEEN NOW() - INTERVAL '1 minutes' AND NOW()`,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );
    if (data.length) {
      const userIds = [];
      for (const el of data) {
        userIds.push(el.UserID);
      }
      const notificationStatus = await Notification.findAll({
        where: {
          UserID: userIds,
          NotificationTypeForAction: ["push", "both"],
        },
        attributes: ["UserID", "NotificationTypeForAction"],
      });
      const notififactionBulk = [];
      for (const el of data) {
        for (const e of JSON.parse(JSON.stringify(notificationStatus))) {
          if (e.UserID == el.UserID) {
            notififactionBulk.push({
              UserID: el.UserID,
              Message: "Element assigned as an Escalation Person",
              NotificationType: "actionable",
              LinkedType: el.ModuleName,
              LinkedID: el.ElementID,
              CreatedBy: el.CreatedBy,
            });
          }
        }
      }
      if (notififactionBulk.length) {
        for (const el of notififactionBulk) {
          try {
            await UserNotification.create(el);
          } catch (error) {}
        }
        await sendNotification(notififactionBulk);
      }
    }
  } catch (error) {
    console.log(error);
  }
};
const escalationEmailNotification = async () => {
  try {
    const data = await sequelize.query(
      `WITH "ModuleDraft" AS (
		SELECT md."SOPDraftID" AS "ModuleDraftID",md."SOPID" AS "ModuleID", md."SOPName" AS "ModuleName", md."NeedAcceptance", FALSE AS "NeedAcceptanceFromStakeHolder", md."NeedAcceptanceForApprover",
		CASE
				WHEN md."EscalationAfter" IS NOT NULL AND md."EscalationType" = 'Minutes' THEN md."CreatedDate" + INTERVAL '1 minute' * md."EscalationAfter"
				WHEN md."EscalationAfter" IS NOT NULL AND md."EscalationType" = 'Hours' THEN md."CreatedDate" + INTERVAL '1 hour' * md."EscalationAfter"
				WHEN md."EscalationAfter" IS NOT NULL AND md."EscalationType" = 'Days' THEN md."CreatedDate" + INTERVAL '1 day' * md."EscalationAfter"
				WHEN md."EscalationAfter" IS NOT NULL AND md."EscalationType" = 'Weeks' THEN md."CreatedDate" + INTERVAL '1 week' * md."EscalationAfter"
				WHEN md."EscalationAfter" IS NOT NULL AND md."EscalationType" = 'Months' THEN md."CreatedDate" + INTERVAL '1 month' * md."EscalationAfter"
				WHEN md."EscalationAfter" IS NOT NULL AND md."EscalationType" = 'Years' THEN md."CreatedDate" + INTERVAL '1 year' * md."EscalationAfter"
				ELSE NULL
			END AS "EscalationDate", NULL AS "StakeHolderEscalationDate",md."CreatedBy", mm."ModuleName" as "ModuleTypeName",mm."ModuleTypeID",md."ContentID",
			ROW_NUMBER() OVER (PARTITION BY md."SOPID" ORDER BY md."CreatedDate" DESC) AS rn
		FROM "SopModuleDrafts" md
		INNER JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = md."ModuleTypeID"
		WHERE md."IsDeleted" IS NOT TRUE  AND md."SOPStatus" = 'InProgress'
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
			END AS "StakeHolderEscalationDate",dd."CreatedBy",mm."ModuleName" as "ModuleTypeName",mm."ModuleTypeID",dd."ContentID",
			ROW_NUMBER() OVER (PARTITION BY dd."DocumentID" ORDER BY dd."CreatedDate" DESC) AS rn
		FROM "DocumentModuleDrafts" dd
		INNER JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = dd."ModuleTypeID"
		WHERE dd."IsDeleted" IS NOT TRUE AND dd."DocumentStatus" = 'InProgress'
        ),
	"StackHolderData" AS (
		SELECT COALESCE("SOPDraftID","DocumentModuleDraftID") AS "ModuleDraftID",
			COUNT("UserID") FILTER (WHERE "ApprovalStatus" ='Rejected') as reject_count,
			COUNT("UserID") FILTER (WHERE "ApprovalStatus" IS NOT NULL) as action_count,
			COUNT("UserID") AS total_count
		FROM "ModuleStakeHolders" WHERE "IsDeleted" IS NOT TRUE
		GROUP BY "SOPDraftID","DocumentModuleDraftID"
	),
	"StackHolderEscalationData" AS (
		SELECT COALESCE("SOPDraftID","DocumentModuleDraftID") AS "ModuleDraftID",
			COUNT("UserID") FILTER (WHERE "ApprovalStatus" IS NOT NULL) as action_count,  
			COUNT("UserID") FILTER (WHERE "ApprovalStatus" ='Rejected') as reject_count,   
			COUNT("UserID") AS total_count
		FROM "ModuleEscalations" WHERE "IsStakeHolder" IS TRUE AND "IsDeleted" IS NOT TRUE
		GROUP BY "SOPDraftID","DocumentModuleDraftID"
	),
	"ReviewerData" AS (
		SELECT COALESCE("SOPDraftID","DocumentModuleDraftID") AS "ModuleDraftID",
			COUNT("UserID") FILTER (WHERE "ApprovalStatus" ='Rejected') as reject_count,
			COUNT("UserID") FILTER (WHERE "ApprovalStatus" IS NOT NULL) as action_count,
			COUNT("UserID") AS total_count
		FROM "ModuleCheckers" WHERE "IsDeleted" IS NOT TRUE
		GROUP BY "SOPDraftID","DocumentModuleDraftID"
	),
	"ReviewerEscalationData" AS (
		SELECT COALESCE("SOPDraftID","DocumentModuleDraftID") AS "ModuleDraftID",
			COUNT("UserID") FILTER (WHERE "ApprovalStatus" IS NOT NULL) as action_count  
		FROM "ModuleEscalations" WHERE "IsReviewer" IS TRUE AND "IsDeleted" IS NOT TRUE
		GROUP BY "SOPDraftID","DocumentModuleDraftID"
	),
	"EscalatorList" AS (
		SELECT md."ModuleName",md."ModuleTypeName",trim(concat_ws(' ', ud."UserFirstName", ud."UserMiddleName", ud."UserLastName")) AS "UserFullName", n."NotificationTypeForAction",
                me."UserID",md."ModuleDraftID",md."CreatedBy",'Escalated Stakholder' AS "UserType",
                ud."UserEmail"
		FROM "ModuleDraft" md
		INNER JOIN "ModuleEscalations" me ON COALESCE(me."SOPDraftID",me."DocumentModuleDraftID") = md."ModuleDraftID"
		INNER JOIN "StackHolderData" sh ON sh."ModuleDraftID" = md."ModuleDraftID"
		INNER JOIN "StackHolderEscalationData" se ON se."ModuleDraftID" = md."ModuleDraftID"
		LEFT JOIN "UserDetails" ud ON ud."UserID" = me."UserID"
		LEFT JOIN "Notifications" n ON n."UserID" = me."UserID"
		WHERE md.rn = 1 AND me."IsStakeHolder" IS TRUE AND me."IsDeleted" IS NOT TRUE AND se.action_count = 0 AND
			CASE 
				WHEN md."NeedAcceptanceFromStakeHolder" IS TRUE AND sh.total_count != sh.action_count AND sh.reject_count = 0 
					AND md."StakeHolderEscalationDate" BETWEEN NOW() - INTERVAL '10 minutes' AND NOW() THEN TRUE
				WHEN md."NeedAcceptanceFromStakeHolder" IS NOT TRUE AND sh.action_count = 0 
					AND md."StakeHolderEscalationDate" BETWEEN NOW() - INTERVAL '10 minutes' AND NOW() THEN TRUE ELSE FALSE
			END
		UNION ALL
		SELECT md."ModuleName",md."ModuleTypeName",trim(concat_ws(' ', ud."UserFirstName", ud."UserMiddleName", ud."UserLastName")) AS "UserFullName", n."NotificationTypeForAction",
		me."UserID",md."ModuleDraftID",md."CreatedBy",'Escalated Reviewer' AS "UserType",ud."UserEmail"
		FROM "ModuleDraft" md
		INNER JOIN "ModuleEscalations" me ON COALESCE(me."SOPDraftID",me."DocumentModuleDraftID") = md."ModuleDraftID"
		INNER JOIN "ReviewerData" r ON r."ModuleDraftID" = md."ModuleDraftID"
		INNER JOIN "ReviewerEscalationData" re ON re."ModuleDraftID" = md."ModuleDraftID"
		LEFT JOIN "StackHolderData" sh ON sh."ModuleDraftID" = md."ModuleDraftID"
		LEFT JOIN "StackHolderEscalationData" se ON se."ModuleDraftID" = md."ModuleDraftID"
		LEFT JOIN "UserDetails" ud ON ud."UserID" = me."UserID"
		LEFT JOIN "Notifications" n ON n."UserID" = me."UserID"
		WHERE md.rn = 1 AND me."IsReviewer" IS TRUE AND me."IsDeleted" IS NOT TRUE AND re.action_count = 0 AND
			CASE 
				WHEN sh.total_count > 0 AND md."NeedAcceptanceFromStakeHolder" IS TRUE AND sh.total_count = sh.action_count AND sh.reject_count = 0 THEN TRUE
				WHEN sh.total_count > 0 AND md."NeedAcceptanceFromStakeHolder" IS NOT TRUE AND sh.action_count > 0 AND sh.reject_count = 0 THEN TRUE 
				WHEN sh.total_count > 0 AND se.total_count > 0 AND se.action_count > 0 AND se.reject_count = 0 THEN TRUE 
				WHEN sh.total_count = 0 OR sh.total_count IS NULL THEN TRUE
				ELSE FALSE
			END AND
			CASE
				WHEN md."NeedAcceptance" IS TRUE AND r.total_count != r.action_count AND r.reject_count = 0 
					AND md."EscalationDate" BETWEEN NOW() - INTERVAL '10 minutes' AND NOW() THEN TRUE
				WHEN md."NeedAcceptance" IS NOT TRUE AND r.action_count = 0 AND md."EscalationDate" BETWEEN NOW() - INTERVAL '10 minutes' AND NOW() THEN TRUE ELSE FALSE
			END
	)
	SELECT * FROM "EscalatorList";
        `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );
    if (data && data.length > 0) {
      const notificationData = [];
      for (const el of data) {
        if (
          el.NotificationTypeForAction === "push" ||
          el.NotificationTypeForAction === "both"
        ) {
          notificationData.push({
            UserID: el.UserID,
            Message: `Element assigned as an ${el.UserType}`,
            NotificationType: "actionable",
            LinkedType: el.ModuleTypeName,
            LinkedID: el.ModuleDraftID,
            CreatedBy: el.CreatedBy,
          });
        }
        // if (el.NotificationTypeForAction === 'email' || el.NotificationTypeForAction === 'both' ) {
        //         const LatestEmailTemplate = await getLatestEmailTemplate();
        //         console.log(LatestEmailTemplate, "LatestEmailTemplateLatestEmailTemplate")
        //         const emailData = {

        //                 recipientEmail: el.UserEmail,
        //                 subject: "Element Assigned as an " + el.UserType,
        //                 body: {
        //                         html: `Hello ${el.UserFullName},\n\nYou have been assigned as an ${el.UserType} for the ${el.ModuleTypeName} :${el.ModuleName}. Please review it at your earliest convenience.\n\nBest regards,\nTeam`,
        //                 },
        //         };
        //         mailService(emailData);
        // }
        if (
          el.NotificationTypeForAction === "email" ||
          el.NotificationTypeForAction === "both"
        ) {
          const LatestEmailTemplate = await getLatestEmailTemplate();
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
                        <strong>User Full Name:</strong> ${el?.UserFullName}
                    </p>
                    <p style="margin: 8px 0;">
                        <strong>User Type:</strong> ${el?.UserType}
                    </p>
                    <p style="margin: 8px 0;">
                        <strong>Module:</strong> ${el?.ModuleTypeName}
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
  } catch (error) {
    console.log(error);
  }
};
exports.sheduleEvery30min = () => {
  cron.schedule("* * * * *", () => {
    // generateUserListWithNotificationData();
  });
};
exports.sheduleEvery10min = () => {
  cron.schedule("*/10 * * * *", () => {
    escalationEmailNotification();
  });
};
