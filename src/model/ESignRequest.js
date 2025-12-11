const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const ESignDocument = require("./ESignDocument");

const ESignRequest = sequelize.define(
  "ESignRequest",
  {
    ESignRequestID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    ESignDocumentID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    Status: {
      type: DataTypes.ENUM("Pending", "Completed", "Expired"),
      allowNull: false,
      defaultValue: "Pending",
    },
    Message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    Subject: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    CC: {
      type: DataTypes.TEXT,
      allowNull: true,
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

module.exports = ESignRequest;
