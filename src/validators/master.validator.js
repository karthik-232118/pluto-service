const { body, validationResult } = require("express-validator");
const { Op } = require("sequelize");
const helper = require("../utils/helper");
const Users = require("../model/Users");
const Roles = require("../model/Roles");
const OrganizationStructure = require("../model/OrganizationStructure");
const UserDetails = require("../model/UserDetails");
const Departments = require("../model/Departments");
const OrganizationAdvertisement = require("../model/OrganizationAdvertisement");

const addUserToOrganizationStructureRules = () => {
  return [
    body("UserName")
      .trim()
      .notEmpty()
      .withMessage("User Name is required")
      .bail()
      .isString()
      .withMessage("User Name should be string")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("User Name should be between 2 to 100 characters")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        const isUserNameExist = await Users.count({
          where: {
            UserName: {
              [Op.iLike]: value,
            },
            IsDeleted: false,
          },
        });

        if (isUserNameExist || isUserNameExist > 0) {
          return Promise.reject("User Name already exist");
        }
        return Promise.resolve();
      }),
    body("Password")
      .trim()
      .notEmpty()
      .withMessage("Password is required")
      .bail()
      .isString()
      .withMessage("Password should be string"),
    body("IsActive")
      .notEmpty()
      .withMessage("User active status is required")
      .bail()
      .isBoolean()
      .withMessage("User active status should be boolean"),
    body("UserType")
      .trim()
      .notEmpty()
      .withMessage("User Type is required")
      .bail()
      .isString()
      .withMessage("User Type should be string")
      .bail()
      .isIn(["Admin", "ProcessOwner","Auditor", "EndUser"])
      .withMessage(
        "User Type must be one of 'Admin', 'ProcessOwner' ,'Auditor', 'EndUser'"
      ),
    body("UserFirstName")
      .trim()
      .notEmpty()
      .withMessage("User First Name is required")
      .bail()
      .isString()
      .withMessage("User First Name should be string")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("User First Name should be between 2 to 100 characters")
      .bail()
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage(
        "User First Name can only contain alphabetic characters (a-z, A-Z)"
      )
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      }),
    body("UserMiddleName")
      .trim()
      .isString()
      .withMessage("User Middle Name should be string")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("User Middle Name should be between 2 to 100 characters")
      .bail()
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage(
        "User Middle Name can only contain alphabetic characters (a-z, A-Z)"
      )
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("UserLastName")
      .trim()
      .isString()
      .withMessage("User Last Name should be string")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("User Last Name should be between 2 to 100 characters")
      .bail()
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage(
        "User Last Name can only contain alphabetic characters (a-z, A-Z)"
      )
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("UserEmail")
      .trim()
      .notEmpty()
      .withMessage("User Email is required")
      .bail()
      .isEmail()
      .withMessage("Please enter a valid email address")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("User Email should be between 2 to 100 characters")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        const isUserEmailExist = await UserDetails.count({
          where: {
            UserEmail: {
              [Op.iLike]: value,
            },
            IsDeleted: false,
          },
        });

        if (isUserEmailExist || isUserEmailExist > 0) {
          return Promise.reject("User Email already exist");
        }
        return Promise.resolve();
      }),
    body("UserPhoneNumber")
      .trim()
      .isMobilePhone("any")
      .withMessage("Please enter a valid phone number")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("UserAddress")
      .trim()
      .notEmpty()
      .withMessage("User Address is required")
      .bail()
      .isString()
      .withMessage("User Address should be string")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      }),
    body("UserDateOfBirth")
      .trim()
      .isDate({
        format: "YYYY-MM-DD",
      })
      .withMessage("Please enter a valid date of birth (YYYY-MM-DD)")
      .optional({ checkFalsy: true, nullable: true }),
    body("Gender")
      .trim()
      .notEmpty()
      .withMessage("Gender is mandatory")
      .bail()
      .isString()
      .withMessage("Gender should be string")
      .bail()
      .isIn(["male", "female", "other"])
      .withMessage("Gender must be one of male, female and other"),
    body("UserEmployeeNumber")
      .trim()
      .notEmpty()
      .withMessage("Employee Number is required")
      .bail()
      .isString()
      .withMessage("Employee Number should be string")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("Employee Number should be between 2 to 100 characters")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        const isUserEmployeeNumberExist = await UserDetails.count({
          where: {
            UserEmployeeNumber: {
              [Op.iLike]: value,
            },
            IsDeleted: false,
          },
        });

        if (isUserEmployeeNumberExist || isUserEmployeeNumberExist > 0) {
          return Promise.reject("Employee Number already exist");
        }
        return Promise.resolve();
      }),
    body("OrganizationStructureID")
      .trim()
      .notEmpty()
      .withMessage("Organization Structure is required")
      .bail()
      .isUUID()
      .withMessage("Organization Structure should be UUID")
      .bail()
      .custom(async (value) => {
        const isOrganizationStructureExist = await OrganizationStructure.count({
          where: {
            OrganizationStructureID: value,
            IsDeleted: false,
          },
        });

        if (!isOrganizationStructureExist || isOrganizationStructureExist < 1) {
          return Promise.reject("Organization Structure does not exist");
        }
        return Promise.resolve();
      }),
    body("RoleID")
      .trim()
      .notEmpty()
      .withMessage("Role is required")
      .bail()
      .isUUID()
      .withMessage("Role should be UUID")
      .bail()
      .custom(async (value) => {
        const isRoleExist = await Roles.count({
          where: {
            RoleID: value,
            IsDeleted: false,
          },
        });

        if (!isRoleExist || isRoleExist < 1) {
          return Promise.reject("Role does not exist");
        }
        return Promise.resolve();
      }),
    body("DepartmentID")
      .trim()
      .notEmpty()
      .withMessage("Department is required")
      .bail()
      .isUUID()
      .withMessage("Department should be UUID")
      .bail()
      .custom(async (value) => {
        const isDepartmentExist = await Departments.count({
          where: {
            DepartmentID: value,
            IsDeleted: false,
          },
        });

        if (!isDepartmentExist || isDepartmentExist < 1) {
          return Promise.reject("Department does not exist");
        }
        return Promise.resolve();
      }),
  ];
};

