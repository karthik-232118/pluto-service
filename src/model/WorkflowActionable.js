const { literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");

const WorkflowActionable = sequelize.define("WorkflowActionable",{
    WorkflowActionableID: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: sequelize.fn('gen_random_uuid'),
    },
    ExecutionFlowID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    ShapeID: {
        type: DataTypes.STRING(30),
        allowNull: false,
    },
    UserID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    FlowID: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    FlowName:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    StepName:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    StartDate:{
        type: DataTypes.DATE,
        allowNull: false,
    },
    EndDate:{
        type: DataTypes.DATE,
        allowNull: false,
    },
    ActionURL:{
        type: DataTypes.TEXT,
        allowNull: false,
    },
    ActionStatus: {
        type: DataTypes.ENUM(['ActionRequired', 'Submitted' ]),
        defaultValue: 'ActionRequired',
        allowNull: false,
    },
    IsActive:{
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    CreatedBy: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    CreatedDate: {
        type: DataTypes.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP'),
    },
    ModifiedBy: {
        type: DataTypes.UUID,
    },
    ModifiedDate: {
        type: DataTypes.DATE,
    }
},{
    timestamps: false
})

module.exports = WorkflowActionable;

