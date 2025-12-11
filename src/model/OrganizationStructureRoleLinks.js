const { literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const OrganizationStructureRoleLinks = sequelize.define('OrganizationStructureRoleLinks', {
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
  RoleID: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Role ID must not be null',
      },
      notEmpty: {
        msg: 'Role ID must not be empty',
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
    fields: ['OrganizationStructureID', 'RoleID']
  }],
  timestamps: false
});
OrganizationStructureRoleLinks.belongsTo(Users, { foreignKey: 'CreatedBy', as: 'CreatedByUser' });
OrganizationStructureRoleLinks.belongsTo(Users, { foreignKey: 'ModifiedBy', as: 'ModifiedByUser' });

module.exports = OrganizationStructureRoleLinks;