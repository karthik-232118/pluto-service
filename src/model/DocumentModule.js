const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const UserModuleAccessLog = require("./UserModuleAccessLog");
const UserModuleLink = require("./UserModuleLink");
const Users = require("./Users");
const ModuleChecker = require("./ModuleChecker");
const ModuleEscalation = require("./ModuleEscalation");
const DocumentModuleDraft = require("./DocumentModuleDraft");
const RiskAndCompliences = require("./RiskAndCompliences");
const Favorite = require("./Favorite");

// DocumentModule Model
const DocumentModule = sequelize.define(
  "DocumentModule",
  {
    DocumentID: {
      type: DataTypes.UUID,
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
    DocumentName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    DocumentDescription: {
      type: DataTypes.TEXT,
    },
    // Document Status = InProgress or Published
    DocumentStatus: {
      type: DataTypes.ENUM("InProgress", "Published", "Draft"),
      defaultValue: "InProgress",
    },
    DocumentIsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
    },
    DocumentExpiry: {
      type: DataTypes.DATE,
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
    DraftVersion: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "0.1",
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
    DriveID: {
      type: DataTypes.STRING,
    },
    TemplateID: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
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
    IsHidden: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    SequenceNumber: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      field: "SequenceNumber",
    },
    ReadingTimeValue: {
      type: DataTypes.INTEGER,
    },
    ReadingTimeUnit: {
      type: DataTypes.ENUM("Minutes", "Hours", "Days"),
      defaultValue: "Minutes",
    },
    CoOwnerUserID: {
      type: DataTypes.ARRAY(DataTypes.UUID),
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
    TemplateFontFamaly: {
      type: DataTypes.STRING,
    },
    TemplateFontSize: {
      type: DataTypes.INTEGER,
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

DocumentModule.belongsTo(Users, {
  foreignKey: "CreatedBy",
  as: "CreatedByUser",
});
DocumentModule.belongsTo(Users, {
  foreignKey: "ModifiedBy",
  as: "ModifiedByUser",
});
DocumentModule.hasMany(UserModuleAccessLog, {
  foreignKey: "ModuleID",
  as: "Logs",
});
DocumentModule.hasOne(UserModuleLink, {
  foreignKey: "ModuleID",
  as: "UserModule",
});
DocumentModule.hasOne(RiskAndCompliences, {
  foreignKey: "DocumentID",
});
DocumentModule.hasOne(Favorite, {
  foreignKey: "ModuleID",
  as: "UserFavorite",
});
DocumentModule.beforeBulkCreate(
  (instance) =>
  (instance.DocumentPath =
    "src/infrastructure/media/Document/" + instance.DocumentID + ".pdf")
);
module.exports = DocumentModule;
