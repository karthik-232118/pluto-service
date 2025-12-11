const ModuleEscalation = require("./ModuleEscalation");
const TrainingSimulationModuleDraft = require("./TrainingSimulationModuleDraft");
const DocumentModuleDraft = require("./DocumentModuleDraft");
const ModuleChecker = require("./ModuleChecker");
const ModuleStakeHolder = require("./ModuleStakeHolder");

const Users = require("./Users");
const TestSimulationModuleDraft = require("./TestSimulationModuleDraft");
const SopModuleDraft = require("./SopModuleDraft");
const ModuleOwner = require("./ModuleOwner");
const DocumentModule = require("./DocumentModule");
const SopModule = require("./SopModule");
const TestSimulationModule = require("./TestSimulationModule");
const TrainingSimulationModule = require("./TrainingSimulationModule");
const UserAttempts = require("./UserAttempts");
const TestMcqsModule = require("./TestMcqsModule");
const TestMcqsModuleDraft = require("./TestMcqsModuleDraft");
const QuestionRepository = require("./QuestionRepository");
const QuestionAnswersLink = require("./QuestionAnswersLink");
const ModuleMaster = require("./ModuleMaster");
const SopDetails = require("./SopDetails");
const UserModuleLink = require("./UserModuleLink");
const Departments = require("./Departments");
const Roles = require("./Roles");
const ESignDocument = require("./ESignDocument");
const ESignRequest = require("./ESignRequest");
const ESignReceiver = require("./ESignReceiver");
const ESignActivity = require("./ESignActivity");
const SopAttachmentLinks = require("./SopAttachmentLinks");
const FormModuleDraft = require("./FormModuleDraft");
const FormModule = require("./FormModule");
const CampaignParticipant = require("./CampaignParticipant");
const Campaign = require("./Campaign");
const UserDeparmentLink = require("./UserDeparmentLink");
const UserRoleLink = require("./UserRoleLink");
const SopFlow = require("./SopFlow");
const SopFlowNodeAttachment = require("./SopFlowNodeAttachment");
const SopFlowNodeDetail = require("./SopFlowNodeDetail");
const SopFlowNodeRole = require("./SopFlowNodeRole");
const ContentStructure = require("./ContentStructure");
const RiskModule = require("./RiskModule");
const RiskAssessment = require("./RiskAssessment");
const RiskAnalysis = require("./RiskAnalysis");
const RiskTreatment = require("./RiskTreatment");
const RiskMonitoringReview = require("./RiskMonitoringReview");
const RiskSopLink = require("./RiskSopLink");
const RiskModuleDraft = require("./RiskModuleDraft");
const UserGroup = require("./UserGroup");
const RiskTreatmentActionItem = require("./RiskTreatmentActionItems");
const ModuleApprover = require("./ModuleApprover");

