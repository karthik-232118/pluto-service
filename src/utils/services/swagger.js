const swaggerJSDoc = require("swagger-jsdoc");

const apiSchema = require("../../lib/swaggerSchema/api-schema.json");
const apiMaster = require("../../lib/swaggerSchema/api-master.json");
const apiData = require("../../lib/swaggerSchema/api-data.json");
const apiAuth = require("../../lib/swaggerSchema/api-auth.json");
const apiSystem = require("../../lib/swaggerSchema/api-system.json");
const apiCloud = require("../../lib/swaggerSchema/api-cloud.json");
const apiAi = require("../../lib/swaggerSchema/api-ai.json");
const apiAdminElement = require("../../lib/swaggerSchema/api-admin-element.json");

const options = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "PLUTO REST API",
      version: "1.0.0",
      description: "Pluto Rest API Description",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    paths: {
      ...apiAuth,
      ...apiData,
      ...apiSchema.paths,
      ...apiMaster,
      ...apiSystem,
      ...apiCloud,
      ...apiAi,
      ...apiAdminElement,
    },
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
