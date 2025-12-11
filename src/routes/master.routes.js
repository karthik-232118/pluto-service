const { Router } = require("express");
const {
  addRoleToOrganizationStructure,
  getOrganizationStructureRoles,
  addOrganizationHierarchy,
  updateOrganizationHierarchy,
  getOrganizationHirarchyLIst,
  addOrganizationDeparments,
  getOrganizationDepartments,
  updateRoleToOrganizationStructure,
  deleteRole,
  deleteOrganizationHierarchy,
  updateOrganizationDepartments,
  deleteOrganizationDepartments,
  getUserDetails,
  updateUserDetails,
  deleteUserFromOrganizationStructure,
  getUserList,
  addUserToOrganizationStructure,
  getOrganizationHirarchyZoneList,
  getOrganizationHierarchyUnitList,
  getProcessOwnerDashboard,
  departmentOverview,
  addQuestionAndAnswer,
  getQuestionAndAnswer,
  updateQuestionAndAnswer,
  deleteQuestionAndAnswer,
  getLicenseOverviews,
  applyKeyForLicense,
  sendLicenseKeyToLinkedUser,
  addOrganizationLicence,
  addEnterprises,
  getLicenseList,
  attemptDetails,
  testSimulationAccessList,
  userAuthLog,
  elementPublishLog,
  addAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  getAdvertisements,
  getUnitList,
  ElementList,
  getDepartMentList,
  getRoleList,
  getUsersList,
  elementAccessLogReport,
  elementAccessLogReportAll,
  elementActivityTransition,
  getTestAttemptReport,
  adminDashboardDetails,
  addRequest,
  updateRequest,
  getRequestList,
  deleteRequest,
  userBulkUpload,
  getUserNotification,
  getUserNotificationCount,
  getCurrenLicense,
  formElementReport,
  dashboardElementDetails,
  getExpireDocumentZipDownload,
  getProcessOwnerActionables,
  getPublishDocuments,
  getActivityData,
  addDocumentComment,
  updateDocumentComment,
  replayComment,
  deleteComment,
  ownersElements,
  assignCategoryToDepartmentOrRoleOrUsers,
  moduleOwnerChange,
  auditorMessage,
  sopAttachmentDocs,
  documentReadingTimerReport,
  createSopTemplate,
  getSopTemplateAll,
  viewNotification,
} = require("../controller/master.controller");
const {
  userProfileUpload,
  advertisementBannerUpload,
} = require("../utils/middleware/upload.middleware");
const {
  addUserToOrganizationStructureRules,
  validate,
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
} = require("../validators/master.validator");
const { apiAccess } = require("../utils/middleware/checkUserAccess");
const { wordDocumentPermissionsDetails } = require("../controller/reviewapprovecycle/element.controller");

