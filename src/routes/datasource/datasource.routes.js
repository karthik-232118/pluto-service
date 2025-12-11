const { Router } = require("express");
const { 
    createDataSource, 
    getAllDataSourcesByType, 
    getDataSourceById, 
    updateDataSource, 
    getAllDataSources, 
    deleteDataSource, 
    createDynamicChart,
    getAllDynamicCharts,
    getDynamicChartById,
    updateDynamicChart,
    deleteDynamicChart,
    getAssignedChartsByUserId,
    assignChartToUser
} = require("../../controller/datasource/datasource.controller");

exports.dataSourceRoutes = Router()
.post('/WBlPL4QhILD1kjJ', createDataSource)
.post('/x1cYHLn2kawL7EL', getAllDataSourcesByType)
.post('/nJalS3zwqDQeT5T', getDataSourceById)
.post('/V56MAD3ZwoyZ9QR', updateDataSource)
.post('/q9xn5ByCIOpY4Gl', getAllDataSources)
.post('/MggM8PP342aQIGE', deleteDataSource)

/* Dynamic Charts Routes */

.post('/wSo52xloiyTcYgE', createDynamicChart)
.post('/ASgEs3MV5wt0wK8', getAllDynamicCharts)
.post('/b8GqVVfiEE8ByM3', getDynamicChartById)
.post('/voDOd8S66Qu5zPA', updateDynamicChart)
.post('/GK15oYHts6f7TY2', deleteDynamicChart)

/* Assign Chart Routes */

.post('/jmfzETYraYXoMYS', getAssignedChartsByUserId)
.post('/D066ieFs6kTK21U', assignChartToUser);