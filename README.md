# Blook Trade Board

A small static marketplace UI with Supabase Auth, Postgres listings, and private messages. The frontend is designed for GitHub Pages; Supabase hosts the backend data.

## Supabase setup

1. Create a Supabase project.
2. In the Supabase dashboard, open **SQL Editor**, paste and run [`supabase/schema.sql`](supabase/schema.sql).
3. Open **Project Settings → API** and copy the Project URL and the **publishable key** (older projects may call it the `anon` key).
4. Add those values to `config.js`:

   ```js
   window.SUPABASE_URL = "https://your-project.supabase.co";
   window.SUPABASE_ANON_KEY = "your-publishable-or-anon-key";
   ```

   These browser values are public. Never put a `service_role` or secret key in frontend code or GitHub.

5. In **Authentication → URL Configuration**, set the Site URL to your GitHub Pages URL, for example `https://YOUR-USERNAME.github.io/blook-trade-board-v2/`, and add it to the allowed redirect URLs.

## Run and publish

- For local testing, use a local static server rather than opening `index.html` directly (ES modules require HTTP). For example: `python -m http.server 8000`, then open `http://localhost:8000`.
- To publish, open repository **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`. The page will be served from GitHub Pages.

## Listings and images

Sign up/sign in, then create a listing. Put one item on each line using:

```text
Blook name | quantity | image URL
Clark | 2 | https://your-host/content/blooks/Clark.png
Mary Kline | 1 | https://your-host/content/blooks/Mary%20Kline.png
```

The image URL may be omitted; the listing will show a placeholder. The Blook HTML paths you shared (such as `/content/blooks/Clark.png`) are relative to the original site, not this GitHub Pages site. To show them here, host/copy image files somewhere you control and use their full HTTPS URL. This project does not scrape Blacket or access anyone's account.

## Security notes

- Row-level security is enabled for both tables in the SQL setup. Listings are public; messages can only be read by their sender and recipient.
- Users must be signed in to post or message. Supabase Auth email confirmation may be enabled in the project settings.
- Do not use the Supabase service-role key in the browser. Review RLS policies before launching publicly, and consider adding moderation/reporting and rate limits.
- The inbox in this starter shows individual messages; it is not a realtime chat yet. Realtime can be enabled for the messages table later.
