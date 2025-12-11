const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require("."); // assuming sequelize instance is in index.js
const Users = require("./Users");
const Groups = require("./Group");

const UserGroup = sequelize.define(
  "UserGroup",
  {
    UserGroupID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    UserID: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Users, // The table where users are stored
        key: "UserID",
      },
      onDelete: "CASCADE", // When a user is deleted, remove their group associations
    },
    GroupID: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Groups, // The table where groups are stored
        key: "GroupID",
      },
      onDelete: "CASCADE", // When a group is deleted, remove its user associations
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

module.exports = UserGroup;
