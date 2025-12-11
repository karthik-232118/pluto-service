const { Op, Sequelize, literal, QueryTypes } = require("sequelize");
const { sequelize } = require("../../model");
const moment = require("moment");
const path = require("path");
require("dotenv").config();
const { logger } = require("../../utils/services/logger");
const jwt = require("jsonwebtoken");
const Users = require("../../model/Users");
const bcrypt = require("bcrypt");
const UserDetails = require("../../model/UserDetails");
const UserOrganizationStructureLink = require("../../model/UserOrganizationStructureLink");
const UserLicenseLink = require("../../model/UserLicenseLink");

exports.login = async (req, res) => {
  const t = await sequelize.transaction();

  const { UserName, Password, FolderPath, ClientInfo } = req.body;


  try {
    let user = await Users.findOne({
      attributes: ["UserID", "UserName", "Password", "UserType", "IsActive"],
      where: { UserName: UserName, IsDeleted: false },
    });

    if (user) {
      if (!user.IsActive) {
        await t.rollback();
        return res.status(401).send({
          message: "User is inactive!",
        });
      }

      const passwordIsValid = bcrypt.compareSync(Password, user.Password);
      if (!passwordIsValid) {
        await t.rollback();
        return res.status(401).send({
          message: "Invalid password!",
        });
      }

      if (user.UserType !== "Admin" && user.UserType !== "ProcessOwner") {
        await t.rollback();
        return res.status(401).send({
          message: "User is not authorized to use desktop client",
        });
      }

      const userOrganizationID = await UserOrganizationStructureLink.findOne({
        attributes: ["OrganizationStructureID"],
        where: { UserID: user.UserID },
      });
      const userLicenseID = await UserLicenseLink.findOne({
        attributes: ["LicenseID"],
        where: { UserID: user.UserID },
      });

      const tokenData = {
        UserID: user.UserID,
        UserName: user.UserName,
        UserType: user.UserType,
        FolderPath: FolderPath,
        OrganizationStructureID: userOrganizationID?.OrganizationStructureID,
        LicenseID: userLicenseID?.LicenseID || null,
      };

      const token = jwt.sign(tokenData, process.env.JWT_SECRET);

      await UserDetails.update(
        {
          DesktopFolderSyncPath: FolderPath,
          DesktopClientInfo: ClientInfo,
          ModifiedBy: user.UserID,
          ModifiedDate: new Date(),
        },
        {
          where: {
            UserID: user.UserID,
          },
          transaction: t,
        }
      );

      await t.commit();
      return res.status(200).send({
        message: "Logged in successfully",
        data: {
          token: token,
          tokenData: tokenData,
        },
      });
    } else {
      await t.rollback();
      return res.error(res, {
        statusCode: 400,
        message: "User does not exist",
      });
    }
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).send({
      error: "Something went wrong!",
    });
  }
};
