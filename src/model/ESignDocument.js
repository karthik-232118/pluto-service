const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const ESignRequest = require("./ESignRequest");

const ESignDocument = sequelize.define(
  "ESignDocument",
  {
    ESignDocumentID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    ESignDocumentName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ESignReferenceNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ESignDocumentURL: {
      type: DataTypes.TEXT,
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

module.exports = ESignDocument;
