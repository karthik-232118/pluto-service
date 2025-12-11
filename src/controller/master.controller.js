const { Op, literal } = require("sequelize");
const fs = require("fs");
const { sequelize } = require("../model");
const OrganizationStructure = require("../model/OrganizationStructure");
const OrganizationStructureType = require("../model/OrganizationStructureType");
const Roles = require("../model/Roles");
const Departments = require("../model/Departments");
const Users = require("../model/Users");
const Client = require("../model/Client");
const { generatePasswordHash } = require("../utils/services/passwordHash");
const UserDetails = require("../model/UserDetails");
const UserRoleLink = require("../model/UserRoleLink");
const { logger } = require("../utils/services/logger");
const UserOrganizationStructureLink = require("../model/UserOrganizationStructureLink");
const UserDeparmentLink = require("../model/UserDeparmentLink");
const Licenses = require("../model/Licenses");
const TestSimulationModule = require("../model/TestSimulationModule");
const TestMcqsModule = require("../model/TestMcqsModule");
const QuestionRepository = require("../model/QuestionRepository");
const QuestionAnswersLink = require("../model/QuestionAnswersLink");
const ModuleQuestionsLink = require("../model/ModuleQuestionsLink");
const LicenseType = require("../model/LicenseType");
const { generateString } = require("../utils/services/generateRandomString");
const {
  encryptedData,
  decryptedData,
} = require("../utils/services/encription");
const { mailService } = require("../utils/services/nodemailer");
const OrganizationStructureLicense = require("../model/OrganizationStructureLicense");
const OrganizationAdvertisement = require("../model/OrganizationAdvertisement");
const {
  assignElementToUser,
  removeAssignedElementFromUser,
} = require("../utils/helper");
const Notification = require("../model/Notification");
const RequestManagement = require("../model/RequestManager");
const UserNotification = require("../model/UserNotification");
const { sendNotification } = require("../utils/services/socket");
const UserUnitLinks = require("../model/UserUnitLinks");
const Enterprise = require("../model/MaterEnterprisesList");
const archiver = require("archiver");
const path = require("path");
const ContentStructure = require("../model/ContentStructure");
const WorkflowActionable = require("../model/WorkflowActionable");
const ModuleOwner = require("../model/ModuleOwner");
const DocumentModule = require("../model/DocumentModule");
const DocumentModuleDraft = require("../model/DocumentModuleDraft");
const DocumentModuleComment = require("../model/DocumentModuleComment");
const UserCategoryLink = require("../model/UserCategoryLink");
const ModuleOwnerChange = require("../model/ModuleOwnerChange");
const AuditorComment = require("../model/AuditorComment");
const SopModuleDraft = require("../model/SopModuleDraft");
const SticherLincencesClients = require("../model/SticherLincencesClients");
const SopDetails = require("../model/SopDetails");
const SopModule = require("../model/SopModule");
const SopAttachmentLinks = require("../model/SopAttachmentLinks");
const { convertXML } = require("simple-xml-to-json");
const DocumentReadingTimer = require("../model/DocumentReadingTimer");
const SopTemplate = require("../model/SopTemplate");
const SkillsClickEvent = require("../model/SkillsClickEvent");

