# CampusConnect — Notes Marketplace + Peer Tutoring
## Implementation Plan

---

## Ground Rules (read before touching any file)

- Treat ALL existing files as read-only unless explicitly stated otherwise.
- Reuse existing: User model, auth middleware, Cloudinary config, Nodemailer config, error handler.
- Match existing naming conventions (camelCase, existing folder structure, existing response shapes).
- No new npm packages without explicit approval.
- Every new backend route must be protected by the existing JWT middleware.
- Every new frontend page must have an auth guard (redirect to /login if no token).
- Before writing any code, list all existing models, routes, pages, and Zustand stores you found.

---

## Tech Stack (do not deviate)

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React + Next.js (App Router)        |
| Routing    | React Router v6                     |
| Styling    | Bootstrap                           |
| State      | Zustand                             |
| Backend    | Node.js + Express                   |
| Database   | MongoDB + Mongoose                  |
| Auth       | JWT + bcrypt (existing)             |
| Images     | Cloudinary (existing config)        |
| Email      | Nodemailer + Gmail (existing config)|
| Deployment | Vercel + Render + Atlas             |

---

## Phase 1 — Foundation (Models + Basic CRUD)

### Goal
Schemas exist, files upload, basic listings work, all routes auth-protected.

### Backend

**Schemas to create** (all reference existing `User._id`):

- `Note` — title, description, course, subject, tags[], fileUrl (Cloudinary),
  previewImageUrl, uploadedBy (ref User), downloadCount (default 0),
  averageRating (default 0), status (enum: active | flagged | removed),
  createdAt, updatedAt

- `TutorProfile` — user (ref User, unique), bio, courses[], hourlyRate,
  isFree (bool), availabilitySlots ([{ day, startTime, endTime }]),
  averageRating (default 0), totalSessions (default 0), isActive (bool),
  createdAt, updatedAt

- `Booking` — student (ref User), tutor (ref User), tutorProfile (ref TutorProfile),
  course, scheduledAt (Date), durationMinutes, status
  (enum: pending | confirmed | cancelled | completed),
  studentMessage, tutorNote, createdAt, updatedAt

- `Review` — reviewer (ref User), targetType (enum: note | tutor),
  targetId (ref Note or TutorProfile), rating (1–5), comment,
  createdAt

**Routes + Controllers:**
POST   /api/notes                    → upload note metadata (auth)
GET    /api/notes                    → list all active notes (public)
GET    /api/notes/:id                → single note detail (public)
DELETE /api/notes/:id                → delete own note (auth + owner check)
POST   /api/upload/notes             → upload file to Cloudinary (auth), returns { fileUrl, previewImageUrl }
POST   /api/tutors                   → create tutor profile (auth, one per user)
PATCH  /api/tutors/:id               → update own tutor profile (auth + owner check)
GET    /api/tutors                   → list all active tutors (public)
GET    /api/tutors/:id               → single tutor profile (public)

**Validators** (add to each route):
- Note: title required, course required, fileUrl required, tags must be array
- TutorProfile: bio required, at least one course, hourlyRate required if isFree is false
- Booking: scheduledAt must be future date, durationMinutes must be positive integer
- Review: rating must be integer 1–5, comment max 500 chars

### Frontend

**New pages:**
- `/notes` — browse + search notes listing (public)
- `/notes/upload` — upload form: title, description, course, tags, file picker (auth)
- `/notes/[id]` — note detail: preview, metadata, download button (auth gate on download)
- `/tutors` — browse tutors listing with filter sidebar (public)
- `/tutors/become` — become a tutor form: bio, courses, rate, availability slots (auth)
- `/tutors/[id]` — tutor profile page (public)

**Zustand — add to existing store or create `notesStore` + `tutoringStore`:**
- `notesStore`: notes[], currentNote, uploadStatus, filters
- `tutoringStore`: tutors[], currentTutor, myTutorProfile

