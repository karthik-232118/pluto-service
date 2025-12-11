const { literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
// const Users = require("./Users");

const UserDetails = sequelize.define(
  "UserDetails",
  {
    UserID: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    UserFirstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "UserFirstName is required",
        },
        notNull: {
          msg: "UserFirstName is required",
        },
      },
    },
    UserLastName: {
      type: DataTypes.STRING,
    },
    UserMiddleName: {
      type: DataTypes.STRING,
    },
    UserEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: "Please enter a valid email address",
        },
        notEmpty: {
          msg: "UserEmail is required",
        },
        notNull: {
          msg: "UserEmail is required",
        },
      },
    },
    UserPhoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    UserAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "UserAddress is required",
        },
        notNull: {
          msg: "UserAddress is required",
        },
      },
    },
    UserDateOfBirth: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    Gender: {
      type: DataTypes.ENUM(["male", "female", "other"]),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Gender is required",
        },
        notNull: {
          msg: "Gender is required",
        },
      },
    },
    UserPhoto: {
      type: DataTypes.STRING,
    },
    UserSiganture: {
      type: DataTypes.TEXT,
    },
    ESignUserName: {
      type: DataTypes.STRING,
    },
    ESignFirstName: {
      type: DataTypes.STRING,
    },
    UserEmployeeNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "UserEmployeeNumber is required",
        },
        notNull: {
          msg: "UserEmployeeNumber is required",
        },
      },
    },
    UserSupervisorID: {
      type: DataTypes.UUID,
    },
    SyncedModules: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    LastSynced: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    DesktopFolderSyncPath: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    DesktopClientInfo: {
      type: DataTypes.JSONB,
      defaultValue: null,
    },
    IsConnectedToDesktopClient: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    DesktopClientSocketId: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    SOPState: {
      type: DataTypes.ENUM("SOP", "ReactFlow"),
      defaultValue: "ReactFlow",
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
      defaultValue: literal("CURRENT_TIMESTAMP"),
    },
    ModifiedBy: {
      type: DataTypes.UUID,
      defaultValue: null,
      // references:{
      //   model: Users,
      //   key: 'UserID'
      // }
    },
    ModifiedDate: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    DeletedBy: {
      type: DataTypes.UUID,
      defaultValue: null,
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
// UserDetails.belongsTo(Users, { foreignKey: 'CreatedBy', as: 'CreatedByUser' });
// UserDetails.belongsTo(Users, { foreignKey: 'ModifiedBy', as: 'ModifiedByUser' });
UserDetails.belongsTo(UserDetails, { foreignKey: "UserID", as: "UserDetail" });
module.exports = UserDetails;
