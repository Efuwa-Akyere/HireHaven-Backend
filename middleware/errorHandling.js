export const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500

    let message = err.message;

    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Invalid ${err.path} with value ${err.value}`;
    }

    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map((e) => e.message).join(', ');
    }

    if (err.code === 11000) {
        statusCode = 400;
        const msg = Object.values(err.keyValue).join(', ');
        message = `${msg} already exists`
    }

    res.status(statusCode).json({
        success: false,
        message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
};