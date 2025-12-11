const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const RiskModule = require("./RiskModule");
const Users = require("./Users");

const RiskAssessment = sequelize.define(
  "RiskAssessment",
  {
    RiskAssessmentID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    RiskID: {
      type: DataTypes.UUID,
      allowNull: false,
      // references: {
      //   model: RiskModule,
      //   key: "RiskID",
      // },
    },
    RiskModuleDraftID: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    RiskConsequences: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    Likelihood: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    Impact: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    Severity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      // defaultValue: Sequelize.literal("Likelihood * Impact"),
    },
    RiskValue: {
      type: DataTypes.ENUM("Low", "Medium", "High"),
      allowNull: true,
      // defaultValue: Sequelize.literal(
      //   `CASE
      //     WHEN "Severity" BETWEEN 1 AND 5 THEN 'Low'
      //     WHEN "Severity" BETWEEN 6 AND 15 THEN 'Medium'
      //     WHEN "Severity" BETWEEN 16 AND 25 THEN 'High'
      //   END`
      // ),
    },
    AffectedAreas: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    },
    Frequency: {
      type: DataTypes.ENUM("Daily", "Weekly", "Monthly", "Yearly"),
      allowNull: true,
    },
    // RiskOwner: {
    //   type: DataTypes.UUID,
    //   allowNull: true,
    //   references: {
    //     model: Users,
    //     key: "UserID",
    //   },
    // },
    // AssessmentDate: {
    //   type: DataTypes.DATE,
    //   allowNull: false,
    // },
    AssessmentNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
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

// RiskAssessment.belongsTo(Users, {
//   foreignKey: "RiskOwner",
//   as: "RiskOwnerUser",
// });

module.exports = RiskAssessment;
