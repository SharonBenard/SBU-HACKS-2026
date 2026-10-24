# AdventureTime

A mobile-first web app that helps Stony Brook students find shared free time with friends, get activity ideas
that fit everyone's time and budget, and make private plans friends RSVP to.

Built with React 19, TypeScript, Vite, React Router and Supabase. Email-link authentication and each signed-in
user's profile, schedule, status and plan state are stored in Supabase. Friend directories and friends' schedules
and statuses, activity suggestions and venue data remain sample/demo data.

## Supabase setup

1. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the
   Supabase project settings. These are browser-visible project values; never put a service-role key in a `VITE_`
   variable.
2. Apply `supabase/migrations/001_init.sql`, `002_user_app_state.sql`, then
   `003_enforce_sbu_email_updates.sql` in the Supabase SQL Editor. Migration 002 adds the required relational
   `plans` and `plan_invitees` tables by safely renaming the initial `events` tables, and tightens their RLS.
   It also retains `user_app_state` for the current app persistence adapter.
3. In Supabase Auth URL Configuration, set the local site URL to `http://localhost:5173` and add
   `http://localhost:5173/auth/callback` to the allowed redirect URLs. Add the equivalent callback URL for each
   deployed origin.
4. In Supabase Dashboard > Authentication > Hooks, enable the `public.enforce_sbu_access_token` function as the
   Custom Access Token Hook. The database trigger rejects non-SBU signups and email changes; the hook also blocks
   existing non-SBU accounts from receiving a signed-in session.
5. Generate the authoritative TypeScript definitions after applying migrations:
   ```bash
   npx supabase gen types typescript --project-id <project-ref> --schema public > src/types/database.types.ts
   ```
   Commit the generated file together with the migrations so the team has one shared schema contract.
6. Run the app and sign up with an `@stonybrook.edu` address. Supabase sends a one-time link; opening it returns
   to `/auth/callback`.

If a local environment file already exists, ensure it is named `.env.local` and uses the `VITE_` variable names.
Vite does not load a file named `.env local` or variables named `NEXT_PUBLIC_*`.

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

1. **Welcome → Get started**. Enter your name and `@stonybrook.edu` address, then open the magic link Supabase
   emails you.
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
   thrift run. Changes are saved to your account.
7. **Free time** shows the week grid. Tap a slot, then **Plan for this time**. The **Friends** tab has a pending
   request to accept.
8. **Me** covers energy (resets at midnight), interests, schedule editing, privacy, blocked users and sign-out.
   **Demo settings** can pin the clock (for example, to a weekday lunchtime).

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
| **Authentication** | Supabase Auth sends PKCE email links. The `@stonybrook.edu` domain is checked in the UI and by the auth-user database triggers. | `src/services/auth.ts`, `src/pages/AuthCallback.tsx`, `supabase/migrations/001_init.sql`, `supabase/migrations/003_enforce_sbu_email_updates.sql` |
| **Schedule parsing** | Simulated. The uploaded image isn't read or uploaded; a fixed sample schedule is returned for review. Manual entry works fully. | `src/services/scheduleParser.ts` → a server-side route calling a vision model |
| **Activity suggestions** | A deterministic rule-based ranker over a curated list stands in for the AI service, labeled in the UI. | `src/services/recommendations.ts` → a server-side model call restricted to curated ids |
| **Activity data** | Hand-curated local spots. Costs are rough estimates, not live prices; no live hours or availability. Some venues are generic ("Bowling alley near campus"). | `src/data/activities.ts` |
| **Friends & statuses** | Sample people, schedules and statuses remain in the current app adapter; the relational `friendships`, `busy_blocks`, and `statuses` schema and RLS are ready for integration. | `src/services/friendsApi.ts`, `supabase/migrations/001_init.sql`, `supabase/migrations/002_user_app_state.sql` |
| **Invitations & reminders** | No email or push notifications are sent. Reminders are stored as preferences only. | `src/services/notifications.ts` |
| **Invite links** | Plans are persisted in the app's account state; relational `plans` and `plan_invitees` access rules are defined but app-level plan CRUD is not connected to them yet. | `supabase/migrations/002_user_app_state.sql` |
| **Friends' RSVPs** | Only change when you use "Simulate friends' replies". | Backend + realtime updates |
| **Reporting users** | Blocking is saved to the signed-in account; reporting needs a moderation backend and says so. | — |
| **Persistence** | Current app state is saved per authenticated user in `user_app_state` in Supabase, protected by row-level security. The relational tables are schema-ready but are not yet the app's persistence adapter. Existing browser-only demo data is not imported automatically. | `src/services/accountData.ts`, `supabase/migrations/002_user_app_state.sql` |

The Supabase anon/publishable key is necessarily visible in the browser; row-level security protects user data.
Never expose the Supabase service-role key or model API keys in frontend variables. Any future model calls should
go through a server route.

## Not yet built

- Dark mode (the PRD wants it at launch; colors are already CSS custom properties in `src/index.css`)
- Personal routes, transit times, and open plans for strangers (PRD "Next"/"Later")
