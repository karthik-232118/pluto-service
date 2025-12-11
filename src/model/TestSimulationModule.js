const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const UserModuleAccessLog = require("./UserModuleAccessLog");
const UserModuleLink = require("./UserModuleLink");
const Users = require("./Users");
const TestSimulationReport = require("./TestSimulationReport");
const Favorite = require("./Favorite");

// TestSimulationModule Model
const TestSimulationModule = sequelize.define(
  "TestSimulationModule",
  {
    TestSimulationID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    ModuleTypeID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    TestSimulationName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    TestSimulationDescription: {
      type: DataTypes.TEXT,
    },
    TestSimulationStatus: {
      type: DataTypes.ENUM("InProgress", "Published"),
      defaultValue: "InProgress",
      allowNull: true,
    },
    TestSimulationExpiry: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    TestSimulationIsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: null,
    },
    TestSimulationTags: {
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
    TestSimulationPath: {
      type: DataTypes.STRING,
    },
    AverageDuration: {
      type: DataTypes.TIME,
      defaultValue: "01:30:00",
    },
    MinimumTime: {
      type: DataTypes.TIME,
      defaultValue: "00:00:00"
    },
    TotalAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    PassPercentage: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
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
  },
  {
    timestamps: false,
  }
);
TestSimulationModule.belongsTo(Users, {
  foreignKey: "CreatedBy",
  as: "CreatedByUser",
});
TestSimulationModule.belongsTo(Users, {
  foreignKey: "ModifiedBy",
  as: "ModifiedByUser",
});
TestSimulationModule.hasMany(UserModuleAccessLog, {
  foreignKey: "ModuleID",
  as: "Logs",
});
TestSimulationModule.hasOne(UserModuleLink, {
  foreignKey: "ModuleID",
  as: "UserModule",
});
TestSimulationModule.hasMany(TestSimulationReport, {
  foreignKey: "TestSimulationID",
  as: "PreviousAttempts",
});
TestSimulationModule.hasOne(Favorite, {
  foreignKey: "ModuleID",
  as: "UserFavorite",
});
// TestSimulationModule.hasMany(UserAttempts,{foreignKey: 'ModuleID', as: 'PreviousAttempts'});
// TestSimulationModule.belongsToMany(QuestionRepository, { through: ModuleQuestionsLink, foreignKey: 'ModuleID',otherKey:'QuestionID', as: 'Questions' });
module.exports = TestSimulationModule;
