const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const RiskModule = require("./RiskModule");
const Users = require("./Users");

const RiskTreatment = sequelize.define(
  "RiskTreatment",
  {
    RiskTreatmentID: {
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
    TreatmentStrategy: {
      type: DataTypes.ENUM("Accept", "Reduce", "Transfer", "Avoid"),
      allowNull: false,
    },
    TreatmentActions: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    // ResponsibleParty: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    //     references: {
    //       model: Users,
    //       key: "UserID",
    //     },
    // },
    TargetCompletionDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    TreatmentStatus: {
      type: DataTypes.ENUM("NotStarted", "InProgress", "Completed"),
      defaultValue: "NotStarted",
    },
    ResidualRisk: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
    },
    TreatmentEffectiveness: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
    },
    ResourcesRequired: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    ApprovalStatus: {
      type: DataTypes.ENUM("Pending", "Approved", "Rejected", "OnHold"),
      allowNull: true,
      defaultValue: "Pending",
    },
    ControlMeasures: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    RiskTreatmentDocumentPath: {
      type: DataTypes.STRING,
    },
    BudgetRequired: {
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
        model: Users, // The table where users are stored
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
        model: Users, // The table where users are stored
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
        model: Users, // The table where users are stored
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

RiskTreatment.belongsTo(Users, {
  foreignKey: "ResponsibleParty",
  as: "ResponsiblePartyUser",
});

module.exports = RiskTreatment;
