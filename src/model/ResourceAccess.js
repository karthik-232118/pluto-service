const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const ResourceAccess = sequelize.define(
  "ResourceAccess",
  {
    ResourceAccessID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    ResourceID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    AccessToken: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    AccessedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    IsAccessed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    AccessCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    AccessLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    OtherData: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    CreatedBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    CreatedDate: {
      type: DataTypes.DATE,
      defaultValue: literal("CURRENT_TIMESTAMP"),
    },
  },
  {
    timestamps: false,
  }
);

module.exports = ResourceAccess;
