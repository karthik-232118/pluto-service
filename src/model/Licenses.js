const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const LicenseType = require("./LicenseType");
const UserLicenseLink = require("./UserLicenseLink");
const Users = require("./Users");

const Licenses = sequelize.define('Licenses', {
  LicenseID: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: Sequelize.fn('gen_random_uuid'),
  },
  LicenseTypeID: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: LicenseType,
      key: 'LicenseTypeID'
    }
  },
  LicenseName: {
    type: DataTypes.STRING,
    allowNull: false
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
  NumberOfProcessOwnerUsers: DataTypes.INTEGER,
  PerpetualProcessOwner: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  NumberOfAuditorUsers: DataTypes.INTEGER,
  PerpetualAuditor: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  NumberOfAdminUsers: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  EnterpriseID: {
    type: DataTypes.UUID,
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
  ModuleTypeIDs: DataTypes.ARRAY(DataTypes.UUID),
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
  timestamps: false
});
Licenses.belongsTo(Users, { foreignKey: 'CreatedBy', as: 'CreatedByUser' });
Licenses.belongsTo(Users, { foreignKey: 'ModifiedBy', as: 'ModifiedByUser' });
Licenses.belongsTo(LicenseType, { foreignKey: 'LicenseTypeID' });
Licenses.belongsToMany(Users, { through: UserLicenseLink, foreignKey: 'UserID', otherKey: 'LicenseID', as: 'LicenseUsers' });

module.exports = Licenses;