exports.addRoleToOrganizationStructure = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  const transaction = await sequelize.transaction();
  try {
    const { RoleName, RoleDescription, IsActive } = req.body;
    const { RoleID } = await Roles.create(
      {
        RoleName,
        RoleDescription,
        IsActive,
        OrganizationStructureID: lincense?.EnterpriseID,
        CreatedBy: currentUserId,
      },
      { transaction }
    );
    await transaction.commit();
    res.status(201).send({ message: "Role added successfully to Enterprise" });
  } catch (error) {
    await transaction.rollback();
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.updateRoleToOrganizationStructure = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { RoleName, RoleDescription, IsActive, RoleID } = req.body;
    await Roles.update(
      {
        RoleName,
        RoleDescription,
        IsActive,
        ModifiedBy: currentUserId,
        ModifiedDate: new Date().toISOString(),
      },
      {
        where: {
          RoleID,
        },
      }
    );
    res.status(200).send({ message: "Role updated successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.deleteRole = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { RoleID } = req.body;
    await Roles.update(
      {
        IsActive: false,
        IsDeleted: true,
        DeletedBy: currentUserId,
        DeletedDate: new Date().toISOString(),
      },
      {
        where: {
          RoleID,
        },
      }
    );
    res.status(200).send({ message: "Role deleted successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.getOrganizationStructureRoles = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const data = await OrganizationStructure.findOne({
      where: {
        OrganizationStructureID: lincense?.EnterpriseID,
      },
      attributes: ["OrganizationStructureID", "OrganizationStructureName"],
      include: [
        {
          model: Roles,
          as: "Roles",
          where: {
            IsDeleted: {
              [Op.not]: true,
            },
          },
          attributes: ["RoleID", "RoleName", "RoleDescription", "IsActive"],
        },
      ],
    });
    res.status(200).send({ data });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.addEnterprises = async (req, res) => {
  const { currentUserId } = req.payload;
  const {
    OrganizationStructureName,
    OrganizationStructureDescription,
    OrganizationStructureAdditionalInfo,
    OrganizationStructureEmail,
    OrganizationStructureToken,
    IsActive,
  } = req.body;
  try {
    const { OrganizationStructureTypeID } =
      await OrganizationStructureType.findOne({
        where: {
          OrganizationStructureTypeName: "Enterprise",
        },
        attributes: ["OrganizationStructureTypeID"],
      });

    if (!OrganizationStructureTypeID) {
      res.status(400).send({ error: "Enterprise Type not found" });
      return;
    }

    await OrganizationStructure.create({
      OrganizationStructureName,
      OrganizationStructureDescription,
      OrganizationStructureAdditionalInfo,
      OrganizationStructureTypeID,
      OrganizationStructureEmail,
      OrganizationStructureToken,
      IsActive,
      CreatedBy: currentUserId,
    });
    res.status(201).send({ message: "Enterprise added successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.addOrganizationHierarchy = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  const {
    OrganizationStructureName,
    OrganizationStructureDescription,
    OrganizationStructureAdditionalInfo,
    ParentID,
    IsActive,
  } = req.body;
  try {
    let orgType = "Zone";
    if (ParentID) {
      orgType = "Unit";
    }
    const { OrganizationStructureTypeID } =
      await OrganizationStructureType.findOne({
        where: {
          OrganizationStructureTypeName: orgType,
        },
        attributes: ["OrganizationStructureTypeID"],
      });
    if (ParentID) {
      const parent = await OrganizationStructure.findOne({
        where: {
          OrganizationStructureID: ParentID,
        },
        attributes: ["OrganizationStructureTypeID"],
        include: {
          model: OrganizationStructureType,
          as: "OrganizationType",
          attributes: ["OrganizationStructureTypeName"],
        },
      });
      if (parent.OrganizationType.OrganizationStructureTypeName != "Zone") {
        res.status(400).send({ error: "Parent Organization must be a Zone" });
        return;
      }
      await OrganizationStructure.create({
        OrganizationStructureName,
        OrganizationStructureDescription,
        OrganizationStructureAdditionalInfo,
        OrganizationStructureTypeID,
        ParentID,
        IsActive,
        CreatedBy: currentUserId,
      });
    } else {
      await OrganizationStructure.create({
        OrganizationStructureName,
        OrganizationStructureDescription,
        OrganizationStructureAdditionalInfo,
        OrganizationStructureTypeID,
        ParentID: lincense?.EnterpriseID,
        IsActive,
        CreatedBy: currentUserId,
      });
    }
    res.status(200).send({ message: orgType + " added successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.updateOrganizationHierarchy = async (req, res) => {
  const { currentUserId } = req.payload;

  const {
    OrganizationStructureID,
    OrganizationStructureName,
    OrganizationStructureDescription,
    OrganizationStructureEmail,
    OrganizationStructureLogo,
    OrganizationStructureColor,
    IsActive,
    ParentID,
  } = req.body;
  try {
    const data = await OrganizationStructure.findOne({
      where: {
        OrganizationStructureID,
      },
      attributes: ["OrganizationStructureID"],
      include: {
        model: OrganizationStructureType,
        as: "OrganizationType",
        attributes: ["OrganizationStructureTypeName"],
      },
    });
    await OrganizationStructure.update(
      {
        OrganizationStructureName,
        OrganizationStructureDescription,
        OrganizationStructureEmail,
        OrganizationStructureLogo,
        OrganizationStructureColor,
        IsActive,
        ParentID,
        ModifiedBy: currentUserId,
        ModifiedDate: new Date().toISOString(),
      },
      {
        where: {
          OrganizationStructureID,
        },
      }
    );
    res.status(200).send({
      message:
        data.OrganizationType.OrganizationStructureTypeName +
        " updated successfully",
    });
  } catch (e) {
    logger.error({ message: e.message, details: e, UserID: currentUserId });
    res.status(400).send({
      error: e.errors?.[0]?.message ? e.errors?.[0]?.message : e.message,
    });
  }
};

exports.deleteOrganizationHierarchy = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { OrganizationStructureID } = req.body;
    await OrganizationStructure.update(
      {
        IsActive: false,
        IsDeleted: true,
        DeletedBy: currentUserId,
        DeletedDate: new Date().toISOString(),
      },
      {
        where: {
          OrganizationStructureID,
        },
      }
    );
    res.status(200).send({ message: "Enterprise deleted successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.getOrganizationHirarchyLIst = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const { ParentID = null } = req.body;
    const conditions = {};
    if (ParentID) {
      conditions["ParentID"] = ParentID;
    } else {
      conditions["OrganizationStructureID"] = lincense?.EnterpriseID;
    }
    const data = await OrganizationStructure.findAll({
      where: {
        ...conditions,
        IsDeleted: {
          [Op.not]: true,
        },
      },
      include: {
        model: OrganizationStructureType,
        as: "OrganizationType",
        attributes: [
          "OrganizationStructureTypeName",
          "OrganizationStructureTypeID",
        ],
      },
      attributes: [
        "OrganizationStructureID",
        "OrganizationStructureName",
        "OrganizationStructureDescription",
        "OrganizationStructureAdditionalInfo",
        "OrganizationStructureEmail",
        "OrganizationStructureToken",
        "OrganizationStructureLogo",
        "OrganizationStructureColor",
        "IsActive",
      ],
    });
    res.status(200).send({ data });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.getOrganizationHirarchyZoneList = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const data = await OrganizationStructure.findAll({
      where: {
        ParentID: lincense?.EnterpriseID,
        IsDeleted: {
          [Op.not]: true,
        },
      },
      include: {
        model: OrganizationStructureType,
        as: "OrganizationType",
        attributes: [
          "OrganizationStructureTypeName",
          "OrganizationStructureTypeID",
        ],
      },
      attributes: [
        "OrganizationStructureID",
        "OrganizationStructureName",
        "OrganizationStructureDescription",
        "OrganizationStructureAdditionalInfo",
        "IsActive",
      ],
    });
    res.status(200).send({ data });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.getOrganizationHierarchyUnitList = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const data = await sequelize.query(`
        select os."OrganizationStructureID" as "ZoneID", os."OrganizationStructureName" as "ZoneName",
        os1."OrganizationStructureID" as "UnitID", os1."OrganizationStructureName" as "UnitName",
        os1."OrganizationStructureDescription" as "UnitDescriptions",
        ost."OrganizationStructureTypeID",ost."OrganizationStructureTypeName",os1."IsActive"
        from "OrganizationStructures" os 
        right join "OrganizationStructures" os1 on os1."ParentID"  = os."OrganizationStructureID"
        right join "OrganizationStructureTypes" ost on ost."OrganizationStructureTypeID" = os1."OrganizationStructureTypeID"
        where os."ParentID" = '${lincense?.EnterpriseID}' and os1."IsDeleted" is not true`);
    res.status(200).send({ data: data?.[0] ? data[0] : [] });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.addOrganizationDeparments = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  const transaction = await sequelize.transaction();
  try {
    const { DepartmentName, DepartmentDescription, IsActive } = req.body;
    const { DepartmentID } = await Departments.create(
      {
        DepartmentName,
        DepartmentDescription,
        OrganizationStructureID: lincense?.EnterpriseID,
        IsActive,
        CreatedBy: currentUserId,
      },
      { transaction }
    );

    await transaction.commit();
    res.status(201).send({ message: "Department added successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.updateOrganizationDepartments = async (req, res) => {
  const { currentUserId } = req.payload;
  const { DepartmentID, DepartmentName, DepartmentDescription, IsActive } =
    req.body;
  try {
    await Departments.update(
      {
        DepartmentName,
        DepartmentDescription,
        IsActive,
        ModifiedBy: currentUserId,
        ModifiedDate: new Date().toISOString(),
      },
      {
        where: {
          DepartmentID,
        },
      }
    );
    res.status(200).send({ message: "Department updated successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.deleteOrganizationDepartments = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { DepartmentID } = req.body;
    await Departments.update(
      {
        IsActive: false,
        IsDeleted: true,
        DeletedBy: currentUserId,
        DeletedDate: new Date().toISOString(),
      },
      {
        where: {
          DepartmentID,
        },
      }
    );
    res.status(200).send({ message: "Department deleted successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.getOrganizationDepartments = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const data = await OrganizationStructure.findOne({
      where: {
        OrganizationStructureID: lincense?.EnterpriseID,
      },
      attributes: ["OrganizationStructureID", "OrganizationStructureName"],
      include: [
        {
          model: Departments,
          as: "Departments",
          where: {
            IsDeleted: {
              [Op.not]: true,
            },
          },
        },
      ],
    });
    res.status(200).send({ data });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

/** =============== USER MANAGEMENT =============== */

exports.addUserToOrganizationStructure = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  const {
    UserName,
    Password,
    IsActive,
    UserType,
    UserFirstName,
    UserLastName,
    UserMiddleName,
    UserEmail,
    UserPhoneNumber,
    UserAddress,
    UserDateOfBirth = null,
    Gender,
    UserPhoto,
    UserEmployeeNumber,
    UserSupervisorID,
    OrganizationStructureID,
    RoleID,
    DepartmentID,
    UserSiganture,
    ESignUserName,
    ESignFirstName,
    SOPState,
    IsContentAndmin = false,
  } = req.body;
  const transaction = await sequelize.transaction();
  try {
    const passHash = generatePasswordHash(Password);
    if (UserType === "EndUser") {
      const count = await Users.count({
        where: {
          UserType: "EndUser",
          IsDeleted: { [Op.not]: true },
        },
        include: {
          model: UserOrganizationStructureLink,
          attributes: [],
          where: {
            OrganizationStructureID: lincense?.EnterpriseID,
          },
          required: true,
        },
      });
      if (count >= lincense.NumberOfEndUsers && !lincense.PerpetualEndUser) {
        await transaction.rollback();
        return res.status(400).send({ error: "End User limit reached" });
      }
    }
    if (UserType === "Admin") {
      const count = await Users.count({
        where: {
          UserType: "Admin",
          IsDeleted: { [Op.not]: true },
        },
        include: {
          model: UserOrganizationStructureLink,
          attributes: [],
          where: {
            OrganizationStructureID: lincense?.EnterpriseID,
          },
          required: true,
        },
      });
      if (count >= lincense.NumberOfAdminUsers) {
        await transaction.rollback();
        return res.status(400).send({ error: "Admin limit reached" });
      }
    }
    if (UserType === "Auditor") {
      const count = await Users.count({
        where: {
          UserType: "Auditor",
          IsDeleted: { [Op.not]: true },
        },
        include: {
          model: UserOrganizationStructureLink,
          attributes: [],
          where: {
            OrganizationStructureID: lincense?.EnterpriseID,
          },
          required: true,
        },
      });
      if (
        count >= lincense.NumberOfAuditorUsers &&
        !lincense.PerpetualAuditor
      ) {
        await transaction.rollback();
        return res.status(400).send({ error: "Auditor limit reached" });
      }
    }
    if (UserType === "ProcessOwner") {
      const count = await Users.count({
        where: {
          UserType: "ProcessOwner",
          IsDeleted: { [Op.not]: true },
        },
        include: {
          model: UserOrganizationStructureLink,
          attributes: [],
          where: {
            OrganizationStructureID: lincense?.EnterpriseID,
          },
          required: true,
        },
      });
      if (
        count >= lincense.NumberOfProcessOwnerUsers &&
        !lincense.PerpetualProcessOwner
      ) {
        await transaction.rollback();
        return res.status(400).send({ error: "Process Owner limit reached" });
      }
    }

    const client = await Client.findOne();
    const { UserID } = await Users.create(
      {
        UserName,
        Password: passHash,
        UserType,
        IsActive,
        CreatedBy: currentUserId,
        ClientId: client?.id,
        IsContentAndmin,
      },
      { transaction }
    );

    await UserDetails.create(
      {
        UserID,
        UserFirstName,
        UserLastName,
        UserMiddleName,
        UserEmail,
        UserPhoneNumber,
        UserAddress,
        UserDateOfBirth: UserDateOfBirth || null,
        Gender,
        UserPhoto,
        UserEmployeeNumber,
        UserSupervisorID,
        UserSiganture,
        ESignUserName,
        ESignFirstName,
        SOPState,
        CreatedBy: currentUserId,
      },
      { transaction }
    );
    await UserUnitLinks.create(
      {
        OrganizationStructureID,
        UserID,
        CreatedBy: currentUserId,
      },
      { transaction }
    );
    await UserOrganizationStructureLink.create(
      {
        OrganizationStructureID: lincense?.EnterpriseID,
        UserID,
        CreatedBy: currentUserId,
      },
      { transaction }
    );
    await UserRoleLink.create(
      {
        UserID,
        RoleID,
        CreatedBy: currentUserId,
      },
      { transaction }
    );
    await UserDeparmentLink.create(
      {
        UserID,
        DepartmentID,
        CreatedBy: currentUserId,
      },
      { transaction }
    );
    await Notification.create(
      {
        UserID,
        NotificationTypeForPublish: "none",
        NotificationTypeForAction: "none",
        CreatedBy: currentUserId,
      },
      { transaction }
    );

    if (UserType === "EndUser") {
      await assignElementToUser(
        UserID,
        DepartmentID,
        RoleID,
        currentUserId,
        transaction
      );
    }
    await transaction.commit();
    return res
      .status(200)
      .send({ message: "User added successfully to Enterprise" });
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.getUserDetails = async (req, res) => {
  const { currentUserId } = req.payload;
  const { UserID } = req.body;
  try {
    const data = await sequelize.query(
      `
        SELECT u."UserID",u."UserName",u."UserType",ud."UserFirstName",ud."UserLastName",
        ud."UserMiddleName",ud."UserEmail",ud."UserPhoneNumber",ud."UserAddress",
        ud."UserDateOfBirth",ud."Gender",ud."UserPhoto",ud."UserEmployeeNumber",
        ud."UserSupervisorID",ud."UserSiganture",ud."ESignUserName",ud."ESignFirstName",
        r."RoleID",r."RoleName",os."OrganizationStructureID",u."IsContentAndmin",
        os."OrganizationStructureName",os."OrganizationStructureTypeID",
        ost."OrganizationStructureTypeName",d."DepartmentID",d."DepartmentName"  FROM "Users" u
        LEFT JOIN "UserDetails" ud ON ud."UserID" = u."UserID"
        LEFT JOIN "UserRoleLinks" url ON url."UserID" = u."UserID"
        LEFT JOIN "Roles" r ON r."RoleID" = url."RoleID"
        LEFT JOIN "UserUnitLinks" uosl ON uosl."UserID" = u."UserID"
        LEFT JOIN "OrganizationStructures" os ON os."OrganizationStructureID" = uosl."OrganizationStructureID"
        LEFT JOIN "OrganizationStructureTypes" ost ON ost."OrganizationStructureTypeID" = os."OrganizationStructureTypeID"
        LEFT JOIN "UserDeparmentLinks" udl ON udl."UserID" = u."UserID"
        LEFT JOIN "Departments" d ON d."DepartmentID" = udl."DepartmentID"
        WHERE u."UserID" = :UserID   LIMIT 1`,
      {
        replacements: { UserID },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const resp = data.length > 0 ? (data[0].length > 0 ? data[0][0] : {}) : {};
    res.status(200).send({ data: resp });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.updateUserDetails = async (req, res) => {
  const { currentUserId } = req.payload;
  const {
    UserID,
    UserFirstName,
    UserLastName,
    UserMiddleName,
    UserType,
    UserEmail,
    UserPhoneNumber,
    UserAddress,
    UserDateOfBirth,
    Gender,
    UserPhoto,
    UserEmployeeNumber,
    UserSupervisorID,
    IsActive,
    OrganizationStructureID,
    RoleID,
    DepartmentID,
    UserSiganture,
    ESignUserName,
    ESignFirstName,
  } = req.body;
  try {
    await Users.update(
      {
        IsActive,
        UserType,
        ModifiedBy: currentUserId,
        ModifiedDate: new Date().toISOString(),
      },
      {
        where: { UserID },
      }
    );
    await UserDetails.update(
      {
        UserFirstName,
        UserLastName,
        UserMiddleName,
        UserEmail,
        UserPhoneNumber,
        UserAddress,
        UserDateOfBirth,
        Gender,
        UserPhoto,
        UserEmployeeNumber,
        UserSupervisorID,
        UserSiganture,
        ESignUserName,
        ESignFirstName,
        ModifiedBy: currentUserId,
        ModifiedDate: new Date().toISOString(),
      },
      {
        where: {
          UserID,
        },
      }
    );
    await UserUnitLinks.update(
      {
        OrganizationStructureID,
        ModifiedBy: currentUserId,
        ModifiedDate: new Date().toISOString(),
      },
      {
        where: {
          UserID,
        },
      }
    );
    await UserRoleLink.update(
      {
        RoleID,
        ModifiedBy: currentUserId,
        ModifiedDate: new Date().toISOString(),
      },
      {
        where: {
          UserID,
        },
      }
    );
    await UserDeparmentLink.update(
      {
        DepartmentID,
        ModifiedBy: currentUserId,
        ModifiedDate: new Date().toISOString(),
      },
      {
        where: {
          UserID,
        },
      }
    );
    res.status(200).send({ message: "User details updated successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.deleteUserFromOrganizationStructure = async (req, res) => {
  const transaction = await sequelize.transaction();
  const { currentUserId } = req.payload;
  const { UserID } = req.body;
  try {
    await Promise.all([
      Users.update(
        {
          IsActive: false,
          IsDeleted: true,
          DeletedByUserID: currentUserId,
          DeletedDate: new Date().toISOString(),
        },
        { where: { UserID }, transaction }
      ),
      UserDetails.update(
        {
          IsDeleted: true,
          DeletedByUserID: currentUserId,
          DeletedDate: new Date().toISOString(),
        },
        { where: { UserID }, transaction }
      ),
      removeAssignedElementFromUser(UserID, currentUserId, transaction),
    ]);

    await transaction.commit();
    res
      .status(200)
      .send({ message: "User deleted successfully from Enterprise" });
  } catch (error) {
    await transaction.rollback();
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.getUserList = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const { SearchQuery } = req.body;
    if (!lincense.EnterpriseID) {
      return res.status(400).send({ error: "Enterprise ID is required" });
    }
    const OrganizationStructureID = lincense?.EnterpriseID
      ? lincense?.EnterpriseID
      : null;
    let where = `AND ol."OrganizationStructureID" = '${OrganizationStructureID}' `;
    if (SearchQuery) {
      where += `AND (u."UserName" ilike '%${SearchQuery}%' OR ud."UserFirstName" ilike '%${SearchQuery}%' OR ud."UserMiddleName" ilike '%${SearchQuery}%'
            OR ud."UserPhoneNumber" ilike '%${SearchQuery}%' OR ud."UserAddress" ilike '%${SearchQuery}%'
            OR ud."UserLastName" ilike '%${SearchQuery}%' OR ud."UserEmail" ilike '%${SearchQuery}%' OR ud."UserEmployeeNumber" ilike '%${SearchQuery}%')`;
    }
    const data = await sequelize.query(
      `
        SELECT u."UserID",u."UserName",u."UserType",u."IsActive",ud."UserFirstName",ud."UserLastName",
        ud."UserMiddleName",ud."UserEmail",ud."UserPhoneNumber",ud."UserAddress",
        ud."UserDateOfBirth",ud."Gender",ud."UserPhoto",ud."UserEmployeeNumber",
        ud."UserSupervisorID",ud."UserSiganture",ud."ESignUserName",ud."ESignFirstName",
        r."RoleID",r."RoleName",os."OrganizationStructureID",u."IsContentAndmin",
        os."OrganizationStructureName",os."OrganizationStructureTypeID",
        ost."OrganizationStructureTypeName",d."DepartmentID",d."DepartmentName"  FROM "Users" u
        INNER JOIN "UserDetails" ud ON ud."UserID" = u."UserID"
        INNER JOIN "UserOrganizationStructureLinks" ol on ol."UserID" = u."UserID"
        LEFT JOIN "UserRoleLinks" url ON url."UserID" = u."UserID"
        LEFT JOIN "Roles" r ON r."RoleID" = url."RoleID"
        LEFT JOIN "UserUnitLinks" uosl ON uosl."UserID" = u."UserID"
        LEFT JOIN "OrganizationStructures" os ON os."OrganizationStructureID" = uosl."OrganizationStructureID"
        LEFT JOIN "OrganizationStructureTypes" ost ON ost."OrganizationStructureTypeID" = os."OrganizationStructureTypeID"
        LEFT JOIN "UserDeparmentLinks" udl ON udl."UserID" = u."UserID"
        LEFT JOIN "Departments" d ON d."DepartmentID" = udl."DepartmentID"
        WHERE u."IsDeleted" is not true ${where} 
        ORDER BY u."CreatedDate" DESC, u."ModifiedDate" DESC`,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );
    res.status(200).send({ data });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.getProcessOwnerDashboard = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const [
      resp,
      // task,
      // action,
      coutData,
      // tes,
      // mcq,
      banner,
      // flowAction,
      // ownerAction,
    ] = await Promise.all([
      //resp
      sequelize.query(
        `WITH
              REF AS (
                SELECT
                  DATE_TRUNC('month',NOW()) AS REF_MONTH
              ),
              "MonthLists" AS (
                SELECT
                  TO_CHAR(REF_MONTH + (I || ' month')::INTERVAL, 'YYYY-MM') AS YEAR_MONTH,
                  TO_CHAR(REF_MONTH + (I || ' month')::INTERVAL, 'Mon') AS MONTH_NAME,
                  (REF_MONTH + (I || ' month')::INTERVAL) AS MONTH_START,
                  (REF_MONTH + ((I + 1) || ' month')::INTERVAL) AS MONTH_END,
                  I AS MONTH_ORDER
                FROM
                  REF,
                  GENERATE_SERIES(-4, 1) G (I)
              ),
            "MonthWiseAssignings" AS (
              SELECT
                M.*,
                L."ModuleID",
                L."ModuleTypeID",
                L."UserID",
                MM."ModuleName"
              FROM
                "ModuleMasters" MM
                LEFT JOIN "MonthLists" M ON TRUE
                LEFT JOIN "UserModuleLinks" L ON L."StartDate" < M.MONTH_END
                AND L."DueDate" >= M.MONTH_START
                AND MM."ModuleTypeID" = L."ModuleTypeID"
                AND L."UserID" = :UserID
            ),
            "LImitedSixMonthData" AS (
              SELECT
                A.*,
                L."AccessedDate"
              FROM
                "MonthWiseAssignings" A
                LEFT JOIN "UserModuleAccessLogs" L ON L."ModuleID" = A."ModuleID"
                AND L."AccessedDate" >= A.MONTH_START
                AND L."AccessedDate" < A.MONTH_END
                AND L."UserID" = :UserID
            ),
            "MonthWiseElementAssignAndAccess" AS (
              SELECT
                MONTH_NAME,
                MONTH_ORDER,
                "ModuleTypeID",
                "ModuleName",
                COUNT(DISTINCT "ModuleID") AS "AssignElement",
                COUNT(DISTINCT "ModuleID") FILTER (
                  WHERE
                    "AccessedDate" IS NOT NULL
                ) AS "AccessElement"
              FROM
                "LImitedSixMonthData"
              GROUP BY
                MONTH_NAME,
                MONTH_ORDER,
                "ModuleTypeID",
                "ModuleName"
            )
            SELECT
              MA."ModuleName",
              JSON_AGG(
                JSON_BUILD_OBJECT(
                  'Month',
                  MA.MONTH_NAME,
                  'Total',
                  COALESCE(MA."AssignElement", 0),
                  'Attempt',
                  COALESCE(MA."AccessElement", 0)
                )
                ORDER BY MA.MONTH_ORDER
              ) AS DATES
            FROM
              "MonthWiseElementAssignAndAccess" MA
            WHERE MA."ModuleTypeID" IN (:ModuleTypeIDs)
            GROUP BY
              MA."ModuleName"
                  `,
        {
          replacements: {
            UserID: currentUserId,
            ModuleTypeIDs: lincense.ModuleTypeIDs,
          },
          type: sequelize.QueryTypes.SELECT,
        }
      ),
      //task
      //       sequelize.query(
      //         `
      //                        select 'PendingElement' as "Key", SUM("PendingAction") as "Value" from (
      //                        SELECT Count(*)  as "PendingAction"
      // FROM   (
      //               SELECT
      //                      CASE
      //                             WHEN mc."SOPDraftID" IS NOT NULL THEN (
      //                                    (
      //                                           SELECT Count(*)
      //                                           FROM   "ModuleCheckers" mc1
      //                                           INNER JOIN "SopModuleDrafts" smd ON smd."SOPDraftID" = mc."SOPDraftID"
      //                                           WHERE  mc1."SOPDraftID" = mc."SOPDraftID"
      //                                           AND    (
      //                                                         CASE
      //                                                           WHEN smd."NeedAcceptance" IS TRUE
      //                                                           THEN mc1."ModifiedBy" = :UserID
      //                                                         ELSE mc1."ModifiedBy" IS NOT NULL END
      //                                                  OR     mc1."IsDeleted" IS TRUE))+
      //                                    (
      //                                           SELECT Count(*)
      //                                           FROM   "ModuleEscalations" mc1
      //                                           WHERE  mc1."SOPDraftID" = mc."SOPDraftID"
      //                                           AND    (
      //                                                         mc1."ModifiedBy" IS NOT NULL
      //                                                  OR     mc1."IsDeleted" IS TRUE)))
      //                             WHEN mc."DocumentModuleDraftID" IS NOT NULL THEN (
      //                                    (
      //                                           SELECT Count(*)
      //                                           FROM   "ModuleCheckers" mc1
      //                                           INNER JOIN  "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
      //                                           WHERE  mc1."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
      //                                           AND    (
      //                                                         CASE
      //                                                           WHEN dmd."NeedAcceptance" IS TRUE
      //                                                           THEN mc1."ModifiedBy" = :UserID
      //                                                         ELSE mc1."ModifiedBy" IS NOT NULL END
      //                                                  OR     mc1."IsDeleted" IS TRUE))+
      //                                    (
      //                                           SELECT Count(*)
      //                                           FROM   "ModuleEscalations" mc1
      //                                           WHERE  mc1."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
      //                                           AND    (
      //                                                         mc1."ModifiedBy" IS NOT NULL
      //                                                  OR     mc1."IsDeleted" IS TRUE)))
      //                             WHEN mc."TrainingSimulationDraftID" IS NOT NULL THEN (
      //                                    (
      //                                           SELECT Count(*)
      //                                           FROM   "ModuleCheckers" mc1
      //                                           INNER JOIN "TrainingSimulationModuleDrafts" tsmd ON tsmd."TrainingSimulationDraftID" = mc."TrainingSimulationDraftID"
      //                                           WHERE  mc1."TrainingSimulationDraftID" = mc."TrainingSimulationDraftID"
      //                                           AND    (
      //                                                         CASE
      //                                                           WHEN tsmd."NeedAcceptance" IS TRUE
      //                                                           THEN mc1."ModifiedBy" = :UserID
      //                                                         ELSE mc1."ModifiedBy" IS NOT NULL END
      //                                                  OR     mc1."IsDeleted" IS TRUE))+
      //                                    (
      //                                           SELECT Count(*)
      //                                           FROM   "ModuleEscalations" mc1
      //                                           WHERE  mc1."TrainingSimulationDraftID" = mc."TrainingSimulationDraftID"
      //                                           AND    (
      //                                                         mc1."ModifiedBy" IS NOT NULL
      //                                                  OR     mc1."IsDeleted" IS TRUE)))
      //                             WHEN mc."TestSimulationDraftID" IS NOT NULL THEN (
      //                                    (
      //                                           SELECT Count(*)
      //                                           FROM   "ModuleCheckers" mc1
      //                                           INNER JOIN "TestSimulationModuleDrafts" tsmd ON tsmd."TestSimulationDraftID" = mc."TestSimulationDraftID"
      //                                           WHERE  mc1."TestSimulationDraftID" = mc."TestSimulationDraftID"
      //                                           AND    (
      //                                                         CASE
      //                                                           WHEN tsmd."NeedAcceptance" IS TRUE
      //                                                           THEN mc1."ModifiedBy" = :UserID
      //                                                         ELSE mc1."ModifiedBy" IS NOT NULL END
      //                                                         OR     mc1."IsDeleted" IS TRUE))+
      //                                    (
      //                                           SELECT Count(*)
      //                                           FROM   "ModuleEscalations" mc1
      //                                           WHERE  mc1."TestSimulationDraftID" = mc."TestSimulationDraftID"
      //                                           AND    (
      //                                                         mc1."ModifiedBy" IS NOT NULL
      //                                                  OR     mc1."IsDeleted" IS TRUE)))
      //                             WHEN mc."TestMCQDraftID" IS NOT NULL THEN (
      //                                    (
      //                                           SELECT Count(*)
      //                                           FROM   "ModuleCheckers" mc1
      //                                           INNER JOIN "TestMcqsModuleDrafts" tmd ON tmd."TestMCQDraftID" = mc."TestMCQDraftID"
      //                                           WHERE  mc1."TestMCQDraftID" = mc."TestMCQDraftID"
      //                                           AND    (
      //                                                         CASE
      //                                                           WHEN tmd."NeedAcceptance" IS TRUE
      //                                                           THEN mc1."ModifiedBy" = :UserID
      //                                                         ELSE mc1."ModifiedBy" IS NOT NULL END
      //                                                       OR     mc1."IsDeleted" IS TRUE))+
      //                                    (
      //                                           SELECT Count(*)
      //                                           FROM   "ModuleEscalations" mc1
      //                                           WHERE  mc1."TestMCQDraftID" = mc."TestMCQDraftID"
      //                                           AND    (
      //                                                         mc1."ModifiedBy" IS NOT NULL
      //                                                  OR     mc1."IsDeleted" IS TRUE)))
      //                             ELSE 0
      //                      end AS "NumberOfActionPersion",
      //                      CASE
      //                             WHEN mc."TrainingSimulationDraftID" IS NOT NULL THEN
      //                                    (
      //                                           SELECT
      //                                                  CASE
      //                                                         WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Days' THEN "CreatedDate"   + INTERVAL '1 day' * "EscalationAfter"
      //                                                         when "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Years' THEN "CreatedDate"  + INTERVAL '1 year' * "EscalationAfter"
      //                                                         ELSE "CreatedDate"
      //                                                  end
      //                                           FROM   "TrainingSimulationModuleDrafts"
      //                                           WHERE  "TrainingSimulationDraftID" = mc."TrainingSimulationDraftID" limit 1 )
      //                             WHEN mc."TestSimulationDraftID" IS NOT NULL THEN
      //                                    (
      //                                           SELECT
      //                                                  CASE
      //                                                         WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Days' THEN "CreatedDate"   + INTERVAL '1 day' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Years' THEN "CreatedDate"  + INTERVAL '1 year' * "EscalationAfter"
      //                                                         ELSE "CreatedDate"
      //                                                  end
      //                                           FROM   "TestSimulationModuleDrafts"
      //                                           WHERE  "TestSimulationDraftID" = mc."TestSimulationDraftID" limit 1 )
      //                             WHEN mc."DocumentModuleDraftID" IS NOT NULL THEN
      //                                    (
      //                                           SELECT
      //                                                  CASE
      //                                                         WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Days' THEN "CreatedDate"   + INTERVAL '1 day' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Years' THEN "CreatedDate"  + INTERVAL '1 year' * "EscalationAfter"
      //                                                         ELSE "CreatedDate"
      //                                                  end
      //                                           FROM   "DocumentModuleDrafts"
      //                                           WHERE  "DocumentModuleDraftID" = mc."DocumentModuleDraftID" limit 1)
      //                             WHEN mc."SOPDraftID" IS NOT NULL THEN
      //                                    (
      //                                           SELECT
      //                                                  CASE
      //                                                         WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Days' THEN "CreatedDate"   + INTERVAL '1 day' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Years' THEN "CreatedDate"  + INTERVAL '1 year' * "EscalationAfter"
      //                                                         ELSE "CreatedDate"
      //                                                  end
      //                                           FROM   "SopModuleDrafts"
      //                                           WHERE  "SOPDraftID" = mc."SOPDraftID" limit 1)
      //                             WHEN mc."TestMCQDraftID" IS NOT NULL THEN
      //                                    (
      //                                           SELECT
      //                                                  CASE
      //                                                         WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Days' THEN "CreatedDate"   + INTERVAL '1 day' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Years' THEN "CreatedDate"  + INTERVAL '1 year' * "EscalationAfter"
      //                                                         ELSE "CreatedDate"
      //                                                  end
      //                                           FROM   "TestMcqsModuleDrafts"
      //                                           WHERE  "TestMCQDraftID" = mc."TestMCQDraftID" limit 1)
      //                             ELSE NULL
      //                      end AS "DueDate"
      //               FROM   "ModuleCheckers" mc
      //               WHERE  mc."UserID" = :UserID
      //               AND    mc."IsDeleted" IS NOT TRUE )
      // WHERE  "NumberOfActionPersion" = 0
      // AND    "DueDate" >= CURRENT_TIMESTAMP
      // UNION ALL
      // SELECT count(*) as "PendingAction"
      // FROM   (
      //               SELECT
      //                      CASE
      //                             WHEN mc."SOPDraftID" IS NOT NULL THEN (
      //                                    (
      //                                           SELECT count(*)
      //                                           FROM   "ModuleCheckers" mc1
      //                                           INNER JOIN "SopModuleDrafts" smd ON smd."SOPDraftID" = mc."SOPDraftID"
      //                                           WHERE  mc1."SOPDraftID" = mc."SOPDraftID"
      //                                           AND    (
      //                                                         CASE WHEN smd."NeedAcceptance" IS TRUE
      //                                                          THEN mc1."ModifiedBy" = :UserID
      //                                                          ELSE mc1."ModifiedBy" IS NOT NULL END
      //                                                  OR     mc1."IsDeleted" IS TRUE))+
      //                                    (
      //                                           SELECT count(*)
      //                                           FROM   "ModuleEscalations" mc1
      //                                           WHERE  mc1."SOPDraftID" = mc."SOPDraftID"
      //                                           AND    (
      //                                                         mc1."ModifiedBy" IS NOT NULL
      //                                                  OR     mc1."IsDeleted" IS TRUE)))
      //                             WHEN mc."DocumentModuleDraftID" IS NOT NULL THEN (
      //                                    (
      //                                           SELECT count(*)
      //                                           FROM   "ModuleCheckers" mc1
      //                                           INNER JOIN  "DocumentModuleDrafts" dmd ON dmd."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
      //                                           WHERE  mc1."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
      //                                           AND    (
      //                                                          CASE WHEN dmd."NeedAcceptance" IS TRUE
      //                                                          THEN mc1."ModifiedBy" = :UserID
      //                                                          ELSE mc1."ModifiedBy" IS NOT NULL END
      //                                                  OR     mc1."IsDeleted" IS TRUE))+
      //                                    (
      //                                           SELECT count(*)
      //                                           FROM   "ModuleEscalations" mc1
      //                                           WHERE  mc1."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
      //                                           AND    (
      //                                                         mc1."ModifiedBy" IS NOT NULL
      //                                                  OR     mc1."IsDeleted" IS TRUE)))
      //                             WHEN mc."TrainingSimulationDraftID" IS NOT NULL THEN (
      //                                    (
      //                                           SELECT count(*)
      //                                           FROM   "ModuleCheckers" mc1
      //                                           INNER JOIN "TrainingSimulationModuleDrafts" tsmd ON tsmd."TrainingSimulationDraftID" = mc."TrainingSimulationDraftID"
      //                                           WHERE  mc1."TrainingSimulationDraftID" = mc."TrainingSimulationDraftID"
      //                                           AND    (
      //                                                          CASE WHEN tsmd."NeedAcceptance" IS TRUE
      //                                                          THEN mc1."ModifiedBy" = :UserID
      //                                                          ELSE mc1."ModifiedBy" IS NOT NULL END
      //                                                  OR     mc1."IsDeleted" IS TRUE))+
      //                                    (
      //                                           SELECT count(*)
      //                                           FROM   "ModuleEscalations" mc1
      //                                           WHERE  mc1."TrainingSimulationDraftID" = mc."TrainingSimulationDraftID"
      //                                           AND    (
      //                                                         mc1."ModifiedBy" IS NOT NULL
      //                                                  OR     mc1."IsDeleted" IS TRUE)))
      //                             WHEN mc."TestSimulationDraftID" IS NOT NULL THEN (
      //                                    (
      //                                           SELECT count(*)
      //                                           FROM   "ModuleCheckers" mc1
      //                                           INNER JOIN "TestSimulationModuleDrafts" tsmd ON tsmd."TestSimulationDraftID" = mc."TestSimulationDraftID"
      //                                           WHERE  mc1."TestSimulationDraftID" = mc."TestSimulationDraftID"
      //                                           AND    (
      //                                                        CASE WHEN tsmd."NeedAcceptance" IS TRUE
      //                                                          THEN mc1."ModifiedBy" = :UserID
      //                                                          ELSE mc1."ModifiedBy" IS NOT NULL END
      //                                                  OR     mc1."IsDeleted" IS TRUE))+
      //                                    (
      //                                           SELECT count(*)
      //                                           FROM   "ModuleEscalations" mc1
      //                                           WHERE  mc1."TestSimulationDraftID" = mc."TestSimulationDraftID"
      //                                           AND    (
      //                                                         mc1."ModifiedBy" IS NOT NULL
      //                                                  OR     mc1."IsDeleted" IS TRUE)))
      //                             WHEN mc."TestMCQDraftID" IS NOT NULL THEN (
      //                                    (
      //                                           SELECT count(*)
      //                                           FROM   "ModuleCheckers" mc1
      //                                           INNER JOIN "TestMcqsModuleDrafts" tmd ON tmd."TestMCQDraftID" = mc."TestMCQDraftID"
      //                                           WHERE  mc1."TestMCQDraftID" = mc."TestMCQDraftID"
      //                                           AND    (
      //                                                          CASE WHEN tmd."NeedAcceptance" IS TRUE
      //                                                          THEN mc1."ModifiedBy" = :UserID
      //                                                          ELSE mc1."ModifiedBy" IS NOT NULL END
      //                                                  OR     mc1."IsDeleted" IS TRUE))+
      //                                    (
      //                                           SELECT count(*)
      //                                           FROM   "ModuleEscalations" mc1
      //                                           WHERE  mc1."TestMCQDraftID" = mc."TestMCQDraftID"
      //                                           AND    (
      //                                                         mc1."ModifiedBy" IS NOT NULL
      //                                                  OR     mc1."IsDeleted" IS TRUE)))
      //                             ELSE 0
      //                      end AS "NumberOfActionPersion",
      //                      CASE
      //                             WHEN mc."TrainingSimulationDraftID" IS NOT NULL THEN
      //                                    (
      //                                           SELECT
      //                                                  CASE
      //                                                         WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Days' THEN "CreatedDate"   + INTERVAL '1 day' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Years' THEN "CreatedDate"  + INTERVAL '1 year' * "EscalationAfter"
      //                                                         ELSE "CreatedDate"
      //                                                  end
      //                                           FROM   "TrainingSimulationModuleDrafts"
      //                                           WHERE  "TrainingSimulationDraftID" = mc."TrainingSimulationDraftID" limit 1 )
      //                             WHEN mc."TestSimulationDraftID" IS NOT NULL THEN
      //                                    (
      //                                           SELECT
      //                                                  CASE
      //                                                         WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Days' THEN "CreatedDate"   + INTERVAL '1 day' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Years' THEN "CreatedDate"  + INTERVAL '1 year' * "EscalationAfter"
      //                                                         ELSE "CreatedDate"
      //                                                  end
      //                                           FROM   "TestSimulationModuleDrafts"
      //                                           WHERE  "TestSimulationDraftID" = mc."TestSimulationDraftID" limit 1 )
      //                             WHEN mc."DocumentModuleDraftID" IS NOT NULL THEN
      //                                    (
      //                                           SELECT
      //                                                  CASE
      //                                                         WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Days' THEN "CreatedDate"   + INTERVAL '1 day' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Years' THEN "CreatedDate"  + INTERVAL '1 year' * "EscalationAfter"
      //                                                         ELSE "CreatedDate"
      //                                                  end
      //                                           FROM   "DocumentModuleDrafts"
      //                                           WHERE  "DocumentModuleDraftID" = mc."DocumentModuleDraftID" limit 1)
      //                             WHEN mc."SOPDraftID" IS NOT NULL THEN
      //                                    (
      //                                           SELECT
      //                                                  CASE

      //                                                         WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Days' THEN "CreatedDate"   + INTERVAL '1 day' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Years' THEN "CreatedDate"  + INTERVAL '1 year' * "EscalationAfter"
      //                                                         ELSE "CreatedDate"
      //                                                  end
      //                                           FROM   "SopModuleDrafts"
      //                                           WHERE  "SOPDraftID" = mc."SOPDraftID" limit 1)
      //                             WHEN mc."TestMCQDraftID" IS NOT NULL THEN
      //                                    (
      //                                           SELECT
      //                                                  CASE
      //                                                         WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Days' THEN "CreatedDate"   + INTERVAL '1 day' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Weeks' THEN "CreatedDate"  + INTERVAL '1 week' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Months' THEN "CreatedDate" + INTERVAL '1 month' * "EscalationAfter"
      //                                                         WHEN "EscalationType" = 'Years' THEN "CreatedDate"  + INTERVAL '1 year' * "EscalationAfter"
      //                                                         ELSE "CreatedDate"
      //                                                  end
      //                                           FROM   "TestMcqsModuleDrafts"
      //                                           WHERE  "TestMCQDraftID" = mc."TestMCQDraftID" limit 1)
      //                             ELSE NULL
      //                      end AS "DueDate"
      //               FROM   "ModuleEscalations" mc
      //               WHERE  mc."UserID" = :UserID
      //               AND    mc."IsDeleted" IS NOT TRUE )
      // WHERE  "NumberOfActionPersion" = 0
      // AND    "DueDate" < CURRENT_TIMESTAMP)
      //                             union all
      //                             select 'ExpiredElement' as "Key", sum(elementcount) as "Value" from (
      //                             select count(*) as elementcount from "SopModules" sm
      //                             inner join "ContentStructures" cs on cs."ContentID" = sm."ContentID"
      //                             where sm."SOPExpiry" between current_date and current_date + interval '3 month'
      //                             and sm."SOPStatus" = 'Published' and sm."SOPIsActive" = true and sm."IsDeleted" is not true
      //                             and cs."OrganizationStructureID" = :OrganizationStructureID
      //                             union all
      //                             select count(*) as elementcount from "DocumentModules" dm
      //                             inner join "ContentStructures" cs on cs."ContentID" = dm."ContentID"
      //                             where dm."DocumentExpiry" between current_date and current_date + interval '3 month'
      //                             and dm."DocumentStatus" = 'Published' and dm."DocumentIsActive" = true and dm."IsDeleted" is not true
      //                             and cs."OrganizationStructureID" = :OrganizationStructureID
      //                             union all
      //                             select count(*) as elementcount from "TrainingSimulationModules" tsm
      //                             inner join "ContentStructures" cs on cs."ContentID" = tsm."ContentID"
      //                             where tsm."TrainingSimulationExpiry" between current_date and current_date + interval '3 month'
      //                             and tsm."TrainingSimulationStatus" = 'Published' and tsm."TrainingSimulationIsActive" = true and tsm."IsDeleted" is not true
      //                             and cs."OrganizationStructureID" = :OrganizationStructureID
      //                             union all
      //                             select count(*) as elementcount from "TestSimulationModules" tsm
      //                             inner join "ContentStructures" cs on cs."ContentID" = tsm."ContentID"
      //                             where tsm."TestSimulationExpiry" between current_date and current_date + interval '3 month'
      //                             and tsm."TestSimulationStatus" = 'Published' and tsm."TestSimulationIsActive" = true and tsm."IsDeleted" is not true
      //                             and cs."OrganizationStructureID" = :OrganizationStructureID
      //                             union all
      //                             select count(*) as elementcount from "TestMcqsModules" tmm
      //                             inner join "ContentStructures" cs on cs."ContentID" = tmm."ContentID"
      //                             where tmm."TestMCQExpiry" between current_date and current_date + interval '3 month'
      //                             and tmm."TestMCQStatus" = 'Published' and tmm."TestMCQIsActive" = true and tmm."IsDeleted" is not true
      //                             and cs."OrganizationStructureID" = :OrganizationStructureID)
      //                             union all
      //                             select 'UnAccessElement' as "Key", count( distinct mm."ModuleID") from "UserModuleLinks" uml
      //                             left join (
      //                             select sm."SOPID" as "ModuleID" from "SopModules" sm
      //                             union all
      //                             select dm."DocumentID" as "ModuleID" from "DocumentModules" dm
      //                             union all
      //                             select tsm."TrainingSimulationID" as "ModuleID" from "TrainingSimulationModules" tsm
      //                             union all
      //                             select tsm."TestSimulationID" as "ModuleID" from "TestSimulationModules" tsm
      //                             union all
      //                             select tmm."TestMCQID" as "ModuleID" from "TestMcqsModules" tmm
      //                             union all
      //                             select fm."FormID" as "ModuleID" from "FormModules" fm
      //                             )  mm on mm."ModuleID" = uml."ModuleID"
      //                             where uml."ModuleID" not in (
      //                             select "ModuleID" from "UserModuleAccessLogs" where "UserID" = :UserID
      //                             ) and uml."UserID" = :UserID
      //                             union all
      //                               select 'CompleteElement' as "key", count(*) + (select count(*) from "ModuleEscalations" me where
      //                               me."UserID" = :UserID and me."ModifiedBy" = :UserID )
      //                             from "ModuleCheckers" mc
      //                             where mc."UserID" = :UserID and  mc."ModifiedBy" = :UserID
      //                             union all
      //                                   select 'RejectedElement' as "Key", count(*)+(select count(*)
      //                               from "ModuleEscalations" me
      //                               where me."UserID" = :UserID and me."ApprovalStatus" = 'Rejected') as "Value"
      //                             from "ModuleCheckers" mc
      //                             where mc."UserID" = :UserID
      //                               and mc."ApprovalStatus" = 'Rejected'`,
      //         {
      //           replacements: {
      //             UserID: currentUserId,
      //             OrganizationStructureID: lincense.EnterpriseID,
      //           },
      //           type: sequelize.QueryTypes.SELECT,
      //         }
      //       ),
      //action
      // sequelize.query(
      //   `WITH ModuleData AS (
      //       SELECT
      //           mc."UserID",
      //           COALESCE(
      //               mc."TrainingSimulationDraftID",
      //               mc."TestSimulationDraftID",
      //               mc."DocumentModuleDraftID",
      //               mc."SOPDraftID",
      //               mc."TestMCQDraftID"
      //           ) AS "ElementID",
      //           mm."ModuleName",
      //           mm."ModuleTypeID",
      //           CASE
      //               WHEN mc."TrainingSimulationDraftID" IS NOT NULL THEN 'TrainingSimulation'
      //               WHEN mc."TestSimulationDraftID" IS NOT NULL THEN 'SkillAssessment'
      //               WHEN mc."DocumentModuleDraftID" IS NOT NULL THEN 'Document'
      //               WHEN mc."SOPDraftID" IS NOT NULL THEN 'SOP'
      //               WHEN mc."TestMCQDraftID" IS NOT NULL THEN 'TestMCQ'
      //           END AS "ModuleType",
      //           'Checker' AS "ActionType"
      //       FROM "ModuleCheckers" mc
      //       INNER JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = mc."ModuleTypeID"
      //       WHERE mc."IsDeleted" IS NOT TRUE

      //       UNION ALL

      //       SELECT
      //           mc."UserID",
      //           mc."DocumentModuleDraftID",
      //           mm."ModuleName",
      //           mm."ModuleTypeID",
      //           'Document',
      //           'StakeHolder'
      //       FROM "ModuleStakeHolders" mc
      //       INNER JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = mc."ModuleTypeID"
      //       WHERE mc."IsDeleted" IS NOT TRUE

      //       UNION ALL

      //       SELECT
      //           mc."UserID",
      //           COALESCE(
      //               mc."TrainingSimulationDraftID",
      //               mc."TestSimulationDraftID",
      //               mc."DocumentModuleDraftID",
      //               mc."SOPDraftID",
      //               mc."TestMCQDraftID"
      //           ),
      //           mm."ModuleName",
      //           mm."ModuleTypeID",
      //           CASE
      //               WHEN mc."TrainingSimulationDraftID" IS NOT NULL THEN 'TrainingSimulation'
      //               WHEN mc."TestSimulationDraftID" IS NOT NULL THEN 'TestSimulation'
      //               WHEN mc."DocumentModuleDraftID" IS NOT NULL THEN 'Document'
      //               WHEN mc."SOPDraftID" IS NOT NULL THEN 'SOP'
      //               WHEN mc."TestMCQDraftID" IS NOT NULL THEN 'TestMCQ'
      //           END,
      //           'Escalator'
      //       FROM "ModuleEscalations" mc
      //       INNER JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = mc."ModuleTypeID"
      //       WHERE mc."IsDeleted" IS NOT TRUE
      //   ),
      //   ElementDetails AS (
      //       SELECT
      //           md."UserID",
      //           md."ElementID",
      //           md."ModuleName",
      //           md."ModuleTypeID",
      //           md."ActionType",
      //           md."ModuleType",
      //           CASE md."ModuleType"
      //               WHEN 'TrainingSimulation' THEN tsmd."TrainingSimulationName"
      //               WHEN 'TestSimulation' THEN tsmd2."TestSimulationName"
      //               WHEN 'Document' THEN dmd."DocumentName"
      //               WHEN 'SOP' THEN smd."SOPName"
      //               WHEN 'TestMCQ' THEN tmcq."TestMCQName"
      //           END AS "ElementName",
      //           CASE md."ModuleType"
      //               WHEN 'TrainingSimulation' THEN tsmd."CreatedDate" + MAKE_INTERVAL(
      //                   mins => CASE WHEN tsmd."EscalationType" = 'Minutes' THEN tsmd."EscalationAfter" ELSE 0 END,
      //                   hours => CASE WHEN tsmd."EscalationType" = 'Hours' THEN tsmd."EscalationAfter" ELSE 0 END,
      //                   days => CASE WHEN tsmd."EscalationType" = 'Days' THEN tsmd."EscalationAfter" ELSE 0 END,
      //                   weeks => CASE WHEN tsmd."EscalationType" = 'Weeks' THEN tsmd."EscalationAfter" ELSE 0 END,
      //                   months => CASE WHEN tsmd."EscalationType" = 'Months' THEN tsmd."EscalationAfter" ELSE 0 END,
      //                   years => CASE WHEN tsmd."EscalationType" = 'Years' THEN tsmd."EscalationAfter" ELSE 0 END
      //               )
      //               WHEN 'TestSimulation' THEN tsmd2."CreatedDate" + MAKE_INTERVAL(
      //                   mins => CASE WHEN tsmd2."EscalationType" = 'Minutes' THEN tsmd2."EscalationAfter" ELSE 0 END,
      //                   hours => CASE WHEN tsmd2."EscalationType" = 'Hours' THEN tsmd2."EscalationAfter" ELSE 0 END,
      //                   days => CASE WHEN tsmd2."EscalationType" = 'Days' THEN tsmd2."EscalationAfter" ELSE 0 END,
      //                   weeks => CASE WHEN tsmd2."EscalationType" = 'Weeks' THEN tsmd2."EscalationAfter" ELSE 0 END,
      //                   months => CASE WHEN tsmd2."EscalationType" = 'Months' THEN tsmd2."EscalationAfter" ELSE 0 END,
      //                   years => CASE WHEN tsmd2."EscalationType" = 'Years' THEN tsmd2."EscalationAfter" ELSE 0 END
      //               )
      //               WHEN 'Document' THEN dmd."CreatedDate" + MAKE_INTERVAL(
      //                   mins => CASE WHEN dmd."EscalationType" = 'Minutes' THEN dmd."EscalationAfter" ELSE 0 END,
      //                   hours => CASE WHEN dmd."EscalationType" = 'Hours' THEN dmd."EscalationAfter" ELSE 0 END,
      //                   days => CASE WHEN dmd."EscalationType" = 'Days' THEN dmd."EscalationAfter" ELSE 0 END,
      //                   weeks => CASE WHEN dmd."EscalationType" = 'Weeks' THEN dmd."EscalationAfter" ELSE 0 END,
      //                   months => CASE WHEN dmd."EscalationType" = 'Months' THEN dmd."EscalationAfter" ELSE 0 END,
      //                   years => CASE WHEN dmd."EscalationType" = 'Years' THEN dmd."EscalationAfter" ELSE 0 END
      //               )
      //               WHEN 'SOP' THEN smd."CreatedDate" + MAKE_INTERVAL(
      //                   mins => CASE WHEN smd."EscalationType" = 'Minutes' THEN smd."EscalationAfter" ELSE 0 END,
      //                   hours => CASE WHEN smd."EscalationType" = 'Hours' THEN smd."EscalationAfter" ELSE 0 END,
      //                   days => CASE WHEN smd."EscalationType" = 'Days' THEN smd."EscalationAfter" ELSE 0 END,
      //                   weeks => CASE WHEN smd."EscalationType" = 'Weeks' THEN smd."EscalationAfter" ELSE 0 END,
      //                   months => CASE WHEN smd."EscalationType" = 'Months' THEN smd."EscalationAfter" ELSE 0 END,
      //                   years => CASE WHEN smd."EscalationType" = 'Years' THEN smd."EscalationAfter" ELSE 0 END
      //               )
      //               WHEN 'TestMCQ' THEN tmcq."CreatedDate" + MAKE_INTERVAL(
      //                   mins => CASE WHEN tmcq."EscalationType" = 'Minutes' THEN tmcq."EscalationAfter" ELSE 0 END,
      //                   hours => CASE WHEN tmcq."EscalationType" = 'Hours' THEN tmcq."EscalationAfter" ELSE 0 END,
      //                   days => CASE WHEN tmcq."EscalationType" = 'Days' THEN tmcq."EscalationAfter" ELSE 0 END,
      //                   weeks => CASE WHEN tmcq."EscalationType" = 'Weeks' THEN tmcq."EscalationAfter" ELSE 0 END,
      //                   months => CASE WHEN tmcq."EscalationType" = 'Months' THEN tmcq."EscalationAfter" ELSE 0 END,
      //                   years => CASE WHEN tmcq."EscalationType" = 'Years' THEN tmcq."EscalationAfter" ELSE 0 END
      //               )
      //           END AS "DueDate"
      //       FROM ModuleData md
      //       LEFT JOIN "TrainingSimulationModuleDrafts" tsmd
      //           ON md."ModuleType" = 'TrainingSimulation' AND tsmd."TrainingSimulationDraftID" = md."ElementID"
      //       LEFT JOIN "TestSimulationModuleDrafts" tsmd2
      //           ON md."ModuleType" = 'TestSimulation' AND tsmd2."TestSimulationDraftID" = md."ElementID"
      //       LEFT JOIN "DocumentModuleDrafts" dmd
      //           ON md."ModuleType" = 'Document' AND dmd."DocumentModuleDraftID" = md."ElementID"
      //       LEFT JOIN "SopModuleDrafts" smd
      //           ON md."ModuleType" = 'SOP' AND smd."SOPDraftID" = md."ElementID"
      //       LEFT JOIN "TestMcqsModuleDrafts" tmcq
      //           ON md."ModuleType" = 'TestMCQ' AND tmcq."TestMCQDraftID" = md."ElementID"
      //   )
      //   SELECT
      //       ed."ElementID",
      //       ed."ElementName",
      //       ed."DueDate",
      //       ed."ActionType",
      //       ed."ModuleName",
      //       ed."ModuleTypeID"
      //   FROM ElementDetails ed
      //   WHERE ed."UserID" = :UserID
      //   AND (
      //       (ed."ActionType" IN ('Checker', 'StakeHolder') AND ed."DueDate" >= CURRENT_TIMESTAMP)
      //       OR (ed."ActionType" = 'Escalator' AND ed."DueDate" < CURRENT_TIMESTAMP)
      //   );`,
      //   {
      //     replacements: { UserID: currentUserId },
      //     type: sequelize.QueryTypes.SELECT,
      //   }
      // ),

      sequelize.query(
        `
    WITH RECURSIVE descendants AS (
          SELECT 
              c."ContentID", 
              c."ParentContentID", 
              c."ContentName",
              c."ModuleTypeID",
              c."IsDeleted", 
              0 AS depth
          FROM "ContentStructures" c
          WHERE c."ParentContentID" IS NULL
        AND c."IsDeleted" IS NOT TRUE
        AND c."OrganizationStructureID" = :OrganizationStructureID
          UNION ALL
          SELECT 
              child."ContentID", 
              child."ParentContentID", 
              child."ContentName",
              child."ModuleTypeID",
              child."IsDeleted",
              d.depth + 1
          FROM "ContentStructures" child
          JOIN descendants d 
              ON child."ParentContentID" = d."ContentID"
          WHERE d."IsDeleted" = false  
      ),
      "SelectedContentIds" AS (
      SELECT "ContentID","ModuleTypeID"
      FROM descendants
      WHERE "IsDeleted" = false
      )
      SELECT 'sop' AS name, COUNT(DISTINCT uml."ModuleID") AS count FROM "SopModules" m
      INNER JOIN "UserModuleLinks" uml ON uml."ModuleID" = m."SOPID" 
      INNER JOIN "ContentStructures" cs ON cs."ContentID" = m."ContentID" AND cs."IsDeleted" IS NOT TRUE
      AND CURRENT_DATE BETWEEN uml."StartDate" AND uml."DueDate" AND uml."UserID"=:UserID
      WHERE m."IsDeleted" IS NOT TRUE
      AND cs."ContentID" IN (SELECT "ContentID" FROM "SelectedContentIds" s WHERE s."ModuleTypeID" = cs."ModuleTypeID")
      UNION ALL
      SELECT 'doc' AS name, COUNT(DISTINCT uml."ModuleID") AS count FROM "DocumentModules" m
      INNER JOIN "UserModuleLinks" uml ON uml."ModuleID" = m."DocumentID" 
      INNER JOIN "ContentStructures" cs ON cs."ContentID" = m."ContentID" AND cs."IsDeleted" IS NOT TRUE
      AND CURRENT_DATE BETWEEN uml."StartDate" AND uml."DueDate" AND uml."UserID"=:UserID
      WHERE m."IsDeleted" IS NOT TRUE 
      AND cs."ContentID" IN (SELECT "ContentID" FROM "SelectedContentIds" s WHERE s."ModuleTypeID" = cs."ModuleTypeID")
      UNION ALL
      SELECT 'mcq' AS name, COUNT(DISTINCT uml."ModuleID") AS count FROM "TestMcqsModules" m
      INNER JOIN "UserModuleLinks" uml ON uml."ModuleID" = m."TestMCQID" 
      INNER JOIN "ContentStructures" cs ON cs."ContentID" = m."ContentID" AND cs."IsDeleted" IS NOT TRUE
      AND CURRENT_DATE BETWEEN uml."StartDate" AND uml."DueDate" AND uml."UserID"=:UserID
      WHERE m."IsDeleted" IS NOT TRUE
      AND cs."ContentID" IN (SELECT "ContentID" FROM "SelectedContentIds" s WHERE s."ModuleTypeID" = cs."ModuleTypeID")
      UNION ALL
      SELECT 'tes' AS name, COUNT(DISTINCT uml."ModuleID") AS count FROM "TestSimulationModules" m
      INNER JOIN "UserModuleLinks" uml ON uml."ModuleID" = m."TestSimulationID" 
      INNER JOIN "ContentStructures" cs ON cs."ContentID" = m."ContentID" AND cs."IsDeleted" IS NOT TRUE
      AND CURRENT_DATE BETWEEN uml."StartDate" AND uml."DueDate" AND uml."UserID"=:UserID
      WHERE m."IsDeleted" IS NOT TRUE
      AND cs."ContentID" IN (SELECT "ContentID" FROM "SelectedContentIds" s WHERE s."ModuleTypeID" = cs."ModuleTypeID")
      UNION ALL
      SELECT 'trs' AS name, COUNT(DISTINCT uml."ModuleID") AS count FROM "TrainingSimulationModules" m
      INNER JOIN "UserModuleLinks" uml ON uml."ModuleID" = m."TrainingSimulationID" 
      INNER JOIN "ContentStructures" cs ON cs."ContentID" = m."ContentID" AND cs."IsDeleted" IS NOT TRUE
      AND CURRENT_DATE BETWEEN uml."StartDate" AND uml."DueDate" AND uml."UserID"=:UserID
      WHERE m."IsDeleted" IS NOT TRUE
      AND cs."ContentID" IN (SELECT "ContentID" FROM "SelectedContentIds" s WHERE s."ModuleTypeID" = cs."ModuleTypeID")
     `,
        {
          replacements: {
            UserID: currentUserId,
            OrganizationStructureID: lincense?.EnterpriseID,
          },
          type: sequelize.QueryTypes.SELECT,
        }
      ),
      //tes
      // TestSimulationModule.findAll({
      //   where: {
      //     ContentID: {
      //       [Op.in]: literal(
      //         `(SELECT "ContentID" FROM "ContentStructures" WHERE "OrganizationStructureID" = '${lincense.EnterpriseID}')`
      //       ),
      //     },
      //     TestSimulationStatus: "Published",
      //   },
      //   attributes: ["TestSimulationID", "TestSimulationName"],
      // }),
      //mcq
      // TestMcqsModule.findAll({
      //   where: {
      //     ContentID: {
      //       [Op.in]: literal(
      //         `(SELECT "ContentID" FROM "ContentStructures" WHERE "OrganizationStructureID" = '${lincense.EnterpriseID}')`
      //       ),
      //     },
      //     TestMCQStatus: "Published",
      //   },
      //   attributes: ["TestMCQID", "TestMCQName"],
      // }),
      //banner
      OrganizationAdvertisement.findAll({
        where: {
          OrganizationStructureID: lincense?.EnterpriseID,
          ExpireDate: {
            [Op.gte]: new Date().toISOString(),
          },
          IsDeleted: {
            [Op.not]: true,
          },
          IsActive: true,
        },
        attributes: {
          exclude: [
            "CreatedBy",
            "ModifiedBy",
            "CreatedDate",
            "ModifiedDate",
            "IsDeleted",
            "DeletedBy",
            "DeletedDate",
          ],
        },
      }),
      //flowAction
      // WorkflowActionable.findAll({
      //   where: {
      //     UserID: currentUserId,
      //     IsActive: true,
      //     ActionStatus: "ActionRequired",
      //   },
      //   attributes: [
      //     ["ActionURL", "ElementID"],
      //     ["FlowName", "ElementName"],
      //     ["EndDate", "DueDate"],
      //     [literal("'Workflow'"), "ModuleName"],
      //     ["FlowID", "ModuleTypeID"],
      //   ],
      // }),
      //flowAction
      // ModuleOwner.findAll({
      //   where: {
      //     UserID: currentUserId,
      //     IsActive: true,
      //     PendingApprovals: false,
      //     DocumentID: {
      //       [Op.not]: null,
      //     },
      //   },
      //   attributes: [
      //     ["DocumentID", "ElementID"],
      //     [
      //       literal(
      //         `(SELECT "DocumentName" FROM "DocumentModules" WHERE "DocumentID" = "ModuleOwner"."DocumentID" LIMIT 1)`
      //       ),
      //       "ElementName",
      //     ],
      //     [
      //       literal(
      //         `(SELECT ${dueDateCondition} FROM "DocumentModuleDrafts" WHERE "DocumentModuleDraftID" = "ModuleOwner"."DocumentModuleDraftID")`
      //       ),
      //       "DueDate",
      //     ],
      //     [literal("'Document'"), "ModuleName"],
      //     [
      //       literal(
      //         `(SELECT "ModuleTypeID" FROM "DocumentModules" WHERE "DocumentID" = "ModuleOwner"."DocumentID" LIMIT 1)`
      //       ),
      //       "ModuleTypeID",
      //     ],
      //   ],
      //   order: [["CreatedDate", "DESC"]],
      //   group: [
      //     "DocumentID",
      //     "ElementID",
      //     "ElementName",
      //     "DueDate",
      //     "ModuleName",
      //     "ModuleTypeID",
      //     "CreatedDate",
      //   ],
      // }),
    ]);

    // const flowActionData = JSON.parse(JSON.stringify(flowAction));
    // const taskResp = {};
    // for (const el of task) {
    //   taskResp[el.Key] = el.Value;
    // }
    // taskResp["TotalRequest"] =
    //   Number(taskResp["PendingElement"]) + Number(taskResp["CompleteElement"]);
    res.status(200).send({
      monthly: resp,
      // taskCount: taskResp,
      module: coutData,
      // license: {
      //   ValidityFrom: lincense.ValidityFrom,
      //   ValidityTo: lincense.ValidityTo,
      // },
      banner,
      // actionable: [...action, ...flowActionData, ...ownerAction].sort(
      //   (a, b) => new Date(a.DueDate) - new Date(b.DueDate)
      // ),
      // departmentOverview: {
      //   tes: { name: "tes", values: tes },
      //   mcq: { name: "mcq", values: mcq },
      // },
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.getProcessOwnerActionables = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const dueDateCondition = `case
    WHEN "EscalationType" = 'Minutes' THEN "CreatedDate"   + INTERVAL '1 minute' * "EscalationAfter"
    WHEN "EscalationType" = 'Hours' THEN "CreatedDate"   + INTERVAL '1 hour' * "EscalationAfter"
    when "EscalationType" = 'Days' THEN "CreatedDate" + interval '1 day' * "EscalationAfter"
    when "EscalationType" = 'Weeks' then "CreatedDate" + interval '1 week' * "EscalationAfter"
    when "EscalationType" = 'Months' THEN "CreatedDate" + interval '1 month' * "EscalationAfter"
    when "EscalationType" = 'Years' THEN "CreatedDate" + interval '1 year' * "EscalationAfter"
    else "CreatedDate"
  end`;
    const [action, flowAction, ownerAction] = await Promise.all([
      //action
      sequelize.query(
        `WITH ModuleData AS (
            SELECT
                mc."UserID",
                COALESCE(
                    mc."TrainingSimulationDraftID",
                    mc."TestSimulationDraftID",
                    mc."DocumentModuleDraftID",
                    mc."SOPDraftID",
                    mc."TestMCQDraftID"
                ) AS "ElementID",
                mm."ModuleName",
                mm."ModuleTypeID",
                CASE
                    WHEN mc."TrainingSimulationDraftID" IS NOT NULL THEN 'SkillBuilding'
                    WHEN mc."TestSimulationDraftID" IS NOT NULL THEN 'SkillAssessment'
                    WHEN mc."DocumentModuleDraftID" IS NOT NULL THEN 'Document'
                    WHEN mc."SOPDraftID" IS NOT NULL THEN 'SOP'
                    WHEN mc."TestMCQDraftID" IS NOT NULL THEN 'TestMCQ'
                END AS "ModuleType",
                'Checker' AS "ActionType"
            FROM "ModuleCheckers" mc
            INNER JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = mc."ModuleTypeID"
            WHERE mc."IsDeleted" IS NOT TRUE

            UNION ALL

            SELECT
                mc."UserID",
                mc."DocumentModuleDraftID",
                mm."ModuleName",
                mm."ModuleTypeID",
                'Document',
                'StakeHolder'
            FROM "ModuleStakeHolders" mc
            INNER JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = mc."ModuleTypeID"
            WHERE mc."IsDeleted" IS NOT TRUE

            UNION ALL

            SELECT
                mc."UserID",
                COALESCE(
                    mc."TrainingSimulationDraftID",
                    mc."TestSimulationDraftID",
                    mc."DocumentModuleDraftID",
                    mc."SOPDraftID",
                    mc."TestMCQDraftID"
                ),
                mm."ModuleName",
                mm."ModuleTypeID",
                CASE
                    WHEN mc."TrainingSimulationDraftID" IS NOT NULL THEN 'SkillBuilding'
                    WHEN mc."TestSimulationDraftID" IS NOT NULL THEN 'SkillAssessment'
                    WHEN mc."DocumentModuleDraftID" IS NOT NULL THEN 'Document'
                    WHEN mc."SOPDraftID" IS NOT NULL THEN 'SOP'
                    WHEN mc."TestMCQDraftID" IS NOT NULL THEN 'TestMCQ'
                END,
                'Escalator'
            FROM "ModuleEscalations" mc
            INNER JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = mc."ModuleTypeID"
            WHERE mc."IsDeleted" IS NOT TRUE
        ),
        ElementDetails AS (
            SELECT
                md."UserID",
                md."ElementID",
                md."ModuleName",
                md."ModuleTypeID",
                md."ActionType",
                md."ModuleType",
                CASE md."ModuleType"
                    WHEN 'SkillBuilding' THEN tsmd."TrainingSimulationName"
                    WHEN 'SkillAssessment' THEN tsmd2."TestSimulationName"
                    WHEN 'Document' THEN dmd."DocumentName"
                    WHEN 'SOP' THEN smd."SOPName"
                    WHEN 'TestMCQ' THEN tmcq."TestMCQName"
                END AS "ElementName",
                CASE md."ModuleType"
                    WHEN 'SkillBuilding' THEN tsmd."CreatedDate" + MAKE_INTERVAL(
                        mins => CASE WHEN tsmd."EscalationType" = 'Minutes' THEN tsmd."EscalationAfter" ELSE 0 END,
                        hours => CASE WHEN tsmd."EscalationType" = 'Hours' THEN tsmd."EscalationAfter" ELSE 0 END,
                        days => CASE WHEN tsmd."EscalationType" = 'Days' THEN tsmd."EscalationAfter" ELSE 0 END,
                        weeks => CASE WHEN tsmd."EscalationType" = 'Weeks' THEN tsmd."EscalationAfter" ELSE 0 END,
                        months => CASE WHEN tsmd."EscalationType" = 'Months' THEN tsmd."EscalationAfter" ELSE 0 END,
                        years => CASE WHEN tsmd."EscalationType" = 'Years' THEN tsmd."EscalationAfter" ELSE 0 END
                    )
                    WHEN 'SkillAssessment' THEN tsmd2."CreatedDate" + MAKE_INTERVAL(
                        mins => CASE WHEN tsmd2."EscalationType" = 'Minutes' THEN tsmd2."EscalationAfter" ELSE 0 END,
                        hours => CASE WHEN tsmd2."EscalationType" = 'Hours' THEN tsmd2."EscalationAfter" ELSE 0 END,
                        days => CASE WHEN tsmd2."EscalationType" = 'Days' THEN tsmd2."EscalationAfter" ELSE 0 END,
                        weeks => CASE WHEN tsmd2."EscalationType" = 'Weeks' THEN tsmd2."EscalationAfter" ELSE 0 END,
                        months => CASE WHEN tsmd2."EscalationType" = 'Months' THEN tsmd2."EscalationAfter" ELSE 0 END,
                        years => CASE WHEN tsmd2."EscalationType" = 'Years' THEN tsmd2."EscalationAfter" ELSE 0 END
                    )
                    WHEN 'Document' THEN dmd."CreatedDate" + MAKE_INTERVAL(
                        mins => CASE WHEN dmd."EscalationType" = 'Minutes' THEN dmd."EscalationAfter" ELSE 0 END,
                        hours => CASE WHEN dmd."EscalationType" = 'Hours' THEN dmd."EscalationAfter" ELSE 0 END,
                        days => CASE WHEN dmd."EscalationType" = 'Days' THEN dmd."EscalationAfter" ELSE 0 END,
                        weeks => CASE WHEN dmd."EscalationType" = 'Weeks' THEN dmd."EscalationAfter" ELSE 0 END,
                        months => CASE WHEN dmd."EscalationType" = 'Months' THEN dmd."EscalationAfter" ELSE 0 END,
                        years => CASE WHEN dmd."EscalationType" = 'Years' THEN dmd."EscalationAfter" ELSE 0 END
                    )
                    WHEN 'SOP' THEN smd."CreatedDate" + MAKE_INTERVAL(
                        mins => CASE WHEN smd."EscalationType" = 'Minutes' THEN smd."EscalationAfter" ELSE 0 END,
                        hours => CASE WHEN smd."EscalationType" = 'Hours' THEN smd."EscalationAfter" ELSE 0 END,
                        days => CASE WHEN smd."EscalationType" = 'Days' THEN smd."EscalationAfter" ELSE 0 END,
                        weeks => CASE WHEN smd."EscalationType" = 'Weeks' THEN smd."EscalationAfter" ELSE 0 END,
                        months => CASE WHEN smd."EscalationType" = 'Months' THEN smd."EscalationAfter" ELSE 0 END,
                        years => CASE WHEN smd."EscalationType" = 'Years' THEN smd."EscalationAfter" ELSE 0 END
                    )
                    WHEN 'TestMCQ' THEN tmcq."CreatedDate" + MAKE_INTERVAL(
                        mins => CASE WHEN tmcq."EscalationType" = 'Minutes' THEN tmcq."EscalationAfter" ELSE 0 END,
                        hours => CASE WHEN tmcq."EscalationType" = 'Hours' THEN tmcq."EscalationAfter" ELSE 0 END,
                        days => CASE WHEN tmcq."EscalationType" = 'Days' THEN tmcq."EscalationAfter" ELSE 0 END,
                        weeks => CASE WHEN tmcq."EscalationType" = 'Weeks' THEN tmcq."EscalationAfter" ELSE 0 END,
                        months => CASE WHEN tmcq."EscalationType" = 'Months' THEN tmcq."EscalationAfter" ELSE 0 END,
                        years => CASE WHEN tmcq."EscalationType" = 'Years' THEN tmcq."EscalationAfter" ELSE 0 END
                    )
                END AS "DueDate"
            FROM ModuleData md
            LEFT JOIN "TrainingSimulationModuleDrafts" tsmd 
                ON md."ModuleType" = 'SkillBuilding' AND tsmd."TrainingSimulationDraftID" = md."ElementID"
            LEFT JOIN "TestSimulationModuleDrafts" tsmd2 
                ON md."ModuleType" = 'SkillAssessment' AND tsmd2."TestSimulationDraftID" = md."ElementID"
            LEFT JOIN "DocumentModuleDrafts" dmd 
                ON md."ModuleType" = 'Document' AND dmd."DocumentModuleDraftID" = md."ElementID"
            LEFT JOIN "SopModuleDrafts" smd 
                ON md."ModuleType" = 'SOP' AND smd."SOPDraftID" = md."ElementID"
            LEFT JOIN "TestMcqsModuleDrafts" tmcq 
                ON md."ModuleType" = 'TestMCQ' AND tmcq."TestMCQDraftID" = md."ElementID"
        )
        SELECT
            ed."ElementID",
            ed."ElementName",
            ed."DueDate",
            ed."ActionType",
            ed."ModuleName",
            ed."ModuleTypeID"
        FROM ElementDetails ed
        WHERE ed."UserID" = :UserID
        AND (
            (ed."ActionType" IN ('Checker', 'StakeHolder') AND ed."DueDate" >= CURRENT_TIMESTAMP)
            OR (ed."ActionType" = 'Escalator' AND ed."DueDate" < CURRENT_TIMESTAMP)
        );`,
        {
          replacements: { UserID: currentUserId },
          type: sequelize.QueryTypes.SELECT,
        }
      ),

      //flowAction
      WorkflowActionable.findAll({
        where: {
          UserID: currentUserId,
          IsActive: true,
          ActionStatus: "ActionRequired",
        },
        attributes: [
          ["ActionURL", "ElementID"],
          ["FlowName", "ElementName"],
          ["EndDate", "DueDate"],
          [literal("'Workflow'"), "ModuleName"],
          ["FlowID", "ModuleTypeID"],
        ],
      }),
      ModuleOwner.findAll({
        where: {
          UserID: currentUserId,
          IsActive: true,
          IsDeleted: false,
          PendingApprovals: false,
          DocumentModuleDraftID: {
            [Op.not]: null,
          },
        },
        attributes: [
          ["DocumentModuleDraftID", "ElementID"],
          [
            literal(
              `(SELECT "DocumentName" FROM "DocumentModules" WHERE "DocumentID" = "ModuleOwner"."DocumentID" LIMIT 1)`
            ),
            "ElementName",
          ],
          [
            literal(
              `(SELECT ${dueDateCondition} FROM "DocumentModuleDrafts" WHERE "DocumentModuleDraftID" = "ModuleOwner"."DocumentModuleDraftID")`
            ),
            "DueDate",
          ],
          [literal("'Document'"), "ModuleName"],
          [
            literal(
              `(SELECT "ModuleTypeID" FROM "DocumentModules" WHERE "DocumentID" = "ModuleOwner"."DocumentID" LIMIT 1)`
            ),
            "ModuleTypeID",
          ],
        ],
        order: [["CreatedDate", "DESC"]],
        group: [
          "DocumentID",
          "ElementID",
          "ElementName",
          "DueDate",
          "ModuleName",
          "ModuleTypeID",
          "CreatedDate",
        ],
      }),
    ]);

    const flowActionData = JSON.parse(JSON.stringify(flowAction));

    res.status(200).send({
      actionable: [...action, ...flowActionData, ...ownerAction].sort(
        (a, b) => new Date(a.DueDate) - new Date(b.DueDate)
      ),
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.dashboardElementDetails = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const { DetailsType } = req.body;
    let data = [];
    if (DetailsType == "Expiry") {
      data = await sequelize.query(
        `
        select 
        sm."SOPID" as "ModuleID",sm."SOPName" as "ModuleName",sm."SOPExpiry" as "ExpiryDate",'sop' as "ModuleType",sm."ModuleTypeID"::uuid as "ModuleTypeId",sm."ContentID"::uuid as "ContentId"
        from "SopModules" sm 
        inner join "ContentStructures" cs on cs."ContentID" = sm."ContentID" 
        where sm."SOPExpiry" between current_date and current_date + interval '3 month'
        and sm."SOPStatus" = 'Published' and sm."SOPIsActive" = true and sm."IsDeleted" is not true
        and cs."OrganizationStructureID" = :OrganizationStructureID AND sm."CreatedBy" = :UserID
        union all
        select 
        dm."DocumentID" as "ModuleID",dm."DocumentName" as "ModuleName",dm."DocumentExpiry" as "ExpiryDate",'doc' as "ModuleType",dm."ModuleTypeID"::uuid as "ModuleTypeId",dm."ContentID"::uuid as "ContentId"
        from "DocumentModules" dm
        inner join "ContentStructures" cs on cs."ContentID" = dm."ContentID"
        where dm."DocumentExpiry" between current_date and current_date + interval '3 month'
        and dm."DocumentStatus" = 'Published' and dm."DocumentIsActive" = true and dm."IsDeleted" is not true
        and cs."OrganizationStructureID" = :OrganizationStructureID AND dm."CreatedBy" = :UserID
        union all
        select 
        tsm."TrainingSimulationID" as "ModuleID",tsm."TrainingSimulationName" as "ModuleName",tsm."TrainingSimulationExpiry" as "ExpiryDate",'trs' as "ModuleType",tsm."ModuleTypeID"::uuid as "ModuleTypeId",tsm."ContentID"::uuid as "ContentId"
        from "TrainingSimulationModules" tsm
        inner join "ContentStructures" cs on cs."ContentID" = tsm."ContentID"
        where tsm."TrainingSimulationExpiry" between current_date and current_date + interval '3 month'
        and tsm."TrainingSimulationStatus" = 'Published' and tsm."TrainingSimulationIsActive" = true and tsm."IsDeleted" is not true
        and cs."OrganizationStructureID" = :OrganizationStructureID AND tsm."CreatedBy" = :UserID
        union all
        select 
        tsm."TestSimulationID" as "ModuleID",tsm."TestSimulationName" as "ModuleName",tsm."TestSimulationExpiry" as "ExpiryDate",'tes' as "ModuleType",tsm."ModuleTypeID"::uuid as "ModuleTypeID",tsm."ContentID"::uuid as "ContentID"
        from "TestSimulationModules" tsm
        inner join "ContentStructures" cs on cs."ContentID" = tsm."ContentID"
        where tsm."TestSimulationExpiry" between current_date and current_date + interval '3 month'
        and tsm."TestSimulationStatus" = 'Published' and tsm."TestSimulationIsActive" = true and tsm."IsDeleted" is not true
        and cs."OrganizationStructureID" = :OrganizationStructureID AND tsm."CreatedBy" = :UserID
        union all
        select 
        tmm."TestMCQID" as "ModuleID",tmm."TestMCQName" as "ModuleName",tmm."TestMCQExpiry" as "ExpiryDate",'mcq' as "ModuleType",tmm."ModuleTypeID"::uuid as "ModuleTypeId",tmm."ContentID"::uuid as "ContentId"
        from "TestMcqsModules" tmm
        inner join "ContentStructures" cs on cs."ContentID" = tmm."ContentID"
        where tmm."TestMCQExpiry" between current_date and current_date + interval '3 month'
        and tmm."TestMCQStatus" = 'Published' and tmm."TestMCQIsActive" = true and tmm."IsDeleted" is not true
        and cs."OrganizationStructureID" = :OrganizationStructureID AND tmm."CreatedBy" = :UserID
        `,
        {
          type: sequelize.QueryTypes.SELECT,
          replacements: {
            OrganizationStructureID: lincense?.EnterpriseID,
            UserID: currentUserId,
          },
        }
      );
    } else if (DetailsType == "Unaccessed") {
      data = await sequelize.query(
        `
        select mm."ModuleType", mm."ModuleID",mm."ModuleName",mm."ModuleTypeId", mm."ContentId",max(uml."StartDate") as "StartDate",max(uml."DueDate") as "DueDate" from "UserModuleLinks" uml 
        left join (
        select 'sop' as "ModuleType", sm."SOPName" as "ModuleName",sm."SOPID" as "ModuleID",sm."ModuleTypeID"::uuid as "ModuleTypeId",sm."ContentID"::uuid as "ContentId" from "SopModules" sm 
        union all
        select 'doc' as "ModuleType", dm."DocumentName" as "ModuleName",dm."DocumentID" as "ModuleID",dm."ModuleTypeID"::uuid as "ModuleTypeId",dm."ContentID"::uuid as "ContentId" from "DocumentModules" dm
        union all  
        select 'trs' as "ModuleType", tsm."TrainingSimulationName" as "ModuleName",tsm."TrainingSimulationID" as "ModuleID",tsm."ModuleTypeID"::uuid as "ModuleTypeId",tsm."ContentID"::uuid as "ContentId" from "TrainingSimulationModules" tsm
        union all
        select 'tes' as "ModuleType", tsm."TestSimulationName" as "ModuleName",tsm."TestSimulationID" as "ModuleID",tsm."ModuleTypeID"::uuid as "ModuleTypeId",tsm."ContentID"::uuid as "ContentId" from "TestSimulationModules" tsm
        union all
        select 'mcq' as "ModuleType", tmm."TestMCQName" as "ModuleName",tmm."TestMCQID" as "ModuleID",tmm."ModuleTypeID"::uuid as "ModuleTypeId",tmm."ContentID"::uuid as "ContentId" from "TestMcqsModules" tmm
        union all 
        select 'frm' as "ModuleType", fm."FormName" as "ModuleName", fm."FormID" as "ModuleID",fm."ModuleTypeID"::uuid as "ModuleTypeId",fm."ContentID"::uuid as "ContentId" from "FormModules" fm 
        )  mm on mm."ModuleID" = uml."ModuleID"
        where uml."ModuleID" not in (
        select "ModuleID" from "UserModuleAccessLogs" where "UserID" = :UserID
        ) and uml."UserID" = :UserID
        group by mm."ModuleType", mm."ModuleID",mm."ModuleName",mm."ModuleTypeId", mm."ContentId"
        `,
        {
          type: sequelize.QueryTypes.SELECT,
          replacements: { UserID: currentUserId },
        }
      );
    } else if (DetailsType == "Rejected") {
      data = await sequelize.query(
        `
          select 'sop' as "ModuleType", smd."DraftVersion", smd."SOPDraftID" as "ModuleID",smd."SOPDraftID" as "ModuleDraftID",smd."SOPName" as "ModuleName", mc."ModifiedDate" as "RejectedDate" from "ModuleCheckers" mc 
          inner join "SopModuleDrafts" smd on smd."SOPDraftID" = mc."SOPDraftID" 
          where mc."ApprovalStatus" = 'Rejected' and mc."UserID" = :UserID
          union all
          select 'doc' as "ModuleType", dmd."DraftVersion", dmd."DocumentID" as "ModuleID",dmd."DocumentModuleDraftID" as "ModuleDraftID",dmd."DocumentName" as "ModuleName", mc."ModifiedDate" as "RejectedDate" from "ModuleCheckers" mc
          inner join "DocumentModuleDrafts" dmd on dmd."DocumentModuleDraftID" = mc."DocumentModuleDraftID"
          where mc."ApprovalStatus" = 'Rejected' and mc."UserID" = :UserID
          union all
          select 'trs' as "ModuleType", tsm."DraftVersion", tsm."TrainingSimulationDraftID" as "ModuleID",tsm."TrainingSimulationDraftID" as "ModuleDraftID",tsm."TrainingSimulationName" as "ModuleName", mc."ModifiedDate" as "RejectedDate" from "ModuleCheckers" mc
          inner join "TrainingSimulationModuleDrafts" tsm on tsm."TrainingSimulationDraftID" = mc."TrainingSimulationDraftID"
          where mc."ApprovalStatus" = 'Rejected' and mc."UserID" = :UserID
          union all
          select 'tes' as "ModuleType", tsm."DraftVersion", tsm."TestSimulationDraftID" as "ModuleID",tsm."TestSimulationDraftID" as "ModuleDraftID",tsm."TestSimulationName" as "ModuleName", mc."ModifiedDate" as "RejectedDate" from "ModuleCheckers" mc
          inner join "TestSimulationModuleDrafts" tsm on tsm."TestSimulationDraftID" = mc."TestSimulationDraftID"
          where mc."ApprovalStatus" = 'Rejected' and mc."UserID" = :UserID
          union all
          select 'mcq' as "ModuleType", tmm."DraftVersion", tmm."TestMCQDraftID" as "ModuleID",tmm."TestMCQDraftID" as "ModuleDraftID",tmm."TestMCQName" as "ModuleName", mc."ModifiedDate" as "RejectedDate" from "ModuleCheckers" mc
          inner join "TestMcqsModuleDrafts" tmm on tmm."TestMCQDraftID" = mc."TestMCQDraftID"
          where mc."ApprovalStatus" = 'Rejected' and mc."UserID" = :UserID
          union all
          select 'sop' as "ModuleType", smd."DraftVersion",smd."SOPDraftID" as "ModuleID",smd."SOPDraftID" as "ModuleDraftID",smd."SOPName" as "ModuleName", me."ModifiedDate" as "RejectedDate" from "ModuleEscalations" me 
          inner join "SopModuleDrafts" smd on smd."SOPDraftID" = me."SOPDraftID" 
          where me."ApprovalStatus" = 'Rejected' and me."UserID" = :UserID
          union all
          select 'doc' as "ModuleType", dmd."DraftVersion", dmd."DocumentID" as "ModuleID",dmd."DocumentModuleDraftID" as "ModuleDraftID",dmd."DocumentName" as "ModuleName", me."ModifiedDate" as "RejectedDate" from "ModuleEscalations" me
          inner join "DocumentModuleDrafts" dmd on dmd."DocumentModuleDraftID" = me."DocumentModuleDraftID"
          where me."ApprovalStatus" = 'Rejected' and me."UserID" = :UserID
          union all
          select 'trs' as "ModuleType", tsm."DraftVersion", tsm."TrainingSimulationDraftID" as "ModuleID",tsm."TrainingSimulationDraftID" as "ModuleDraftID",tsm."TrainingSimulationName" as "ModuleName", me."ModifiedDate" as "RejectedDate" from "ModuleEscalations" me
          inner join "TrainingSimulationModuleDrafts" tsm on tsm."TrainingSimulationDraftID" = me."TrainingSimulationDraftID"
          where me."ApprovalStatus" = 'Rejected' and me."UserID" = :UserID
          union all
          select 'tes' as "ModuleType", tsm."DraftVersion", tsm."TestSimulationDraftID" as "ModuleID",tsm."TestSimulationDraftID" as "ModuleDraftID",tsm."TestSimulationName" as "ModuleName", me."ModifiedDate" as "RejectedDate" from "ModuleEscalations" me
          inner join "TestSimulationModuleDrafts" tsm on tsm."TestSimulationDraftID" = me."TestSimulationDraftID"
          where me."ApprovalStatus" = 'Rejected' and me."UserID" = :UserID
          union all
          select 'mcq' as "ModuleType", tmm."DraftVersion", tmm."TestMCQDraftID" as "ModuleID",tmm."TestMCQDraftID" as "ModuleDraftID",tmm."TestMCQName" as "ModuleName", me."ModifiedDate" as "RejectedDate" from "ModuleEscalations" me
          inner join "TestMcqsModuleDrafts" tmm on tmm."TestMCQDraftID" = me."TestMCQDraftID"
          where me."ApprovalStatus" = 'Rejected' and me."UserID" = :UserID
          `,
        {
          replacements: { UserID: currentUserId },
          type: sequelize.QueryTypes.SELECT,
        }
      );
    } else {
      res.status(404).send({
        error:
          "Invalid DetailsType ! Details Type will be 'Expiry' or 'Rejected' or 'Unaccessed' ",
      });
      return;
    }
    res.status(200).send({ data });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.departmentOverview = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { TestMCQID, TestSimulationID, Limit = 10, Page = 1 } = req.body;
    if (TestMCQID && TestSimulationID) {
      res
        .status(400)
        .send({ error: "TestMCQID and TestSimulationID can't be together" });
      return;
    }
    if (!TestSimulationID && !TestMCQID) {
      res
        .status(400)
        .send({ error: "TestMCQID or TestSimulationID is required" });
      return;
    }
    let condition1 = "",
      condition2 = "";
    if (TestMCQID) {
      condition1 = `"Score"`;
      condition2 = `left join "UserAttempts" umal on umal."UserID" = u."UserID" and umal."ModuleID" =:ModuleID`;
    }
    if (TestSimulationID) {
      condition1 = `"TotalPercentage"`;
      condition2 = `left join "TestSimulationReports" umal on umal."UserID" = u."UserID" and umal."TestSimulationID" = :ModuleID`;
    }

    const data = await sequelize.query(
      `
 			      select "CreatedDate","DepartmentName",avg("Progress") as "Progress",jsonb_agg(jsonb_build_object('UserID',"UserID",'UserName',"UserName",
            'UserPhoto',"UserPhoto")) as "Users" from (select d."CreatedDate",d."DepartmentName",ud."UserID",concat(ud."UserFirstName",
            ' ',ud."UserMiddleName",' ', ud."UserLastName") as "UserName",ud."UserPhoto",
            AVG(COALESCE(umal.${condition1}, 0)) as "Progress" from "Departments" d 
            inner join "UserDeparmentLinks" udl on udl."DepartmentID" = d."DepartmentID" 
            inner join "Users" u on u."UserID" = udl."UserID" and u."UserType" = 'EndUser'
            inner join "UserDetails" ud on ud."UserID" = u."UserID" 
            left join "UserModuleLinks" uml on uml."ModuleID" = :ModuleID
            ${condition2}
            group by d."CreatedDate",d."DepartmentName",ud."UserID")
            Where "Progress" > 0
            group by "CreatedDate","DepartmentName" order by "Progress" desc
            limit ${Limit} offset ${Limit * (Page - 1)}
            `,
      {
        replacements: {
          ModuleID: TestSimulationID ? TestSimulationID : TestMCQID,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    res.status(200).send({ data: data });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.addQuestionAndAnswer = async (req, res) => {
  const { currentUserId } = req.payload;
  const transaction = await sequelize.transaction();
  try {
    const { TestMCQID, QuestionList } = req.body;
    for (const { QuestionHeading, QuestionText, AnswerList } of QuestionList) {
      if (AnswerList.length > 4) {
        await transaction.rollback();
        res.status(400).send({ message: "Options will not be more than 4" });
        return;
      }
      const { TestMCQName } = await TestMcqsModule.findByPk(
        TestMCQID,
        {
          attributes: ["TestMCQName"],
        },
        { transaction }
      );
      if (!TestMCQName) {
        await transaction.rollback();
        res.status(404).send({ message: "Invalid TestMCQID" });
        return;
      }
      const { QuestionID } = await QuestionRepository.create(
        {
          QuestionHeading: QuestionHeading
            ? QuestionHeading
            : TestMCQName.split(" ")[0],
          QuestionText,
          CreatedBy: currentUserId,
        },
        { transaction }
      );
      await QuestionAnswersLink.bulkCreate(
        AnswerList.map((item, index) => ({
          QuestionID,
          OptionText: item.OptionText,
          IsCorrect: item.IsCorrect,
          Ordering: index + 1,
          CreatedBy: currentUserId,
        })),
        { transaction }
      );

      await ModuleQuestionsLink.create(
        {
          TestMCQID,
          QuestionID,
          CreatedBy: currentUserId,
        },
        { transaction }
      );
    }

    await transaction.commit();
    res.status(201).send({ message: "MCQ Question Answer added Successfully" });
  } catch (error) {
    await transaction.rollback();
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.getQuestionAndAnswer = async (req, res) => {
  const { currentUserId } = req.payload;
  const { TestMCQID } = req.body;
  try {
    const questionLink = await ModuleQuestionsLink.findAll({
      where: { TestMCQID, IsDeleted: { [Op.not]: true } },
      attributes: ["QuestionID"],
    });
    const questionIds = questionLink.map((item) => item.QuestionID);
    const data = await QuestionRepository.findAll({
      where: {
        QuestionID: { [Op.in]: questionIds },
        IsDeleted: { [Op.not]: true },
      },
      include: {
        model: QuestionAnswersLink,
        as: "AnswerOptions",
        attributes: ["AnswerID", "OptionText", "IsCorrect", "Ordering"],
      },
      attributes: ["QuestionID", "QuestionHeading", "QuestionText"],
    });
    res.status(200).send({ data });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.updateQuestionAndAnswer = async (req, res) => {
  const { currentUserId } = req.payload;
  const transaction = await sequelize.transaction();
  try {
    const { TestMCQID, QuestionID, QuestionHeading, QuestionText, AnswerList } =
      req.body;

    if (AnswerList.filter((el) => !el.IsDeleted).length > 4) {
      await transaction.rollback();
      res.status(400).send({ message: "Options will not be more than 4" });
      return;
    }
    const { TestMCQName } = await TestMcqsModule.findByPk(
      TestMCQID,
      {
        attributes: ["TestMCQName"],
      },
      { transaction }
    );
    if (!TestMCQName) {
      await transaction.rollback();
      res.status(404).send({ message: "Invalid TestMCQID" });
      return;
    }
    await QuestionRepository.update({
      QuestionHeading: QuestionHeading
        ? QuestionHeading
        : TestMCQName.split(" ")[0],
      QuestionText,
      ModifiedBy: currentUserId,
      ModifiedDate: new Date().toDateString(),
    });
    for (const el of AnswerList) {
      if (el.AnswerID && !el.IsDeleted) {
        await QuestionAnswersLink.update(
          {
            OptionText: el.OptionText,
            IsCorrect: el.IsCorrect,
            Ordering: index + 1,
            ModifiedBy: currentUserId,
          },
          {
            where: { AnswerID: el.AnswerID },
          },
          { transaction }
        );
      } else if (el.AnswerID && el.IsDeleted) {
        await QuestionAnswersLink.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: new Date().toISOString(),
          },
          {
            where: { AnswerID: el.AnswerID },
          },
          { transaction }
        );
      } else {
        await QuestionAnswersLink.create(
          {
            QuestionID,
            OptionText: el.OptionText,
            IsCorrect: el.IsCorrect,
            Ordering: index + 1,
            CreatedBy: currentUserId,
          },
          { transaction }
        );
      }
    }
    await transaction.commit();
    res
      .status(200)
      .send({ message: "MCQ Question Answer updated Successfully" });
  } catch (error) {
    await transaction.rollback();
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.deleteQuestionAndAnswer = async (req, res) => {
  const { currentUserId } = req.payload;
  const { QuestionID } = req.body;
  try {
    await ModuleQuestionsLink.destroy({
      where: { QuestionID },
    });
    await QuestionRepository.update(
      {
        IsDeleted: true,
        DeletedBy: currentUserId,
        DeletedDate: new Date().toISOString(),
      },
      {
        where: { QuestionID },
      }
    );
    res
      .status(200)
      .send({ message: "MCQ Question Answer deleted Successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.addOrganizationLicence = async (req, res) => {
  const t = await sequelize.transaction();

  const { currentUserId } = req.payload;
  try {
    const {
      EnterpriseID,
      NumberOfEndUsers,
      PerpetualEndUser,
      NumberOfProcessOwnerUsers,
      PerpetualProcessOwner,
      NumberOfAuditorUsers,
      PerpetualAuditor,
      NumberOfAdminUsers,
      ValidityFrom,
      ModuleTypeIDs,
      ValidityTo,
      IsExtendedLicense = true,
    } = req.body;

    const {
      EnterpriseName,
      EnterpriseToken,
      MacInterFaces,
      HostName,
      MachineUUID,
      DriveSerialNumber,
      OSSerialNumber,
    } = await Enterprise.findByPk(EnterpriseID, {
      attributes: [
        "EnterpriseName",
        "EnterpriseToken",
        "MacInterFaces",
        "HostName",
        "MachineUUID",
        "DriveSerialNumber",
        "OSSerialNumber",
      ],
    });
    const { LicenseTypeID } = await LicenseType.findOne({
      where: {
        LicenseTypeName: "Administrator",
      },
    });
    const payload = {
      LicenseTypeID,
      LicenseName: "Administrator For " + EnterpriseName,
      NumberOfEndUsers,
      PerpetualEndUser,
      NumberOfProcessOwnerUsers,
      PerpetualProcessOwner,
      NumberOfAuditorUsers,
      PerpetualAuditor,
      NumberOfAdminUsers,
      EnterpriseID,
      ModuleTypeIDs,
      ValidityFrom,
      ValidityTo: new Date(
        new Date(ValidityTo).setHours(23, 59, 59)
      ).toISOString(),
      IsExtendedLicense,
      MacInterFaces,
      HostName,
      MachineUUID,
      DriveSerialNumber,
      OSSerialNumber,
    };
    const EncriptedLicenseKey = encryptedData(
      JSON.stringify({ ...payload, EnterpriseToken })
    );

    await Licenses.create(
      {
        LicenseKey: EncriptedLicenseKey,
        ...payload,
        CreatedBy: currentUserId,
      },
      {
        transaction: t,
      }
    );

    const documentModuleTypeID = "8db6ea3c-475d-47b7-8d4d-918de1889ef5";
    const sopModuleTypeID = "d7c8ebb4-ae45-4d40-ad0b-de574137b434";

    if (ModuleTypeIDs?.length > 0) {
      const entries = [];

      if (ModuleTypeIDs.includes(documentModuleTypeID)) {
        entries.push({
          ModuleTypeID: documentModuleTypeID,
          ParentContentID: null,
          ContentName: "Templates",
          ContentDescription: "Document Templates Folder",
          OrganizationStructureID: EnterpriseID,
          CreatedBy: currentUserId,
        });
      }

      if (ModuleTypeIDs.includes(sopModuleTypeID)) {
        entries.push({
          ModuleTypeID: sopModuleTypeID,
          ParentContentID: null,
          ContentName: "Templates",
          ContentDescription: "SOP Templates Folder",
          OrganizationStructureID: EnterpriseID,
          CreatedBy: currentUserId,
        });
      }

      if (entries.length > 0) {
        if (entries.length > 1) {
          await ContentStructure.bulkCreate(entries, {
            transaction: t,
          });
        } else {
          await ContentStructure.create(entries[0], {
            transaction: t,
          });
        }
      }
    }

    await t.commit();
    res.status(201).send({
      LicenseKey: EncriptedLicenseKey,
      message: "Organization and License added Successfully",
    });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.getLicenseOverviews = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const data = await sequelize.query(
      `
            SELECT
            SUM(
                CASE
                    WHEN uc."UserType" = 'Admin' THEN 1
                    ELSE 0
                END
            ) AS "AdminUserAdded",
            SUM(
                CASE
                    WHEN uc."UserType" = 'ProcessOwner' THEN 1
                    ELSE 0
                END
            ) AS "ProcessOwnerUserAdded",
            SUM(
                CASE
                    WHEN uc."UserType" = 'Auditor' THEN 1
                    ELSE 0
                END
            ) AS "AuditorUserAdded",
            SUM(
                CASE
                    WHEN uc."UserType" = 'EndUser' THEN 1
                    ELSE 0
                END
            ) AS "EndUserAdded"
        FROM
            (
                SELECT
                    u."UserID",
                    u."UserType",
                    uosl."OrganizationStructureID"
                FROM
                    "Users" AS u
                INNER JOIN "UserOrganizationStructureLinks" uosl ON uosl."UserID" = u."UserID"
                WHERE
                    uosl."OrganizationStructureID" = '${lincense?.EnterpriseID}'
                    AND u."IsDeleted" is not true
                GROUP BY
                    u."UserID",
                    u."UserType",
                    uosl."OrganizationStructureID"
            ) AS uc;
            `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const licenseHistory = await OrganizationStructureLicense.findAll({
      where: {
        OrganizationStructureID: lincense?.EnterpriseID,
      },
      attributes: ["LicenseKey", "CreatedDate"],
      order: [["CreatedDate", "ASC"]],
    });
    const history = [];
    for (const el of JSON.parse(JSON.stringify(licenseHistory))) {
      history.push({
        ...JSON.parse(decryptedData(el.LicenseKey)),
        CreatedDate: el.CreatedDate,
      });
    }
    const currentLicenses = history.filter(
      (license) =>
        new Date(license.ValidityTo).setHours(23, 59, 59) >=
          new Date().getTime() &&
        new Date(license.ValidityFrom).getTime() <= new Date().getTime()
    );
    const currenyLicense = currentLicenses.sort(
      (a, b) => new Date(b.CreatedDate) - new Date(a.CreatedDate)
    )[0];
    res.status(200).send({
      data: {
        ...JSON.parse(JSON.stringify(data[0])),
        LicenseName: currenyLicense?.LicenseName
          ? currenyLicense.LicenseName
          : "",
        NumberOfEndUsers: currenyLicense?.NumberOfEndUsers
          ? currenyLicense.NumberOfEndUsers
          : 0,
        PerpetualEndUser: currenyLicense?.PerpetualEndUser
          ? currenyLicense.PerpetualEndUser
          : false,
        NumberOfAuditorUsers: currenyLicense?.NumberOfAuditorUsers
          ? currenyLicense.NumberOfAuditorUsers
          : 0,
        PerpetualAuditor: currenyLicense?.PerpetualAuditor
          ? currenyLicense.PerpetualAuditor
          : false,
        NumberOfProcessOwnerUsers: currenyLicense?.NumberOfProcessOwnerUsers
          ? currenyLicense.NumberOfProcessOwnerUsers
          : 0,
        PerpetualProcessOwner: currenyLicense?.PerpetualProcessOwner
          ? currenyLicense.PerpetualProcessOwner
          : false,
        NumberOfAdminUsers: currenyLicense?.NumberOfAdminUsers
          ? currenyLicense.NumberOfAdminUsers
          : 0,
        ValidityTo: currenyLicense?.ValidityTo ? currenyLicense.ValidityTo : "",
      },
      licenseHistory: history,
    });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.applyKeyForLicense = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const { LicenseKey, OrganizationStructureToken } = req.body;
    if (!(OrganizationStructureToken && LicenseKey)) {
      res.status(400).send({
        error: "Both OrganizationStructureToken and LicenseKey is required",
      });
      return;
    }
    const decryptedLicenseKey = JSON.parse(decryptedData(LicenseKey));
    if (decryptedLicenseKey.EnterpriseToken !== OrganizationStructureToken) {
      res.status(400).send({ error: "Invalid License Key" });
      return;
    }
    // const interfaces = os.networkInterfaces();
    // let isMacInterfaceMatch = false;
    // for (const [key, value] of Object.entries(interfaces)) {
    //   for (const iface of value) {
    //     if (iface.mac && iface.mac !== '00:00:00:00:00:00') {
    //       if (iface.mac == decryptedLicenseKey.MacInterFaces[key]) {
    //         isMacInterfaceMatch = true;
    //       }
    //     }
    //   }
    // }
    // if (!isMacInterfaceMatch) {
    //   res.status(400).send({ error: "Invalid Server" });
    //   return;
    // }
    const count = await OrganizationStructureLicense.count({
      where: {
        LicenseKey,
        OrganizationStructureID: decryptedLicenseKey.EnterpriseID,
      },
    });
    if (count) {
      res.status(400).send({ error: "License Key is already applied" });
      return;
    }
    if (decryptedLicenseKey.IsExtendedLicense) {
      if (
        lincense.NumberOfAdminUsers > decryptedLicenseKey.NumberOfAdminUsers
      ) {
        res.status(400).send({ error: "Existing Users are out of limit" });
        return;
      }
      if (
        !decryptedLicenseKey.PerpetualProcessOwner &&
        decryptedLicenseKey.NumberOfProcessOwnerUsers <
          lincense.NumberOfProcessOwnerUsers
      ) {
        res.status(400).send({ error: "Existing Users are out of limit" });
        return;
      }
      if (
        !decryptedLicenseKey.PerpetualAuditor &&
        decryptedLicenseKey.NumberOfAuditorUsers < lincense.NumberOfAuditorUsers
      ) {
        res.status(400).send({ error: "Existing Users are out of limit" });
        return;
      }
      if (
        !decryptedLicenseKey.PerpetualEndUser &&
        decryptedLicenseKey.NumberOfEndUsers < lincense.NumberOfEndUsers
      ) {
        res.status(400).send({ error: "Existing Users are out of limit" });
        return;
      }
    }
    await OrganizationStructureLicense.create({
      LicenseKey,
      OrganizationStructureID: decryptedLicenseKey.EnterpriseID,
      CreatedBy: currentUserId,
    });
    res.status(200).send({
      licenseDetails: decryptedLicenseKey,
      message: "License Key Applied Successfully",
    });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.sendLicenseKeyToLinkedUser = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { LicenseKey, EnterpriseID } = req.body;
    let data = await OrganizationStructure.findByPk(EnterpriseID, {
      attributes: ["OrganizationStructureEmail", "OrganizationStructureToken"],
    });
    if (!data) {
      data = await SticherLincencesClients.findOne({
        where: { ClientID: EnterpriseID },
        attributes: ["Email", "UniqueKey"],
      });
    }
    await mailService({
      recipientEmail: data?.OrganizationStructureEmail || data?.Email,
      subject: "License Key",
      body: { text: "Your license key is :- " + LicenseKey },
    });
    await mailService({
      recipientEmail: data?.OrganizationStructureEmail || data?.Email,
      subject: "Enterprises Token",
      body: {
        text:
          "Your Enterprises Token is :- " + data?.OrganizationStructureToken ||
          data?.UniqueKey,
      },
    });
    res
      .status(200)
      .send({ message: "License Key and Token sent successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.adminDashboardDetails = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const chart = await sequelize.query(
      `
                select
                  SUM(case when "LatestCreatedDate" < NOW() - interval '2 hours' then 1 else 0 end) as "Online",
                  COUNT("UserID") as "Total"
                from
                  (
                  select
                    u."UserID",
                    max(ual."LoginDateTime") as "LatestCreatedDate"
                  from
                    "Users" u
                  inner join "UserUnitLinks" uosl on
                    uosl."UserID" = u."UserID"
                  inner join "OrganizationStructures" os on
                    os."OrganizationStructureID" = uosl."OrganizationStructureID"
                  inner join "OrganizationStructures" os1 on
                    os1."OrganizationStructureID" = os."ParentID"
                  left join "UserAuthenticationLogs" ual on
                    ual."UserID" = u."UserID"
                    where os1."ParentID"=:ParentID
                  group by
                    u."UserID")`,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: {
          ParentID: lincense?.EnterpriseID,
        },
      }
    );
    const { Online, Total } = chart[0];
    res.status(200).send({
      LiveSession: { Total, Online, Offline: Total - Online },
      lincense: {
        NumberOfEndUsers: lincense?.NumberOfEndUsers,
        PerpetualEndUser: lincense?.PerpetualEndUser,
        NumberOfProcessOwnerUsers: lincense?.NumberOfProcessOwnerUsers,
        PerpetualProcessOwner: lincense?.PerpetualProcessOwner,
        NumberOfAuditorUsers: lincense?.NumberOfAuditorUsers,
        PerpetualAuditor: lincense?.PerpetualAuditor,
        NumberOfAdminUsers: lincense?.NumberOfAdminUsers,
        ValidityFrom: lincense?.ValidityFrom,
        ValidityTo: lincense?.ValidityTo,
      },
    });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.getLicenseList = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const data = await sequelize.query(`
        select l."LicenseID" , l."LicenseName",l."LicenseTypeID" ,lt."LicenseTypeName", l."LicenseKey" ,
        l."NumberOfEndUsers" ,l."PerpetualEndUser" ,l."NumberOfProcessOwnerUsers" ,l."PerpetualProcessOwner" ,
        l."NumberOfAuditorUsers" ,l."PerpetualAuditor" ,
        l."NumberOfAdminUsers" ,l."ValidityFrom" ,l."ValidityTo" ,l."IsActive" ,os."EnterpriseID" ,
        os."EnterpriseName",os."EnterpriseEmail",os."EnterpriseToken",l."CreatedDate" from "Licenses" l 
        inner join "Enterprises" os on os."EnterpriseID" = l."EnterpriseID" 
        inner join "LicenseTypes" lt on lt."LicenseTypeID" = l."LicenseTypeID" 
        where l."IsDeleted" is not true
                `);
    res.status(200).send({
      data: data[0],
    });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.getTestAttemptReport = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { ModuleID, ModuleType, UserID } = req.body;
    if (ModuleType === "Skill Assessment") {
      const conditions = ModuleID
        ? `AND tsr."TestSimulationID" = '${ModuleID}'`
        : "";
      const data = await sequelize.query(
        `
                    select tsr."TestSimulationReportID",tsm."TestSimulationName",
                    ROW_NUMBER() OVER (ORDER BY tsm."TestSimulationID") AS "AttemptNumber",
                    tsr."CreatedDate" ,100 as "MaxScore",tsr."TotalPercentage" ,tsm."PassPercentage" 
                    from "TestSimulationReports" tsr 
                    inner join "TestSimulationModules" tsm on tsm."TestSimulationID" = tsr."TestSimulationID" 
                    where tsr."UserID" = '${
                      UserID ? UserID : currentUserId
                    }' ${conditions}
                `,
        {
          type: sequelize.QueryTypes.SELECT,
        }
      );
      const data2 = await SkillsClickEvent.findAll({
        where: { UserID: UserID ? UserID : currentUserId, SkillID: ModuleID },
      });

      const mergedData = data.map((item) => {
        const skillEvent = data2.find(
          (event) => event.SkillID === item.TestSimulationReportID
        );
        return {
          ...item,
          SkillClickCount: skillEvent ? skillEvent.ClickCount : 0,
        };
      });
      res.status(200).send({
        data: mergedData,
      });
    } else if (ModuleType === "MCQ") {
      let conditions = ModuleID ? `and tmm."TestMCQID" = '${ModuleID}'` : "";

      const data = await sequelize.query(
        `
            select ua."AttemptID", tmm."TestMCQName",tmm."TotalAttempts",ROW_NUMBER() OVER (ORDER BY tmm."TestMCQID") AS "AttemptNumber",
            ua."CreatedDate" ,100 as "MaxScore",ua."Score" ,tmm."PassPercentage",ua."IsFinished"
            from "UserAttempts" ua 
            inner join "TestMcqsModules" tmm on tmm."TestMCQID" = ua."ModuleID" 
            where ua."UserID"='${UserID ? UserID : currentUserId}' ${conditions}
            order by ua."CompletedOn" asc, tmm."CreatedDate" asc
        `,
        {
          type: sequelize.QueryTypes.SELECT,
        }
      );
      res.status(200).send({
        data: data,
      });
    } else {
      res.status(400).send({ error: "Invalid Module Type" });
    }
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.attemptDetails = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { AttemptID } = req.body;
    const data = await sequelize.query(`
            select qr."QuestionHeading",qr."QuestionText",qal."OptionText" as "AnswerText",qal."IsCorrect" from "UserAttemptDetails" uad 
            inner join "QuestionRepositories" qr on qr."QuestionID" = uad."QuestionID" 
            inner join "QuestionAnswersLinks" qal on qal."AnswerID"  = uad."AnswerID" 
            where uad."AttemptID" = '${AttemptID}'
            `);
    res.status(200).send({
      data: data[0],
    });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

// exports.testSimulationAccessList = async (req, res) => {
//     const { currentUserId } = req.payload;
//     try {
//         const { ModuleID, StartDate, EndDate } = req.body;
//         const data = await sequelize.query(`
//         SELECT
//             tmm."TestMCQName" AS "TestMCQName",
//             mm."ModuleName" AS "ModuleName",
//             tmmd."DraftVersion" AS "DraftVersion",
//             tmmd."MasterVersion" AS "MasterVersion",
//             umal."AccessedDate" AS "AccessedDate"
//         FROM
//             "UserModuleAccessLogs" umal
//         INNER JOIN "TestMcqsModules" tmm ON tmm."TestMCQID" = umal."ModuleID"
//         INNER JOIN "TestMcqsModuleDrafts" tmmd ON tmmd."TestMCQID" = tmm."TestMCQID"
//         INNER JOIN "ModuleMasters" mm ON mm."ModuleTypeID" = tmm."ModuleTypeID"
//         WHERE
//             umal."UserID" = '${currentUserId}' AND
//             umal."ModuleID" = '${ModuleID}' AND
//             umal."CreatedDate" >= '${StartDate}' AND
//             umal."CreatedDate" <= '${EndDate}';
//         `)
//         res.status(200).send({
//             data: data[0]
//         })
//     } catch (error) {
//         logger.error({ message: error.message, details: error, UserID: currentUserId })
//         res.status(400).send({ error: error.errors?.[0]?.message ? error.errors?.[0]?.message : error.message });
//     }
// }

exports.userAuthLog = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { UserID, StartDate, EndDate } = req.body;
    let coditions = "";
    if (StartDate) {
      coditions = ` and ual."LoginDateTime" >= '${StartDate}'`;
    }
    if (EndDate) {
      const edate = new Date(
        new Date(EndDate).setHours(23, 59, 59, 999)
      ).toISOString();
      coditions += ` and ual."LoginDateTime" <= '${edate}'`;
    }
    const data = await sequelize.query(`
           select ud."UserFirstName",ud."UserLastName",ud."UserMiddleName",d."DepartmentName",r."RoleName",
            ud."UserPhoto",ual."LoginDateTime",ual."LogoutDateTime" from "UserAuthenticationLogs" ual 
            right join "UserDetails" ud on ud."UserID" = ual."UserID" 
            right join "UserRoleLinks" url on url."UserID" = ual."UserID" 
            right join "Roles" r on r."RoleID" = url."RoleID" 
            right join "UserDeparmentLinks" udl on udl."UserID" = ual."UserID" 
            right join "Departments" d on d."DepartmentID" =udl."DepartmentID" 
            where ual."UserID" = '${UserID}' ${coditions}
            `);

    res.status(200).send({ data: data[0] });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.elementPublishLog = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { ModuleID, StartDate, EndDate } = req.body;
    let condition = "";
    if (StartDate && StartDate) {
      const edate = new Date(
        new Date(EndDate).setHours(23, 59, 59, 999)
      ).toISOString();
      condition = `where  "PublishDate" >= '${StartDate}' and "PublishDate" <= '${edate}'`;
    } else if (EndDate) {
      const edate = new Date(
        new Date(EndDate).setHours(23, 59, 59, 999)
      ).toISOString();
      condition = `where  "PublishDate" >= '${edate}'`;
    } else if (StartDate) {
      condition = `where  "PublishDate" <= '${StartDate}'`;
    }
    const data = await sequelize.query(`
       select * from (select smd."SOPName" as "ElementName", mm."ModuleName",smd."DraftVersion",smd."MasterVersion",
        case
            when smd."SelfApproved" is true then smd."CreatedDate" else smd."ModifiedDate"
        end as "PublishDate" from "SopModuleDrafts" smd
        inner join "ModuleMasters" mm on mm."ModuleTypeID"  = smd."ModuleTypeID"
        where smd."SOPID" = '${ModuleID}') ${condition}
        union all
        select * from (select smd."DocumentName" as "ElementName", mm."ModuleName",smd."DraftVersion",smd."MasterVersion",    
        case
            when smd."SelfApproved" is true then smd."CreatedDate" else smd."ModifiedDate"
        end as "PublishDate" from "DocumentModuleDrafts" smd
        inner join "ModuleMasters" mm on mm."ModuleTypeID"  = smd."ModuleTypeID"
        where smd."DocumentID" = '${ModuleID}' ) ${condition}
        union all
        select * from (select smd."TrainingSimulationName" as "ElementName", mm."ModuleName",smd."DraftVersion",smd."MasterVersion",
        case
            when smd."SelfApproved" is true then smd."CreatedDate" else smd."ModifiedDate"
        end as "PublishDate" from "TrainingSimulationModuleDrafts" smd
        inner join "ModuleMasters" mm on mm."ModuleTypeID"  = smd."ModuleTypeID"
        where smd."TrainingSimulationID" = '${ModuleID}' ) ${condition}
        union all
        select * from (select smd."TestSimulationName" as "ElementName", mm."ModuleName",smd."DraftVersion",smd."MasterVersion",
        case
            when smd."SelfApproved" is true then smd."CreatedDate" else smd."ModifiedDate"
        end as "PublishDate" from "TestSimulationModuleDrafts" smd
        inner join "ModuleMasters" mm on mm."ModuleTypeID"  = smd."ModuleTypeID"
        where smd."TestSimulationID" = '${ModuleID}' ) ${condition}
        union all
        select * from (select smd."TestMCQName" as "ElementName", mm."ModuleName",smd."DraftVersion",smd."MasterVersion",     
        case
            when smd."SelfApproved" is true then smd."CreatedDate" else smd."ModifiedDate"
        end as "PublishDate" from "TestMcqsModuleDrafts" smd
        inner join "ModuleMasters" mm on mm."ModuleTypeID"  = smd."ModuleTypeID"
        where smd."TestMCQID" = '${ModuleID}' ) ${condition}
        `);
    res.status(200).send({ data: data[0] });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.elementAccessLogReport = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { ModuleTypeID, StartDate, EndDate } = req.body;
    let condition = `AND umal."UserID"='${currentUserId}' `;
    if (StartDate && StartDate) {
      const edate = new Date(
        new Date(EndDate).setHours(23, 59, 59, 999)
      ).toISOString();
      condition += `AND umal."AccessedDate" >= '${StartDate}' and umal."AccessedDate" <= '${edate}'`;
    } else if (EndDate) {
      const edate = new Date(
        new Date(EndDate).setHours(23, 59, 59, 999)
      ).toISOString();
      condition += `AND umal."AccessedDate" >= '${edate}'`;
    } else if (StartDate) {
      condition += `AND umal."AccessedDate" <= '${StartDate}'`;
    }
    const data = await sequelize.query(`
           (select sm."SOPName" AS "ElementName", mm."ModuleName" AS "ElementType", 
            umal."AccessedDate",
            umal."MasterVersion" AS "ElementVersion",
            (select uu."IsAncknowledged" from "UserModuleAccessLogs" uu 
            where uu."ModuleID" = umal."ModuleID" 
            and uu."MasterVersion" = umal."MasterVersion" 
            and uu."IsAncknowledged" is true
            and uu."AccessedDate"<=umal."AccessedDate"
            and uu."UserID" = umal."UserID" limit 1) as "IsAncknowledged",
            (select uu."AccessedDate" from "UserModuleAccessLogs" uu 
            where uu."ModuleID" = umal."ModuleID" 
            and uu."MasterVersion" = umal."MasterVersion" 
            and uu."IsAncknowledged" is true
            and uu."AccessedDate"<=umal."AccessedDate"
            and uu."UserID" = umal."UserID" limit 1) as "AncknowledgedDate"
            from "UserModuleAccessLogs" umal
            INNER JOIN "SopModules" sm on sm."SOPID" = umal."ModuleID"
            INNER JOIN "ModuleMasters" mm on mm."ModuleTypeID" = sm."ModuleTypeID"
            where sm."ModuleTypeID" = '${ModuleTypeID}' ${condition}
            ORDER BY umal."AccessedDate" DESC)
            UNION ALL
           (select sm."DocumentName" AS "ElementName", mm."ModuleName" AS "ElementType", 
            umal."AccessedDate", umal."MasterVersion" AS "ElementVersion",
            (select uu."IsAncknowledged" from "UserModuleAccessLogs" uu 
            where uu."ModuleID" = umal."ModuleID" 
            and uu."MasterVersion" = umal."MasterVersion" 
            and uu."IsAncknowledged" is true
            and uu."AccessedDate"<=umal."AccessedDate"
            and uu."UserID" = umal."UserID" limit 1) as "IsAncknowledged",
            (select uu."AccessedDate" from "UserModuleAccessLogs" uu 
            where uu."ModuleID" = umal."ModuleID" 
            and uu."MasterVersion" = umal."MasterVersion" 
            and uu."IsAncknowledged" is true
            and uu."AccessedDate"<=umal."AccessedDate"
            and uu."UserID" = umal."UserID" limit 1) as "AncknowledgedDate"
            from "UserModuleAccessLogs" umal
            INNER JOIN "DocumentModules" sm on sm."DocumentID" = umal."ModuleID"
            INNER JOIN "ModuleMasters" mm on mm."ModuleTypeID" = sm."ModuleTypeID"
            where sm."ModuleTypeID" = '${ModuleTypeID}' ${condition}
            ORDER BY umal."AccessedDate" DESC)
            UNION ALL
            (select sm."TrainingSimulationName" AS "ElementName", mm."ModuleName" AS "ElementType", 
            umal."AccessedDate",
            (SELECT "MasterVersion" FROM (SELECT CASE
            WHEN smd."SelfApproved" IS TRUE AND smd."TrainingSimulationStatus" = 'Published' THEN smd."CreatedDate"       
            WHEN smd."SelfApproved" IS FALSE AND smd."TrainingSimulationStatus" = 'Published' THEN smd."ModifiedDate"     
            ELSE NULL
            END AS "PublishDate",smd."MasterVersion" FROM "TrainingSimulationModuleDrafts" smd 
            WHERE smd."TrainingSimulationID" = sm."TrainingSimulationID")
            WHERE "PublishDate" < umal."AccessedDate"
            ORDER BY "PublishDate" DESC LIMIT 1) AS "ElementVersion",
            null as "IsAncknowledged",null as "AncknowledgedDate"
            from "UserModuleAccessLogs" umal
            INNER JOIN "TrainingSimulationModules" sm on sm."TrainingSimulationID" = umal."ModuleID"
            INNER JOIN "ModuleMasters" mm on mm."ModuleTypeID" = sm."ModuleTypeID"
            where sm."ModuleTypeID" = '${ModuleTypeID}' ${condition}
            ORDER BY umal."AccessedDate" DESC)
            UNION ALL
            (select sm."TestSimulationName" AS "ElementName", mm."ModuleName" AS "ElementType", 
            umal."AccessedDate",
            (SELECT "MasterVersion" FROM (SELECT CASE
            WHEN smd."SelfApproved" IS TRUE AND smd."TestSimulationStatus" = 'Published' THEN smd."CreatedDate"       
            WHEN smd."SelfApproved" IS FALSE AND smd."TestSimulationStatus" = 'Published' THEN smd."ModifiedDate"     
            ELSE NULL
            END AS "PublishDate",smd."MasterVersion" FROM "TestSimulationModuleDrafts" smd 
            WHERE smd."TestSimulationID" = sm."TestSimulationID")
            WHERE "PublishDate" < umal."AccessedDate"
            ORDER BY "PublishDate" DESC LIMIT 1) AS "ElementVersion",
            null as "IsAncknowledged",null as "AncknowledgedDate"
            from "UserModuleAccessLogs" umal
            INNER JOIN "TestSimulationModules" sm on sm."TestSimulationID" = umal."ModuleID"
            INNER JOIN "ModuleMasters" mm on mm."ModuleTypeID" = sm."ModuleTypeID"
            where sm."ModuleTypeID" = '${ModuleTypeID}' ${condition}
            ORDER BY umal."AccessedDate" DESC)
            UNION ALL
            (select sm."TestMCQName" AS "ElementName", mm."ModuleName" AS "ElementType", 
            umal."AccessedDate",
            (SELECT "MasterVersion" FROM (SELECT CASE
            WHEN smd."SelfApproved" IS TRUE AND smd."TestMCQStatus" = 'Published' THEN smd."CreatedDate"       
            WHEN smd."SelfApproved" IS FALSE AND smd."TestMCQStatus" = 'Published' THEN smd."ModifiedDate"     
            ELSE NULL
            END AS "PublishDate",smd."MasterVersion" FROM "TestMcqsModuleDrafts" smd 
            WHERE smd."TestMCQID" = sm."TestMCQID")
            WHERE "PublishDate" < umal."AccessedDate"
            ORDER BY "PublishDate" DESC LIMIT 1) AS "ElementVersion",
            null as "IsAncknowledged",null as "AncknowledgedDate"
            from "UserModuleAccessLogs" umal
            INNER JOIN "TestMcqsModules" sm on sm."TestMCQID" = umal."ModuleID"
            INNER JOIN "ModuleMasters" mm on mm."ModuleTypeID" = sm."ModuleTypeID"
            where sm."ModuleTypeID" = '${ModuleTypeID}' ${condition}
            ORDER BY umal."AccessedDate" DESC)
            `);
    res.status(200).send({ data: data[0] });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.elementAccessLogReportAll = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { ModuleID, UserID, StartDate, EndDate } = req.body;
    let condition = `WHERE umal."UserID"='${UserID ? UserID : currentUserId}' `;

    if (ModuleID) {
      condition += `AND umal."ModuleID" = '${ModuleID}'`;
    }
    if (EndDate) {
      const edate = new Date(
        new Date(EndDate).setHours(23, 59, 59, 999)
      ).toISOString();
      condition += `AND umal."AccessedDate" <= '${edate}'`;
    }
    if (StartDate) {
      condition += `AND umal."AccessedDate" >= '${StartDate}'`;
    }
    const data = await sequelize.query(`
            (select sm."SOPName" AS "ElementName", mm."ModuleName" AS "ElementType", 
            umal."AccessedDate",ud."UserFirstName",ud."UserMiddleName",ud."UserLastName",ud."UserPhoto",
            uml."DueDate",umal."MasterVersion" AS "ElementVersion",
            (select uu."IsAncknowledged" from "UserModuleAccessLogs" uu 
            where uu."ModuleID" = umal."ModuleID" 
            and uu."MasterVersion" = umal."MasterVersion" 
            and uu."IsAncknowledged" is true
            and uu."AccessedDate"<=umal."AccessedDate"
            and uu."UserID" = umal."UserID" limit 1) as "IsAncknowledged",
            (select uu."AccessedDate" from "UserModuleAccessLogs" uu 
            where uu."ModuleID" = umal."ModuleID" 
            and uu."MasterVersion" = umal."MasterVersion" 
            and uu."IsAncknowledged" is true
            and uu."AccessedDate"<=umal."AccessedDate"
            and uu."UserID" = umal."UserID" limit 1) as "AncknowledgedDate"
            from "UserModuleAccessLogs" umal
            INNER JOIN "SopModules" sm on sm."SOPID" = umal."ModuleID"
            INNER JOIN "ModuleMasters" mm on mm."ModuleTypeID" = sm."ModuleTypeID"
            inner join "UserDetails" ud on ud."UserID" = umal."UserID"
            inner JOIN "UserModuleLinks" uml on uml."UserID" = umal."UserID" and uml."ModuleID" = umal."ModuleID"
            ${condition}
            GROUP BY umal."AccessedDate",ud."UserFirstName",ud."UserMiddleName",ud."UserLastName",ud."UserPhoto",
            uml."DueDate",mm."ModuleName",sm."SOPName","ElementVersion",umal."ModuleID",umal."UserID"
			      ORDER BY umal."AccessedDate" DESC)
            UNION ALL
           (select sm."DocumentName" AS "ElementName", mm."ModuleName" AS "ElementType", 
            umal."AccessedDate",ud."UserFirstName",ud."UserMiddleName",ud."UserLastName",ud."UserPhoto",
            uml."DueDate",umal."MasterVersion" AS "ElementVersion",
            (select uu."IsAncknowledged" from "UserModuleAccessLogs" uu 
            where uu."ModuleID" = umal."ModuleID" 
            and uu."MasterVersion" = umal."MasterVersion" 
            and uu."IsAncknowledged" is true
            and uu."AccessedDate"<=umal."AccessedDate"
            and uu."UserID" = umal."UserID" limit 1) as "IsAncknowledged",
            (select uu."AccessedDate" from "UserModuleAccessLogs" uu 
            where uu."ModuleID" = umal."ModuleID" 
            and uu."MasterVersion" = umal."MasterVersion" 
            and uu."IsAncknowledged" is true
            and uu."AccessedDate"<=umal."AccessedDate"
            and uu."UserID" = umal."UserID" limit 1) as "AncknowledgedDate"
            from "UserModuleAccessLogs" umal
            INNER JOIN "DocumentModules" sm on sm."DocumentID" = umal."ModuleID"
            INNER JOIN "ModuleMasters" mm on mm."ModuleTypeID" = sm."ModuleTypeID"
            inner join "UserDetails" ud on ud."UserID" = umal."UserID"
            inner JOIN "UserModuleLinks" uml on uml."UserID" = umal."UserID" and uml."ModuleID" = umal."ModuleID"
            ${condition}
            GROUP BY umal."AccessedDate",ud."UserFirstName",ud."UserMiddleName",ud."UserLastName",ud."UserPhoto",
            uml."DueDate",mm."ModuleName",sm."DocumentName","ElementVersion",umal."ModuleID",umal."UserID"
			      ORDER BY umal."AccessedDate" DESC)
            UNION ALL
            (select sm."TrainingSimulationName" AS "ElementName", mm."ModuleName" AS "ElementType", 
            umal."AccessedDate",ud."UserFirstName",ud."UserMiddleName",ud."UserLastName",ud."UserPhoto",
            uml."DueDate",
            (SELECT "MasterVersion" FROM (SELECT CASE
            WHEN smd."SelfApproved" IS TRUE AND smd."TrainingSimulationStatus" = 'Published' THEN smd."CreatedDate"       
            WHEN smd."SelfApproved" IS FALSE AND smd."TrainingSimulationStatus" = 'Published' THEN smd."ModifiedDate"     
            ELSE NULL
            END AS "PublishDate",smd."MasterVersion" FROM "TrainingSimulationModuleDrafts" smd 
            WHERE smd."TrainingSimulationID" = sm."TrainingSimulationID")
            WHERE "PublishDate" < umal."AccessedDate"
            ORDER BY "PublishDate" DESC LIMIT 1) AS "ElementVersion",
            null as "IsAncknowledged",null as "AncknowledgedDate"
            from "UserModuleAccessLogs" umal
            INNER JOIN "TrainingSimulationModules" sm on sm."TrainingSimulationID" = umal."ModuleID"
            INNER JOIN "ModuleMasters" mm on mm."ModuleTypeID" = sm."ModuleTypeID"
            inner join "UserDetails" ud on ud."UserID" = umal."UserID"
            inner JOIN "UserModuleLinks" uml on uml."UserID" = umal."UserID" and uml."ModuleID" = umal."ModuleID"
            ${condition}
            GROUP BY umal."AccessedDate",ud."UserFirstName",ud."UserMiddleName",ud."UserLastName",ud."UserPhoto",
            uml."DueDate",mm."ModuleName",sm."TrainingSimulationName","ElementVersion"
			      ORDER BY umal."AccessedDate" DESC)
            UNION ALL
            (select sm."TestSimulationName" AS "ElementName", mm."ModuleName" AS "ElementType", 
            umal."AccessedDate",ud."UserFirstName",ud."UserMiddleName",ud."UserLastName",ud."UserPhoto",
            uml."DueDate",
            (SELECT "MasterVersion" FROM (SELECT CASE
            WHEN smd."SelfApproved" IS TRUE AND smd."TestSimulationStatus" = 'Published' THEN smd."CreatedDate"       
            WHEN smd."SelfApproved" IS FALSE AND smd."TestSimulationStatus" = 'Published' THEN smd."ModifiedDate"     
            ELSE NULL
            END AS "PublishDate",smd."MasterVersion" FROM "TestSimulationModuleDrafts" smd 
            WHERE smd."TestSimulationID" = sm."TestSimulationID")
            WHERE "PublishDate" < umal."AccessedDate"
            ORDER BY "PublishDate" DESC LIMIT 1) AS "ElementVersion",
            null as "IsAncknowledged",null as "AncknowledgedDate"
            from "UserModuleAccessLogs" umal
            INNER JOIN "TestSimulationModules" sm on sm."TestSimulationID" = umal."ModuleID"
            INNER JOIN "ModuleMasters" mm on mm."ModuleTypeID" = sm."ModuleTypeID"
            inner join "UserDetails" ud on ud."UserID" = umal."UserID"
            inner JOIN "UserModuleLinks" uml on uml."UserID" = umal."UserID" and uml."ModuleID" = umal."ModuleID"
            ${condition}
            GROUP BY umal."AccessedDate",ud."UserFirstName",ud."UserMiddleName",ud."UserLastName",ud."UserPhoto",
            uml."DueDate",mm."ModuleName",sm."TestSimulationName","ElementVersion"
			      ORDER BY umal."AccessedDate" DESC)
            UNION ALL
            (select sm."TestMCQName" AS "ElementName", mm."ModuleName" AS "ElementType", 
            umal."AccessedDate",ud."UserFirstName",ud."UserMiddleName",ud."UserLastName",ud."UserPhoto",
            uml."DueDate",
            (SELECT "MasterVersion" FROM (SELECT CASE
            WHEN smd."SelfApproved" IS TRUE AND smd."TestMCQStatus" = 'Published' THEN smd."CreatedDate"       
            WHEN smd."SelfApproved" IS FALSE AND smd."TestMCQStatus" = 'Published' THEN smd."ModifiedDate"     
            ELSE NULL
            END AS "PublishDate",smd."MasterVersion" FROM "TestMcqsModuleDrafts" smd 
            WHERE smd."TestMCQID" = sm."TestMCQID")
            WHERE "PublishDate" < umal."AccessedDate"
            ORDER BY "PublishDate" DESC LIMIT 1) AS "ElementVersion",
            null as "IsAncknowledged",null as "AncknowledgedDate"
            from "UserModuleAccessLogs" umal
            INNER JOIN "TestMcqsModules" sm on sm."TestMCQID" = umal."ModuleID"
            INNER JOIN "ModuleMasters" mm on mm."ModuleTypeID" = sm."ModuleTypeID"
            inner join "UserDetails" ud on ud."UserID" = umal."UserID"
            inner JOIN "UserModuleLinks" uml on uml."UserID" = umal."UserID" and uml."ModuleID" = umal."ModuleID"
            ${condition}
            GROUP BY umal."AccessedDate",ud."UserFirstName",ud."UserMiddleName",ud."UserLastName",ud."UserPhoto",
            uml."DueDate",mm."ModuleName",sm."TestMCQName","ElementVersion"
			      ORDER BY umal."AccessedDate" DESC)
            `);
    res.status(200).send({ data: data[0] });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.elementActivityTransition = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { ModuleID, StartDate = null, EndDate = null } = req.body;
    let codition = "";
    if (StartDate) {
      codition += `AND smd."CreatedDate" > '${new Date(
        StartDate
      ).toISOString()}' `;
    }
    if (EndDate) {
      const edate = new Date(
        new Date(EndDate).setHours(23, 59, 59, 999)
      ).toISOString();
      codition += `AND smd."CreatedDate" < '${edate}'`;
    }
    const TransitionDays = `
            case
                when smd."EscalationType" = 'Minutes' then smd."EscalationAfter" / 1440 
                when smd."EscalationType" = 'Hours' then smd."EscalationAfter" / 24  
                when smd."EscalationType" = 'Days' then smd."EscalationAfter"
                when smd."EscalationType" = 'Weeks' then smd."EscalationAfter" * 7
                when smd."EscalationType" = 'Months' then smd."EscalationAfter" * 30
                when smd."EscalationType" = 'Years' then smd."EscalationAfter" * 365
            end`;
    const data = await sequelize.query(
      `
            (select
            smd."SOPName" as "ElementName",
            smd."DraftVersion",
            smd."MasterVersion",
            mm."ModuleName",
            case
                when smd."SOPStatus" = 'InProgress'
                and mc."ApprovalStatus" is not null then mc."ApprovalStatus"
                when smd."SOPStatus" = 'InProgress'
                and me."ApprovalStatus" is not null then me."ApprovalStatus"
                else null
            end as "ElementStatus",
            ${TransitionDays} as "TransitionDays",
            CONCAT(atud."UserFirstName" ,
            ' ' ,
            atud."UserLastName" ,
            ' ' ,
            atud."UserMiddleName") as "AssignToUserName",
            atud."UserPhoto" as "AssignToUserPhoto",
            CONCAT(etud."UserFirstName" ,
            ' ' ,
            etud."UserLastName" ,
            ' ' ,
            etud."UserMiddleName") as "EscalateToUserName",
            etud."UserPhoto" as "EscalateToUserPhoto",
                case
                when smd."SOPStatus" = 'InProgress'
                and mc."ApprovalStatus" is not null then 'CheckerUser'
                when smd."SOPStatus" = 'InProgress'
                and me."ApprovalStatus" is not null then 'EscalateUser'
                else null
            end as "ActionByUser",
            smd."SelfApproved",
            case
                when smd."SelfApproved" is true then smd."CreatedDate"
                when smd."SOPStatus" = 'InProgress'
                and mc."ApprovalStatus" is not null then mc."ModifiedDate"
                when smd."SOPStatus" = 'InProgress'
                and me."ApprovalStatus" is not null then me."ModifiedDate"
                else null
            end as "ActionDate",
                case
                when smd."SOPStatus" = 'InProgress'
                and mc."ApprovalStatus" is not null then mc."Comment"
                when smd."SOPStatus" = 'InProgress'
                and me."ApprovalStatus" is not null then me."Comment"
                else ''
            end as "ActionUserComment"
        from
            "SopModuleDrafts" smd
        inner join "ModuleMasters" mm on
            mm."ModuleTypeID" = smd."ModuleTypeID"
        inner join "ModuleCheckers" mc on
            mc."SOPDraftID" = smd."SOPDraftID"
        inner join "ModuleEscalations" me on
            me."SOPDraftID" = smd."SOPDraftID"
        inner join "UserDetails" atud on
            atud."UserID" = mc."UserID"
        inner join "UserDetails" etud on
            etud."UserID" = me."UserID"
        where
            smd."IsDeleted" is not true and smd."SOPID" = :ModuleID ${codition})
        union all
        (select
        smd."DocumentName" as "ElementName",
        smd."DraftVersion",
        smd."MasterVersion",
        mm."ModuleName",
        case
            when smd."DocumentStatus" = 'InProgress'
            and mc."ApprovalStatus" is not null then mc."ApprovalStatus"
            when smd."DocumentStatus" = 'InProgress'
            and me."ApprovalStatus" is not null then me."ApprovalStatus"
            else null
        end as "ElementStatus",
        ${TransitionDays} as "TransitionDays",
        CONCAT(atud."UserFirstName" ,
        ' ' ,
        atud."UserLastName" ,
        ' ' ,
        atud."UserMiddleName") as "AssignToUserName",
        atud."UserPhoto" as "AssignToUserPhoto",
        CONCAT(etud."UserFirstName" ,
        ' ' ,
        etud."UserLastName" ,
        ' ' ,
        etud."UserMiddleName") as "EscalateToUserName",
        etud."UserPhoto" as "EscalateToUserPhoto",
            case
            when smd."DocumentStatus" = 'InProgress'
            and mc."ApprovalStatus" is not null then 'CheckerUser'
            when smd."DocumentStatus" = 'InProgress'
            and me."ApprovalStatus" is not null then 'EscalateUser'
            else null
        end as "ActionByUser",
        smd."SelfApproved",
        case
            when smd."SelfApproved" is true then smd."CreatedDate"
            when smd."DocumentStatus" = 'InProgress'
            and mc."ApprovalStatus" is not null then mc."ModifiedDate"
            when smd."DocumentStatus" = 'InProgress'
            and me."ApprovalStatus" is not null then me."ModifiedDate"
            else null
        end as "ActionDate",
            case
            when smd."DocumentStatus" = 'InProgress'
            and mc."ApprovalStatus" is not null then mc."Comment"
            when smd."DocumentStatus" = 'InProgress'
            and me."ApprovalStatus" is not null then me."Comment"
            else ''
        end as "ActionUserComment"
    from
        "DocumentModuleDrafts" smd
    inner join "ModuleMasters" mm on
        mm."ModuleTypeID" = smd."ModuleTypeID"
    inner join "ModuleCheckers" mc on
        mc."DocumentModuleDraftID" = smd."DocumentModuleDraftID"
    inner join "ModuleEscalations" me on
        me."DocumentModuleDraftID" = smd."DocumentModuleDraftID"
    inner join "UserDetails" atud on
        atud."UserID" = mc."UserID"
    inner join "UserDetails" etud on
        etud."UserID" = me."UserID"
    where
        smd."IsDeleted" is not true and smd."DocumentID" = :ModuleID ${codition})
        union all
        (select
        smd."TrainingSimulationName" as "ElementName",
        smd."DraftVersion",
        smd."MasterVersion",
        mm."ModuleName",
        case
            when smd."TrainingSimulationStatus" = 'InProgress'
            and mc."ApprovalStatus" is not null then mc."ApprovalStatus"
            when smd."TrainingSimulationStatus" = 'InProgress'
            and me."ApprovalStatus" is not null then me."ApprovalStatus"
            else null
        end as "ElementStatus",
        ${TransitionDays} as "TransitionDays",
        CONCAT(atud."UserFirstName" ,
        ' ' ,
        atud."UserLastName" ,
        ' ' ,
        atud."UserMiddleName") as "AssignToUserName",
        atud."UserPhoto" as "AssignToUserPhoto",
        CONCAT(etud."UserFirstName" ,
        ' ' ,
        etud."UserLastName" ,
        ' ' ,
        etud."UserMiddleName") as "EscalateToUserName",
        etud."UserPhoto" as "EscalateToUserPhoto",
            case
            when smd."TrainingSimulationStatus" = 'InProgress'
            and mc."ApprovalStatus" is not null then 'CheckerUser'
            when smd."TrainingSimulationStatus" = 'InProgress'
            and me."ApprovalStatus" is not null then 'EscalateUser'
            else null
        end as "ActionByUser",
        smd."SelfApproved",
        case
            when smd."SelfApproved" is true then smd."CreatedDate"
            when smd."TrainingSimulationStatus" = 'InProgress'
            and mc."ApprovalStatus" is not null then mc."ModifiedDate"
            when smd."TrainingSimulationStatus" = 'InProgress'
            and me."ApprovalStatus" is not null then me."ModifiedDate"
            else null
        end as "ActionDate",
            case
            when smd."TrainingSimulationStatus" = 'InProgress'
            and mc."ApprovalStatus" is not null then mc."Comment"
            when smd."TrainingSimulationStatus" = 'InProgress'
            and me."ApprovalStatus" is not null then me."Comment"
            else ''
        end as "ActionUserComment"
    from
        "TrainingSimulationModuleDrafts" smd
    inner join "ModuleMasters" mm on
        mm."ModuleTypeID" = smd."ModuleTypeID"
    inner join "ModuleCheckers" mc on
        mc."TrainingSimulationDraftID" = smd."TrainingSimulationDraftID"
    inner join "ModuleEscalations" me on
        me."TrainingSimulationDraftID" = smd."TrainingSimulationDraftID"
    inner join "UserDetails" atud on
        atud."UserID" = mc."UserID"
    inner join "UserDetails" etud on
        etud."UserID" = me."UserID"
    where
        smd."IsDeleted" is not true and smd."TrainingSimulationID" = :ModuleID ${codition})
        union all
        (select
        smd."TestSimulationName" as "ElementName",
        smd."DraftVersion",
        smd."MasterVersion",
        mm."ModuleName",
        case
            when smd."TestSimulationStatus" = 'InProgress'
            and mc."ApprovalStatus" is not null then mc."ApprovalStatus"
            when smd."TestSimulationStatus" = 'InProgress'
            and me."ApprovalStatus" is not null then me."ApprovalStatus"
            else null
        end as "ElementStatus",
        ${TransitionDays} as "TransitionDays",
        CONCAT(atud."UserFirstName" ,
        ' ' ,
        atud."UserLastName" ,
        ' ' ,
        atud."UserMiddleName") as "AssignToUserName",
        atud."UserPhoto" as "AssignToUserPhoto",
        CONCAT(etud."UserFirstName" ,
        ' ' ,
        etud."UserLastName" ,
        ' ' ,
        etud."UserMiddleName") as "EscalateToUserName",
        etud."UserPhoto" as "EscalateToUserPhoto",
            case
            when smd."TestSimulationStatus" = 'InProgress'
            and mc."ApprovalStatus" is not null then 'CheckerUser'
            when smd."TestSimulationStatus" = 'InProgress'
            and me."ApprovalStatus" is not null then 'EscalateUser'
            else null
        end as "ActionByUser",
        smd."SelfApproved",
        case
            when smd."SelfApproved" is true then smd."CreatedDate"
            when smd."TestSimulationStatus" = 'InProgress'
            and mc."ApprovalStatus" is not null then mc."ModifiedDate"
            when smd."TestSimulationStatus" = 'InProgress'
            and me."ApprovalStatus" is not null then me."ModifiedDate"
            else null
        end as "ActionDate",
            case
            when smd."TestSimulationStatus" = 'InProgress'
            and mc."ApprovalStatus" is not null then mc."Comment"
            when smd."TestSimulationStatus" = 'InProgress'
            and me."ApprovalStatus" is not null then me."Comment"
            else ''
        end as "ActionUserComment"
    from
        "TestSimulationModuleDrafts" smd
    inner join "ModuleMasters" mm on
        mm."ModuleTypeID" = smd."ModuleTypeID"
    inner join "ModuleCheckers" mc on
        mc."TestSimulationDraftID" = smd."TestSimulationDraftID"
    inner join "ModuleEscalations" me on
        me."TestSimulationDraftID" = smd."TestSimulationDraftID"
    inner join "UserDetails" atud on
        atud."UserID" = mc."UserID"
    inner join "UserDetails" etud on
        etud."UserID" = me."UserID"
    where
        smd."IsDeleted" is not true and smd."TestSimulationID" = :ModuleID ${codition})
        union all
        (select
        smd."TestMCQName" as "ElementName",
        smd."DraftVersion",
        smd."MasterVersion",
        mm."ModuleName",
        case
            when smd."TestMCQStatus" = 'InProgress'
            and mc."ApprovalStatus" is not null then mc."ApprovalStatus"
            when smd."TestMCQStatus" = 'InProgress'
            and me."ApprovalStatus" is not null then me."ApprovalStatus"
            else null
        end as "ElementStatus",
        ${TransitionDays} as "TransitionDays",
        CONCAT(atud."UserFirstName" ,
        ' ' ,
        atud."UserLastName" ,
        ' ' ,
        atud."UserMiddleName") as "AssignToUserName",
        atud."UserPhoto" as "AssignToUserPhoto",
        CONCAT(etud."UserFirstName" ,
        ' ' ,
        etud."UserLastName" ,
        ' ' ,
        etud."UserMiddleName") as "EscalateToUserName",
        etud."UserPhoto" as "EscalateToUserPhoto",
            case
            when smd."TestMCQStatus" = 'InProgress'
            and mc."ApprovalStatus" is not null then 'CheckerUser'
            when smd."TestMCQStatus" = 'InProgress'
            and me."ApprovalStatus" is not null then 'EscalateUser'
            else null
        end as "ActionByUser",
        smd."SelfApproved",
        case
            when smd."SelfApproved" is true then smd."CreatedDate"
            when smd."TestMCQStatus" = 'InProgress'
            and mc."ApprovalStatus" is not null then mc."ModifiedDate"
            when smd."TestMCQStatus" = 'InProgress'
            and me."ApprovalStatus" is not null then me."ModifiedDate"
            else null
        end as "ActionDate",
            case
            when smd."TestMCQStatus" = 'InProgress'
            and mc."ApprovalStatus" is not null then mc."Comment"
            when smd."TestMCQStatus" = 'InProgress'
            and me."ApprovalStatus" is not null then me."Comment"
            else ''
        end as "ActionUserComment"
    from
        "TestMcqsModuleDrafts" smd
    inner join "ModuleMasters" mm on
        mm."ModuleTypeID" = smd."ModuleTypeID"
    inner join "ModuleCheckers" mc on
        mc."TestMCQDraftID" = smd."TestMCQDraftID"
    inner join "ModuleEscalations" me on
        me."TestMCQDraftID" = smd."TestMCQDraftID"
    inner join "UserDetails" atud on
        atud."UserID" = mc."UserID"
    inner join "UserDetails" etud on
        etud."UserID" = me."UserID"
    where
        smd."IsDeleted" is not true and smd."TestMCQID" = :ModuleID ${codition})
            `,
      {
        replacements: { ModuleID: ModuleID },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    res.status(200).send({ data });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.formElementReport = async (req, res) => {
  const { currentUserId, currentUserType } = req.payload;
  try {
    let { ModuleID, UserID, RoleID, DepartmentID, UnitID, StartDate, EndDate } =
      req.body;
    if (currentUserType == "EndUser") {
      UserID = currentUserId;
    }
    let condition = "";

    if (RoleID) {
      condition = ` AND uml."UserID" IN (select url."UserID" from "UserRoleLinks" url where url."RoleID" :RoleID) `;
    }
    if (DepartmentID) {
      condition = ` AND uml."UserID" IN (select udl."UserID" from "UserDeparmentLinks" udl where udl."DepartmentID" = :DepartmentID) `;
    }
    if (UnitID) {
      condition = ` AND uml."UserID" IN (select uul."UserID" from "UserUnitLinks" uul where uul."OrganizationStructureID" =:UnitID) `;
    }
    if (UserID) {
      condition = ` AND uml."UserID" = :UserID `;
    }
    if (ModuleID) {
      condition += ` AND uml."ModuleID" = :ModuleID `;
    }
    if (StartDate && EndDate) {
      condition += ` AND uml."DueDate" BETWEEN :StartDate AND :EndDate `;
    }
    if (StartDate && !EndDate) {
      condition += ` AND uml."StartDate" >= :StartDate `;
    }
    if (EndDate && !StartDate) {
      condition += ` AND uml."DueDate" <= :EndDate `;
    }
    const data = await sequelize.query(
      `
      select ud."UserPhoto",ud."UserFirstName",ud."UserMiddleName",ud."UserLastName",
      fm."FormName" ,fm."MasterVersion",coalesce(fm."ModifiedDate",fm."CreatedDate") as "PublishDate",
      uml."DueDate",fms."CreatedDate" as "SubmittedDate",fmd."FormJSON" as "Questions",fms."FormJSON" as "Answers" from "FormModules" fm 
      inner  join "UserModuleLinks" uml on uml."ModuleID" = fm."FormID" 
      inner join "UserDetails" ud on ud."UserID" = uml."UserID" 
      left join "FormModuleSubmissions" fms on fms."UserModuleLinkID" = uml."UserModuleLinkID" 
      left join "FormModuleDrafts" fmd on fmd."FormModuleDraftID" = fms."FormModuleDraftID" 
      and fms."CreatedBy" = uml."UserID"
      WHERE 1 = 1 ${condition}
      order by "PublishDate" desc`,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: {
          UserID,
          ModuleID,
          StartDate,
          EndDate,
          RoleID,
          DepartmentID,
          UnitID,
        },
      }
    );
    res.status(200).send({ data });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.addAdvertisement = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const {
      AdvertisementTitle,
      AdvertisementDescription,
      AdvertisementBanner,
      ExpireDate,
      IsActive,
    } = req.body;

    await OrganizationAdvertisement.create({
      OrganizationStructureID: lincense?.EnterpriseID,
      AdvertisementTitle,
      AdvertisementDescription,
      AdvertisementBanner,
      ExpireDate: new Date(ExpireDate).toISOString(),
      IsActive,
      CreatedBy: currentUserId,
    });
    res.status(201).send({ message: "Advertisement created successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.updateAdvertisement = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const {
      AdvertisementID,
      AdvertisementTitle,
      AdvertisementDescription,
      AdvertisementBanner,
      ExpireDate,
      IsActive,
    } = req.body;

    await OrganizationAdvertisement.update(
      {
        AdvertisementTitle,
        AdvertisementDescription,
        AdvertisementBanner,
        ExpireDate: new Date(ExpireDate).toISOString(),
        IsActive,
        ModifiedBy: currentUserId,
        ModifiedDate: new Date().toISOString(),
      },
      {
        where: { AdvertisementID },
      }
    );
    res.status(200).send({ message: "Advertisement updated successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.deleteAdvertisement = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { AdvertisementID } = req.body;
    await OrganizationAdvertisement.update(
      {
        IsActive: false,
        IsDeleted: true,
        DeletedBy: currentUserId,
        DeletedDate: new Date().toISOString(),
      },
      {
        where: { AdvertisementID },
      }
    );
    res.status(200).send({ message: "Advertisement deleted successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.getAdvertisements = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { SearchText, Limit = 20, Page = 1 } = req.body;

    const { OrganizationStructureID } =
      await UserOrganizationStructureLink.findOne({
        where: { UserID: currentUserId },
        attributes: ["OrganizationStructureID"],
      });
    const data = await OrganizationAdvertisement.findAndCountAll({
      where: {
        OrganizationStructureID,
        IsDeleted: false,
        AdvertisementTitle: {
          [Op.iLike]: `%${SearchText}%`,
        },
      },
      limit: Limit,
      offset: (Page - 1) * Limit,
      order: [
        ["ModifiedDate", "DESC"],
        ["CreatedDate", "DESC"],
      ],
    });
    res.status(200).send({ data });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.getUnitList = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const { SearchText } = req.body;
    const data = await sequelize.query(
      `
        select os1."OrganizationStructureID" as "UnitID", os1."OrganizationStructureName" as "UnitName",
        os1."IsActive" from "OrganizationStructures" os 
        right join "OrganizationStructures" os1 on os1."ParentID"  = os."OrganizationStructureID"
        right join "OrganizationStructureTypes" ost on ost."OrganizationStructureTypeID" = os1."OrganizationStructureTypeID"
        where os."ParentID" = '${lincense?.EnterpriseID}' and os1."IsDeleted" is not true 
        and os1."OrganizationStructureName" ilike '%${SearchText}%'`,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );
    res.status(200).send({ data });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.ElementList = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const { SearchText = "", ModuleTypeID } = req.body;
    const elements = await sequelize.query(
      `
        select 'sop' as "ModuleType",'SOPID' as "IDName",sm."SOPID" as "ModuleID",sm."SOPName" as "ElementName" ,sm."SOPIsActive" as "IsActive"
        from "SopModules" sm 
        inner join "ContentStructures" cs on cs."ContentID" = sm."ContentID"
        where sm."IsDeleted" is not true and sm."SOPName" ilike '%${SearchText}%' and sm."ModuleTypeID" = '${ModuleTypeID}'
        and cs."OrganizationStructureID" = '${lincense?.EnterpriseID}'
        union all
        select 'doc' as "ModuleType",'DocumentID' as "IDName",dm."DocumentID" as "ModuleID",dm."DocumentName" as "ElementName" ,dm."DocumentIsActive" as "IsActive" 
        from "DocumentModules" dm 
        inner join "ContentStructures" cs on cs."ContentID" = dm."ContentID"
        where dm."IsDeleted" is not true and dm."DocumentName" ilike '%${SearchText}%' and dm."ModuleTypeID" = '${ModuleTypeID}'
        and cs."OrganizationStructureID" = '${lincense?.EnterpriseID}'
        union all 
        select 'trs' as "ModuleType",'TrainingSimulationID' as "IDName",tsm."TrainingSimulationID" as "ModuleID",tsm."TrainingSimulationName" as "ElementName" ,tsm."TrainingSimulationIsActive" as "IsActive" 
        from "TrainingSimulationModules" tsm 
        inner join "ContentStructures" cs on cs."ContentID" = tsm."ContentID"
        where tsm."IsDeleted" is not true and tsm."TrainingSimulationName" ilike '%${SearchText}%' and tsm."ModuleTypeID" = '${ModuleTypeID}'
        and cs."OrganizationStructureID" = '${lincense?.EnterpriseID}'
        union all 
        select 'tes' as "ModuleType",'TestSimulationID' as "IDName",tsm2."TestSimulationID" as "ModuleID",tsm2."TestSimulationName" as "ElementName" ,tsm2."TestSimulationIsActive" as "IsActive"
        from "TestSimulationModules" tsm2 
        inner join "ContentStructures" cs on cs."ContentID" = tsm2."ContentID"
        where tsm2."IsDeleted" is not true and tsm2."TestSimulationName" ilike '%${SearchText}%' and tsm2."ModuleTypeID" = '${ModuleTypeID}'
        and cs."OrganizationStructureID" = '${lincense?.EnterpriseID}'
        union all 
        select 'mcq' as "ModuleType",'TestMCQID' as "IDName",tmm."TestMCQID" as "ModuleID",tmm."TestMCQName" as "ElementName" ,tmm."TestMCQIsActive" as "IsActive" 
        from "TestMcqsModules" tmm 
        inner join "ContentStructures" cs on cs."ContentID" = tmm."ContentID"
        where tmm."TestMCQName" ilike '%${SearchText}%' and tmm."ModuleTypeID" = '${ModuleTypeID}' and tmm."IsDeleted" is not true
        and cs."OrganizationStructureID" = '${lincense?.EnterpriseID}'
        union all
        select 'form' as "ModuleType",'FormID' as "IDName",fm."FormID" as "ModuleID",fm."FormName" as "ElementName" ,fm."FormIsActive" as "IsActive"
        from "FormModules" fm 
        inner join "ContentStructures" cs on cs."ContentID" = fm."ContentID"
        where fm."IsDeleted" is not true and fm."FormName" ilike '%${SearchText}%' and fm."ModuleTypeID" = '${ModuleTypeID}' 
        and cs."OrganizationStructureID" = '${lincense?.EnterpriseID}'
              `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );
    res.status(200).send({ data: elements });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.getDepartMentList = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const { SearchText } = req.body;
    const data = await sequelize.query(
      `
        select d."DepartmentID",d."DepartmentName",d."IsActive" from "Departments" d 
        inner join "Departments" osdl on osdl."DepartmentID" = d."DepartmentID" 
        where d."IsDeleted" is not true and osdl."OrganizationStructureID" ='${lincense?.EnterpriseID}' 
        and d."DepartmentName" ilike '%${SearchText}%'`,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );
    res.status(200).send({ data });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.getRoleList = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const { SearchText } = req.body;
    const data = await sequelize.query(
      `
        select r."RoleID",r."RoleName",r."IsActive" from "Roles" r
        inner join "Roles" osrl on osrl."RoleID" = r."RoleID"
        where r."IsDeleted" is not true and osrl."OrganizationStructureID" ='${lincense?.EnterpriseID}'
        and r."RoleName" ilike '%${SearchText}%'`,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );
    res.status(200).send({ data });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.getUsersList = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const { SearchText, RoleID, DepartmentID, UnitID } = req.body;
    let conditions = "";
    if (RoleID) conditions += ` and url."RoleID" = '${RoleID}'`;
    if (DepartmentID)
      conditions += ` and udl."DepartmentID" = '${DepartmentID}'`;
    if (UnitID)
      conditions += ` and uosl."OrganizationStructureID" = '${UnitID}'`;
    const data = await sequelize.query(
      `
        select u."UserID", ud."UserFirstName",ud."UserMiddleName",ud."UserLastName",ud."UserPhoto", u."IsActive" from "Users" u 
        inner join "UserDetails" ud on ud."UserID" = u."UserID" 
        inner join "UserOrganizationStructureLinks" ol on ol."UserID" = u."UserID"
        inner join "UserRoleLinks" url on url."UserID" = u."UserID" 
        inner join "UserDeparmentLinks" udl on udl."UserID" = u."UserID" 
        inner join "UserUnitLinks" uosl on uosl."UserID" = u."UserID" 
        where ol."OrganizationStructureID" = '${lincense?.EnterpriseID}' and u."IsDeleted" is not true ${conditions}
        and (ud."UserFirstName" ilike '%${SearchText}%' or ud."UserLastName" ilike '%${SearchText}%')`,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );
    res.status(200).send({ data });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.addRequest = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const { RequestType, RequestTitle, RequestDescription, RequestPriority } =
      req.body;
    const rm = await RequestManagement.create({
      RequestID: RequestType.toUpperCase() + "_" + new Date().getTime(),
      RequestType,
      RequestTitle,
      RequestDescription,
      RequestStatus: "Pending",
      RequestPriority,
      OrganizationStructureID: lincense?.EnterpriseID,
      CreatedBy: currentUserId,
    });
    const admins = await Users.findAll({
      where: {
        UserType: "Admin",
        IsActive: true,
        IsDeleted: false,
      },
      include: {
        model: UserOrganizationStructureLink,
        attributes: [],
        where: {
          OrganizationStructureID: lincense?.EnterpriseID,
        },
        required: true,
      },
      attributes: ["UserID"],
    });
    const userIds = [];
    for (const el of JSON.parse(JSON.stringify(admins))) {
      userIds.push(el.UserID);
    }
    const notificationStatus = await Notification.findAll({
      where: {
        UserID: userIds,
        NotificationTypeForAction: ["push", "both"],
      },
      attributes: ["UserID", "NotificationTypeForAction"],
    });
    const notificationBulk = [];
    for (const el of JSON.parse(JSON.stringify(admins))) {
      for (const e of JSON.parse(JSON.stringify(notificationStatus))) {
        if (el.UserID == e.UserID) {
          notificationBulk.push({
            UserID: el.UserID,
            Message: RequestTitle,
            NotificationType: "myrequest",
            LinkedType: "MyRequest",
            LinkedID: rm.RequestManagementID,
            CreatedBy: currentUserId,
          });
        }
      }
    }
    for (const el of notificationBulk) {
      try {
        await UserNotification.create(el);
      } catch (error) {}
    }
    await sendNotification(notificationBulk);
    res.status(201).send({ message: "Request added successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.updateRequest = async (req, res) => {
  const { currentUserId, currentUserType, lincense } = req.payload;
  try {
    const {
      RequestManagementID,
      RequestType,
      RequestTitle,
      RequestDescription,
      RequestPriority,
      RequestStatus,
      RejectedReason = "",
    } = req.body;
    const payload = {
      RequestStatus,
      RejectedReason,
      ModifiedBy: currentUserId,
      ModifiedDate: new Date().toISOString(),
    };
    if (currentUserType !== "Admin") {
      payload.RequestType = RequestType;
      payload.RequestTitle = RequestTitle;
      payload.RequestDescription = RequestDescription;
      payload.RequestPriority = RequestPriority;
    }
    if (RequestStatus == "Rejected") {
      payload.RejectedBy = currentUserId;
      payload.RejectedDate = new Date().toISOString();
    }
    await RequestManagement.update(payload, { where: { RequestManagementID } });
    const notificationBulk = [];
    if (currentUserType == "Admin") {
      const { CreatedBy } = await RequestManagement.findOne({
        where: { RequestManagementID },
        attributes: ["CreatedBy"],
      });
      const notificationStatus = await Notification.count({
        where: {
          UserID: CreatedBy,
          NotificationTypeForAction: ["push", "both"],
        },
      });
      if (notificationStatus) {
        notificationBulk.push({
          UserID: CreatedBy,
          Message: `Your Request ${RequestStatus}`,
          NotificationType: "myrequest",
          LinkedType: "MyRequest",
          LinkedID: RequestManagementID,
          CreatedBy: currentUserId,
        });
      }
    } else {
      const admins = await Users.findAll({
        where: {
          UserType: "Admin",
          IsActive: true,
          IsDeleted: false,
        },
        include: {
          model: UserOrganizationStructureLink,
          attributes: [],
          where: {
            OrganizationStructureID: lincense?.EnterpriseID,
          },
          required: true,
        },
        attributes: ["UserID"],
      });
      const userIds = [];
      for (const el of JSON.parse(JSON.stringify(admins))) {
        userIds.push(el.UserID);
      }
      const notificationStatus = await Notification.findAll({
        where: {
          UserID: userIds,
          NotificationTypeForAction: ["push", "both"],
        },
        attributes: ["UserID", "NotificationTypeForAction"],
      });
      for (const el of JSON.parse(JSON.stringify(admins))) {
        for (const e of JSON.parse(JSON.stringify(notificationStatus))) {
          if (el.UserID == e.UserID) {
            notificationBulk.push({
              UserID: el.UserID,
              Message: RequestTitle,
              NotificationType: "myrequest",
              LinkedType: "MyRequest",
              LinkedID: RequestManagementID,
              CreatedBy: currentUserId,
            });
          }
        }
      }
    }
    for (const el of notificationBulk) {
      try {
        await UserNotification.create(el);
      } catch (error) {}
    }
    await sendNotification(notificationBulk);
    res.status(200).send({ message: "Request status updated successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.getRequestList = async (req, res) => {
  const { currentUserId, currentUserType, lincense } = req.payload;
  try {
    const { Page = 1 } = req.body;
    let whereCondition = {};
    if (currentUserType === "Admin") {
      whereCondition = {
        RequestStatus: "Pending",
        IsDeleted: false,
        OrganizationStructureID: lincense?.EnterpriseID,
      };
    } else {
      whereCondition = {
        CreatedBy: currentUserId,
        IsDeleted: false,
        OrganizationStructureID: lincense?.EnterpriseID,
      };
    }
    const data = await RequestManagement.findAll({
      where: whereCondition,
      include: [
        {
          model: UserDetails,
          as: "CreatedUser",
          attributes: ["UserFirstName", "UserLastName", "UserPhoto"],
        },
        {
          model: UserDetails,
          as: "ModifiedUser",
          attributes: ["UserFirstName", "UserLastName", "UserPhoto"],
          required: false,
        },
        {
          model: UserDetails,
          as: "RejectedUser",
          attributes: ["UserFirstName", "UserLastName", "UserPhoto"],
          required: false,
        },
      ],
      order: [
        ["CreatedDate", "DESC"],
        ["ModifiedDate", "DESC"],
      ],
      limit: 10,
      offset: (Page - 1) * 10,
    });
    res.status(200).send({ data });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.deleteRequest = async (req, res) => {
  const { currentUserId, currentUserType } = req.payload;
  try {
    const { RequestManagementID } = req.body;
    if (currentUserType == "Admin") {
      res
        .status(403)
        .send({ message: "You are not allowed to delete request" });
      return;
    }
    await RequestManagement.update(
      {
        IsDeleted: true,
        DeletedBy: currentUserId,
        DeletedDate: new Date().toISOString(),
      },
      {
        where: {
          RequestManagementID,
        },
      }
    );
    res.status(200).send({ message: "Request deleted successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.userBulkUpload = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  const t = await sequelize.transaction();
  try {
    const { UsersData } = req.body;
    if (UsersData.length == 0) {
      await t.rollback();
      res.status(400).send({ message: "No users data provided" });
      return;
    }
    const endUserCount = UsersData.filter(
      (user) => user.UserType === "EndUser"
    ).length;
    const processOwnerCount = UsersData.filter(
      (user) => user.UserType === "ProcessOwner"
    ).length;
    const auditorUserCount = UsersData.filter(
      (user) => user.UserType === "Auditor"
    ).length;
    const adminCount = UsersData.filter(
      (user) => user.UserType === "Admin"
    ).length;
    if (
      lincense.PerpetualEndUser ||
      lincense.NumberOfEndUsers >= endUserCount
    ) {
      const count = await Users.count({
        where: {
          UserType: "EndUser",
          IsDeleted: { [Op.not]: true },
        },
        include: {
          model: UserOrganizationStructureLink,
          attributes: [],
          where: {
            OrganizationStructureID: lincense?.EnterpriseID,
          },
          required: true,
        },
      });
      if (
        count + endUserCount > lincense.NumberOfEndUsers &&
        !lincense.PerpetualEndUser
      ) {
        await t.rollback();
        return res.status(400).send({ error: "Out of End User limit" });
      }
    }
    if (lincense.NumberOfAdminUsers >= adminCount) {
      const count = await Users.count({
        where: {
          UserType: "Admin",
          IsDeleted: { [Op.not]: true },
        },
        include: {
          model: UserOrganizationStructureLink,
          attributes: [],
          where: {
            OrganizationStructureID: lincense?.EnterpriseID,
          },
          required: true,
        },
      });
      if (count + adminCount > lincense.NumberOfAdminUsers) {
        await t.rollback();
        return res.status(400).send({ error: "Out of Admin User limit" });
      }
    }
    if (
      lincense.PerpetualProcessOwner ||
      lincense.NumberOfProcessOwnerUsers >= processOwnerCount
    ) {
      const count = await Users.count({
        where: {
          UserType: "ProcessOwner",
          IsDeleted: { [Op.not]: true },
        },
        include: {
          model: UserOrganizationStructureLink,
          attributes: [],
          where: {
            OrganizationStructureID: lincense?.EnterpriseID,
          },
          required: true,
        },
      });
      if (
        count + processOwnerCount > lincense.NumberOfProcessOwnerUsers &&
        !lincense.PerpetualProcessOwner
      ) {
        await t.rollback();
        return res
          .status(400)
          .send({ error: "Out of Process Owner User limit" });
      }
    }
    if (
      lincense.PerpetualAuditorUsers ||
      lincense.NumberOfAuditorUsers >= auditorUserCount
    ) {
      const count = await Users.count({
        where: {
          UserType: "Auditor",
          IsDeleted: { [Op.not]: true },
        },
        include: {
          model: UserOrganizationStructureLink,
          attributes: [],
          where: {
            OrganizationStructureID: lincense?.EnterpriseID,
          },
          required: true,
        },
      });
      if (
        count + auditorUserCount > lincense.NumberOfAuditorUsers &&
        !lincense.PerpetualAuditorUsers
      ) {
        await t.rollback();
        return res.status(400).send({ error: "Out of Auditor User limit" });
      }
    }
    const OrgRoles = await OrganizationStructure.findOne({
      where: {
        OrganizationStructureID: lincense?.EnterpriseID,
      },
      attributes: ["OrganizationStructureID", "OrganizationStructureName"],
      include: [
        {
          model: Roles,
          as: "Roles",
          through: { attributes: [] },
          where: {
            IsDeleted: {
              [Op.not]: true,
            },
          },
          attributes: ["RoleID", "RoleName", "IsActive"],
        },
      ],
    });
    const OrgUnits = await sequelize.query(
      `
      select os1."OrganizationStructureID" as "UnitID", os1."OrganizationStructureName" as "UnitName",
      os1."OrganizationStructureDescription" as "UnitDescriptions", os1."IsActive"
      from "OrganizationStructures" os 
      right join "OrganizationStructures" os1 on os1."ParentID"  = os."OrganizationStructureID"
      right join "OrganizationStructureTypes" ost on ost."OrganizationStructureTypeID" = os1."OrganizationStructureTypeID"
      where os."ParentID" = '${lincense?.EnterpriseID}' and os1."IsDeleted" is not true`,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const OrgDepartments = await OrganizationStructure.findOne({
      where: {
        OrganizationStructureID: lincense?.EnterpriseID,
      },
      attributes: ["OrganizationStructureID", "OrganizationStructureName"],
      include: [
        {
          model: Departments,
          as: "Departments",
          where: {
            IsDeleted: {
              [Op.not]: true,
            },
          },
          attributes: ["DepartmentID", "DepartmentName", "IsActive"],
        },
      ],
    });
    const OrgRolesArray = JSON.parse(JSON.stringify(OrgRoles.Roles));
    const OrgUnitsArray = JSON.parse(JSON.stringify(OrgUnits));
    const OrgDepartmentsArray = JSON.parse(
      JSON.stringify(OrgDepartments.Departments)
    );
    const userData = [],
      userDataError = [];
    for (let el of UsersData) {
      // const passHash = generatePasswordHash(el.Password);

      for (const field of [
        "UserName",
        "UserEmail",
        "UserPhone",
        "UserEmployeeNumber",
      ]) {
        const duplicate = UsersData.filter((x) => x[field] === el[field]);
        if (duplicate.length > 1) {
          userDataError.push({
            field: field,
            message: `Duplicate ${field} found`,
            values: duplicate,
          });
        }
      }
      const roleMismatch = OrgRolesArray.some(
        (x) => x.RoleName === el.RoleName
      );
      if (!roleMismatch) {
        userDataError.push({
          field: "RoleName",
          message: `RoleName not found in organization roles`,
          values: el,
        });
      }
      const unitMismatch = OrgUnitsArray.some(
        (x) => x.UnitName === el.UnitName
      );
      if (!unitMismatch) {
        userDataError.push({
          field: "UnitName",
          message: `UnitName not found in organization units`,
          values: el,
        });
      }
      const departmentMismatch = OrgDepartmentsArray.some(
        (x) => x.DepartmentName === el.DepartmentName
      );
      if (!departmentMismatch) {
        userDataError.push({
          field: "DepartmentName",
          message: `DepartmentName not found in organization departments`,
          values: el,
        });
      }
      const { UserName, Password, IsActive, UserType } = el;
      userData.push({
        UserName,
        Password: generatePasswordHash(Password),
        IsActive,
        UserType,
        CreatedBy: currentUserId,
        CreatedDate: new Date().toISOString(),
      });
    }
    if (userDataError.length > 0) {
      await t.rollback();
      res
        .status(400)
        .send({ message: "Validation failed", data: userDataError });
      return;
    }
    const users = await Users.bulkCreate(userData, {
      transaction: t,
      returning: true,
    });
    const userDetailsData = [];
    for (const el of UsersData) {
      const user = users.find((x) => x.UserName == el.UserName);
      const {
        UserFirstName,
        UserLastName,
        UserMiddleName,
        UserEmail,
        UserPhoneNumber,
        UserAddress,
        UserDateOfBirth,
        Gender,
        UserEmployeeNumber,
      } = el;
      userDetailsData.push({
        UserID: user.UserID,
        UserFirstName,
        UserLastName,
        UserMiddleName,
        UserEmail,
        UserPhoneNumber,
        UserAddress,
        UserDateOfBirth: UserDateOfBirth || null,
        Gender,
        UserEmployeeNumber,
        UserSupervisorID: null,
        CreatedBy: currentUserId,
      });
    }
    await UserDetails.bulkCreate(userDetailsData, { transaction: t });
    const UserRoleLinksData = [];
    for (const el of UsersData) {
      const user = users.find((x) => x.UserName == el.UserName);
      const role = OrgRolesArray.find((x) => x.RoleName == el.RoleName);
      UserRoleLinksData.push({
        UserID: user.UserID,
        RoleID: role.RoleID,
        CreatedBy: currentUserId,
      });
    }
    await UserRoleLink.bulkCreate(UserRoleLinksData, { transaction: t });
    const UserDeparmentLinkData = [];
    for (const el of UsersData) {
      const user = users.find((x) => x.UserName == el.UserName);
      const department = OrgDepartmentsArray.find(
        (x) => x.DepartmentName == el.DepartmentName
      );
      UserDeparmentLinkData.push({
        UserID: user.UserID,
        DepartmentID: department.DepartmentID,
        CreatedBy: currentUserId,
      });
    }
    await UserDeparmentLink.bulkCreate(UserDeparmentLinkData, {
      transaction: t,
    });
    const UserUnitData = [];
    for (const el of UsersData) {
      const user = users.find((x) => x.UserName == el.UserName);
      const unit = OrgUnitsArray.find((x) => x.UnitName == el.UnitName);
      UserUnitData.push({
        UserID: user.UserID,
        OrganizationStructureID: unit.UnitID,
        CreatedBy: currentUserId,
      });
    }
    await UserUnitLinks.bulkCreate(UserUnitData, {
      transaction: t,
    });
    await t.commit();
    res.status(201).send({ message: "Users added successfully" });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
// ...existing code...
exports.getUserNotification = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { Limit = 5, Page = 1 } = req.body;
    const where = {
      UserID: currentUserId,
      IsActive: true,
    };
    if (Limit == 5 && Page == 1) {
      where.IsRead = false;
    }
    const data = await UserNotification.findAll({
      where,
      include: {
        model: UserDetails,
        as: "CreatedByUser",
        attributes: ["UserFirstName", "UserLastName", "UserMiddleName"],
      },
      attributes: {
        include: [
          [
            // 'actionable', 'assignment', 'myrequest','chatmessages', 'update'
            sequelize.literal(
              `(SELECT CASE 
                  WHEN "UserNotification"."NotificationType" = 'actionable' THEN (
                  CASE 
                      WHEN "UserNotification"."LinkedType" = 'Document' THEN (SELECT "DocumentName" FROM "DocumentModuleDrafts" WHERE "DocumentModuleDraftID"::TEXT = "UserNotification"."LinkedID")
                      WHEN "UserNotification"."LinkedType" = 'SOP' THEN (SELECT "SOPName" FROM "SopModuleDrafts" WHERE "SOPDraftID"::TEXT = "UserNotification"."LinkedID")
                      ELSE NULL
                  END
                  )
                  WHEN "UserNotification"."NotificationType" = 'assignment' THEN (
                  CASE
                      WHEN "UserNotification"."LinkedType" = 'Document' THEN (SELECT "DocumentName" FROM "DocumentModules" WHERE "DocumentID"::TEXT = "UserNotification"."LinkedID")
                      WHEN "UserNotification"."LinkedType" = 'SOP' THEN (SELECT "SOPName" FROM "SopModules" WHERE "SOPID"::TEXT = "UserNotification"."LinkedID")
                      WHEN "UserNotification"."LinkedType" = 'TrainingSimulation' THEN (SELECT "TrainingSimulationName" FROM "TrainingSimulationModules" WHERE "TrainingSimulationID"::TEXT = "UserNotification"."LinkedID")
                      WHEN "UserNotification"."LinkedType" = 'TestSimulation' THEN (SELECT "TestSimulationName" FROM "TestSimulationModules" WHERE "TestSimulationID"::TEXT = "UserNotification"."LinkedID")
                      WHEN "UserNotification"."LinkedType" = 'TestMCQ' THEN (SELECT "TestMCQName" FROM "TestMcqsModules" WHERE "TestMCQID"::TEXT = "UserNotification"."LinkedID")
                      WHEN "UserNotification"."LinkedType" = 'Form' THEN (SELECT "FormName" FROM "FormModules" WHERE "FormID"::TEXT = "UserNotification"."LinkedID")
                      ELSE NULL
                  END
                  )
                   WHEN "UserNotification"."NotificationType" = 'update' THEN (
                  CASE
                      WHEN "UserNotification"."LinkedType" = 'Document' THEN (SELECT "DocumentName" FROM "DocumentModuleDrafts" WHERE COALESCE("DocumentID"::TEXT,"DocumentModuleDraftID"::TEXT) = "UserNotification"."LinkedID" ORDER BY "CreatedDate" DESC LIMIT 1) 
                      WHEN "UserNotification"."LinkedType" = 'SOP' THEN (SELECT "SOPName" FROM "SopModuleDrafts" WHERE  COALESCE("SOPID"::TEXT,"SOPDraftID"::TEXT) = "UserNotification"."LinkedID" ORDER BY "CreatedDate" DESC LIMIT 1)
                      WHEN "UserNotification"."LinkedType" = 'TrainingSimulation' THEN (SELECT "TrainingSimulationName" FROM "TrainingSimulationModuleDrafts" WHERE COALESCE("TrainingSimulationID"::TEXT,"TrainingSimulationDraftID"::TEXT) = "UserNotification"."LinkedID" ORDER BY "CreatedDate" DESC LIMIT 1)
                      WHEN "UserNotification"."LinkedType" = 'TestSimulation' THEN (SELECT "TestSimulationName" FROM "TestSimulationModuleDrafts" WHERE COALESCE("TestSimulationID"::TEXT,"TestSimulationDraftID"::TEXT) = "UserNotification"."LinkedID" ORDER BY "CreatedDate" DESC LIMIT 1)
                      WHEN "UserNotification"."LinkedType" = 'TestMCQ' THEN (SELECT "TestMCQName" FROM "TestMcqsModuleDrafts" WHERE COALESCE("TestMCQID"::TEXT,"TestMCQDraftID"::TEXT) = "UserNotification"."LinkedID" ORDER BY "CreatedDate" DESC LIMIT 1)
                      WHEN "UserNotification"."LinkedType" = 'Form' THEN (SELECT "FormName" FROM "FormModules" WHERE "FormID"::TEXT = "UserNotification"."LinkedID" ORDER BY "CreatedDate" DESC LIMIT 1)
                      ELSE NULL
                  END
                  )
                  WHEN "UserNotification"."NotificationType" = 'myrequest' THEN (SELECT "RequestTitle" FROM "RequestManagements" WHERE "RequestManagementID"::TEXT = "UserNotification"."LinkedID")
                  WHEN "UserNotification"."NotificationType" = 'chatmessages' THEN "UserNotification"."Message"
                  ELSE NULL
              END)`
            ),
            "LinkedTitle",
          ],
        ],
      },
      limit: Limit,
      offset: (Page - 1) * Limit,
      order: [["CreatedDate", "DESC"]],
      distinct: true,
      subQuery: false,
    });

    // --- New: remove notifications that point to deleted Document / SOP modules ---
    const raw = JSON.parse(JSON.stringify(data || []));
    const docIds = [];
    const sopIds = [];
    for (const n of raw) {
      if (n.LinkedType === "Document" && n.LinkedID)
        docIds.push(String(n.LinkedID));
      if (n.LinkedType === "SOP" && n.LinkedID) sopIds.push(String(n.LinkedID));
    }

    // find deleted module ids that are referenced in notifications (efficient DB-side check for unread count later)
    const deletedDocIds = new Set();
    const deletedSopIds = new Set();
    if (docIds.length > 0) {
      const deletedDocs = await DocumentModule.findAll({
        where: { DocumentID: { [Op.in]: docIds }, IsDeleted: true },
        attributes: ["DocumentID"],
      });
      deletedDocs.forEach((d) => deletedDocIds.add(String(d.DocumentID)));
    }
    if (sopIds.length > 0) {
      const deletedSops = await SopModule.findAll({
        where: { SOPID: { [Op.in]: sopIds }, IsDeleted: true },
        attributes: ["SOPID"],
      });
      deletedSops.forEach((s) => deletedSopIds.add(String(s.SOPID)));
    }

    // filter out notifications that refer to deleted modules
    const filtered = raw.filter(
      (n) =>
        !(
          (n.LinkedType === "Document" &&
            deletedDocIds.has(String(n.LinkedID))) ||
          (n.LinkedType === "SOP" && deletedSopIds.has(String(n.LinkedID)))
        )
    );

    // compute unread count but exclude notifications that reference deleted modules
    const count = await UserNotification.count({
      where: {
        UserID: currentUserId,
        IsActive: true,
        IsRead: false,
      },
    });

    // subtract unread notifications that reference deleted modules (DB-accurate via joins)
    let removedUnread = 0;
    if (docIds.length > 0) {
      const removedDocRes = await sequelize.query(
        `SELECT COUNT(*)::int AS cnt FROM "UserNotifications" un
         INNER JOIN "DocumentModules" dm ON dm."DocumentID"::TEXT = un."LinkedID"
         WHERE un."UserID" = :UserID AND un."IsActive" = true AND un."IsRead" = false
           AND un."LinkedType" = 'Document' AND dm."IsDeleted" IS TRUE`,
        {
          replacements: { UserID: currentUserId },
          type: sequelize.QueryTypes.SELECT,
        }
      );
      removedUnread += Number(removedDocRes?.[0]?.cnt || 0);
    }
    if (sopIds.length > 0) {
      const removedSopRes = await sequelize.query(
        `SELECT COUNT(*)::int AS cnt FROM "UserNotifications" un
         INNER JOIN "SopModules" sm ON sm."SOPID"::TEXT = un."LinkedID"
         WHERE un."UserID" = :UserID AND un."IsActive" = true AND un."IsRead" = false
           AND un."LinkedType" = 'SOP' AND sm."IsDeleted" IS TRUE`,
        {
          replacements: { UserID: currentUserId },
          type: sequelize.QueryTypes.SELECT,
        }
      );
      removedUnread += Number(removedSopRes?.[0]?.cnt || 0);
    }
    const finalCount = Math.max(0, count - removedUnread);

    res.status(200).send({ data: filtered, count: finalCount });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
// ...existing code...
exports.getUserNotificationCount = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const count = await UserNotification.count({
      where: {
        UserID: currentUserId,
        IsActive: true,
        IsRead: false,
      },
    });
    res.status(200).send({ count });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.viewNotification = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { NotificationID } = req.body;
    await UserNotification.update(
      { IsRead: true },
      { where: { NotificationID, UserID: currentUserId } }
    );
    res.status(200).send({ message: "Notification viewed successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.getCurrenLicense = async (req, res) => {
  try {
    const { OrganizationStructureID } = req.body;
    const license = await OrganizationStructureLicense.findOne({
      where: {
        OrganizationStructureID: OrganizationStructureID,
      },
      attributes: ["LicenseKey"],
      order: [["CreatedDate", "DESC"]],
    });
    const data = JSON.parse(decryptedData(license.LicenseKeys));
    res.status(200).send({ data });
  } catch (error) {
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.getExpireDocumentZipDownload = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const data = await sequelize.query(
      `
      select 
      dm."DocumentID",dm."DocumentName",dm."DocumentPath"
      from "DocumentModules" dm
      inner join "ContentStructures" cs on cs."ContentID" = dm."ContentID"
      where dm."DocumentExpiry" between current_date and current_date + interval '3 month'
      and dm."DocumentStatus" = 'Published' and dm."DocumentIsActive" = true and dm."IsDeleted" is not true
      and cs."OrganizationStructureID" = :OrganizationStructureID
      `,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: { OrganizationStructureID: lincense?.EnterpriseID },
      }
    );
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => {
      console.error("Error creating zip:", err);
      res.status(500).send("Error creating zip file");
    });
    res.attachment("documents.zip");
    archive.pipe(res);
    data.forEach((el) => {
      const filePath = path.posix.join(
        __dirname.slice(0, -14),
        el.DocumentPath
      );
      if (fs.existsSync(filePath)) {
        archive.file(filePath, {
          name: `${el.DocumentName}.${el.DocumentPath.split(".").pop()}`,
        });
      }
    });
    archive.finalize();
  } catch (e) {
    logger.error({
      message: e.message,
      details: e,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: e.errors?.[0]?.message ? e.errors?.[0]?.message : e.message,
    });
  }
};

exports.getPublishDocuments = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const data = await DocumentModule.findAll({
      where: {
        DocumentStatus: "Published",
        IsDeleted: false,
      },
      attributes: ["DocumentID", "DocumentName"],
      include: [
        {
          model: ContentStructure,
          attributes: [],
          where: {
            OrganizationStructureID: lincense?.EnterpriseID,
            IsDeleted: false,
          },
          required: true,
        },
      ],
    });
    res.status(200).send({ data });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.getActivityData = async (req, res) => {
  const { ModuleID, Order = "DESC", IsLatestOne = true } = req.body;
  try {
    const data = await sequelize.query(
      `WITH DraftModuleDetails AS (
          SELECT
              smd."SOPID" AS "ID",
              smd."SOPDraftID" AS "ModuleID",
              smd."SOPName" AS "ModuleName",
              smd."DraftVersion",
              smd."MasterVersion",
              smd."SOPDocID",
              smd."CreatedBy",
              smd."CreatedDate",
              smd."SelfApproved",
              false AS "NeedAcceptanceFromStakeHolder",
              smd."NeedAcceptance",
              smd."NeedAcceptanceForApprover",
			  smd."ElementAttributeTypeID"
          FROM "SopModuleDrafts" smd
          UNION ALL
          SELECT
              dmd."DocumentID" AS "ID",
              dmd."DocumentModuleDraftID" AS "ModuleID",
              dmd."DocumentName" AS "ModuleName",
              dmd."DraftVersion",
              dmd."MasterVersion",
              dmd."DocumentID",
              dmd."CreatedBy",
              dmd."CreatedDate",
              dmd."SelfApproved",
              dmd."NeedAcceptanceFromStakeHolder",
              dmd."NeedAcceptance",
              dmd."NeedAcceptanceForApprover",
			  dmd."ElementAttributeTypeID"
          FROM "DocumentModuleDrafts" dmd
      ),
      UserData AS (
          SELECT
              ud."UserID",
              ud."UserFirstName" ||
              COALESCE(' ' || NULLIF(ud."UserMiddleName", ''), '') ||
              COALESCE(' ' || ud."UserLastName", '') AS "UserName"
          FROM "UserDetails" ud
      ),
      ModuleOwnerHistory AS (
          SELECT
              mo."ModuleID",
              JSONB_AGG(
                  JSONB_BUILD_OBJECT(
                      'UserID', u."UserID",
                      'UserName', u."UserName",
                      'ActionDateTime', "CreatedDate",
                      'ActionType', "ActionType",
                      'ActionBy', u1."UserName"
            )) AS "OwnerActions" FROM (
                                          SELECT "ModuleID", "UserID","ActionType","ActionByUserID","CreatedDate" FROM (
                      SELECT "ModuleID", "OldOwnerID" AS "UserID", 'Create' AS "ActionType", "NewOwnerID" AS "ActionByUserID",
                      "ModuleCreatedDate" AS "CreatedDate", ROW_NUMBER() OVER (PARTITION BY "ModuleID" ORDER BY "CreatedDate" ASC) AS "RowNum"
                      FROM "ModuleOwnerChanges"
                                          ) nes WHERE "RowNum" = 1
                  UNION ALL
                  SELECT "ModuleID", "NewOwnerID" AS "UserID", 'Change' AS "ActionType", "OldOwnerID" AS "ActionByUserID",MAX("CreatedDate")
                  FROM "ModuleOwnerChanges"
                                          GROUP BY "ModuleID", "NewOwnerID","OldOwnerID"
            ) mo
                JOIN UserData u ON u."UserID" = mo."UserID"
                JOIN UserData u1 ON u1."UserID" = mo."ActionByUserID"
          GROUP BY mo."ModuleID"
      ),
      AggregatedOwners AS (
          SELECT
              mo."ModuleID",
              CASE
                  WHEN COUNT(moh."ModuleID") > 0 THEN moh."OwnerActions"
                  ELSE JSONB_AGG(
                      JSONB_BUILD_OBJECT(
                          'UserID', u."UserID",
                          'UserName', u."UserName",
                          'ActionDateTime', "CreatedDate",
                          'ActionType', 'Create',
                          'ActionBy', u."UserName"
                  ))
              END AS "AssignedOwner"
          FROM (
              SELECT "SOPID" AS "ModuleID","CreatedBy" AS "UserID","CreatedDate"
              FROM "SopModules"
              UNION ALL
              SELECT "DocumentID" AS "ModuleID", "CreatedBy" AS "UserID","CreatedDate"
              FROM "DocumentModules"
          ) mo
          JOIN UserData u ON u."UserID" = mo."UserID"
          LEFT JOIN ModuleOwnerHistory moh ON moh."ModuleID" = mo."ModuleID"
          GROUP BY mo."ModuleID",moh."OwnerActions"
      ),
      AggregatedCheckers AS (
          SELECT
              mc."ModuleID",
              jsonb_agg(jsonb_build_object(
                  'UserID', u."UserID",
                  'UserName', u."UserName",
                  'ApprovalStatus', mc."ApprovalStatus",
                  'Comment', mc."Comment",
                  'ActionDateTime', mc."ModifiedDate",
                  'WasEscalationPersonNotified', mc."WasEscalationPersonNotified"
              )) AS "CheckerActions"
          FROM (
              SELECT
                  COALESCE("SOPDraftID", "DocumentModuleDraftID") AS "ModuleID",
                  "UserID",
                  "ApprovalStatus",
                  "Comment",
                  "ModifiedDate",
                  "WasEscalationPersonNotified"
              FROM "ModuleCheckers"
          ) mc
          JOIN UserData u ON u."UserID" = mc."UserID"
          GROUP BY mc."ModuleID"
      ),
      AggregatedEscalators AS (
            SELECT
              mc."ModuleID",
              jsonb_agg(jsonb_build_object(
                  'UserID', u."UserID",
                  'UserName', u."UserName",
                  'ApprovalStatus', mc."ApprovalStatus",
                  'Comment', mc."Comment",
                  'ActionDateTime', mc."ModifiedDate"
              )) AS "EscalatorActions"
          FROM (
              SELECT
                  COALESCE("SOPDraftID", "DocumentModuleDraftID") AS "ModuleID",
                  "UserID",
                  "ApprovalStatus",
                  "Comment",
                  "ModifiedDate"
              FROM "ModuleEscalations"
              WHERE "IsReviewer" IS TRUE
          ) mc
          JOIN UserData u ON u."UserID" = mc."UserID"
          GROUP BY mc."ModuleID"
      ),
      AggregatedStackHolderEscalators AS (
            SELECT
              mc."ModuleID",
              jsonb_agg(jsonb_build_object(
                  'UserID', u."UserID",
                  'UserName', u."UserName",
                  'ApprovalStatus', mc."ApprovalStatus",
                  'Comment', mc."Comment",
                  'ActionDateTime', mc."ModifiedDate"
              )) AS "EscalatorActions"
          FROM (
              SELECT
                  COALESCE("SOPDraftID", "DocumentModuleDraftID") AS "ModuleID",
                  "UserID",
                  "ApprovalStatus",
                  "Comment",
                  "ModifiedDate"
              FROM "ModuleEscalations"
              WHERE "IsStakeHolder" IS TRUE
          ) mc
          JOIN UserData u ON u."UserID" = mc."UserID"
          GROUP BY mc."ModuleID"
      ),
      AggregatedStakeHolders AS (
              SELECT
              mc."ModuleID",
              jsonb_agg(jsonb_build_object(
                  'UserID', u."UserID",
                  'UserName', u."UserName",
                  'ApprovalStatus', mc."ApprovalStatus",
                  'Comment', mc."Comment",
                  'ActionDateTime', mc."ModifiedDate",
                  'WasEscalationPersonNotified', mc."WasEscalationPersonNotified"
              )) AS "SteakHolderActions"
          FROM (
              SELECT
                  COALESCE("SOPDraftID", "DocumentModuleDraftID") AS "ModuleID",
                  "UserID",
                  "ApprovalStatus",
                  "Comment",
                  "ModifiedDate",
                  "WasEscalationPersonNotified"
              FROM "ModuleStakeHolders"
          ) mc
          JOIN UserData u ON u."UserID" = mc."UserID"
          GROUP BY mc."ModuleID"
      ),
      AggregatedApprovers AS (
                SELECT
              mc."ModuleID",
              jsonb_agg(jsonb_build_object(
                  'UserID', u."UserID",
                  'UserName', u."UserName",
                  'ApprovalStatus', mc."ApprovalStatus",
                  'Comment', mc."Comment",
                  'ActionDateTime', mc."ModifiedDate"
              )) AS "ApproverActions"
          FROM (
              SELECT
                  COALESCE("SOPDraftID", "DocumentModuleDraftID") AS "ModuleID",
                  "UserID",
                  "ApprovalStatus",
                  "Comment",
                  "ModifiedDate"
              FROM "ModuleApprovers"
          ) mc
          JOIN UserData u ON u."UserID" = mc."UserID"
          GROUP BY mc."ModuleID"
      )

      SELECT
          dmd."ModuleID",
          dmd."ModuleName",
          dmd."DraftVersion",
          dmd."MasterVersion",
          dmd."CreatedDate",
          dmd."NeedAcceptanceFromStakeHolder",
          dmd."NeedAcceptance",
          dmd."NeedAcceptanceForApprover",
          c."CheckerActions",
          s."SteakHolderActions",
          e."EscalatorActions",
          se."EscalatorActions" AS "StackHolderEscalatorActions",
          a."ApproverActions",
          o."AssignedOwner",
          dmd."SelfApproved",
		  dmd."ElementAttributeTypeID",
		  ea."Name" AS "AttributeTypeName"
      FROM DraftModuleDetails dmd
      LEFT JOIN AggregatedOwners o ON o."ModuleID" = dmd."ID"
      LEFT JOIN AggregatedCheckers c ON c."ModuleID" = dmd."ModuleID"
      LEFT JOIN AggregatedEscalators e ON e."ModuleID" = dmd."ModuleID"
      LEFT JOIN AggregatedStackHolderEscalators se ON se."ModuleID" = dmd."ModuleID"
      LEFT JOIN AggregatedStakeHolders s ON s."ModuleID" = dmd."ModuleID"
      LEFT JOIN AggregatedApprovers a ON a."ModuleID" = dmd."ModuleID"
	    LEFT JOIN "ElementAttributeTypes" ea ON ea."ElementAttributeTypeID" = dmd."ElementAttributeTypeID"
      WHERE dmd."ID" = :ModuleID OR dmd."ModuleID" = :ModuleID
      ORDER BY dmd."CreatedDate" ${Order} ${IsLatestOne ? "LIMIT 1" : ""}`,
      {
        replacements: {
          ModuleID: ModuleID,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    if (!data || data.length === 0) {
      return res.status(404).json({ message: "Activity not found" });
    }
    res.status(200).json({
      message: "Activity fetched successfully",
      data,
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

exports.addDocumentComment = async (req, res) => {
  const { currentUserId } = req.payload;
  const {
    DocumentModuleDraftID,
    HighlightedText,
    HighlightedTextPosition,
    CommentText,
    ActionType = "Comment",
  } = req.body;
  try {
    const data = await DocumentModuleDraft.findByPk(DocumentModuleDraftID);
    const draft = JSON.parse(JSON.stringify(data));
    await DocumentModuleComment.create({
      DocumentID: draft.DocumentID,
      MasterVersion: draft.MasterVersion,
      DraftVersion: draft.DraftVersion,
      UserID: currentUserId,
      HighlightedText,
      HighlightedTextPosition,
      CommentText,
      ActionType,
    });
    res.status(201).send({
      message: "Comment Added Successfully",
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};
exports.replayComment = async (req, res) => {
  const { currentUserId } = req.payload;
  const { DocumentModuleCommentID, ReplyText, ActionType = "Reply" } = req.body;
  try {
    const data = await DocumentModuleComment.findByPk(DocumentModuleCommentID);
    if (!data) {
      return res.status(404).json({ message: "Comment not found" });
    }
    const draft = JSON.parse(JSON.stringify(data));
    await DocumentModuleComment.create({
      DocumentID: draft.DocumentID,
      MasterVersion: draft.MasterVersion,
      DraftVersion: draft.DraftVersion,
      ParentCommentID: DocumentModuleCommentID,
      UserID: currentUserId,
      ReplyText,
      ActionType,
    });
    res.status(201).send({
      message: ActionType + " Added Successfully",
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};
exports.updateDocumentComment = async (req, res) => {
  const { currentUserId } = req.payload;
  const {
    DocumentModuleCommentID,
    CommentText,
    HighlightedText,
    HighlightedTextPosition,
  } = req.body;
  try {
    await DocumentModuleComment.update(
      {
        CommentText,
        HighlightedText,
        HighlightedTextPosition,
        ModifiedBy: currentUserId,
        ModifiedDate: literal("CURRENT_TIMESTAMP"),
      },
      {
        where: { DocumentModuleCommentID },
      }
    );
    res.status(200).send({ message: "Comment updated successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.deleteComment = async (req, res) => {
  const { currentUserId } = req.payload;
  const { DocumentModuleCommentID } = req.body;
  try {
    await DocumentModuleComment.destroy({
      where: {
        [Op.or]: [
          { DocumentModuleCommentID },
          { ParentCommentID: DocumentModuleCommentID },
        ],
      },
    });
    res.status(200).send({ message: "Comment deleted successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.ownersElements = async (req, res) => {
  const { currentUserId } = req.payload;
  const { UserID } = req.body;
  try {
    const data = await sequelize.query(
      `
      SELECT sm."SOPID" AS "ModuleID",sm."SOPName" AS "ModuleName",sm."MasterVersion"::TEXT,sm."DraftVersion"::TEXT,'SOP' AS "ModuleType"
      FROM "SopModules" sm WHERE sm."IsDeleted" = false AND sm."CreatedBy" = :UserID
      UNION ALL
      SELECT dm."DocumentID" AS "ModuleID",dm."DocumentName" AS "ModuleName",dm."MasterVersion"::TEXT,dm."DraftVersion"::TEXT,'Document' AS "ModuleType"
      FROM "DocumentModules" dm WHERE dm."IsDeleted" = false AND dm."CreatedBy" = :UserID
      UNION ALL
      SELECT tsm."TrainingSimulationID" AS "ModuleID",tsm."TrainingSimulationName" AS "ModuleName",tsm."MasterVersion"::TEXT,tsm."DraftVersion"::TEXT,'SkillBuilding' AS "ModuleType"
      FROM "TrainingSimulationModules" tsm WHERE tsm."IsDeleted" = false AND tsm."CreatedBy" = :UserID
      UNION ALL
      SELECT tsm2."TestSimulationID" AS "ModuleID",tsm2."TestSimulationName" AS "ModuleName",tsm2."MasterVersion"::TEXT,tsm2."DraftVersion"::TEXT,'SkillAssessment' AS "ModuleType"
      FROM "TestSimulationModules" tsm2 WHERE tsm2."IsDeleted" = false AND tsm2."CreatedBy" = :UserID
      UNION ALL
      SELECT mcq."TestMCQID" AS "ModuleID", mcq."TestMCQName" AS "ModuleName", mcq."MasterVersion"::TEXT, mcq."DraftVersion"::TEXT, 'TestMCQ' AS "ModuleType"
      FROM "TestMcqsModules" mcq WHERE mcq."IsDeleted" = false AND mcq."CreatedBy" = :UserID
      UNION ALL
      SELECT fm."FormID" AS "ModuleID", fm."FormName" AS "ModuleName", fm."MasterVersion"::TEXT, fm."DraftVersion"::TEXT, 'Form' AS "ModuleType"
      FROM "FormModules" fm WHERE fm."IsDeleted" = false AND fm."CreatedBy" = :UserID
      `,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: { UserID },
      }
    );
    res.status(200).send({ data });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.assignCategoryToDepartmentOrRoleOrUsers = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const {
      ContentID = [],
      UserID = [],
      ModuleTypeID,
      StartDate,
      DueDate,
    } = req.body;
    if (ContentID.length == 0 && UserID.length == 0 && !ModuleTypeID) {
      return res.status(400).send({ message: "No/Invalid data provided" });
    }
    const data = await sequelize.query(
      `SELECT u."UserID",url."RoleID",udl."DepartmentID" FROM "Users" u
      INNER JOIN "UserRoleLinks" url on url."UserID" = u."UserID"
      INNER JOIN "UserDeparmentLinks" udl on udl."UserID" = u."UserID"
      WHERE u."UserID" IN (:UserID) AND u."IsDeleted" IS NOT TRUE
      GROUP BY u."UserID",url."RoleID",udl."DepartmentID"
      `,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: {
          UserID: UserID,
        },
      }
    );
    const category = await sequelize.query(
      `WITH RECURSIVE all_children AS (
            SELECT 
                "ContentID", 
                "ParentContentID", 
                "ContentName"
            FROM "ContentStructures"
            WHERE "ParentContentID" IN (:ContentID) AND "ModuleTypeID" = '8db6ea3c-475d-47b7-8d4d-918de1889ef5' AND "IsDeleted" = false

            UNION ALL

            SELECT 
                cs."ContentID", 
                cs."ParentContentID", 
                cs."ContentName"
            FROM "ContentStructures" cs
            INNER JOIN all_children ac ON cs."ParentContentID" = ac."ContentID"
        ) 
        SELECT * FROM all_children;
      `,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: {
          ContentID: ContentID,
        },
      }
    );
    const allContentIds = [...ContentID, ...category.map((c) => c.ContentID)];
    const assignCategoryBulkData = [];
    for (const cs of allContentIds) {
      for (const ud of data) {
        assignCategoryBulkData.push({
          UserID: ud.UserID,
          RoleID: ud.RoleID,
          ContentID: cs,
          DepartmentID: ud.DepartmentID,
          ModuleTypeID: ModuleTypeID,
          StartDate,
          DueDate,
          CreatedBy: currentUserId,
        });
      }
    }
    await UserCategoryLink.bulkCreate(assignCategoryBulkData, {
      ignoreDuplicates: true,
    });
    res.status(200).send({
      message: "Assigning categories to departments, roles, and users",
    });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.moduleOwnerChange = async (req, res) => {
  const { currentUserId } = req.payload;
  const {
    ElementID = [],
    OldOwnerID,
    NewOwnerID,
    ChangeReason = null,
  } = req.body;
  const t = await sequelize.transaction();
  try {
    if (ElementID.length == 0 || !OldOwnerID || !NewOwnerID) {
      res.status(400).send({ message: "No/Invalid data provided" });
      return;
    }
    const Elements = await sequelize.query(
      `SELECT "ModuleID", "ModuleTypeID","CreatedDate" FROM (
        SELECT "SOPID" AS "ModuleID", "ModuleTypeID","CreatedDate" FROM "SopModules" WHERE "SOPID" IN (:ElementID) AND "IsDeleted" IS NOT TRUE
        UNION ALL
        SELECT "DocumentID" AS "ModuleID", "ModuleTypeID","CreatedDate" FROM "DocumentModules" WHERE "DocumentID" IN (:ElementID) AND "IsDeleted" IS NOT TRUE
        UNION ALL
        SELECT "TrainingSimulationID" AS "ModuleID", "ModuleTypeID","CreatedDate" FROM "TrainingSimulationModules" WHERE "TrainingSimulationID" IN (:ElementID) AND "IsDeleted" IS NOT TRUE
        UNION ALL
        SELECT "TestSimulationID" AS "ModuleID", "ModuleTypeID","CreatedDate" FROM "TestSimulationModules" WHERE "TestSimulationID" IN (:ElementID) AND "IsDeleted" IS NOT TRUE
        UNION ALL
        SELECT "TestMCQID" AS "ModuleID", "ModuleTypeID","CreatedDate" FROM "TestMcqsModules" WHERE "TestMCQID" IN (:ElementID) AND "IsDeleted" IS NOT TRUE
        UNION ALL
        SELECT "FormID" AS "ModuleID", "ModuleTypeID","CreatedDate" FROM "FormModules" WHERE "FormID" IN (:ElementID) AND "IsDeleted" IS NOT TRUE
      ) AS Modules`,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: { ElementID },
      }
    );

    const ownerData = [];
    for (const el of Elements) {
      ownerData.push({
        ModuleID: el.ModuleID,
        ModuleTypeID: el.ModuleTypeID,
        OldOwnerID,
        NewOwnerID,
        ModuleCreatedDate: el.CreatedDate,
        ChangeReason,
        CreatedBy: currentUserId,
      });
    }
    await ModuleOwnerChange.bulkCreate(ownerData, { transaction: t });
    await sequelize.query(
      `UPDATE "SopModules" SET "CreatedBy" = :NewOwnerID WHERE "SOPID" IN (:ElementID) AND "CreatedBy" = :OldOwnerID AND "IsDeleted" IS NOT TRUE;
      UPDATE "DocumentModules" SET "CreatedBy" = :NewOwnerID WHERE "DocumentID" IN (:ElementID) AND "CreatedBy" = :OldOwnerID AND "IsDeleted" IS NOT TRUE;
      UPDATE "TrainingSimulationModules" SET "CreatedBy" = :NewOwnerID WHERE "TrainingSimulationID" IN (:ElementID) AND "CreatedBy" = :OldOwnerID AND "IsDeleted" IS NOT TRUE;
      UPDATE "TestSimulationModules" SET "CreatedBy" = :NewOwnerID WHERE "TestSimulationID" IN (:ElementID) AND "CreatedBy" = :OldOwnerID AND "IsDeleted" IS NOT TRUE;
      UPDATE "TestMcqsModules" SET "CreatedBy" = :NewOwnerID WHERE "TestMCQID" IN (:ElementID) AND "CreatedBy" = :OldOwnerID AND "IsDeleted" IS NOT TRUE;
      UPDATE "FormModules" SET "CreatedBy" = :NewOwnerID WHERE "FormID" IN (:ElementID) AND "CreatedBy" = :OldOwnerID AND "IsDeleted" IS NOT TRUE;
      UPDATE "SopModuleDrafts" SET "CreatedBy" = :NewOwnerID WHERE "SOPID" IN (:ElementID) AND "CreatedBy" = :OldOwnerID AND "IsDeleted" IS NOT TRUE;
      UPDATE "DocumentModuleDrafts" SET "CreatedBy" = :NewOwnerID WHERE "DocumentID" IN (:ElementID) AND "CreatedBy" = :OldOwnerID AND "IsDeleted" IS NOT TRUE;
      UPDATE "TrainingSimulationModuleDrafts" SET "CreatedBy" = :NewOwnerID WHERE "TrainingSimulationID" IN (:ElementID) AND "CreatedBy" = :OldOwnerID AND "IsDeleted" IS NOT TRUE;
      UPDATE "TestSimulationModuleDrafts" SET "CreatedBy" = :NewOwnerID WHERE "TestSimulationID" IN (:ElementID) AND "CreatedBy" = :OldOwnerID AND "IsDeleted" IS NOT TRUE;
      UPDATE "TestMcqsModuleDrafts" SET "CreatedBy" = :NewOwnerID WHERE "TestMCQID" IN (:ElementID) AND "CreatedBy" = :OldOwnerID AND "IsDeleted" IS NOT TRUE;
      UPDATE "FormModuleDrafts" SET "CreatedBy" = :NewOwnerID WHERE "FormID" IN (:ElementID) AND "CreatedBy" = :OldOwnerID AND "IsDeleted" IS NOT TRUE;      
      `,
      {
        replacements: {
          NewOwnerID,
          OldOwnerID,
          ElementID,
        },
        transaction: t,
      }
    );
    res.status(200).send({ message: "Module owner changed successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.auditorMessage = async (req, res) => {
  const { currentUserId } = req.payload;
  const { ModuleDraftID, CommentText, ActionType = "Message" } = req.body;
  try {
    if (!ModuleDraftID || !CommentText) {
      return res
        .status(400)
        .send({ message: "ModuleDraftID and CommentText are required" });
    }
    let data = await DocumentModuleDraft.findByPk(ModuleDraftID);
    if (!data) {
      data = await SopModuleDraft.findByPk(ModuleDraftID);
    }
    const draft = JSON.parse(JSON.stringify(data));
    await AuditorComment.create({
      ModuleID: draft?.DocumentModuleDraftID || draft?.SOPDraftID,
      MasterVersion: draft?.MasterVersion,
      DraftVersion: draft?.DraftVersion,
      CommentText,
      ActionType,
      UserID: currentUserId,
    });
    res.status(200).send({ message: "Message added successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.sopAttachmentDocs = async (req, res) => {
  const { currentUserId } = req.payload;
  const { SOPDraftID } = req.body;
  try {
    const sop = await SopModuleDraft.findByPk(SOPDraftID, {
      attributes: [
        "SOPID",
        "SOPName",
        "MasterVersion",
        "DraftVersion",
        "SOPXMLElement",
      ],
      include: {
        model: SopDetails,
        as: "SopDetails",
        attributes: [
          "SopShapeID",
          "AttachmentIcon",
          "HeaderProperties",
          "FooterProperties",
        ],
        required: false,
        include: {
          model: SopAttachmentLinks,
          as: "SopAttachmentLinks",
          required: false,
          attributes: ["ContentLinkTitle", "ContentLink", "ContentLinkType"],
        },
      },
    });
    if (!sop) {
      return res.status(404).send({ message: "SOP not found" });
    }
    const data = JSON.parse(JSON.stringify(sop));
    const xmlJson = convertXML(data.SOPXMLElement);
    const linkNamewithId = [],
      roleIds = [];
    const getStepNameWithId = async (arrayData) => {
      const queue = [...arrayData]; // Initialize queue with top-level items
      let index = 0; // Pointer for efficient queue processing

      while (index < queue.length) {
        const node = queue[index++];

        // Check if this node contains a bpmn:task
        if (node["bpmn:task"]) {
          linkNamewithId.push({
            id: node["bpmn:task"].id,
            name: node["bpmn:task"].name,
          });
        }

        // Process children of all node properties
        Object.values(node).forEach((value) => {
          if (value && typeof value === "object" && !Array.isArray(value)) {
            // Check for direct children array
            if (Array.isArray(value.children)) {
              queue.push(...value.children);
            }
            // Also check for children in nested objects (like bpmn:process)
            Object.values(value).forEach((nestedValue) => {
              if (
                nestedValue &&
                typeof nestedValue === "object" &&
                Array.isArray(nestedValue.children)
              ) {
                queue.push(...nestedValue.children);
              }
            });
          }
        });
      }
    };

    // Usage
    await getStepNameWithId(xmlJson["bpmn:definitions"].children);
    delete data.SOPXMLElement; // Remove SOPXMLElement from the response
    for (const el of data.SopDetails) {
      el.StepName = linkNamewithId.find(
        (link) => link.id === el.SopShapeID
      )?.name;
      if (el.FooterProperties?.roles.length > 0) {
        roleIds.push(...el.FooterProperties.roles);
      }
    }
    const roleData = await Roles.findAll({
      where: {
        RoleID: roleIds,
      },
      attributes: ["RoleID", "RoleName"],
    });
    data.SopDetails.forEach((el) => {
      if (el.FooterProperties?.roles.length > 0) {
        el.FooterProperties.roles = el.FooterProperties.roles
          .map((roleId) => {
            const role = JSON.parse(JSON.stringify(roleData)).find(
              (r) => r.RoleID === roleId
            );
            return role
              ? { RoleID: role.RoleID, RoleName: role.RoleName }
              : null;
          })
          .filter((role) => role !== null);
      }
    });

    return res.status(200).send({ data });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.documentReadingTimerReport = async (req, res) => {
  const { currentUserId } = req.payload;
  const { DocumentID, StartDate = null, EndDate = null } = req.body;

  try {
    const where = {};
    if (StartDate && EndDate) {
      where.CreatedDate = {
        [Op.between]: [
          new Date(StartDate).toISOString(),
          moment(EndDate).endOf("day").toDate(),
        ],
      };
    } else if (StartDate) {
      where.CreatedDate = { [Op.gte]: new Date(StartDate).toISOString() };
    } else if (EndDate) {
      where.CreatedDate = { [Op.lte]: moment(EndDate).endOf("day").toDate() };
    }

    const commonWhere = {
      ...where,
      UserID: currentUserId,
      DocumentID,
      DocumentModuleDraftID: {
        [Op.eq]: sequelize.literal(`(
          SELECT "DocumentModuleDraftID"
          FROM "DocumentModuleDrafts"
          WHERE "DocumentID" = '${DocumentID}'
            AND "IsDeleted" IS NOT TRUE
            AND "DocumentStatus" = 'Published'
          ORDER BY "CreatedDate" DESC
          LIMIT 1
        )`),
      },
    };

    const highestTime = await DocumentReadingTimer.findOne({
      where: commonWhere,
      order: [
        ["Hours", "DESC"],
        ["Minutes", "DESC"],
        ["Seconds", "DESC"],
      ],
      attributes: [
        "DocumentReadingTimerID",
        "DocumentID",
        "DocumentModuleDraftID",
        "MasterVersion",
        "DraftVersion",
        "UserID",
        "NoOfPageRead",
        "Days",
        "Hours",
        "Minutes",
        "Seconds",
        "StartDateAndTime",
        "EndDateAndTime",
        [
          sequelize.literal(`(
          SELECT "DocumentName"
          FROM "DocumentModuleDrafts"
          WHERE "DocumentModuleDraftID" = "DocumentReadingTimer"."DocumentModuleDraftID"
        )`),
          "DocumentName",
        ],
      ],
    });

    const highestPage = await DocumentReadingTimer.findOne({
      where: commonWhere,
      order: [["NoOfPageRead", "DESC"]],
      attributes: [
        "DocumentReadingTimerID",
        "DocumentID",
        "DocumentModuleDraftID",
        "MasterVersion",
        "DraftVersion",
        "UserID",
        "NoOfPageRead",
        "Days",
        "Hours",
        "Minutes",
        "Seconds",
        "StartDateAndTime",
        "EndDateAndTime",
        [
          sequelize.literal(`(
          SELECT "DocumentName"
          FROM "DocumentModuleDrafts"
          WHERE "DocumentModuleDraftID" = "DocumentReadingTimer"."DocumentModuleDraftID"
        )`),
          "DocumentName",
        ],
      ],
    });

    return res.status(200).send({
      data: {
        highestPage,
        highestTime,
      },
    });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message || error.message,
    });
  }
};

exports.createSopTemplate = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const {
      TemplateID = null,
      TemplateName,
      TemplateDescription = null,
      IsActive = true,
      TemplateXMLElement,
      TemplateFontFamly,
      TemplateFooter,
      TemplateHeader,
    } = req.body;
    if (TemplateID) {
      await SopTemplate.update(
        {
          TemplateName,
          TemplateDescription,
          IsActive,
          TemplateXMLElement,
          TemplateFontFamly,
          TemplateFooter,
          TemplateHeader,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: {
            TemplateID,
          },
        }
      );
      return res.status(201).send({
        message: "Template Update Successfully",
      });
    }
    await SopTemplate.create({
      TemplateName,
      TemplateDescription,
      IsActive,
      TemplateXMLElement,
      TemplateFontFamly,
      TemplateFooter,
      TemplateHeader,
      OrganizationStructureID: lincense?.EnterpriseID,
      CreatedBy: currentUserId,
    });
    res.status(201).send({
      message: "Template Created Successfully",
    });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.getSopTemplateAll = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const data = await SopTemplate.findAll({
      where: {
        OrganizationStructureID: lincense?.EnterpriseID,
      },
      attributes: [
        "TemplateID",
        "TemplateName",
        "TemplateXMLElement",
        "TemplateFontFamly",
        "TemplateFooter",
        "TemplateHeader",
        "CreatedDate",
      ],
    });
    res.status(201).send({
      data,
    });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};

exports.SopTemplatelsById = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  const { TemplateID } = req.params;
  try {
    const data = await SopTemplate.findOne({
      where: {
        TemplateID,
        OrganizationStructureID: lincense?.EnterpriseID,
      },
      attributes: [
        "TemplateID",
        "TemplateName",
        "TemplateDescription",
        "TemplateXMLElement",
        "TemplateFontFamly",
        "TemplateFooter",
        "TemplateHeader",
        "CreatedDate",
      ],
    });
    res.status(201).send({
      data,
    });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
