const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const RiskModule = require("./RiskModule");
const Users = require("./Users");

const RiskMonitoringReview = sequelize.define(
  "RiskMonitoringReview",
  {
    RiskMonitoringReviewID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    RiskID: {
      type: DataTypes.UUID,
      allowNull: false,
      //   references: {
      //     model: RiskModule,
      //     key: "RiskID",
      //   },
    },
    RiskModuleDraftID: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    MonitoringFrequency: {
      type: DataTypes.ENUM("Daily", "Weekly", "Monthly", "Quarterly"),
      allowNull: false,
    },
    LastReviewDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    NextReviewDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ReviewFindings: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    AlertCondition: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    AlertAction: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    KPI: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ControlEffectiveness: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
    },
    // StatusChanges: {
    //   type: DataTypes.TEXT,
    //   allowNull: true,
    // },
    // EscalationPath: {
    //   type: DataTypes.TEXT,
    //   allowNull: true,
    // },
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

// Associations

RiskMonitoringReview.belongsTo(Users, {
  foreignKey: "ReviewPerformedBy",
  as: "ReviewPerformedByUser",
});

module.exports = RiskMonitoringReview;
