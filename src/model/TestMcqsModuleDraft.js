const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

// TestMcqsModuleDraft Model
const TestMcqsModuleDraft = sequelize.define(
  "TestMcqsModuleDraft",
  {
    TestMCQDraftID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    TestMCQID: {
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
    QuestionsAndAnswers: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    TestMCQName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    TestMCQDescription: {
      type: DataTypes.TEXT,
    },
    TestMCQStatus: {
      type: DataTypes.ENUM("InProgress", "Published"),
      defaultValue: "InProgress",
      allowNull: true,
    },
    TestMCQExpiry: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    TestMCQIsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
    },
    TestMCQTags: {
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
    TotalQuestions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
    },
    TotalAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
    },
    PassPercentage: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: null,
    },
    TimeLimite: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: "00:00:00",
    },
    MinimumTime: {
      type: DataTypes.TIME,
      defaultValue: "00:00:00"
    },
    IsMandatoryAllQuestions: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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

module.exports = TestMcqsModuleDraft;
