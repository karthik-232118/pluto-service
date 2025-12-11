// // See https://oauth2-server.readthedocs.io/en/latest/model/spec.html for what you can do with this
// const crypto = require('crypto')
// require('dotenv').config();
// /* const db = { // Here is a fast overview of what your db model should look like
//   authorizationCode: {
//     authorizationCode: '', // A string that contains the code
//     expiresAt: new Date(), // A date when the code expires
//     redirectUri: '', // A string of where to redirect to with this code
//     client: null, // See the client section
//     user: null, // Whatever you want... This is where you can be flexible with the protocol
//   },
//   client: { // Application wanting to authenticate with this server
//     clientId: '', // Unique string representing the client
//     clientSecret: '', // Secret of the client; Can be null
//     grants: [], // Array of grants that the client can use (ie, `authorization_code`)
//     redirectUris: [], // Array of urls the client is allowed to redirect to
//   },
//   token: {
//     accessToken: '', // Access token that the server created
//     accessTokenExpiresAt: new Date(), // Date the token expires
//     client: null, // Client associated with this token
//     user: null, // User associated with this token
//   },
// } */

// // const DebugControl = require('../utilities/debug.js')
// const Token = require('../model/Token.js')
// const AuthorizationCode = require('../model/AuthorizationCode.js')
// const Users = require('../model/Users.js');
// const { logger } = require('../utils/services/logger.js');
// const client = {
//   clientId: process.env.AUTH2_CLIENT_ID,
//   clientSecret: process.env.AUTH2_CLIENT_SECRET,
//   grants: process.env.AUTH2_GRANTS.split(','),
//   redirectUris: process.env.AUTH2_REDIRECT_URIS
// }
// module.exports = {
//   getClient: async function (clientId, clientSecret) {
//     console.log('getClient')
//     // query db for details with client
//     /*  log({
//         title: 'Get Client',
//         parameters: [
//           { name: 'clientId', value: clientId },
//           { name: 'clientSecret', value: clientSecret },
//         ]
//       })
//       db.client = { // Retrieved from the database
//         clientId: clientId,
//         clientSecret: clientSecret,
//         grants: ['authorization_code', 'refresh_token'],
//         redirectUris: ['http://localhost:3030/client/app'],
//       }
//       */

//     return new Promise(resolve => {
//       resolve(client)
//     })
//   },
//   // generateAccessToken: (client, user, scope) => { // generates access tokens
//   //   log({
//   //     title: 'Generate Access Token',
//   //     parameters: [
//   //       {name: 'client', value: client},
//   //       {name: 'user', value: user},
//   //     ],
//   //   })
//   //
//   // },
//   saveToken: async (token, client, user) => {
//     console.log('saveToken')
//     /* This is where you insert the token into the database */
//     /*  log({
//        title: 'Save Token',
//        parameters: [
//          { name: 'token', value: token },
//          { name: 'client', value: client },
//          { name: 'user', value: user },
//        ],
//      })
//      db.token = {
//        accessToken: token.accessToken,
//        accessTokenExpiresAt: token.accessTokenExpiresAt,
//        refreshToken: token.refreshToken, // NOTE this is only needed if you need refresh tokens down the line
//        refreshTokenExpiresAt: token.refreshTokenExpiresAt,
//        client: client,
//        user: user,
//      }
//      return new Promise(resolve => resolve(db.token)) */
//     try {
//       const tokens = await Token.create({
//         accessToken: token.accessToken,
//         accessTokenExpiresAt: token.accessTokenExpiresAt,
//         refreshToken: token.refreshToken, // NOTE this is only needed if you need refresh tokens down the line
//         refreshTokenExpiresAt: token.refreshTokenExpiresAt,
//         clientId: client.clientId,
//         userId: user.UserID
//       })
//       const tokenJson = JSON.parse(JSON.stringify(tokens))
//       tokenJson['client'] = JSON.parse(JSON.stringify(client))
//       tokenJson['user'] = JSON.parse(JSON.stringify(user))
//       tokenJson['refreshTokenExpiresAt'] = new Date(tokenJson['refreshTokenExpiresAt'])
//       tokenJson['accessTokenExpiresAt'] = new Date(tokenJson['accessTokenExpiresAt'])
//       return tokenJson
//     } catch (error) {
//       console.log(error)
//       logger.error({message: error.message})
//     }
//   },
//   getAccessToken: async token => {
//     console.log('getAccessToken', token)
//     /* This is where you select the token from the database where the code matches */
//     /*  log({
//        title: 'Get Access Token',
//        parameters: [
//          { name: 'token', value: token },
//        ]
//      })
//      if (!token || token === 'undefined') return false
//      return new Promise(resolve => resolve(db.token)) */
//     try {
//       const tokens = await Token.findOne({
//         where: {
//           accessToken: token
//         },
//         include:
//         {
//           model: Users,
//         }
//       });
//       if (!tokens) return false
//       const data = JSON.parse(JSON.stringify(tokens))
//       data['user'] = JSON.parse(JSON.stringify(tokens.User))
//       data['client'] = client
//       data['refreshTokenExpiresAt'] = new Date(data['refreshTokenExpiresAt'])
//       data['accessTokenExpiresAt'] = new Date(data['accessTokenExpiresAt'])
//       // data.client.grants = ['authorization_code', 'refresh_token']
//       delete data.User;

