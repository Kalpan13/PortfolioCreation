const jwt = require("jsonwebtoken");
const dotenv = require('dotenv');

function authenticateToken(req, res, next) {
    // Gather the jwt access token from the request header
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null) return res.sendStatus(401) // if there isn't any token
  
    jwt.verify(token, String(process.env.ACCESS_TOKEN_SECRET), (err, user) => {
      console.log(err)
      if (err) return res.sendStatus(403)
      req.user = user
      next(); // pass the execution off to whatever request the client intended
    })
  }

function generateAccessToken(username) {
// expires after half and hour (1800 seconds = 30 minutes)
return jwt.sign(username, process.env.TOKEN_SECRET, { expiresIn: '3600s' });
}
module.exports = {
    authenticateToken : authenticateToken,
    generateAccessToken: generateAccessToken
}