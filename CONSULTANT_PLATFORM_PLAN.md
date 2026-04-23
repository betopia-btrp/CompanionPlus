# Consultant Platform Plan

## Architecture Decision

**Custom slot management** (no Cal.com). We already have `availability_slots`, `bookings`, `transactions`, `consultant_wallets` tables. Cal.com would add cost, webhook sync complexity, and fight against our existing hold/booking flow.

## Page Structure (Separate Pages)

| Route | Purpose |
|---|---|
| `/dashboard` | Consultant overview — 3 stat cards, today's schedule, earnings snapshot, pending requests |
| `/dashboard/schedule` | Full calendar — Google Calendar-style day/week view with availability slots, booked sessions, held slots. Click-to-create slots |
| `/dashboard/bookings` | All bookings list — past/upcoming/pending with approve/reject, join session |
| `/dashboard/earnings` | Minimal — wallet balance + transaction list from `transactions` table |

## Data Flow

```
Consultant creates availability slot → availability_slots table
Patient holds slot (15min) → held_by_user_id + hold_expires_at
Patient pays → transactions table (type=payment, consultant_net calculated)
Slot becomes booked → availability_slots.is_booked = true, bookings table created
Session happens → Jitsi room via jitsi_room_uuid on booking
Post-session → transactions table (type=payout) → consultant_wallets.balance_bdt updated
```

## Backend API (New Endpoints Needed)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/consultant/schedule` | Calendar data: slots + bookings for a date range |
| `GET` | `/api/consultant/bookings` | All bookings with filters (status, date range) |
| `GET` | `/api/consultant/wallet` | Wallet balance + transaction history |
| `GET` | `/api/consultant/transactions` | Paginated transaction list |

## Frontend Components

### 1. `/dashboard` (Consultant Overview)
- 3 stat cards: Today's Sessions, Total Patients, Pending Bookings
- Today's schedule: Google Calendar day-view style blocks
- Earnings snapshot card
- Session requests table with approve/reject
- **Status**: Partially built

### 2. `/dashboard/schedule` (Interactive Calendar)
- shadcn `Calendar` for month navigation
- Day view with time-grid (like Google Calendar): 6AM–10PM rows
- Color-coded blocks: green=available, blue=booked, amber=held
- Click empty time → create slot modal (date, start time, end time)
- Click existing slot → delete (if not booked/held)

### 3. `/dashboard/bookings` (Bookings List)
- Tabs: Upcoming | Past | Pending
- Each row: patient ref, date/time, status, actions (Join/View Notes/Approve/Reject)
- For upcoming: "Join Session" button → `/dashboard/room?room={jitsi_room_uuid}`

### 4. `/dashboard/earnings` (Minimal Earnings)
- Wallet balance card (from `consultant_wallets.balance_bdt`)
- Transaction list (from `transactions` where booking.consultant_id = current consultant)
- Columns: date, type (payment/payout/refund), amount, consultant_net, status

## Database Tables (Already Exist)

### `availability_slots`
- `id`, `consultant_id`, `start_datetime`, `end_datetime`, `is_booked`, `held_by_user_id`, `hold_expires_at`, `version`

### `bookings`
- `id`, `patient_id`, `consultant_id`, `slot_id`, `status`, `jitsi_room_uuid`, `price_at_booking`, `scheduled_start`, `scheduled_end`

### `transactions`
- `id`, `booking_id`, `user_id`, `type` (payment/refund/payout), `status` (pending/succeeded/failed), `total_amount`, `platform_fee`, `consultant_net`, `currency`

### `consultant_wallets`
- `id`, `consultant_id`, `balance_bdt`

### `consultant_profiles`
- `id`, `user_id`, `specialization`, `bio`, `base_rate_bdt`, `is_approved`, `average_rating`

## What Exists Already
- `availability_slots` table with hold system ✓
- `bookings` table with jitsi_room_uuid ✓
- `transactions` table with consultant_net ✓
- `consultant_wallets` table ✓
- `ConsultantDashboardController` with basic CRUD ✓
- Slot hold service (15min expiry) ✓
- `Transaction` model ✓

## What Needs Building
1. New API endpoints (schedule, bookings list, wallet/transactions)
2. `/dashboard/schedule` page with calendar + time grid
3. `/dashboard/bookings` page with filtered list
4. `/dashboard/earnings` page with wallet + transaction list
5. Jitsi room page (`/dashboard/room`) for video sessions
6. Sidebar navigation for consultant (Schedule, Bookings, Earnings)

## Jitsi Integration

You already store `jitsi_room_uuid` on bookings. The room page just needs to:
1. Fetch booking by UUID
2. Verify consultant is the owner
3. Embed Jitsi Meet iframe with that room
4. Show patient ref (anonymized) and session timer

## Design System

- Use shadcn components: Button, Select, Progress, Chart, Calendar, Input
- Font sizes: `text-xs`, `text-sm`, `text-base` (default), `text-lg`, `text-xl`, `text-2xl`
- No magic values like `text-[11px]`
- Color scheme: `bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`, `text-primary`
- Sharp corners (no `rounded-[2rem]`), use shadcn defaults (`rounded-none`)
- Phosphor icons (`@phosphor-icons/react`)
