const { Pool } = require("pg");
const mysql = require("mysql2/promise");
const mariadb = require("mariadb");
const DBConnector = require("../model/DBConnector");
const { logger } = require("./services/logger");

const getUserConnection = async (user_id) => {
  try {
    const connection = await DBConnector.findOne({
      where: { UserID: user_id },
      order: [["CreatedDate", "DESC"]],
    });

    if (!connection) {
      return null;
    }

    const modifiedConnectionFields = {
      dbType: connection?.DatabaseType,
      host: connection?.Host,
      port: connection?.Port,
      username: connection?.Username,
      password: connection?.Password,
      database: connection?.DatabaseName,
    };

    return modifiedConnectionFields;
  } catch (error) {
    console.error("Error fetching user connection:", error);
    logger.error({
      message: error.message,
      details: error,
      userId: user_id,
    });
    return null;
  }
};

const connectToDatabase = async (config) => {
  try {
    if (config.dbType === "postgres") {
      const client = new Pool({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
      });
      return client;
    }

    if (config.dbType === "mysql" || config.dbType === "mariadb") {
      const connection = await (config.dbType === "mysql"
        ? mysql
        : mariadb
      ).createConnection({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
      });
      return connection;
    }
  } catch (error) {
    console.error("Database connection error:", error);
    logger.error({
      message: error.message,
      details: error,
    });
    throw new Error("Failed to connect to database");
  }
};

const getOrReconnectDatabase = async (user_id) => {
  const userConnection = await getUserConnection(user_id);

  if (!userConnection) {
    throw new Error(
      "No database connection found for this user, please configure one."
    );
  }

  try {
    const db = await connectToDatabase(userConnection);
    return db;
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      userId: user_id,
    });
    try {
      const db = await connectToDatabase(userConnection);
      return db;
    } catch (reconnectError) {
      logger.error({
        message: reconnectError.message,
        details: reconnectError,
        userId: user_id,
      });
      throw new Error("Database connection failed, please reconfigure.");
    }
  }
};

module.exports = { connectToDatabase, getOrReconnectDatabase };
