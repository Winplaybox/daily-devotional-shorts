# Isolated Instagram + Facebook publishing

This is a separate publishing lane. It does not modify or invoke src/pipeline.js, YouTube OAuth files, YouTube secrets, or the YouTube publisher workflow.

## Flow
1. Daily Shorts Publisher completes and uploads its existing render artifact.
2. When META_AUTO_PUBLISH=true, this workflow downloads only pavitra-panchang-40s.mp4.
3. The video is uploaded to Supabase Storage.
4. The same hosted MP4 is published as an Instagram Reel and a Facebook Page Reel.

Manual dispatch is also supported: provide both the run ID and run number of a successful Daily Shorts Publisher run, then set publish=true. The run number identifies the artifact name; the run ID identifies the source workflow execution.

## Meta prerequisites
A Meta Developer App has not yet been created. Create/configure a Business app in Meta for Developers and configure the Instagram and Facebook Page products/use cases.

- Instagram must be a Professional (Business or Creator) account connected to the intended Facebook Page.
- Obtain the connected Instagram professional account ID and Facebook Page ID.
- Generate a Page access token with the permissions required by the app's current login setup. For the Facebook Login flow, commonly required permissions include pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic and instagram_content_publish. Confirm current requirements in the Meta app dashboard.
- Use a token suitable for unattended publishing and maintain a renewal/rotation process. Never commit tokens.
- Complete any required app review, business verification, or Page Publishing Authorization.

Current documentation:
- https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing/
- https://developers.facebook.com/docs/video-api/guides/reels-publishing/

## Supabase
Create a Storage bucket named meta-publishing and make it PUBLIC. Meta fetches the video from its own servers, so the URL must be reachable without authorization headers. The service-role key is used only by the GitHub Actions runner.

Public bucket URLs are readable by anyone who has the URL. Use this bucket only for media intended for public social publishing. Files are retained under pavitra-panchang/<run-id>/ for audit/retry; review storage usage periodically.

## GitHub Actions secrets
- META_PAGE_ACCESS_TOKEN — Page access token
- META_PAGE_ID — Facebook Page ID
- META_IG_USER_ID — connected Instagram professional account ID
- SUPABASE_URL — Supabase project URL
- SUPABASE_SERVICE_ROLE_KEY — server-side Storage upload credential

## GitHub Actions variables
- META_AUTO_PUBLISH — keep false until a manual test succeeds; set true to auto-publish after successful daily renders
- META_GRAPH_API_VERSION — current supported version (default v25.0)
- SUPABASE_META_BUCKET — default meta-publishing
- META_CAPTION — optional shared caption

The existing AUTO_PUBLISH, CLIENT_SECRET_JSON, TOKEN_JSON, and YouTube OAuth setup are not read by this workflow.

## Activation
1. Configure the Meta app, linked accounts, Page token, and public Supabase bucket.
2. Add the five secrets. Keep META_AUTO_PUBLISH=false.
3. Run Meta Social Publisher manually with a successful source run ID and publish=true.
4. Verify both posts on the intended accounts.
5. Only then set META_AUTO_PUBLISH=true.

Each platform is attempted independently. If one succeeds and the other fails, inspect both results before retrying: a retry can duplicate the successful post. The workflow reports each platform's outcome separately.

## Isolation guarantee
This change adds only:
- .github/workflows/meta-social-publisher.yml
- scripts/publish_meta.js
- docs/meta-social-publishing.md

No YouTube workflow, source pipeline, package manifest, lockfile, or YouTube credential is changed.
