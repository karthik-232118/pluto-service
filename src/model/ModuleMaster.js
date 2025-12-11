const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const ModuleMaster = sequelize.define(
  "ModuleMaster",
  {
    ModuleTypeID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    ModuleName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: "Module Name is required",
        },
        notNull: {
          msg: "Module Name is required",
        },
        len: {
          args: [3, 50],
          msg: "Module Name must be between 3 and 50 characters long",
        },
        is: {
          args: /^[a-zA-Z ]*$/,
          msg: "Module Name must contain only alphabets and spaces",
        },
      }
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
  },
  {
    timestamps: false,
  }
);

ModuleMaster.belongsTo(Users, { foreignKey: "CreatedBy", as: "CreatedByUser" });
ModuleMaster.belongsTo(Users, {
  foreignKey: "ModifiedBy",
  as: "ModifiedByUser",
});

module.exports = ModuleMaster;