### Testing Criteria — Phase 1
- [ ] All new routes return `401` if no JWT token is present
- [ ] Note upload saves correct Cloudinary URL to MongoDB `fileUrl` field
- [ ] Uploaded note appears in `GET /api/notes` response
- [ ] Tutor profile is unique per user (duplicate returns `409`)
- [ ] Tutor profile appears in `GET /api/tutors` listing
- [ ] Validation errors return `400` with a descriptive message
- [ ] Owner-only routes (`DELETE /notes/:id`, `PATCH /tutors/:id`) return `403` for non-owners
- [ ] `/notes/upload` and `/tutors/become` redirect to `/login` if not authenticated

---

## Phase 2 — Core Interactions

### Goal
Downloads tracked, bookmarks work, bookings flow end-to-end, emails send, reviews enforced.

### Backend

**New routes + controllers:**
POST   /api/notes/:id/download       → log download, increment downloadCount (auth)
POST   /api/notes/:id/bookmark       → add to user's saved notes (auth)
DELETE /api/notes/:id/bookmark       → remove bookmark (auth)
GET    /api/notes/bookmarks          → list current user's bookmarks (auth)
POST   /api/notes/:id/review         → submit review (auth, must have downloaded)
POST   /api/bookings                 → create booking request (auth, student only)
POST   /api/bookings/:id/accept      → tutor accepts booking (auth, tutor only)
POST   /api/bookings/:id/reject      → tutor rejects booking (auth, tutor only)
POST   /api/bookings/:id/cancel      → student cancels booking (auth, student only)
POST   /api/bookings/:id/complete    → mark session completed (auth, tutor only)
POST   /api/bookings/:id/review      → submit review after completed session (auth, student only)
GET    /api/bookings/mine            → list current user's bookings as student (auth)
GET    /api/bookings/tutor           → list incoming bookings as tutor (auth)

**Business logic rules:**
- Download review gate: check `DownloadLog` (or embedded array on User) before allowing `POST /notes/:id/review`
- Booking review gate: booking status must be `completed` before allowing review
- Booking status machine: `pending` → `confirmed` or `cancelled`; `confirmed` → `completed` or `cancelled`; no other transitions allowed
- Email triggers (use existing Nodemailer): booking created → tutor; booking confirmed → student; booking rejected → student; booking cancelled → other party

### Frontend

**New pages + components:**
- `/notes/saved` — bookmarked notes list (auth)
- `/tutors/[id]/book` — slot picker → confirm booking form (auth)
- `/dashboard/tutor` — incoming booking requests with accept/reject buttons (auth)
- `/dashboard/student` — my bookings with status badges (auth)
- `<DownloadButton>` — checks auth, calls download endpoint, then triggers file fetch
- `<BookmarkButton>` — toggle save/unsave, optimistic UI update
- `<StarRating>` — reusable 1–5 star input component
- `<ReviewForm>` — appears after download (notes) or after session completed (tutoring)
- `<BookingStatusBadge>` — color-coded Bootstrap badge per status

### Testing Criteria — Phase 2
- [ ] `downloadCount` increments by 1 in DB on each unique download call
- [ ] Bookmark add/remove persists correctly; `GET /bookmarks` returns accurate list
- [ ] Booking status transitions follow the state machine (invalid transitions return `400`)
- [ ] Tutor receives email when student creates a booking
- [ ] Student receives email when tutor accepts or rejects
- [ ] `POST /notes/:id/review` returns `403` if user has not downloaded the note
- [ ] `POST /bookings/:id/review` returns `403` if booking status is not `completed`
- [ ] Non-tutor cannot call accept/reject/complete endpoints (returns `403`)

---

## Phase 3 — Search, Reporting + Dashboards

### Goal
Search works fast, stats are accurate, uploaders and tutors have dashboards.

### Backend

**New routes + controllers:**
GET    /api/notes/search             → full-text search with filters + pagination (public)
GET    /api/notes/mine               → current user's uploaded notes (auth)
GET    /api/notes/mine/stats         → per-note download count + avg rating (auth)
POST   /api/notes/:id/report         → flag a note for review (auth)
GET    /api/tutors/:id/earnings      → session count + earnings summary (auth, own profile only)
GET    /api/tutors/mine              → current user's tutor profile (auth)

