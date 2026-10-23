# Partner Dashboard and Publisher’s Desk

This static frontend is served at `/partners/dashboard/`. The existing partner tour at `/partners/` loads `./portal-entry.js?v=1` to add a **Partner dashboard** navigation link. The tour’s shared layout and scripts remain independent of the dashboard.

## Files

- `index.html`: sign-in page, workspace shell and edition preview dialog.
- `portal.css`: responsive dashboard and form styles.
- `portal.js`: Firebase sign-in, scoped API calls, forms, uploads and previews.
- `../portal-entry.js`: the small navigation entry point on the partner tour.

There is no build step for these files. Serve the `sites/yatstats` directory as the site root. Keep the existing relative links in the tour page and the root-relative dashboard URL.

## Same-origin API

The frontend calls `/api/partners/*` on the corporate site’s own origin. `sites/yatstats/vercel.json` rewrites those requests to the shared production backend:

```json
{
  "source": "/api/partners/:path*",
  "destination": "https://mike-crozite-template.vercel.app/api/partners/:path*"
}
```

Keep the request method, body and `Authorization` header intact. The static files contain no database credentials, storage keys or privileged backend secrets. Do not replace this rewrite with browser calls to a school-specific hostname.

`GET /api/partners/config` returns the public Firebase browser configuration and an `enabled` flag. Every other portal API request includes the signed-in user’s Firebase ID token as `Authorization: Bearer <token>`. The backend verifies that token and decides which brands, schools and operations the account may access. A UID sent in a membership form identifies the account receiving a grant; it never authenticates a request.

The dashboard is scoped by `sponsorId`. Publisher searches use the bounded `/sponsors?q=...` endpoint and reload `/dashboard?sponsorId=...` after a brand is selected. The browser does not download the entire sponsor network.

## Sign-in and access setup

1. Configure the shared backend’s public Firebase web settings and its Firebase token-verification project consistently. The config endpoint stays disabled when the browser project and verification project do not match.
2. Enable the existing email/password sign-in method for the intended Firebase project and maintain its allowed site domains. This page uses the Firebase JavaScript SDK, session persistence and existing accounts; it does not create accounts or infer access from an email address.
3. Connect the verified account UID to an active publisher or sponsor membership on the backend. The first publisher grant must be explicitly configured by an authorized administrator. Subsequent grants can be managed in **Account access** by an existing publisher.
4. If a valid sign-in receives a `403`, the page shows **Your verified account ID**, taken from the actual signed-in Firebase user. The account holder can copy that UID and provide it to the authorized publisher or administrator. **Check access again** reloads the dashboard after a grant is in place.

No client-side role toggle or bootstrap bypass grants publisher access. Signing out clears the previous account’s workspace and preview content. Late responses from a prior account or sponsor selection cannot replace the current workspace.

Editing an account assignment sends its server-issued `id` and `revision`, together with the new UID, role, sponsor and active state. The backend updates that exact assignment and rejects a stale revision. Creating an assignment omits the ID; it does not silently replace an existing grant.

## Editorial and sponsor behavior

- Sponsors can edit their assigned brand profiles and ad versions. Published ad edits create a replacement version while preserving the earlier published version. School placement and approval requirements are enforced by the backend.
- Scheduled offers need a start and end time; evergreen ads have no end date. Form times display in the browser’s stated local time zone and are sent as ISO timestamps.
- Publishers can manage school placements, account assignments, notices and shared publication settings. A specific notice issue date refers to the publication date in `America/Phoenix`.
- Empty ad school selection means all eligible placements for that sponsor. An all-school publisher notice requires choosing **All school editions** explicitly in the form.
- PNG, JPEG and WebP uploads are limited to 3 MB. New artwork is uploaded and versioned by the backend. New sponsor brands may be saved before their first logo upload. The backend keeps a brand without a real logo inactive; upload its logo and explicitly activate the completed brand profile.
- The optional masthead uses a shared graphic, with the existing text masthead as the fallback. A 1,440 × 360 px image is a useful starting size. The checkbox records whether the image includes the tagline.
- **Save & preview** saves an ad or notice draft, then opens HTML and plain-text previews. **Preview settings** previews unsaved publication settings. Preview HTML is displayed in a sandboxed iframe. Any illustrative statistics or other preview limits returned by the backend are shown with the preview.
- Saving, previewing and publishing portal content do not send a newsletter or change delivery approval or scheduling.

## Title sponsor cards