const updateUserDetailsRules = () => {
  return [
    body("UserID")
      .trim()
      .notEmpty()
      .withMessage("User ID is required")
      .bail()
      .isUUID()
      .withMessage("User ID should be UUID")
      .bail()
      .custom(async (value) => {
        const isUserExist = await Users.count({
          where: {
            UserID: value,
            IsDeleted: false,
          },
        });

        if (!isUserExist || isUserExist < 1) {
          return Promise.reject("User does not exist");
        }
        return Promise.resolve();
      }),
    body("UserName")
      .trim()
      .notEmpty()
      .withMessage("User Name is required")
      .bail()
      .isString()
      .withMessage("User Name should be string")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("User Name should be between 2 to 100 characters")
      .bail()
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        const isUserNameExist = await Users.count({
          where: {
            UserName: { [Op.iLike]: value },
            UserID: { [Op.ne]: req.body.UserID },
            IsDeleted: false,
          },
        });

        if (isUserNameExist || isUserNameExist > 0) {
          return Promise.reject("User Name already exist");
        }
        return Promise.resolve();
      }),
    body("IsActive")
      .notEmpty()
      .withMessage("User active status is required")
      .bail()
      .isBoolean()
      .withMessage("User active status should be boolean"),
    body("UserType")
      .trim()
      .notEmpty()
      .withMessage("User Type is required")
      .bail()
      .isString()
      .withMessage("User Type should be string")
      .bail()
      .isIn(["Admin", "ProcessOwner", "EndUser"])
      .withMessage(
        "User Type must be one of 'Admin', 'ProcessOwner', 'EndUser'"
      ),
    body("UserFirstName")
      .trim()
      .notEmpty()
      .withMessage("User First Name is required")
      .bail()
      .isString()
      .withMessage("User First Name should be string")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("User First Name should be between 2 to 100 characters")
      .bail()
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage(
        "User First Name can only contain alphabetic characters (a-z, A-Z)"
      )
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      }),
    body("UserMiddleName")
      .trim()
      .isString()
      .withMessage("User Middle Name should be string")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("User Middle Name should be between 2 to 100 characters")
      .bail()
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage(
        "User Middle Name can only contain alphabetic characters (a-z, A-Z)"
      )
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("UserLastName")
      .trim()
      .isString()
      .withMessage("User Last Name should be string")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("User Last Name should be between 2 to 100 characters")
      .bail()
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage(
        "User Last Name can only contain alphabetic characters (a-z, A-Z)"
      )
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("UserEmail")
      .trim()
      .notEmpty()
      .withMessage("User Email is required")
      .bail()
      .isEmail()
      .withMessage("Please enter a valid email address")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("User Email should be between 2 to 100 characters")
      .bail()
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        const isUserEmailExist = await UserDetails.count({
          where: {
            UserEmail: {
              [Op.iLike]: value,
            },
            UserID: { [Op.ne]: req.body.UserID },
            IsDeleted: false,
          },
        });

        if (isUserEmailExist || isUserEmailExist > 0) {
          return Promise.reject("User Email already exist");
        }
        return Promise.resolve();
      }),
    body("UserPhoneNumber")
      .trim()
      .isMobilePhone("any")
      .withMessage("Please enter a valid phone number")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("UserAddress")
      .trim()
      .notEmpty()
      .withMessage("User Address is required")
      .bail()
      .isString()
      .withMessage("User Address should be string")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      }),
    body("UserDateOfBirth")
      .trim()
      .isDate({
        format: "YYYY-MM-DD",
      })
      .withMessage("Please enter a valid date of birth (YYYY-MM-DD)")
      .optional({ checkFalsy: true, nullable: true }),
    body("Gender")
      .trim()
      .notEmpty()
      .withMessage("Gender is mandatory")
      .bail()
      .isString()
      .withMessage("Gender should be string")
      .bail()
      .isIn(["male", "female", "other"])
      .withMessage("Gender must be one of male, female and other"),
    body("UserEmployeeNumber")
      .trim()
      .notEmpty()
      .withMessage("Employee Number is required")
      .bail()
      .isString()
      .withMessage("Employee Number should be string")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("Employee Number should be between 2 to 100 characters")
      .bail()
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        const isUserEmployeeNumberExist = await UserDetails.count({
          where: {
            UserEmployeeNumber: {
              [Op.iLike]: value,
            },
            UserID: { [Op.ne]: req.body.UserID },
            IsDeleted: false,
          },
        });

        if (isUserEmployeeNumberExist || isUserEmployeeNumberExist > 0) {
          return Promise.reject("Employee Number already exist");
        }
        return Promise.resolve();
      }),
  ];
};

