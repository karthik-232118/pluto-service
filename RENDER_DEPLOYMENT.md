# Render.com Deployment Instructions

## Error Analysis

The error you're seeing:

```
TypeError [ERR_INVALID_ARG_TYPE]: The "url" argument must be of type string. Received undefined
```

This means the `DB_CONNECTION_STRING` environment variable is not set in your Render.com environment.

## Steps to Fix

### 1. Set Environment Variables in Render.com

Go to your Render.com dashboard and add these environment variables. **Copy the values from your local `.env` file**.

**Required Variables:**

```
PORT=4321
NODE_ENV=production
JWT_SECRET=<copy from your .env file>
DB_CONNECTION_STRING=<copy from your .env file>
BACKEND_URL=<your render app URL>
FORM_BUILDER_URL=<copy from your .env file>
DYNAMIC_FORM_SECRET_KEY=<copy from your .env file>
ENCRIPTION_PRIVATE_KEY=<copy from your .env file>
SENDER_EMAIL=<copy from your .env file>
SENDER_EMAIL_PASSWORD=<copy from your .env file>
OFFICE365_EMAIL=<copy from your .env file>
OFFICE365_PASSWORD=<copy from your .env file>
ONLYOFFICE_SERVER_URL=<copy from your .env file>
```

**Azure Configuration (if using OneDrive/SSO):**

```
AZURE_ONEDRIVE_CLIENT_ID=<copy from your .env file>
AZURE_ONEDRIVE_TENANT_ID=<copy from your .env file>
AZURE_ONEDRIVE_CLIENT_SECRET=<copy from your .env file>
AZURE_SSO_CLIENT_ID=<copy from your .env file>
AZURE_SSO_TENANT_ID=<copy from your .env file>
AZURE_SSO_CLIENT_SECRET=<copy from your .env file>
```

**OAuth2 Configuration:**

```
AUTH2_CLIENT_ID=<copy from your .env file>
AUTH2_CLIENT_SECRET=<copy from your .env file>
AUTH2_GRANTS=authorization_code,refresh_token
AUTH2_REDIRECT_URIS=<copy from your .env file>
```

### 2. How to Add Environment Variables in Render.com

1. Go to your Render.com dashboard
2. Select your service (pluto-service)
3. Click on "Environment" in the left sidebar
4. Click "Add Environment Variable"
5. Add each variable one by one with the Key and Value
6. Click "Save Changes"
7. Render will automatically redeploy with the new variables

### 3. Build Command

Make sure your build command in Render is:

```
npm install
```

### 4. Start Command

Make sure your start command in Render is:

```
npm run start:prod
```

or

```
node index.js
```

### 5. Additional Notes

- The app now has better error handling and will show a clear message if DB_CONNECTION_STRING is missing
- The canvas package is now optional, so it won't fail the build if it can't be installed
- Make sure your database (Neon) is accessible from Render's servers

### 6. Verification

After adding the environment variables and redeploying:

1. Check the deploy logs in Render
2. You should see "Connection has been established successfully." in the logs
3. If you still see the error, double-check that DB_CONNECTION_STRING is exactly correct (no extra spaces)

## Security Warning

⚠️ **IMPORTANT**: The environment variables shown above contain sensitive information (passwords, secrets, API keys).

- Make sure to rotate these credentials if they have been exposed
- Never commit `.env` files to your repository
- Consider using Render's Secret Files feature for sensitive data
