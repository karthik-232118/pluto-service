const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");
const SopModule = require("./SopModule");
const DocumentModule = require("./DocumentModule");
const TrainingSimulationModule = require("./TrainingSimulationModule");
const TestSimulationModule = require("./TestSimulationModule");
const TestMcqsModule = require("./TestMcqsModule");
const ModuleMaster = require("./ModuleMaster");

const ContentStructure = sequelize.define(
  "ContentStructure",
  {
    ContentID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    ModuleTypeID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    ParentContentID: {
      type: DataTypes.UUID,
      defaultValue: null,
    },
    ContentName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "ContentName is required",
        },
        notNull: {
          msg: "ContentName is required",
        },
        len: {
          args: [3, 50],
          msg: "ContentName must be between 1 and 255 characters long",
        },
      },
    },
    ContentDescription: {
      type: DataTypes.TEXT,
    },
    OrganizationStructureID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    DriveID: {
      type: DataTypes.STRING,
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    indexes: [
      {
        unique: true,
        fields: [
          "ContentName",
          "ModuleTypeID",
          "OrganizationStructureID",
          "ParentContentID",
        ],
      },
    ],
  }
);
ContentStructure.belongsTo(Users, {
  foreignKey: "CreatedBy",
  as: "CreatedByUser",
});
ContentStructure.belongsTo(Users, {
  foreignKey: "ModifiedBy",
  as: "ModifiedByUser",
});
ContentStructure.belongsTo(ModuleMaster, {
  foreignKey: "ModuleTypeID",
  as: "ModuleMaster",
});

ContentStructure.hasOne(SopModule, {
  foreignKey: "ContentID",
  as: "SOPDetails",
});
ContentStructure.hasOne(DocumentModule, {
  foreignKey: "ContentID",
  as: "DocumentDetails",
});
ContentStructure.hasOne(TrainingSimulationModule, {
  foreignKey: "ContentID",
  as: "TrainingSimulationDetails",
});
ContentStructure.hasOne(TestSimulationModule, {
  foreignKey: "ContentID",
  as: "TestSimulationDetails",
});
ContentStructure.hasOne(TestMcqsModule, {
  foreignKey: "ContentID",
  as: "TestMcqsDetails",
});

module.exports = ContentStructure;
