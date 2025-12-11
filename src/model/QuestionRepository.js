const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const QuestionAnswersLink = require("./QuestionAnswersLink");
const Users = require("./Users");

const QuestionRepository = sequelize.define(
  "QuestionRepository",
  {
    QuestionID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    TestMCQID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    QuestionHeading: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    QuestionText: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    QuestionImage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    IsMultipleAnswer: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    IsAnswerWithImage: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    IsRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
QuestionRepository.belongsTo(Users, {
  foreignKey: "CreatedBy",
  as: "CreatedByUser",
});
QuestionRepository.belongsTo(Users, {
  foreignKey: "ModifiedBy",
  as: "ModifiedByUser",
});
QuestionRepository.hasMany(QuestionAnswersLink, {
  foreignKey: "QuestionID",
  as: "AnswerOptions",
});
module.exports = QuestionRepository;