//       return data
//     } catch (error) {
//       console.log(error)
//     }
//   },
//   getRefreshToken: async token => {
//     console.log('getRefreshToken')
//     /* Retrieves the token from the database */
//     /*  log({
//        title: 'Get Refresh Token',
//        parameters: [
//          { name: 'token', value: token },
//        ],
//      })
//      DebugControl.log.variable({ name: 'db.token', value: db.token })
//      return new Promise(resolve => resolve(db.token)) */
//     try {
//       const tokens = await Token.findOne({
//         where: {
//           refreshToken: token
//         },
//         include:
//         {
//           model: Users,
//           // as: 'user'
//           // attributes: ['email', 'phone']
//         }

//       });
//       const data = JSON.parse(JSON.stringify(tokens))
//       data['user'] = JSON.parse(JSON.stringify(tokens.User))
//       data['client'] = client
//       data['refreshTokenExpiresAt'] = new Date(data['refreshTokenExpiresAt'])
//       data['accessTokenExpiresAt'] = new Date(data['accessTokenExpiresAt'])
//       // data.client.grants = ['authorization_code', 'refresh_token']
//       delete data.User;
//       return data
//     } catch (error) {
//       console.log(error)
//     }
//   },
//   revokeToken: async token => {
//     console.log('revokeToken')
//     /* Delete the token from the database */
//     /*  log({
//        title: 'Revoke Token',
//        parameters: [
//          { name: 'token', value: token },
//        ]
//      })
//      if (!token || token === 'undefined') return false
//      return new Promise(resolve => resolve(true)) */
//     try {
//       console.log(token)
//       const tokens = await Token.destroy({
//         where: {
//           accessToken: token.accessToken
//         }
//       })
//       console.log(tokens)
//       if (!tokens) return false

//       return true
//     } catch (error) {

//     }
//   },
//   generateAuthorizationCode: (client, user, scope) => {
//     console.log('generateAuthorizationCode')
//     /* 
//     For this to work, you are going have to hack this a little bit:
//     1. navigate to the node_modules folder
//     2. find the oauth_server folder. (node_modules/express-oauth-server/node_modules/oauth2-server)
//     3. open lib/handlers/authorize-handler.js 
//     4. Make the following change (around line 136):

//     AuthorizeHandler.prototype.generateAuthorizationCode = function (client, user, scope) {
//       if (this.model.generateAuthorizationCode) {
//         // Replace this
//         //return promisify(this.model.generateAuthorizationCode).call(this.model, client, user, scope);
//         // With this
//         return this.model.generateAuthorizationCode(client, user, scope)
//       }
//       return tokenUtil.generateRandomToken();
//     };
//     */

//     /*    log({
//          title: 'Generate Authorization Code',
//          parameters: [
//            { name: 'client', value: client },
//            { name: 'user', value: user },
//          ],
//        }) */

