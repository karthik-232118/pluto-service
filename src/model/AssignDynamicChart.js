const { literal, fn } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const AssignDynamicChart = sequelize.define(
    "AssignDynamicChart",
    {
        AssignChartID: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: fn("gen_random_uuid")
        },
        ChartID: {
            type: DataTypes.UUID,
            allowNull: false
        },
        UserID: {
            type: DataTypes.UUID,
            allowNull: false
        },
        SequenceNumber: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        StartDate: {
            type: DataTypes.DATE,
            allowNull: true
        },
        DueDate: {
            type: DataTypes.DATE,
            allowNull: true
        },
        RoleID: {
            type: DataTypes.UUID,
            allowNull: true
        },
        DepartmentID: {
            type: DataTypes.UUID,
            allowNull: true
        },
        AssignDate: {
            type: DataTypes.DATE,
            defaultValue: literal("CURRENT_TIMESTAMP")
        },
        AssignBy: {
            type: DataTypes.UUID,
            allowNull: false
        }
    }, {
    indexes: [{
        unique: true, fields: ["ChartID", "UserID"]
    }]
});
module.exports = AssignDynamicChart;