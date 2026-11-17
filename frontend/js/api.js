/**
 * API Service untuk Leaderboard Apps
 */
const API = {
  async getTeams(category = 'junior') {
    const res = await fetch(`/api/teams?category=${encodeURIComponent(category)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async saveTeams(category, teams) {
    const res = await fetch(`/api/teams?category=${encodeURIComponent(category)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teams })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getResults(category = 'junior') {
    const res = await fetch(`/api/results?category=${encodeURIComponent(category)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async saveResults(category, results) {
    const res = await fetch(`/api/results?category=${encodeURIComponent(category)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getSettings() {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async saveSettings(settings) {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  // ---- Categories ----
  async getCategories() {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async createCategory(cat) {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async updateCategory(key, cat) {
    const res = await fetch(`/api/categories/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async deleteCategory(key) {
    const res = await fetch(`/api/categories/${encodeURIComponent(key)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
};