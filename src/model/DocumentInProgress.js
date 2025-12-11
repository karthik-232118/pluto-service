const { Sequelize, literal } = require("sequelize");
const { sequelize, DataTypes } = require(".");
const Users = require("./Users");
const DocumentModuleDraft = require("./DocumentModuleDraft");

// DocumentInProgress Model
const DocumentInProgress = sequelize.define(
  "DocumentInProgress",
  {
    InProgressID: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.fn("gen_random_uuid"),
    },

    DocumentID: {
      type: Sequelize.UUID,
      allowNull: false,
    },
    DocumentModuleDraftID: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: DocumentModuleDraft,
        key: "DocumentModuleDraftID",
      },
    },

    Owners: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
    },
    Stakeholders: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
    },
    Approvers: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
    },
    Reviewers: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
    },
    CoOwners: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
    },
    EscalationPerson: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
    },
    StakeHolderEscalationPerson: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
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
    tableName: "DocumentInProgress",
    timestamps: false,
  }
);

DocumentInProgress.belongsTo(DocumentModuleDraft, {
  foreignKey: "DocumentModuleDraftID",
});

module.exports = DocumentInProgress;
