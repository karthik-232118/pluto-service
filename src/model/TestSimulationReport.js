const { literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const TestSimulationReport = sequelize.define(
  "TestSimulationReport",
  {
    TestSimulationReportID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: literal("gen_random_uuid()"),
    },
    TestSimulationID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    UserID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    RightAnswerClick: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    WrongAnswerClick: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    TotalPercentage: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    Report: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    MasterVersion:DataTypes.STRING(20),
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

module.exports = TestSimulationReport;
