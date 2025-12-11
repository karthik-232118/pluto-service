const { literal, Sequelize } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");
const SopAttachmentLinks = require("./SopAttachmentLinks");

// SopDetails Model
const SopDetails = sequelize.define('SopDetails', {
  SopDetailsID: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: Sequelize.fn('gen_random_uuid'),
  },
  SopID: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'SopModules',
      key: 'SOPID'
    }
  },
  SopShapeID: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  AttachmentIcon: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  HeaderProperties: DataTypes.JSON,
  FooterProperties: DataTypes.JSON,
  IsActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
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
  },
}, {
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['SopID', 'SopShapeID']
    }
  ]
});

SopDetails.belongsTo(Users, { foreignKey: 'CreatedBy', as: 'CreatedByUser' });
SopDetails.belongsTo(Users, { foreignKey: 'ModifiedBy', as: 'ModifiedByUser' });
SopDetails.hasMany(SopAttachmentLinks, { foreignKey: 'SopDetailsID', as: 'SopAttachmentLinks' });

module.exports = SopDetails;