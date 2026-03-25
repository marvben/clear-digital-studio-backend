const express = require('express');
const router = express.Router();
const projects = require('../data/portfolio.json');

// GET /api/portfolio — returns all projects, supports ?category= filter
router.get('/', (req, res) => {
  const { category } = req.query;

  if (category) {
    const filtered = projects.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase()
    );
    return res.json(filtered);
  }

  res.json(projects);
});

// GET /api/portfolio/:slug — returns single project by slug
router.get('/:slug', (req, res) => {
  const project = projects.find((p) => p.slug === req.params.slug);

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  res.json(project);
});

module.exports = router;
