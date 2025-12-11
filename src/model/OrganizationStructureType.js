const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const OrganizationStructureType = sequelize.define('OrganizationStructureType', {
  OrganizationStructureTypeID: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: Sequelize.fn('gen_random_uuid'),
  },
  OrganizationStructureTypeName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  IsActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
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
    type: DataTypes.UUID
  },
  ModifiedDate: {
    type: DataTypes.DATE
  }
},{
  timestamps:false
});

module.exports = OrganizationStructureType;