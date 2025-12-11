const { fn, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const SticherLicense = require("./SticherLicense");

const SticherLincencesClients = sequelize.define(
  "SticherLincencesClients",
  {
    LicenceClientID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: fn("gen_random_uuid"),
    },
    ClientID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    ClientName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    Description: DataTypes.STRING,
    Email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    UniqueKey: {
      type: DataTypes.STRING,
    },
    MacInterFaces: {
      type: DataTypes.JSON,
    },
    HostName: {
      type: DataTypes.STRING,
    },
    MachineUUID: {
      type: DataTypes.STRING,
    },
    DriveSerialNumber: {
      type: DataTypes.STRING,
    },
    OSSerialNumber: {
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
    },
    CreatedDate: {
      type: DataTypes.DATE,
      defaultValue: literal("CURRENT_TIMESTAMP"),
    },
    ModifiedBy: {
      type: DataTypes.UUID,
      defaultValue: null,
    },
    ModifiedDate: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
  },
  {
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: [ "IsActive", "IsDeleted"],
      },
    ],
  }
);
SticherLincencesClients.hasMany(SticherLicense, {
  foreignKey: "ClientID",
  sourceKey: "ClientID",
  as: "SticherLicenses",
});
module.exports = SticherLincencesClients;
