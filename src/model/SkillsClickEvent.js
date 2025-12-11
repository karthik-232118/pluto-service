const { Sequelize } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const SkillsClickEvent = sequelize.define("SkillsClickEvent", {
  ClickEventID: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: Sequelize.fn("gen_random_uuid"),
  },
  CreateSessionID: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  UserID: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  SkillID: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  CorrectClick: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  InCorrectClick: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
});

module.exports = SkillsClickEvent;
