const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
// const Users = require("./Users");

const ErrorLogs = sequelize.define('ErrorLogs', {
  ErrorID: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: Sequelize.fn('gen_random_uuid'),
  },
  Application: {
    type: DataTypes.STRING,
    allowNull: false
  },
  Host: {
    type: DataTypes.STRING,
    allowNull: false
  },
  Type: {
    type: DataTypes.STRING
  },
  Source: {
    type: DataTypes.STRING
  },
  UserID: {
    type: DataTypes.UUID,
    allowNull: false
  },
  ErrorTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
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
// ErrorLogs.belongsTo(Users, { foreignKey: 'ModifiedBy', as: 'ModifiedByUser' });
// ErrorLogs.belongsTo(Users, { foreignKey: 'CreatedBy', as: 'CreatedByUser' });
module.exports = ErrorLogs;
