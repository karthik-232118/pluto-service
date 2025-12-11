const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const ModuleMaster = require("./ModuleMaster");
const UserModuleAccessLog = require("./UserModuleAccessLog");
const UserModuleLink = require("./UserModuleLink");
const Users = require("./Users");
const UserAttempts = require("./UserAttempts");
const Favorite = require("./Favorite");

// TrainingSimulationModule Model
const TrainingSimulationModule = sequelize.define(
  "TrainingSimulationModule",
  {
    TrainingSimulationID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    ModuleTypeID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    TrainingSimulationName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    TrainingSimulationDescription: {
      type: DataTypes.TEXT,
    },
    // Skill Building Status = InProgress or Published
    TrainingSimulationStatus: {
      type: DataTypes.ENUM("InProgress", "Published"),
      defaultValue: "InProgress",
      allowNull: true,
    },
    TrainingSimulationIsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
    },
    TrainingSimulationExpiry: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    TrainingSimulationTags: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    EscalationType: {
      type: DataTypes.ENUM(
        "Minutes",
        "Hours",
        "Days",
        "Weeks",
        "Months",
        "Years"
      ),
      allowNull: true,
    },
    EscalationAfter: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    DraftVersion: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "0.1",
    },
    MasterVersion: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    SelfApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    TrainingSimulationPath: {
      type: DataTypes.STRING,
    },
    IsTrainingLinkIsVideo: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    ContentID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    NeedAcceptance: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    SequenceNumber: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      field: "SequenceNumber",
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    CreatedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Users,
        key: "UserID",
      },
    },
    CreatedDate: {
      type: DataTypes.DATE,
      defaultValue: literal("CURRENT_TIMESTAMP"),
    },
    ModifiedBy: {
      type: DataTypes.UUID,
      defaultValue: null,
      references: {
        model: Users,
        key: "UserID",
      },
    },
    ModifiedDate: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    DeletedBy: {
      type: DataTypes.UUID,
      defaultValue: null,
      references: {
        model: Users,
        key: "UserID",
      },
    },
    DeletedDate: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    TrainingSimulationGuidPath: {
      type: DataTypes.STRING,
    },
    TrainingSimulationTrainingPath: {
      type: DataTypes.STRING,
    },
    AverageDuration: {
      type: DataTypes.TIME,
      defaultValue: "01:30:00",
    },
    TotalAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    timestamps: false,
  }
);
TrainingSimulationModule.belongsTo(Users, {
  foreignKey: "CreatedBy",
  as: "CreatedByUser",
});
TrainingSimulationModule.belongsTo(Users, {
  foreignKey: "ModifiedBy",
  as: "ModifiedByUser",
});
TrainingSimulationModule.hasMany(UserModuleAccessLog, {
  foreignKey: "ModuleID",
  as: "Logs",
});
TrainingSimulationModule.hasOne(UserModuleLink, {
  foreignKey: "ModuleID",
  as: "UserModule",
});
TrainingSimulationModule.hasOne(Favorite, {
  foreignKey: "ModuleID",
  as: "UserFavorite",
});
// TrainingSimulationModule.hasMany(UserAttempts,{foreignKey: 'ModuleID', as: 'PreviousAttempts'});
// TrainingSimulationModule.belongsToMany(QuestionRepository, { through: ModuleQuestionsLink, foreignKey: 'ModuleID',otherKey:'QuestionID', as: 'Questions' });
module.exports = TrainingSimulationModule;
