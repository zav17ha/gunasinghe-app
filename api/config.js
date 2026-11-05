// Vercel serverless function: hands the browser the PUBLIC Supabase settings
// that Vercel's built-in Supabase integration (Storage tab) adds to this project.
// Only the URL and the anon/publishable key are sent. The service role key and
// JWT secret stay on the server and are never exposed.
module.exports = (req, res) => {
  const env = process.env;
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
              env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
  res.end(url && key
    ? 'window.GB_CONFIG = ' + JSON.stringify({ supabaseUrl: url, supabaseKey: key }) + ';'
    : '/* Supabase is not connected to this Vercel project yet. Using config.js instead. */');
};
