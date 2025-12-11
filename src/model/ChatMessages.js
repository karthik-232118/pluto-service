const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const UserDetails = require("./UserDetails");
const ChatMessages = sequelize.define('ChatMessages', {
    ChatMessageID: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: Sequelize.fn('gen_random_uuid'),
    },
    RepliedChatID: {
        type: DataTypes.UUID,
        allowNull: true
    },
    ModuleID: {
        type: DataTypes.UUID,
        allowNull: false
    },
    MasterVersion: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    ModuleAccessorID: {
        type: DataTypes.UUID,
        allowNull: false
    },
    SenderID: {
        type: DataTypes.UUID,
        allowNull: false
    },
    Message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    MessageDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP'),
    },
    IsRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    timestamps: false
});

ChatMessages.belongsTo(UserDetails, {
    foreignKey: 'SenderID',
    as: 'RepliedByUser',
});
module.exports = ChatMessages;