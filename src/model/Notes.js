const { Sequelize } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const Notes = sequelize.define("Notes", {
    NoteID: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    Title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    Content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    ModuleTypeID: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    ModuleID: {
        type: DataTypes.UUID,
        allowNull: true
    },
    MasterVersion: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    CreatedBy: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    CreatedDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    ModifiedBy: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    ModifiedDate: {
        type: DataTypes.DATE,
        allowNull: true,
    }
}, {
    timestamps: false,
    indexes: [{
        fields: ["Title","ModuleTypeID", "ModuleID", "MasterVersion"],
        unique: true
    }]
});
module.exports = Notes;