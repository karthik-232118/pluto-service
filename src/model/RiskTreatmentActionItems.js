const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");
const RiskTreatment = require("./RiskTreatment");

const RiskTreatmentActionItem = sequelize.define(
  "RiskTreatmentActionItem",
  {
    RiskTreatmentActionItemID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    RiskTreatmentID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    TreatmentDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    TreatmentOwner: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    TreatmentDueDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    TreatmentActionStatus: {
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
RiskTreatmentActionItem.belongsTo(RiskTreatment, {
  foreignKey: "RiskTreatmentID",
  as: "RiskTreatment",
});

module.exports = RiskTreatmentActionItem;
