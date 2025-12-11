const { literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Licenses = require("./Licenses");
const OrganizationStructureType = require("./OrganizationStructureType");

const Enterprise = sequelize.define('Enterprise', {
  EnterpriseID: {
    type: DataTypes.UUID,
    primaryKey: true,
  },
  EnterpriseName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  EnterpriseDescription: {
    type: DataTypes.TEXT
  },
  IsActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  EnterpriseTypeID: {
    type: DataTypes.UUID,
    allowNull: false
  },
  EnterpriseEmail: {
    type: DataTypes.STRING
  },
  EnterpriseToken: {
    type: DataTypes.STRING
  },
  MacInterFaces: {
    type: DataTypes.JSON
  },
  HostName: {
    type: DataTypes.STRING
  },
  MachineUUID: {
    type: DataTypes.STRING
  },
  DriveSerialNumber: {
    type: DataTypes.STRING
  },
  OSSerialNumber: {
    type: DataTypes.STRING
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
  ModifiedDate: DataTypes.DATE,
  IsDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  DeletedBy: DataTypes.UUID,
  DeletedDate: DataTypes.DATE
}, {
  timestamps: false,

});

Enterprise.hasOne(Licenses, { foreignKey: 'OrganizationStructureID', as: 'License' });
Enterprise.belongsTo(OrganizationStructureType, { foreignKey: 'EnterpriseTypeID', as: 'OrganizationType' });
module.exports = Enterprise;