// Define CSP rules
const cspDirectives = {
  directives: {
    defaultSrc: ["'self'"], // Allow resources from the same origin
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Allow inline scripts if necessary (try to avoid this)
      process.env.FRONTEND_URL, // Allow scripts from your frontend
      process.env.FORM_BUILDER_URL_TWO,
      "http://localhost:5173",
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Allow inline styles (e.g., for React components or Tailwind)
      "https://fonts.googleapis.com",
    ],
    fontSrc: ["'self'", "https://fonts.gstatic.com"], // Allow fonts from Google
    imgSrc: [
      "'self'",
      "data:", // Allow data URLs (e.g., base64 encoded images)
      process.env.FRONTEND_URL, // Allow frontend images
       process.env.FORM_BUILDER_URL_TWO,
      process.env.BACKEND_URL_TWO, // Allow backend-generated images
      console.log("BACKEND_URL:", process.env.BACKEND_URL_TWO),
      "http://localhost:5173",
      "http://localhost:4321",
    ],
    connectSrc: [
      "'self'",
      process.env.FRONTEND_URL,
      process.env.FORM_BUILDER_URL_TWO,
      process.env.BACKEND_URL_TWO,
      "http://localhost:5173",
      "http://localhost:4321",
    ],
    frameSrc: ["'self'"], // Allow iframes (add external domains if needed)
    objectSrc: ["'none'"], // Disallow object tags
    upgradeInsecureRequests: [], // Upgrade HTTP to HTTPS automatically
  },
};

const allowedRequests = () => {
  const allowedMethods = ["GET", "POST"];

  return (req, res, next) => {
    if (req.method === "OPTIONS") {
      return next();
    }

    if (!allowedMethods.includes(req.method)) {
      return res.status(405).json({
        error: "Security breach, please contact the administrator",
        message: "Security breach, please contact the administrator",
      });
    }
    next();
  };
};

module.exports = {
  cspDirectives,
  allowedRequests,
};
