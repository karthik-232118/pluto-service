const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const LicenseType = sequelize.define('LicenseType', {
  LicenseTypeID: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: Sequelize.fn('gen_random_uuid'),
  },
  LicenseTypeName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  LicenseTypeDescription: {
    type: DataTypes.TEXT
  },
  IsActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  CreatedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references:{
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
    defaultValue:null,
    references:{
      model: Users,
      key: 'UserID'
    }
  },
  ModifiedDate: {
    type: DataTypes.DATE,
    defaultValue: null
  }
},{
  timestamps: false
});
// LicenseType.belongsTo(Users, { foreignKey: 'CreatedBy', as: 'CreatedByUser' });
// LicenseType.belongsTo(Users, { foreignKey: 'ModifiedBy', as: 'ModifiedByUser' });
module.exports = LicenseType;