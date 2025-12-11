const msal = require("@azure/msal-node");

// MSAL configuration
const config = {
  auth: {
    clientId: process.env.AZURE_ONEDRIVE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_ONEDRIVE_TENANT_ID}`,
    clientSecret: process.env.AZURE_ONEDRIVE_CLIENT_SECRET,
  },
};

// Create MSAL instance
const cca = new msal.ConfidentialClientApplication(config);

// Request access token
const getAccessToken = async () => {
  const tokenRequest = {
    scopes: ["https://graph.microsoft.com/.default"], // Access OneDrive
  };

  try {
    const response = await cca.acquireTokenByClientCredential(tokenRequest);
    return response.accessToken;
  } catch (err) {
    console.error("Error acquiring token:", err);
  }
};

module.exports = getAccessToken;
