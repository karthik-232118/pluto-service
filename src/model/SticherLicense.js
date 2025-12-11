const { fn, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const SticherLicense = sequelize.define("SticherLicense", {
    LicenseID: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: fn('gen_random_uuid'),
  },
  ClientID: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  LicenseKey: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  NumberOfEndUsers: DataTypes.INTEGER,
  PerpetualEndUser: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  NumberOfRecordings: DataTypes.INTEGER,
  PerpetualRecordings: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  NumberOfSticher: DataTypes.INTEGER,
  PerpetualSticher: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  NumberOfAdminUsers: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  ValidityFrom: {
    type: DataTypes.DATE,
    allowNull: false
  },
  ValidityTo: {
    type: DataTypes.DATE,
    allowNull: false
  },
  Module: DataTypes.ENUM('Sticher', 'Recording', 'All'),
  IsExtendedLicense: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  IsActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  IsDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  CreatedBy: {
    type: DataTypes.UUID,
    allowNull: false
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
    timestamps: false,
});

module.exports = SticherLicense;