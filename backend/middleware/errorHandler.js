const errorHandler = (err, req, res, next) => {
  console.error('[errorHandler]', err.message || err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
  });
};

module.exports = errorHandler;
