const { literal, Op } = require("sequelize");
const Settings = require("../../model/Settings");
const { logger } = require("../../utils/services/logger");
const {
  encryptedData,
  decryptedData,
} = require("../../utils/services/encription");
const OrganizationStructure = require("../../model/OrganizationStructure");
const Enterprise = require("../../model/MaterEnterprisesList");
const OrganizationStructureType = require("../../model/OrganizationStructureType");
const Licenses = require("../../model/Licenses");
const { sequelize } = require("../../model");
const Users = require("../../model/Users");
const UserDetails = require("../../model/UserDetails");
const UserOrganizationStructureLink = require("../../model/UserOrganizationStructureLink");
const { generatePasswordHash } = require("../../utils/services/passwordHash");
const Client = require("../../model/Client");
const { getSystemInfo } = require("../../utils/services/systemInfo");

exports.updateSystemConfigure = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const reqData = req.body;
    for (const [key, value] of Object.entries(reqData)) {
      if (!value) {
        continue;
      }
      const data = await Settings.count({
        where: {
          SettingsKey: key,
          EnterpriseID: lincense?.EnterpriseID,
        },
      });
      if (!data) {
        await Settings.create(
          {
            SettingsKey: key,
            SettingsValue: value,
            CreatedBy: currentUserId,
            EnterpriseID: lincense?.EnterpriseID,
          },
          { returning: false }
        );
      } else if (data) {
        await Settings.update(
          {
            SettingsValue: value,
            ModifiedBy: currentUserId,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              SettingsKey: key,
              EnterpriseID: lincense?.EnterpriseID,
            },
          },
          { returning: false }
        );
      }
    }
    res
      .status(200)
      .send({ message: "System configuration updated successfully" });
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

exports.getSystemConfigure = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const data = await Settings.findAll({
      where: {
        EnterpriseID: lincense?.EnterpriseID,
      },
      attributes: ["SettingsKey", "SettingsValue"],
    });
    const dataJson = {};
    for (const el of JSON.parse(JSON.stringify(data))) {
      dataJson[el.SettingsKey] = el.SettingsValue;
    }
    res.status(200).send({ data: dataJson });
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