const addOrganizationDeparmentsRules = () => {
  return [
    body("DepartmentName")
      .trim()
      .notEmpty()
      .withMessage("Department Name is required")
      .bail()
      .isString()
      .withMessage("Department Name should be string")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("Department Name should be between 2 to 100 characters")
      .bail()
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage(
        "Department Name can only contain alphabetic characters (a-z, A-Z)"
      )
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        const { lincense } = req.payload;
        const isDepartmentNameExist = await Departments.count({
          where: {
            DepartmentName: {
              [Op.iLike]: value,
            },
            OrganizationStructureID: lincense.EnterpriseID,
            IsDeleted: false,
          },
        });

        if (isDepartmentNameExist || isDepartmentNameExist > 0) {
          return Promise.reject("Department Name already exist");
        }
        return Promise.resolve();
      }),
    body("DepartmentDescription")
      .trim()
      .isString()
      .withMessage("Department Description should be string")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("IsActive")
      .notEmpty()
      .withMessage("Department active status is required")
      .bail()
      .isBoolean()
      .withMessage("Department active status should be boolean"),
  ];
};

const updateOrganizationDeparmentsRules = () => {
  return [
    body("DepartmentID")
      .trim()
      .notEmpty()
      .withMessage("Department ID is required")
      .bail()
      .isUUID()
      .withMessage("Department ID should be UUID")
      .bail()
      .custom(async (value) => {
        const isDepartmentExist = await Departments.count({
          where: {
            DepartmentID: value,
          },
          IsDeleted: false,
        });

        if (!isDepartmentExist || isDepartmentExist < 1) {
          return Promise.reject("Department does not exist");
        }
        return Promise.resolve();
      }),
    body("DepartmentName")
      .trim()
      .notEmpty()
      .withMessage("Department Name is required")
      .bail()
      .isString()
      .withMessage("Department Name should be string")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("Department Name should be between 2 to 100 characters")
      .bail()
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage(
        "Department Name can only contain alphabetic characters (a-z, A-Z)"
      )
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        const isDepartmentNameExist = await Departments.count({
          where: {
            DepartmentName: {
              [Op.iLike]: value,
            },
            OrganizationStructureID: req.payload.lincense.EnterpriseID,
            DepartmentID: { [Op.ne]: req.body.DepartmentID },
            IsDeleted: false,
          },
        });

        if (isDepartmentNameExist || isDepartmentNameExist > 0) {
          return Promise.reject("Department Name already exist");
        }
        return Promise.resolve();
      }),
    body("DepartmentDescription")
      .trim()
      .isString()
      .withMessage("Department Description should be string")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("IsActive")
      .notEmpty()
      .withMessage("Department active status is required")
      .bail()
      .isBoolean()
      .withMessage("Department active status should be boolean"),
  ];
};

