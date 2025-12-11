const { literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const Managers = sequelize.define('Managers', {
    ManagerID: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: sequelize.fn('gen_random_uuid'),
    },
    UserID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    CreatedBy: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    CreatedDate: {
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP')
    },
    ModifiedBy: {
        type: DataTypes.UUID,
        defaultValue: null,
    },
    ModifiedDate: DataTypes.DATE,
    IsDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    DeletedBy: DataTypes.UUID,
    DeletedDate: DataTypes.DATE
}, {
    timestamps: false
});
module.exports = Managers;