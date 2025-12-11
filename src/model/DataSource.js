const { literal, fn } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const DataSource = sequelize.define(
    "DataSource",
    {
        DataSourceID: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue:fn("gen_random_uuid")
        },
        DataSourceName: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "DataSourceName is required",
                },
                notNull: {
                    msg: "DataSourceName is required",
                }
            }
        },
        DataSourceDescription: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        DataSourceType: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "DataSourceType is required",
                },
                notNull: {
                    msg: "DataSourceType is required",
                }
            }
        },
        DataSourceAdditionType: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        DataSourceConfig: {
            type: DataTypes.JSONB,
            allowNull: true
        },
        DataSourceConfigData: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        DataSourceOutputData: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        OrganizationStructureID: {
            type: DataTypes.UUID,
            allowNull: true,
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
            allowNull: false,
            defaultValue: literal("CURRENT_TIMESTAMP"),
        },
        ModifiedBy: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        ModifiedDate: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        DeletedBy: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        DeletedDate: {
            type: DataTypes.DATE,
            allowNull: true,
        }
    },
    {
        timestamps: false,
    }
);
module.exports = DataSource;