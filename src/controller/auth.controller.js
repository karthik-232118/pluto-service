const msal = require("@azure/msal-node");
const Users = require("../model/Users");
const Token = require("../model/Token");

const ssoconfig = {
  auth: {
    clientId: process.env.AZURE_SSO_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_SSO_TENANT_ID}`,
    clientSecret: process.env.AZURE_SSO_CLIENT_SECRET,
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: msal.LogLevel.Verbose,
    },
  },
};
const pca = new msal.ConfidentialClientApplication(ssoconfig);

// exports.authorizeLogin = oauthServer.authorize({
//     authenticateHandler: {
//         handle: req => {
//             return req.body.user
//         },
//     },
// })

// exports.athorizeToken = oauthServer.token({
//     requireClientAuthentication: {

//     },

// })

exports.authenticate = async (req, res) => {
  try {
    res.status(200).send({ message: "User authenticated successfully" });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};
exports.Logout = async (req, res) => {
  try {
    res.status(200).send({ message: "User logged out successfully" });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};
exports.getSSOLink = async (req, res) => {
  try {
    const authCodeUrlParameters = {
      scopes: [
        "Calendars.ReadWrite",
        "email",
        "Mail.Read",
        "openid",
        "profile",
        "User.Read",
      ],
      redirectUri: `${process.env.BACKEND_URL}v1/iCR2Y/gMCV9igxTDNyiSo`,
    };
    const response = await pca.getAuthCodeUrl(authCodeUrlParameters);
    res.status(200).send({ response });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};
exports.ssoCallBack = async (req, res) => {
  try {
    const tokenRequest = {
      code: req.query.code,
      redirectUri: `${process.env.BACKEND_URL}v1/iCR2Y/gMCV9igxTDNyiSo`,
      scopes: [
        "Calendars.ReadWrite",
        "email",
        "Mail.Read",
        "openid",
        "profile",
        "User.Read",
      ],
    };
    const response = await pca.acquireTokenByCode(tokenRequest);
    const user = await Users.findOne({
      where: { UserName: response.account.username.toLocaleLowerCase() },
    });
    if (user) {
      await Token.destroy({
        where: { userId: user.UserID },
      });
      const { tokenId } = await Token.create({
        accessToken: response.accessToken,
        accessTokenExpiresAt: response.expiresOn,
        refreshToken: response.idToken,
        refreshTokenExpiresAt: response.extExpiresOn,
        clientId: ssoconfig.auth.clientId,
        userId: user.UserID,
      });
      res.redirect(`${process.env.FRONTEND_URL}/?sso=1&token=` + tokenId);
    } else {
      res.redirect(`${process.env.FRONTEND_URL}/?sso=0`);
    }
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};
exports.getSSODetails = async (req, res) => {
  try {
    const { TokenID } = req.body;
    if (TokenID) {
      const data = await Token.findOne({
        where: { tokenId: TokenID },
        include: {
          model: Users,
          required: true,
          attributes: ["UserID", "UserType"],
        },
        attributes: {
          exclude: ["userId", "createdAt", "updatedAt"],
        },
        raw: true,
      });
      if (data) {
        res.status(200).send({ data });
      } else {
        res.status(400).send({ error: "Faild" });
      }
    } else {
      res.status(400).send({ error: "TokenID is required" });
    }
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};
