// Request validation middleware for API endpoints

// Validate search query parameter
const validateSearchQuery = (req, res, next) => {
  const { q, insurance_type } = req.query;

  // Validate 'q' parameter
  if (!q) {
    const error = new Error('Query parameter "q" is required');
    error.name = 'ValidationError';
    error.statusCode = 400;
    error.details = { field: 'q', issue: 'missing' };
    return next(error);
  }

  if (typeof q !== 'string') {
    const error = new Error('Query parameter "q" must be a string');
    error.name = 'ValidationError';
    error.statusCode = 400;
    error.details = { field: 'q', issue: 'invalid_type' };
    return next(error);
  }

  if (q.trim().length === 0) {
    const error = new Error('Query parameter "q" cannot be empty');
    error.name = 'ValidationError';
    error.statusCode = 400;
    error.details = { field: 'q', issue: 'empty' };
    return next(error);
  }

  if (q.length > 500) {
    const error = new Error('Query is too long (max 500 characters)');
    error.name = 'ValidationError';
    error.statusCode = 400;
    error.details = { field: 'q', issue: 'too_long', maxLength: 500 };
    return next(error);
  }

  // Validate 'insurance_type' parameter if provided
  if (insurance_type) {
    const validTypes = ['krankenversicherung', 'hausratversicherung', 'autoversicherung'];
    if (!validTypes.includes(insurance_type.toLowerCase())) {
      const error = new Error('Invalid insurance type');
      error.name = 'ValidationError';
      error.statusCode = 400;
      error.details = { 
        field: 'insurance_type', 
        issue: 'invalid_value',
        validValues: validTypes
      };
      return next(error);
    }
    req.query.insurance_type = insurance_type.toLowerCase();
  }

  // Sanitize and attach to request
  req.query.q = q.trim();
  next();
};

const validateQuestion = (req, res, next) => {
  const { question } = req.body;

  if (!question) {
    const error = new Error('Question is required');
    error.name = 'ValidationError';
    error.statusCode = 400;
    error.details = { field: 'question', issue: 'missing' };
    return next(error);
  }

  if (typeof question !== 'string') {
    const error = new Error('Question must be a string');
    error.name = 'ValidationError';
    error.statusCode = 400;
    error.details = { field: 'question', issue: 'invalid_type' };
    return next(error);
  }

  if (question.trim().length === 0) {
    const error = new Error('Question cannot be empty');
    error.name = 'ValidationError';
    error.statusCode = 400;
    error.details = { field: 'question', issue: 'empty' };
    return next(error);
  }

  if (question.length > 1000) {
    const error = new Error('Question is too long (max 1000 characters)');
    error.name = 'ValidationError';
    error.statusCode = 400;
    error.details = { field: 'question', issue: 'too_long', maxLength: 1000 };
    return next(error);
  }

  // Sanitize and attach to request
  req.body.question = question.trim();
  next();
};

const validateInsurerId = (req, res, next) => {
  const { id } = req.params;

  // UUID validation regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    const error = new Error('Invalid insurer ID format');
    error.name = 'ValidationError';
    error.statusCode = 400;
    error.details = { field: 'id', issue: 'invalid_uuid' };
    return next(error);
  }

  next();
};

export {
  validateSearchQuery,
  validateQuestion,
  validateInsurerId
};

export default {
  validateSearchQuery,
  validateQuestion,
  validateInsurerId
};