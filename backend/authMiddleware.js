const jwt = require('jsonwebtoken');
require('dotenv').config(); // Loads variables from the .env file

// Pull the secret from the environment, with a fallback just in case
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
    process.exit(1); // Crash the app if security isn't configured
}

// This function intercepts the request and checks the badge
const verifyRole = (requiredRole) => {
  return (req, res, next) => {
    // 1. Look for the token in the headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: "Access Denied: No Security Badge Provided" });
    }

    // 2. Extract the actual token string
    const token = authHeader.split(' ')[1];

    try {
      // 3. Mathematically verify the token using our secret key
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // 4. Check if the user's role matches the required role for this route
      if (decoded.role !== requiredRole) {
        return res.status(403).json({ success: false, message: `Forbidden: You must be a ${requiredRole} to do this.` });
      }

      // 5. If everything is perfect, attach the user info and allow the request to proceed
      req.user = decoded;
      next();
      
    } catch (err) {
      return res.status(401).json({ success: false, message: "Invalid or Expired Security Badge" });
    }
  };
};

module.exports = { verifyRole, JWT_SECRET };