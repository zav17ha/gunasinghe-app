// Vercel serverless function: owner setup and user management for Gunasinghe Group.
// Uses the Supabase service role key that Vercel's Supabase integration adds to the
// project. That key stays here on the server and is never sent to the browser.
//
// People sign in with a username. Supabase needs an email, so each username is
// stored as <username>@users.gunasinghe-group.app. No emails are ever sent.

const DOMAIN = 'users.gunasinghe-group.app';

module.exports = async (req, res) => {
  const env = process.env;
  const url = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const svc = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || '';
  const send = (code, obj) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(obj));
  };
  if (!url || !svc) return send(503, { error: 'not_connected', message: 'Connect Supabase in the Vercel project’s Storage tab, then redeploy.' });

  const H = { apikey: svc, Authorization: 'Bearer ' + svc, 'Content-Type': 'application/json' };
  const rest = (path, opt = {}) => fetch(url + '/rest/v1/' + path, { ...opt, headers: { ...H, ...(opt.headers || {}) } });
  const admin = (path, opt = {}) => fetch(url + '/auth/v1/admin/' + path, { ...opt, headers: { ...H, ...(opt.headers || {}) } });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const action = req.method === 'GET' ? ((req.query && req.query.action) || 'status') : body.action;

  const cleanU = u => String(u || '').trim().toLowerCase();
  const validU = u => /^[a-z0-9._-]{3,20}$/.test(u);
  const emailOf = u => u + '@' + DOMAIN;
  const nameOf = (n, u) => String(n || '').trim().slice(0, 60) || u;

  async function members() {
    const r = await rest('members?select=email,username,name,role&order=role.desc,username.asc');
    if (!r.ok) throw new Error('Could not read the members list (' + r.status + '). Did you run schema.sql?');
    return r.json();
  }
  async function isEmpty() {
    const r = await rest('members?select=email&limit=1');
    if (!r.ok) throw new Error('Could not read the members list (' + r.status + '). Did you run schema.sql?');
    const j = await r.json();
    return Array.isArray(j) && j.length === 0;
  }
  async function createUser(b, role) {
    const u = cleanU(b.username), pw = String(b.password || '');
    if (!validU(u)) return [400, 'Username must be 3–20 letters or numbers, with no spaces.'];
    if (pw.length < 6) return [400, 'Password must be at least 6 characters.'];
    const ex = await rest('members?select=email&username=eq.' + encodeURIComponent(u));
    if (ex.ok && (await ex.json()).length) return [409, 'That username is already taken.'];
    const r = await admin('users', { method: 'POST', body: JSON.stringify({
      email: emailOf(u), password: pw, email_confirm: true,
      user_metadata: { name: nameOf(b.name, u), username: u }
    }) });
    if (!r.ok) {
      const t = await r.json().catch(() => ({}));
      const msg = t.msg || t.message || t.error_description || '';
      if (/already|exists|registered/i.test(msg)) return [409, 'That username is already taken.'];
      if (/password/i.test(msg)) return [400, msg];
      return [500, 'Could not create the login. ' + msg];
    }
    const m = await rest('members', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ email: emailOf(u), username: u, name: nameOf(b.name, u), role }) });
    if (!m.ok) return [500, 'The login was made but could not be added to the members list.'];
    return [200, null];
  }
  async function findAuthId(email) {
    for (let p = 1; p <= 10; p++) {
      const r = await admin('users?page=' + p + '&per_page=200');
      if (!r.ok) return null;
      const j = await r.json();
      const list = j.users || [];
      const f = list.find(x => (x.email || '').toLowerCase() === email);
      if (f) return f.id;
      if (list.length < 200) break;
    }
    return null;
  }

  try {
    if (action === 'status') return send(200, { needsSetup: await isEmpty(), domain: DOMAIN });

    if (action === 'setup') {
      if (!(await isEmpty())) return send(403, { message: 'The owner account already exists. Sign in instead.' });
      const [c, msg] = await createUser(body, 'owner');
      return c === 200 ? send(200, { ok: true }) : send(c, { message: msg });
    }

    // Everything below needs a signed-in member.
    const tok = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!tok) return send(401, { message: 'Sign in first.' });
    const ur = await fetch(url + '/auth/v1/user', { headers: { apikey: svc, Authorization: 'Bearer ' + tok } });
    if (!ur.ok) return send(401, { message: 'Your sign-in has expired. Sign in again.' });
    const me = await ur.json();
    const all = await members();
    const mine = all.find(m => m.email.toLowerCase() === String(me.email || '').toLowerCase());
    if (!mine) return send(403, { message: 'Your account is not on the members list.' });

    if (action === 'me') return send(200, { role: mine.role, username: mine.username, name: mine.name });
    if (mine.role !== 'owner') return send(403, { message: 'Only the owner can manage users.' });

    if (action === 'list') return send(200, { me: mine.username, users: all.map(m => ({ username: m.username, name: m.name, role: m.role })) });

    if (action === 'add') {
      const [c, msg] = await createUser(body, 'member');
      return c === 200 ? send(200, { ok: true }) : send(c, { message: msg });
    }

    const target = all.find(m => m.username === cleanU(body.username));
    if (!target) return send(404, { message: 'There is no user with that username.' });

    if (action === 'password') {
      const pw = String(body.password || '');
      if (pw.length < 6) return send(400, { message: 'Password must be at least 6 characters.' });
      const id = await findAuthId(target.email.toLowerCase());
      if (!id) return send(404, { message: 'That login could not be found.' });
      const r = await admin('users/' + id, { method: 'PUT', body: JSON.stringify({ password: pw }) });
      return r.ok ? send(200, { ok: true }) : send(500, { message: 'Could not change the password.' });
    }

    if (action === 'remove') {
      if (target.role === 'owner') return send(400, { message: 'The owner account cannot be removed.' });
      const id = await findAuthId(target.email.toLowerCase());
      if (id) await admin('users/' + id, { method: 'DELETE' });
      await rest('members?email=eq.' + encodeURIComponent(target.email), { method: 'DELETE' });
      return send(200, { ok: true });
    }

    return send(400, { message: 'Unknown action.' });
  } catch (e) {
    return send(500, { message: e.message || 'Server error.' });
  }
};
