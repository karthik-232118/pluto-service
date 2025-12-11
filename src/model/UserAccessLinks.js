const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const UserAccessLinks = sequelize.define('UserAccessLinks', {
  UserAccessID: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.fn('gen_random_uuid'),
    primaryKey: true
  },
  ModuleTypeID: {
    type: DataTypes.UUID
  },
  ContentID: {
    type: DataTypes.UUID
  },
  UserID: {
    type: DataTypes.UUID,
    allowNull: false
  },
  PublishStartDate: {
    type: DataTypes.DATE
  },
  PublishEndDate: {
    type: DataTypes.DATE
  },
  IsDelete: {
    type: DataTypes.BOOLEAN
  },
  CreatedBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  CreatedDate: {
    type: DataTypes.DATE,
    defaultValue: literal('CURRENT_TIMESTAMP')
  },
  ModifiedBy: {
    type: DataTypes.UUID
  },
  ModifiedDate: {
    type: DataTypes.DATE
  }
}, {
  timestamps: false, // Since we have CreatedDate and ModifiedDate
  indexes: [
    {
      name: 'UserAccessLink_Unique',
      unique: true,
      fields: ['ModuleTypeID', 'ContentID', 'UserID', 'PublishStartDate', 'PublishEndDate', 'IsDelete']
    }
  ]
});

UserAccessLinks.belongsTo(Users, { foreignKey: 'CreatedBy', as: 'CreatedByUser' });
UserAccessLinks.belongsTo(Users, { foreignKey: 'ModifiedBy', as: 'ModifiedByUser' });
module.exports = UserAccessLinks;