**Search implementation:**
- Add MongoDB text index on `Note`: `{ title: "text", description: "text", tags: "text" }`
- Query params: `q` (search term), `course`, `tags` (comma-separated), `sort` (newest | popular | rating), `page`, `limit`
- Response shape: `{ data: Note[], total, page, totalPages }`
- Same pagination shape used for `GET /api/tutors` and `GET /api/bookings/mine`

**Stats aggregation:**
- Notes stats: `aggregate` on `Note` filtered by `uploadedBy`, return `downloadCount` and `averageRating` per note
- Tutor earnings: `aggregate` on `Booking` filtered by `tutor` + status `completed`, group by month

### Frontend

**New pages + components:**
- `/dashboard/uploader` — my notes list with download count + avg rating per note (auth)
- `/dashboard/tutor/earnings` — session history table + total earnings (auth)
- Upgrade `/notes` listing: debounced search input (300ms), tag filter chips, sort dropdown, `<Pagination>` component
- `<Pagination>` — reusable, accepts `{ page, totalPages, onPageChange }`, used on notes + tutors listings
- `<ReportModal>` — Bootstrap modal, reason dropdown + optional comment, calls report endpoint

### Testing Criteria — Phase 3
- [ ] Text search returns correct results and excludes flagged/removed notes
- [ ] `course` and `tags` filters narrow results correctly
- [ ] Pagination: `page=2&limit=10` skips first 10, response includes correct `total` and `totalPages`
- [ ] Uploader stats match actual download count and reviews in DB
- [ ] Tutor earnings aggregate correctly for completed sessions only
- [ ] Report endpoint flags the note in DB without deleting it
- [ ] `<Pagination>` component works correctly on both notes and tutors pages

---

## Phase 4 — Polish + Reliability

### Goal
Production-ready: hardened validation, good UX, no broken states.

### Backend

- Rate limiting: max 10 uploads per user per day; max 5 booking requests per user per day (use existing middleware pattern)
- Add activity logging for: note uploaded, note downloaded, booking created, booking status changed (write to existing notifications collection if present, or create `ActivityLog` model)
- Audit all new error responses — must follow existing error response shape `{ success: false, message: string }`
- Review all email templates for clarity and consistent branding

### Frontend

- Loading states: skeleton loaders on notes listing, tutor listing, dashboards
- Empty states: friendly message + CTA when no notes, no tutors, no bookings found
- Error states: show toast/alert on failed API calls (reuse existing toast component if present)
- Mobile layout: test all new pages on 375px viewport, fix Bootstrap grid issues
- Auth guard audit: verify every new page redirects unauthenticated users to `/login`

### Testing Criteria — Phase 4 (End-to-End)

**Notes flow:**
- [ ] Student uploads note → appears in search → another student finds it via keyword search → downloads it → review form appears → student submits review → uploader dashboard shows updated download count and rating

**Tutoring flow:**
- [ ] Student finds tutor → selects slot → submits booking → tutor receives email → tutor accepts → student receives email → session marked complete → student submits review → tutor earnings dashboard updates

**Edge cases:**
- [ ] Uploading a duplicate file name does not overwrite existing Cloudinary asset
- [ ] Booking a slot that is already confirmed by another student returns `409`
- [ ] Rate limit triggers correctly after threshold and returns `429`
- [ ] All new pages show correct empty state when no data exists
- [ ] All new pages are fully usable on mobile (375px)

---

## Checklist Before Calling Any Phase "Done"

- [ ] No existing file was modified without explicit instruction
- [ ] All new routes follow existing route file structure and naming
- [ ] All new Mongoose models follow existing model file structure
- [ ] All new pages follow existing page/component folder structure
- [ ] No hardcoded credentials, URLs, or secrets anywhere in new code
- [ ] All new environment variables documented in `.env.example`

