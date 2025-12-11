const { sequelize, DataTypes } = require("../../model");
const Licenses = require("../../model/Licenses");

exports.updateSchemaLevel = async () => {
    try {
        const queryInterface = await sequelize.getQueryInterface();
        // await queryInterface.addIndex('"Roles"',
        //     ["RoleName", "OrganizationStructureID"],
        //     { unique: true }
        // );
        // await queryInterface.addIndex('"Departments"',
        //     ["DepartmentName", "OrganizationStructureID"],
        //     { unique: true }
        // );
        // await queryInterface.addIndex('"ContentStructures"',
        //     ['ContentName', 'ModuleTypeID', 'OrganizationStructureID','ParentContentID'],
        //     { unique: true }
        // );
        // await queryInterface.addIndex('"OrganizationStructures"',
        //     ['OrganizationStructureName', 'OrganizationStructureTypeID', 'ParentID'],
        //     { unique: true }
        // );
        // await queryInterface.changeColumn('"UserNotifications"',
        //      'LinkedType', {
        //         type: DataTypes.TEXT
        //       }
        // );

        // await queryInterface.changeColumn('"SopModules"',
        //          'EscalationType', {
        //             type: DataTypes.ENUM("Minutes","Hours","Days", "Weeks", "Months", "Years"),
        //             allowNull: true,
        //           }
        //     );

        //     await queryInterface.changeColumn('"SopModuleDrafts"',
        //         'EscalationType', {
        //            type: DataTypes.ENUM("Minutes","Hours","Days", "Weeks", "Months", "Years"),
        //            allowNull: true,
        //          }
        //    );


        //not working
        //     await queryInterface.changeColumn('"DocumentModules"',
        //         'EscalationType', {
        //            type: DataTypes.ENUM("Minutes","Hours","Days", "Weeks", "Months", "Years"),
        //            allowNull: true,
        //          }
        //    );


        //     await queryInterface.changeColumn('"DocumentModuleDrafts"',
        //         'EscalationType', {
        //            type: DataTypes.ENUM("Minutes","Hours","Days", "Weeks", "Months", "Years"),
        //            allowNull: true,
        //          }
        //    );


        //     await queryInterface.changeColumn('"TrainingSimulationModuleDrafts"',
        //         'EscalationType', {
        //            type: DataTypes.ENUM("Minutes","Hours","Days", "Weeks", "Months", "Years"),
        //            allowNull: true,
        //          }
        //    );


        //not working
        //     await queryInterface.changeColumn('"TestMcqsModules"',
        //         'EscalationType', {
        //            type: DataTypes.ENUM("Minutes","Hours","Days", "Weeks", "Months", "Years"),
        //            allowNull: true,
        //          }
        //    );

        //not working
        //         await queryInterface.changeColumn('"TestMcqsModuleDrafts"',
        //         'EscalationType', {
        //            type: DataTypes.ENUM("Minutes","Hours","Days", "Weeks", "Months", "Years"),
        //            allowNull: true,
        //          }
        //    );

        // await queryInterface.changeColumn('"Users"',
        //     'UserType', {
        //     type: DataTypes.ENUM('Admin', 'ProcessOwner', 'Auditor', 'EndUser'),
        //     allowNull: false,
        //     defaultValue: 'EndUser'
        // }
        // );
        // await queryInterface.addColumn('"DocumentModules"',
        //     'ReadingTimeValue', {
        //         type: DataTypes.INTEGER,
        //     }
        // );
        // await queryInterface.changeColumn('"DocumentModules"',
        //     'ReadingTimeUnit', {
        //         type: DataTypes.ENUM("Minutes", "Hours", "Days"),
        //         defaultValue: "Minutes",
        //     }
        // );
        // await queryInterface.addColumn('"DocumentModuleDrafts"',
        //     'ReadingTimeValue', {
        //         type: DataTypes.INTEGER,
        //     }
        // );
        // await queryInterface.changeColumn('"DocumentModuleDrafts"',
        //     'ReadingTimeUnit', {
        //         type: DataTypes.ENUM("Minutes", "Hours", "Days"),
        //         defaultValue: "Minutes",
        //     }
        // );
        // await queryInterface.changeColumn('"SopModules"',
        //     'SOPStatus', {
        //     type: DataTypes.ENUM("InProgress", "Published"),
        //     defaultValue: "InProgress",
        // }
        // );

    } catch (error) {
        console.log({ message: error });
    }
}