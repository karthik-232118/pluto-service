const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

// TrainingSimulationModuleDraft Model
const TrainingSimulationModuleDraft = sequelize.define(
  "TrainingSimulationModuleDraft",
  {
    TrainingSimulationDraftID: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    ModuleTypeID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    TrainingSimulationID: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    TrainingSimulationName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    TrainingSimulationDescription: {
      type: DataTypes.TEXT,
    },
    TrainingSimulationStatus: {
      type: DataTypes.ENUM("InProgress", "Published"),
      defaultValue: "InProgress",
      allowNull: true,
    },
    TrainingSimulationExpiry: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    TrainingSimulationIsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
    },
    TrainingSimulationTags: {
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
    },
    MasterVersion: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    SelfApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    TrainingSimulationPath: {
      type: DataTypes.STRING,
    },
    IsTrainingLinkIsVideo: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    ContentID: {
      type: DataTypes.UUID,
      allowNull: false,
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
  },
  {
    timestamps: false,
  }
);

module.exports = TrainingSimulationModuleDraft;
