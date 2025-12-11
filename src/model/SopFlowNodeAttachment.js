const { literal, Sequelize } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const SopFlowNodeAttachment = sequelize.define(
  "SopFlowNodeAttachment",
  {
    SopFlowNodeAttachmentID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    SOPID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    SOPDraftID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    SopFlowID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    NodeID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    IsClip: {
      type: DataTypes.BOOLEAN,
    },
    IsImage: {
      type: DataTypes.BOOLEAN,
    },
    AttachmentTitle: {
      type: DataTypes.STRING,
    },
    AttachmentLink: {
      type: DataTypes.STRING,
    },
    AttachmentType: {
      type: DataTypes.STRING,
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
    indexes: [
      {
        unique: true,
        fields: [
          "SopFlowNodeAttachmentID",
          "SOPID",
          "SOPDraftID",
          "SopFlowID",
          "NodeID",
        ],
      },
    ],
  }
);
SopFlowNodeAttachment.belongsTo(Users, {
  foreignKey: "CreatedBy",
  as: "CreatedByUser",
});
SopFlowNodeAttachment.belongsTo(Users, {
  foreignKey: "ModifiedBy",
  as: "ModifiedByUser",
});
module.exports = SopFlowNodeAttachment;
