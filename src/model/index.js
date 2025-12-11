const { Sequelize, DataTypes } = require("sequelize");
require("dotenv").config();

// Check if DB_CONNECTION_STRING is defined
if (!process.env.DB_CONNECTION_STRING) {
  console.error(
    "FATAL ERROR: DB_CONNECTION_STRING environment variable is not defined!"
  );
  console.error(
    "Please set DB_CONNECTION_STRING in your environment variables."
  );
  process.exit(1);
}

const sequelize = new Sequelize(process.env.DB_CONNECTION_STRING, {
  logging: false,
  dialectOptions: {
    collate: "utf8_general_ci",
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 60000,
    idle: 60000,
  },
});

(async () => {
  try {
    if (!sequelize.connectionManager.getConnection()) {
      await sequelize.authenticate();
    }
    console.log("Connection has been established successfully.");
    // await sequelize.sync({ force: true }); //Clear all existing data from all tables/recreate tables
    // await sequelize.sync();
    // console.log('All models were synchronized successfully.');

    // await sequelize.sync();
    // console.log('All models were synchronized successfully.');

    // await sequelize.drop();
    // console.log('All tables dropped!');
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
})();

module.exports = { sequelize, DataTypes };
