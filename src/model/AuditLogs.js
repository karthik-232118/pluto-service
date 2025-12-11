
const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const AuditLogs = sequelize.define('AuditLogs', {
  AuditID: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: Sequelize.fn('gen_random_uuid'),
  },
  TableName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  OldValue: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  NewValue: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  UserID: {
    type: DataTypes.UUID,
    allowNull: false
  },
  AdditionalInfo1: {
    type: DataTypes.TEXT
  },
  AdditionalInfo2: {
    type: DataTypes.TEXT
  },
  AdditionalInfo3: {
    type: DataTypes.TEXT
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
AuditLogs.belongsTo(Users, { foreignKey: 'CreatedBy', as: 'CreatedByUser' });
AuditLogs.belongsTo(Users, { foreignKey: 'ModifiedBy', as: 'ModifiedByUser' });
module.exports = AuditLogs; 