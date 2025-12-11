const { Op, Sequelize, literal, DataTypes, fn, col, QueryTypes } = require("sequelize");
const { sequelize } = require("../model");
const TestSimulationModule = require("../model/TestSimulationModule");
const TestSimulationReport = require("../model/TestSimulationReport");
const { logger } = require("../utils/services/logger");
const helper = require("../utils/helper");
const Users = require("../model/Users");
const jwt = require("jsonwebtoken");
const ResourceAccess = require("../model/ResourceAccess");
const UserOrganizationStructureLink = require("../model/UserOrganizationStructureLink");
const FormModule = require("../model/FormModule");
const FormModuleDraft = require("../model/FormModuleDraft");
const UserDeparmentLink = require("../model/UserDeparmentLink");
const UserRoleLink = require("../model/UserRoleLink");
const SopModule = require("../model/SopModule");
const SopDetails = require("../model/SopDetails");
const SopAttachmentLinks = require("../model/SopAttachmentLinks");
const SopModuleDraft = require("../model/SopModuleDraft");
const ModuleStakeHolder = require("../model/ModuleStakeHolder");
const Group = require("../model/Group");
const UserGroup = require("../model/UserGroup");
const UserModuleLink = require("../model/UserModuleLink");
const UserDetails = require("../model/UserDetails");
const ModuleOwnerChange = require("../model/ModuleOwnerChange");

// Skill Assessment report
const createTestSimulationReport = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { report } = req.body;
  const { currentUserId } = req.payload;

  try {
    if (!report) {
      await t.rollback();
      return res.status(400).json({ message: "Report is required" });
    }

    const cleanedReport = report.replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]+/g,
      ""
    ); // Remove control characters

    const parsedReport = JSON.parse(cleanedReport);

    const getTestSimulationModuleID = await TestSimulationModule.findOne({
      where: {
        TestSimulationName: {
          [Op.iLike]: fn("TRIM", col("TestSimulationName")),
          [Op.iLike]: `%${parsedReport?.prezName?.trim()}%`,
        },
      },
      attributes: ["TestSimulationID", "MasterVersion"],
      transaction: t,
    });

    if (!getTestSimulationModuleID) {
      await t.rollback();
      return res.status(404).json({ message: "Skill Assessment not found" });
    }

    const wrongAnswerClick = parsedReport?.maxPoints
      ? parsedReport.maxPoints - parsedReport.correctCount
      : parsedReport?.totalInteractions - parsedReport?.correctCount;

    await TestSimulationReport.create(
      {
        UserID: currentUserId,
        TestSimulationID: getTestSimulationModuleID.TestSimulationID,
        RightAnswerClick: parsedReport?.correctCount || null,
        WrongAnswerClick: wrongAnswerClick || null,
        TotalPercentage: parsedReport?.percentage || null,
        Report: parsedReport,
        MasterVersion: getTestSimulationModuleID.MasterVersion,
        CreatedBy: currentUserId,
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(200).json({
      message: "Report submitted successfully",
    });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      userId: currentUserId,
    });
    return res.status(500).json({ message: error.message });
  }
};

