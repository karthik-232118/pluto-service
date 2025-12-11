const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const FileAccessAttempt = sequelize.define(
  "FileAccessAttempt",
  {
    FileAccessAttemptID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    ModuleTypeID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    ModuleTypeName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ModuleID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    FileTypeName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    UserID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    AccessedUserID: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    Token: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    URL: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    UserAgentAndIP: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    IsAccessed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    AccessedBy: {
      type: DataTypes.UUID,
      defaultValue: null,
    },
    AccessedDate: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    CreatedBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    CreatedDate: {
      type: DataTypes.DATE,
      defaultValue: literal("CURRENT_TIMESTAMP"),
    },
    ModifiedBy: {
      type: DataTypes.UUID,
      defaultValue: null,
    },
    ModifiedDate: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    DeletedBy: {
      type: DataTypes.UUID,
      defaultValue: null,
    },
    DeletedDate: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
  },
  {
    timestamps: false,
  }
);

module.exports = FileAccessAttempt;
