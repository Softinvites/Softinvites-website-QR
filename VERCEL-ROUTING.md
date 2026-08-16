# Before you edit `vercel.json`

This project **no longer owns softinvite.com**. The brand website
(`softinvites-web`) does, and it proxies this app's paths back in via rewrites
in *its* `vercel.json`. This project is reached only through that proxy, on its
own `*.vercel.app` URL.

That is why this file is now just the SPA fallback:

```json
{ "source": "/(.*)", "destination": "/" }
```

Deep links like `/rsvp/form/abc` arrive here already proxied and need to reach
`index.html` so React Router can handle them. Do not remove it.

## Why the domain moved

Vercel gives **the filesystem precedence over rewrites** — from the docs:

> The `source` property should **NOT** be a file because precedence is given to
> the filesystem prior to rewrites being applied.

This project ships an `index.html`, so a `"source": "/"` rewrite here could
never fire: `softinvite.com/` always resolved to this app, no matter what the
rewrite said. Putting the domain on the brand site instead makes `/` its own
`index.html`, and the app routes below don't exist as files there, so their
rewrites work.

## Adding a route to this app

If you add a new page here, add a matching rewrite in
[`softinvites-web/vercel.json`](../softinvites-web/vercel.json), or it will not
be reachable on softinvite.com. The proxied paths are an explicit allowlist:

```
/sign-in  /sign_up  /home  /event  /guest  /rsvp-admin  /enquiries
/whatsapp-templates  /profile  /change-password
/rsvp/:path*  /r/:path*  /assets/:path*  /favicon.ico
```

`/assets/:path*` carries this app's built JS and CSS. The brand site emits its
own assets to `/site-assets/` precisely so the two never collide on one origin.

## Full context

- [`softinvites-web/SINGLE-DOMAIN-SETUP.md`](../softinvites-web/SINGLE-DOMAIN-SETUP.md) — the architecture
- [`softinvites-web/DEPLOYMENT.md`](../softinvites-web/DEPLOYMENT.md) — step-by-step deploy
