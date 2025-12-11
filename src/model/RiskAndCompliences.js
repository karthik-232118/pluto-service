const { literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const RiskAndCompliences = sequelize.define('RiskAndCompliences', {
    RiskAndComplianceID: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: literal("gen_random_uuid()"),
    },
    DocumentID:{
        type: DataTypes.UUID,
        allowNull: false
    },
    DocumentModuleDraftID:{
        type: DataTypes.UUID,
        allowNull: false,
        unique: true
    },
    MasterVersion:{
        type: DataTypes.STRING(10)
    },
    DraftVersion:{
        type: DataTypes.STRING(10),
        allowNull: false
    },
    NoOfRisk:{
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    NoOfCompliance:{
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    NoOfClause:{
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    RiskDetailsArrays:{
        type: DataTypes.ARRAY(DataTypes.TEXT)
    },
    ComplianceDetailsArrays:{
        type: DataTypes.ARRAY(DataTypes.TEXT)
    },
    ClauseDetailsArrays:{
        type: DataTypes.ARRAY(DataTypes.TEXT)
    },
    RiskPropertiesDetails:{
        type: DataTypes.JSONB
    },
    CompliancePropertiesDetails:{
        type: DataTypes.JSONB
    },
    ClausePropertiesDetails:{
        type: DataTypes.JSONB
    },
    CreatedBy: {
        type: DataTypes.UUID,
        allowNull: false
    },
    CreatedDate: {
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP')
    },
    ModifiedBy: {
        type: DataTypes.UUID
    },
    ModifiedDate: {
        type: DataTypes.DATE
    }
},{
    timestamps: false
});

module.exports = RiskAndCompliences;
