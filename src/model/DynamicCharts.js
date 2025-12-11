const { literal, fn } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const AssignDynamicChart = require("./AssignDynamicChart");

const DynamicCharts = sequelize.define(
    "DynamicCharts",
    {
        ChartID: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: fn("gen_random_uuid")
        },
        ChartName: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        ChartDescription: {
            type: DataTypes.STRING,
            allowNull: true
        },
        ChartType: {
            type: DataTypes.STRING,
            allowNull: false
        },
        ChartConfigData: {
            type: DataTypes.JSONB,
            allowNull: false
        },
        UsedDataSourceID: {
            type: DataTypes.UUID,
            allowNull: false
        },
        OrganizationStructureID: {
            type: DataTypes.UUID,
            allowNull: false
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
        timestamps: true
    }
);

DynamicCharts.hasOne(AssignDynamicChart, {
    foreignKey: "ChartID",
    as: "AssignDetails"
});

module.exports = DynamicCharts;