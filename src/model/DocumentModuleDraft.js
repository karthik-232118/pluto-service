const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");
const RiskAndCompliences = require("./RiskAndCompliences");

// DocumentModuleDraft Model
const DocumentModuleDraft = sequelize.define(
  "DocumentModuleDraft",
  {
    DocumentModuleDraftID: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    ElementAttributeTypeID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    ModuleTypeID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    DocumentID: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    DocumentName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    DocumentDescription: {
      type: DataTypes.TEXT,
    },
    DocumentStatus: {
      type: DataTypes.ENUM("InProgress", "Published", "Draft"),
      defaultValue: "InProgress",
    },
    DocumentExpiry: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    DocumentIsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
    },
    DocumentTags: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    EscalationType: {
      type: DataTypes.ENUM(
        "Minutes",
        "Hours",
        "Days",
        "Weeks",
        "Months",
        "Years"
      ),
      allowNull: true,
    },
    EscalationAfter: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    StakeHolderEscalationType: {
      type: DataTypes.ENUM(
        "Minutes",
        "Hours",
        "Days",
        "Weeks",
        "Months",
        "Years"
      ),
      allowNull: true,
    },
    StakeHolderEscalationAfter: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    EscalationSourceDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: literal("CURRENT_TIMESTAMP"),
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
    DocumentPath: {
      type: DataTypes.STRING,
    },
    EditedDocumentPath: {
      type: DataTypes.STRING,
    },
    ContentID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    TemplateID: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    OnlyOfficeResponceUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    NeedAcceptanceFromStakeHolder: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    NeedAcceptance: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    NeedAcceptanceForApprover: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    AcceptedByApprover: {
      type: DataTypes.ARRAY(DataTypes.UUID), // Store multiple user IDs
      defaultValue: [],
      references: {
        model: Users, // Reference Users table
        key: "UserID",
      },
    },
    AcceptedByReviewer: {
      type: DataTypes.ARRAY(DataTypes.UUID), // Store multiple user IDs
      defaultValue: [],
      references: {
        model: Users, // Reference Users table
        key: "UserID",
      },
    },
    AcceptedByStakeHolder: {
      type: DataTypes.ARRAY(DataTypes.UUID), // Store multiple user IDs
      defaultValue: [],
      references: {
        model: Users, // Reference Users table
        key: "UserID",
      },
    },
    ReadingTimeValue: {
      type: DataTypes.INTEGER,
    },
    ReadingTimeUnit: {
      type: DataTypes.ENUM("Minutes", "Hours", "Days"),
      defaultValue: "Minutes",
    },
    TemplateFontFamaly: {
      type: DataTypes.STRING,
    },
    TemplateFontSize: {
      type: DataTypes.INTEGER,
    },
    CoOwnerUserID: {
      type: DataTypes.ARRAY(DataTypes.UUID),
    },
    AllowFileChanges: {
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
  },
  {
    timestamps: false,
  }
);
DocumentModuleDraft.hasOne(RiskAndCompliences, {
  foreignKey: "DocumentModuleDraftID",
});

module.exports = DocumentModuleDraft;