const addRoleToOrganizationStructureRules = () => {
  return [
    body("RoleName")
      .trim()
      .notEmpty()
      .withMessage("Role Name is required")
      .bail()
      .isString()
      .withMessage("Role Name should be string")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("Role Name should be between 2 to 100 characters")
      .bail()
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage(
        "Role Name can only contain alphabetic characters (a-z, A-Z)"
      )
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        const isRoleNameExist = await Roles.count({
          where: {
            RoleName: {
              [Op.iLike]: value,
            },
            OrganizationStructureID: req.payload.lincense.EnterpriseID,
            IsDeleted: false,
          },
        });

        if (isRoleNameExist || isRoleNameExist > 0) {
          return Promise.reject("Role Name already exist");
        }
        return Promise.resolve();
      }),
    body("RoleDescription")
      .trim()
      .isString()
      .withMessage("Role Description should be string")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("IsActive")
      .notEmpty()
      .withMessage("Role active status is required")
      .bail()
      .isBoolean()
      .withMessage("Role active status should be boolean"),
  ];
};

const updateRoleToOrganizationStructureRules = () => {
  return [
    body("RoleID")
      .trim()
      .notEmpty()
      .withMessage("Role ID is required")
      .bail()
      .isUUID()
      .withMessage("Role ID should be UUID")
      .bail()
      .custom(async (value) => {
        const isRoleExist = await Roles.count({
          where: {
            RoleID: value,
          },
          IsDeleted: false,
        });

        if (!isRoleExist || isRoleExist < 1) {
          return Promise.reject("Role does not exist");
        }
        return Promise.resolve();
      }),
    body("RoleName")
      .trim()
      .notEmpty()
      .withMessage("Role Name is required")
      .bail()
      .isString()
      .withMessage("Role Name should be string")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("Role Name should be between 2 to 100 characters")
      .bail()
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage(
        "Role Name can only contain alphabetic characters (a-z, A-Z)"
      )
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        const isRoleNameExist = await Roles.count({
          where: {
            RoleName: {
              [Op.iLike]: value,
            },
            OrganizationStructureID: req.payload.lincense.EnterpriseID,
            RoleID: { [Op.ne]: req.body.RoleID },
            IsDeleted: false,
          },
        });

        if (isRoleNameExist || isRoleNameExist > 0) {
          return Promise.reject("Role Name already exist");
        }
        return Promise.resolve();
      }),
    body("RoleDescription")
      .trim()
      .isString()
      .withMessage("Role Description should be string")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("IsActive")
      .notEmpty()
      .withMessage("Role active status is required")
      .bail()
      .isBoolean()
      .withMessage("Role active status should be boolean"),
  ];
};

