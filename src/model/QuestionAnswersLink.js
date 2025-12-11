const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const QuestionAnswersLink = sequelize.define(
  "QuestionAnswersLink",
  {
    AnswerID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    QuestionID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    TestMCQID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    OptionText: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    IsCorrect: {
      type: DataTypes.BOOLEAN,
    },
    Ordering: {
      type: DataTypes.INTEGER,
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
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    DeletedBy: {
      type: DataTypes.UUID,
      defaultValue: null,
    },
    DeletedDate: DataTypes.DATE,
  },
  {
    timestamps: false,
  }
);
QuestionAnswersLink.belongsTo(Users, {
  foreignKey: "CreatedBy",
  as: "CreatedByUser",
});
QuestionAnswersLink.belongsTo(Users, {
  foreignKey: "ModifiedBy",
  as: "ModifiedByUser",
});
module.exports = QuestionAnswersLink;
