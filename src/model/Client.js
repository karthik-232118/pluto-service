const { sequelize, DataTypes } = require(".");

const Client = sequelize.define('Clients', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    clientId: {
        type: DataTypes.UUID,
        allowNull: false,
        validate: {
            notNull: {
                msg: 'Please enter your clientId',
            },
            notEmpty: {
                msg: 'Please enter your clientId',
            },
        },
    },
    clientSecret: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notNull: {
                msg: 'Please enter your clientSecret',
            },
            notEmpty: {
                msg: 'Please enter your clientSecret',
            },
        },
    },
    redirectionUri: {
        type: DataTypes.JSONB,
        allowNull: false,
    },
}, {
    timestamps: true
});

module.exports = Client;