const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");
const ModuleMaster = require("./ModuleMaster");
const DocumentModuleDraft = require("./DocumentModuleDraft");

// EditedDocumentVersion Model
const EditedDocumentVersion = sequelize.define(
  "EditedDocumentVersion",
  {
    EditedDocumentVersionID: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    ModuleTypeID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    ContentID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    DocumentEditedPath: {
      type: DataTypes.STRING,
    },
    DocumentID: {
      type: Sequelize.UUID,
      allowNull: true,
    },

    DocumentModuleDraftID: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    UserID: {
      type: DataTypes.UUID,
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

module.exports = EditedDocumentVersion;
