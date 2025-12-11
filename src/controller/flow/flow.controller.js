const { literal } = require("sequelize");
const { sequelize } = require("../../model");
const Managers = require("../../model/Managers");
const UserDetails = require("../../model/UserDetails");
const WorkflowActionable = require("../../model/WorkflowActionable");
const UserNotification = require("../../model/UserNotification");
const { sendNotification } = require("../../utils/services/socket");

exports.getAllUserLists = async (req, res) => {
    const { SearchString = "", Limit = 20, Page = 1 } = req.body;
    try {
        const data = await sequelize.query(`
            SELECT "Users"."UserID" AS "UserID","Users"."UserName" AS "UserName",
            "UserDetails"."UserFirstName" AS "UserFirstName","UserDetails"."UserMiddleName" AS "UserMiddleName",
            "UserDetails"."UserLastName" AS "UserLastName","UserDetails"."UserEmail" AS "UserEmail" FROM "Users"
            INNER JOIN "UserDetails" ON "Users"."UserID" = "UserDetails"."UserID"
            WHERE "Users"."UserName" iLIKE '%${SearchString}%' 
            OR "UserDetails"."UserFirstName" iLIKE '%${SearchString}%' 
            OR "UserDetails"."UserMiddleName" iLIKE '%${SearchString}%'
            OR "UserDetails"."UserLastName" iLIKE '%${SearchString}%'
            LIMIT ${Limit} OFFSET ${(Page - 1) * Limit}
            `, {
            type: sequelize.QueryTypes.SELECT
        });
        res.status(200).send({ data });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
}

exports.getManagerDetails = async (req, res) => {
    const { UserIDs } = req.body;
    try {
        const data = await sequelize.query(`
            SELECT 
                ud2."UserID",
                ud2."UserFirstName",
                ud2."UserMiddleName",
                ud2."UserLastName",
                ud2."UserEmail",
                ud."UserID" AS "EmpID"
            FROM "UserDetails" ud 
            INNER JOIN "Managers" m ON m."UserID" = ud."UserSupervisorID" 
            INNER JOIN "UserDetails" ud2 ON ud2."UserID" = m."UserID" 
            WHERE ud."UserID" IN (:UserIDs)
        `, {
            type: sequelize.QueryTypes.SELECT,
            replacements: { UserIDs: UserIDs },  // Ensure UserIDs is an array like [1,2,3]
        });
        res.status(200).send({ data });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
}
exports.getUserDetails = async (req, res) => {
    const { UserID } = req.body;
    try {
        const data = await UserDetails.findOne({
            where: { UserID },
            attributes: ['UserID', 'UserFirstName', 'UserMiddleName', 'UserLastName', 'UserEmail']
        });
        res.status(200).send({ data });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
}
exports.addBulkWorkFlowActionable = async (req, res) => {
    const {
        bulkData
    } = req.body;
    try {
        if (!bulkData || !bulkData?.length) {
            return res.status(404).send({ message: 'Invalid Data' })
        }
        await WorkflowActionable.bulkCreate(bulkData);
        const notificationBulk = []
        for await (const el of bulkData) {
            const { UserID, StepName, FlowName, ActionURL } = el;
            notificationBulk.push({
                UserID: UserID,
                Message: `Workflow Assign ${StepName} of ${FlowName}`,
                NotificationType: "actionable",
                LinkedType: "ActionURL",
                LinkedID: ActionURL,
                CreatedBy: UserID,
            });
        }
       
        await UserNotification.bulkCreate(notificationBulk,{ignoreDuplicates: true});
        await sendNotification(notificationBulk);
        res.status(200).send({ message: 'WorkFlow Actionable added successfully' });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};
exports.updateWorkflowActionable = async (req, res) => {
    const {
        ExecutionFlowID,
        ShapeID,
        UserID
    } = req.body;
    try {
        await WorkflowActionable.update(
            {
                ActionStatus: 'Submitted',
                ModifiedBy: UserID,
                ModifiedDate: literal('CURRENT_TIMESTAMP'),
            },
            {
                where: {
                    ExecutionFlowID,
                    ShapeID,
                    UserID,
                    ActionStatus: 'ActionRequired',
                }
            }
        );
        res.status(200).send({ message: 'WorkFlow Actionable updated successfully' });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};