const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const OrganizationAdvertisement = sequelize.define(
  "OrganizationAdvertisement",
  {
    AdvertisementID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    OrganizationStructureID: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    AdvertisementTitle: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "AdvertisementTitle is required",
        },
        notNull: {
          msg: "AdvertisementTitle is required",
        },
      },
    },
    AdvertisementDescription: {
      type: DataTypes.TEXT,
    },
    AdvertisementBanner: {
      type: DataTypes.STRING,
    },
    ExpireDate: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isAfter: {
          args: [new Date().toISOString()],
          msg: "ExpireDate should be after current date",
        },
      },
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
    },
    ModifiedDate: {
      type: DataTypes.DATE,
    },
    DeletedBy: {
      type: DataTypes.UUID,
    },
    DeletedDate: {
      type: DataTypes.DATE,
    },
  },
  {
    timestamps: false,
  }
);

module.exports = OrganizationAdvertisement;
