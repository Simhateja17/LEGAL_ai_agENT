// Request logging middleware for monitoring and debugging

export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log incoming request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  
  // Log request body for POST/PUT requests
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }

  // Capture original end function
  const originalEnd = res.end;

  // Override res.end to log response
  res.end = function(chunk, encoding) {
    res.end = originalEnd;
    res.end(chunk, encoding);
    
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  };

  next();
};
