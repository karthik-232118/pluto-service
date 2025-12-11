const { sequelize, DataTypes } = require(".");

const AuditorSignature = sequelize.define('AuditorSignature', {
    AuditorSignatureID: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: sequelize.fn('gen_random_uuid'),
    },
    ModuleTypeID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    ModuleID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    AuditorIDs: {
        type: DataTypes.ARRAY(DataTypes.UUID)
    },
    SignatureIDs: {
        type: DataTypes.ARRAY(DataTypes.UUID)
    },
    StartDate: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    EndDate: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    CreatedBy: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    CreatedDate: {type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    ModifiedBy: {
        type: DataTypes.UUID,
    },
    ModifiedDate: {type: DataTypes.DATE},
},{
    timestamps: false,
});

module.exports = AuditorSignature;