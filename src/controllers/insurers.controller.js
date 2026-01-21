/**
 * Get all insurers
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const getAllInsurers = async (req, res) => {
  try {
    // Mock insurers data - will be replaced with database query
    const insurers = [
      { id: 1, name: 'Allianz', types: ['krankenversicherung', 'lebensversicherung'] },
      { id: 2, name: 'ERGO', types: ['hausratversicherung'] },
      { id: 3, name: 'AXA', types: ['kfz-versicherung'] }
    ];
    
    res.status(200).json({
      success: true,
      data: insurers,
      count: insurers.length
    });
  } catch (error) {
    console.error('Error in getAllInsurers:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
