// const { sign, verify } = require("jsonwebtoken");

// exports.generateToken = (payload) => {
//     const token = sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
//     return token;
// };
// exports.verifyAuth = (req, res, next) => {
//     const token = req.headers['authorization'].split(' ')[1];
//     if (!token) return res.status(401).send({ success: false, message: 'No token provided.' });
//     verify(token, process.env.JWT_SECRET, (err, decoded) => {
//         if (err) return res.status(401).send({ success: false, message: 'Failed to authenticate token.' });
//         req.payload = decoded;
//         next();
//     });
// }

