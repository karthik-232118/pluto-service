const { literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");
const Departments = require("./Departments");
const Roles = require("./Roles");
const UserDetails = require("./UserDetails");

const UserModuleLink = sequelize.define(
  "UserModuleLink",
  {
    UserModuleLinkID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: literal("gen_random_uuid()"),
    },
    DepartmentID: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    RoleID: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    GroupID: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    ModuleTypeID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    ModuleID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    UserID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    IsAuditor: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    StartDate: {
      type: DataTypes.DATE,
    },
    DueDate: {
      type: DataTypes.DATE,
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
UserModuleLink.belongsTo(Users, {
  foreignKey: "CreatedBy",
  as: "CreatedByUser",
});
UserModuleLink.belongsTo(Users, {
  foreignKey: "ModifiedBy",
  as: "ModifiedByUser",
});
UserModuleLink.belongsTo(UserDetails, {
  foreignKey: "UserID",
  as: "AssignedUser",
});

module.exports = UserModuleLink;
