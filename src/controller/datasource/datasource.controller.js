const { literal } = require("sequelize");
const DataSource = require("../../model/DataSource");
const { logger } = require("../../utils/services/logger");
const DynamicCharts = require("../../model/DynamicCharts");
const AssignDynamicChart = require("../../model/AssignDynamicChart");
const { sequelize } = require("../../model");

/* DATA SOURCE CONTROLLER */

exports.createDataSource = async (req, res) => {
    const { currentUserId, lincense } = req.payload;
    try {
        const { DataSourceName, DataSourceDescription, DataSourceType, DataSourceAdditionType, DataSourceConfig, DataSourceConfigData, DataSourceOutputData } = req.body;
        await DataSource.create({
            DataSourceName,
            DataSourceDescription,
            DataSourceType,
            DataSourceAdditionType,
            DataSourceConfig,
            DataSourceConfigData,
            DataSourceOutputData,
            OrganizationStructureID: lincense?.EnterpriseID,
            CreatedBy: currentUserId,
        });
        return res.status(201).json({ success: true, message: "Data Source created successfully" });
    } catch (error) {
        console.error("Error in createDataSource:", error);
        logger.error({
            message: error.message,
            details: error,
            UserID: currentUserId,
        });
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getAllDataSourcesByType = async (req, res) => {
    const { lincense, currentUserId } = req.payload;
    console.log(lincense);
    try {
        const { DataSourceType } = req.body;
        const dataSources = await DataSource.findAll({
            where: {
                DataSourceType: DataSourceType,
                OrganizationStructureID: lincense?.EnterpriseID,
                IsDeleted: false
            },
            attributes: { exclude: ["DataSourceConfig", "DataSourceConfigData", "DataSourceOutputData", "ModifiedBy", "ModifiedDate", "DeletedBy", "DeletedDate", "IsDeleted"] }
        });
        return res.status(200).json({ success: true, data: dataSources });
    } catch (error) {
        console.error("Error in getAllDataSources:", error);
        logger.error({
            message: error.message,
            details: error,
            UserID: currentUserId,
        });
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getDataSourceById = async (req, res) => {
    const { currentUserId } = req.payload;
    try {
        const { DataSourceID } = req.body;
        const dataSource = await DataSource.findOne({
            where: {
                DataSourceID: DataSourceID,
                IsDeleted: false
            }
        });
        if (!dataSource) throw new Error("Data Source not found");
        return res.status(200).json({ success: true, data: dataSource });
    } catch (error) {
        console.error("Error in getDataSourceById:", error);
        logger.error({
            message: error.message,
            details: error,
            UserID: currentUserId,
        });
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.updateDataSource = async (req, res) => {
    const { currentUserId } = req.payload;
    try {
        const { DataSourceID, DataSourceName, DataSourceDescription, DataSourceType, DataSourceAdditionType, DataSourceConfig, DataSourceConfigData, DataSourceOutputData } = req.body;
        const dataSource = await DataSource.findOne({
            where: {
                DataSourceID: DataSourceID,
                IsDeleted: false
            }
        });
        if (!dataSource) throw new Error("Data Source not found");
        await DataSource.update({
            DataSourceName,
            DataSourceDescription,
            DataSourceType,
            DataSourceAdditionType,
            DataSourceConfig,
            DataSourceConfigData,
            DataSourceOutputData,
            ModifiedBy: currentUserId,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
        }, {
            where: {
                DataSourceID: DataSourceID
            }
        });
        return res.status(200).json({ success: true, message: "Data Source updated successfully" });
    } catch (error) {
        console.error("Error in updateDataSource:", error);
        logger.error({
            message: error.message,
            details: error,
            UserID: currentUserId,
        });
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.getAllDataSources = async (req, res) => {
    const { currentUserId } = req.payload;
    try {
        const { lincense } = req.payload;
        const dataSources = await DataSource.findAll({
            where: {
                OrganizationStructureID: lincense?.EnterpriseID,
                IsDeleted: false
            },
            attributes: { exclude: ["DataSourceConfig", "DataSourceConfigData", "DataSourceOutputData", "ModifiedBy", "ModifiedDate", "DeletedBy", "DeletedDate", "IsDeleted"] }
        });
        return res.status(200).json({ success: true, data: dataSources });
    } catch (error) {
        console.error("Error in getAllDataSources:", error);
        logger.error({
            message: error.message,
            details: error,
            UserID: currentUserId,
        });
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.deleteDataSource = async (req, res) => {
    const { currentUserId } = req.payload;
    try {
        const { DataSourceID } = req.body;
        const dataSource = await DataSource.findOne({
            where: {
                DataSourceID: DataSourceID,
                IsDeleted: false
            }
        });
        if (!dataSource) throw new Error("Data Source not found");
        await DataSource.update({
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
        }, {
            where: {
                DataSourceID: DataSourceID
            }
        });
        return res.status(200).json({ success: true, message: "Data Source deleted successfully" });
    } catch (error) {
        console.error("Error in deleteDataSource:", error);
        logger.error({
            message: error.message,
            details: error,
            UserID: currentUserId,
        });
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/* CHARTS CONTROLLER */
exports.createDynamicChart = async (req, res) => {
    const { currentUserId, lincense } = req.payload;
    try {
        const { ChartName, ChartDescription, ChartType, ChartConfigData, UsedDataSourceID } = req.body;
        const newChart = await DynamicCharts.create({
            ChartName,
            ChartDescription,
            ChartType,
            ChartConfigData,
            UsedDataSourceID,
            CreatedBy: currentUserId,
            OrganizationStructureID: lincense?.EnterpriseID,
        });
        return res.status(201).json({ success: true, data: newChart });
    } catch (error) {
        console.error("Error in createDynamicChart:", error);
        logger.error({
            message: error.message,
            details: error,
            UserID: currentUserId,
        });
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.getAllDynamicCharts = async (req, res) => {
    const { currentUserId } = req.payload;
    try {
        const { lincense } = req.payload;
        const dynamicCharts = await DynamicCharts.findAll({
            where: {
                OrganizationStructureID: lincense?.EnterpriseID,
                IsDeleted: false
            },
            attributes: { exclude: ["ChartConfigData", "ModifiedBy", "ModifiedDate", "DeletedBy", "DeletedDate", "IsDeleted"] }
        });
        return res.status(200).json({ success: true, data: dynamicCharts });
    } catch (error) {
        console.error("Error in getAllDynamicCharts:", error);
        logger.error({
            message: error.message,
            details: error,
            UserID: currentUserId,
        });
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getDynamicChartById = async (req, res) => {
    const { currentUserId } = req.payload;
    try {
        const { ChartID } = req.body;
        const dynamicChart = await DynamicCharts.findOne({
            where: {
                ChartID,
                IsDeleted: false
            },
            attributes: { exclude: ["ChartConfigData", "ModifiedBy", "ModifiedDate", "DeletedBy", "DeletedDate", "IsDeleted"] }
        });
        if (!dynamicChart) return res.status(404).json({ success: false, message: "Chart not found" });
        return res.status(200).json({ success: true, data: dynamicChart });
    } catch (error) {
        console.error("Error in getDynamicChartById:", error);
        logger.error({
            message: error.message,
            details: error,
            UserID: currentUserId,
        });
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.updateDynamicChart = async (req, res) => {
    const { currentUserId } = req.payload;
    try {
        const { ChartID, ChartName, ChartDescription, ChartType, ChartConfigData, UsedDataSourceID } = req.body;
        const [updated] = await DynamicCharts.update({
            ChartName,
            ChartDescription,
            ChartType,
            ChartConfigData,
            UsedDataSourceID,
            ModifiedBy: currentUserId,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
        }, {
            where: {
                ChartID,
                IsDeleted: false
            }
        });
        if (!updated) return res.status(404).json({ success: false, message: "Chart not found" });
        return res.status(200).json({ success: true, message: "Chart updated successfully" });
    } catch (error) {
        console.error("Error in updateDynamicChart:", error);
        logger.error({
            message: error.message,
            details: error,
            UserID: currentUserId,
        });
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.deleteDynamicChart = async (req, res) => {
    const { currentUserId } = req.payload;
    try {
        const { ChartID } = req.body;
        const deleted = await DynamicCharts.update({
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
        }, {
            where: {
                ChartID,
                IsDeleted: false
            }
        });
        if (!deleted) return res.status(404).json({ success: false, message: "Chart not found" });
        return res.status(200).json({ success: true, message: "Chart deleted successfully" });
    } catch (error) {
        console.error("Error in deleteDynamicChart:", error);
        logger.error({
            message: error.message,
            details: error,
            UserID: currentUserId,
        });
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/* ASSIGN CONTROLLER */
exports.assignChartToUser = async (req, res) => {
    const { currentUserId } = req.payload;
    const t = await sequelize.transaction();
    try {
        const { ChartData, UserIDs, StartDate, DueDate, RoleID, DepartmentID } = req.body;

        await AssignDynamicChart.destroy({
            where: {
                UserID: UserIDs
            }
        }, {
            transaction: t
        });
        const bulkData = [];
        for (const UserID of UserIDs) {
            for (const chart of ChartData) {
                const { ChartID, SequenceNumber } = chart;
                if (ChartID && SequenceNumber && UserID) {
                    bulkData.push({
                        ChartID,
                        UserID,
                        StartDate,
                        DueDate,
                        RoleID,
                        DepartmentID,
                        SequenceNumber,
                        AssignBy: currentUserId
                    });
                }
            }
        }
        await AssignDynamicChart.bulkCreate(bulkData, { transaction: t });
        await t.commit();
        return res.status(200).json({ success: true, message: "Chart assigned successfully" });
    } catch (error) {
        console.error("Error in assignChartToUser:", error);
        await t.rollback();
        logger.error({
            message: error.message,
            details: error,
            UserID: currentUserId,
        });
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.getAssignedChartsByUserId = async (req, res) => {
    const { currentUserId } = req.payload;
    try {
        const assignedCharts = await DynamicCharts.findAll({
            include: [{
                model: AssignDynamicChart,
                as: "AssignDetails",
                where: { UserID: currentUserId },
                attributes: ["SequenceNumber", "AssignDate", "AssignBy"],
                required: true
            }]
        });
        return res.status(200).json({ success: true, data: assignedCharts });
    } catch (error) {
        console.error("Error in getAssignedChartsByUserId:", error);
        logger.error({
            message: error.message,
            details: error,
            UserID: currentUserId,
        });
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
