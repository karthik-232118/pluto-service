const { literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const WebSocket = sequelize.define("WebSocket", {
    UserID: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true
    },
    WebSocketConnectionID: {
        type: DataTypes.STRING,
        allowNull: false
    },
    LastSeen: {
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP'),
    },
    ConnectionSource:{
        type: DataTypes.ENUM('Web', 'Mobile', 'Desktop'),
        allowNull: false,
        defaultValue: 'Web'
    }
    });

    module.exports = WebSocket;