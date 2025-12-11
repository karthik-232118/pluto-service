const { Op } = require("sequelize");
const Token = require("../../model/Token");
const Users = require("../../model/Users");
const { comparePassword } = require("../services/passwordHash");
const { sequelize } = require("../../model");
const { decryptedData } = require("../services/encription");
const UserAuthenticationLogs = require("../../model/UserAuthenticationLogs");
const { getSystemAndOrganizationInfoKey } = require("../../controller/system/system.controller");
const { getSystemInfo } = require("../services/systemInfo");

exports.verifyUser = async (req, res, next) => {
  try {
    const { UserName, Password } = req.body;
    const user = await Users.findOne({
      where: { UserName: UserName, IsDeleted: false },
    });
    if (!user) {
      res.status(404).send({ message: "User not registerd/invalid !" });
      return;
    }
    if (!user.IsActive) {
      res.status(403).send({ message: "User is not active!" });
      return;
    }
    const isMatch = comparePassword(Password, user.Password);
    if (!isMatch) {
      res.status(404).send({ message: "Wrong password entered !" });
      return;
    }
    await UserAuthenticationLogs.update(
      {
        LogoutDateTime: new Date().toISOString(),
        IsActive: false,
      },
      {
        where: {
          UserID: user.UserID,
          LogoutDateTime: null,
        },
      }
    );
    await Token.destroy({
      where: {
        userId: user.UserID,
      },
    });
    const keyResp = await sequelize.query(`
            SELECT osl."LicenseKey"
            FROM "UserUnitLinks" uosl
            RIGHT JOIN "OrganizationStructures" os ON os."OrganizationStructureID" = uosl."OrganizationStructureID"
            RIGHT JOIN "OrganizationStructures" os2 ON os2."OrganizationStructureID" = os."ParentID"
            RIGHT JOIN "OrganizationStructures" os3 ON os3."OrganizationStructureID" = os2."ParentID"
            RIGHT JOIN "OrganizationStructureLicenses" osl ON osl."OrganizationStructureID" = os3."OrganizationStructureID"
            WHERE uosl."UserID" = '${user.UserID}';
            `);
    if (!keyResp[0]?.length) {
      res
        .status(403)
        .send({ message: "User don't have any license Organization!" });
      return;
    }
    let isValidLicense = false;
    let lincense = {};
    for (const el of keyResp[0]) {
      const license = JSON.parse(decryptedData(el.LicenseKey));
      if (
        new Date(license.ValidityTo).setHours(23, 59, 59) > new Date().getTime()
      ) {
        lincense = license;
        isValidLicense = true;
      }
    }
    if (isValidLicense === false) {
      res.status(403).send({ message: "Your License is expired!" });
      return;
    }
    await UserAuthenticationLogs.create({
      UserID: user.UserID,
      LoginDateTime: new Date(),
      LoginIP: req.ip,
      BrowserInfo: req.headers["user-agent"],
      OperatingSystemInfo: req.headers["operating-system"],
    });
    req.body.user = user;
    next();
  } catch (error) {
    res.status(404).send({ message: error.message });
  }
};
exports.authUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    // console.log(req.headers['content-type'])
    if (!token) {
      res.status(401).send({ message: "No token provided!" });
      return;
    }
    const dataList = await sequelize.query(
      `
            WITH RankedLicenses AS (
                SELECT 
                    *,
                    ROW_NUMBER() OVER (
                        PARTITION BY "OrganizationStructureID" 
                        ORDER BY "CreatedDate" DESC
                    ) AS rank
                FROM "OrganizationStructureLicenses"
            )
            SELECT 
                u."UserID",
                u."UserType",
                ud."UserEmail",
                ud."SOPState",
                uosl."OrganizationStructureID",
                rl."LicenseKey" AS "LicenseKeys"
            FROM "Users" u
            INNER JOIN "UserDetails" ud
                ON ud."UserID" = u."UserID"
            INNER JOIN "Tokens" t
                ON u."UserID" = t."userId"
            LEFT JOIN "UserOrganizationStructureLinks" uosl
                ON uosl."UserID" = u."UserID"
            LEFT JOIN RankedLicenses rl
                ON rl."OrganizationStructureID" = uosl."OrganizationStructureID" 
                AND rl.rank = 1
            WHERE t."accessToken" = :accessToken
            GROUP BY 
                u."UserID", 
                u."UserType", 
                ud."UserEmail", 
                ud."SOPState", 
                uosl."OrganizationStructureID", 
                rl."LicenseKey";
`,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: { accessToken: token.split(" ")[1] },
      }
    );

    const data = dataList[0];
    if (!data) {
      res
        .status(401)
        .send({ message: "Session has Terminated due to new Login !" });
      return;
    }

    if (!data?.LicenseKeys && data.UserType != "Admin") {
      res
        .status(403)
        .send({ message: "User don't have any Organization license!" });
      return;
    }
    let license = {};
    function checkMacAddressMatch(macInterfaces, licence) {
      // Create a Set of all licence MACs for fast lookup
      const licenceMacSet = new Set();
      for (const interfaceName in licence.MacInterFaces) {
        licence.MacInterFaces[interfaceName].forEach(mac => licenceMacSet.add(mac));
      }

      // Check if any device MAC exists in the licence Set
      for (const interfaceName in macInterfaces) {
        if (macInterfaces[interfaceName].some(mac => licenceMacSet.has(mac))) {
          return true;
        }
      }

      return false;
    }
    if (data.LicenseKeys) {
      license = JSON.parse(decryptedData(data.LicenseKeys));
      const {
        macInterfaces,
        hostname,
        machineId,
        hddSerial,
        osSerial
      } = await getSystemInfo();
      // const macStatus = checkMacAddressMatch(macInterfaces, license);
      // if (macStatus && license.HostName != hostname && license.MachineUUID != machineId.MachineUUID && license.DriveSerialNumber != hddSerial && license.OSSerialNumber != osSerial) {
      //   res.status(403).send({
      //     message: "Your system is not authorized to use this license!",
      //   });
      // }
      if (
        new Date(license.ValidityTo).setHours(23, 59, 59) < new Date().getTime()
      ) {
        if (data.UserType != "Admin") {
          res.status(403).send({
            message: "Your License is expired! Please Contact Admistrator",
          });
          return;
        } else {
          license = {};
        }
      }
    }
    let extendedLicenses = license;
    if (!extendedLicenses?.EnterpriseID) {
      extendedLicenses.EnterpriseID = data?.OrganizationStructureID;
    }
    req["payload"] = {
      currentUserId: data.UserID,
      currentUserType: data?.UserType,
      currentUserEmail: data?.UserEmail,
      currentUserSOPState: data?.SOPState,
      lincense: extendedLicenses,
      ModuleTypeIDs: extendedLicenses?.ModuleTypeIDs,
      accessToken: token.split(" ")[1],
    };

    next();
  } catch (error) {
    res.status(404).send({ message: error.message });
  }
};
exports.generatePayload = async (req, res, next) => {
  try {
    req.body["client_secret"] = process.env.AUTH2_CLIENT_SECRET;
    next();
  } catch (error) {
    res.status(404).send({ message: error.message });
  }
};