**Sponsor cards** manages versioned, two-sided gallery cards independently of Tribune advertisements. **Title card placements** is a publisher-only area that records the explicit title sponsorship entitlement for a school. Those assignments have their own dates and approval requirements; they do not create a newsletter placement or a payment.

The front editor preserves first and last name, graduation class, varsity years, status, current team and organization from the contribution form. `level` is readonly `SPONSOR` in the UI, is sent as that literal value, and is enforced by the backend. Sponsor presentation is separate from player records and fantasy statistics.

The three back templates are:

- `banner_text`: an optional sponsor banner followed by one headline/message in the FunZone. Personal card details remain on the front.
- `share_promotion`: editable prepared text from `dashboard.cardDefaults.sharePromotion`. A blank destination uses the selected school’s community hub. The frontend does not maintain a second copy of the default message.
- `full_image`: a single uploaded image replaces the banner and message area. Inactive banner/message fields are cleared from the saved content for this template.

Front, banner and full-back artwork use the sponsor-scoped `card_front`, `card_banner` and `card_full` upload kinds. Drafts can be saved while being prepared; the backend enforces publication requirements for images, descriptions, content and entitlements. Published and archived cards create a new version when edited. Existing-card mutations include `id` and `revision`.

### Shared-renderer card proof

`POST /api/partners/card-preview` accepts `{cardId, hsid}` and returns `{card, warnings, previewUrl}`. The corporate frontend does not reproduce the gallery card in HTML. It loads the returned HTTPS `/embed/sponsor-card/preview` page in the preview iframe, where the school gallery’s actual shared components render both faces. Card URLs contain no card data; the frontend keeps the card only in memory.

Only card mode uses `sandbox="allow-scripts allow-same-origin"`. The parent waits for `yatstats:sponsor-card-preview-ready`, checks both `event.source === iframe.contentWindow` and the exact returned URL origin, then posts `{type: 'yatstats:sponsor-card-preview', card}` to that specific origin. The child validates the fields again. The frame is cleared on close, Escape, sign-out and sponsor changes. Newsletter previews continue to use `srcdoc` with the strict empty sandbox.

The preview shows the actual 5:7 front and back side by side when room permits and stacked at narrow widths. It proves the saved version without publishing it. No checkout action is part of this flow.

## Orders and billing

Orders are read-only. The dashboard shows a billing link only when the backend returns a configured `billingUrl`. Otherwise it directs the sponsor to their publisher for billing help. This frontend does not create checkout products, prices, subscriptions or payment flows.

## Verification approach

Use a temporary local HTTP server with `sites/yatstats` as its root. Mock Firebase SDK modules and `/api/partners/*` responses when exercising authenticated UI flows; never use a real account or send password-reset mail from an automated UI test.

The initial browser verification covered:

- Desktop and 390 px mobile layouts without page-wide horizontal overflow.
- Existing-account sign-in errors, publisher and sponsor views, and the verified UID handoff after a `403`.
- Bounded sponsor search and dashboard reload for the chosen brand.
- Published ad version replacement, draft save, submission and HTML/plain-text previews.
- Masthead and sponsor logo uploads, blank-logo brand creation, and publication preview without saving settings.
- A dated, school-specific publisher notice; placement dates converted from local time to UTC; and account membership forms.
- Read-only orders/billing, bearer tokens on authenticated requests, sandboxed preview HTML, and clearing previous account content at sign-out.

The sponsor-card extension adds targeted checks for the three templates, API-provided prepared copy, scoped artwork uploads, version forks, fixed SPONSOR payloads, title entitlement forms, the iframe window/origin handshake, preview cleanup, restoration of the newsletter’s strict sandbox, and exact membership ID/revision updates. An isolated renderer fixture tests rejected source/origin messages. A separate local integration check forwards an HTTPS test origin to the actual Next development renderer and verifies all three front/back proofs, loaded artwork, the real handshake, newsletter sandbox restoration, and 390 px layout without horizontal overflow or nested frame clipping. Authentication and API writes remain mocked in both checks.

For a publishing-branch check, verify that the current `/partners/` tour still renders, its dashboard link works in both the desktop navigation and mobile menu, and `/partners/dashboard/` loads the sign-in view through the same-origin config endpoint. No repeat of every authenticated flow is needed when only transferring the verified static files.

When editing form handlers, use `form.getAttribute('id')` for the DOM form identifier: record controls named `id` shadow the `HTMLFormElement.id` property in browsers.
