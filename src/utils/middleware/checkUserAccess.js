/**
 * User access type constants
 */
const access = {
  Admin: "Admin",
  ProcessOwner: "ProcessOwner",
  EndUser: "EndUser",
};

/**
 * API access control functions
 * Each function returns a middleware that checks user access
 */
const apiAccess = {
  Admin: () => {
    return (req, res, next) => {
      const currentUserType = req.payload?.currentUserType;

      if (!currentUserType) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User type not found in token",
        });
      }

      if (currentUserType === access.Admin) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: "Access denied: Admin privileges required",
      });
    };
  },

  ProcessOwner: () => {
    return (req, res, next) => {
      const currentUserType = req.payload?.currentUserType;

      if (!currentUserType) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User type not found in token",
        });
      }

      // Admin can access any resource
      if (
        currentUserType === access.Admin ||
        currentUserType === access.ProcessOwner
      ) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: "Access denied: Process Owner or Admin privileges required",
      });
    };
  },

  EndUser: () => {
    return (req, res, next) => {
      const currentUserType = req.payload?.currentUserType;

      if (!currentUserType) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User type not found in token",
        });
      }

      // Admin can access any resource
      // ProcessOwner can access EndUser resources
      if (
        currentUserType === access.Admin ||
        currentUserType === access.ProcessOwner ||
        currentUserType === access.EndUser
      ) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: "Access denied: Insufficient privileges",
      });
    };
  },
};

module.exports = { apiAccess };
