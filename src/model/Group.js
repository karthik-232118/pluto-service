const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require("."); // assuming sequelize instance is in index.js
const Users = require("./Users");
const UserGroup = require("./UserGroup");

const Group = sequelize.define(
  "Group",
  {
    GroupID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    GroupName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Group Name is required",
        },
        notNull: {
          msg: "Group Name is required",
        },
      },
    },
    GroupDescription: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    OrganizationStructureID: {
      type: DataTypes.UUID,
      allowNull: false,
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

Group.belongsToMany(Users, {
  through: UserGroup, // The join table
  foreignKey: "GroupID",
  otherKey: "UserID",
  as: "UsersInGroup", // Alias to refer to the associated users
});

module.exports = Group;
