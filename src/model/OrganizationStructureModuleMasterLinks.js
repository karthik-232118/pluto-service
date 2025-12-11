const { literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const OrganizationStructureModuleMasterLinks = sequelize.define('OrganizationStructureModuleMasterLinks', {
  OrganizationStructureID: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Organization Structure ID must not be null',
      },
      notEmpty: {
        msg: 'Organization Structure ID must not be empty',
      }
    }
  },
  ModuleTypeID: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Module Type ID must not be null',
      },
      notEmpty: {
        msg: 'Module Type ID must not be empty',
      }
    }
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
    fields: ['OrganizationStructureID', 'ModuleTypeID']
  }],
  timestamps: false
});
OrganizationStructureModuleMasterLinks.belongsTo(Users, { foreignKey: 'CreatedBy', as: 'CreatedByUser' });
OrganizationStructureModuleMasterLinks.belongsTo(Users, { foreignKey: 'ModifiedBy', as: 'ModifiedByUser' });

module.exports = OrganizationStructureModuleMasterLinks;