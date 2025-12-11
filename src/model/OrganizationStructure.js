const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Departments = require("./Departments");
const Licenses = require("./Licenses");
const Settings = require("./Settings");
const Users = require("./Users");
const OrganizationStructureType = require("./OrganizationStructureType");
const Roles = require("./Roles");
const OrganizationStructureRoleLinks = require("./OrganizationStructureRoleLinks");

const OrganizationStructure = sequelize.define(
  "OrganizationStructure",
  {
    OrganizationStructureID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    OrganizationStructureName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "OrganizationStructureName is required",
        },
        notNull: {
          msg: "OrganizationStructureName is required",
        },
        is: {
          args: /^[a-zA-Z ]*$/,
          msg: "OrganizationStructureName can only contain alphabets and spaces",
        },
      },
    },
    OrganizationStructureDescription: {
      type: DataTypes.TEXT,
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    ParentID: {
      type: DataTypes.UUID,
      defaultValue: null,
    },
    OrganizationStructureAdditionalInfo: {
      type: DataTypes.TEXT,
    },
    OrganizationStructureTypeID: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: OrganizationStructureType,
        key: "OrganizationStructureTypeID",
      },
    },
    OrganizationStructureEmail: {
      type: DataTypes.STRING,
    },
    OrganizationStructureToken: {
      type: DataTypes.STRING,
    },
    OrganizationStructureLogo: {
      type: DataTypes.TEXT,
    },
    OrganizationStructureColor: {
      type: DataTypes.STRING,
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
    ModifiedDate: DataTypes.DATE,
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    DeletedBy: DataTypes.UUID,
    DeletedDate: DataTypes.DATE,
  },
  {
    timestamps: false,
    // indexes: [
    //   {
    //     unique: true,
    //     fields: [
    //       "OrganizationStructureName",
    //       "OrganizationStructureTypeID",
    //       "ParentID",
    //       "IsDeleted",
    //     ],
    //   },
    // ],
  }
);
OrganizationStructure.belongsTo(Users, {
  foreignKey: "CreatedBy",
  as: "CreatedByUser",
});
OrganizationStructure.belongsTo(Users, {
  foreignKey: "ModifiedBy",
  as: "ModifiedByUser",
});
OrganizationStructure.hasOne(Licenses, {
  foreignKey: "OrganizationStructureID",
  as: "License",
});
OrganizationStructure.hasMany(Settings, {
  foreignKey: "OrganizationStructureID",
  as: "Settings",
});
OrganizationStructure.hasMany(Departments, {
  foreignKey: "OrganizationStructureID",
  as: "Departments",
});
OrganizationStructure.hasMany(Roles, {
  foreignKey: "OrganizationStructureID",
  as: "Roles",
});
OrganizationStructure.belongsTo(OrganizationStructureType, {
  foreignKey: "OrganizationStructureTypeID",
  as: "OrganizationType",
});
module.exports = OrganizationStructure;