exports.getSystemAndOrganizationInfoKey = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const {
      macInterfaces,
      hostname,
      machineId,
      hddSerial,
      osSerial,
    } = await getSystemInfo()
    const {
      OrganizationStructureName,
      OrganizationStructureDescription,
      OrganizationStructureEmail,
      OrganizationStructureToken,
    } = await OrganizationStructure.findOne({
      where: {
        OrganizationStructureID: lincense?.EnterpriseID,
      },
      attributes: [
        "OrganizationStructureName",
        "OrganizationStructureDescription",
        "OrganizationStructureEmail",
        "OrganizationStructureToken",
      ],
    });
    const data = JSON.stringify({
      EnterpriseID: lincense?.EnterpriseID,
      MacInterFaces: macInterfaces,
      HostName: hostname,
      MachineUUID: machineId.MachineUUID,
      DriveSerialNumber: hddSerial,
      OSSerialNumber: osSerial,
      OrganizationStructureName,
      OrganizationStructureDescription,
      OrganizationStructureEmail,
      OrganizationStructureToken,
    });
    res.status(200).send({
      EncryptedKey: encryptedData(data)
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

exports.decriptSystemInfo = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { EncryptedKey } = req.body;
    const orgData = decryptedData(EncryptedKey);
    const data = JSON.parse(orgData);
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

exports.addOrUpdateOrganizationInfo = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    let {
      EnterpriseName,
      EnterpriseDescription,
      IsActive,
      EnterpriseEmail,
      EnterpriseID,
      EnterpriseToken,
      MacInterFaces = null,
      HostName = null,
      MachineUUID = null,
      DriveSerialNumber = null,
      OSSerialNumber = null
    } = req.body;
    const org = await Enterprise.count({
      where: {
        EnterpriseID: EnterpriseID ? EnterpriseID : null,
      },
    });
    if (org) {
      await Enterprise.update(
        {
          EnterpriseName,
          EnterpriseDescription,
          IsActive,
          EnterpriseEmail,
          ModifiedBy: currentUserId,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: {
            EnterpriseID,
          },
        }
      );
      await OrganizationStructure.update({
        OrganizationStructureName: EnterpriseName,
        OrganizationStructureDescription: EnterpriseDescription,
        OrganizationStructureEmail: EnterpriseEmail,
        ModifiedBy: currentUserId,
        ModifiedDate: literal("CURRENT_TIMESTAMP"),
      }, {
        where: {
          OrganizationStructureID: EnterpriseID
        }
      });
    } else {
      const { OrganizationStructureTypeID } =
        await OrganizationStructureType.findOne({
          attributes: ["OrganizationStructureTypeID"],
        });
      if (!EnterpriseID) {
        const { OrganizationStructureID } = await OrganizationStructure.create({
          OrganizationStructureName: EnterpriseName,
          OrganizationStructureDescription: EnterpriseDescription,
          OrganizationStructureTypeID,
          OrganizationStructureEmail: EnterpriseEmail,
          CreatedBy: currentUserId,
        });
        EnterpriseID = OrganizationStructureID;
      }

      await Enterprise.create(
        {
          EnterpriseID,
          EnterpriseName,
          EnterpriseDescription,
          IsActive,
          EnterpriseEmail,
          EnterpriseToken,
          EnterpriseTypeID: OrganizationStructureTypeID,
          MacInterFaces,
          HostName,
          MachineUUID,
          DriveSerialNumber,
          OSSerialNumber,
          CreatedBy: currentUserId,
        },
        { returning: false }
      );
    }
    res
      .status(200)
      .send({ message: "Organization information updated successfully" });
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
exports.getOrganizationTypes = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const data = await OrganizationStructureType.findAll({
      attributes: [
        "OrganizationStructureTypeID",
        "OrganizationStructureTypeName",
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
exports.getEnterpriseList = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    // const data = await Enterprise.findAll({
    //   attributes: {
    //     exclude: [
    //       "CreatedBy",
    //       "CreatedDate",
    //       "ModifiedBy",
    //       "ModifiedDate",
    //       "IsDeleted",
    //       "DeletedBy",
    //       "DeletedDate",
    //     ],
    //   },
    //   where: {
    //     IsDeleted: false,
    //   },
    // });
    const data = await sequelize.query(
      `SELECT * FROM (      
      SELECT "EnterpriseID", "EnterpriseName", "EnterpriseDescription", "IsActive",
      "EnterpriseTypeID", "EnterpriseEmail", "EnterpriseToken", "MacInterFaces",
      "HostName", "MachineUUID", "DriveSerialNumber", "OSSerialNumber","CreatedDate",'ClykOps' AS "EnterpriseType"
      FROM "Enterprises" WHERE "IsDeleted" = false
      UNION ALL
      SELECT "ClientID" AS "EnterpriseID", "ClientName" AS "EnterpriseName",
      "Description" AS "EnterpriseDescription", "IsActive",
      NULL AS "EnterpriseTypeID", "Email" AS "EnterpriseEmail",
      "UniqueKey" AS "EnterpriseToken", "MacInterFaces", "HostName",
      "MachineUUID", "DriveSerialNumber", "OSSerialNumber","CreatedDate",'ScreenerStudio' AS "EnterpriseType"
      FROM "SticherLincencesClients" WHERE "IsDeleted" = false
    ) AS combined_data 
      ORDER BY "CreatedDate" DESC`,
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
exports.deleteEnterprise = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { EnterpriseID } = req.body;
    await Enterprise.update(
      {
        IsDeleted: true,
        DeletedBy: currentUserId,
        DeletedDate: literal("CURRENT_TIMESTAMP"),
      },
      {
        where: {
          EnterpriseID,
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
exports.getLatestLicences = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const data = await Licences.findAll({
      where: {},
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

exports.getExistingLicenseDetails = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const { EnterpriseID, IsExtendedLicense } = req.body;
    if (IsExtendedLicense) {
      const data = await Licenses.findOne({
        where: {
          EnterpriseID,
        },
        order: [["ValidityTo", "DESC"]],
      });
      res.status(200).send({ data });
    } else {
      const data = await Licenses.findOne({
        where: {
          EnterpriseID,
          ValidityFrom: { [Op.lte]: literal("CURRENT_TIMESTAMP") },
          ValidityTo: { [Op.gte]: literal("CURRENT_TIMESTAMP") },
        },
        order: [["CreatedDate", "DESC"]],
      });

      res.status(200).send({ data });
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
exports.enterprisesWiseAdminList = async (req, res) => {
  const { currentUserId } = req.payload;
  try {
    const data = await sequelize.query(
      `SELECT u."UserID", u."UserName",ud."UserFirstName",ud."UserMiddleName",ud."UserLastName",
            ud."UserEmail",ud."UserPhoto",os."OrganizationStructureName" FROM "Users" u
            INNER JOIN "UserDetails" ud ON ud."UserID" = u."UserID"
            INNER JOIN "UserOrganizationStructureLinks" uosl ON uosl."UserID" = u."UserID"
            INNER JOIN "OrganizationStructures" os ON os."OrganizationStructureID" = uosl."OrganizationStructureID"
            WHERE u."UserType" = 'Admin' AND u."IsDeleted" = false `,
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
exports.addInitialAdminUser = async (req, res) => {
  const { currentUserId } = req.payload;
  const {
    UserName,
    UserEmail,
    Password,
    Name,
    OrganizationStructureID,
    UserPhoneNumber,
  } = req.body;
  try {
    const userCount = await Users.count({
      include: {
        model: UserOrganizationStructureLink,
        where: {
          OrganizationStructureID,
        },
        required: true,
      },
    });
    if (userCount > 0) {
      return res
        .status(423)
        .send({
          message: "Admin user already exist for the selected organization",
        });
    }
    const client = await Client.findOne();
    const user = await Users.create(
      {
        UserName,
        Password: generatePasswordHash(Password),
        UserType: "Admin",
        ClientId: client?.id,
        CreatedBy: currentUserId,
      },
      { returning: true }
    );
    const [UserFirstName, UserMiddleName, UserLastName] = Name.split(" ");
    await UserDetails.create(
      {
        UserID: user.UserID,
        UserFirstName,
        UserMiddleName,
        UserLastName,
        UserEmail,
        UserPhoto: null,
        UserPhoneNumber,
        UserAddress: "not added",
        Gender: "male",
        CreatedBy: currentUserId,
        UserEmployeeNumber: literal("FLOOR(random() * 100 + 1)"),
      },
      { returning: true }
    );
    await UserOrganizationStructureLink.create(
      {
        UserID: user.UserID,
        OrganizationStructureID,
        CreatedBy: currentUserId,
      },
      { returning: true }
    );
    res.status(200).send({ message: "Admin user created successfully" });
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

exports.updateCloudeConfig = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const reqData = req.body;
    for (const [key, value] of Object.entries(reqData)) {
      if (!value) {
        continue;
      }
      const data = await Settings.count({
        where: {
          SettingsKey: key,
          EnterpriseID: lincense?.EnterpriseID,
        },
      });
      const encriptValue = encryptedData(value);
      if (!data) {
        await Settings.create(
          {
            SettingsKey: key,
            SettingsValue: encriptValue,
            CreatedBy: currentUserId,
            EnterpriseID: lincense?.EnterpriseID,
          },
          { returning: false }
        );
      } else if (data) {
        await Settings.update(
          {
            SettingsValue: encriptValue,
            ModifiedBy: currentUserId,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              SettingsKey: key,
              EnterpriseID: lincense?.EnterpriseID,
            },
          },
          { returning: false }
        );
      }
    }
    res
      .status(200)
      .send({ message: "System configuration updated successfully" });
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
