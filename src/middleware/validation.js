// Request validation middleware for API endpoints

export const validateQuery = (req, res, next) => {
  const { question } = req.body;

  if (!question) {
    const error = new Error('Question is required');
    error.name = 'ValidationError';
    error.details = { field: 'question', issue: 'missing' };
    return next(error);
  }

  if (typeof question !== 'string') {
    const error = new Error('Question must be a string');
    error.name = 'ValidationError';
    error.details = { field: 'question', issue: 'invalid_type' };
    return next(error);
  }

  if (question.trim().length === 0) {
    const error = new Error('Question cannot be empty');
    error.name = 'ValidationError';
    error.details = { field: 'question', issue: 'empty' };
    return next(error);
  }

  if (question.length > 1000) {
    const error = new Error('Question is too long (max 1000 characters)');
    error.name = 'ValidationError';
    error.details = { field: 'question', issue: 'too_long', maxLength: 1000 };
    return next(error);
  }

  // Sanitize and attach to request
  req.body.question = question.trim();
  next();
};

export const validateInsurerId = (req, res, next) => {
  const { id } = req.params;

  // UUID validation regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    const error = new Error('Invalid insurer ID format');
    error.name = 'ValidationError';
    error.details = { field: 'id', issue: 'invalid_uuid' };
    return next(error);
  }

  next();
};
