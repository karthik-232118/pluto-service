const { literal, Sequelize } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const SopAttachmentLinks = sequelize.define('SopAttachmentLinks', {
  SopContentLinkID: {
    type: DataTypes.UUID,
    primaryKey:true,
    defaultValue:Sequelize.fn('gen_random_uuid')
  },
  SopDetailsID: {
    type: DataTypes.UUID,
    allowNull: false
  },
  ContentLinkTitle: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ContentLink: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ContentLinkType: {
    type: DataTypes.STRING,
    allowNull: false
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
  timestamps: false,
  indexes:[{
    unique: true,
    fields: ['SopDetailsID', 'ContentLink']
  }]
});
SopAttachmentLinks.belongsTo(Users, { foreignKey: 'CreatedBy', as: 'CreatedByUser' });
SopAttachmentLinks.belongsTo(Users, { foreignKey: 'ModifiedBy', as: 'ModifiedByUser' });
module.exports = SopAttachmentLinks;