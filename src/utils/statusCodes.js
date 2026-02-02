const STATUS_CODES = {
  OK: 200,                    // Success
  CREATED: 201,               // Resource created
  BAD_REQUEST: 400,           // Validation error
  UNAUTHORIZED: 401,          // Token missing/invalid
  FORBIDDEN: 403,             // No permission
  NOT_FOUND: 404,             // Resource not found
  CONFLICT: 409,              // Duplicate / state conflict
  UNPROCESSABLE: 422,         // Business rule violation
  SERVER_ERROR: 500           // Internal error
};

module.exports = STATUS_CODES;
