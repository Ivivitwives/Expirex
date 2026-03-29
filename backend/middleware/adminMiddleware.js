// Admin Middleware
// This checks if the logged-in user is an admin

const adminMiddleware = (req, res, next) => {
    try {
        // Make sure user exists (comes from auth.js)
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin only access' });
        }

        // If admin → continue
        next();

    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
};

module.exports = adminMiddleware;