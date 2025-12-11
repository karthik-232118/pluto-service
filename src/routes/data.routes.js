const { Router } = require("express");
const {
  getModuleTypes,
  getElements,
  getElementDetails,
  deleteShapeDetails,
  updateXMLData,
  saveOrUpdateShapeDetails,
  getSopContentList,
  getQuestionList,
  updateQuestionStatus,
  addUserAccessLog,
  getUserDetails,
  addOrUpdateUserDetails,
  updateUserNotificationConfig,
  globalSearch,
  changeUserPassword,
  getUserFavorites,
  getDashboardData,
  getActionableData,
  getDashboardLeaderboardDDData,
  leaderBoard,
  getModuleWiseMakerCheckerData,
  addUserCheckerComment,
  linkElementSearch,
  addToFavorite,
  updateAttachedLink,
  listUserAchievement,
  viewUserAchievement,
  testGetElements,
  generateSignedUrl,
  getMessages,
  sendMessage,
  getUserListWithLastMessages,
  addNotes,
  updateNote,
  deleteNote,
  getNotes,
  getModuleTypesForKey,
  readMessage,
  addRiskAndComplience,
  getRiskAndComplience,
  viewForm,
  fillForm,
  getAchivements,
  deleteElement,
  getCampaignSubmittedForm,
  delegateUser,
  updateDelegateStatus,
  moveToOtherFolder,
  getElementData,
  addDocumentReadingTimer,
} = require("../controller/data.controller");
const { userProfileUpload } = require("../utils/middleware/upload.middleware");
const {
  achievementViewRules,
  validate,
  getESignRequestByIdRules,
  viewFormRules,
  fillFormRules,
} = require("../validators/data.validator");
const { apiAccess } = require("../utils/middleware/checkUserAccess");
const { additionalEndUserDashboardData, auditAndReviewApprovalCycle } = require("../controller/reviewapprovecycle/element.controller");

exports.dataRoutes = Router()
  .post("/U6W9W1FZaOrJy6c", getUserDetails)
  .post("/xDO7as9PXrvJ6Jz", getModuleTypes)
  .post("/xDO7as9PXrvJ6Jy", getModuleTypesForKey)
  .post("/V8bVW2kDsg3jfTq", getElementData)
  .post("/YZOixmmvP7hzltB",apiAccess.ProcessOwner(), deleteElement)
  .post("/V8bVW2kDsg3jfTw", testGetElements)
  .post("/k1sJjoi32FX9YPk", getElementDetails)
  .post("/kaw3flV8MyRSkP3", getQuestionList)
  .post("/evAJI1DhmCsobSd", updateQuestionStatus)
  .post("/X918ByG1hVUKatj", addUserAccessLog)
  .post("/KayGjX91t8B1hVU",apiAccess.ProcessOwner(), moveToOtherFolder)

  .post("/XHmfuVBkKeCcqad",apiAccess.ProcessOwner(), updateXMLData)
  .post("/wPQzu5zVHJHykdw",apiAccess.ProcessOwner(), saveOrUpdateShapeDetails)
  .post("/jLiaFOvJcl2DSkv", getSopContentList)
  .post("/CSAWNEiRvOs3hzO",apiAccess.ProcessOwner(), deleteShapeDetails)
  .post("/rfZmc7KvVgl0GXt", linkElementSearch)
  .post("/ZReWE4KzIsjN3uQ",apiAccess.ProcessOwner(), updateAttachedLink)

  .post("/K8pL4eJ9aG7dR2x", userProfileUpload, addOrUpdateUserDetails)
  .post("/h7xR3mL9pG2eK8d", updateUserNotificationConfig)
  .post("/RxG3dJ7pL4eM2aK", changeUserPassword)
  .post("/MCpHR2eUOOvQLlc", getAchivements)
  .post("/J4dG8xLpM2aR9eK", globalSearch)
  .post("/G7hJ4xR9pL2eM8d", getUserFavorites)
  .post("/L4xG8dJ7pM2aR5k", addToFavorite)
  .post("/K3pG9xL7dR2aM8e", getDashboardData)
  .post("/M8eK3pGdR2a9xL7", getActionableData)
  .post("/kYwkXnAwWlPW1vG", additionalEndUserDashboardData)
  .post("/eZaVeybqDvzlRY5", getDashboardLeaderboardDDData)
  .post("/ju9HvL0cgGBE8dl", leaderBoard)

  .post("/hUzdVLElM3ATND1", getModuleWiseMakerCheckerData)
  .post("/MbmQksU0GCL0Ip8", auditAndReviewApprovalCycle)
  .post("/L0IpksU0GC8MbmQ", delegateUser)
  .post("/bmQLksU0M0IpGC8", updateDelegateStatus)
  .post("/TIfukKoMpjFfsiE", listUserAchievement)
  .post(
    "/LPXvbTWA45XKQZY",
    achievementViewRules(),
    validate,
    viewUserAchievement
  )
  .post("/LPXvbTWA45XKQZZ", generateSignedUrl)
  .post("/U2A7vgGLDXtAntO", getMessages)
  .post("/spFHbAnUprFi2O1", sendMessage)
  .post("/JawZxkqp6VeqHsw", getUserListWithLastMessages)
  .post("/JawZxkqp6VeqHsx", readMessage)

  .post("/GCHJSe90srFmbg8", addNotes)
  .post("/Xp5TBPPuVf2Urow", updateNote)
  .post("/zmbCwPM8tu3ZN6R", deleteNote)
  .post("/vVlmQ5gQVv6N4ED", getNotes)

  .post("/HHCSIkyGXtDFGXt", addRiskAndComplience)
  .post("/r1jWtjsFxMF14IP", getRiskAndComplience)
  .post("/ub47Bhw1xWexh52", viewFormRules(), validate, viewForm)
  .post("/47Bhwh521Wexxub", fillFormRules(), validate, fillForm)
  .post("/E6XinuYliInnM2C", addDocumentReadingTimer);
