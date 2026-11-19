const express = require('express');
const router = express.Router();
const schedulingController = require('../controllers/schedulingController');
const db = require('../config/db');

// Generate tournament schedule
// GET /api/schedules/generate?category=junior&schema=knockout&team_count=16
router.get('/generate', (req, res) => {
  try {
    const { category, schema, team_count } = req.query;
    
    if (!category || !schema || !team_count) {
      return res.status(400).json({ 
        error: 'Missing required parameters: category, schema, team_count' 
      });
    }
    
    // Validate category exists in database
    const categoryRow = db.prepare(
      'SELECT key, label, schema FROM categories WHERE key = ?'
    ).get(category);
    
    if (!categoryRow) {
      return res.status(404).json({ error: `Category not found: ${category}` });
    }
    
    // Use schema from database if provided in query
    const categorySchema = schema || categoryRow.schema;
    
    const schedule = schedulingController.generateSchedule(
      { key: category, schema: categorySchema }, 
      parseInt(team_count)
    );
    
    res.json(schedule);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all available categories for scheduling
// GET /api/schedules/categories
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare(
      'SELECT key, label, schema FROM categories WHERE archived = 0'
    ).all();
    
    res.json(categories);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;