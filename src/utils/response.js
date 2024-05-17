const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    status: 'success',
    message,
    data
  });
};

const errorResponse = (res, message, statusCode = 500) => {
  res.status(statusCode).json({
    status: 'error',
    message,
    data: null
  });
};

module.exports = {
  successResponse,
  errorResponse
};
