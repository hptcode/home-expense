# Deployment guide (plain English) - HomeXpensify on Coolify

This walks you through getting the app running on your Coolify server. You do NOT
need to be a programmer - just follow the clicks. Do the steps in order.

## What you are building (3 pieces)
1. A Postgres 17 database  (where data lives)
2. The Next.js app        (the actual website / API)
3. A link between them     (the DATABASE_URL secret)

Both run as Docker containers on the same Coolify "coolify" network, so they can
talk to each other privately.

## Step 1 - Put the code on GitHub
You must do this from your computer or the GitHub website (it is not done here):
1. Go to https://github.com/new
2. Name the repo "home-expense", keep it Public (or Private - your choice), do NOT add a README.
3. On your computer, inside this project folder, run:
     git init
     git add .
     git commit -m "initial"
     git branch -M main
     git remote add origin https://github.com/<YOURUSER>/home-expense.git
     git push -u origin main
   (If you prefer, you can also drag-and-drop the folder via GitHub's "upload files".)
Coolify will read the code from this GitHub repo.

## Step 2 - Create the Postgres database in Coolify
1. Open your Coolify dashboard (port 8000).
2. "New Resource" -> "Database" -> "Postgres".
3. Version: 17. Give it a name like "home-expense-db".
4. In the same Project + Environment as the app (create a new Project "home-expense" if needed).
5. Leave the generated DB user / password / database name as-is; Coolify shows them.
6. Deploy it. Wait until the status is "Running".
7. IMPORTANT: copy the "Internal Connection URL" Coolify shows (looks like
   postgresql://<user>:<pass>@<db-service>:<port>/<db>). You need this in Step 4.

## Step 3 - Create the app in Coolify
1. "New Resource" -> "Application" -> "Public Repository (GitHub)".
2. Connect the home-expense repo (first time, approve the GitHub integration).
3. Build method: choose "Dockerfile" (we included one) OR "Nixpacks" (Coolify
   auto-detects Next.js). Either works; Nixpacks is simplest.
4. Put it in the SAME Project + Environment as the database (so they share the network).
5. Set the port to 3000 (Next.js default).

## Step 4 - Add the environment variables (the wiring)
In the app's "Environment Variables" tab, add:
- DATABASE_URL  =  the Internal Connection URL you copied in Step 2
- APP_BASE_URL  =  the public domain Coolify gives the app (or your domain)
- NODE_ENV      =  production
(EMAIL_API_KEY and EMAIL_FROM can stay blank for now - signup will just log the
verify link in the container logs instead of sending real email.)

## Step 5 - Deploy the app
1. Click "Deploy". Watch the build log until it shows the app is "Running".
2. Open the app's URL. The /api/health endpoint should return {"ok":true,"db":"up"}.
   Test it: visit <your-app-domain>/api/health in a browser.

## Step 6 - Create the database tables
The app code is ready but the tables do not exist yet. Run the migration ONCE:
1. In Coolify, open the app -> "Terminal" (or "Exec Console") and run:
     npm run db:migrate
   (This reads DATABASE_URL and creates all tables.)
2. Refresh /api/health - db should still be "up". Done.

## Troubleshooting
- /api/health shows db "down": DATABASE_URL is wrong or the DB container is not
  running. Re-copy the Internal Connection URL from Step 2.
- Build fails on "argon2": rare on Alpine; switch build method to Nixpacks, which
  uses a Debian base that compiles argon2 reliably.
- App won't start: check the container logs in Coolify for the error.

## After it runs
Next features to build (already specified): household/transaction screens,
categories/subcategories, budgets, recurring rules, reports. Tell Hermes to build
"the transaction-create endpoint" next.

## Step 7 - Open the app and sign up
1. Visit the app's public URL (Coolify gives you one after deploy).
2. Click "Create an account", set email + password, and submit.
   - If EMAIL_API_KEY is blank, the email-verify link is only logged in the
     container console - you can still use the app; verification is optional for now.
3. You should land on the home page showing "Signed in as <your email>".
4. That proves the full chain works: Coolify -> Next.js -> Postgres -> auth.
