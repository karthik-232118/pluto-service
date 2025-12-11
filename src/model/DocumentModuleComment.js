const { literal, fn } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const DocumentModuleComment = sequelize.define('DocumentModuleComment', {
    DocumentModuleCommentID: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: fn('gen_random_uuid'),
        allowNull: false
    },
    DocumentID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    MasterVersion:{
        type: DataTypes.STRING
    },
    DraftVersion: {
        type: DataTypes.STRING,
        allowNull: false
    },
    ParentCommentID: {
        type: DataTypes.UUID,
        allowNull: true,
        defaultValue: null
    },
    UserID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    CommentText: {
        type: DataTypes.TEXT
    },
    ReplyText: {
        type: DataTypes.TEXT
    },
    HighlightedText: {
        type: DataTypes.TEXT
    },
    HighlightedTextPosition: {
        type: DataTypes.JSONB
    },
    CommentedDateTime: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP'),
    },
    ActionType: {
        type: DataTypes.ENUM('Comment', 'Reply', 'Resolve'),
        allowNull: false,
        defaultValue: 'Comment'
    }
},{
    timestamps: false
})
module.exports = DocumentModuleComment