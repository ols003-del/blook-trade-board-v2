# Blook Trade Board

Static Blook trade marketplace with Discord OAuth through Supabase. The site does not ask users to enter email addresses or Discord passwords. Discord handles authentication; Supabase stores listings and private messages.

## Supabase setup

1. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor.
2. Add the Supabase Project URL and publishable/anon key to `config.js`. These are browser-safe public values. Never expose a Supabase secret/service-role key.
3. In Supabase, go to **Authentication → Providers** and enable **Discord**. Copy the callback URL shown by Supabase (usually `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`).
4. Create a Discord application in the Discord Developer Portal. Under **OAuth2**, add the Supabase callback URL as a redirect URI. Create/copy the Discord Client ID and Client Secret.
5. In Supabase's Discord provider settings, paste the Discord Client ID and Client Secret and save. Keep the client secret in Supabase only; never put it in this repository.
6. In Supabase **Authentication → URL Configuration**, set the Site URL to `https://ols003-del.github.io/blook-trade-board-v2/` and add that exact URL under allowed redirect URLs. Also add your localhost URL if testing locally.
7. In GitHub, enable Pages from `main` and the repository root. Once deployed, reload the Pages site and use **Continue with Discord**.

Discord OAuth lets people use their Discord account without entering an email or password into this site. Discord may provide account profile fields to Supabase depending on requested scopes; the app displays a public Discord name and never displays an email. Existing accounts created using the old synthetic-username login cannot be converted automatically; they may need to create a Discord-auth account.

## Listings and images

Sign in with Discord, then create a listing. Put one item on each line using `Blook name | quantity | image URL`. For example:

```text
Clark | 2 | https://your-host/content/blooks/Clark.png
Mary Kline | 1 | https://your-host/content/blooks/Mary%20Kline.png
```

The image URL may be omitted. Images must be hosted at URLs available to the browser; paths from Blacket are not automatically hosted by this project.

## Local testing

Serve the directory over HTTP (ES modules do not work reliably from `file://`): `python -m http.server 8000`, then open `http://localhost:8000`.
