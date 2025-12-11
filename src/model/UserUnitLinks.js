const { literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const UserUnitLinks = sequelize.define('UserUnitLinks', {
  UserID: {
    type: DataTypes.UUID,
    primaryKey: true,
    unique: true
  },
  OrganizationStructureID: {
    type: DataTypes.UUID,
    primaryKey: true
  },
  CreatedBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  CreatedDate: {
    type: DataTypes.DATE,
    defaultValue: literal('CURRENT_TIMESTAMP')
  },
  ModifiedBy: {
    type: DataTypes.UUID,
    defaultValue: null,
  },
  ModifiedDate: {
    type: DataTypes.DATE,
    defaultValue: null
  }
}, {
  timestamps: false
});

module.exports = UserUnitLinks;