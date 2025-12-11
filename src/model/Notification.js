const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const Notification = sequelize.define('Notification', {
    UserID: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        unique: true
    },
    NotificationTypeForPublish: {
        type: DataTypes.ENUM(['push', 'email', 'both', 'none']),
        allowNull: false,
        defaultValue: 'none'
    },
    NotificationTypeForAction: {
        type: DataTypes.ENUM(['push', 'email', 'both', 'none']),
        allowNull: false,
        defaultValue: 'none'
    },
    CreatedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        // references:{
        //   model: Users,
        //   key: 'UserID'
        // }
    },
    CreatedDate: {
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP')
    },
    ModifiedBy: {
        type: DataTypes.UUID,
        defaultValue: null,
        // references:{
        //   model: Users,
        //   key: 'UserID'
        // }
    },
    ModifiedDate: {
        type: DataTypes.DATE,
        defaultValue: null
    }
}, {
    timestamps: false
});

module.exports = Notification;