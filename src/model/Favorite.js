const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const Favorite = sequelize.define('Favorite', {
    FavoriteID: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: Sequelize.fn('gen_random_uuid'),
    },
    UserID: {
        type: DataTypes.UUID,
        allowNull: false
    },
    ModuleID: {
        type: DataTypes.UUID,
        allowNull: false
    },
    ModuleTypeID: {
        type: DataTypes.UUID,
        allowNull: false
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

module.exports = Favorite;