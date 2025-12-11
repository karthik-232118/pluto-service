const express = require("express");
const cors = require("cors");
const path = require("path");
const runSyncManager = require("./src/syncSystem/syncManager");
const { authRoutes } = require("./src/routes/auth.routes");
const { dataRoutes } = require("./src/routes/data.routes");
const { publicRoutes } = require("./src/routes/public/public.routes");
const { adminRoutes } = require("./src/routes/admin/admin.routes");
const { elementRoutes } = require("./src/routes/admin/element/element.routes");
const { eSignRoutes } = require("./src/routes/admin/eSign.route");
const { commonRoutes } = require("./src/routes/common.routes");
const { authUser } = require("./src/utils/middleware/auth.middleware");
const swaggerSpec = require("./src/utils/services/swagger");
const swaggerUI = require("swagger-ui-express");
const { masterRoutes } = require("./src/routes/master.routes");
const defineAssociations = require("./src/model/association");
const { getFileUrl } = require("./src/controller/data.controller");
const shocket = require("./src/utils/services/socket");
const http = require("http");
const helmet = require("helmet");
const { Server } = require("socket.io");
const security = require("./src/utils/security");
require("./src/oauth/server");
require("dotenv").config();
defineAssociations();

const isDevelopment = process.env.NODE_ENV === "development" || false;

const PORT = process.env.PORT || 3001;
const allowedOrigins = [
  process.env.FRONTEND_URL,
 process.env.KEY_GENERATION_URL,
 process.env.FORM_BUILDER_URL_TWO,    
  "http://localhost:5173",
];

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(security.allowedRequests());
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY"); 
  next();
});
// Enforce HTTPS and Strict-Transport-Security (HSTS)
app.use((req, res, next) => {
  // Ensure that the Strict-Transport-Security header is only set for HTTPS
  if (req.secure) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
  next();
});
app.use((req, res, next) => {
  // Prevent MIME-sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});
// app.use(
//   helmet.contentSecurityPolicy({
//     directives: security.cspDirectives.directives,
//   })
// );

app.set("trust proxy", true);
const server = http.createServer(app);
const io = new Server(server, {
  path: "/socket.io/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingInterval: 25000, // Ping interval to keep connection alive
  pingTimeout: 60000, // Timeout before server closes connection
  transports: ["websocket", "polling"],
});
shocket.userSockets(io);
// Mounts the `cors` middleware to allow requests from all origins.
app.use(
  cors({
    methods: ["GET", "POST"],
    origin: (origin, callback) => {
      if (isDevelopment || !origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(
          new Error("Security breach, please contact the administrator")
        );
      }
    },
    optionsSuccessStatus: 200,
  })
);
// Define session middleware with default options (but don't apply globally)
const session = require("express-session");
const {
  sheduleEvery30min,
  sheduleEvery10min,
} = require("./src/utils/services/cornShedules");
const { mediaAccess } = require("./src/utils/middleware/resourceAccess");
const { systemRoutes } = require("./src/routes/system/system.routes");
const { cloudRoutes } = require("./src/routes/cloud/cloud.routes");
const { desktopRoutes } = require("./src/routes/desktop/desktop.routes");
const { desktopAuthRoutes } = require("./src/routes/desktop/auth.routes");
const rateLimiter = require("./src/utils/middleware/rateLimiter");
const { setNoCache, publicFilesCacheConfig } = require("./src/utils/helper");
const { flowRoutes } = require("./src/routes/flow/flow.routes");
const {
  authDesktopUser,
} = require("./src/utils/middleware/desktopAuth.middleware");
const { dbConnectorRoutes } = require("./src/routes/admin/dbConnector.route");
const { sticherRoutes } = require("./src/routes/sticher/sticher.routes");
const {
  dataSourceRoutes,
} = require("./src/routes/datasource/datasource.routes");
const SkillsClickEvent = require("./src/model/SkillsClickEvent");
const SopDetails = require("./src/model/SopDetails");
// Mounts the `express.json` middleware to parse JSON request bodies.
app.use(
  express.static("public", {
    setHeaders: publicFilesCacheConfig,
  })
);
app.use(
  "/public",
  rateLimiter.createLimiter(1, 5000),
  express.static("public", {
    setHeaders: publicFilesCacheConfig,
  })
);
app.use(
  "/file/:type",
  setNoCache,
  rateLimiter.createLimiter(1, 5000),
  mediaAccess
);

app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));

app.get("/", setNoCache, async (req, res) => {
  res
    .status(200)
    .send({ success: true, message: "Welcome to PLUTO Backend Node Server !" });
});

app.use(
  "/v1/iCR2Y",
  rateLimiter.createLimiter(1, 5000),
  setNoCache,
  authRoutes
);
app.use(
  "/v1/1hjr5",
  rateLimiter.createLimiter(1, 5000),
  setNoCache,
  publicRoutes
);
app.use(
  "/v1/rXos1",
  rateLimiter.createLimiter(1, 5000),
  setNoCache,
  authUser,
  dataRoutes
);
app.use(
  "/v1/P7Y4Y",
  rateLimiter.createLimiter(1, 5000),
  setNoCache,
  authUser,
  masterRoutes
);
app.use(
  "/v1/hI1Ev",
  rateLimiter.createLimiter(1, 5000),
  setNoCache,
  authUser,
  adminRoutes
);
app.use(
  "/v1/G5OIJ",
  rateLimiter.createLimiter(1, 5000),
  setNoCache,
  authUser,
  sticherRoutes
);
app.use(
  "/v1/I6VF3",
  rateLimiter.createLimiter(1, 5000),
  setNoCache,
  authUser,
  elementRoutes
);
app.use(
  "/v1/rP5GN",
  rateLimiter.createLimiter(1, 5000),
  setNoCache,
  authUser,
  eSignRoutes
);
app.use(
  "/v1/u4wtD",
  rateLimiter.createLimiter(1, 5000),
  setNoCache,
  authUser,
  commonRoutes
);
app.use(
  "/v1/J2nve",
  rateLimiter.createLimiter(1, 5000),
  setNoCache,
  authUser,
  systemRoutes
);
app.use(
  "/v1/ylwAv",
  rateLimiter.createLimiter(1, 5000),
  setNoCache,
  authUser,
  cloudRoutes
);
app.use(
  "/v1/lPWcr",
  rateLimiter.createLimiter(1, 5000),
  setNoCache,
  desktopAuthRoutes
);
app.use(
  "/v1/ubYqd",
  rateLimiter.createLimiter(1, 5000),
  setNoCache,
  authDesktopUser,
  desktopRoutes
);
app.use("/v1/pYaYk", flowRoutes);
app.use(
  "/v1/mURwE",
  rateLimiter.createLimiter(1, 5000),
  setNoCache,
  authUser,
  dbConnectorRoutes
);
app.use(
  "/v1/yrL7Y",
  rateLimiter.createLimiter(1, 5000),
  setNoCache,
  authUser,
  dataSourceRoutes
);

app.use("*", setNoCache, (req, res) => {
  res.status(404).send({ message: "Invalid url" });
});
sheduleEvery30min();
sheduleEvery10min();

server.listen(PORT, () =>
  console.log(`server listen on http://localhost:${PORT}`)
);
