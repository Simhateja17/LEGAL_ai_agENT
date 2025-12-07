import { runRagPipeline } from '../services/rag.service.js';

/**
 * Controller → Service → Database pattern
 * Controller handles HTTP concerns, delegates business logic to service
 */
export const handleQuery = async (req, res) => {
  const { question } = req.body; // Already validated by middleware
  
  console.log(`Processing query: "${question}"`);
  const startTime = Date.now();
  
  // Delegate to service layer (will throw errors caught by errorHandler middleware)
  const result = await runRagPipeline(question);
  
  const duration = Date.now() - startTime;
  console.log(`Query processed in ${duration}ms`);
  
  // RESTful response structure
  res.json({
    success: true,
    data: {
      question,
      answer: result.answer,
      sources: result.sources || [],
      metadata: {
        processingTime: duration,
        timestamp: new Date().toISOString()
      }
    }
  });
};

export default { handleQuery };
