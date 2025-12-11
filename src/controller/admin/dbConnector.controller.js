const { Op, Sequelize, literal, DataTypes, fn, col } = require("sequelize");
const { sequelize } = require("../../model");
const { logger } = require("../../utils/services/logger");

const {
  getOrReconnectDatabase,
  connectToDatabase,
} = require("../../utils/dbConnector");
const DBConnector = require("../../model/DBConnector");

const saveConnection = async (req, res) => {
  const t = await sequelize.transaction();

  const { currentUserId } = req.payload;

  const { DatabaseType, Host, Port, Username, Password, DatabaseName } =
    req.body;

  try {
    try {
      await connectToDatabase({
        dbType: DatabaseType,
        host: Host,
        port: Port,
        username: Username,
        password: Password,
        database: DatabaseName,
      });
    } catch (error) {
      await t.rollback();
      logger.error({
        message: error.message,
        details: error,
        userId: currentUserId,
      });
      return res.status(500).json({ message: error.message });
    }

    await DBConnector.create(
      {
        UserID: currentUserId,
        Host,
        Port,
        Username,
        Password,
        DatabaseName,
        DatabaseType,
        CreatedBy: currentUserId,
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json({ message: "Database connected successfully" });
  } catch (error) {
    await t.rollback();

    console.log(error);

    logger.error({
      message: error.message,
      details: error,
      userId: currentUserId,
    });
    res.status(500).json({ message: "Something went wrong" });
  }
};

const getTables = async (req, res) => {
  const { currentUserId } = req.payload;

  try {
    const db = await getOrReconnectDatabase(currentUserId);
    let query;
    let result;

    // Detect database type
    const isPostgres = db.client && db.client.constructor.name === "Client";

    if (isPostgres) {
      // PostgreSQL Query to Get Tables
      query =
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';";
      result = await db.query(query);
      res
        .status(200)
        .json({ tables: result.rows.map((row) => row.table_name) });
    } else {
      // MySQL & MariaDB Query to Get Tables
      const dbName = db.connection.config.database;
      query = "SHOW TABLES;";
      result = await db.query(query);

      res.status(200).json({
        tables: result[0].map((row) => row[`Tables_in_${dbName}`]),
      });
    }
  } catch (error) {
    console.log(error);

    logger.error({
      message: error.message,
      details: error,
      userId: currentUserId,
    });

    res.status(500).json({ message: "Something went wrong" });
  }
};

const getColumns = async (req, res) => {
  const { table } = req.body;
  const { currentUserId } = req.payload;

  try {
    const db = await getOrReconnectDatabase(currentUserId);

    let query;
    let params;

    // Check if the database type is PostgreSQL or MySQL/MariaDB
    if (db.client && db.client.constructor.name === "Client") {
      // PostgreSQL uses $1, $2 placeholders
      query = `SELECT column_name FROM information_schema.columns WHERE table_name = $1;`;
      params = [table];
    } else {
      // MySQL and MariaDB use ? placeholders
      query = `SELECT column_name FROM information_schema.columns WHERE table_name = ?;`;
      params = [table];
    }

    const result = await db.query(query, params);

    const columns = result.rows
      ? result.rows.map((row) => row.column_name) // PostgreSQL
      : result[0].map((row) => row.COLUMN_NAME); // MySQL/MariaDB

    res.status(200).json({ columns });
  } catch (error) {
    console.log(error);

    logger.error({
      message: error.message,
      details: error,
      userId: currentUserId,
    });
    res.status(500).json({ message: "Something went wrong" });
  }
};

const executeQuery = async (req, res) => {
  const { query } = req.body;
  const { currentUserId } = req.payload;

  try {
    const db = await getOrReconnectDatabase(currentUserId);
    let result;

    // Detect database type
    const isPostgres = db.client && db.client.constructor.name === "Client";

    if (isPostgres) {
      // PostgreSQL query execution
      result = await db.query(query);
      res.status(200).json({ data: result.rows });
    } else {
      // MySQL / MariaDB query execution
      result = await db.query(query);
      res.status(200).json({ data: result[0] });
    }
  } catch (error) {
    console.log(error);

    logger.error({
      message: error.message,
      details: error,
      userId: currentUserId,
    });
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  saveConnection,
  getTables,
  getColumns,
  executeQuery,
};
