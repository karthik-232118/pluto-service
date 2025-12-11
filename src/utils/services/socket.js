const { sequelize } = require("../../model");
const ChatMessages = require("../../model/ChatMessages");
const UserNotification = require("../../model/UserNotification");
const { logger } = require("./logger");


let io;
const userSocketsIds = {};
const desktopUserSocketsIds = {};

const emitToUser = (socketMap, userId, event, data) => {
  const socketId = socketMap[userId];
  if (socketId) io.to(socketId).emit(event, data);
};

const userSockets = (ioParam) => {
  io = ioParam;

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id, new Date().toLocaleTimeString());

    socket.on("register", (userId) => {
      userSocketsIds[userId] = socket.id;
      console.log(`Web User ${userId} registered with socket ID ${socket.id}`);
    });

    socket.on("register-desktop", async (userId) => {
      desktopUserSocketsIds[userId] = socket.id;
      console.log(`Desktop User ${userId} registered with socket ID ${socket.id}`);
      try {
        if (userId) await helper.updateUserConnectionStatusToDesktopClient(userId, true, socket.id);
      } catch (error) {
        logger.error({ message: error.message, error, currentUserID: userId });
      }
    });

    const syncEvents = ["global-sync-success", "global-sync-failure", "sync-success", "sync-failure"];
    syncEvents.forEach(event => {
      socket.on(event, (payload) => {
        emitToUser(userSocketsIds, payload?.userID, event, {
          message: payload?.message,
          date: new Date().toISOString(),
        });
      });
    });

    socket.on("disconnect", () => {
      const removeSocket = (map, type) => {
        for (const userId in map) {
          if (map[userId] === socket.id) {
            delete map[userId];
            console.log(`${type} User ${userId} disconnected`, new Date().toLocaleTimeString());
            return userId;
          }
        }
      };

      const desktopUserId = removeSocket(desktopUserSocketsIds, "Desktop");
      if (desktopUserId) {
        try {
          helper.updateUserConnectionStatusToDesktopClient(desktopUserId, false, socket.id);
        } catch (error) {
          logger.error({ message: error.message, error, currentUserID: desktopUserId });
        }
      }

      removeSocket(userSocketsIds, "Web");
    });
  });
};

const sendNotification = async (dataList) => {
  const userIds = dataList.map(d => d.UserID);
  if (!userIds.length) return console.log("No socket users found");

  const data = await sequelize.query(
    `SELECT "UserID", COUNT(*) AS "UserCount"
     FROM "UserNotifications"
     WHERE "IsRead" = false AND "IsActive" = true AND "UserID" IN (:userIds)
     GROUP BY "UserID"`,
    {
      type: sequelize.QueryTypes.SELECT,
      replacements: { userIds },
    }
  );

  for (const { UserID, UserCount } of data) {
    emitToUser(userSocketsIds, UserID, "notification_count", UserCount);
  }
};

const sendChatMessage = async (userIds, userType, messageBody) => {
  await sendUnReadMessage(userIds, userType, messageBody);
  userIds.forEach(userId => emitToUser(userSocketsIds, userId, "chat_message", messageBody));
};

const sendUnReadMessage = async (userIds, userType, messageBody) => {
  setTimeout(async () => {
    const count = await ChatMessages.count({
      where: { IsRead: false, ChatMessageID: messageBody.ChatMessageID },
    });

    if (!count) return;

    const moduleNameQuery = `
      SELECT "ModuleName" FROM "ModuleMasters"
      WHERE "ModuleTypeID" IN (
        SELECT "ModuleTypeID" FROM "SopModules" WHERE "SOPID" = :id
        UNION ALL
        SELECT "ModuleTypeID" FROM "DocumentModules" WHERE "DocumentID" = :id
        UNION ALL
        SELECT "ModuleTypeID" FROM "TrainingSimulationModules" WHERE "TrainingSimulationID" = :id
        UNION ALL
        SELECT "ModuleTypeID" FROM "TestSimulationModules" WHERE "TestSimulationID" = :id
        UNION ALL
        SELECT "ModuleTypeID" FROM "TestMcqsModules" WHERE "TestMCQID" = :id
      ) LIMIT 1
    `;
    const [module] = await sequelize.query(moduleNameQuery, {
      type: sequelize.QueryTypes.SELECT,
      replacements: { id: messageBody.ModuleID },
    });

    const userNotificationData = userIds.map(userId => ({
      UserID: userId,
      Message: messageBody.Message,
      NotificationType: "chatmessages",
      LinkedType: module?.ModuleName,
      LinkedID: messageBody.ModuleID,
      CreatedBy: messageBody.SenderID,
    }));

    await UserNotification.bulkCreate(userNotificationData,{ ignoreDuplicates: true });
    await sendNotification(userNotificationData);

    if (userType === "EndUser") {
      const chatUserQuery = `-- your full complex query here`;
      const listData = await sequelize.query(chatUserQuery, {
        type: sequelize.QueryTypes.SELECT,
      });

      userIds.forEach(userId => {
        const socketId = userSocketsIds[userId];
        if (!socketId) return;

        const chatUsers = { [messageBody.ModuleID]: listData };
        const unreadCount = listData.reduce((acc, cur) => acc + +cur.UnreadMessages, 0);
        const chatCount = { [messageBody.ModuleID]: unreadCount };

        io.to(socketId).emit("chat_users", chatUsers);
        io.to(socketId).emit("chat_count", chatCount);
      });
    }
  }, 5000);
};

// Sync operations for desktop
const syncEmitters = [
  { name: "sendSync", event: "sync" },
  { name: "syncCreateCategory", event: "sync-create-category" },
  { name: "syncRenameCategory", event: "sync-rename-category" },
  { name: "syncDeleteCategory", event: "sync-delete-category" },
  { name: "syncDocumentCreation", event: "sync-upload-document-file" },
  { name: "syncDocumentDeletion", event: "sync-delete-document-file" },
];

const syncFunctions = {};
syncEmitters.forEach(({ name, event }) => {
  syncFunctions[name] = (userID, data) =>
    emitToUser(desktopUserSocketsIds, userID, event, data);
});

const documentEditSuccess = (userID, data) =>
  emitToUser(userSocketsIds, userID, "document-edit-success", data);

const documentEditFailure = (userID, data) =>
  emitToUser(userSocketsIds, userID, "document-edit-failure", data);

const notifyUsersAboutDocument = (usersToNotify) =>
  usersToNotify.forEach(userId => emitToUser(userSocketsIds, userId, "document_saved"));

module.exports = {
  userSockets,
  sendNotification,
  sendChatMessage,
  ...syncFunctions,
  documentEditSuccess,
  documentEditFailure,
  notifyUsersAboutDocument,
};
