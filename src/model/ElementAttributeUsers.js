const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

// ElementAttributeUsers Model
const ElementAttributeUsers = sequelize.define(
  "ElementAttributeUsers",
  {
    ElementAttributeUserID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    ElementAttributeTypeID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    ModuleTypeID: {
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
    IsReviewer: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
    },
    IsApprover: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
    },
    IsStakeholder: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
    },
    IsEscalation: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
    },
    IsStakeHolderEscalation: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
    },
    IsDownloadable: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
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
  }
);

ElementAttributeUsers.belongsTo(Users, {
  foreignKey: "UserID",
  as: "User",
});

ElementAttributeUsers.belongsTo(Users, {
  foreignKey: "CreatedBy",
  as: "CreatedByUser",
});
ElementAttributeUsers.belongsTo(Users, {
  foreignKey: "ModifiedBy",
  as: "ModifiedByUser",
});
ElementAttributeUsers.belongsTo(Users, {
  foreignKey: "DeletedBy",
  as: "DeletedByUser",
});

module.exports = ElementAttributeUsers;
