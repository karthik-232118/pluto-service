const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const RiskModule = require("./RiskModule");
const RiskModuleDraft = require("./RiskModuleDraft");
const SopModule = require("./SopModule");
const SopDetails = require("./SopDetails");
const SopModuleDraft = require("./SopModuleDraft");
const Users = require("./Users");
const SopFlow = require("./SopFlow");

const RiskSopLink = sequelize.define(
  "RiskSopLink",
  {
    RiskSopLinkID: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },
    RiskID: {
      type: DataTypes.UUID,
      allowNull: false,
      //   references: {
      //     model: RiskModule,
      //     key: "RiskID",
      //   },
    },
    SOPID: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: SopModule,
        key: "SOPID",
      },
    },
    SopFlowID: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: SopFlow,
        key: "SopFlowID",
      },
    },
    NodeID: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    BPMNNodeID: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    RiskDraftID: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: RiskModuleDraft,
        key: "RiskModuleDraftID",
      },
    },
    SopDraftID: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: SopModuleDraft,
        key: "SOPDraftID",
      },
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    CreatedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Users,
        key: "UserID",
      },
    },
    CreatedDate: {
      type: DataTypes.DATE,
      defaultValue: literal("CURRENT_TIMESTAMP"),
    },
    ModifiedBy: {
      type: DataTypes.UUID,
      defaultValue: null,
      references: {
        model: Users,
        key: "UserID",
      },
    },
    ModifiedDate: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    DeletedBy: {
      type: DataTypes.UUID,
      defaultValue: null,
      references: {
        model: Users,
        key: "UserID",
      },
    },
    DeletedDate: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
  },
  {
    timestamps: false,
  }
);

// Associations
RiskSopLink.belongsTo(RiskModule, {
  foreignKey: "RiskID",
  as: "RiskModule",
});

RiskSopLink.belongsTo(SopModule, {
  foreignKey: "SOPID",
  as: "SopModule",
});

RiskSopLink.belongsTo(RiskModuleDraft, {
  foreignKey: "RiskDraftID",
  as: "RiskDraftModule",
});

RiskSopLink.belongsTo(SopModuleDraft, {
  foreignKey: "SopDraftID",
  as: "SopDraftModule",
});

module.exports = RiskSopLink;
