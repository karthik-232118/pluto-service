const multer = require("multer");

//========= FILE UPLOAD ==========//

//********* User Profile ******** */
const storage = multer.diskStorage({
    destination: './public/profile/',
    filename: function (req, file, cb) {
        const FileName = req.payload.currentUserId + '.' + file.originalname.split('.').pop();
        req.body.UserPhoto = '/profile/' + FileName;
        cb(null, FileName);
    }
});

exports.userProfileUpload = multer({
    storage: storage,
    limits: { fileSize: 1000000 }
}).single('UserPhoto')

//********* Your Upload ******** */
const storage1 = multer.diskStorage({
    destination: './public/banner/',
    filename: function (req, file, cb) {
        const FileName =  Date.now()+ '.' + file.originalname;
        req.body.AdvertisementBanner = '/banner/' + FileName;
        cb(null, FileName);
    }
});

exports.advertisementBannerUpload = multer({
    storage: storage1,
    limits: { fileSize: 1000000 }
}).single('AdvertisementBanner')