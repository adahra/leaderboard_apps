/**
 * API Service untuk Leaderboard Apps
 */
const API = {
  token: localStorage.getItem('leaderboard_token') || '',

  setToken(token) {
    this.token = token || '';
    if (this.token) localStorage.setItem('leaderboard_token', this.token);
    else localStorage.removeItem('leaderboard_token');
  },

  authHeaders() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  },

  async request(path, options = {}) {
    const headers = { ...(options.headers || {}), ...this.authHeaders() };
    const res = await fetch(path, { ...options, headers });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const j = await res.json(); if (j && j.error) msg = j.error; } catch (e) {}
      throw new Error(msg);
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res.text();
  },

  async getTeams(category = 'junior') {
    return this.request(`/api/teams?category=${encodeURIComponent(category)}`);
  },

  async saveTeams(category, teams) {
    return this.request(`/api/teams?category=${encodeURIComponent(category)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teams })
    });
  },

  async getResults(category = 'junior') {
    return this.request(`/api/results?category=${encodeURIComponent(category)}`);
  },

  async saveResults(category, results) {
    return this.request(`/api/results?category=${encodeURIComponent(category)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results })
    });
  },

  async getResultHistory(category = 'junior', matchId = null) {
    const q = new URLSearchParams({ category });
    if (matchId) q.set('match', matchId);
    return this.request(`/api/results/history?${q.toString()}`);
  },

  async getSettings() {
    return this.request('/api/settings');
  },

  async saveSettings(settings) {
    return this.request('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
  },

  async getCategories(includeArchived = false) {
    return this.request(`/api/categories${includeArchived ? '?archived=1' : ''}`);
  },

  async createCategory(cat) {
    return this.request('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat)
    });
  },

  async updateCategory(key, cat) {
    return this.request(`/api/categories/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat)
    });
  },

  async archiveCategory(key, archived = true) {
    return this.request(`/api/categories/${encodeURIComponent(key)}/archive`, { method: 'PATCH', body: JSON.stringify({ archived }) });
  },

  async login(username, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    this.setToken(data.token);
    return data;
  },

  async logout() {
    try { await this.request('/api/auth/logout', { method: 'POST' }); } catch (e) {}
    this.setToken('');
  },

  async getAudit(limit = 100) {
    return this.request(`/api/audit?limit=${limit}`);
  },
};