const auditorList = async (req, res, next) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const { search = "" } = req.body;

    const filter = [
      {
        UserType: {
          [Op.in]: ["Auditor"],
        },
      },
      {
        IsDeleted: false,
      },
    ];

    if (search) {
      filter.push({ UserName: { [Op.iLike]: `%${search}%` } });
    }

    const userList = await Users.findAll({
      where: {
        [Op.and]: filter,
      },
      attributes: [
        "UserID",
        "UserName",
        [
          literal(`(
            SELECT "UserSupervisorID" FROM "UserDetails" 
            WHERE "UserDetails"."UserID" = "Users"."UserID"
          )`),
          "SupervisorID",
        ],
      ],
      include: [
        {
          model: UserDetails,
          as: "UserDetail",
          attributes: ["UserFirstName", "UserMiddleName", "UserLastName"],
        },
        {
          model: UserOrganizationStructureLink,
          attributes: [],
          where: {
            OrganizationStructureID: lincense?.EnterpriseID,
          },
          required: true,
        },
      ],
    });

    return res.status(200).json({
      message: "Auditor list fetched successfully",
      data: {
        userList,
      },
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};
const listProcessOwner = async (req, res, next) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const { search = "" } = req.body;

    const filter = [
      {
        UserType: {
          [Op.in]: ["ProcessOwner"],
        },
      },
      {
        IsDeleted: false,
      },
    ];

    if (search) {
      filter.push({ UserName: { [Op.iLike]: `%${search}%` } });
    }

    const userList = await Users.findAll({
      where: {
        [Op.and]: filter,
      },
      attributes: [
        "UserID",
        "UserName",
        [
          literal(`(
            SELECT "UserSupervisorID" FROM "UserDetails" 
            WHERE "UserDetails"."UserID" = "Users"."UserID"
          )`),
          "SupervisorID",
        ],
      ],
      include: [
        {
          model: UserDetails,
          as: "UserDetail",
          attributes: ["UserFirstName", "UserMiddleName", "UserLastName"],
        },
        {
          model: UserOrganizationStructureLink,
          attributes: [],
          where: {
            OrganizationStructureID: lincense?.EnterpriseID,
          },
          required: true,
        },
      ],
    });

    return res.status(200).json({
      message: "Process owner list fetched successfully",
      data: {
        userList,
      },
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const endUserList = async (req, res, next) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const { search = "" } = req.body;

    const filter = [
      {
        UserType: {
          [Op.in]: ["EndUser"],
        },
      },
      {
        IsDeleted: false,
      },
    ];

    if (search) {
      filter.push({ UserName: { [Op.iLike]: `%${search}%` } });
    }

    const userList = await Users.findAll({
      where: {
        [Op.and]: filter,
      },
      attributes: [
        "UserID",
        "UserName",
        [
          literal(`(
            SELECT "UserSupervisorID" FROM "UserDetails" 
            WHERE "UserDetails"."UserID" = "Users"."UserID"
          )`),
          "SupervisorID",
        ],
      ],
      include: [
        {
          model: UserDetails,
          as: "UserDetail",
          attributes: ["UserFirstName", "UserMiddleName", "UserLastName"],
        },
        {
          model: UserOrganizationStructureLink,
          attributes: [],
          where: {
            OrganizationStructureID: lincense?.EnterpriseID,
          },
          required: true,
        },
      ],
    });

    return res.status(200).json({
      message: "End User list fetched successfully",
      data: {
        userList,
      },
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const listProcessOwnerAndEndUser = async (req, res, next) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const { search = "", page = 1, pageSize = 100 } = req.body;

    const modifiedPageSize = search ? 50 : pageSize;
    const { limit, offset } = helper.getLimitAndOffset(page, modifiedPageSize);

    const filter = [
      {
        UserType: {
          [Op.in]: ["ProcessOwner", "EndUser"],
        },
      },
      {
        IsDeleted: false,
      },
    ];

    if (search) {
      filter.push({ UserName: { [Op.iLike]: `%${search}%` } });
    }

    const userList = await Users.findAll({
      where: {
        [Op.and]: filter,
      },
      attributes: [
        "UserID",
        "UserName",
        [
          literal(`(
        SELECT COUNT(*) > 0 FROM "UserDetails" 
        WHERE "UserDetails"."UserID" = "Users"."UserID" 
        AND "UserDetails"."UserSiganture" IS NOT null
      )`),
          "IsSignatureUploaded",
        ],
        [
          literal(`(
        SELECT "UserSupervisorID" FROM "UserDetails" 
        WHERE "UserDetails"."UserID" = "Users"."UserID"
      )`),
          "SupervisorID",
        ],
      ],
      include: [
        {
          model: UserDetails,
          as: "UserDetail",
          attributes: ["UserFirstName", "UserMiddleName", "UserLastName"],
        },
        {
          model: UserOrganizationStructureLink,
          attributes: [],
          where: {
            OrganizationStructureID: lincense?.EnterpriseID,
          },
          required: true,
        },
      ],
      limit,
      offset,
      distinct: true,
    });

    return res.status(200).json({
      message: "User list fetched successfully",
      data: {
        userList,
      },
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};
const userLIstWhoHaveSignature = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const { search = "" } = req.body;

    const filter = [
      {
        UserType: {
          [Op.in]: ["ProcessOwner", "EndUser"],
        },
      },
      {
        IsDeleted: false,
      },
    ];

    if (search) {
      filter.push({ UserName: { [Op.iLike]: `%${search}%` } });
    }

    const userList = await Users.findAll({
      where: {
        [Op.and]: filter,
        UserID: {
          [Op.in]: literal(`(
          SELECT "UserID" FROM "UserDetails" 
          WHERE "UserDetails"."UserID" = "Users"."UserID" 
          AND ("UserDetails"."UserSiganture" IS NOT null OR "UserDetails"."UserSiganture" != '')
        )`)
        }
      },
      attributes: [
        "UserID",
        "UserName",
      ],
      include: [
        {
          model: UserDetails,
          as: "UserDetail",
          attributes: ["UserFirstName", "UserMiddleName", "UserLastName"],
        },
        {
          model: UserOrganizationStructureLink,
          attributes: [],
          where: {
            OrganizationStructureID: lincense?.EnterpriseID,
          },
          required: true,
        },
      ],
      distinct: true,
    });

    return res.status(200).json({
      message: "User list fetched successfully",
      data: {
        userList,
      },
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
}
const userListWhoIsCoOwner = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const { search = "" } = req.body;

    const filter = [
      {
        UserType: {
          [Op.in]: ["ProcessOwner"],
        },
      },
      {
        IsDeleted: false,
      },
    ];

    if (search) {
      filter.push({ UserName: { [Op.iLike]: `%${search}%` } });
    }

    const userList = await Users.findAll({
      where: {
        [Op.and]: filter,
        UserID: {
          [Op.in]: literal(`(
          SELECT unnest("CoOwnerUserID") FROM "SopModules" WHERE "IsDeleted" IS NOT TRUE AND "CoOwnerUserID" @> ARRAY["Users"."UserID"]
          UNION
          SELECT unnest("CoOwnerUserID") FROM "DocumentModules" WHERE "IsDeleted" IS NOT TRUE AND "CoOwnerUserID" @> ARRAY["Users"."UserID"]
        )`)
        }
      },
      attributes: [
        "UserID",
        "UserName",
      ],
      include: [
        {
          model: UserDetails,
          as: "UserDetail",
          attributes: ["UserFirstName", "UserMiddleName", "UserLastName"],
        },
        {
          model: UserOrganizationStructureLink,
          attributes: [],
          where: {
            OrganizationStructureID: lincense?.EnterpriseID,
          },
          required: true,
        },
      ],
      distinct: true,
    });

    return res.status(200).json({
      message: "User list fetched successfully",
      data: {
        userList,
      },
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
}
const userListWhoIsOwner = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const { search = "" } = req.body;

    const filter = [
      {
        UserType: {
          [Op.in]: ["ProcessOwner"],
        },
      },
      {
        IsDeleted: false,
      },
    ];

    if (search) {
      filter.push({ UserName: { [Op.iLike]: `%${search}%` } });
    }

    const userList = await Users.findAll({
      where: {
        [Op.and]: filter,
        UserID: {
          [Op.in]: literal(`(
          SELECT "CreatedBy" FROM "SopModules" WHERE "IsDeleted" IS NOT TRUE AND "CreatedBy" = "Users"."UserID"
          UNION
          SELECT "CreatedBy" FROM "DocumentModules" WHERE "IsDeleted" IS NOT TRUE AND "CreatedBy" = "Users"."UserID"
          UNION
          SELECT "CreatedBy" FROM "TrainingSimulationModules" WHERE "IsDeleted" IS NOT TRUE AND "CreatedBy" = "Users"."UserID"
          UNION
          SELECT "CreatedBy" FROM "TestSimulationModules" WHERE "IsDeleted" IS NOT TRUE AND "CreatedBy" = "Users"."UserID"
          UNION
          SELECT "CreatedBy" FROM "TestMcqsModules" WHERE "IsDeleted" IS NOT TRUE AND "CreatedBy" = "Users"."UserID"
          UNION
          SELECT "CreatedBy" FROM "FormModules" WHERE "IsDeleted" IS NOT TRUE AND "CreatedBy" = "Users"."UserID"
        )`)
        }
      },
      attributes: [
        "UserID",
        "UserName",
      ],
      include: [
        {
          model: UserDetails,
          as: "UserDetail",
          attributes: ["UserFirstName", "UserMiddleName", "UserLastName"],
        },
        {
          model: UserOrganizationStructureLink,
          attributes: [],
          where: {
            OrganizationStructureID: lincense?.EnterpriseID,
          },
          required: true,
        },
      ],
      distinct: true,
    });

    return res.status(200).json({
      message: "User list fetched successfully",
      data: {
        userList,
      },
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
}
const userRelaterSignatoryElementList = async (req, res) => {
  const { currentUserId } = req.payload;
  const { UserID } = req.body;
  try {
    const data = await sequelize.query(`
      SELECT
          M."ModuleName",
          COALESCE(
            S."SOPName",
            D."DocumentName",
            T."TrainingSimulationName",
            TT."TestSimulationName",
            MM."TestMCQName",
            F."FormName"
          ) AS "ElementName",
          COALESCE(
            S."SOPID",
            D."DocumentID",
            T."TrainingSimulationID",
            TT."TestSimulationID",
            MM."TestMCQID",
            F."FormID"
          ) AS "ElementID",
          A."AuditorSignatureID"
        FROM
          "AuditorSignatures" A
          INNER JOIN "ModuleMasters" M ON M."ModuleTypeID" = A."ModuleTypeID" 
          LEFT JOIN "SopModules" S ON S."SOPID" = A."ModuleID" AND S."IsDeleted" IS NOT TRUE
          LEFT JOIN "DocumentModules" D ON D."DocumentID" = A."ModuleID" AND D."IsDeleted" IS NOT TRUE
          LEFT JOIN "TrainingSimulationModules" T ON T."TrainingSimulationID" = A."ModuleID" AND T."IsDeleted" IS NOT TRUE
          LEFT JOIN "TestSimulationModules" TT ON TT."TestSimulationID" = A."ModuleID" AND TT."IsDeleted" IS NOT TRUE
          LEFT JOIN "TestMcqsModules" MM ON MM."TestMCQID" = A."ModuleID" AND MM."IsDeleted" IS NOT TRUE
          LEFT JOIN "FormModules" F ON F."FormID" = A."ModuleID" AND F."IsDeleted" IS NOT TRUE
        WHERE
          :UserID = ANY (A."SignatureIDs");
          `, {
      type: QueryTypes.SELECT,
      replacements: {
        UserID
      }
    });
    return res.status(200).json({
      message: "User list fetched successfully",
      data: {
        data,
      },
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
}

const replaceSignatoryUser = async (req, res) => {
  const { currentUserId } = req.payload;
  const { ElementID = [], OldOwnerID, NewOwnerID, ChangeReason = null } = req.body;
  const t = await sequelize.transaction();
  try {
    if (ElementID.length == 0 || !OldOwnerID || !NewOwnerID) {
      res.status(400).send({ message: "No/Invalid data provided" });
      return;
    }
    const Elements = await sequelize.query(
      `SELECT "ModuleID", "ModuleTypeID","CreatedDate" FROM (
        SELECT "SOPID" AS "ModuleID", "ModuleTypeID","CreatedDate" FROM "SopModules" WHERE "SOPID" IN (:ElementID) AND "IsDeleted" IS NOT TRUE
        UNION ALL
        SELECT "DocumentID" AS "ModuleID", "ModuleTypeID","CreatedDate" FROM "DocumentModules" WHERE "DocumentID" IN (:ElementID) AND "IsDeleted" IS NOT TRUE
        UNION ALL
        SELECT "TrainingSimulationID" AS "ModuleID", "ModuleTypeID","CreatedDate" FROM "TrainingSimulationModules" WHERE "TrainingSimulationID" IN (:ElementID) AND "IsDeleted" IS NOT TRUE
        UNION ALL
        SELECT "TestSimulationID" AS "ModuleID", "ModuleTypeID","CreatedDate" FROM "TestSimulationModules" WHERE "TestSimulationID" IN (:ElementID) AND "IsDeleted" IS NOT TRUE
        UNION ALL
        SELECT "TestMCQID" AS "ModuleID", "ModuleTypeID","CreatedDate" FROM "TestMcqsModules" WHERE "TestMCQID" IN (:ElementID) AND "IsDeleted" IS NOT TRUE
        UNION ALL
        SELECT "FormID" AS "ModuleID", "ModuleTypeID","CreatedDate" FROM "FormModules" WHERE "FormID" IN (:ElementID) AND "IsDeleted" IS NOT TRUE
      ) AS Modules`,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: { ElementID },
      }
    );

    const ownerData = [];
    for (const el of Elements) {
      ownerData.push({
        ModuleID: el.ModuleID,
        ModuleTypeID: el.ModuleTypeID,
        OldOwnerID,
        NewOwnerID,
        ModuleCreatedDate: el.CreatedDate,
        ChangeReason,
        ChangeUserType: "Signatory",
        CreatedBy: currentUserId
      });
    }
    await ModuleOwnerChange.bulkCreate(ownerData, { transaction: t });
    await sequelize.query(
      `UPDATE "AuditorSignatures"
        SET "SignatureIDs" = array_replace("SignatureIDs", :OldOwnerID, :NewOwnerID)
        WHERE "ModuleID" IN (:ElementID)
          AND "SignatureIDs" @> ARRAY[:OldOwnerID]::uuid[]
          AND "IsDeleted" IS NOT TRUE;     
      `,
      {
        replacements: {
          NewOwnerID,
          OldOwnerID,
          ElementID,
        },
        transaction: t
      }
    );
    res.status(200).send({ message: "Module Signatory changed successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
}
const moduleCoOwnerChange = async (req, res) => {
  const { currentUserId } = req.payload;
  const { ElementID = [], OldOwnerID, NewOwnerID, ChangeReason = null} = req.body;
  const t = await sequelize.transaction();
  try {
    if (ElementID.length == 0 || !OldOwnerID || !NewOwnerID) {
      res.status(400).send({ message: "No/Invalid data provided" });
      return;
    }
    const Elements = await sequelize.query(
      `SELECT "ModuleID", "ModuleTypeID","CreatedDate" FROM (
        SELECT "SOPID" AS "ModuleID", "ModuleTypeID","CreatedDate" FROM "SopModules" WHERE "SOPID" IN (:ElementID) AND "IsDeleted" IS NOT TRUE
        UNION ALL
        SELECT "DocumentID" AS "ModuleID", "ModuleTypeID","CreatedDate" FROM "DocumentModules" WHERE "DocumentID" IN (:ElementID) AND "IsDeleted" IS NOT TRUE
        UNION ALL
        SELECT "TrainingSimulationID" AS "ModuleID", "ModuleTypeID","CreatedDate" FROM "TrainingSimulationModules" WHERE "TrainingSimulationID" IN (:ElementID) AND "IsDeleted" IS NOT TRUE
        UNION ALL
        SELECT "TestSimulationID" AS "ModuleID", "ModuleTypeID","CreatedDate" FROM "TestSimulationModules" WHERE "TestSimulationID" IN (:ElementID) AND "IsDeleted" IS NOT TRUE
        UNION ALL
        SELECT "TestMCQID" AS "ModuleID", "ModuleTypeID","CreatedDate" FROM "TestMcqsModules" WHERE "TestMCQID" IN (:ElementID) AND "IsDeleted" IS NOT TRUE
        UNION ALL
        SELECT "FormID" AS "ModuleID", "ModuleTypeID","CreatedDate" FROM "FormModules" WHERE "FormID" IN (:ElementID) AND "IsDeleted" IS NOT TRUE
      ) AS Modules`,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: { ElementID },
      }
    );

    const ownerData = [];
    for (const el of Elements) {
      ownerData.push({
        ModuleID: el.ModuleID,
        ModuleTypeID: el.ModuleTypeID,
        OldOwnerID,
        NewOwnerID,
        ModuleCreatedDate: el.CreatedDate,
        ChangeReason,
        ChangeUserType: "Co-Owner",
        CreatedBy: currentUserId
      });
    }
    await ModuleOwnerChange.bulkCreate(ownerData, { transaction: t });
    await sequelize.query(
      `UPDATE "SopModules" SET "CoOwnerUserID" = ARRAY_REPLACE("CoOwnerUserID", :OldOwnerID, :NewOwnerID) WHERE "SOPID" IN (:ElementID) AND "CoOwnerUserID" @> ARRAY[:OldOwnerID]::uuid[];
      UPDATE "DocumentModules" SET "CoOwnerUserID" = ARRAY_REPLACE("CoOwnerUserID", :OldOwnerID, :NewOwnerID) WHERE "DocumentID" IN (:ElementID) AND "CoOwnerUserID" @> ARRAY[:OldOwnerID]::uuid[];
      UPDATE "SopModuleDrafts" SET "CoOwnerUserID" = ARRAY_REPLACE("CoOwnerUserID", :OldOwnerID, :NewOwnerID) WHERE "SOPID" IN (:ElementID) AND "CoOwnerUserID" @> ARRAY[:OldOwnerID]::uuid[];
      UPDATE "DocumentModuleDrafts" SET "CoOwnerUserID" = ARRAY_REPLACE("CoOwnerUserID", :OldOwnerID, :NewOwnerID) WHERE "DocumentID" IN (:ElementID) AND "CoOwnerUserID" @> ARRAY[:OldOwnerID]::uuid[];
      `,
      {
        replacements: {
          NewOwnerID,
          OldOwnerID,
          ElementID,
        },
        transaction: t
      }
    );
    res.status(200).send({ message: "Module co-owner changed successfully" });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
}
const coOwnersElements = async (req, res) => {
  const { currentUserId } = req.payload;
  const { UserID } = req.body;
  try {
    const data = await sequelize.query(
      `
      SELECT sm."SOPID" AS "ModuleID",sm."SOPName" AS "ModuleName",sm."MasterVersion"::TEXT,sm."DraftVersion"::TEXT,'SOP' AS "ModuleType"
      FROM "SopModules" sm WHERE sm."IsDeleted" = false AND sm."CoOwnerUserID" @> ARRAY[:UserID]::uuid[]
      UNION ALL
      SELECT dm."DocumentID" AS "ModuleID",dm."DocumentName" AS "ModuleName",dm."MasterVersion"::TEXT,dm."DraftVersion"::TEXT,'Document' AS "ModuleType"
      FROM "DocumentModules" dm WHERE dm."IsDeleted" = false AND dm."CoOwnerUserID" @> ARRAY[:UserID]::uuid[]
      `,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: { UserID },
      }
    );
    res.status(200).send({ data });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
const listForm = async (req, res, next) => {
  const { currentUserId } = req.payload;
  try {
    const { search = "", page = 1, pageSize = 10 } = req.body;

    const modifiedPageSize = search ? 50 : pageSize;
    const { limit, offset } = helper.getLimitAndOffset(page, modifiedPageSize);

    const filter = [
      {
        IsDeleted: false,
      },
    ];

    if (search) {
      filter.push({ FormName: { [Op.iLike]: `%${search}%` } });
    }

    const formList = await FormModule.findAll({
      where: {
        [Op.and]: filter,
        ContentID: {
          [Op.in]: literal(`(
            SELECT "ContentID"
            FROM "ContentStructures" 
            WHERE "OrganizationStructureID" = '${req.payload.lincense?.EnterpriseID}'
          )`),
        },
      },
      include: {
        model: FormModuleDraft,
        attributes: ["FormModuleDraftID", "FormID", "CreatedDate"],
        required: true,
        where: {
          FormModuleDraftID: {
            [Op.in]: literal(`(
              SELECT "FormModuleDraftID"
              FROM "FormModuleDrafts" AS draft
              WHERE draft."FormID" = "FormModule"."FormID"
              ORDER BY draft."CreatedDate" DESC
              LIMIT 1
            )`),
          },
        },
      },
      attributes: ["FormID", "FormName", "FormJSON"],
      limit: limit,
      offset: offset,
      distinct: true,
    });

    const modifiedFormList = formList.map(
      ({ FormID, FormModuleDrafts, FormName, FormJSON }) => ({
        FormID,
        FormModuleDraftID: FormModuleDrafts[0]?.FormModuleDraftID,
        FormName,
        FormData:
          FormJSON?.map(({ field_name, label }) =>
            field_name && label
              ? { FieldID: field_name, FieldLabel: label }
              : null
          ).filter(Boolean) || [],
      })
    );

    return res.status(200).json({
      message: "Form list fetched successfully",
      data: {
        formList: modifiedFormList,
      },
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const generateTokenForDynamicForm = async (req, res, next) => {
  const {
    FormModuleDraftID,
    UserModuleLinkID = null,
    OtherData = {},
  } = req.body;
  const { currentUserId, UserType, accessToken } = req.payload;

  try {
    const rawPayload = {
      FormModuleDraftID,
      UserModuleLinkID,
      UserID: currentUserId,
      UserType,
      AccessToken: accessToken,
      OtherData,
    };

    const encryptedPayload = helper.encryptPayload(rawPayload);

    const token = jwt.sign(
      encryptedPayload,
      process.env.DYNAMIC_FORM_SECRET_KEY
    );

    await ResourceAccess.create({
      ResourceID: FormModuleDraftID,
      AccessToken: token,
      OtherData: OtherData,
      CreatedBy: currentUserId,
    });

    return res.status(200).json({
      message: "Token generated successfully",
      data: {
        token: token,
      },
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      userId: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const listUsersToAssignElement = async (req, res, next) => {
  const { currentUserId } = req.payload;
  try {
    const {
      Departments = [],
      Roles = [],
      Groups = [],
      search = "",
      IsRevoke,
      page = 1,
      pageSize = 50,
      ModuleTypeID,
      ModuleID,
    } = req.body;

    const { limit, offset } = helper.getLimitAndOffset(page, pageSize);

    const filter = [];

    if (search) {
      filter.push({ UserName: { [Op.iLike]: `%${search}%` } });
    }

    let userIds = [];
    if (!IsRevoke) {
      if (Departments.length > 0) {
        const departmentUsers = await UserDeparmentLink.findAll({
          where: {
            DepartmentID: {
              [Op.in]: Departments,
            },
            IsDeleted: false,
          },
          attributes: ["UserID"],
        });

        userIds = departmentUsers.map(({ UserID }) => UserID);
      }

      if (Roles.length > 0) {
        const roleUsers = await UserRoleLink.findAll({
          where: {
            RoleID: {
              [Op.in]: Roles,
            },
            IsDeleted: false,
          },
          attributes: ["UserID"],
        });

        userIds = [...userIds, ...roleUsers.map(({ UserID }) => UserID)];
      }

      // if (Groups.length > 0) {
      //   const groupsWithUsers = await Group.findAll({
      //     where: {
      //       GroupID: { [Op.in]: Groups },
      //       IsDeleted: false,
      //     },
      //     include: [
      //       {
      //         model: Users,
      //         as: "UsersInGroup",
      //         where: { IsDeleted: false },
      //         attributes: ["UserID"],
      //         through: { where: { IsDeleted: false, IsActive: true } },
      //       },
      //     ],
      //   });

      //   groupsWithUsers.forEach((group) => {
      //     userIds = [
      //       ...userIds,
      //       ...group.UsersInGroup.map((user) => user.UserID),
      //     ];
      //   });
      // }

      if (userIds.length === 0) {
        return res.status(200).json({
          message: "User list fetched successfully",
          data: {
            userList: [],
            totalCount: 0,
          },
        });
      }

      userIds = [...new Set(userIds)];

      filter.push({
        IsDeleted: false,
        UserID: {
          [Op.in]: userIds,
        },
      });
      const { rows, count } = await Users.findAndCountAll({
        where: {
          [Op.and]: filter,
          UserType: {
            [Op.in]: ["ProcessOwner", "EndUser"],
          },
        },
        attributes: ["UserID", "UserName"],
        limit: limit,
        offset: offset,
        distinct: true,
      });
      return res.status(200).json({
        message: "User list fetched successfully",
        data: {
          userList: rows,
          count: count,
        },
      });
    } else {
      if (Departments.length > 0) {
        const departmentUsers = await UserModuleLink.findAll({
          where: {
            DepartmentID: {
              [Op.in]: Departments,
            },
            ModuleTypeID: ModuleTypeID,
            ModuleID: ModuleID,
            IsDeleted: false,
          },
          attributes: ["UserID"],
        });

        userIds = departmentUsers.map(({ UserID }) => UserID);
      }

      if (Roles.length > 0) {
        const roleUsers = await UserModuleLink.findAll({
          where: {
            RoleID: {
              [Op.in]: Roles,
            },
            ModuleTypeID: ModuleTypeID,
            ModuleID: ModuleID,
            IsDeleted: false,
          },
          attributes: ["UserID"],
        });

        userIds = [...userIds, ...roleUsers.map(({ UserID }) => UserID)];
      }

      // Remove duplicate UserIDs
      userIds = [...new Set(userIds)];

      if (userIds.length === 0) {
        return res.status(200).json({
          message: "User list fetched successfully",
          data: {
            userList: [],
            totalCount: 0,
            selectedUserList: [],
          },
        });
      }

      filter.push({
        IsDeleted: false,
        UserID: {
          [Op.in]: userIds,
        },
      });
      const { rows, count } = await Users.findAndCountAll({
        where: {
          [Op.and]: filter,
          UserType: {
            [Op.in]: ["ProcessOwner", "EndUser"],
          },
        },
        attributes: ["UserID", "UserName"],
        limit: limit,
        offset: offset,
        distinct: true,
      });
      return res.status(200).json({
        message: "User list fetched successfully",
        data: {
          userList: rows,
          count: count,
        },
      });
    }
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const listSOPTemplates = async (req, res, next) => {
  const { currentUserId } = req.payload;
  try {
    const { search = "", page = 1, pageSize = 100 } = req.body;

    const modifiedPageSize = search ? 100 : pageSize;
    const { limit, offset } = helper.getLimitAndOffset(page, modifiedPageSize);

    const filter = [
      {
        IsDeleted: false,
      },
      {
        IsTemplate: true,
      },
      literal(`
          "CreatedDate" = (
            SELECT MAX("CreatedDate") 
            FROM "SopModuleDrafts" AS "sub" 
            WHERE 
              "sub"."SOPID" = "SopModuleDraft"."SOPID" 
              AND "sub"."IsDeleted" = false
          )
        `),
    ];

    if (search) {
      filter.push({ SOPName: { [Op.iLike]: `%${search}%` } });
    }

    const sopTemplates = await SopModuleDraft.findAll({
      where: {
        [Op.and]: filter,
      },
      attributes: ["SOPName", "SOPID", "SOPDraftID"],
      order: [["CreatedDate", "DESC"]],
      limit: limit,
      offset: offset,
      distinct: true,
    });

    return res.status(200).json({
      message: "Templates fetched successfully",
      data: {
        sopTemplates,
      },
    });
  } catch (error) {
    console.error(error);
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const viewSOPTemplate = async (req, res, next) => {
  const { currentUserId } = req.payload;
  try {
    const { SOPID, SOPDraftID } = req.body;

    if (!SOPID || !SOPDraftID) {
      return res
        .status(400)
        .json({ message: "SOPID and SOPDraftID is required" });
    }

    const sopTemplate = await SopModuleDraft.findOne({
      where: {
        SOPID: SOPID,
        SOPDraftID: SOPDraftID,
        IsDeleted: false,
        IsTemplate: true,
      },
      include: {
        model: SopDetails,
        as: "SopDetails",
        required: false,
        attributes: {
          exclude: ["CreatedBy", "CreatedDate", "ModifiedDate", "ModifiedBy"],
        },
        include: [
          {
            model: SopAttachmentLinks,
            as: "SopAttachmentLinks",
            required: false,
            attributes: {
              exclude: [
                "CreatedBy",
                "CreatedDate",
                "ModifiedDate",
                "ModifiedBy",
              ],
            },
          },
        ],
      },
      attributes: ["SOPXMLElement"],
    });

    return res.status(200).json({
      message: "Template fetched successfully",
      data: {
        sopTemplate,
      },
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

module.exports = {
  createTestSimulationReport,
  listProcessOwner,
  auditorList,
  endUserList,
  listProcessOwnerAndEndUser,
  listForm,
  generateTokenForDynamicForm,
  listUsersToAssignElement,
  listSOPTemplates,
  viewSOPTemplate,
  userLIstWhoHaveSignature,
  userRelaterSignatoryElementList,
  replaceSignatoryUser,
  moduleCoOwnerChange,
  coOwnersElements,
  userListWhoIsCoOwner,
  userListWhoIsOwner
};
