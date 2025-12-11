const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

// DocumentModule Model
const RiskModule = sequelize.define(
  "RiskModule",
  {
    RiskIndex: {
      type: DataTypes.INTEGER,
      primaryKey: false,
      autoIncrement: true,
      unique: true,
    },
    RiskID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    RiskName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    RiskDescription: {
      type: DataTypes.TEXT,
    },
    RiskCategory: {
      type: DataTypes.ENUM(
        "Financial",
        "Operational",
        "Compliance",
        "Strategic",
        "Reputational"
      ),
      allowNull: true,
    },
    RiskState: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    DepartmentID: {
      type: DataTypes.UUID,
    },
    RiskStatus: {
      type: DataTypes.ENUM("InProgress", "Published"),
      defaultValue: "InProgress",
    },
    Status: {
      type: DataTypes.ENUM("New", "Open", "InReview"),
      defaultValue: "New",
    },
    RiskSource: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    },
    DetectionDifficulty: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
      },
    },
    InitialSeverity: {
      type: DataTypes.ENUM("Red", "Amber", "Green"),
      allowNull: true,
    },
    RiskDocumentPath: {
      type: DataTypes.STRING,
    },
    RiskOwner: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: Users,
        key: "UserID",
      },
    },
    RiskIsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    NeedAcceptanceFromStakeHolder: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    NeedAcceptance: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    IsHidden: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    IdentifiedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Users,
        key: "UserID",
      },
    },
    IdentifiedDate: {
      type: DataTypes.DATE,
      defaultValue: literal("CURRENT_TIMESTAMP"),
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

RiskModule.belongsTo(Users, {
  foreignKey: "CreatedBy",
  as: "CreatedByUser",
});
RiskModule.belongsTo(Users, {
  foreignKey: "ModifiedBy",
  as: "ModifiedByUser",
});

RiskModule.belongsTo(Users, {
  foreignKey: "RiskOwner",
  as: "RiskOwnerUser",
});

module.exports = RiskModule;
