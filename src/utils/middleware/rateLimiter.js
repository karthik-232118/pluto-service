const rateLimit = require("express-rate-limit");
const os = require("os");

function getLocalSystemIP() {
  const networkInterfaces = os.networkInterfaces();
  for (const iface of Object.values(networkInterfaces)) {
    for (const info of iface) {
      if (info.family === "IPv4" && !info.internal) {
        return info.address;
      }
    }
  }
  return "127.0.0.1";
}

const createLimiter = function (minutes, max) {
  const systemIP = getLocalSystemIP();

  return rateLimit({
    windowMs: minutes * 60 * 1000, // `minutes` to milliseconds
    max: max, // Limit each IP to `max` requests per `window`
    headers: true, // Return rate limit info in headers
    keyGenerator: function (req) {
      return systemIP;
    },
    handler: function (req, res) {
      return res.status(429).json({
        status: false,
        message:
          "You sent too many requests. Please wait a while then try again",
      });
    },
  });
};

module.exports = {
  createLimiter: createLimiter,
};
