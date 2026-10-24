# AdventureTime

A mobile-first web app that helps Stony Brook students find shared free time with friends, get activity ideas
that fit everyone's time and budget, and make private plans friends RSVP to.

Built with React 19, TypeScript, Vite and React Router. Everything runs in the browser with sample data and
`localStorage`, so the full flow works without accounts, keys or a backend.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run lint
npm run build      # type-checks, then builds to dist/
npm run preview    # serve the production build
```

The app is a single-page app. When deploying, rewrite all paths to `index.html` (`vercel.json` does this for
Vercel) so links like `/plan/:id?invite=…` work on refresh.

## Demo walkthrough

1. **Welcome → Get started**. Enter any name and a `@stonybrook.edu` address, then **Continue as verified (demo)**.
2. **Add your schedule**. Upload any image to see simulated parsing, or enter it manually. Tap hours to fix them
   and add work, meeting or commute blocks.
3. **Pick interests**, then land on **Home**. Two friends are "free now", and two have set a status for an evening
   two days from today.
4. **I'm free → Later this week**. Pick the day two days out and **Evening**, then **Share status & find friends**.
   You should see 4 friends free 6–9 PM, with friends who set a status shown apart from those who are only free
   per their schedule.
5. Pick an activity (or write your own idea) and **Continue**. Edit the plan details, deselect friends if you
   like, and **Create plan**. Copy the invite link, then **View plan**.
6. On the plan page, **Simulate friends' replies** (demo) fills in RSVPs. On Home or Plans, RSVP to Priya's
   thrift run. Changes show up everywhere.
7. **Free time** shows the week grid. Tap a slot, then **Plan for this time**. The **Friends** tab has a pending
   request to accept.
8. **Me** covers energy (resets at midnight), interests, schedule editing, privacy, blocked users and sign-out.
   **Demo settings** can pin the clock (for example, to a weekday lunchtime) or reset all demo data.

## Project layout

```
src/
  types.ts                Domain types (schedule blocks, statuses, plans, people, activities)
  data/                   Typed sample data and the curated activity list
  lib/
    availability.ts       Deterministic overlap math (intervals, best shared slot, alternatives)
    schedule.ts           Weekly grid editing helpers
    dates.ts, labels.ts…  Formatting helpers
  services/               Replaceable integrations (see below)
  state/                  Reducer, context provider, selectors, hooks
  components/             Reusable UI (nav, avatar, choice groups, schedule editor, plan cards…)
  pages/                  Screens, plus pages/onboarding/
  assets/duck*.png        Mascot, extracted from the prototype PDF
```

Who is free is always computed by `lib/availability.ts`: a friend counts as free if their weekly schedule is open
or they set a status covering that time. AI is never used for availability. Dates are generated relative to
the current (or pinned demo) time, so the sample data works on any day.

## What's mocked (honest list)

| Area | Status in this build | Where to replace |
| --- | --- | --- |
| **Authentication** | Simulated. No email is sent; "Continue as verified (demo)" signs you in. The `@stonybrook.edu` check runs only in the browser. | `src/services/auth.ts` → e.g. Supabase magic links, with the domain check enforced server-side |
| **Schedule parsing** | Simulated. The uploaded image isn't read or uploaded; a fixed sample schedule is returned for review. Manual entry works fully. | `src/services/scheduleParser.ts` → a server-side route calling a vision model |
| **Activity suggestions** | A deterministic rule-based ranker over a curated list stands in for the AI service, labeled in the UI. | `src/services/recommendations.ts` → a server-side model call restricted to curated ids |
| **Activity data** | Hand-curated local spots. Costs are rough estimates, not live prices; no live hours or availability. Some venues are generic ("Bowling alley near campus"). | `src/data/activities.ts` |
| **Friends & statuses** | Sample people with sample schedules and statuses. Friend requests are saved locally and nobody is notified. | `src/services/friendsApi.ts` |
| **Invitations & reminders** | No email or push notifications are sent. Reminders are stored as preferences only. | `src/services/notifications.ts` |
| **Invite links** | Links work only in the browser that created the plan, because there's no shared database. | Backend persistence |
| **Friends' RSVPs** | Only change when you use "Simulate friends' replies". | Backend + realtime updates |
| **Reporting users** | Blocking works locally; reporting needs a moderation backend and says so. | — |
| **Persistence** | `localStorage` only (`src/services/storage.ts`). | Supabase / Firebase |

No API keys or secrets are in the frontend. Any future model calls should go through a server route.

## Not yet built

- Dark mode (the PRD wants it at launch; colors are already CSS custom properties in `src/index.css`)
- Personal routes, transit times, and open plans for strangers (PRD "Next"/"Later")
