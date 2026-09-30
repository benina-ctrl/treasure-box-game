---
description: Build the project and deploy it to Vercel, then report the live URL
argument-hint: "[preview]  (default: production)"
allowed-tools: Bash(npm run build), Bash(npx vercel:*), Bash(ls:*), Bash(cat:*)
---

Deploy this project to Vercel and give me the public URL.

Arguments: `$ARGUMENTS` — if it contains `preview`, do a preview deploy; otherwise deploy to production.

## Steps

1. **Check Vercel login.** Run `npx vercel whoami`.
   - If it fails because I'm not logged in, stop and tell me to run `! npx vercel login` myself (it's interactive), then re-run `/deploy_vercel`.

2. **Build locally.** Run `npm run build`. The output goes to `build/` (not `dist/`).
   - If the build fails, show me the error and stop — don't deploy.
   - Confirm `build/index.html` exists.

3. **Deploy the prebuilt static files** from `build/`:
   - Production: `npx vercel deploy build --prod --yes`
   - Preview: `npx vercel deploy build --yes`

   Deploying the `build/` folder directly avoids Vercel guessing the framework and looking for `dist/`. On the first run `--yes` accepts the default project name/scope and links it; later runs reuse that link.

4. **Report the result.** From the deploy output, find the deployment URL (and the production alias `https://<project>.vercel.app` if it's a production deploy). Reply with:
   - The URL(s) as clickable links, clearly labeled
   - Whether it was production or preview
   - If anything failed, the exact error and a suggested fix

## Known limitation

Only the frontend is deployed. The Express + SQLite API in `server/` is **not** hosted on Vercel (Vercel's serverless functions can't keep a writable SQLite file), so on the live site `/api` calls will fail — player names and scores won't be saved there. Mention this briefly in the final report.
