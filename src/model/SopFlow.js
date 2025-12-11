const { literal, Sequelize } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const SopFlow = sequelize.define(
  "SopFlow",
  {
    SopFlowID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    SOPID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    SOPDraftID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    Nodes: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    Edges: {
      type: DataTypes.JSONB,
      allowNull: false,
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
    indexes: [
      {
        unique: true,
        fields: ["SopFlowID", "SOPID", "SOPDraftID"],
      },
    ],
  }
);
SopFlow.belongsTo(Users, { foreignKey: "CreatedBy", as: "CreatedByUser" });
SopFlow.belongsTo(Users, { foreignKey: "ModifiedBy", as: "ModifiedByUser" });
module.exports = SopFlow;
