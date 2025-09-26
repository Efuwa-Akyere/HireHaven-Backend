export const restrict = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            if(!req.employer.role) {
                const error = new Error('Please Login');
                error.statusCode = 403;
                next(error);
            }

            if(!allowedRoles.includes(req, employer.role)) {
                const error = new Error('You are unauthorized');
                error.statusCode = 403;
                next(error);
            }
            next();
        } catch (error) {
            next(error);
        }
    }
}