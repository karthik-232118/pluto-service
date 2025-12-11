const { fn, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const AuditorComment = sequelize.define(
    "AuditorComment", {
    AuditorCommentID: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: fn("gen_random_uuid"),
    },
    ModuleID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    UserID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    MasterVersion: {
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
    CommentText: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    CreatedDateTime: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: literal("CURRENT_TIMESTAMP"),
    },
    ActionType: {
        type: DataTypes.ENUM('Message', 'Reply', 'Complete'),
        allowNull: false,
        defaultValue: 'Message'
    }
},
    {
        timestamps: false,

    })
module.exports = AuditorComment;