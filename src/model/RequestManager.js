const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const UserDetails = require("./UserDetails");

const RequestManagement = sequelize.define("RequestManagement", {
    RequestManagementID: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: Sequelize.fn("gen_random_uuid")
    },
    RequestID: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    RequestType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    RequestTitle: {
        type: DataTypes.STRING,
        allowNull: false
    },
    RequestDescription: {
        type: DataTypes.TEXT
    },
    RequestStatus: {
        type: DataTypes.ENUM,
        values: ["Pending", "Approved", "Rejected"],
        defaultValue: "Pending"
    },
    RequestPriority: {
        type: DataTypes.ENUM,
        values: ["Low", "Medium", "High"],
        defaultValue: "Low"
    },
    RejectedReason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    OrganizationStructureID:{
        type: DataTypes.UUID,
        allowNull: false
      },
    CreatedBy: {
        type: DataTypes.UUID,
        references: {
            model: "Users",
            key: "UserID"
        }
    },
    CreatedDate: {
        type: DataTypes.DATE,
        defaultValue: literal("CURRENT_TIMESTAMP")
    },
    ModifiedBy: DataTypes.UUID,
    ModifiedDate: DataTypes.DATE,
    RejectedBy: DataTypes.UUID,
    RejectedDate: DataTypes.DATE,
    IsDeleted:{
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    DeletedBy: DataTypes.UUID,
    DeletedDate: DataTypes.DATE
}, {
    timestamps: false
})
RequestManagement.belongsTo(UserDetails, { foreignKey: "CreatedBy", as: "CreatedUser" })
RequestManagement.belongsTo(UserDetails, { foreignKey: "ModifiedBy", as: "ModifiedUser" })
RequestManagement.belongsTo(UserDetails, { foreignKey: "RejectedBy", as: "RejectedUser" })
module.exports = RequestManagement;