exports.handleAuthLoginResponse = async (req, res, next) => {
  try {
    const originalResponse = res.status(200).send;
    res.status(200).send = async function (data) {
      const resp = await Users.findByPk(data.userId, {
        attributes: ["UserType"],
      });
      const user = JSON.parse(JSON.stringify(resp));
      data["user_type"] = user?.UserType;
      originalResponse.call(this, data);
    };
    next();
  } catch (error) {
    res.status(404).send({ message: error.message });
  }
};

exports.adminAuth = async (req, res, next) => {
  try {
    const { currentUserType } = req.payload;
    if (currentUserType === "Admin") {
      next();
    } else {
      res.status(403).send({ message: "Unauthorized Admin" });
    }
  } catch (error) {
    res.status(404).send({ message: error.message });
  }
};
exports.processOwnerAuth = async (req, res, next) => {
  try {
    const { currentUserType } = req.payload;
    if (currentUserType === "ProcessOwner") {
      next();
    } else {
      res.status(403).send({ message: "Unauthorized ProcessOwner" });
    }
  } catch (error) {
    res.status(404).send({ message: error.message });
  }
};
exports.endUserAuth = async (req, res, next) => {
  try {
    const { currentUserType } = req.payload;
    if (currentUserType === "EndUser") {
      next();
    } else {
      res.status(403).send({ message: "Unauthorized EndUser" });
    }
  } catch (error) {
    res.status(404).send({ message: error.message });
  }
};
exports.handleLogout = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    // console.log(req.headers['content-type'])
    if (!token) {
      res.status(401).send({ message: "No token provided!" });
      return;
    }
    const data = await Token.findOne({
      where: { accessToken: token.split(" ")[1] },
      attributes: ["userId"],
    });
    if (!data) {
      res
        .status(401)
        .send({ message: "Session has Terminated due to new Login !" });
      return;
    }
    await UserAuthenticationLogs.update(
      {
        LogoutDateTime: new Date().toISOString(),
        IsActive: false,
      },
      {
        where: {
          UserID: data.userId,
          LogoutDateTime: null,
        },
      }
    );
    await Token.destroy({
      where: { userId: data.userId },
    });
    next();
  } catch (error) {
    res.status(404).send({ message: error.message });
  }
};
