const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const LicenseType = require("./LicenseType");
const UserLicenseLink = require("./UserLicenseLink");
const Users = require("./Users");

const LicenseLogs = sequelize.define('LicenseLogs', {
  LicenseLogID: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: Sequelize.fn('gen_random_uuid'),
  },
  LicenseID: {
    type: DataTypes.UUID
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
LicenseLogs.belongsTo(Users, { foreignKey: 'CreatedBy', as: 'CreatedByUser' });
LicenseLogs.belongsTo(Users, { foreignKey: 'ModifiedBy', as: 'ModifiedByUser' });
LicenseLogs.belongsTo(LicenseType, { foreignKey: 'LicenseTypeID' });
LicenseLogs.belongsToMany(Users, { through: UserLicenseLink, foreignKey: 'UserID', otherKey: 'LicenseID', as: 'LicenseUsers' });

module.exports = LicenseLogs;