//     const seed = crypto.randomBytes(256)
//     const code = crypto
//       .createHash('sha1')
//       .update(seed)
//       .digest('hex')
//     return code
//   },
//   saveAuthorizationCode: async (code, client, user) => {
//     console.log('saveAuthorizationCode')
//     /* This is where you store the access code data into the database */
//     /*   log({
//         title: 'Save Authorization Code',
//         parameters: [
//           { name: 'code', value: code },
//           { name: 'client', value: client },
//           { name: 'user', value: user },
//         ],
//       })
//       db.authorizationCode = {
//         authorizationCode: code.authorizationCode,
//         expiresAt: code.expiresAt,
//         client: client,
//         user: user,
//       }
//       return new Promise(resolve => resolve(Object.assign({
//         redirectUri: `${code.redirectUri}`,
//       }, db.authorizationCode))) */
//     try {
//       // console.log(code.redirectUri)
//       console.log(user)
//       const authCode = await AuthorizationCode.create({
//         authorizationCode: code.authorizationCode,
//         expiresAt: code.expiresAt,
//         redirectUri: code.redirectUri,
//         clientId: client.clientId,
//         userId: user.UserID
//       })
//       const authJson = JSON.parse(JSON.stringify(authCode))
//       authJson['client'] = client
//       authJson['user'] = JSON.parse(JSON.stringify(user))
//       return authJson
//     } catch (error) {
//       console.log(error)
//     }
//   },
//   getAuthorizationCode: async authorizationCode => {
//     console.log('getAuthorizationCode')
//     /* this is where we fetch the stored data from the code */
//     /*   log({
//         title: 'Get Authorization code',
//         parameters: [
//           { name: 'authorizationCode', value: authorizationCode },
//         ],
//       })
//       return new Promise(resolve => {
//         resolve(db.authorizationCode)
//       }) */
//     try {
//       const aCode = await AuthorizationCode.findOne({
//         where: {
//           authorizationCode: authorizationCode
//         },
//         attributes: ['authorizationCode', 'expiresAt'],
//         include:
//         {
//           model: Users,
//           // as: 'user'
//           // attributes: ['email', 'phone']
//         }

//       });
//       const data = JSON.parse(JSON.stringify(aCode))
//       data['user'] = JSON.parse(JSON.stringify(aCode.User))
//       data['client'] = client
//       data['expiresAt'] = new Date(data['expiresAt'])
//       // data.client.grants = ['authorization_code', 'refresh_token']
//       delete data.User;
//       return data
//     } catch (error) {
//       console.log(error)
//     }
//   },

//   revokeAuthorizationCode: async authorizationCode => {
//     console.log('revokeAuthorizationCode')
//     /* This is where we delete codes */
//     /*    log({
//          title: 'Revoke Authorization Code',
//          parameters: [
//            { name: 'authorizationCode', value: authorizationCode },
//          ],
//        })
//        db.authorizationCode = { // DB Delete in this in memory example :)
//          authorizationCode: '', // A string that contains the code
//          expiresAt: new Date(), // A date when the code expires
//          redirectUri: '', // A string of where to redirect to with this code
//          client: null, // See the client section
//          user: null, // Whatever you want... This is where you can be flexible with the protocol
//        }
//        const codeWasFoundAndDeleted = true  // Return true if code found and deleted, false otherwise
//        return new Promise(resolve => resolve(codeWasFoundAndDeleted)) */
//     try {

//       await AuthorizationCode.destroy({
//         where: {
//           authorizationCode: authorizationCode.authorizationCode
//         },
//       })
//       return true
//     } catch (error) {
//       console.log(error)
//     }
//   },
//   verifyScope: (token, scope) => {
//     console.log('verifyScope')
//     /* This is where we check to make sure the client has access to this scope */
//     // log({
//     //   title: 'Verify Scope',
//     //   parameters: [
//     //     { name: 'token', value: token },
//     //     { name: 'scope', value: scope },
//     //   ],
//     // })
//     const userHasAccess = true  // return true if this user / client combo has access to this resource
//     return new Promise(resolve => resolve(userHasAccess))
//   }
// }


