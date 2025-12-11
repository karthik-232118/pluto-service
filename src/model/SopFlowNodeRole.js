const { literal, Sequelize } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");
const Roles = require("./Roles");

const SopFlowNodeRole = sequelize.define(
  "SopFlowNodeRole",
  {
    SopFlowNodeRoleID: {
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
    SopFlowID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    NodeID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    RoleID: {
      type: DataTypes.UUID,
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
    indexes: [
      {
        unique: true,
        fields: [
          "SopFlowNodeRoleID",
          "SOPID",
          "SOPDraftID",
          "SopFlowID",
          "NodeID",
          "RoleID",
        ],
      },
    ],
  }
);
SopFlowNodeRole.belongsTo(Users, {
  foreignKey: "CreatedBy",
  as: "CreatedByUser",
});
SopFlowNodeRole.belongsTo(Users, {
  foreignKey: "ModifiedBy",
  as: "ModifiedByUser",
});

SopFlowNodeRole.belongsTo(Roles, { foreignKey: "RoleID", as: "Role" });

module.exports = SopFlowNodeRole;
