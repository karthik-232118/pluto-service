const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const UserModuleAccessLog = sequelize.define(
  "UserModuleAccessLog",
  {
    AccessID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    ModuleID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    UserID: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Users,
        key: "UserID",
      },
    },
    AccessedDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    IsAncknowledged: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    MasterVersion:DataTypes.STRING(20),
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
  },
  {
    timestamps: false,
  }
);
UserModuleAccessLog.belongsTo(Users, {
  foreignKey: "CreatedBy",
  as: "CreatedByUser",
});
UserModuleAccessLog.belongsTo(Users, {
  foreignKey: "ModifiedBy",
  as: "ModifiedByUser",
});
UserModuleAccessLog.belongsTo(Users, { foreignKey: "UserID", as: "User" });

module.exports = UserModuleAccessLog;
