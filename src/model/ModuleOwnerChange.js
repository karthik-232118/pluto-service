const { fn, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const ModuleOwnerChange = sequelize.define(
    "ModuleOwnerChange",
    {
        ModuleOwnerChangeID: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: fn("gen_random_uuid")
        },
        ModuleTypeID: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        ModuleID: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        OldOwnerID: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        NewOwnerID: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        ModuleCreatedDate: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        ChangeReason: DataTypes.TEXT,
        ChangeUserType: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "Owner" // Owner, Signatory, Auditor, Co-Owner
        },
        CreatedDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: literal("CURRENT_TIMESTAMP"),
        },
        CreatedBy: {
            type: DataTypes.UUID,
            allowNull: false,
        }
    },
    {
        timestamps: false,
    });

module.exports = ModuleOwnerChange;