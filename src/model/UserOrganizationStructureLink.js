const { literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
// const Users = require("./Users");

const UserOrganizationStructureLink = sequelize.define('UserOrganizationStructureLink', {
  UserID: {
    type: DataTypes.UUID,
    primaryKey:true,
    unique: true
  },
  OrganizationStructureID: {
    type: DataTypes.UUID,
    primaryKey:true
  },
  CreatedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    // references:{
    //   model: Users,
    //   key: 'UserID'
    // }
  },
  CreatedDate: {
    type: DataTypes.DATE,
    defaultValue: literal('CURRENT_TIMESTAMP')
  },
  ModifiedBy: {
    type: DataTypes.UUID,
    defaultValue:null,
    // references:{
    //   model: Users,
    //   key: 'UserID'
    // }
  },
  ModifiedDate: {
    type: DataTypes.DATE,
    defaultValue: null
  }
},{
  timestamps: false
});
module.exports = UserOrganizationStructureLink;