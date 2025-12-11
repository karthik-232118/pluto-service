const DocumentModule = require("../model/DocumentModule");
const DocumentModuleDraft = require("../model/DocumentModuleDraft");
const FormModule = require("../model/FormModule");
const FormModuleDraft = require("../model/FormModuleDraft");
const SopModule = require("../model/SopModule");
const SopModuleDraft = require("../model/SopModuleDraft");
const TestMcqsModule = require("../model/TestMcqsModule");
const TestMcqsModuleDraft = require("../model/TestMcqsModuleDraft");
const TestSimulationModule = require("../model/TestSimulationModule");
const TestSimulationModuleDraft = require("../model/TestSimulationModuleDraft");
const TrainingSimulationModule = require("../model/TrainingSimulationModule");
const TrainingSimulationModuleDraft = require("../model/TrainingSimulationModuleDraft");

const moduleMapping = {
  Document: {
    prefix: "Document",
    model: DocumentModule,
    draftModel: DocumentModuleDraft,
    idField: "DocumentID",
    draftIdField: "DocumentModuleDraftID",
  },
  SkillBuilding: {
    prefix: "SkillBuilding",
    model: TrainingSimulationModule,
    draftModel: TrainingSimulationModuleDraft,
    idField: "TrainingSimulationID",
    draftIdField: "TrainingSimulationDraftID",
  },
  SkillAssessment: {
    prefix: "SkillAssessment",
    model: TestSimulationModule,
    draftModel: TestSimulationModuleDraft,
    idField: "TestSimulationID",
    draftIdField: "TestSimulationDraftID",
  },
  SOP: {
    prefix: "SOP",
    model: SopModule,
    draftModel: SopModuleDraft,
    idField: "SOPID",
    draftIdField: "SOPDraftID",
  },
  TestMCQ: {
    prefix: "TestMCQ",
    model: TestMcqsModule,
    draftModel: TestMcqsModuleDraft,
    idField: "TestMCQID",
    draftIdField: "TestMCQDraftID",
  },
  Form: {
    prefix: "Form",
    model: FormModule,
    draftModel: FormModuleDraft,
    idField: "FormID",
    // draftIdField: "FormDraftID",
    draftIdField: "FormModuleDraftID",
  },
};

module.exports = {
  moduleMapping,
};
