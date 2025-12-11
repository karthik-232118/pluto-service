const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");
const ModuleMaster = require("./ModuleMaster");
const DocumentModuleDraft = require("./DocumentModuleDraft");

// ModuleChecker Model
const ModuleChecker = sequelize.define(
  "ModuleChecker",
  {
    ModuleCheckerID: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    ModuleTypeID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    ContentID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    TrainingSimulationID: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    TestSimulationID: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    DocumentID: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    TrainingSimulationDraftID: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    TestSimulationDraftID: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    DocumentModuleDraftID: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    SOPID: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    SOPDraftID: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    TestMCQID: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    TestMCQDraftID: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    FormID: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    FormModuleDraftID: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    UserID: {
      type: DataTypes.UUID,
      defaultValue: null,
    },
    Comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ApprovalStatus: {
      type: DataTypes.ENUM("Approved", "Rejected"),
      allowNull: true,
    },
    DelegateStatus: {
      type: DataTypes.ENUM("Accepted", "Rejected"),
      allowNull: true,
    },
    IsDelegated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    DelegatedBy: {
      type: DataTypes.UUID,
      defaultValue: null,
      references: {
        model: Users,
        key: "UserID",
      },
    },
    DelegatedDate: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    IsReviewSkipped: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    WasEscalationPersonNotified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    IsSubmitted: {
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

module.exports = ModuleChecker;