const addEnterprisesRules = () => {
  return [
    body("OrganizationStructureName")
      .trim()
      .notEmpty()
      .withMessage("Enterprise Name is required")
      .bail()
      .isString()
      .withMessage("Enterprise Name should be string")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("Enterprise Name should be between 2 to 100 characters")
      .bail()
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage(
        "Enterprise Name can only contain alphabetic characters (a-z, A-Z)"
      )
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        const isEnterpriseNameExist = await OrganizationStructure.count({
          where: {
            OrganizationStructureName: {
              [Op.iLike]: value,
            },
            IsDeleted: false,
          },
        });

        if (isEnterpriseNameExist || isEnterpriseNameExist > 0) {
          return Promise.reject("Enterprise Name already exist");
        }
        return Promise.resolve();
      }),
    body("EnterpriseDescription")
      .trim()
      .notEmpty()
      .withMessage("Enterprise Description is required")
      .bail()
      .isString()
      .withMessage("Enterprise Description should be string")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      }),
    body("OrganizationStructureEmail")
      .trim()
      .notEmpty()
      .withMessage("Enterprise Email is required")
      .bail()
      .isEmail()
      .withMessage("Please enter a valid email address")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("Enterprise Email should be between 2 to 100 characters")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        const isEnterpriseEmailExist = await OrganizationStructure.count({
          where: {
            OrganizationStructureEmail: {
              [Op.iLike]: value,
            },
            IsDeleted: false,
          },
        });

        if (isEnterpriseEmailExist || isEnterpriseEmailExist > 0) {
          return Promise.reject("Enterprise Email already exist");
        }
        return Promise.resolve();
      }),
    body("OrganizationStructureToken")
      .trim()
      .notEmpty()
      .withMessage("Enterprise Token is required")
      .bail()
      .isString()
      .withMessage("Enterprise Token should be string")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("Enterprise Token should be between 2 to 100 characters")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        const isEnterpriseTokenExist = await OrganizationStructure.count({
          where: {
            OrganizationStructureToken:  value,
            IsDeleted: false,
          },
        });

        if (isEnterpriseTokenExist || isEnterpriseTokenExist > 0) {
          return Promise.reject("Enterprise Token already exist");
        }
        return Promise.resolve();
      }),
    body("IsActive")
      .notEmpty()
      .withMessage("Enterprise active status is required")
      .bail()
      .isBoolean()
      .withMessage("Enterprise active status should be boolean"),
  ];
};

const updateEnterprisesZonesUnitsRules = () => {
  return [
    body("OrganizationStructureID")
      .trim()
      .notEmpty()
      .withMessage("Organization Structure ID is required")
      .bail()
      .isUUID()
      .withMessage("Organization Structure ID should be UUID")
      .bail()
      .custom(async (value) => {
        const isOrganizationStructureExist = await OrganizationStructure.count({
          where: {
            OrganizationStructureID: value,
            IsDeleted: false,
          },
        });

        if (!isOrganizationStructureExist || isOrganizationStructureExist < 1) {
          return Promise.reject("Organization Structure does not exist");
        }
        return Promise.resolve();
      }),
    body("ParentID")
      .trim()
      .isUUID()
      .withMessage("Parent Organization ID should be UUID")
      .bail()
      .custom(async (value) => {
        const isOrganizationStructureExist = await OrganizationStructure.count({
          where: {
            OrganizationStructureID: value,
            IsDeleted: false,
          },
        });

        if (!isOrganizationStructureExist || isOrganizationStructureExist < 1) {
          return Promise.reject("Parent Organization does not exist");
        }
        return Promise.resolve();
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("OrganizationStructureName")
      .trim()
      .notEmpty()
      .withMessage("Name is required")
      .bail()
      .isString()
      .withMessage("Name should be string")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("Name should be between 2 to 100 characters")
      .bail()
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage("Name can only contain alphabetic characters (a-z, A-Z)")
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        const isEnterpriseNameExist = await OrganizationStructure.count({
          where: {
            OrganizationStructureName: value,
            OrganizationStructureID: {
              [Op.ne]: req.body.OrganizationStructureID,
            },
            ParentID: req.body.ParentID
              ? req.body.ParentID
              : req.payload.lincense.EnterpriseID,
            IsDeleted: false,
          },
        });

        if (isEnterpriseNameExist || isEnterpriseNameExist > 0) {
          return Promise.reject("Name already exist");
        }
        return Promise.resolve();
      }),
    body("OrganizationStructureDescription")
      .trim()
      .notEmpty()
      .withMessage("Description is required")
      .bail()
      .isString()
      .withMessage("Description should be string")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      }),
    // body("OrganizationStructureEmail")
    //   .trim()
    //   .isEmail()
    //   .withMessage("Please enter a valid email address")
    //   .bail()
    //   .isLength({ min: 2, max: 100 })
    //   .withMessage("Enterprise Email should be between 2 to 100 characters")
    //   .bail()
    //   .custom(async (value, { req }) => {
    //     const isSafe = helper.isInputSafe(value);
    //     if (!isSafe) {
    //       return Promise.reject("Suspicious input detected!");
    //     }

    //     const isEnterpriseEmailExist = await OrganizationStructure.count({
    //       where: {
    //         OrganizationStructureEmail: value,
    //         OrganizationStructureID: {
    //           [Op.ne]: req.body.OrganizationStructureID,
    //         },
    //         IsDeleted: false,
    //       },
    //     });

    //     if (isEnterpriseEmailExist || isEnterpriseEmailExist > 0) {
    //       return Promise.reject("Enterprise Email already exist");
    //     }
    //     return Promise.resolve();
    //   })
    //   .optional({ checkFalsy: true, nullable: true }),
    body("IsActive")
      .notEmpty()
      .withMessage("Active status is required")
      .bail()
      .isBoolean()
      .withMessage("Active status should be boolean"),
  ];
};

