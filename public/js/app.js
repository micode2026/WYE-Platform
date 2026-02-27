/* ═══════════════════════════════════════════════════════════════
   Women & Youth Entrepreneurship Platform – SPA
   Digital Tigray Agency  |  Bilingual: English / ትግርኛ
═══════════════════════════════════════════════════════════════ */

const App = {
  currentUser: null,
  currentRoute: '',

  init() {
    Lang.init();
    this.restoreSession();
    window.addEventListener('hashchange', () => this.route());
    document.getElementById('logout-btn').addEventListener('click', () => this.logout());
    document.getElementById('notif-btn').addEventListener('click', (e) => { e.stopPropagation(); this.toggleNotifPanel(); });
    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) this.closeModal(); });
    document.getElementById('mark-all-read').addEventListener('click', () => this.markAllRead());
    document.getElementById('lang-toggle-btn').addEventListener('click', () => this.toggleLanguage());
    document.getElementById('theme-toggle-btn').addEventListener('click', () => this.toggleTheme());
    this.applyTheme();
    document.addEventListener('click', (e) => {
      const panel = document.getElementById('notif-panel');
      if (!panel.contains(e.target) && !document.getElementById('notif-btn').contains(e.target)) {
        panel.classList.add('hidden');
      }
    });
    this.route();
  },

  restoreSession() {
    const token = localStorage.getItem('token');
    const user  = localStorage.getItem('user');
    if (token && user) this.currentUser = JSON.parse(user);
  },

  setUser(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUser = user;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser = null;
    window.location.hash = '#/';
  },

  toggleLanguage() {
    Lang.toggle();
    document.getElementById('lang-toggle-btn').textContent = t('toggle_lang');
    this.route();
  },

  applyTheme() {
    const dark = localStorage.getItem('theme') === 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = dark ? '☀️' : '🌙';
  },

  toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    this.applyTheme();
  },

  route() {
    const hash = window.location.hash || '#/';
    const [base, ...rest] = hash.slice(2).split('/');
    this.currentRoute = base;

    if (!this.currentUser) {
      if (base === 'register') return this.renderRegister();
      if (base === 'login' || base !== '') return this.renderLogin();
      return this.renderLanding();
    }
    this.updateNav();
    this.loadNotifBadge();

    switch (base) {
      case '':
      case 'dashboard':     return this.renderDashboard();
      case 'courses':       return rest[0] ? this.renderCourseDetail(rest[0]) : this.renderCourses();
      case 'course-module': return this.renderModuleView(rest[0], rest[1]);
      case 'mentorship':    return this.renderMentorship();
      case 'resources':     return this.renderResources();
      case 'profile':       return this.renderProfile();
      case 'admin':         return this.renderAdmin();
      default:              return this.renderDashboard();
    }
  },

  updateNav() {
    document.getElementById('navbar').classList.remove('hidden');
    document.getElementById('mobile-nav').classList.remove('hidden');

    const initials = (this.currentUser.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('user-avatar-small').textContent = initials;
    document.getElementById('nav-username').textContent = this.currentUser.name;
    document.getElementById('lang-toggle-btn').textContent = t('toggle_lang');

    const links = [
      { href: '#/dashboard',  label: t('dashboard'),   route: 'dashboard'  },
      { href: '#/courses',    label: t('courses'),     route: 'courses'    },
      { href: '#/mentorship', label: t('mentorship'),  route: 'mentorship' },
      { href: '#/resources',  label: t('resources'),   route: 'resources'  },
      { href: '#/profile',    label: t('profile'),     route: 'profile'    },
    ];
    if (this.currentUser.role === 'admin')
      links.push({ href: '#/admin', label: t('admin_panel'), route: 'admin' });

    document.getElementById('nav-links').innerHTML = links.map(l =>
      `<a href="${l.href}" class="${this.currentRoute === l.route ? 'active' : ''}">${esc(l.label)}</a>`
    ).join('');

    document.querySelectorAll('.mob-nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === this.currentRoute);
    });
  },

  setMain(html) { document.getElementById('main').innerHTML = html; },
  loader()      { return '<div class="loader"></div>'; },

  /* ── Notifications ─────────────────────────────────────────── */
  async loadNotifBadge() {
    try {
      const notifs = await API.getNotifications();
      const unread = notifs.filter(n => !n.is_read).length;
      const badge  = document.getElementById('notif-badge');
      if (unread > 0) { badge.textContent = unread; badge.classList.remove('hidden'); }
      else badge.classList.add('hidden');
    } catch {}
  },

  async toggleNotifPanel() {
    const panel = document.getElementById('notif-panel');
    if (!panel.classList.contains('hidden')) { panel.classList.add('hidden'); return; }
    panel.classList.remove('hidden');
    const list = document.getElementById('notif-list');
    list.innerHTML = `<div style="padding:1rem;text-align:center;color:var(--text-400);font-size:.875rem">${t('loading')}</div>`;
    try {
      const notifs = await API.getNotifications();
      if (!notifs.length) {
        list.innerHTML = `<div style="padding:1rem;text-align:center;color:var(--text-400);font-size:.875rem">${t('no_notifications')}</div>`;
        return;
      }
      list.innerHTML = notifs.map(n => `
        <div class="notif-item ${n.is_read ? '' : 'unread'}">
          <strong>${esc(n.title)}</strong>
          <span>${esc(n.message || '')}</span>
          <div class="notif-time">${timeAgo(n.created_at)}</div>
        </div>`).join('');
    } catch { list.innerHTML = `<div style="padding:1rem;color:var(--danger);font-size:.875rem">${t('error_try_again')}</div>`; }
  },

  async markAllRead() {
    await API.markAllRead().catch(() => {});
    document.getElementById('notif-badge').classList.add('hidden');
    document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
  },

  /* ── Modal ─────────────────────────────────────────────────── */
  openModal(title, html) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },
  closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); },

  /* ── LANDING ───────────────────────────────────────────────── */
  renderLanding() {
    document.getElementById('navbar').classList.add('hidden');
    document.getElementById('mobile-nav').classList.add('hidden');
    this.setMain(`
      <div class="landing">
        <section class="hero">
          <div class="hero-logo">🌱</div>
          <h1>${t('hero_title')}</h1>
          <p>${t('hero_subtitle')}</p>
          <div class="hero-btns">
            <a href="#/register" class="btn btn-white btn-lg">${t('get_started')}</a>
            <a href="#/login"    class="btn btn-outline-white btn-lg">${t('already_member')}</a>
            <button class="btn btn-outline-white btn-lg" onclick="App.toggleLandingLang()" id="landing-lang-btn">
              ${t('toggle_lang')}
            </button>
          </div>
        </section>

        <section class="features">
          <h2>${t('everything_you_need')}</h2>
          <div class="features-grid">
            <div class="feature-card"><div class="feature-icon">📚</div><h3>${t('feat_courses_title')}</h3><p>${t('feat_courses_desc')}</p></div>
            <div class="feature-card"><div class="feature-icon">🤝</div><h3>${t('feat_mentor_title')}</h3><p>${t('feat_mentor_desc')}</p></div>
            <div class="feature-card"><div class="feature-icon">📂</div><h3>${t('feat_resources_title')}</h3><p>${t('feat_resources_desc')}</p></div>
            <div class="feature-card"><div class="feature-icon">📊</div><h3>${t('feat_track_title')}</h3><p>${t('feat_track_desc')}</p></div>
          </div>
        </section>

        <section class="landing-stats">
          <div class="landing-stats-inner">
            <div><div class="lstat-value">5+</div><div class="lstat-divider"></div><div class="lstat-label">${t('lstat_courses')}</div></div>
            <div><div class="lstat-value">2</div><div class="lstat-divider"></div><div class="lstat-label">${t('lstat_mentors')}</div></div>
            <div><div class="lstat-value">7+</div><div class="lstat-divider"></div><div class="lstat-label">${t('lstat_resources')}</div></div>
            <div><div class="lstat-value">${t('lstat_cost_val')}</div><div class="lstat-divider"></div><div class="lstat-label">${t('lstat_cost')}</div></div>
          </div>
        </section>

        <footer class="landing-footer"><p>${t('footer_text')}</p></footer>
      </div>
    `);
  },

  toggleLandingLang() { Lang.toggle(); this.renderLanding(); },

  /* ── LOGIN ─────────────────────────────────────────────────── */
  renderLogin() {
    document.getElementById('navbar').classList.add('hidden');
    document.getElementById('mobile-nav').classList.add('hidden');
    this.setMain(`
      <div class="auth-page">
        <div class="auth-card">
          <div class="auth-brand">
            <div class="auth-logo">🌱</div>
            <div class="auth-brand-text">
              <strong>${t('platform_short')}</strong>
              <span>${t('powered_by')}</span>
            </div>
            <button class="lang-toggle" style="margin-left:auto" onclick="App.toggleLandingLang()">${t('toggle_lang')}</button>
          </div>
          <h1>${t('welcome_back')}</h1>
          <p>${t('sign_in_subtitle')}</p>
          <div id="auth-alert"></div>
          <form id="login-form">
            <div class="form-group"><label>${t('email')}</label><input type="email" name="email" placeholder="you@email.com" required /></div>
            <div class="form-group"><label>${t('password')}</label><input type="password" name="password" placeholder="••••••••" required /></div>
            <button type="submit" class="btn btn-primary btn-block btn-lg" id="login-btn">${t('sign_in')}</button>
          </form>
          <div class="auth-link">${t('no_account')} <a href="#/register">${t('register_here')}</a></div>
          <div class="demo-creds">
            <strong>${t('demo_credentials')}:</strong> admin@tigdigital.gov.et / Admin@1234 &nbsp;·&nbsp; almaz@example.com / User@1234
          </div>
        </div>
      </div>
    `);
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const { email, password } = Object.fromEntries(new FormData(e.target));
      const btn = document.getElementById('login-btn');
      btn.disabled = true; btn.textContent = t('signing_in');
      try {
        const { token, user } = await API.login(email, password);
        this.setUser(token, user);
        window.location.hash = '#/dashboard';
      } catch (err) {
        document.getElementById('auth-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
        btn.disabled = false; btn.textContent = t('sign_in');
      }
    });
  },

  /* ── REGISTER ──────────────────────────────────────────────── */
  renderRegister() {
    document.getElementById('navbar').classList.add('hidden');
    document.getElementById('mobile-nav').classList.add('hidden');
    this.setMain(`
      <div class="auth-page">
        <div class="auth-card">
          <div class="auth-brand">
            <div class="auth-logo">🌱</div>
            <div class="auth-brand-text">
              <strong>${t('platform_short')}</strong>
              <span>${t('powered_by')}</span>
            </div>
            <button class="lang-toggle" style="margin-left:auto" onclick="App.toggleLandingLang()">${t('toggle_lang')}</button>
          </div>
          <h1>${t('create_account')}</h1>
          <p>${t('register_subtitle')}</p>
          <div id="auth-alert"></div>
          <form id="reg-form">
            <div class="form-row">
              <div class="form-group"><label>${t('full_name')} *</label><input name="name" placeholder="Tigist Haile" required /></div>
              <div class="form-group"><label>${t('email')} *</label><input type="email" name="email" placeholder="you@email.com" required /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>${t('password')} *</label><input type="password" name="password" placeholder="Min 6 chars" required minlength="6" /></div>
              <div class="form-group"><label>${t('gender')}</label>
                <select name="gender">
                  <option value="">${t('select_prompt')}</option>
                  <option value="female">${t('gender_female')}</option>
                  <option value="male">${t('gender_male')}</option>
                  <option value="other">${t('gender_other')}</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>${t('age')}</label><input type="number" name="age" placeholder="25" min="14" max="99" /></div>
              <div class="form-group"><label>${t('location')}</label><input name="location" placeholder="Mekelle, Tigray" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>${t('business_sector')}</label><input name="sector" placeholder="e.g. Textile" /></div>
              <div class="form-group"><label>${t('business_stage')}</label>
                <select name="business_stage">
                  <option value="">${t('select_prompt')}</option>
                  <option value="idea">${t('stage_idea')}</option>
                  <option value="startup">${t('stage_startup')}</option>
                  <option value="growth">${t('stage_growth')}</option>
                  <option value="established">${t('stage_established')}</option>
                </select>
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-block btn-lg" id="reg-btn">${t('register_btn')}</button>
          </form>
          <div class="auth-link">${t('have_account')} <a href="#/login">${t('sign_in')}</a></div>
        </div>
      </div>
    `);
    document.getElementById('reg-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      const btn = document.getElementById('reg-btn');
      btn.disabled = true; btn.textContent = t('creating_account');
      try {
        const { token, user } = await API.register(data);
        this.setUser(token, user);
        window.location.hash = '#/dashboard';
      } catch (err) {
        document.getElementById('auth-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
        btn.disabled = false; btn.textContent = t('register_btn');
      }
    });
  },

  /* ── DASHBOARD ─────────────────────────────────────────────── */
  async renderDashboard() {
    this.setMain(this.loader());
    try {
      const stats     = await API.getMyStats();
      const greeting  = getGreeting();
      const firstName = (this.currentUser.name || '').split(' ')[0];

      this.setMain(`
        <div class="page">
          <div class="welcome-banner">
            <div>
              <h2>${greeting}, ${esc(firstName)}! 👋</h2>
              <p>${t('dash_subtitle')}</p>
            </div>
            <div class="welcome-emoji">🌱</div>
          </div>

          <div class="stats-grid">
            <div class="stat-card red">   <span class="stat-icon">📚</span><div class="stat-value">${stats.coursesEnrolled}</div><div class="stat-label">${t('courses_enrolled')}</div></div>
            <div class="stat-card gold">  <span class="stat-icon">🏆</span><div class="stat-value">${stats.coursesCompleted}</div><div class="stat-label">${t('courses_completed')}</div></div>
            <div class="stat-card orange"><span class="stat-icon">📈</span><div class="stat-value">${stats.avgProgress}%</div><div class="stat-label">${t('avg_progress')}</div></div>
            <div class="stat-card dark">  <span class="stat-icon">🤝</span><div class="stat-value">${stats.mentorSessions}</div><div class="stat-label">${t('mentor_sessions')}</div></div>
          </div>

          ${stats.upcomingSession ? `
            <div class="alert alert-warning" style="margin-bottom:1.5rem">
              📅 <strong>${t('upcoming_session')}</strong> ${t('session_with')} ${esc(stats.upcomingSession.mentor_name)} ${t('on_date')} ${formatDate(stats.upcomingSession.scheduled_date)}
            </div>` : ''}

          <div class="section-card">
            <div class="card-header">
              <h3>📚 ${t('my_courses')}</h3>
              <a href="#/courses" class="link-btn">${t('browse_all')}</a>
            </div>
            <div class="card-body">
              ${stats.recentCourses.length ? `
                <div class="courses-grid">
                  ${stats.recentCourses.map(c => `
                    <div class="course-card" onclick="window.location.hash='#/courses/${c.id}'">
                      <div class="course-thumb">${esc(c.thumbnail_emoji || '📚')}</div>
                      <div class="course-body">
                        <div class="course-title">${esc(c.title)}</div>
                        <span class="tag tag-red">${esc(c.category || '')}</span>
                        <div class="progress-bar-wrap">
                          <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${c.progress}%"></div></div>
                          <div class="progress-label"><span>${statusLabel(c.status)}</span><span>${c.progress}%</span></div>
                        </div>
                      </div>
                    </div>`).join('')}
                </div>` : `
                <div class="empty-state">
                  <div class="empty-icon">📚</div>
                  <p>${t('no_enrollments')}<br/><a href="#/courses" class="text-red">${t('browse_courses_link')}</a></p>
                </div>`}
            </div>
          </div>

          <div class="section-card">
            <div class="card-header"><h3>⚡ ${t('quick_actions')}</h3></div>
            <div class="card-body" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:.75rem">
              <a href="#/courses"    class="btn btn-secondary">📚 ${t('explore_courses')}</a>
              <a href="#/mentorship" class="btn btn-secondary">🤝 ${t('find_mentor')}</a>
              <a href="#/resources"  class="btn btn-secondary">📂 ${t('resources')}</a>
              <a href="#/profile"    class="btn btn-secondary">👤 ${t('edit_profile')}</a>
            </div>
          </div>
        </div>
      `);
    } catch (err) {
      this.setMain(`<div class="page"><div class="alert alert-error">${esc(err.message)}</div></div>`);
    }
  },

  /* ── COURSES LIST ──────────────────────────────────────────── */
  async renderCourses() {
    this.setMain(this.loader());
    try {
      const courses  = await API.getCourses();
      const enrolled = courses.filter(c => c.enrollment_status);

      this.setMain(`
        <div class="page">
          <div class="page-header">
            <h1>📚 ${t('training_courses')}</h1>
            <p>${t('courses_subtitle')}</p>
          </div>
          ${enrolled.length ? `
            <div class="section-header"><h3>${t('enrolled_courses')}</h3></div>
            <div class="courses-grid mb-2">${enrolled.map(c => this.renderCourseCard(c)).join('')}</div>` : ''}
          <div class="section-header"><h3>${enrolled.length ? t('all_courses') : t('available_courses')}</h3></div>
          <div class="courses-grid">${courses.map(c => this.renderCourseCard(c)).join('')}</div>
        </div>
      `);
    } catch (err) {
      this.setMain(`<div class="page"><div class="alert alert-error">${esc(err.message)}</div></div>`);
    }
  },

  renderCourseCard(c) {
    const enrolled = !!c.enrollment_status;
    return `
      <div class="course-card" onclick="window.location.hash='#/courses/${c.id}'">
        <div class="course-thumb">${esc(c.thumbnail_emoji || '📚')}</div>
        <div class="course-body">
          <div class="course-title">${esc(c.title)}</div>
          <div class="course-meta">
            <span class="tag tag-red">${esc(c.category || 'General')}</span>
            <span class="tag">${levelLabel(c.level)}</span>
            <span class="tag">⏱ ${c.duration_hours}h</span>
            <span class="tag">${c.module_count} ${t('lessons')}</span>
          </div>
          ${enrolled ? `
            <div class="progress-bar-wrap">
              <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${c.progress||0}%"></div></div>
              <div class="progress-label"><span>${statusLabel(c.enrollment_status)}</span><span>${c.progress||0}%</span></div>
            </div>` : `
            <div style="margin-top:.5rem"><span style="font-size:.75rem;color:var(--text-400)">${c.enrolled_count} ${t('enrolled_count')}</span></div>`}
        </div>
      </div>`;
  },

  /* ── COURSE DETAIL ─────────────────────────────────────────── */
  async renderCourseDetail(id) {
    this.setMain(this.loader());
    try {
      const course   = await API.getCourse(id);
      const enrolled = !!course.enrollment_status;

      this.setMain(`
        <div class="page">
          <button class="btn btn-outline btn-sm mb-2" onclick="window.location.hash='#/courses'">${t('back_to_courses')}</button>

          <div class="course-detail-header">
            <span class="course-emoji-big">${esc(course.thumbnail_emoji || '📚')}</span>
            <h1>${esc(course.title)}</h1>
            <p>${esc(course.description || '')}</p>
            <div class="course-meta" style="margin-top:.875rem">
              <span class="tag" style="background:rgba(255,255,255,.18);color:white">${esc(course.category || '')}</span>
              <span class="tag" style="background:rgba(255,255,255,.18);color:white">${levelLabel(course.level)}</span>
              <span class="tag" style="background:rgba(255,255,255,.18);color:white">⏱ ${course.duration_hours}h</span>
              <span class="tag" style="background:rgba(255,255,255,.18);color:white">${course.modules.length} ${t('lessons')}</span>
            </div>
            ${enrolled ? `
              <div class="progress-bar-wrap" style="margin-top:1rem">
                <div class="progress-bar-bg" style="background:rgba(255,255,255,.2)">
                  <div class="progress-bar-fill" style="width:${course.progress}%;background:white"></div>
                </div>
                <div class="progress-label" style="color:rgba(255,255,255,.8)">
                  <span>${statusLabel(course.enrollment_status)}</span><span>${course.progress}%</span>
                </div>
              </div>` : ''}
          </div>

          ${!enrolled ? `
            <div style="text-align:center;margin-bottom:1.5rem">
              <button class="btn btn-gold btn-lg" id="enroll-btn" onclick="App.enrollCourse(${course.id})">
                🎓 ${t('enroll_free')}
              </button>
            </div>` : ''}

          <div class="section-card">
            <div class="card-header"><h3>📋 ${t('course_lessons')}</h3></div>
            <div class="card-body">
              ${course.modules.length ? `
                <div class="modules-list">
                  ${course.modules.map((m, i) => `
                    <div class="module-item ${m.completed ? 'completed' : ''}"
                      onclick="${enrolled ? `window.location.hash='#/course-module/${course.id}/${m.id}'` : `App.enrollCourse(${course.id})`}">
                      <div class="module-num">${m.completed ? '✓' : i + 1}</div>
                      <div class="module-info">
                        <strong>${esc(m.title)}</strong>
                        <span>⏱ ${m.duration_minutes} min &nbsp;·&nbsp; ${capitalize(m.type)}</span>
                      </div>
                      ${m.completed ? '<span style="color:var(--gold-500);font-size:1.1rem">✅</span>' : ''}
                      ${!enrolled ? `<span style="font-size:.75rem;color:var(--text-400)">${t('enroll_to_unlock')}</span>` : ''}
                    </div>`).join('')}
                </div>` : `<p class="text-muted">${t('no_lessons')}</p>`}
            </div>
          </div>
        </div>
      `);
    } catch (err) {
      this.setMain(`<div class="page"><div class="alert alert-error">${esc(err.message)}</div></div>`);
    }
  },

  async enrollCourse(id) {
    const btn = document.getElementById('enroll-btn');
    if (btn) { btn.disabled = true; btn.textContent = t('enrolling'); }
    try {
      await API.enrollCourse(id);
      window.location.hash = `#/courses/${id}`;
    } catch (err) {
      showToast(err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = `🎓 ${t('enroll_free')}`; }
    }
  },

  /* ── MODULE VIEWER ─────────────────────────────────────────── */
  async renderModuleView(courseId, moduleId) {
    this.setMain(this.loader());
    try {
      const course      = await API.getCourse(courseId);
      const moduleIndex = course.modules.findIndex(m => String(m.id) === String(moduleId));
      const module      = course.modules[moduleIndex];
      if (!module) { window.location.hash = `#/courses/${courseId}`; return; }

      const prev = course.modules[moduleIndex - 1];
      const next = course.modules[moduleIndex + 1];

      this.setMain(`
        <div class="page module-content-view">
          <button class="btn btn-outline btn-sm back-btn" onclick="window.location.hash='#/courses/${courseId}'">
            ${t('back_to')} ${esc(course.title)}
          </button>

          <div style="margin-bottom:1.5rem">
            <div style="font-size:.75rem;color:var(--text-400);margin-bottom:.3rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em">
              ${t('lesson')} ${moduleIndex + 1} ${t('of')} ${course.modules.length}
            </div>
            <h1 style="font-size:1.5rem;font-weight:800;color:var(--text-900)">${esc(module.title)}</h1>
            <div style="display:flex;gap:.5rem;margin-top:.5rem;flex-wrap:wrap">
              <span class="tag">⏱ ${module.duration_minutes} min</span>
              <span class="tag">${capitalize(module.type)}</span>
              ${module.completed ? `<span class="tag tag-gold">✅ ${t('status_completed')}</span>` : ''}
            </div>
          </div>

          <div class="module-body">${markdownToHtml(module.content || '')}</div>

          <div class="module-nav">
            ${prev ? `<button class="btn btn-outline" onclick="window.location.hash='#/course-module/${courseId}/${prev.id}'">${t('prev_lesson')}</button>` : '<div></div>'}
            <div style="display:flex;gap:.75rem;flex-wrap:wrap">
              ${!module.completed
                ? `<button class="btn btn-primary" id="complete-btn" onclick="App.markModuleComplete(${courseId}, ${module.id})">${t('mark_complete')}</button>`
                : `<button class="btn btn-secondary" disabled>${t('completed_btn')}</button>`}
              ${next ? `<button class="btn btn-gold" onclick="window.location.hash='#/course-module/${courseId}/${next.id}'">${t('next_lesson')}</button>` : ''}
            </div>
          </div>
        </div>
      `);
    } catch (err) {
      this.setMain(`<div class="page"><div class="alert alert-error">${esc(err.message)}</div></div>`);
    }
  },

  async markModuleComplete(courseId, moduleId) {
    const btn = document.getElementById('complete-btn');
    if (btn) { btn.disabled = true; btn.textContent = t('saving'); }
    try {
      const result = await API.completeModule(courseId, moduleId);
      if (btn) { btn.className = 'btn btn-secondary'; btn.disabled = true; btn.textContent = t('completed_btn'); }
      if (result.progress === 100) {
        setTimeout(() => {
          this.openModal(t('course_done_title'), `
            <div class="text-center" style="padding:1.25rem">
              <div style="font-size:3.5rem;margin-bottom:.875rem">🏆</div>
              <p style="font-size:1.125rem;font-weight:700;margin-bottom:.5rem;color:var(--text-900)">${t('course_done_title')}</p>
              <p style="color:var(--text-500)">${t('course_done_msg')}</p>
              <button class="btn btn-primary btn-lg mt-3" onclick="App.closeModal();window.location.hash='#/courses'">${t('browse_more')}</button>
            </div>
          `);
        }, 300);
      }
    } catch (err) {
      showToast(err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = t('mark_complete'); }
    }
  },

  /* ── MENTORSHIP ────────────────────────────────────────────── */
  async renderMentorship() {
    this.setMain(this.loader());
    try {
      const [mentors, sessions] = await Promise.all([API.getMentors(), API.getSessions()]);

      this.setMain(`
        <div class="page">
          <div class="page-header">
            <h1>🤝 ${t('mentorship_title')}</h1>
            <p>${t('mentorship_subtitle')}</p>
          </div>

          <div class="tabs">
            <button class="tab-btn active" id="tab-mentors"  onclick="App.switchMentorTab('mentors')">${t('find_mentors_tab')}</button>
            <button class="tab-btn"         id="tab-sessions" onclick="App.switchMentorTab('sessions')">${t('my_sessions_tab')} (${sessions.length})</button>
          </div>

          <div id="mentors-panel">
            ${mentors.length ? `<div class="mentors-grid">${mentors.map(m => this.renderMentorCard(m)).join('')}</div>` : `
            <div class="empty-state"><div class="empty-icon">🤝</div><p>${t('no_mentors')}</p></div>`}
          </div>

          <div id="sessions-panel" class="hidden">
            ${sessions.length ? sessions.map(s => this.renderSessionCard(s)).join('') : `
            <div class="empty-state"><div class="empty-icon">📋</div><p>${t('no_sessions')}</p></div>`}
          </div>
        </div>
      `);
    } catch (err) {
      this.setMain(`<div class="page"><div class="alert alert-error">${esc(err.message)}</div></div>`);
    }
  },

  switchMentorTab(tab) {
    document.getElementById('tab-mentors').classList.toggle('active',  tab === 'mentors');
    document.getElementById('tab-sessions').classList.toggle('active', tab === 'sessions');
    document.getElementById('mentors-panel').classList.toggle('hidden',  tab !== 'mentors');
    document.getElementById('sessions-panel').classList.toggle('hidden', tab !== 'sessions');
  },

  renderMentorCard(m) {
    const avail = m.available;
    return `
      <div class="mentor-card">
        <div class="mentor-head">
          <div class="mentor-avatar">${m.name.slice(0,2).toUpperCase()}</div>
          <div class="mentor-info">
            <strong>${esc(m.name)}</strong>
            <span>📍 ${esc(m.location || 'Tigray')}</span>
            <div style="margin-top:.3rem">
              <span class="avail-dot ${avail ? 'dot-green' : 'dot-gray'}"></span>
              <span style="font-size:.75rem;color:${avail ? 'var(--success)' : 'var(--text-400)'}">
                ${avail ? t('available_label') : t('unavailable')}
              </span>
            </div>
          </div>
        </div>
        <div class="mentor-expertise">${esc(m.expertise || 'General Business')}</div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.875rem">
          <span class="tag tag-gold">${m.years_experience}+ ${t('yrs_exp')}</span>
          <span class="tag">${m.sessions_completed} ${t('sessions_done')}</span>
        </div>
        ${m.bio ? `<p style="font-size:.8125rem;color:var(--text-500);margin-bottom:.875rem;line-height:1.55">${esc(m.bio.slice(0,120))}${m.bio.length>120?'…':''}</p>` : ''}
        <button class="btn btn-primary btn-sm btn-block" ${!avail ? 'disabled' : ''}
          onclick="App.openRequestModal(${m.id}, '${esc(m.name)}')">
          ${avail ? t('request_session') : t('unavailable')}
        </button>
      </div>`;
  },

  renderSessionCard(s) {
    const isMyRequest = s.mentee_id === this.currentUser.id;
    const other = isMyRequest ? s.mentor_name : s.mentee_name;
    const role  = isMyRequest ? t('mentor_label') : t('mentee_label');
    return `
      <div class="session-card">
        <div class="mentor-avatar" style="width:42px;height:42px;font-size:.875rem">${(other||'?').slice(0,2).toUpperCase()}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:.9375rem;color:var(--text-900)">${esc(other)}</div>
          <div style="font-size:.8125rem;color:var(--text-500)">${role} &nbsp;·&nbsp; ${esc(s.topic || '')}</div>
          ${s.scheduled_date ? `<div style="font-size:.8125rem;margin-top:.2rem">📅 ${formatDate(s.scheduled_date)}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:.4rem">
          <span class="session-status status-${s.status}">${statusLabelSession(s.status)}</span>
          ${s.status === 'pending' && !isMyRequest ? `
            <div style="display:flex;gap:.4rem">
              <button class="btn btn-primary btn-sm" onclick="App.updateSessionStatus(${s.id},'accepted')">${t('accept')}</button>
              <button class="btn btn-danger btn-sm"  onclick="App.updateSessionStatus(${s.id},'rejected')">${t('decline')}</button>
            </div>` : ''}
          ${s.status === 'accepted' && !isMyRequest ? `
            <button class="btn btn-outline btn-sm" onclick="App.updateSessionStatus(${s.id},'completed')">${t('mark_done')}</button>` : ''}
        </div>
      </div>`;
  },

  openRequestModal(mentorId, mentorName) {
    this.openModal(`${t('request_modal_title')} ${mentorName}`, `
      <form id="request-form">
        <div class="form-group">
          <label>${t('topic_label')}</label>
          <input name="topic" placeholder="${t('topic_placeholder')}" required />
        </div>
        <div class="form-group">
          <label>${t('message_label')} *</label>
          <textarea name="message" rows="4" placeholder="${t('message_placeholder')}" required></textarea>
        </div>
        <div class="form-group">
          <label>${t('preferred_date')}</label>
          <input type="date" name="scheduled_date" />
        </div>
        <div id="req-alert"></div>
        <button type="submit" class="btn btn-primary btn-block" id="req-btn">${t('send_request')}</button>
      </form>
    `);
    document.getElementById('request-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      data.mentor_id = mentorId;
      const btn = document.getElementById('req-btn');
      btn.disabled = true; btn.textContent = t('sending');
      try {
        await API.requestMentorship(data);
        this.closeModal();
        showToast(t('request_sent'), 'success');
        this.renderMentorship();
      } catch (err) {
        document.getElementById('req-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
        btn.disabled = false; btn.textContent = t('send_request');
      }
    });
  },

  async updateSessionStatus(sessionId, status) {
    try { await API.updateSession(sessionId, { status }); showToast(t('saved_ok'), 'success'); this.renderMentorship(); }
    catch (err) { showToast(err.message, 'error'); }
  },

  /* ── RESOURCES ─────────────────────────────────────────────── */
  async renderResources() {
    this.setMain(this.loader());
    try {
      const resources = await API.getResources();
      const types     = [...new Set(resources.map(r => r.type).filter(Boolean))];

      this.setMain(`
        <div class="page">
          <div class="page-header">
            <h1>📂 ${t('resource_library')}</h1>
            <p>${t('resources_subtitle')}</p>
          </div>

          <div style="display:flex;gap:.625rem;flex-wrap:wrap;margin-bottom:1.5rem">
            <button class="btn btn-sm btn-primary" onclick="App.filterResources(null)">${t('all_resources')}</button>
            ${types.map(tp => `<button class="btn btn-sm btn-outline" onclick="App.filterResources('${tp}')">${capitalize(tp.replace('_',' '))}</button>`).join('')}
          </div>

          <div class="resources-grid" id="resources-grid">
            ${resources.map(r => this.renderResourceCard(r)).join('')}
          </div>
          ${!resources.length ? `<div class="empty-state"><div class="empty-icon">📂</div><p>${t('no_resources')}</p></div>` : ''}
        </div>
      `);
      window._allResources = resources;
    } catch (err) {
      this.setMain(`<div class="page"><div class="alert alert-error">${esc(err.message)}</div></div>`);
    }
  },

  filterResources(type) {
    const filtered = type ? (window._allResources || []).filter(r => r.type === type) : (window._allResources || []);
    document.getElementById('resources-grid').innerHTML = filtered.map(r => this.renderResourceCard(r)).join('');
  },

  renderResourceCard(r) {
    return `
      <div class="resource-card">
        <div class="resource-emoji">${esc(r.emoji || '📄')}</div>
        <h3>${esc(r.title)}</h3>
        <p>${esc(r.description || '')}</p>
        <div class="resource-footer">
          <span class="tag tag-red">${esc(capitalize((r.type||'resource').replace('_',' ')))}</span>
          <span class="tag" style="margin-left:.35rem">${esc(r.category||'')}</span>
        </div>
        <button class="btn btn-primary btn-sm btn-block" style="margin-top:.75rem"
          onclick="App.downloadResource(${r.id}, '${esc(r.title)}')">
          ${t('download_view')}
        </button>
        <div style="text-align:center;margin-top:.35rem;font-size:.7rem;color:var(--text-400)" id="dl-${r.id}">
          ${r.downloads} ${t('downloads')}
        </div>
      </div>`;
  },

  async downloadResource(id, title) {
    try {
      const result = await API.downloadResource(id);
      const el = document.getElementById(`dl-${id}`);
      if (el) { const m = el.textContent.match(/\d+/); if (m) el.textContent = (parseInt(m[0])+1) + ' ' + t('downloads'); }
      if (result.external_url)  window.open(result.external_url, '_blank');
      else if (result.file_url) window.open(result.file_url, '_blank');
      else showToast(`"${title}" — ${Lang.current === 'ti' ? 'ቀሪቡ ኣሎ' : 'Will be available for download soon.'}`, 'info');
    } catch (err) { showToast(err.message, 'error'); }
  },

  /* ── PROFILE ───────────────────────────────────────────────── */
  async renderProfile() {
    this.setMain(this.loader());
    try {
      const [user, myCourses, mentors] = await Promise.all([
        API.getMe(),
        API.getMyCourses(),
        API.getMentors(),
      ]);
      const mentorProfile = mentors.find(m => m.id === user.id) || null;
      const initials  = user.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const completed = myCourses.filter(c => c.status === 'completed').length;

      this.setMain(`
        <div class="page">
          <div class="profile-hero">
            <div class="profile-avatar">${initials}</div>
            <div class="profile-info">
              <h2>${esc(user.name)}</h2>
              <p>${esc(user.email)}</p>
              <p style="margin-top:.3rem">
                ${user.location ? `📍 ${esc(user.location)} &nbsp;` : ''}
                ${user.sector ? `🏭 ${esc(user.sector)}` : ''}
              </p>
              <p style="margin-top:.3rem;font-size:.875rem;opacity:.85">
                ${t('member_since')} ${formatDate(user.created_at)}
                ${user.role === 'admin' ? ' &nbsp;·&nbsp; <strong>Admin</strong>' : ''}
              </p>
            </div>
          </div>

          <div class="stats-grid" style="margin-bottom:1.5rem">
            <div class="stat-card red">   <span class="stat-icon">📚</span><div class="stat-value">${myCourses.length}</div><div class="stat-label">${t('courses_enrolled')}</div></div>
            <div class="stat-card gold">  <span class="stat-icon">🏆</span><div class="stat-value">${completed}</div><div class="stat-label">${t('courses_completed')}</div></div>
            <div class="stat-card orange"><span class="stat-icon">🏢</span><div class="stat-value">${capitalize(user.business_stage || (user.role==='mentor'?'Mentor':''))}</div><div class="stat-label">${t('business_stage')}</div></div>
          </div>

          <div class="section-card" style="margin-bottom:1.5rem">
            <div class="card-header"><h3>✏️ ${t('edit_profile_title')}</h3></div>
            <div class="card-body">
              <div id="profile-alert"></div>
              <form id="profile-form">
                <div class="form-row">
                  <div class="form-group"><label>${t('full_name')}</label><input name="name" value="${esc(user.name||'')}" /></div>
                  <div class="form-group"><label>${t('phone')}</label><input name="phone" value="${esc(user.phone||'')}" placeholder="+251 9XX XXX XXX" /></div>
                </div>
                <div class="form-row">
                  <div class="form-group"><label>${t('location')}</label><input name="location" value="${esc(user.location||'')}" /></div>
                  <div class="form-group"><label>${t('gender')}</label>
                    <select name="gender">
                      <option value="">${t('select_prompt')}</option>
                      <option value="female" ${user.gender==='female'?'selected':''}>${t('gender_female')}</option>
                      <option value="male"   ${user.gender==='male'  ?'selected':''}>${t('gender_male')}</option>
                      <option value="other"  ${user.gender==='other' ?'selected':''}>${t('gender_other')}</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group"><label>${t('business_sector')}</label><input name="sector" value="${esc(user.sector||'')}" /></div>
                  <div class="form-group"><label>${t('business_stage')}</label>
                    <select name="business_stage">
                      <option value="">${t('select_prompt')}</option>
                      <option value="idea"        ${user.business_stage==='idea'       ?'selected':''}>${t('stage_idea')}</option>
                      <option value="startup"     ${user.business_stage==='startup'    ?'selected':''}>${t('stage_startup')}</option>
                      <option value="growth"      ${user.business_stage==='growth'     ?'selected':''}>${t('stage_growth')}</option>
                      <option value="established" ${user.business_stage==='established'?'selected':''}>${t('stage_established')}</option>
                    </select>
                  </div>
                </div>
                <div class="form-group">
                  <label>${t('bio_label')}</label>
                  <textarea name="bio" rows="3" placeholder="${t('bio_placeholder')}">${esc(user.bio||'')}</textarea>
                </div>
                <button type="submit" class="btn btn-primary" id="save-profile-btn">${t('save_changes')}</button>
              </form>
            </div>
          </div>

          ${mentorProfile ? `
          <div class="section-card" style="margin-bottom:1.5rem">
            <div class="card-header"><h3>🤝 ${t('mentor_profile_title')}</h3></div>
            <div class="card-body">
              <div id="mentor-alert"></div>
              <form id="mentor-profile-form">
                <div class="form-row">
                  <div class="form-group"><label>${t('mentor_expertise_lbl')}</label>
                    <input name="expertise" value="${esc(mentorProfile.expertise||'')}" placeholder="e.g. Business Strategy, Finance" />
                  </div>
                  <div class="form-group"><label>${t('mentor_yrs_exp')}</label>
                    <input type="number" name="years_experience" value="${mentorProfile.years_experience||0}" min="0" max="50" />
                  </div>
                </div>
                <div class="form-group">
                  <label>${t('mentor_availability')}</label>
                  <div style="display:flex;align-items:center;gap:1rem;margin-top:.375rem">
                    <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;text-transform:none;letter-spacing:0;font-weight:500;font-size:.9375rem">
                      <input type="radio" name="available" value="1" ${mentorProfile.available?'checked':''} style="width:auto;accent-color:var(--red-600)" />
                      <span class="avail-dot dot-green"></span> ${t('mentor_available')}
                    </label>
                    <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;text-transform:none;letter-spacing:0;font-weight:500;font-size:.9375rem">
                      <input type="radio" name="available" value="0" ${!mentorProfile.available?'checked':''} style="width:auto" />
                      <span class="avail-dot dot-gray"></span> ${t('mentor_not_available')}
                    </label>
                  </div>
                </div>
                <button type="submit" class="btn btn-primary" id="save-mentor-btn">${t('save_mentor_profile')}</button>
              </form>
            </div>
          </div>` : ''}

          <div class="section-card">
            <div class="card-header"><h3>📚 ${t('my_courses')}</h3></div>
            <div class="card-body">
              ${myCourses.length ? `
                <div class="courses-grid">
                  ${myCourses.map(c => `
                    <div class="course-card" onclick="window.location.hash='#/courses/${c.id}'">
                      <div class="course-thumb">${esc(c.thumbnail_emoji||'📚')}</div>
                      <div class="course-body">
                        <div class="course-title">${esc(c.title)}</div>
                        <span class="tag tag-red">${esc(c.category||'')}</span>
                        <div class="progress-bar-wrap">
                          <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${c.progress}%"></div></div>
                          <div class="progress-label"><span>${statusLabel(c.status)}</span><span>${c.progress}%</span></div>
                        </div>
                      </div>
                    </div>`).join('')}
                </div>` : `<p class="text-muted">${t('no_enrollments')}</p>`}
            </div>
          </div>
        </div>
      `);

      document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        const btn  = document.getElementById('save-profile-btn');
        btn.disabled = true; btn.textContent = t('saving_profile');
        try {
          const updated = await API.updateMe(data);
          this.currentUser = { ...this.currentUser, ...updated };
          localStorage.setItem('user', JSON.stringify(this.currentUser));
          document.getElementById('profile-alert').innerHTML = `<div class="alert alert-success">${t('saved_ok')}</div>`;
          showToast(t('saved_ok'), 'success');
          this.updateNav();
        } catch (err) {
          document.getElementById('profile-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
        }
        btn.disabled = false; btn.textContent = t('save_changes');
      });

      const mentorForm = document.getElementById('mentor-profile-form');
      if (mentorForm) {
        mentorForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd   = new FormData(e.target);
          const data = {
            expertise:        fd.get('expertise'),
            years_experience: parseInt(fd.get('years_experience')) || 0,
            available:        fd.get('available') === '1',
          };
          const btn = document.getElementById('save-mentor-btn');
          btn.disabled = true; btn.textContent = t('saving_mentor');
          try {
            await API.updateAvailability(data);
            showToast(t('saved_ok'), 'success');
            document.getElementById('mentor-alert').innerHTML = `<div class="alert alert-success">${t('saved_ok')}</div>`;
          } catch (err) {
            document.getElementById('mentor-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
          }
          btn.disabled = false; btn.textContent = t('save_mentor_profile');
        });
      }
    } catch (err) {
      this.setMain(`<div class="page"><div class="alert alert-error">${esc(err.message)}</div></div>`);
    }
  },

  /* ── ADMIN DASHBOARD (tabbed) ──────────────────────────────── */
  async renderAdmin(tab = 'overview') {
    if (this.currentUser.role !== 'admin') { window.location.hash = '#/dashboard'; return; }
    this.setMain(this.loader());
    try {
      const tabNav = `
        <div class="admin-tabs">
          <button class="admin-tab-btn ${tab==='overview'?'active':''}" onclick="App.renderAdmin('overview')">📊 ${t('admin_tab_overview')}</button>
          <button class="admin-tab-btn ${tab==='users'   ?'active':''}" onclick="App.renderAdmin('users')"   >👥 ${t('admin_tab_users')}</button>
          <button class="admin-tab-btn ${tab==='courses' ?'active':''}" onclick="App.renderAdmin('courses')" >📚 ${t('admin_tab_courses')}</button>
          <button class="admin-tab-btn ${tab==='resources'?'active':''}" onclick="App.renderAdmin('resources')">📂 ${t('admin_tab_resources')}</button>
        </div>`;

      if (tab === 'overview') {
        const data = await API.getAdminStats();
        const s    = data.summary;
        const wPct = s.totalUsers > 0 ? Math.round((s.womenUsers/s.totalUsers)*100) : 0;
        const yPct = s.totalUsers > 0 ? Math.round((s.youthUsers/s.totalUsers)*100) : 0;
        const cRate= s.totalEnrollments > 0 ? Math.round((s.completions/s.totalEnrollments)*100) : 0;
        const COLS = ['#C62828','#D48806','#E64A19','#B71C1C','#F0A500','#9B0E0E','#7B0012','#E53935'];

        this.setMain(`
          <div class="page">
            <div class="page-header">
              <h1>📊 ${t('admin_title')}</h1>
              <p>${t('admin_subtitle')}</p>
            </div>
            ${tabNav}

            <div class="stats-grid">
              <div class="stat-card red">   <span class="stat-icon">👥</span><div class="stat-value">${s.totalUsers}</div><div class="stat-label">${t('total_users')}</div></div>
              <div class="stat-card gold">  <span class="stat-icon">👩</span><div class="stat-value">${s.womenUsers} <small>(${wPct}%)</small></div><div class="stat-label">${t('women_entrepreneurs')}</div></div>
              <div class="stat-card orange"><span class="stat-icon">🎓</span><div class="stat-value">${s.youthUsers} <small>(${yPct}%)</small></div><div class="stat-label">${t('youth')}</div></div>
              <div class="stat-card dark">  <span class="stat-icon">📚</span><div class="stat-value">${s.totalEnrollments}</div><div class="stat-label">${t('total_enrollments')}</div></div>
              <div class="stat-card red">   <span class="stat-icon">🏆</span><div class="stat-value">${s.completions} <small>(${cRate}%)</small></div><div class="stat-label">${t('course_completions')}</div></div>
              <div class="stat-card gold">  <span class="stat-icon">🤝</span><div class="stat-value">${s.completedSessions}</div><div class="stat-label">${t('sessions_done_label')}</div></div>
              <div class="stat-card orange"><span class="stat-icon">📂</span><div class="stat-value">${s.totalResources}</div><div class="stat-label">${t('resources_published')}</div></div>
              <div class="stat-card dark">  <span class="stat-icon">⬇️</span><div class="stat-value">${s.totalDownloads}</div><div class="stat-label">${t('resource_downloads')}</div></div>
            </div>

            <div class="admin-grid">
              <div class="section-card"><div class="card-header"><h3>📅 ${t('registrations_month')}</h3></div><div class="card-body"><div class="chart-bar-wrap">${renderBarChart(data.registrationsByMonth,'month','count',COLS)}</div></div></div>
              <div class="section-card"><div class="card-header"><h3>📍 ${t('users_by_location')}</h3></div><div class="card-body"><div class="chart-bar-wrap">${renderBarChart(data.usersByLocation,'location','count',COLS)}</div></div></div>
              <div class="section-card"><div class="card-header"><h3>🏭 ${t('users_by_sector')}</h3></div><div class="card-body"><div class="chart-bar-wrap">${renderBarChart(data.usersBySector,'sector','count',COLS)}</div></div></div>
              <div class="section-card"><div class="card-header"><h3>📈 ${t('stage_breakdown')}</h3></div><div class="card-body">${data.businessStageBreakdown.length?`<div class="chart-bar-wrap">${renderBarChart(data.businessStageBreakdown,'business_stage','count',COLS)}</div>`:`<p class="text-muted">${t('no_data')}</p>`}</div></div>
            </div>

            <div class="section-card" style="margin-bottom:1.5rem">
              <div class="card-header"><h3>📚 ${t('course_performance')}</h3></div>
              <div class="table-wrap">
                <table class="data-table">
                  <thead><tr><th>${t('col_course')}</th><th>${t('col_enrollments')}</th><th>${t('col_completions')}</th><th>${t('col_rate')}</th><th>${t('col_progress')}</th></tr></thead>
                  <tbody>
                    ${data.courseEnrollmentStats.map(c=>`
                      <tr><td>${esc(c.thumbnail_emoji||'📚')} ${esc(c.title)}</td><td>${c.enrollments}</td><td>${c.completions}</td>
                      <td>${c.enrollments>0?Math.round((c.completions/c.enrollments)*100):0}%</td>
                      <td><div style="display:flex;align-items:center;gap:.5rem"><div class="progress-bar-bg" style="flex:1;height:8px"><div class="progress-bar-fill" style="width:${c.avg_progress||0}%"></div></div><span style="font-size:.75rem">${c.avg_progress||0}%</span></div></td></tr>`).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="section-card">
              <div class="card-header"><h3>🆕 ${t('recent_users')}</h3></div>
              <div class="table-wrap">
                <table class="data-table">
                  <thead><tr><th>${t('col_name')}</th><th>${t('col_email')}</th><th>${t('col_gender')}</th><th>${t('col_age')}</th><th>${t('col_location')}</th><th>${t('col_sector')}</th><th>${t('col_stage')}</th><th>${t('col_joined')}</th></tr></thead>
                  <tbody>
                    ${data.recentUsers.map(u=>`
                      <tr><td><strong>${esc(u.name)}</strong></td><td>${esc(u.email)}</td><td>${u.gender?capitalize(u.gender):'—'}</td><td>${u.age||'—'}</td><td>${esc(u.location||'—')}</td><td>${esc(u.sector||'—')}</td>
                      <td>${u.business_stage?`<span class="tag">${capitalize(u.business_stage)}</span>`:'—'}</td><td>${formatDate(u.created_at)}</td></tr>`).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        `);

      } else if (tab === 'users') {
        const users = await API.getUsers();
        this.setMain(`
          <div class="page">
            <div class="page-header">
              <h1>📊 ${t('admin_title')}</h1>
              <p>${t('admin_subtitle')}</p>
            </div>
            ${tabNav}
            <div class="section-card">
              <div class="card-header"><h3>👥 ${t('admin_tab_users')} (${users.length})</h3></div>
              <div class="table-wrap">
                <table class="data-table">
                  <thead><tr><th>${t('col_name')}</th><th>${t('col_email')}</th><th>Role</th><th>${t('col_gender')}</th><th>${t('col_location')}</th><th>${t('col_joined')}</th><th>Actions</th></tr></thead>
                  <tbody id="users-tbody">
                    ${users.map(u=>`
                      <tr id="urow-${u.id}">
                        <td><strong>${esc(u.name)}</strong></td>
                        <td style="color:var(--text-500)">${esc(u.email)}</td>
                        <td>
                          <select class="role-select" data-uid="${u.id}" style="font-size:.75rem;padding:.2rem .4rem;border:1px solid var(--border);border-radius:var(--radius-xs);background:var(--bg-input)"
                            onchange="App.changeUserRole(${u.id},this.value)" ${u.id===App.currentUser.id?'disabled':''}>
                            <option value="entrepreneur" ${u.role==='entrepreneur'?'selected':''}>Entrepreneur</option>
                            <option value="mentor"       ${u.role==='mentor'      ?'selected':''}>Mentor</option>
                            <option value="admin"        ${u.role==='admin'       ?'selected':''}>Admin</option>
                          </select>
                        </td>
                        <td>${u.gender?capitalize(u.gender):'—'}</td>
                        <td>${esc(u.location||'—')}</td>
                        <td>${formatDate(u.created_at)}</td>
                        <td>${u.id!==App.currentUser.id?`<button class="btn btn-danger btn-sm" onclick="App.deleteUser(${u.id},'${esc(u.name)}')">🗑</button>`:'<span style="color:var(--text-400);font-size:.75rem">You</span>'}</td>
                      </tr>`).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        `);

      } else if (tab === 'courses') {
        const courses = await API.getCourses();
        this.setMain(`
          <div class="page">
            <div class="page-header">
              <h1>📊 ${t('admin_title')}</h1>
              <p>${t('admin_subtitle')}</p>
            </div>
            ${tabNav}

            <div class="section-card" style="margin-bottom:1.5rem">
              <div class="card-header"><h3>➕ Add New Course</h3></div>
              <div class="card-body">
                <div id="course-alert"></div>
                <form id="add-course-form">
                  <div class="form-row">
                    <div class="form-group"><label>Title *</label><input name="title" placeholder="Course title" required /></div>
                    <div class="form-group"><label>Category</label><input name="category" placeholder="e.g. Finance" /></div>
                  </div>
                  <div class="form-row">
                    <div class="form-group"><label>Level</label>
                      <select name="level">
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                    <div class="form-group"><label>Duration (hours)</label><input type="number" name="duration_hours" placeholder="2" min="0.5" step="0.5" /></div>
                  </div>
                  <div class="form-row">
                    <div class="form-group"><label>Emoji Icon</label><input name="thumbnail_emoji" placeholder="📚" maxlength="4" /></div>
                  </div>
                  <div class="form-group"><label>Description</label><textarea name="description" rows="3" placeholder="Course description…"></textarea></div>
                  <button type="submit" class="btn btn-primary" id="add-course-btn">➕ Create Course</button>
                </form>
              </div>
            </div>

            <div class="section-card">
              <div class="card-header"><h3>📚 All Courses (${courses.length})</h3></div>
              <div class="card-body" style="padding:.5rem 0">
                ${courses.map(c=>`
                  <div style="display:flex;align-items:center;gap:1rem;padding:.875rem 1.375rem;border-bottom:1px solid var(--border)">
                    <span style="font-size:1.75rem">${esc(c.thumbnail_emoji||'📚')}</span>
                    <div style="flex:1">
                      <strong style="font-size:.9375rem;color:var(--text-900)">${esc(c.title)}</strong>
                      <div style="font-size:.75rem;color:var(--text-400);margin-top:.15rem">${esc(c.category||'')} · ${levelLabel(c.level)} · ${c.module_count} modules · ${c.enrolled_count} enrolled</div>
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="App.openAddModuleModal(${c.id},'${esc(c.title)}')">+ Module</button>
                  </div>`).join('')}
                ${!courses.length ? `<div class="empty-state"><div class="empty-icon">📚</div><p>No courses yet.</p></div>` : ''}
              </div>
            </div>
          </div>
        `);

        document.getElementById('add-course-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.target));
          const btn  = document.getElementById('add-course-btn');
          btn.disabled = true; btn.textContent = 'Creating…';
          try {
            await API.createCourse(data);
            showToast('Course created successfully!', 'success');
            this.renderAdmin('courses');
          } catch (err) {
            document.getElementById('course-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
            btn.disabled = false; btn.textContent = '➕ Create Course';
          }
        });

      } else if (tab === 'resources') {
        const resources = await API.getResources();
        this.setMain(`
          <div class="page">
            <div class="page-header">
              <h1>📊 ${t('admin_title')}</h1>
              <p>${t('admin_subtitle')}</p>
            </div>
            ${tabNav}

            <div class="section-card" style="margin-bottom:1.5rem">
              <div class="card-header"><h3>➕ Add New Resource</h3></div>
              <div class="card-body">
                <div id="res-alert"></div>
                <form id="add-resource-form">
                  <div class="form-row">
                    <div class="form-group"><label>Title *</label><input name="title" placeholder="Resource title" required /></div>
                    <div class="form-group"><label>Category</label><input name="category" placeholder="e.g. Finance" /></div>
                  </div>
                  <div class="form-row">
                    <div class="form-group"><label>Type</label>
                      <select name="type">
                        <option value="template">Template</option>
                        <option value="guide">Guide</option>
                        <option value="success_story">Success Story</option>
                        <option value="video">Video</option>
                        <option value="tool">Tool</option>
                      </select>
                    </div>
                    <div class="form-group"><label>Emoji Icon</label><input name="emoji" placeholder="📄" maxlength="4" /></div>
                  </div>
                  <div class="form-group"><label>External URL (optional)</label><input type="url" name="external_url" placeholder="https://…" /></div>
                  <div class="form-group"><label>Description</label><textarea name="description" rows="3" placeholder="Resource description…"></textarea></div>
                  <button type="submit" class="btn btn-primary" id="add-res-btn">➕ Add Resource</button>
                </form>
              </div>
            </div>

            <div class="section-card">
              <div class="card-header"><h3>📂 All Resources (${resources.length})</h3></div>
              <div class="card-body" style="padding:.5rem 0">
                ${resources.map(r=>`
                  <div style="display:flex;align-items:center;gap:1rem;padding:.875rem 1.375rem;border-bottom:1px solid var(--border)">
                    <span style="font-size:1.75rem">${esc(r.emoji||'📄')}</span>
                    <div style="flex:1">
                      <strong style="font-size:.9375rem;color:var(--text-900)">${esc(r.title)}</strong>
                      <div style="font-size:.75rem;color:var(--text-400);margin-top:.15rem">${capitalize((r.type||'').replace('_',' '))} · ${esc(r.category||'')} · ${r.downloads} downloads</div>
                    </div>
                    <button class="btn btn-danger btn-sm" onclick="App.deleteResource(${r.id},'${esc(r.title)}')">🗑</button>
                  </div>`).join('')}
                ${!resources.length ? `<div class="empty-state"><div class="empty-icon">📂</div><p>No resources yet.</p></div>` : ''}
              </div>
            </div>
          </div>
        `);

        document.getElementById('add-resource-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.target));
          const btn  = document.getElementById('add-res-btn');
          btn.disabled = true; btn.textContent = 'Adding…';
          try {
            await API.createResource(data);
            showToast('Resource added successfully!', 'success');
            this.renderAdmin('resources');
          } catch (err) {
            document.getElementById('res-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
            btn.disabled = false; btn.textContent = '➕ Add Resource';
          }
        });
      }

    } catch (err) {
      this.setMain(`<div class="page"><div class="alert alert-error">${esc(err.message)}</div></div>`);
    }
  },

  async changeUserRole(userId, role) {
    try {
      await API.put(`/users/${userId}/role`, { role });
      showToast(`Role updated to ${capitalize(role)}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
      this.renderAdmin('users');
    }
  },

  async deleteUser(userId, name) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await API.deleteUser(userId);
      showToast(`User "${name}" deleted.`, 'success');
      document.getElementById(`urow-${userId}`)?.remove();
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  openAddModuleModal(courseId, courseTitle) {
    this.openModal(`Add Module to: ${courseTitle}`, `
      <form id="add-module-form">
        <div class="form-group"><label>Module Title *</label><input name="title" placeholder="e.g. Introduction to Pricing" required /></div>
        <div class="form-row">
          <div class="form-group"><label>Type</label>
            <select name="type">
              <option value="text">Text / Article</option>
              <option value="video">Video</option>
              <option value="quiz">Quiz</option>
              <option value="exercise">Exercise</option>
            </select>
          </div>
          <div class="form-group"><label>Duration (minutes)</label><input type="number" name="duration_minutes" value="15" min="1" /></div>
        </div>
        <div class="form-group"><label>Order Index</label><input type="number" name="order_index" value="0" min="0" /></div>
        <div class="form-group"><label>Content (Markdown)</label><textarea name="content" rows="8" placeholder="## Lesson Title&#10;&#10;Write your content here. Supports **bold**, *italic*, lists and headings."></textarea></div>
        <div id="mod-alert"></div>
        <button type="submit" class="btn btn-primary btn-block" id="add-mod-btn">➕ Add Module</button>
      </form>
    `);
    document.getElementById('add-module-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      const btn  = document.getElementById('add-mod-btn');
      btn.disabled = true; btn.textContent = 'Adding…';
      try {
        await API.addModule(courseId, data);
        this.closeModal();
        showToast('Module added!', 'success');
        this.renderAdmin('courses');
      } catch (err) {
        document.getElementById('mod-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
        btn.disabled = false; btn.textContent = '➕ Add Module';
      }
    });
  },

  async deleteResource(id, title) {
    if (!confirm(`Delete resource "${title}"?`)) return;
    try {
      await API.deleteResource(id);
      showToast(`Resource "${title}" deleted.`, 'success');
      this.renderAdmin('resources');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },
};

/* ═══════════════════════════════════════════════════════════════
   Utility Functions
═══════════════════════════════════════════════════════════════ */
function esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

function statusLabel(status) {
  const m = { enrolled:'status_enrolled', in_progress:'status_in_progress', completed:'status_completed' };
  return t(m[status] || 'status_enrolled');
}
function statusLabelSession(status) {
  const m = { pending:'status_pending', accepted:'status_accepted', completed:'status_completed', rejected:'status_rejected' };
  return t(m[status] || status);
}
function levelLabel(level) {
  const m = { beginner:'level_beginner', intermediate:'level_intermediate', advanced:'level_advanced' };
  return t(m[level]) || capitalize(level || '');
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return t('good_morning');
  if (h < 17) return t('good_afternoon');
  return t('good_evening');
}
function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return t('just_now');
  if (mins < 60) return `${mins}m ${t('ago')}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ${t('ago')}`;
  return `${Math.floor(hrs/24)}d ${t('ago')}`;
}

function renderBarChart(data, labelKey, valueKey, colours) {
  if (!data?.length) return `<p class="text-muted">${t('no_data')}</p>`;
  const max = Math.max(...data.map(d => d[valueKey]||0), 1);
  return data.map((d,i) => `
    <div class="chart-bar-row">
      <div class="chart-bar-label" title="${esc(d[labelKey]||'?')}">${esc(d[labelKey]||'?')}</div>
      <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${Math.round((d[valueKey]/max)*100)}%;background:${colours[i%colours.length]}"></div></div>
      <div class="chart-bar-val">${d[valueKey]}</div>
    </div>`).join('');
}

function markdownToHtml(md) {
  if (!md) return '';
  let html = md
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/^# (.+)$/gm,'<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^> (.+)$/gm,'<blockquote>$1</blockquote>')
    .replace(/^[\-\*] (.+)$/gm,'<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm,'<li>$1</li>')
    .replace(/`(.+?)`/g,'<code>$1</code>')
    .replace(/^---$/gm,'<hr/>')
    .replace(/\n\n+/g,'</p><p>')
    .replace(/\n/g,'<br/>');
  html = html.replace(/(<li>.*?<\/li>)(\s*<br\/>)*/gs, m => `<ul>${m}</ul>`);
  if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<blockquote'))
    html = `<p>${html}</p>`;
  return html;
}

/* ═══════════════════════════════════════════════════════════════
   Toast Notification System
═══════════════════════════════════════════════════════════════ */
function showToast(message, type = 'success') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${esc(message)}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => { requestAnimationFrame(() => toast.classList.add('show')); });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 350);
  }, 3800);
}

App.init();
