const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

// Campaign Model
const Campaign = sequelize.define(
  "Campaign",
  {
    CampaignID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    FormID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    FormModuleDraftID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    FormFields: {
      type: DataTypes.JSONB,
    },
    CampaignName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    CampaignDescription: {
      type: DataTypes.TEXT,
    },
    CampaignCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    CampaignEmailReferenceNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    CampaignEmailSubject: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    CampaignEmailMessage: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    CampaignEmailCC: {
      type: DataTypes.TEXT,
    },
    OrganizationStructureID: {
      type: DataTypes.UUID,
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
      references: {
        model: Users,
        key: "UserID",
      },
    },
    CreatedDate: {
      type: DataTypes.DATE,
      defaultValue: literal("CURRENT_TIMESTAMP"),
    },
    ModifiedBy: {
      type: DataTypes.UUID,
      defaultValue: null,
      references: {
        model: Users,
        key: "UserID",
      },
    },
    ModifiedDate: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    DeletedBy: {
      type: DataTypes.UUID,
      defaultValue: null,
      references: {
        model: Users,
        key: "UserID",
      },
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

module.exports = Campaign;
