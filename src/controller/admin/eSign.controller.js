const { Op, Sequelize, literal, DataTypes, fn, col } = require("sequelize");
const path = require("path");
const ejs = require("ejs");
const { sequelize } = require("../../model");
const { logger } = require("../../utils/services/logger");
const helper = require("../../utils/helper");
const ESignDocument = require("../../model/ESignDocument");
const ESignRequest = require("../../model/ESignRequest");
const ESignReceiver = require("../../model/ESignReceiver");
const {
  mailService,
  eSignMailService,
} = require("../../utils/services/nodemailer");
const moment = require("moment");
const ESignActivity = require("../../model/ESignActivity");

const deleteEsignUploadedDocument = async (ESignDocumentID, file) => {
  try {
    await Promise.all([
      helper.deleteFile(file),
      ESignDocument.destroy({
        where: {
          ESignDocumentID,
        },
      }),
    ]);
  } catch (error) {
    throw error;
  }
};

const createEsignRequest = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { currentUserId } = req.payload;

  const {
    file,
    DocumentName,
    ReferenceNumber,
    Receivers,
    Message,
    Subject,
    CC,
  } = req.body;

  let pathToRemove = path.posix.join(...file.split(path.sep));
  let ESignDocumentID;

  try {
    const fileExtension = `.${file.split(".").pop()}`;
    const basePath = path.posix.join("public", "eSign");
    const createdEsignDocument = await ESignDocument.create(
      {
        ESignDocumentName: DocumentName,
        ESignReferenceNumber: ReferenceNumber,
        CreatedBy: currentUserId,
      },
      { transaction: t }
    );

    ESignDocumentID = createdEsignDocument.ESignDocumentID;

    const fileName = `${ESignDocumentID}${fileExtension}`;

    const filePath = path.posix.join(basePath, fileName);

    const newFilePath = await helper.renameFile(file, filePath);

    pathToRemove = newFilePath;

    await ESignDocument.update(
      { ESignDocumentURL: newFilePath },
      { where: { ESignDocumentID }, transaction: t }
    );
    // file operations end

    const createdESignRequest = await ESignRequest.create(
      {
        ESignDocumentID,
        Message,
        Subject,
        CC: helper.formatEmailList(CC),
        CreatedBy: currentUserId,
      },
      { transaction: t }
    );

    // Receivers data
    const receiversList = Receivers.map((receiver) => {
      const { UserName, UserEmail, UserPhoneNumber } = receiver;
      let markersList = receiver.Markers.map((marker) => {
        return { ...marker, markerId: helper.generateUUID() };
      });

      return {
        ESignRequestID: createdESignRequest.ESignRequestID,
        UserName,
        UserEmail,
        UserPhoneNumber,
        Markers: markersList,
        CreatedBy: currentUserId,
      };
    });

    await ESignReceiver.bulkCreate(receiversList, { transaction: t });

    const createdReceivers = await ESignReceiver.findAll({
      where: {
        ESignRequestID: createdESignRequest.ESignRequestID,
      },
      attributes: ["ESignReceiverID", "UserEmail"],
      transaction: t,
    });

    for (let receiver of createdReceivers) {
      const eSignRequestLink = `${req.headers.origin}/e-sign-request/${createdESignRequest?.ESignRequestID}?receiverId=${receiver?.ESignReceiverID}`;

      const data = await ejs.renderFile(
        path.dirname(path.basename(__dirname)) +
          "/src/templates/mails/eSignRequest.ejs",
        { eSignRequestLink, Message, DocumentName }
      );

      await eSignMailService({
        recipientEmail: receiver.UserEmail,
        subject: `eSign Request for ${DocumentName}`,
        body: {
          html: data,
        },
      });
    }

    await t.commit();
    return res.status(200).json({
      message: "E-Sign request sent successfully!",
    });
  } catch (error) {
    console.log(error);
    await t.rollback();
    try {
      await deleteEsignUploadedDocument(ESignDocumentID, pathToRemove);
    } catch (error) {
      console.log(error);
      logger.error({
        message: error.message,
        details: error,
        currentUserId,
      });
      return res.status(500).json({ message: "Something went wrong!" });
    }

    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const eSignDashboardList = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { currentUserId, currentUserEmail } = req.payload;

  const {
    page = 1,
    pageSize = 10,
    sortField = "CreatedDate",
    sortOrder = "DESC",
    status = "All",
    search = "",
  } = req.body;

  try {
    const { limit, offset } = helper.getLimitAndOffset(page, pageSize);
    const sort = helper.sorting(sortField, sortOrder);

    const filter = [];
    const receiverFilter = [];
    const documentFilter = [];
    if (status === "Received") {
      receiverFilter.push({ UserEmail: currentUserEmail });
    } else if (status === "Sent") {
      filter.push({ CreatedBy: currentUserId });
    } else if (status === "Completed") {
      filter.push({
        [Op.and]: [
          { Status: "Completed" },
          {
            [Op.or]: [
              { CreatedBy: currentUserId },
              Sequelize.literal(
                `EXISTS (SELECT 1 FROM "ESignReceivers" WHERE "ESignReceivers"."ESignRequestID" = "ESignRequest"."ESignRequestID" AND "ESignReceivers"."UserEmail" = '${currentUserEmail}')`
              ),
            ],
          },
        ],
      });
    } else if (status === "Pending") {
      filter.push({
        [Op.and]: [
          { Status: "Pending" },
          {
            [Op.or]: [
              { CreatedBy: currentUserId },
              Sequelize.literal(
                `EXISTS (SELECT 1 FROM "ESignReceivers" WHERE "ESignReceivers"."ESignRequestID" = "ESignRequest"."ESignRequestID" AND "ESignReceivers"."UserEmail" = '${currentUserEmail}')`
              ),
            ],
          },
        ],
      });
    } else if (status === "Expired") {
      filter.push({
        [Op.and]: [
          { Status: "Expired" },
          {
            [Op.or]: [
              { CreatedBy: currentUserId },
              Sequelize.literal(
                `EXISTS (SELECT 1 FROM "ESignReceivers" WHERE "ESignReceivers"."ESignRequestID" = "ESignRequest"."ESignRequestID" AND "ESignReceivers"."UserEmail" = '${currentUserEmail}')`
              ),
            ],
          },
        ],
      });
    } else if (status === "All") {
      filter.push({
        [Op.or]: [
          { CreatedBy: currentUserId },
          Sequelize.literal(
            `EXISTS (SELECT 1 FROM "ESignReceivers" WHERE "ESignReceivers"."ESignRequestID" = "ESignRequest"."ESignRequestID" AND "ESignReceivers"."UserEmail" = '${currentUserEmail}')`
          ),
        ],
      });
    }

    if (search) {
      documentFilter.push({
        [Op.or]: [
          { ESignDocumentName: { [Op.iLike]: `%${search}%` } },
          { ESignReferenceNumber: { [Op.iLike]: `%${search}%` } },
        ],
      });
      receiverFilter.push({
        [Op.or]: [
          { UserName: { [Op.iLike]: `%${search}%` } },
          { UserEmail: { [Op.iLike]: `%${search}%` } },
        ],
      });
    }

    const { rows, count } = await ESignRequest.findAndCountAll({
      where: {
        [Op.and]: filter,
      },
      attributes: [
        "ESignRequestID",
        "ESignDocumentID",
        "Status",
        "CreatedDate",
      ],
      include: [
        {
          where: {
            [Op.and]: documentFilter,
          },
          required: true,
          model: ESignDocument,
          attributes: ["ESignDocumentName", "ESignReferenceNumber"],
        },
        {
          where: {
            [Op.and]: receiverFilter,
          },
          required: true,
          model: ESignReceiver,
          attributes: ["UserName", "UserEmail", "Status"],
          include: [
            {
              model: ESignActivity,
              attributes: ["SignedDocumentURL"],
            },
          ],
        },
      ],
      limit: limit,
      offset: offset,
      order: [sort],
      distinct: true,
    });

    const finalTableData = rows.map((row) => {
      const totalNumberOfReceivers = row?.ESignReceivers?.length || 0;
      const totalPendingForSign =
        row?.ESignReceivers?.filter((receiver) => receiver.Status === "Pending")
          .length || 0;

      const receivers = row?.ESignReceivers?.map((receiver) => {
        const signedDocumentURL = receiver?.ESignActivity?.SignedDocumentURL
          ? path.posix.join(
              "file/e/",
              `${path.basename(receiver?.ESignActivity?.SignedDocumentURL)}`
            )
          : null;

        return {
          UserName: receiver?.UserName,
          UserEmail: receiver?.UserEmail,
          Status: receiver?.Status,
          SignedDocumentURL: signedDocumentURL,
        };
      });
      const status = row?.Status;

      return {
        ESignRequestID: row.ESignRequestID,
        ESignDocumentName: row.ESignDocument.ESignDocumentName,
        ESignReferenceNumber: row.ESignDocument.ESignReferenceNumber,
        totalNumberOfReceivers,
        totalPendingForSign,
        receivers,
        status,
        createdDate: row.CreatedDate,
      };
    });

    const pagination = await helper.pagination(page, pageSize, count);

    await t.commit();
    return res.status(200).json({
      message: "E-Sign dashboard fetched successfully!",
      data: {
        tableGrid: finalTableData,
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

const eSignDashboardCards = async (req, res, next) => {
  const { currentUserId, currentUserEmail } = req.payload;

  try {
    const [totalInvites, eSignCompleted, completedDocuments] =
      await Promise.all([
        ESignRequest.count({
          where: {
            [Op.or]: [
              { CreatedBy: currentUserId },
              Sequelize.literal(
                `EXISTS (SELECT 1 FROM "ESignReceivers" WHERE "ESignReceivers"."ESignRequestID" = "ESignRequest"."ESignRequestID" AND "ESignReceivers"."UserEmail" = '${currentUserEmail}')`
              ),
            ],
          },
          include: [
            {
              required: true,
              model: ESignReceiver,
            },
          ],
        }),
        ESignRequest.count({
          where: {
            [Op.or]: [
              { CreatedBy: currentUserId },
              Sequelize.literal(
                `EXISTS (SELECT 1 FROM "ESignReceivers" WHERE "ESignReceivers"."ESignRequestID" = "ESignRequest"."ESignRequestID" AND "ESignReceivers"."UserEmail" = '${currentUserEmail}')`
              ),
            ],
          },
          include: [
            {
              where: {
                Status: "Signed",
              },
              required: true,
              model: ESignReceiver,
            },
          ],
        }),
        ESignRequest.count({
          where: {
            Status: "Completed",
            [Op.or]: [
              { CreatedBy: currentUserId },
              Sequelize.literal(
                `EXISTS (SELECT 1 FROM "ESignReceivers" WHERE "ESignReceivers"."ESignRequestID" = "ESignRequest"."ESignRequestID" AND "ESignReceivers"."UserEmail" = '${currentUserEmail}')`
              ),
            ],
          },
        }),
      ]);

    return res.status(200).json({
      message: "E-Sign dashboard cards fetched successfully!",
      data: {
        totalInvites,
        eSignCompleted,
        completedDocuments,
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

const eSignDashboardActivity = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { currentUserId } = req.payload;

  const { ESignRequestID } = req.body;

  try {
    const eSignActivity = await ESignActivity.findAll({
      where: {
        ESignRequestID,
      },
      attributes: ["Activities"],
    });

    const formattedActivities = eSignActivity
      .filter(
        (activity) => activity.Activities && activity.Activities.length > 0
      ) // Filter out empty activities
      .flatMap((activity) => activity.Activities)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((activity) => {
        return {
          ...activity,
          date: activity.date,
        };
      });

    const filteredActivities =
      formattedActivities.length > 0 ? formattedActivities : []; // Return sorted activities or empty array if none found

    await t.commit();
    return res.status(200).json({
      message: "Activity fetched successfully!",
      data: {
        activities: filteredActivities,
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

module.exports = {
  createEsignRequest,
  eSignDashboardList,
  eSignDashboardCards,
  eSignDashboardActivity,
};
