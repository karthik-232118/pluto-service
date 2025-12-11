const { literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");
// const Users = require("./Users");

const UserDeparmentLink = sequelize.define(
  "UserDeparmentLink",
  {
    UserID: {
      type: DataTypes.UUID,
      primaryKey: true
    },
    DepartmentID: {
      type: DataTypes.UUID,
      primaryKey: true
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    CreatedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      // references: {
      //   model: Users,
      //   key: "UserID",
      // },
    },
    CreatedDate: {
      type: DataTypes.DATE,
      defaultValue: literal("CURRENT_TIMESTAMP"),
    },
    ModifiedBy: {
      type: DataTypes.UUID,
      defaultValue: null,
      // references: {
      //   model: Users,
      //   key: "UserID",
      // },
    },
    ModifiedDate: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    DeletedBy: {
      type: DataTypes.UUID,
      defaultValue: null,
      // references: {
      //   model: Users,
      //   key: "UserID",
      // },
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
// UserDeparmentLink.belongsTo(Users, { foreignKey: 'CreatedBy', as: 'CreatedByUser' });
// UserDeparmentLink.belongsTo(Users, { foreignKey: 'ModifiedBy', as: 'ModifiedByUser' });
module.exports = UserDeparmentLink;
