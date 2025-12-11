const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Roles = require("./Roles");
const Users = require("./Users");
const UserModuleLink = require("./UserModuleLink");

const Departments = sequelize.define(
  "Departments",
  {
    DepartmentID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    DepartmentName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "DepartmentName is required",
        },
        notNull: {
          msg: "DepartmentName is required",
        },
        is: {
          args: /^[a-zA-Z ]*$/,
          msg: "DepartmentName should only contain alphabets and spaces",
        },
      },
    },
    DepartmentDescription: {
      type: DataTypes.TEXT,
    },
    OrganizationStructureID:{
      type: DataTypes.UUID,
      allowNull: false
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    ModifiedDate: DataTypes.DATE,
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    DeletedBy: DataTypes.UUID,
    DeletedDate: DataTypes.DATE,
  },
  {
    timestamps: false,
  }
);
Departments.belongsTo(Users, { foreignKey: "CreatedBy", as: "CreatedByUser" });
Departments.belongsTo(Users, {
  foreignKey: "ModifiedBy",
  as: "ModifiedByUser",
});
Departments.hasMany(Roles, { foreignKey: "RoleID" });

module.exports = Departments;
