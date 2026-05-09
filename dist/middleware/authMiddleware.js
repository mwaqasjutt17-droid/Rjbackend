import jwt from "jsonwebtoken";
export const protect = async (req, res, next) => {
    let token;
    // Check cookies or authorization header
    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }
    else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }
    // Make sure token exists
    if (!token || token === "none") {
        return res.status(401).json({ success: false, error: "Not authorized to access this route" });
    }
    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Add user info to request
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({ success: false, error: "Not authorized to access this route" });
    }
};
