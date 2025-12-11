const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
// const Users = require("./Users");

const Roles = sequelize.define(
  "Roles",
  {
    RoleID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    RoleName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Role Name cannot be empty",
        },
        notNull: {
          msg: "Role Name cannot be null",
        },
        len: {
          args: [4, 30],
          msg: "Role Name must be between 3 and 30 characters long",
        },
        is: {
          args: /^[a-zA-Z ]*$/,
          msg: "Role Name must contain only alphabets and spaces",
        },
      },
    },
    RoleDescription: {
      type: DataTypes.TEXT,
    },
    OrganizationStructureID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    CreatedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      // references:{
      //   model: Users,
      //   key: 'UserID'
      // }
    },
    CreatedDate: {
      type: DataTypes.DATE,
      defaultValue: literal("CURRENT_TIMESTAMP"),
    },
    ModifiedBy: DataTypes.UUID,
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
    // indexes: [
    //   {
    //     unique: true,
    //     fields: ["RoleName", "OrganizationStructureID"],
    //   },
    // ],
  }
);
// Roles.belongsTo(Users, { foreignKey: 'CreatedBy', as: 'CreatedByUser' });
// Roles.belongsTo(Users, { foreignKey: 'ModifiedBy', as: 'ModifiedByUser' });
module.exports = Roles;
