const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const ModuleMaster = require("./ModuleMaster");
const UserModuleAccessLog = require("./UserModuleAccessLog");
const UserModuleLink = require("./UserModuleLink");
const Users = require("./Users");
const SopDetails = require("./SopDetails");
const Favorite = require("./Favorite");
const DocumentModule = require("./DocumentModule");

// Module Model
const SopModule = sequelize.define(
  "SopModule",
  {
    SOPID: {
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
    },
    SOPName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    SOPDescription: {
      type: DataTypes.TEXT,
    },
    SOPStatus: {
      type: DataTypes.ENUM("InProgress", "Published"),
      defaultValue: "InProgress",
      allowNull: true,
    },
    SOPExpiry: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    SOPIsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
    },
    SOPTags: {
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
    SOPXMLElement: {
      type: DataTypes.TEXT,
    },
    ContentID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    IsTemplate: {
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
    IsHidden: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    IsSopWithWorkflow: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    IsReactFlow: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    SOPDocID: {
      type: DataTypes.UUID,
    },
    SequenceNumber: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      field: "SequenceNumber",
    },
    TemplateFontFamly: {
      type: DataTypes.STRING,
    },
    TemplateFooter: {
      type: DataTypes.TEXT,
    },
    TemplateHeader: {
      type: DataTypes.TEXT,
    },
    CoOwnerUserID: {
      type: DataTypes.ARRAY(DataTypes.UUID),
    },
    CTQImageURL: {
      type: DataTypes.TEXT,
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
SopModule.belongsTo(Users, { foreignKey: "CreatedBy", as: "CreatedByUser" });
SopModule.belongsTo(Users, { foreignKey: "ModifiedBy", as: "ModifiedByUser" });
SopModule.belongsTo(ModuleMaster, {
  foreignKey: "ModuleTypeID",
  as: "ModuleMaster",
});
SopModule.hasMany(UserModuleAccessLog, { foreignKey: "ModuleID", as: "Logs" });
SopModule.hasOne(UserModuleLink, {
  foreignKey: "ModuleID",
  as: "UserModule",
});
SopModule.hasMany(SopDetails, { foreignKey: "SopID", as: "SOPDetails" });
SopModule.hasOne(Favorite, {
  foreignKey: "ModuleID",
  as: "UserFavorite",
});
SopModule.belongsTo(DocumentModule, { foreignKey: "SOPDocID" });
module.exports = SopModule;