exports.masterRoutes = Router()
  .post(
    "/xtuSSb5pmLVNyHk",
    apiAccess.ProcessOwner(),
    addRoleToOrganizationStructureRules(),
    validate,
    addRoleToOrganizationStructure
  )
  .post(
    "/hdZbxTMwjH9qX2h",
    apiAccess.ProcessOwner(),
    updateRoleToOrganizationStructureRules(),
    validate,
    updateRoleToOrganizationStructure
  )
  .post("/I1IZjizHgkKE9Dy",
    apiAccess.ProcessOwner(),
    deleteRole)
  .post("/QVIBeIgsiU7G6Ma",
    apiAccess.EndUser(),
    getOrganizationStructureRoles)
  .post(
    "/KxQIoWdMUgqx7gU",
    apiAccess.ProcessOwner(),
    addOrganizationHierarchyRules(),
    validate,
    addOrganizationHierarchy
  ) // add zone and unit
  .post("/rp6RaU3pdk6O63i",
    apiAccess.Admin(),
    addEnterprisesRules(), validate, addEnterprises) // add enterprise
  .post(
    "/rWJ7QCwCTTrzHjC",
    apiAccess.Admin(),
    updateEnterprisesZonesUnitsRules(),
    validate,
    updateOrganizationHierarchy
  ) // update zone , unit and enterprise
  .post("/f4La2jfINwn15dP", apiAccess.Admin(), deleteOrganizationHierarchy)
  .post("/JyBhP2j0jHaxjFz", getOrganizationHirarchyLIst)
  .post("/ZHkSbYAOE9DE03G", apiAccess.Admin(), getOrganizationHirarchyZoneList)
  .post("/q9Sze7ji7GRllDw", apiAccess.Admin(), getOrganizationHierarchyUnitList)
  .post(
    "/QmSKW3eWqLJaF0x",
    apiAccess.ProcessOwner(),
    addOrganizationDeparmentsRules(),
    validate,
    addOrganizationDeparments
  )
  .post(
    "/Rjk6bTWPx7S8h9i",
    apiAccess.ProcessOwner(),
    updateOrganizationDeparmentsRules(),
    validate,
    updateOrganizationDepartments
  )
  .post("/KEIMqCoaliqsnKr",
    apiAccess.ProcessOwner(),
    deleteOrganizationDepartments)
  .post("/xJgYx0Y5JtJIVAD", getOrganizationDepartments)

  .post("/P9K5ev3oObY1kfh", getUserDetails)
  .post(
    "/zzNJAjWNWGKRLlh",
    userProfileUpload,
    addUserToOrganizationStructureRules(),
    validate,
    addUserToOrganizationStructure
  )
  .post(
    "/PpJYxMNV8UzS5tV",
    userProfileUpload,
    updateUserDetailsRules(),
    validate,
    updateUserDetails
  )
  .post("/p3mXHolwBPjDAVE", apiAccess.Admin(), deleteUserFromOrganizationStructure)
  .post("/fIcc48b3TUbtUAt", getUserList)

  .post("/HlpBhKCP3i27AyL", apiAccess.ProcessOwner(), getProcessOwnerDashboard)
  .post("/AyLHlKCP3i27pBh", apiAccess.ProcessOwner(), getProcessOwnerActionables)
  .post("/sUZTpzLXKD0gKhq", dashboardElementDetails)
  .post("/PBvbL4xReDes9Fm", departmentOverview)

  .post("/vB3dZFUDXkBYt37", apiAccess.ProcessOwner(), addQuestionAndAnswer)
  .post("/skltnHqYdkFERGX", getQuestionAndAnswer)
  .post("/swfJEf0V3IEbr38", apiAccess.ProcessOwner(), updateQuestionAndAnswer)
  .post("/DSr2SPDg57qmFEV", apiAccess.ProcessOwner(), deleteQuestionAndAnswer)

  .post("/awdH6VteQbIX7ym", apiAccess.Admin(), addOrganizationLicence)
  .post("/XRYn3IzR1hvu7e9", getLicenseOverviews)
  .post("/pSmVs02AmRmM6uA", apiAccess.Admin(), applyKeyForLicense)
  .post("/LIAJvH1UCNVgS1M", apiAccess.Admin(), sendLicenseKeyToLinkedUser)
  .post("/nKvx02eZCZ5hWD5", apiAccess.Admin(), getLicenseList)

  .post("/SABSde1Uu1JVt39", getTestAttemptReport)
  .post("/uE6jeQrf6tqmkk4", attemptDetails)
  .post("/CUBvX5Ppu43nEV0", userAuthLog)
  .post("/YGYMlauTq7MGYDo", elementPublishLog)
  .post("/tcFBd6kXYsiEKVg", elementAccessLogReport)
  .post("/GQW0MZ4wKyml1Pv", elementAccessLogReportAll)
  .post("/UlLaAVZV6x5A9QL", elementActivityTransition)
  .post("/AgDFN3enyPU8OLL", formElementReport)
  .post("/dVcIG4U4NcWudwA", getUnitList)
  .post("/L5Uu3BLVYIpukNd", ElementList)
  .post("/NvfX5k1iQEvSsf6", getDepartMentList)
  .post("/GvpR1BooKoohGNn", getRoleList)
  .post("/JfjFZqVjgZZXNNP", getUsersList)
  .post(
    "/E3eR7lFTRpl6eK7",
    apiAccess.Admin(),
    advertisementBannerUpload,
    addAdvertisementRules(),
    validate,
    addAdvertisement
  )
  .post(
    "/q8iO4IlHbfFWoso",
    apiAccess.Admin(),
    advertisementBannerUpload,
    updateAdvertisementRules(),
    validate,
    updateAdvertisement
  )
  .post("/E4Je5larBsFITlW", apiAccess.Admin(), deleteAdvertisement)
  .post("/VqfIBkxXOPYadO1", getAdvertisements)
  .post("/pbUo3Lzk5HVMf9T", apiAccess.Admin(), adminDashboardDetails)

  .post("/fnvPzQKbPh2VawC", addRequest)
  .post("/kof11cgOJM1LIu9", updateRequest)
  .post("/LCyB3EFk9Vu55z3", getRequestList)
  .post("/edgbV88LNtsTHwi", deleteRequest)
  .post("/u7kSc5FTcE6DtMb", apiAccess.Admin(), userBulkUpload)
  .post("/G3YkJciEHSZCNuV", apiAccess.ProcessOwner(), getPublishDocuments)

  .post("/sn3Ivc4aMlXYaK6", getUserNotification)
  .post("/j81IkyzEb37I841", getUserNotificationCount)
  .post("/rOJ96VCmT8E6kTG", viewNotification)
  .post("/xDO7as9PXrvJ6Jx", getCurrenLicense)
  .post("/ZxaYxShD6Ei0yW9", getExpireDocumentZipDownload)
  .post("/k4U5cmnS58I3shg", getActivityData)
  .post("/JXWje0yAUK3Iq96", addDocumentComment)
  .post("/XXreUHDzdtiWbbM", updateDocumentComment)
  .post("/WN5tCpsv9j6AdOp", replayComment)
  .post("/SWKSNHMqWcU70Ip", deleteComment)
  .post("/SjVgWv5DpRc6wwf", ownersElements)
  .post("/MZu9rl747NH2eXL", assignCategoryToDepartmentOrRoleOrUsers)
  .post("/TluNqNp8jBcmibZ", moduleOwnerChange)
  .post("/FUSrrQ46EHQib8B", auditorMessage)
  .post("/BX3WG8wAGTgUCWP", sopAttachmentDocs)
  .post("/TGLKb2tPxeqsjxC", documentReadingTimerReport)
  .post("/IPvvAisydqmOoJZ", apiAccess.ProcessOwner(), createSopTemplate)
  .post("/TQo6qHkDNYl6eq0", apiAccess.ProcessOwner(), getSopTemplateAll)
  .post("/gD0EOIgjBdk8As4", wordDocumentPermissionsDetails);