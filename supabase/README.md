# Friends backend (Supabase)

Friends are off until `src/config.js` has a Supabase URL and anon key. Setup takes about 5 minutes on the free tier.

1. **Create a project** at https://supabase.com/dashboard (free plan is fine). Pick any name and a strong database password.
2. **Turn on anonymous sign-ins:** Authentication → Sign In / Providers → enable **Allow anonymous sign-ins** → Save. Each device signs in anonymously, so nobody needs an email address.
3. **Create the tables and functions:** SQL Editor → New query → paste all of `supabase/schema.sql` → Run.
4. **Copy the keys:** Project Settings → API (or Data API) → copy the **Project URL** and the **anon public** key into `src/config.js`, then push to `main`.

The anon key is designed to be public. Every table has row-level security with no direct access; the app can only call the functions in `schema.sql`, and each one checks that the caller owns the profile it acts on.

## What is shared

For each kid who has friends turned on: the display name from Parent view → Edit players, avatar colour, main track, streak, XP this week and total XP, plus a random friend code. Stats are only visible to accepted friends. Nothing else leaves the device; lessons, answers and SmartScores stay local.

## Safety rules built in

- Friends only work after a parent sets a parent PIN.
- Sending a request needs the parent PIN on the sender's device.
- Requests are approved or declined in the receiving family's Parent view (behind its PIN).
- No messages or free text between kids. Either side can remove a friend at any time.
- At most 20 pending requests per kid and 12 profiles per device.

## Testing locally

`supabase/test/` has a Supabase stand-in for plain Postgres (`supabase-shim.sql`), SQL tests for the security rules (`friends-test.sql`), and a mock auth/RPC server (`mock-supabase.js`) used by `test/friends-e2e.js`.
