const { Sequelize } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const Token = sequelize.define('Token', {
    tokenId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: Sequelize.fn('gen_random_uuid'),
    },
    accessToken: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
        validate: {
            notNull: {
                msg: 'Please enter your accessToken',
            },
            notEmpty: {
                msg: 'Please enter your accessToken',
            },
        },
    },
    accessTokenExpiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
            notNull: {
                msg: 'Please enter your accessTokenExpiresAt',
            },
            notEmpty: {
                msg: 'Please enter your accessTokenExpiresAt',
            },
        },
    },
    refreshToken: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
        validate: {
            notNull: {
                msg: 'Please enter your refreshToken',
            },
            notEmpty: {
                msg: 'Please enter your refreshToken',
            },
        },
    },
    refreshTokenExpiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
            notNull: {
                msg: 'Please enter your refreshTokenExpiresAt',
            },
            notEmpty: {
                msg: 'Please enter your refreshTokenExpiresAt',
            },
        },
    },
    clientId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Users,
            key: 'UserID'
          }
    },
}, {
    timestamps: true
});
Token.belongsTo(Users, { foreignKey: 'userId' });
module.exports = Token;