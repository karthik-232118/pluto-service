const { literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const ModuleQuestionsLink = sequelize.define('ModuleQuestionsLink', {
  TestMCQID: {
    type: DataTypes.UUID,
    primaryKey:true
  },
  QuestionID: {
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
  },
  IsDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  DeletedBy: {
    type: DataTypes.UUID,
    defaultValue: null,
    references:{
      model: Users,
      key: 'UserID'
    }
  },
  DeletedDate: {
    type: DataTypes.DATE,
    defaultValue: null
  }
},{
  indexes: [{
    unique: true,
    fields: ['TestMCQID', 'QuestionID','IsActive']
  }],
  timestamps: false,
});
ModuleQuestionsLink.belongsTo(Users, { foreignKey: 'CreatedBy', as: 'CreatedByUser' });
ModuleQuestionsLink.belongsTo(Users, { foreignKey: 'ModifiedBy', as: 'ModifiedByUser' });
module.exports = ModuleQuestionsLink;