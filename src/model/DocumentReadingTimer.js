const { literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const DocumentReadingTimer = sequelize.define(
    "DocumentReadingTimer",
    {
        DocumentReadingTimerID: {
            type: DataTypes.UUID,
            defaultValue: literal("gen_random_uuid()"),
            primaryKey: true,
        },
        DocumentID: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        DocumentModuleDraftID: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        MasterVersion: {
            type: DataTypes.STRING,
        },
        DraftVersion: {
            type: DataTypes.STRING,
        },
        UserID: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        NoOfPageRead: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        Days: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        Hours: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        Minutes: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        Seconds: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        StartDateAndTime: {
            type: DataTypes.DATE,
        },
        EndDateAndTime: {
            type: DataTypes.DATE,
        },
        CreatedBy: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        CreatedDate: {
            type: DataTypes.DATE,
            defaultValue: literal("CURRENT_TIMESTAMP"),
        },
    },
    {
        timestamps: true,
    }
);
module.exports = DocumentReadingTimer;
