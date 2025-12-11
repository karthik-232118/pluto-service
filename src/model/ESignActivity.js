const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const ESignActivity = sequelize.define(
  "ESignActivity",
  {
    ESignActivityID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    ESignRequestID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    ESignReceiverID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    SignedDocumentURL: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    Activities: {
      type: DataTypes.JSONB,
      allowNull: false,
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

module.exports = ESignActivity;
