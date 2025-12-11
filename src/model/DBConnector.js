const { Sequelize } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const DBConnector = sequelize.define(
  "DBConnector",
  {
    DBConnectorID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    UserID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    Host: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    Port: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    Username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    Password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    DatabaseName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    DatabaseType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    CreatedBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    CreatedDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    ModifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    ModifiedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    DeletedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    DeletedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: false,
  }
);
module.exports = DBConnector;
