const { literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const UserDetails = require("./UserDetails");

const UserNotification = sequelize.define('UserNotification', {
    NotificationID: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: literal("gen_random_uuid()"),
    },
    UserID: {
        type: DataTypes.UUID,
        allowNull: false
    },
    Message: {
        type: DataTypes.TEXT,
    },
    IsRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    IsActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    NotificationType: {
        type: DataTypes.ENUM('actionable', 'assignment', 'myrequest','chatmessages', 'update'),
        allowNull: false
    },
    LinkedType: {
        type: DataTypes.STRING
    },
    LinkedID: {
        type: DataTypes.TEXT
    },
    CreatedDate: {
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP')
    },
    CreatedBy: {
        type: DataTypes.UUID,
        references: {
            model: UserDetails,
            key: 'UserID'
        }
    },
},{
    timestamps: false,
    indexes: [
        {
            unique:true,
            fields:['UserID','Message','NotificationType','CreatedDate','LinkedID','CreatedBy'],
            name: 'unique_notification_per_user'
        }
    ]
});
UserNotification.belongsTo(UserDetails, { foreignKey: 'CreatedBy', as: 'CreatedByUser' });
module.exports = UserNotification;