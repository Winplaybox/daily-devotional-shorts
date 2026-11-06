# Make.com Social Publishing — Pavitra Panchang 365

This workflow is isolated from YouTube publishing. It runs only after a successful
Daily Shorts Publisher run on `main`, and only when
`MAKE_SOCIAL_AUTO_PUBLISH=true`. Manual runs require `publish=true`.

## Architecture

1. Daily Shorts Publisher renders and uploads its normal artifact.
2. This workflow downloads the 40-second MP4 and `daily_props.json`.
3. It uploads the MP4 to a public Supabase Storage bucket.
4. It sends a JSON payload to a Make.com Custom Webhook.
5. Make publishes to Instagram Reels and Facebook Reels. Pinterest is an optional
   route only if the connected Pinterest app/module in the user's Make plan supports
   creating a video Pin; otherwise the scenario should skip that route and report it.

The GitHub workflow reports webhook acceptance, not final social post completion.
Verify each platform's module result in Make scenario history.

## Create the Make scenario

In Make.com, create a scenario with these modules:

1. **Webhooks → Custom webhook**
   - Name: `Pavitra Panchang 365 — Social Publisher`
   - Enable API Key authentication and create a new key.
   - Copy the generated webhook URL. Store it directly in GitHub Actions Secrets.
   - Use the webhook's data structure generator with the sample JSON below.
2. Add an **Instagram for Business (Facebook login) → Create a reel post** module.
   - Select the connected Instagram Business account/Page.
   - Map `video_url` to the public video URL field.
   - Map `caption` to caption.
3. Add **Facebook Pages → Publish a Reel**.
   - Map `video_url` and `caption` to the module's video and description fields.
   - Recommended output resolution is 1080×1920.
4. Add a Router / separate Pinterest route only after confirming your Pinterest app exposes
   a video Pin creation action. Map the video URL, title, description and target board.
5. Add error handlers and notifications for each platform route. Do not treat the webhook's
   initial `Accepted` response as proof that a post was published.
6. Turn the scenario ON. Keep its processing mode ordered if you want to prevent overlapping
   duplicate posts.

The Instagram video must be hosted at a publicly accessible URL. Supabase Storage must
therefore use a public bucket for this object. Do not make the bucket private or expose
the Supabase service-role key in Make.

## Sample webhook payload

```json
{
  "event_id": "panchang-123456789-1",
  "source": "github-actions",
  "project": "Pavitra Panchang 365",
  "source_run_id": "123456789",
  "source_run_number": 42,
  "panchang_date": "2026-11-07",
  "edition": "40s",
  "video_url": "https://YOUR_PROJECT.supabase.co/storage/v1/object/public/social-publishing/panchang/example/pavitra-panchang-40s.mp4",
  "video_filename": "pavitra-panchang-40s.mp4",
  "mime_type": "video/mp4",
  "title": "Aaj Ka Panchang",
  "caption": "Today's Panchang...",
  "description": "Full description",
  "hashtags": ["Panchang", "HinduCalendar"],
  "platforms": ["instagram_reels", "facebook_reels", "pinterest_video_pin"],
  "publish_mode": "publish_now"
}
```

## GitHub Actions configuration

Secrets:

- `MAKE_SOCIAL_WEBHOOK_URL` — Make Custom Webhook URL
- `MAKE_SOCIAL_WEBHOOK_API_KEY` — optional Make webhook API key (recommended)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Variables:

- `MAKE_SOCIAL_AUTO_PUBLISH` — keep `false` until a manual test succeeds; then set `true`
- `MAKE_SOCIAL_PUBLISH_MODE` — `publish_now` (default)
- `MAKE_SOCIAL_CAPTION` — optional shared social caption
- `SUPABASE_SOCIAL_BUCKET` — public bucket name, default `social-publishing`

Do not put the Make API personal access token in the repository or webhook payload.
This integration uses a dedicated webhook URL and webhook API key; it does not need the
Make API token.

## Duplicate protection

Use `event_id` as an idempotency key in the Make scenario. Before publishing, check a
Make Data Store (or another durable store) for the event ID. If it has already been
processed, skip the duplicate. Store platform-specific success IDs after each successful
publish.

## Important

A Make webhook returns acceptance before all downstream modules necessarily finish.
A successful GitHub run means the webhook accepted the event and media upload succeeded;
check Make execution history for Instagram, Facebook and Pinterest final outcomes.
