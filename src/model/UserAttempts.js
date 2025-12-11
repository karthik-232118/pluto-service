const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const UserAttemptDetails = require("./UserAttemptDetails");
const Users = require("./Users");
const TestMcqsModule = require("./TestMcqsModule");

const UserAttempts = sequelize.define(
  "UserAttempts",
  {
    AttemptID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    ModuleID: {
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
    NumberOfQuestions: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    QuestionsCorrect: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    QuestionsIncorrect: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    Score: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    StartedOn: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    CompletedOn: {
      type: DataTypes.DATE,
    },
    IsFinished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    MasterVersion: DataTypes.STRING(20),
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
  },
  {
    timestamps: false,
  }
);
UserAttempts.belongsTo(Users, { foreignKey: "CreatedBy", as: "CreatedByUser" });
UserAttempts.belongsTo(Users, {
  foreignKey: "ModifiedBy",
  as: "ModifiedByUser",
});
UserAttempts.belongsTo(Users, { foreignKey: "UserID", as: "AttemptUser" });
UserAttempts.hasMany(UserAttemptDetails, {
  foreignKey: "AttemptID",
  as: "AttemptDetails",
});

module.exports = UserAttempts;
