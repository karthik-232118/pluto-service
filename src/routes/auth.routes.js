const { Router } = require("express");
const {
    Logout,
    getSSOLink,
    ssoCallBack,
    getSSODetails
} = require("../controller/auth.controller");
const { handleLogout } = require("../utils/middleware/auth.middleware");

exports.authRoutes = Router()
    // .post('/xX2P6hy5SggMh1X', verifyUser, authorizeLogin)
    // .post('/UTNhC5mFGtIYuod', generatePayload, handleAuthLoginResponse, athorizeToken)
    // .post('/WAcHyl8tPFhlipo', oauthServer.authenticate(), authenticate)
    .post('/kleU2PSdOq3EAD1',getSSOLink)
    .get('/gMCV9igxTDNyiSo',ssoCallBack)
    .post('/z12N7q6OtNL8yTv',getSSODetails)
    .post("/X918ByG1hVUKatj",handleLogout, Logout)