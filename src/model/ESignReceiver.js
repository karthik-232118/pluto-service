const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const ESignReceiver = sequelize.define(
  "ESignReceiver",
  {
    ESignReceiverID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    ESignRequestID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    UserName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    UserEmail: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    UserPhoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    Markers: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    Status: {
      type: DataTypes.ENUM("Pending", "Signed"),
      allowNull: false,
      defaultValue: "Pending",
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

module.exports = ESignReceiver;
