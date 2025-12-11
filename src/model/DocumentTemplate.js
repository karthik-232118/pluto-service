const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

// DocumentTemplate Model
const DocumentTemplate = sequelize.define(
  "DocumentTemplate",
  {
    DocumentTemplateID: {
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
    OrganizationStructureID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    DocumentName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    DocumentDescription: {
      type: DataTypes.TEXT,
    },
    DocumentIsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
    },
    DocumentExpiry: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    DraftVersion: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "0.1",
    },
    MasterVersion: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    SelfApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    IsPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    DocumentPath: {
      type: DataTypes.STRING,
    },
    EditedDocumentPath: {
      type: DataTypes.STRING,
    },
    ContentID: {
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
      references: { model: Users, key: "UserID" },
    },
    CreatedDate: {
      type: DataTypes.DATE,
      defaultValue: literal("CURRENT_TIMESTAMP"),
    },
    ModifiedBy: {
      type: DataTypes.UUID,
      defaultValue: null,
      references: { model: Users, key: "UserID" },
    },
    ModifiedDate: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    DeletedBy: {
      type: DataTypes.UUID,
      defaultValue: null,
      references: { model: Users, key: "UserID" },
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

module.exports = DocumentTemplate;
