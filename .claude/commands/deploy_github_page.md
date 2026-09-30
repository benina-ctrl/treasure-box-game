---
description: Push the source code to GitHub and publish the game on GitHub Pages, then report the public URL
argument-hint: "[repo-name]  (default: treasure-box-game)"
allowed-tools: Bash(git:*), Bash(gh:*), Bash(npm run build:*), Bash(npx gh-pages:*), Bash(touch build/.nojekyll), Bash(ls:*), Bash(curl:*)
---

Push this project's source code to GitHub, publish the game on GitHub Pages, and give me the public URL.

Arguments: `$ARGUMENTS` — the GitHub repo name to create if the project has no `origin` remote yet. If empty, use `treasure-box-game`.

## Steps

1. **Check the GitHub CLI.** Run `gh auth status`.
   - If `gh` is not installed, stop and tell me to run `! brew install gh`, then `! gh auth login`, then re-run `/deploy_github_page`.
   - If it's installed but not logged in, stop and tell me to run `! gh auth login` myself (it's interactive).

2. **Make sure this is a git repo with everything committed.**
   - If it isn't a git repo yet, run `git init -b main`.
   - Run `git status --short` and check what would be committed. `node_modules/`, `build/`, `.env*`, `.vercel/` and `server/data/*.db*` must stay ignored — if any of them (or anything that looks like a secret) shows up, stop and tell me instead of committing it.
   - If there are changes, `git add -A` and commit them with a short message describing them (`Initial commit` for the first one).

3. **Push the source to GitHub.**
   - If there is no `origin` remote: `gh repo create <repo-name> --public --source=. --remote=origin --push`. The repo must be public — GitHub Pages isn't available for private repos on the free plan.
   - If `origin` already exists: `git push -u origin HEAD`. Never force-push.
   - Then get the real owner and repo name with `gh repo view --json owner,name,url` and use those for the remaining steps.

4. **Build for Pages.** The site is served from `https://<owner>.github.io/<repo>/`, so the asset base path has to be the repo name:
   - `npm run build -- --base=/<repo>/` (output goes to `build/`, not `dist/`)
   - If the build fails, show me the error and stop — don't publish.
   - Confirm `build/index.html` exists, then `touch build/.nojekyll`.

5. **Publish `build/` to the `gh-pages` branch:**
   `npx gh-pages -d build --dotfiles -m "Deploy to GitHub Pages"`

6. **Make sure Pages is enabled and serving from `gh-pages`.**
   - Check with `gh api repos/<owner>/<repo>/pages`.
   - If that returns 404, enable it: `gh api -X POST repos/<owner>/<repo>/pages -f "source[branch]=gh-pages" -f "source[path]=/"`

7. **Wait for the site to go live.** Poll `curl -s -o /dev/null -w "%{http_code}" https://<owner>.github.io/<repo>/` every ~15 seconds until it returns `200`, for up to about 3 minutes. The first publish usually takes a minute or two.

8. **Report the result.** Reply with:
   - The live game URL (`https://<owner>.github.io/<repo>/`) as a clickable link, clearly labeled
   - The GitHub repo URL
   - Whether the live URL was already returning 200, or is still building
   - If anything failed, the exact error and a suggested fix

## Known limitation

GitHub Pages only hosts static files. The Express + SQLite API in `server/` is pushed with the source but is **not** running on the live site, so `/api` calls fail there — signing in with a name, saved scores and the leaderboard won't work; playing as a guest does. Mention this briefly in the final report.
