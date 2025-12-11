const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const UserAttemptDetails = sequelize.define('UserAttemptDetails', {
  AttemptDetailsID:{
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: Sequelize.fn('gen_random_uuid'),
  },
  AttemptID: {
    type: DataTypes.UUID,
    allowNull:false,
    validate:{
      notEmpty: {
        msg: "AttemptID is required",
      },
      notNull: {
        msg: "AttemptID is required",
      }
    }
  },
  QuestionID: {
    type: DataTypes.UUID,
    allowNull:false,
    validate:{
      notEmpty: {
        msg: "QuestionID is required",
      },
      notNull: {
        msg: "QuestionID is required",
      }
    }
  },
  AnswerID: {
    type: DataTypes.UUID,
    allowNull: false,
    validate:{
      notEmpty: {
        msg: "AnswerID is required",
      },
      notNull: {
        msg: "AnswerID is required",
      }
    }
  },
  IsCorrect: {
    type: DataTypes.BOOLEAN,
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
  indexes: [
    {unique: true,fields: ['AttemptID', 'QuestionID', 'AnswerID']}
  ]
});
UserAttemptDetails.belongsTo(Users, { foreignKey: 'CreatedBy', as: 'CreatedByUser' });
UserAttemptDetails.belongsTo(Users, { foreignKey: 'ModifiedBy', as: 'ModifiedByUser' });
module.exports = UserAttemptDetails;