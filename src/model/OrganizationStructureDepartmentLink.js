const { literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const OrganizationStructureDepartmentLink = sequelize.define('OrganizationStructureDepartmentLink', {
  OrganizationStructureID: {
    type: DataTypes.UUID,
    primaryKey: true
  },
  DepartmentID: {
    type: DataTypes.UUID,
    primaryKey: true
  },
  CreatedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Users,
      key: 'UserID'
    }
  },
  CreatedDate: {
    type: DataTypes.DATE,
    defaultValue: literal('CURRENT_TIMESTAMP')
  },
  ModifiedBy: {
    type: DataTypes.UUID,
    defaultValue: null,
    references: {
      model: Users,
      key: 'UserID'
    }
  },
  ModifiedDate: {
    type: DataTypes.DATE,
    defaultValue: null
  }
}, {
  indexes: [{
    unique: true,
    fields: ['OrganizationStructureID', 'DepartmentID']
  }]
}, {
  timestamps: false
});
OrganizationStructureDepartmentLink.belongsTo(Users, { foreignKey: 'CreatedBy', as: 'CreatedByUser' });
OrganizationStructureDepartmentLink.belongsTo(Users, { foreignKey: 'ModifiedBy', as: 'ModifiedByUser' });
module.exports = OrganizationStructureDepartmentLink;