# Task Tracker — Project Progress & Context

## What This Project Is
A real-time task tracker for a Sunway College student (Mason) that:
- Monitors college emails forwarded from Sunway Outlook → personal Gmail
- Auto-categorises tasks as: Urgent / Non-urgent / Rescheduled / Cancelled
- Displays them on a live Kanban board (PWA installable on iPhone 12)
- Sends real-time push notifications to the browser/phone

---

## Architecture (Fully Decided & Partially Built)

```
Sunway Outlook email
        │  (auto-forward rule set in Outlook)
        ▼
Personal Gmail
        │  (Make.com watches Gmail — free tier)
        ▼
Make.com scenario
        │  HTTP POST (headers: Title, Tags, Priority)
        ▼
ntfy.sh/{topic}       ← free relay, no API key, no signup
        │  Server-Sent Events (SSE)
        ▼
task-tracker PWA      ← hosted on Netlify, installable on iPhone
```

---

## Files Built (in /task-tracker folder)

| File | Purpose |
|---|---|
| `index.html` | Full PWA app — dark UI, 4 Kanban columns, SSE listener |
| `sw.js` | Service Worker — offline cache + background notifications |
| `manifest.json` | Makes app installable on iPhone/Android home screen |
| `icon.svg` | App icon |
| `setup-guide.html` | Step-by-step Make.com + ntfy.sh setup walkthrough |
| `bookmarklet.html` | One-click Outlook Web → task import tool |

**Branch:** `claude/task-tracker-outlook-teams-ruNp0`
**Repo:** `masonpmy/podium_wesbite`

---

## Current Status

### ✅ Done
- All app files built and pushed to GitHub branch
- Make.com account created (free plan, 1,000 ops/month)
- Gmail connected to Make.com as trigger
- HTTP module added (posting to ntfy.sh using header method)
- App is Live (green dot confirmed on iPhone)
- Tasks ARE arriving in real-time (confirmed working)

### 🔧 In Progress
- HTTP module body/headers being configured correctly
- Switched from JSON body → header-based method (Title, Tags, Priority headers)
- Fix: title was showing raw JSON → resolved by using ntfy.sh header API

### ⏳ Next Steps
1. **Add email domain filter in Make.com** — only process emails from Sunway College
   - Need Mason's Sunway email domain (e.g. `@sunway.edu.my`)
   - Add a Filter after Gmail trigger: `From` contains `@sunway.edu.my`
2. **Confirm Outlook → Gmail forwarding is working**
   - Need Mason's Sunway email address and personal Gmail address
3. **Test end-to-end** with a real Sunway College email
4. **Deploy to Netlify** (drag task-tracker/ folder to netlify.com/drop)
5. **Install on iPhone** (Safari → Share → Add to Home Screen)

---

## Make.com HTTP Module — Correct Configuration

```
URL:     https://ntfy.sh/{topic}
Method:  POST
Headers:
  Title:    {{1.subject}}
  Tags:     non-urgent
  Priority: 3
Body type:    Raw
Content type: text/plain
Body:         From: {{1.from}} | Source: outlook
```

**Topic name:** (Mason to confirm — set in Task Tracker app settings)

---

## Key Decisions Made

| Decision | Why |
|---|---|
| Make.com over Power Automate | Power Automate HTTP action is premium; Make.com HTTP is free |
| Gmail over direct Outlook | College IT admin blocks third-party OAuth on Outlook |
| ntfy.sh over webhooks | Free, no API key, real-time SSE, works in any browser |
| Netlify over local file | iPhone needs HTTPS URL to install as PWA |
| Header-based ntfy.sh API | More reliable than JSON body in Make.com |

---

## Known Issues & Fixes

| Issue | Fix Applied |
|---|---|
| Outlook OAuth blocked by college admin | Switch to Gmail via email forwarding |
| Tasks showing raw JSON as title | Switch from JSON body to ntfy.sh header API |
| SSE missed messages (app not open) | App must be open/connected when Make.com runs |

---

## How to Continue in a New Chat

Tell the new Claude session:
> "I'm continuing a project documented in PROGRESS.md in my repo
> masonpmy/podium_wesbite on branch claude/task-tracker-outlook-teams-ruNp0.
> Please read that file and continue from where we left off."

Or simply paste the contents of this file at the start of the new chat.

---

## Still Needed from Mason
- [ ] Sunway College email address (for forwarding setup + Make.com filter)
- [ ] Personal Gmail address (to confirm forwarding destination)
- [ ] Netlify URL once deployed (for bookmarklet setup)
- [ ] ntfy.sh topic name confirmation
