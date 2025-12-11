const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const EmailTemplate = sequelize.define(
  "EmailTemplate",
  {
    EmailTemplateID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    Subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    Body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    GreetingName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    signature: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    logo: { 
      type: DataTypes.TEXT,
      allowNull: true,
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

EmailTemplate.belongsTo(Users, {
  foreignKey: "UserID",
  as: "User",
});

module.exports = EmailTemplate;
