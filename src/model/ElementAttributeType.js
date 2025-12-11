const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");
const ElementAttributeUsers = require("./ElementAttributeUsers");

// ElementAttributeType Model
const ElementAttributeType = sequelize.define(
  "ElementAttributeType",
  {
    ElementAttributeTypeID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    ModuleTypeID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    Name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    Description: {
      type: DataTypes.TEXT,
    },
    SelfApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    IsReview: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    IsApproval: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    IsStakeholder: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    IsEscalation: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    IsStakeHolderEscalation: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    EscalationType: {
      type: DataTypes.ENUM(
        "Minutes",
        "Hours",
        "Days",
        "Weeks",
        "Months",
        "Years"
      ),
      allowNull: true,
    },
    EscalationAfter: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    StakeHolderEscalationType: {
      type: DataTypes.ENUM(
        "Minutes",
        "Hours",
        "Days",
        "Weeks",
        "Months",
        "Years"
      ),
      allowNull: true,
    },
    StakeHolderEscalationAfter: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    IsEmailTrigger: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    IsAutoPublish: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    IsExpiry: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    IsDownloadable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    ExpiryDate: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    ReviewNotificationType: {
      type: DataTypes.ENUM("Days"),
      allowNull: true,
    },
    ReviewNotificationInterval: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    NeedAcceptanceFromStakeHolder: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    NeedAcceptance: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    NeedAcceptanceForApprover: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    OrganizationStructureID: {
      type: DataTypes.UUID,
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    CoOwnerUserID: {
      type: DataTypes.ARRAY(DataTypes.UUID)
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

ElementAttributeType.belongsTo(Users, {
  foreignKey: "CreatedBy",
  as: "CreatedByUser",
});
ElementAttributeType.belongsTo(Users, {
  foreignKey: "ModifiedBy",
  as: "ModifiedByUser",
});
ElementAttributeType.belongsTo(Users, {
  foreignKey: "DeletedBy",
  as: "DeletedByUser",
});

ElementAttributeType.hasMany(ElementAttributeUsers, {
  foreignKey: "ElementAttributeTypeID",
  as: "Reviewers",
  scope: { IsReviewer: true },
});

ElementAttributeType.hasMany(ElementAttributeUsers, {
  foreignKey: "ElementAttributeTypeID",
  as: "Approvers",
  scope: { IsApprover: true },
});

ElementAttributeType.hasMany(ElementAttributeUsers, {
  foreignKey: "ElementAttributeTypeID",
  as: "Stakeholders",
  scope: { IsStakeholder: true },
});

ElementAttributeType.hasMany(ElementAttributeUsers, {
  foreignKey: "ElementAttributeTypeID",
  as: "EscalationUsers",
  scope: { IsEscalation: true },
});

ElementAttributeType.hasMany(ElementAttributeUsers, {
  foreignKey: "ElementAttributeTypeID",
  as: "DownloadableUsers",
  scope: { IsDownloadable: true },
});

ElementAttributeType.hasMany(ElementAttributeUsers, {
  foreignKey: "ElementAttributeTypeID",
  as: "StakeHolderEscalationUsers",
  scope: { IsStakeHolderEscalation: true },
});

module.exports = ElementAttributeType;
