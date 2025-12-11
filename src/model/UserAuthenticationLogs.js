const { literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const UserAuthenticationLogs = sequelize.define('UserAuthenticationLogs', {
    UserID: {
        type: DataTypes.UUID,
        primaryKey: true
    },
    LoginDateTime: {
        type: DataTypes.DATE,
        allowNull: false,
        primaryKey: true,
        defaultValue: literal('CURRENT_TIMESTAMP')
    },
    LogoutDateTime: {
        type: DataTypes.DATE
    },
    LoginIP: {
        type: DataTypes.STRING
    },
    BrowserInfo: {
        type: DataTypes.STRING
    },
    OperatingSystemInfo: {
        type: DataTypes.STRING
    }
}, { timestamps: false });

module.exports = UserAuthenticationLogs;