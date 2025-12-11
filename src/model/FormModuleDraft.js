const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const UserModuleAccessLog = require("./UserModuleAccessLog");
const UserModuleLink = require("./UserModuleLink");
const Users = require("./Users");

// FormModule Model
const FormModuleDraft = sequelize.define(
  "FormModuleDraft",
  {
    FormModuleDraftID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    FormID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    ModuleTypeID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    ContentID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    FormName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    FormDescription: {
      type: DataTypes.TEXT,
    },
    // Form Status = InProgress or Published
    FormStatus: {
      type: DataTypes.ENUM("InProgress", "Published"),
      defaultValue: "InProgress",
    },
    FormIsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
    },
    FormExpiry: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    FormTags: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    EscalationType: {
      type: DataTypes.ENUM("Minutes", "Hours", "Days", "Weeks", "Months", "Years"),
      allowNull: true,
    },
    EscalationAfter: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    DraftVersion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    MasterVersion: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    SelfApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    FormJSON: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    NeedAcceptance: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    FormCreatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    FormCreatedDate: {
      type: DataTypes.DATE,
      defaultValue: null,
      allowNull: true,
    },
    FormModifiedBy: {
      type: DataTypes.UUID,
      defaultValue: null,
      allowNull: true,
    },
    FormModifiedDate: {
      type: DataTypes.DATE,
      defaultValue: null,
      allowNull: true,
    },
  },
  {
    timestamps: false,
  }
);

module.exports = FormModuleDraft;
