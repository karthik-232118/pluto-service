const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const ErrorLogs = require("./ErrorLogs");
const UserDetails = require("./UserDetails");
const Notification = require("./Notification");
const Roles = require("./Roles");
const UserRoleLink = require("./UserRoleLink");
const UserOrganizationStructureLink = require("./UserOrganizationStructureLink");

const Users = sequelize.define(
  "Users",
  {
    UserID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    UserName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate:{
        notEmpty: {
          msg: "UserName is required",
        },
        notNull: {
          msg: "UserName is required",
        }
      }
    },
    Password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate:{
        notEmpty: {
          msg: "Password is required",
        },
        notNull: {
          msg: "Password is required",
        }
      }
    },
    UserType:{
      type: DataTypes.ENUM('Admin', 'ProcessOwner','Auditor', 'EndUser'),
      allowNull: false,
      defaultValue: 'EndUser',  //Default value is 'EndUser' until UserType is set by admin.
      validate:{
        notEmpty: {
          msg: "UserType is required",
        },
        notNull: {
          msg: "UserType is required",
        },
        isIn: {
          args: [['Admin', 'ProcessOwner','Auditor', 'EndUser']],
          msg: "UserType must be one of 'Admin', 'ProcessOwner','Auditor', 'EndUser'",
        }
      }
    },
    IsContentAndmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    CreatedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      validate:{
        notEmpty: {
          msg: "Created UserID is required",
        },
        notNull: {
          msg: "Created UserID is required",
        },
      }
    },
    CreatedDate: {
      type: DataTypes.DATE,
      defaultValue: literal("CURRENT_TIMESTAMP"),
    },
    ModifiedBy:  DataTypes.UUID,
    ModifiedDate: DataTypes.DATE,
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    DeletedBy: DataTypes.UUID,
    DeletedDate: DataTypes.DATE,
    ClientId: {
      type: DataTypes.UUID
    },
  },
  {
    timestamps: false,
  }
);
Users.belongsToMany(Roles, {
  through: UserRoleLink,
  foreignKey: "UserID",
  otherKey: "RoleID",
  as: "Role",
});

Users.hasOne(UserDetails, { foreignKey: "UserID", as: "UserDetail" });
Users.hasOne(Notification, {
  foreignKey: "UserID",
  as: "UserNotificationConfiguration",
});
Users.hasOne(UserOrganizationStructureLink, {foreignKey:"UserID"});
Users.hasMany(ErrorLogs, { foreignKey: "UserID", as: "ErrorLogs" });

module.exports = Users;
