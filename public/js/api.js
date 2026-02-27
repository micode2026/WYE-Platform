const API = {
  base: '/api',

  token() { return localStorage.getItem('token'); },

  async request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (this.token()) opts.headers['Authorization'] = 'Bearer ' + this.token();
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(this.base + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  get(path)         { return this.request('GET',    path); },
  post(path, body)  { return this.request('POST',   path, body); },
  put(path, body)   { return this.request('PUT',    path, body); },
  delete(path)      { return this.request('DELETE', path); },

  // Auth
  login(email, password)   { return this.post('/auth/login', { email, password }); },
  register(data)            { return this.post('/auth/register', data); },
  getMe()                   { return this.get('/auth/me'); },
  updateMe(data)            { return this.put('/auth/me', data); },

  // Courses
  getCourses()              { return this.get('/courses'); },
  getCourse(id)             { return this.get(`/courses/${id}`); },
  enrollCourse(id)          { return this.post(`/courses/${id}/enroll`); },
  completeModule(cId, mId)  { return this.post(`/courses/${cId}/modules/${mId}/complete`); },
  getMyCourses()            { return this.get('/users/my-courses'); },

  // Mentorship
  getMentors()              { return this.get('/mentorship/mentors'); },
  getSessions()             { return this.get('/mentorship/sessions'); },
  requestMentorship(data)   { return this.post('/mentorship/request', data); },
  updateSession(id, data)   { return this.put(`/mentorship/sessions/${id}`, data); },

  // Resources
  getResources(params)      { const q = params ? '?' + new URLSearchParams(params) : ''; return this.get(`/resources${q}`); },
  downloadResource(id)      { return this.post(`/resources/${id}/download`); },

  // Notifications
  getNotifications()        { return this.get('/users/notifications'); },
  markAllRead()             { return this.put('/users/notifications/read-all'); },
  markRead(id)              { return this.put(`/users/notifications/${id}/read`); },

  // Dashboard
  getMyStats()              { return this.get('/dashboard/my-stats'); },
  getAdminStats()           { return this.get('/dashboard/admin'); },

  // Admin: users
  getUsers()                { return this.get('/users'); },
  deleteUser(id)            { return this.delete(`/users/${id}`); },

  // Admin: course & module management
  createCourse(data)        { return this.post('/courses', data); },
  addModule(cId, data)      { return this.post(`/courses/${cId}/modules`, data); },

  // Admin: resource management
  createResource(data)      { return this.post('/resources', data); },
  deleteResource(id)        { return this.delete(`/resources/${id}`); },

  // Mentor: availability
  updateAvailability(data)  { return this.put('/mentorship/availability', data); },
};
