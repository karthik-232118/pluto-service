const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const OrganizationStructureLicense = sequelize.define('OrganizationStructureLicense', {
  OrganizationStructureLicenseID: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: Sequelize.fn('gen_random_uuid'),
  },
  OrganizationStructureID: {
    type: DataTypes.UUID,
    allowNull: false
  },
  LicenseKey: {
    type: DataTypes.TEXT,
    unique: true,
    allowNull: false,
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
  ModifiedDate: DataTypes.DATE,
  IsDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  DeletedBy: DataTypes.UUID,
  DeletedDate: DataTypes.DATE
}, {
  timestamps: false
});

module.exports = OrganizationStructureLicense;