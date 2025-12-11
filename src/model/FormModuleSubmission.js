const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const FormModuleSubmission = sequelize.define(
  "FormModuleSubmission",
  {
    FormModuleSubmissionID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    UserModuleLinkID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    FormModuleDraftID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    FormJSON: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    ExtractedFormValues: {
      type: DataTypes.JSONB,
      allowNull: false,
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
  },
  {
    timestamps: false,
  }
);
FormModuleSubmission.belongsTo(Users, {
  foreignKey: "CreatedBy",
  as: "CreatedByUser",
});

module.exports = FormModuleSubmission;