const addOrganizationHierarchyRules = () => {
  return [
    body("ParentID")
      .trim()
      .isUUID()
      .withMessage("Parent Organization ID should be UUID")
      .bail()
      .custom(async (value) => {
        const isOrganizationStructureExist = await OrganizationStructure.count({
          where: {
            OrganizationStructureID: value,
            IsDeleted: false,
          },
        });

        if (!isOrganizationStructureExist || isOrganizationStructureExist < 1) {
          return Promise.reject("Parent Organization does not exist");
        }
        return Promise.resolve();
      })
      .optional({ checkFalsy: true, nullable: true }),
    body("OrganizationStructureName")
      .trim()
      .notEmpty()
      .withMessage("Name is required")
      .bail()
      .isString()
      .withMessage("Name should be string")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("Name should be between 2 to 100 characters")
      .bail()
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage("Name can only contain alphabetic characters (a-z, A-Z)")
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        const isEnterpriseNameExist = await OrganizationStructure.count({
          where: {
            OrganizationStructureName: {
              [Op.iLike]: value,
            },
            ParentID: req.body.ParentID
              ? req.body.ParentID
              : req.payload.lincense.EnterpriseID,
            IsDeleted: false,
          },
        });

        if (isEnterpriseNameExist || isEnterpriseNameExist > 0) {
          return Promise.reject("Name already exist");
        }
        return Promise.resolve();
      }),
    body("OrganizationStructureDescription")
      .trim()
      .notEmpty()
      .withMessage("Description is required")
      .bail()
      .isString()
      .withMessage("Description should be string")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      }),
    body("IsActive")
      .notEmpty()
      .withMessage("Active status is required")
      .bail()
      .isBoolean()
      .withMessage("Active status should be boolean"),
  ];
};

const addAdvertisementRules = () => {
  return [
    body("AdvertisementTitle")
      .trim()
      .notEmpty()
      .withMessage("Advertisement Title is required")
      .bail()
      .isString()
      .withMessage("Advertisement Title should be string")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("Advertisement Title should be between 2 to 100 characters")
      .bail()
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage(
        "Advertisement Title can only contain alphabetic characters (a-z, A-Z)"
      )
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        const isAdvertisementTitleExist = await OrganizationAdvertisement.count(
          {
            where: {
              AdvertisementTitle: {
                [Op.iLike]: value,
              },
              OrganizationStructureID: req.payload.lincense.EnterpriseID,
              IsDeleted: false,
            },
          }
        );
        console.log(isAdvertisementTitleExist);
        if (isAdvertisementTitleExist || isAdvertisementTitleExist > 0) {
          return Promise.reject("Advertisement Title already exist");
        }
        return Promise.resolve();
      }),
    body("AdvertisementDescription")
      .trim()
      .notEmpty()
      .withMessage("Advertisement Description is required")
      .bail()
      .isString()
      .withMessage("Advertisement Description should be string")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      }),
    body("AdvertisementBanner")
      .trim()
      .notEmpty()
      .withMessage("Advertisement Banner Image is required")
      .bail()
      .isString()
      .withMessage("Advertisement Banner Image should be string"),
    body("ExpireDate")
      .trim()
      .notEmpty()
      .withMessage("Advertisement expire date is required")
      .bail()
      .isDate({
        format: "YYYY-MM-DD",
      })
      .withMessage("Please enter a valid date (YYYY-MM-DD)"),
    body("IsActive")
      .notEmpty()
      .withMessage("Advertisement active status is required")
      .bail()
      .isBoolean()
      .withMessage("Advertisement active status should be boolean"),
  ];
};

