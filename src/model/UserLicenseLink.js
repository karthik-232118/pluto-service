const { literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const UserLicenseLink = sequelize.define('UserLicenseLink', {
  UserID: {
    type: DataTypes.UUID,
    primaryKey:true
  },
  LicenseID: {
    type: DataTypes.UUID,
    primaryKey:true
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
UserLicenseLink.belongsTo(Users, { foreignKey: 'CreatedBy', as: 'CreatedByUser' });
UserLicenseLink.belongsTo(Users, { foreignKey: 'ModifiedBy', as: 'ModifiedByUser' });
module.exports = UserLicenseLink;