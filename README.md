****** CHANGE-1 ******
    For this to work, you are going have to hack this a little bit:
    1. navigate to the node_modules folder
    2. find the oauth_server folder. (node_modules/express-oauth-server/node_modules/oauth2-server)
    3. open lib/handlers/authorize-handler.js 
    4. Make the following change (around line 136):

    AuthorizeHandler.prototype.generateAuthorizationCode = function (client, user, scope) {
      if (this.model.generateAuthorizationCode) {
        // Replace this
        //return promisify(this.model.generateAuthorizationCode).call(this.model, client, user, scope);
        // With this
        return this.model.generateAuthorizationCode(client, user, scope)
      }
      return tokenUtil.generateRandomToken();
    };
****** CHANGE-2 ******
    1. navigate to the node_modules folder
    2. find the oauth_server folder. (node_modules/express-oauth-server)
    3. open index.js 
    4. Make the following change (around line 133):

    var handleResponse = function(req, res, response) {

      if (response.status === 302) {
        var location = response.headers.location;
        delete response.headers.location;
        res.set(response.headers);
         // Replace this
         //res.redirect(location);
         // With this
        res.json({link:location});
      } else {
        res.set(response.headers);
        res.status(response.status).send(response.body);
      }
    };
