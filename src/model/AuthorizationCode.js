const { sequelize, DataTypes } = require(".");
const Users = require("./Users");

const AuthorizationCode = sequelize.define('AuthorizationCode', {
    authorizationCode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            notNull: {
                msg: 'Please enter your authorizationCode',
            },
            notEmpty: {
                msg: 'Please enter your authorizationCode',
            },
        },
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
            notNull: {
                msg: 'Please enter your expiresAt',
            },
            notEmpty: {
                msg: 'Please enter your expiresAt',
            },
        },
    },
    redirectUri: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: {
                msg: 'Please enter your redirectUri',
            },
            notEmpty: {
                msg: 'Please enter your redirectUri',
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
AuthorizationCode.belongsTo(Users, { foreignKey: 'userId' });
module.exports = AuthorizationCode;