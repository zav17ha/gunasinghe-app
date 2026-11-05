# Gunasinghe Group — setup on Vercel (with Vercel's built-in Supabase)

This folder is the whole app. **Vercel** shows the page on the internet. **Supabase**, added from inside Vercel, keeps the data (hires, costs, diesel, driver pay, gate passes), the bill photos, and the logins.

You don't need to copy any keys: when you connect Supabase in Vercel's **Storage** tab, Vercel gives the app its connection details automatically.

Setup takes about 15 minutes and is done once.

---

## Step 1 — Put the folder on GitHub

1. Create a free account on **github.com**, then **New repository** → name `gunasinghe-app` → *Private* → Create.
2. Click **uploading an existing file**. Drag in **everything** from this folder, including the `api` folder with `config.js` inside it. Click **Commit changes**.

## Step 2 — Deploy on Vercel

1. Go to **vercel.com** and sign up with GitHub.
2. Click **Add New → Project** and **Import** `gunasinghe-app`.
3. Set **Framework Preset** to **Other**, leave the build settings empty, and click **Deploy**.

The site opens with the message "not connected to Supabase yet". That is expected; Step 3 fixes it.

## Step 3 — Add Supabase from Vercel

1. In your Vercel project, open the **Storage** tab, click **Create Database**, and choose **Supabase**.
2. Pick the free plan and the nearest region (e.g. *Mumbai* or *Singapore*). Name it `gunasinghe`, then create it and **connect it to this project**. Billing for it goes through your Vercel account.
3. Go to **Deployments**, open the ⋯ menu on the latest one and click **Redeploy**, so the app picks up the new connection.

## Step 4 — Create the database (in Supabase)

1. In Vercel → **Storage → your Supabase database**, click **Open in Supabase**.
2. Open **SQL Editor → New query** and paste in everything from `schema.sql`.
3. Click **Run**. It should say *Success*. You don't need to type any names or emails into it.

This creates the records table, the members list, rules that allow only members in, live updates between phones, and a private `bills` folder for photos.

> **Ran an older copy of `schema.sql` that had email addresses in it?** Run `delete from public.members;` once before Step 5, so the app can make you the owner.

Last thing in Supabase: go to **Authentication → Sign In / Providers** and turn **off** "Allow new users to sign up". Only the owner, from inside the app, can then create logins.

## Step 5 — Create your owner account (in the app)

1. Open your link (e.g. `gunasinghe-app.vercel.app`).
2. The first time, it shows **Create the owner account**. Enter your name, a username (e.g. `gunasinghe`) and a password.
3. You are signed in as the **Owner**.

## Step 6 — Add your 2 users (in the app)

1. Tap the **gear** (Settings) and scroll down to **Users**.
2. Enter a name, a username (e.g. `nimal`) and a password, then tap **＋ Add user**. Do it again for the second person.
3. Give each person their username and password. They sign in with those on their own phone.

In the same list, the owner can:
- **Password:** set a new password if someone forgets theirs.
- **Remove:** stop someone from signing in. The hires and costs they added stay in the records.

Everyone who signs in can add, edit and delete hires, costs, driver pay and gate passes. Only the owner sees the Users list.

## Step 7 — Put it on the phones

Open the link in the phone's browser and sign in, then:
- **iPhone (Safari):** Share → **Add to Home Screen**
- **Android (Chrome):** ⋮ menu → **Add to Home screen** / **Install app**

It opens full-screen with the lorry icon, like a normal app. To use your own domain (e.g. `gunasinghegroup.lk`), go to Vercel → Project → **Settings → Domains**.

---

## Good to know

- **How the keys work:** `api/config.js` gives the browser only the public Supabase URL and anon/publishable key. `api/users.js` uses the secret service key to create and remove logins, and that key never leaves Vercel. The members rules in `schema.sql` mean nobody can see data without signing in.
- **Usernames:** Supabase needs an email for every login, so the app quietly stores `nimal` as `nimal@users.gunasinghe-group.app`. No email is ever sent, and people only ever type the username.
- **Free plan pause:** a free Supabase project pauses after about a week with very little activity. You get an email first. Using the app every few days avoids it. If it does pause, open it in Supabase and click **Restore**; no data is lost.
- **Backups:** Supabase → Table Editor → `records` → **Export to CSV**.
- **Photos:** stored privately in Storage → `bills`, shrunk on the phone before uploading.
- **Someone left or lost a phone:** Settings → Users → **Remove** (or change their password).
- **Owner forgot the password:** in Supabase → Authentication → Users, find `<username>@users.gunasinghe-group.app` and send a password reset or set a new one.
- **Not using Vercel's Storage tab?** You can create a project on supabase.com and paste its URL and publishable key into `config.js`. To add users from inside the app you then also need to add the project's service role key in Vercel → Settings → Environment Variables as `SUPABASE_SERVICE_ROLE_KEY`, plus `SUPABASE_URL`.
- **The diesel price** lives in the app's Settings. CEYPETCO Auto Diesel was Rs 397/L from 1 Nov 2026.

## Files

| File | What it is |
|---|---|
| `index.html` | The app |
| `api/config.js` | Passes Vercel's Supabase connection to the app (no editing needed) |
| `api/users.js` | Owner setup and adding/removing users (no editing needed) |
| `config.js` | Backup: manual Supabase URL and key, only if not using Vercel's Storage tab |
| `schema.sql` | Database, members list, security rules, photo folder |
| `manifest.webmanifest`, `icon-*.png`, `apple-touch-icon.png` | Home-screen icon and name |
