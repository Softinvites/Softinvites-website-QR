# Before you edit `vercel.json`

This project owns **softinvite.com** and always will. The marketing site
(`softinvites-web`) is a separate Vercel project with **no domain of its own** —
it is proxied in on the marketing paths listed in `rewrites`.

Guest-facing links (`/r/*`, `/rsvp/*`, `/guest`) are served **directly by this
app**, not proxied. That is deliberate: those URLs are sitting in thousands of
already-delivered WhatsApp, email and SMS invitations, and some are hardcoded
into Meta-approved Twilio Content templates. They must never move.

## Three rules

**1. The SPA catch-all stays last.**

```json
{ "source": "/(.*)", "destination": "/" }
```

Vercel takes the *first* matching rewrite. This one matches everything, so every
marketing path has to sit above it. Move it up and the whole brand site breaks.

**2. No comments. Vercel's schema rejects unknown keys.**

A `"//": "note"` property anywhere in this file fails the build with
`should NOT have additional property //`. JSON has no comment syntax and Vercel
validates strictly. Put explanations here instead.

**3. A new marketing page needs a new rewrite entry.**

Marketing routes are an explicit allowlist, not a wildcard — that way a new
marketing route can never accidentally shadow an app route. Add `/faq` to the
brand site and you must add it here too, or it 404s in production while working
fine locally.

## Static files beat rewrites

Vercel checks the filesystem before applying rewrites, so anything in this
project's `public/` (`favicon.ico`, `apple-touch-icon.png`, `assets/*`) is served
directly and needs no exclusion from the catch-all. That is also why the brand
site emits its assets to `/site-assets/` rather than Vite's default `/assets/` —
otherwise the two would collide on one origin.

## Full context

- [`softinvites-web/SINGLE-DOMAIN-SETUP.md`](../softinvites-web/SINGLE-DOMAIN-SETUP.md) — why it is built this way
- [`softinvites-web/DEPLOYMENT.md`](../softinvites-web/DEPLOYMENT.md) — step-by-step deploy across all three projects