// src/model/associations.js
const defineAssociations = () => {
  // Define associations here after models are imported
  UserDeparmentLink.belongsTo(Users, {
    foreignKey: "UserID",
  });
  UserRoleLink.belongsTo(Users, {
    foreignKey: "UserID",
  });
  Users.hasMany(UserDeparmentLink, {
    foreignKey: "UserID",
  });
  Users.hasMany(UserRoleLink, {
    foreignKey: "UserID",
  });
  Users.hasMany(UserGroup, { foreignKey: "UserID", as: "UserGroups" });
  UserGroup.belongsTo(Users, { foreignKey: "UserID", as: "User" });

  DocumentModuleDraft.hasMany(ModuleChecker, {
    foreignKey: "DocumentModuleDraftID",
    sourceKey: "DocumentModuleDraftID",
    as: "Checkers",
  });
  DocumentModuleDraft.hasMany(ModuleApprover, {
    foreignKey: "DocumentModuleDraftID",
    sourceKey: "DocumentModuleDraftID",
    as: "Approvers",
  });
  DocumentModuleDraft.hasMany(ModuleStakeHolder, {
    foreignKey: "DocumentModuleDraftID",
    sourceKey: "DocumentModuleDraftID",
    as: "StakeHolders",
  });
  DocumentModuleDraft.hasMany(ModuleEscalation, {
    foreignKey: "DocumentModuleDraftID",
    sourceKey: "DocumentModuleDraftID",
    as: "EscalationPersons",
  });
  DocumentModuleDraft.hasMany(ModuleOwner, {
    foreignKey: "DocumentModuleDraftID",
    sourceKey: "DocumentModuleDraftID",
    as: "ModuleOwners",
  });

  DocumentModule.hasMany(ModuleOwner, {
    foreignKey: "DocumentID",
    sourceKey: "DocumentID",
    as: "ModuleOwners",
  });
  DocumentModuleDraft.hasOne(Users, {
    foreignKey: "UserID",
    sourceKey: "CreatedBy",
    as: "CreatedByUser",
  });

  TrainingSimulationModuleDraft.hasMany(ModuleChecker, {
    foreignKey: "TrainingSimulationDraftID",
    sourceKey: "TrainingSimulationDraftID",
    as: "Checkers",
  });
  TrainingSimulationModuleDraft.hasMany(ModuleEscalation, {
    foreignKey: "TrainingSimulationDraftID",
    sourceKey: "TrainingSimulationDraftID",
    as: "EscalationPersons",
  });
  TrainingSimulationModuleDraft.hasMany(ModuleStakeHolder, {
    foreignKey: "TrainingSimulationDraftID",
    sourceKey: "TrainingSimulationDraftID",
    as: "StakeHolders",
  });
  TrainingSimulationModuleDraft.hasMany(ModuleOwner, {
    foreignKey: "TrainingSimulationDraftID",
    sourceKey: "TrainingSimulationDraftID",
    as: "ModuleOwners",
  });
  TrainingSimulationModule.hasMany(ModuleOwner, {
    foreignKey: "TrainingSimulationID",
    sourceKey: "TrainingSimulationID",
    as: "ModuleOwners",
  });
  TrainingSimulationModuleDraft.hasOne(Users, {
    foreignKey: "UserID",
    sourceKey: "CreatedBy",
    as: "CreatedByUser",
  });

  TestSimulationModuleDraft.hasMany(ModuleChecker, {
    foreignKey: "TestSimulationDraftID",
    sourceKey: "TestSimulationDraftID",
    as: "Checkers",
  });
  TestSimulationModuleDraft.hasMany(ModuleEscalation, {
    foreignKey: "TestSimulationDraftID",
    sourceKey: "TestSimulationDraftID",
    as: "EscalationPersons",
  });
  TestSimulationModuleDraft.hasMany(ModuleStakeHolder, {
    foreignKey: "TestSimulationDraftID",
    sourceKey: "TestSimulationDraftID",
    as: "StakeHolders",
  });
  TestSimulationModuleDraft.hasMany(ModuleOwner, {
    foreignKey: "TestSimulationDraftID",
    sourceKey: "TestSimulationDraftID",
    as: "ModuleOwners",
  });
  TestSimulationModule.hasMany(ModuleOwner, {
    foreignKey: "TestSimulationID",
    sourceKey: "TestSimulationID",
    as: "ModuleOwners",
  });
  TestSimulationModuleDraft.hasOne(Users, {
    foreignKey: "UserID",
    sourceKey: "CreatedBy",
    as: "CreatedByUser",
  });

  SopModuleDraft.hasMany(ModuleChecker, {
    foreignKey: "SOPDraftID",
    sourceKey: "SOPDraftID",
    as: "Checkers",
  });
  SopModuleDraft.hasMany(ModuleApprover, {
    foreignKey: "SOPDraftID",
    sourceKey: "SOPDraftID",
    as: "Approvers",
  });
  SopModuleDraft.hasMany(ModuleEscalation, {
    foreignKey: "SOPDraftID",
    sourceKey: "SOPDraftID",
    as: "EscalationPersons",
  });
  SopModuleDraft.hasMany(ModuleStakeHolder, {
    foreignKey: "SOPDraftID",
    sourceKey: "SOPDraftID",
    as: "StakeHolders",
  });
  SopModuleDraft.hasMany(SopDetails, {
    foreignKey: "SopID",
    sourceKey: "SOPDraftID",
    as: "SopDetails",
  });
  SopModuleDraft.hasMany(ModuleOwner, {
    foreignKey: "SOPDraftID",
    sourceKey: "SOPDraftID",
    as: "ModuleOwners",
  });
  SopModule.hasMany(ModuleOwner, {
    foreignKey: "SOPID",
    sourceKey: "SOPID",
    as: "ModuleOwners",
  });
  SopModuleDraft.hasOne(Users, {
    foreignKey: "UserID",
    sourceKey: "CreatedBy",
    as: "CreatedByUser",
  });
  SopModuleDraft.belongsTo(SopModule, {
    foreignKey: "SOPID",
    targetKey: "SOPID",
    as: "SopModule",
  });
  SopModule.hasMany(SopModuleDraft, {
    foreignKey: "SOPID",
    targetKey: "SOPID",
    as: "SopModule",
  });
  SopModuleDraft.hasOne(Users, {
    foreignKey: "UserID",
    sourceKey: "ModifiedBy",
    as: "ModifiedByUser",
  });

  TestMcqsModuleDraft.hasMany(ModuleChecker, {
    foreignKey: "TestMCQDraftID",
    sourceKey: "TestMCQDraftID",
    as: "Checkers",
  });
  TestMcqsModuleDraft.hasMany(ModuleEscalation, {
    foreignKey: "TestMCQDraftID",
    sourceKey: "TestMCQDraftID",
    as: "EscalationPersons",
  });
  TestMcqsModuleDraft.hasMany(ModuleStakeHolder, {
    foreignKey: "TestMCQDraftID",
    sourceKey: "TestMCQDraftID",
    as: "StakeHolders",
  });
  TestMcqsModuleDraft.hasMany(ModuleOwner, {
    foreignKey: "TestMCQDraftID",
    sourceKey: "TestMCQDraftID",
    as: "ModuleOwners",
  });
  TestMcqsModule.hasMany(ModuleOwner, {
    foreignKey: "TestMCQID",
    sourceKey: "TestMCQID",
    as: "ModuleOwners",
  });
  TestMcqsModuleDraft.hasOne(Users, {
    foreignKey: "UserID",
    sourceKey: "CreatedBy",
    as: "CreatedByUser",
  });
  TestMcqsModule.hasOne(QuestionRepository, {
    foreignKey: "TestMCQID",
    sourceKey: "TestMCQID",
    as: "Questions",
  });
  QuestionRepository.hasOne(QuestionAnswersLink, {
    foreignKey: "QuestionID",
    sourceKey: "QuestionID",
    as: "Answers",
  });

  ModuleChecker.belongsTo(DocumentModuleDraft, {
    foreignKey: "DocumentModuleDraftID",
    targetKey: "DocumentModuleDraftID",
    as: "DocumentDraft",
  });

  ModuleStakeHolder.belongsTo(DocumentModuleDraft, {
    foreignKey: "DocumentModuleDraftID",
    targetKey: "DocumentModuleDraftID",
    as: "DocumentDraft",
  });

  ModuleEscalation.belongsTo(DocumentModuleDraft, {
    foreignKey: "DocumentModuleDraftID",
    targetKey: "DocumentModuleDraftID",
    as: "DocumentDraft",
  });
  ModuleChecker.belongsTo(TrainingSimulationModuleDraft, {
    foreignKey: "TrainingSimulationID",
    targetKey: "TrainingSimulationID",
    as: "TrainingSimulation",
  });
  ModuleEscalation.belongsTo(TrainingSimulationModuleDraft, {
    foreignKey: "TrainingSimulationID",
    targetKey: "TrainingSimulationID",
    as: "TrainingSimulation",
  });
  ModuleChecker.belongsTo(TestSimulationModuleDraft, {
    foreignKey: "TestSimulationID",
    targetKey: "TestSimulationID",
    as: "TestSimulation",
  });
  ModuleEscalation.belongsTo(TestSimulationModuleDraft, {
    foreignKey: "TestSimulationID",
    targetKey: "TestSimulationID",
    as: "TestSimulation",
  });
  ModuleChecker.belongsTo(SopModuleDraft, {
    foreignKey: "SOPID",
    targetKey: "SOPID",
    as: "Sop",
  });
  ModuleEscalation.belongsTo(SopModuleDraft, {
    foreignKey: "SOPID",
    targetKey: "SOPID",
    as: "Sop",
  });
  ModuleChecker.belongsTo(TestMcqsModuleDraft, {
    foreignKey: "TestMCQID",
    targetKey: "TestMCQID",
    as: "TestMCQ",
  });
  ModuleChecker.belongsTo(ModuleMaster, {
    foreignKey: "ModuleTypeID",
    targetKey: "ModuleTypeID",
    as: "ModuleMaster",
  });
  ModuleEscalation.belongsTo(TestMcqsModuleDraft, {
    foreignKey: "TestMCQID",
    targetKey: "TestMCQID",
    as: "TestMCQ",
  });
  ModuleEscalation.belongsTo(ModuleMaster, {
    foreignKey: "ModuleTypeID",
    targetKey: "ModuleTypeID",
    as: "ModuleMaster",
  });
  ModuleChecker.hasOne(Users, {
    foreignKey: "UserID",
    sourceKey: "UserID",
    as: "ModuleCheckerUser",
  });
  ModuleApprover.hasOne(Users, {
    foreignKey: "UserID",
    sourceKey: "UserID",
    as: "ModuleApproverUser",
  });
  ModuleStakeHolder.hasOne(Users, {
    foreignKey: "UserID",
    sourceKey: "UserID",
    as: "ModuleStakeHolderUser",
  });
  ModuleEscalation.hasOne(Users, {
    foreignKey: "UserID",
    sourceKey: "UserID",
    as: "ModuleEscalationUser",
  });
  ModuleOwner.hasOne(Users, {
    foreignKey: "UserID",
    sourceKey: "UserID",
    as: "ModuleOwnerUser",
  });

  UserAttempts.belongsTo(TestMcqsModule, {
    foreignKey: "ModuleID",
    targetKey: "TestMCQID",
    as: "TestMcqAttempt",
  });
  TestMcqsModule.hasMany(UserAttempts, {
    foreignKey: "ModuleID",
    sourceKey: "TestMCQID",
    as: "PreviousAttempts",
  });

  UserModuleLink.hasOne(DocumentModule, {
    foreignKey: "DocumentID",
    sourceKey: "ModuleID",
    as: "DocumentModules", // Alias to refer to this association
  });

  UserModuleLink.hasOne(TrainingSimulationModule, {
    foreignKey: "TrainingSimulationID",
    sourceKey: "ModuleID",
    as: "TrainingSimulationModules",
  });

  UserModuleLink.hasOne(TestSimulationModule, {
    foreignKey: "TestSimulationID",
    sourceKey: "ModuleID",
    as: "TestSimulationModules",
  });

  UserModuleLink.hasOne(TestMcqsModule, {
    foreignKey: "TestMCQID",
    sourceKey: "ModuleID",
    as: "TestMcqsModules",
  });

  UserModuleLink.hasOne(SopModule, {
    foreignKey: "SOPID",
    sourceKey: "ModuleID",
    as: "SopModules",
  });

  UserModuleLink.belongsTo(Departments, {
    foreignKey: "DepartmentID",
    as: "AssignedDepartments",
  });
  Departments.hasMany(UserModuleLink, {
    foreignKey: "DepartmentID",
    as: "AssignedDepartments",
  });
  UserModuleLink.belongsTo(Roles, {
    foreignKey: "RoleID",
    as: "AssignedRoles",
  });
  Roles.hasMany(UserModuleLink, {
    foreignKey: "DepartmentID",
    as: "AssignedRoles",
  });

  ESignRequest.belongsTo(ESignDocument, {
    foreignKey: "ESignDocumentID",
  });
  ESignDocument.hasOne(ESignRequest, {
    foreignKey: "ESignDocumentID",
  });
  ESignReceiver.belongsTo(ESignRequest, {
    foreignKey: "ESignRequestID",
  });
  ESignRequest.hasMany(ESignReceiver, {
    foreignKey: "ESignRequestID",
  });
  ESignActivity.belongsTo(ESignReceiver, {
    foreignKey: "ESignReceiverID",
  });
  ESignReceiver.hasOne(ESignActivity, {
    foreignKey: "ESignReceiverID",
  });
  // Test
  SopAttachmentLinks.belongsTo(SopDetails, {
    foreignKey: "SopDetailsID",
    as: "SopDetails",
  });
  SopDetails.belongsTo(SopModule, {
    foreignKey: "SopID",
    as: "SopModule",
  });
  // Form
  FormModuleDraft.hasMany(ModuleChecker, {
    foreignKey: "FormModuleDraftID",
    sourceKey: "FormModuleDraftID",
    as: "Checkers",
  });
  FormModuleDraft.hasMany(ModuleEscalation, {
    foreignKey: "FormModuleDraftID",
    sourceKey: "FormModuleDraftID",
    as: "EscalationPersons",
  });
  FormModuleDraft.hasMany(ModuleStakeHolder, {
    foreignKey: "FormModuleDraftID",
    sourceKey: "FormModuleDraftID",
    as: "StakeHolders",
  });
  FormModuleDraft.hasMany(ModuleOwner, {
    foreignKey: "FormModuleDraftID",
    sourceKey: "FormModuleDraftID",
    as: "ModuleOwners",
  });
  FormModule.hasMany(ModuleOwner, {
    foreignKey: "FormID",
    sourceKey: "FormID",
    as: "ModuleOwners",
  });
  FormModuleDraft.hasOne(Users, {
    foreignKey: "UserID",
    sourceKey: "CreatedBy",
    as: "CreatedByUser",
  });
  FormModuleDraft.belongsTo(FormModule, {
    foreignKey: "FormID",
    targetKey: "FormID",
  });
  FormModule.hasMany(FormModuleDraft, {
    foreignKey: "FormID",
    targetKey: "FormID",
  });
  ModuleChecker.belongsTo(FormModuleDraft, {
    foreignKey: "FormModuleDraftID",
    targetKey: "FormModuleDraftID",
    as: "FormDraft",
  });

  ModuleEscalation.belongsTo(FormModuleDraft, {
    foreignKey: "FormModuleDraftID",
    targetKey: "FormModuleDraftID",
    as: "FormDraft",
  });

  CampaignParticipant.belongsTo(Campaign, {
    foreignKey: "CampaignID",
    targetKey: "CampaignID",
  });

  Campaign.hasMany(CampaignParticipant, {
    foreignKey: "CampaignID",
    sourceKey: "CampaignID",
  });

  FormModule.hasOne(Campaign, {
    foreignKey: "FormID",
    sourceKey: "FormID",
  });

  Campaign.belongsTo(FormModule, {
    foreignKey: "FormID",
    sourceKey: "FormID",
  });

  SopFlow.belongsTo(SopModule, {
    foreignKey: "SOPID",
    sourceKey: "SOPID",
  });
  SopFlow.belongsTo(SopModuleDraft, {
    foreignKey: "SOPDraftID",
    sourceKey: "SOPDraftID",
  });
  SopModule.hasOne(SopFlow, { foreignKey: "SOPID", sourceKey: "SOPID" });
  SopModuleDraft.hasOne(SopFlow, {
    foreignKey: "SOPDraftID",
    sourceKey: "SOPDraftID",
  });

  SopFlowNodeAttachment.belongsTo(SopFlow, {
    foreignKey: "SopFlowID",
    sourceKey: "SopFlowID",
  });
  SopFlow.hasMany(SopFlowNodeAttachment, {
    foreignKey: "SopFlowID",
    sourceKey: "SopFlowID",
  });
  SopFlowNodeDetail.belongsTo(SopFlow, {
    foreignKey: "SopFlowID",
    sourceKey: "SopFlowID",
  });
  SopFlow.hasMany(SopFlowNodeDetail, {
    foreignKey: "SopFlowID",
    sourceKey: "SopFlowID",
  });
  SopFlowNodeRole.belongsTo(SopFlow, {
    foreignKey: "SopFlowID",
    sourceKey: "SopFlowID",
  });
  SopFlow.hasMany(SopFlowNodeRole, {
    foreignKey: "SopFlowID",
    sourceKey: "SopFlowID",
  });
  DocumentModule.belongsTo(ContentStructure, {
    foreignKey: "ContentID",
  });
  ContentStructure.hasMany(DocumentModule, {
    foreignKey: "ContentID",
  });

  RiskModule.hasMany(RiskAssessment, {
    foreignKey: "RiskID",
    as: "RiskAssessments",
  });
  RiskAssessment.belongsTo(RiskModule, {
    foreignKey: "RiskID",
    as: "RiskModule",
  });
  RiskModuleDraft.hasMany(RiskAssessment, {
    foreignKey: "RiskModuleDraftID",
    as: "RiskAssessments",
  });
  RiskAssessment.belongsTo(RiskModuleDraft, {
    foreignKey: "RiskModuleDraftID",
    as: "RiskModuleDraft",
  });

  RiskModule.hasMany(RiskAnalysis, {
    foreignKey: "RiskID",
    as: "RiskAnalysiss",
  });
  RiskAnalysis.belongsTo(RiskModule, {
    foreignKey: "RiskID",
    as: "RiskModule",
  });
  RiskModuleDraft.hasMany(RiskAnalysis, {
    foreignKey: "RiskModuleDraftID",
    as: "RiskAnalysiss",
  });
  RiskAnalysis.belongsTo(RiskModuleDraft, {
    foreignKey: "RiskModuleDraftID",
    as: "RiskModuleDraft",
  });
  RiskModule.hasMany(RiskTreatment, {
    foreignKey: "RiskID",
    as: "RiskTreatments",
  });
  RiskTreatment.belongsTo(RiskModule, {
    foreignKey: "RiskID",
    as: "RiskModule",
  });
  RiskModuleDraft.hasMany(RiskTreatment, {
    foreignKey: "RiskModuleDraftID",
    as: "RiskTreatments",
  });
  RiskTreatment.belongsTo(RiskModuleDraft, {
    foreignKey: "RiskModuleDraftID",
    as: "RiskModuleDraft",
  });
  RiskModule.hasMany(RiskMonitoringReview, {
    foreignKey: "RiskID",
    as: "RiskMonitoringReviews",
  });
  RiskMonitoringReview.belongsTo(RiskModule, {
    foreignKey: "RiskID",
    as: "RiskModule",
  });
  RiskModuleDraft.hasMany(RiskMonitoringReview, {
    foreignKey: "RiskModuleDraftID",
    as: "RiskMonitoringReviews",
  });
  RiskMonitoringReview.belongsTo(RiskModuleDraft, {
    foreignKey: "RiskModuleDraftID",
    as: "RiskModuleDraft",
  });
  SopFlow.hasMany(RiskSopLink, {
    foreignKey: "SopFlowID",
    sourceKey: "SopFlowID",
  });
  SopModuleDraft.hasMany(RiskSopLink, {
    foreignKey: "SopDraftID",
    as: "RiskSopLinks",
  });
  SopModule.hasMany(RiskSopLink, {
    foreignKey: "SOPID",
    as: "RiskSopLinks",
  });
  RiskTreatment.hasMany(RiskTreatmentActionItem, {
    foreignKey: "RiskTreatmentID",
    as: "RiskTreatmentActionItems",
  });
};

module.exports = defineAssociations;
