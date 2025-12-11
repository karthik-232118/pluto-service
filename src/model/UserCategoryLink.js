const { fn, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const UserCategoryLink = sequelize.define('UserCategoryLink', {
    UserCategoryLinkID: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: fn('gen_random_uuid'), // Generates a new UUID by default
    },
    UserID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    ContentID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    DepartmentID: DataTypes.UUID,
    RoleID: DataTypes.UUID,
    ModuleTypeID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    StartDate: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    DueDate: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    IsDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    CreatedBy: {
        type: DataTypes.UUID,
        allowNull: false
    },
    CreatedDate: {
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP'),
    },
    ModifiedBy: DataTypes.UUID,
    ModifiedDate: DataTypes.DATE,
    DeletedBy: DataTypes.UUID,
    DeletedDate: DataTypes.DATE,
}, {
    timestamps: false
});

module.exports = UserCategoryLink;
