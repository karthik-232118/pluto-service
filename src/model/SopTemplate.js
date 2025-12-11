const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

// Module Model
const SopTemplate = sequelize.define(
  "SopTemplate",
  {
    TemplateID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    TemplateName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    TemplateDescription: {
      type: DataTypes.TEXT,
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    TemplateXMLElement: {
      type: DataTypes.TEXT,
    },
    TemplateFontFamly: {
      type: DataTypes.STRING,
    },
    TemplateFooter: {
      type: DataTypes.TEXT,
    },
    TemplateHeader: {
      type: DataTypes.TEXT,
    },
    OrganizationStructureID: {
      type: DataTypes.UUID,
      allowNull: false
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
        fields: ["TemplateName",
          "OrganizationStructureID"]
      }
    ]
  }
);

module.exports = SopTemplate;
