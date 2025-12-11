const { Op } = require("sequelize");
const Token = require("../../model/Token");
const Users = require("../../model/Users");
const { comparePassword } = require("../services/passwordHash");
const { sequelize } = require("../../model");
const { decryptedData } = require("../services/encription");
const UserAuthenticationLogs = require("../../model/UserAuthenticationLogs");
const UserDetails = require("../../model/UserDetails");
const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.authDesktopUser = async (req, res, next) => {
  try {
    let token = req.headers.authorization;

    if (!token) {
      res.status(401).send({ message: "No token provided!" });
      return;
    }

    token = token.split(" ")[1];

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    if (!decodedToken) {
      res.status(401).send({ message: "Invalid token!" });
      return;
    }

    const { UserID, UserType, FolderPath } = decodedToken;

    const userDetails = await Users.findOne({
      where: { UserID: UserID },
    });

    if (!userDetails) {
      res.status(401).send({ message: "User not found!" });
      return;
    }

    if (
      userDetails.UserType !== UserType ||
      (UserType !== "Admin" && UserType !== "ProcessOwner")
    ) {
      res
        .status(401)
        .send({ message: "User is not authorized to use desktop client" });
      return;
    }

    req.payload = { UserID, UserType, FolderPath };
    next();
  } catch (error) {
    console.log(error);
    res.status(404).send({ message: error.message });
  }
};
