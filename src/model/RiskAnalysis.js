const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const RiskModule = require("./RiskModule");
const Users = require("./Users");

const RiskAnalysis = sequelize.define(
  "RiskAnalysis",
  {
    RiskAnalysisID: {
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
    RootCause: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    CurrentControls: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    ControlEffectiveness: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    RiskExposure: {
      type: DataTypes.FLOAT,
      allowNull: true,
      //   defaultValue: Sequelize.literal(
      //     'CASE WHEN "ControlEffectiveness" >= 4 THEN 0.2 * (Likelihood * Impact) ' +
      //       'WHEN "ControlEffectiveness" >= 2 THEN 0.5 * (Likelihood * Impact) ' +
      //       "ELSE (Likelihood * Impact) END"
      //   ),
    },
    PotentialConsequences: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    TriggerIndicators: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },

    // FishboneFactors: {
    //   type: DataTypes.ARRAY(DataTypes.STRING),
    //   allowNull: true,
    // },
    // AnalysisPerformedBy: {
    //   type: DataTypes.UUID,
    //   allowNull: false,
    //   references: {
    //     model: Users,
    //     key: "UserID",
    //   },
    // },
    // AnalysisDate: {
    //   type: DataTypes.DATE,
    //   allowNull: false,
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

RiskAnalysis.belongsTo(Users, {
  foreignKey: "AnalysisPerformedBy",
  as: "AnalysisPerformedByUser",
});

module.exports = RiskAnalysis;
