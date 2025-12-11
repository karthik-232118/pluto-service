const {
  Op,
  literal,
  QueryTypes,
} = require("sequelize");
const { sequelize } = require("../../../model");
const { logger } = require("../../../utils/services/logger");
const ElementAttributeType = require("../../../model/ElementAttributeType");
const ElementAttributeUsers = require("../../../model/ElementAttributeUsers");
const helper = require("../../../utils/helper");
const { moduleMapping } = require("../../../utils/moduleConfig");

const createUpdateElementAttributeType = async (req, res) => {
  const t = await sequelize.transaction();

  const {
    ElementAttributeTypeID,
    ModuleTypeID,
    Name,
    Description,
    IsReview,
    Reviewers,
    IsApproval,
    Approvers,
    IsStakeholder,
    Stakeholders,
    IsStakeHolderEscalation,
    StakeHolderEscalationUsers,
    StakeHolderEscalationType,
    StakeHolderEscalationAfter,
    IsEscalation,
    EscalationUsers,
    EscalationType,
    EscalationAfter,
    IsDownloadable,
    DownloadableUsers,
    SelfApproved,
    IsExpiry,
    ExpiryDate,
    IsEmailTrigger,
    IsAutoPublish,
    ReviewNotificationType = "Days",
    ReviewNotificationInterval,
    NeedAcceptanceFromStakeHolder,
    NeedAcceptance,
    NeedAcceptanceForApprover,
    CoOwnerUserID
  } = req.body;
  const { currentUserId, lincense } = req.payload;

  try {
    let createdID = ElementAttributeTypeID;

    const insertUsers = async ({ list, typeKey, idKey, transaction }) => {
      if (list && list.length) {
        const records = list.map((UserID) => ({
          ElementAttributeTypeID: idKey,
          ModuleTypeID: ModuleTypeID,
          UserID,
          [typeKey]: true,
          CreatedBy: currentUserId,
        }));

        const chunks = helper.chunkArray(records, 3);
        const bulkInserts = chunks.map((chunk) =>
          ElementAttributeUsers.bulkCreate(chunk, { transaction })
        );
        await Promise.all(bulkInserts);
      }
    };

    const isReview = helper.normalizeBool(IsReview);
    const isApproval = helper.normalizeBool(IsApproval);
    const isStakeholder = helper.normalizeBool(IsStakeholder);
    const isEscalation = helper.normalizeBool(IsEscalation);
    const isStakeHolderEscalation = helper.normalizeBool(IsStakeHolderEscalation,);
    const isDownloadable = helper.normalizeBool(IsDownloadable);

    if (ElementAttributeTypeID) {
      await Promise.all([
        ElementAttributeType.update(
          {
            Name,
            Description,
            SelfApproved,
            IsReview,
            IsApproval,
            IsStakeholder,
            IsEscalation,
            IsStakeHolderEscalation,
            EscalationType: EscalationType || null,
            EscalationAfter: EscalationAfter || null,
            StakeHolderEscalationType: StakeHolderEscalationType || null,
            StakeHolderEscalationAfter: StakeHolderEscalationAfter || null,
            IsDownloadable,
            IsEmailTrigger,
            IsAutoPublish,
            IsExpiry,
            ExpiryDate: ExpiryDate || null,
            ReviewNotificationType,
            ReviewNotificationInterval,
            NeedAcceptanceFromStakeHolder,
            NeedAcceptance,
            NeedAcceptanceForApprover,
            ModifiedBy: currentUserId,
            OrganizationStructureID: lincense.EnterpriseID,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
            CoOwnerUserID
          },
          {
            where: {
              ModuleTypeID,
              ElementAttributeTypeID,
              IsDeleted: false,
            },
            transaction: t,
          }
        ),
        ElementAttributeUsers.update(
          {
            IsDeleted: true,
            DeletedBy: currentUserId,
            DeletedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: {
              ModuleTypeID,
              ElementAttributeTypeID,
              IsDeleted: false,
            },
            transaction: t,
          }
        ),
      ]);

      if (isReview && Reviewers && Reviewers?.length) {
        await insertUsers({
          list: Reviewers,
          typeKey: "IsReviewer",
          idKey: ElementAttributeTypeID,
          transaction: t,
        });
      }
      if (isApproval && Approvers && Approvers?.length) {
        await insertUsers({
          list: Approvers,
          typeKey: "IsApprover",
          idKey: ElementAttributeTypeID,
          transaction: t,
        });
      }
      if (isStakeholder && Stakeholders && Stakeholders?.length) {
        await insertUsers({
          list: Stakeholders,
          typeKey: "IsStakeholder",
          idKey: ElementAttributeTypeID,
          transaction: t,
        });
      }
      if (
        isStakeHolderEscalation &&
        StakeHolderEscalationUsers &&
        StakeHolderEscalationUsers?.length
      ) {
        await insertUsers({
          list: StakeHolderEscalationUsers,
          typeKey: "IsStakeHolderEscalation",
          idKey: ElementAttributeTypeID,
          transaction: t,
        });
      }
      if (isEscalation && EscalationUsers && EscalationUsers?.length) {
        await insertUsers({
          list: EscalationUsers,
          typeKey: "IsEscalation",
          idKey: ElementAttributeTypeID,
          transaction: t,
        });
      }
      if (isDownloadable && DownloadableUsers && DownloadableUsers?.length) {
        await insertUsers({
          list: DownloadableUsers,
          typeKey: "IsDownloadable",
          idKey: ElementAttributeTypeID,
          transaction: t,
        });
      }
    } else {
      const createdElementAttributeType = await ElementAttributeType.create(
        {
          ModuleTypeID,
          Name,
          Description,
          SelfApproved,
          IsReview,
          IsApproval,
          IsStakeholder,
          IsEscalation,
          IsStakeHolderEscalation,
          EscalationType: EscalationType || null,
          EscalationAfter: EscalationAfter || null,
          StakeHolderEscalationType: StakeHolderEscalationType || null,
          StakeHolderEscalationAfter: StakeHolderEscalationAfter || null,
          IsDownloadable,
          IsEmailTrigger,
          IsAutoPublish,
          IsExpiry,
          ExpiryDate: ExpiryDate || null,
          ReviewNotificationType,
          ReviewNotificationInterval,
          NeedAcceptanceFromStakeHolder,
          NeedAcceptance,
          NeedAcceptanceForApprover,
          OrganizationStructureID: lincense.EnterpriseID,
          CreatedBy: currentUserId,
          CoOwnerUserID
        },
        {
          transaction: t,
          returning: true,
        }
      );

      createdID = createdElementAttributeType.ElementAttributeTypeID;

      if (isReview && Reviewers && Reviewers?.length) {
        await insertUsers({
          list: Reviewers,
          typeKey: "IsReviewer",
          idKey: createdElementAttributeType.ElementAttributeTypeID,
          transaction: t,
        });
      }
      if (isApproval && Approvers && Approvers?.length) {
        await insertUsers({
          list: Approvers,
          typeKey: "IsApprover",
          idKey: createdElementAttributeType.ElementAttributeTypeID,
          transaction: t,
        });
      }
      if (isStakeholder && Stakeholders && Stakeholders?.length) {
        await insertUsers({
          list: Stakeholders,
          typeKey: "IsStakeholder",
          idKey: createdElementAttributeType.ElementAttributeTypeID,
          transaction: t,
        });
      }
      if (
        isStakeHolderEscalation &&
        StakeHolderEscalationUsers &&
        StakeHolderEscalationUsers?.length
      ) {
        await insertUsers({
          list: StakeHolderEscalationUsers,
          typeKey: "IsStakeHolderEscalation",
          idKey: createdElementAttributeType.ElementAttributeTypeID,
          transaction: t,
        });
      }
      if (isEscalation && EscalationUsers && EscalationUsers?.length) {
        await insertUsers({
          list: EscalationUsers,
          typeKey: "IsEscalation",
          idKey: createdElementAttributeType.ElementAttributeTypeID,
          transaction: t,
        });
      }
      if (isDownloadable && DownloadableUsers && DownloadableUsers?.length) {
        await insertUsers({
          list: DownloadableUsers,
          typeKey: "IsDownloadable",
          idKey: createdElementAttributeType.ElementAttributeTypeID,
          transaction: t,
        });
      }
    }

    await t.commit();
    return res.status(201).json({
      message: `Attribute ${ElementAttributeTypeID ? "Updated" : "Created"
        } successfully`,
      data: {
        ElementAttributeTypeID: createdID,
      },
    });
  } catch (error) {
    await t.rollback();
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const listElementAttributeTypes = async (req, res) => {
  const {
    ModuleTypeID,
    IsPagination,
    Page = 1,
    PageSize = 10,
    SortField = "CreatedDate",
    SortOrder = "DESC",
    IsGlobalView = false,
    Search,
  } = req.body;
  const { currentUserId, lincense } = req.payload;

  try {
    const isPagination = helper.normalizeBool(IsPagination);

    if (isPagination) {
      const { limit, offset } = helper.getLimitAndOffset(Page, PageSize);
      const sort = helper.sorting(SortField, SortOrder);

      let filter = [];

      filter.push({
        ModuleTypeID,
      });
      filter.push({
        OrganizationStructureID: lincense.EnterpriseID,
      });

      filter.push({
        IsDeleted: false,
      });
      if (Search) {
        filter.push({
          [Op.or]: {
            Name: { [Op.iLike]: `%${Search}%` },
          },
        });
      }
      if (!IsGlobalView) {
        filter.push({ CreatedBy: currentUserId });
      }
      const { count, rows } = await ElementAttributeType.findAndCountAll({
        where: {
          [Op.and]: filter
        },
        attributes: [
          "ElementAttributeTypeID",
          "Name",
          "CreatedBy",
          [
            sequelize.literal(`(
                  EXISTS (
                    SELECT 1 FROM "DocumentModules" dm
                    WHERE dm."ElementAttributeTypeID" = "ElementAttributeType"."ElementAttributeTypeID"
                    AND dm."IsDeleted" = false
                  )
                  OR
                  EXISTS (
                    SELECT 1 FROM "SopModules" sm
                    WHERE sm."ElementAttributeTypeID" = "ElementAttributeType"."ElementAttributeTypeID"
                    AND sm."IsDeleted" = false
                  )
                )`),
            'IsInUse'
          ]
        ],
        offset: offset,
        limit: limit,
        order: [sort],
        distinct: true,
      });

      const pagination = await helper.pagination(Page, PageSize, count);

      return res.status(200).json({
        message: `Attributes fetched successfully`,
        data: {
          elementAttributes: rows,
          pagination: pagination,
        },
      });
    } else {
      let filter = [];

      filter.push({
        ModuleTypeID,
      });
      filter.push({
        IsDeleted: false,
      });
      if (!IsGlobalView) {
        filter.push({ CreatedBy: currentUserId });
      }
      if (Search) {
        filter.push({
          [Op.or]: {
            Name: { [Op.iLike]: `%${Search}%` },
          },
        });
      }

      const elementAttributes = await ElementAttributeType.findAll({
        where: {
          [Op.and]: filter,
        },
        attributes: [
          "ElementAttributeTypeID",
          "Name",
          "CreatedBy",
          [
            sequelize.literal(`(
                  EXISTS (
                    SELECT 1 FROM "DocumentModules" dm
                    WHERE dm."ElementAttributeTypeID" = "ElementAttributeType"."ElementAttributeTypeID"
                    AND dm."IsDeleted" = false
                  )
                  OR
                  EXISTS (
                    SELECT 1 FROM "SopModules" sm
                    WHERE sm."ElementAttributeTypeID" = "ElementAttributeType"."ElementAttributeTypeID"
                    AND sm."IsDeleted" = false
                  )
                )`),
            'IsInUse'
          ]
        ],
    
        sort: [["CreatedDate", "DESC"]],
      });

      return res.status(200).json({
        message: `Attributes fetched successfully`,
        data: {
          elementAttributes: elementAttributes,
        },
      });
    }
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const viewElementAttributeType = async (req, res) => {
  const { ElementAttributeTypeID } = req.body;
  const { currentUserId } = req.payload;

  try {
    const elementAttribute = await ElementAttributeType.findOne({
      where: {
        ElementAttributeTypeID,
        IsDeleted: false,
      },
      include: [
        {
          model: ElementAttributeUsers,
          as: "Reviewers",
          required: false,
          where: {
            IsDeleted: false,
          },
          attributes: ["UserID"],
        },
        {
          model: ElementAttributeUsers,
          as: "Approvers",
          required: false,
          where: {
            IsDeleted: false,
          },
          attributes: ["UserID"],
        },
        {
          model: ElementAttributeUsers,
          as: "Stakeholders",
          required: false,
          where: {
            IsDeleted: false,
          },
          attributes: ["UserID"],
        },
        {
          model: ElementAttributeUsers,
          as: "EscalationUsers",
          required: false,
          where: {
            IsDeleted: false,
          },
          attributes: ["UserID"],
        },
        {
          model: ElementAttributeUsers,
          as: "StakeHolderEscalationUsers",
          required: false,
          where: {
            IsDeleted: false,
          },
          attributes: ["UserID"],
        },
        {
          model: ElementAttributeUsers,
          as: "DownloadableUsers",
          required: false,
          where: {
            IsDeleted: false,
          },
          attributes: ["UserID"],
        },
      ],
      attributes: {
        exclude: [
          "IsActive",
          "IsDeleted",
          "CreatedDate",
          "ModifiedBy",
          "ModifiedDate",
          "DeletedBy",
          "DeletedDate",
        ],
      },
    });

    const modifiedElementAttribute = {
      ...elementAttribute?.toJSON(),
      Reviewers: elementAttribute?.Reviewers?.map((user) => user?.UserID),
      Approvers: elementAttribute?.Approvers?.map((user) => user?.UserID),
      Stakeholders: elementAttribute?.Stakeholders?.map((user) => user?.UserID),
      EscalationUsers: elementAttribute?.EscalationUsers?.map(
        (user) => user?.UserID
      ),
      StakeHolderEscalationUsers:
        elementAttribute?.StakeHolderEscalationUsers?.map(
          (user) => user?.UserID
        ),
      DownloadableUsers: elementAttribute?.DownloadableUsers?.map(
        (user) => user?.UserID
      ),
    };

    return res.status(200).json({
      message: `Attribute fetched successfully`,
      data: {
        elementAttribute: modifiedElementAttribute,
      },
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const deleteElementAttributeType = async (req, res) => {
  const t = await sequelize.transaction();

  const { ElementAttributeTypeID, ModuleName } = req.body;
  const { currentUserId } = req.payload;

  const moduleConfig = moduleMapping[ModuleName];

  if (!moduleConfig) {
    await t.rollback();
    return res.status(400).json({ message: "Invalid module name" });
  }

  const { draftModel } = moduleConfig;

  if (!draftModel) {
    await t.rollback();
    return res.status(400).json({ message: "Invalid module configuration" });
  }

  const elementAttributeType = await draftModel.count({
    where: {
      ElementAttributeTypeID,
      IsDeleted: false,
    },
  });

  if (elementAttributeType > 0) {
    await t.rollback();
    return res.status(400).json({
      message: `Cannot delete attribute as it is getting used`,
    });
  }

  try {
    await Promise.all([
      ElementAttributeType.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: { ElementAttributeTypeID, IsDeleted: false },
          transaction: t,
        }
      ),
      ElementAttributeUsers.update(
        {
          IsDeleted: true,
          DeletedBy: currentUserId,
          DeletedDate: literal("CURRENT_TIMESTAMP"),
        },
        {
          where: { ElementAttributeTypeID, IsDeleted: false },
          transaction: t,
        }
      ),
    ]);

    await t.commit();
    return res.status(200).json({
      message: "Attribute deleted successfully",
    });
  } catch (error) {
    await t.rollback();
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

const linkedDocumentOrSOPInElementAttributeTypes = async (req, res) => {
  const { ElementAttributeTypeID } = req.body;
  const { currentUserId } = req.payload;

  try {
    const linkedElements = await sequelize.query(
      `SELECT dm."DocumentID" AS "ElementID", dm."DocumentName" AS "ElementName", dm."DocumentStatus"::TEXT AS "ElementStatus",'Document' AS "ElementType",
    dm."MasterVersion"::TEXT,dm."DraftVersion"::TEXT FROM "DocumentModules" AS dm
    WHERE dm."ElementAttributeTypeID" = :ElementAttributeTypeID
    AND dm."IsDeleted" = false
    UNION ALL
    SELECT  sm."SOPID" AS "ElementID", sm."SOPName" AS "ElementName", sm."SOPStatus"::TEXT AS "ElementStatus", 'SOP' AS "ElementType",
    sm."MasterVersion",sm."DraftVersion" FROM "SopModules" AS sm
    WHERE sm."ElementAttributeTypeID" = :ElementAttributeTypeID
    AND sm."IsDeleted" = false`, {
      type: QueryTypes.SELECT,
      replacements: { ElementAttributeTypeID },
    });

    return res.status(200).json({
      message: "Linked Elements fetched successfully",
      data: { linkedElements },
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
}

module.exports = {
  createUpdateElementAttributeType,
  listElementAttributeTypes,
  viewElementAttributeType,
  deleteElementAttributeType,
  linkedDocumentOrSOPInElementAttributeTypes
};