const updateAdvertisementRules = () => {
  return [
    body("AdvertisementID")
      .trim()
      .notEmpty()
      .withMessage("Advertisement ID is required")
      .bail()
      .isUUID()
      .withMessage("Advertisement ID should be UUID")
      .bail()
      .custom(async (value) => {
        const isAdvertisementExist = await OrganizationAdvertisement.count({
          where: {
            AdvertisementID: value,
            IsDeleted: false,
          },
        });

        if (!isAdvertisementExist || isAdvertisementExist < 1) {
          return Promise.reject("Advertisement does not exist");
        }

        return Promise.resolve();
      }),
    body("AdvertisementTitle")
      .trim()
      .notEmpty()
      .withMessage("Advertisement Title is required")
      .bail()
      .isString()
      .withMessage("Advertisement Title should be string")
      .bail()
      .isLength({ min: 2, max: 100 })
      .withMessage("Advertisement Title should be between 2 to 100 characters")
      .bail()
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage(
        "Advertisement Title can only contain alphabetic characters (a-z, A-Z)"
      )
      .custom(async (value, { req }) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }

        const isAdvertisementTitleExist = await OrganizationAdvertisement.count(
          {
            where: {
              AdvertisementTitle: {
                [Op.iLike]: value,
              },
              AdvertisementID: { [Op.ne]: req.body.AdvertisementID },
              IsDeleted: false,
            },
          }
        );

        if (isAdvertisementTitleExist || isAdvertisementTitleExist > 0) {
          return Promise.reject("Advertisement Title already exist");
        }
        return Promise.resolve();
      }),
    body("AdvertisementDescription")
      .trim()
      .notEmpty()
      .withMessage("Advertisement Description is required")
      .bail()
      .isString()
      .withMessage("Advertisement Description should be string")
      .bail()
      .custom(async (value) => {
        const isSafe = helper.isInputSafe(value);
        if (!isSafe) {
          return Promise.reject("Suspicious input detected!");
        }
        return Promise.resolve();
      }),
    body("AdvertisementBanner")
      .trim()
      .isString()
      .withMessage("Advertisement Banner Image should be string"),
    body("ExpireDate")
      .trim()
      .notEmpty()
      .withMessage("Advertisement expire date is required")
      .bail()
      .isDate({
        format: "YYYY-MM-DD",
      })
      .withMessage("Please enter a valid date (YYYY-MM-DD)"),
    body("IsActive")
      .notEmpty()
      .withMessage("Advertisement active status is required")
      .bail()
      .isBoolean()
      .withMessage("Advertisement active status should be boolean"),
  ];
};

const validate = async (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = [];
  const errorWithParams = {};
  errors.array().forEach((err) => extractedErrors.push(err.msg));
  errors.array().forEach((err) => (errorWithParams[err.path] = err.msg));
  return res.status(422).json({
    message: extractedErrors[0],
    errors: errorWithParams,
  });
};

module.exports = {
  addUserToOrganizationStructureRules,
  updateUserDetailsRules,
  addOrganizationDeparmentsRules,
  updateOrganizationDeparmentsRules,
  addRoleToOrganizationStructureRules,
  updateRoleToOrganizationStructureRules,
  addEnterprisesRules,
  updateEnterprisesZonesUnitsRules,
  addOrganizationHierarchyRules,
  addAdvertisementRules,
  updateAdvertisementRules,
  validate,
};
