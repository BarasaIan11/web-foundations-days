# TicketHub Design

## 1. Requirements

### Functional requirements

- Visitors can browse concerts and events, view event details, and see a seat map with current availability.
- Registered users can select seats, place a short-lived hold on them, pay, and view their purchased tickets.
- The system sends a confirmation and exposes a scannable ticket after a successful payment.
- Staff can create events and configure their seats, prices, and sale times.

### Non-functional requirements

- **Speed:** normal event and feed pages should load in under one second, while a seat hold should receive a clear result within a few seconds.
- **Correctness:** a seat must be sold to at most one order, even when many people try to buy it at once.
- **Fairness:** during a popular sale, users should be rate-limited and placed in a virtual waiting room instead of allowing aggressive clients to consume all capacity.
- **Availability:** the browsing service should remain available during failures, and the checkout path should degrade safely rather than risk overselling.
- **Security:** use authenticated checkout, HTTPS, payment-provider tokens, audit logs, and never store raw card details.

## 2. Estimates

### Assumptions

- TicketHub has **2 million registered users**.
- A normal day has 50,000 visitors who each view 10 pages.
- A normal day sells 5,000 tickets.
- A popular concert receives 200,000 purchase attempts for 20,000 seats in its first 10 minutes (600 seconds).
- Requests are evenly spread for the normal-day average; real traffic peaks higher, so the big-sale calculation is the capacity target.

| Workload | Calculation | Estimate |
| --- | --- | --- |
| Normal page views/day | 50,000 × 10 | 500,000 |
| Normal average page requests/second | 500,000 / 86,400 | about **5.8 requests/s** |
| Normal ticket sales/second | 5,000 / 86,400 | about **0.06 sales/s** |
| Big-sale purchase attempts/second | 200,000 / 600 | about **333 attempts/s** |
| Big-sale successful purchases/second at most | 20,000 / 600 | about **33 sales/s** |

The big sale creates roughly **58 times** the normal average page-request rate and concentrates correctness-sensitive seat operations into ten minutes. The design should therefore scale reads cheaply, use a waiting room to smooth purchase attempts, and send all seat holds and sales to a strongly consistent primary database.

## 3. API

| Method | Path | Purpose | Success |
| --- | --- | --- | --- |
| `GET` | `/events` | Browse upcoming events, optionally filtering by date, city, or genre. | `200 OK` |
| `GET` | `/events/{eventId}` | View one event's details. | `200 OK` |
| `GET` | `/events/{eventId}/seats` | View the seat map and availability for an event. | `200 OK` |
| `POST` | `/events/{eventId}/holds` | Attempt to hold selected seats for the signed-in user for, for example, five minutes. | `201 Created` or `409 Conflict` |
| `DELETE` | `/holds/{holdId}` | Release an unexpired seat hold. | `204 No Content` |
| `POST` | `/orders` | Create an order from a valid hold and payment token. | `201 Created` or `409 Conflict` |
| `POST` | `/orders/{orderId}/payment` | Send the payment token to the payment provider and confirm payment. | `200 OK` |
| `GET` | `/me/tickets` | List the current user's paid tickets. | `200 OK` |

Example hold request:

```json
{
  "seatIds": [421, 422]
}
```

Example order request:

```json
{
  "holdId": "hold_8f4c",
  "paymentToken": "payment-token-from-provider"
}
```

## 4. Data model

| Table | Important fields | Purpose and relationships |
| --- | --- | --- |
| `users` | `user_id` (PK), `email` (UNIQUE), `name` | Stores account holders; one user can create many holds and orders. |
| `events` | `event_id` (PK), `title`, `venue`, `starts_at` | Stores a concert or event; one event has many seats. |
| `seats` | `seat_id` (PK), `event_id` (FK), `section`, `row`, `seat_number`, `sold_order_id` (nullable FK) | Stores each physical seat for an event; `UNIQUE(event_id, section, row, seat_number)` prevents duplicate seat definitions. |
| `seat_holds` | `hold_id` (PK), `user_id` (FK), `seat_id` (FK), `expires_at`, `status` | Stores temporary reservations; one user may hold several seats, but a seat has only one active hold. |
| `orders` | `order_id` (PK), `user_id` (FK), `status`, `total_amount`, `created_at` | Stores a checkout attempt and its payment state. |
| `tickets` | `ticket_id` (PK), `order_id` (FK), `seat_id` (FK UNIQUE), `barcode` (UNIQUE) | Stores a paid ticket; the unique `seat_id` is a final database-level guard against selling one seat twice. |

`users` to `orders`, `events` to `seats`, and `orders` to `tickets` are one-to-many relationships. `users` and `seats` are linked temporarily through `seat_holds`; a purchased ticket then links an order to exactly one seat.

### Preventing double booking

Seat availability is never decided from a cached seat map. To create a hold, the app starts a database transaction, locks the requested `seats` rows on the primary database, removes any expired hold, checks that `sold_order_id` is `NULL` and that no unexpired hold exists, and inserts the holds. A unique constraint on active seat holds (implemented with an active-hold record per `seat_id`) makes competing inserts fail safely; the API returns `409 Conflict` to the losing request.

At payment confirmation, another transaction locks the held seats, verifies that the hold belongs to the user and has not expired, creates the order and tickets, and conditionally marks each seat sold. The transaction is committed only if every `UPDATE seats ... WHERE sold_order_id IS NULL` affects one row; otherwise it rolls back. The `tickets.seat_id UNIQUE` constraint provides a second, permanent safeguard if an application bug or retry occurs. Payment requests use an idempotency key so a network retry does not create a second order.

## 5. Architecture

```text
                         +----------------+
                         | Web / mobile   |
                         | users          |
                         +--------+-------+
                                  |
                         +--------v-------+
                         | CDN + WAF      |
                         +--------+-------+
                                  |
                    +-------------v--------------+
                    | Waiting room / rate limiter |
                    +-------------+--------------+
                                  |
                         +--------v-------+
                         | Load balancer  |
                         +--------+-------+
                                  |
                    +-------------v-------------+
                    | Stateless app servers      |
                    +----+----------+-------+----+
                         |          |       |
               browse    |          |       | payment
                         v          v       v
                 +-------+--+  +----+---+  +------------------+
                 | Cache    |  | Queue  |  | Payment provider |
                 +----------+  +----+---+  +------------------+
                                  |
                            +-----v------+
                            | Workers    |
                            | email etc. |
                            +------------+
                         |
              +----------v------------------+
              | Primary relational database |
              | users, seats, holds, orders |
              +----------+------------------+
                         |
                    +----v-----+
                    | Read     |
                    | replicas |
                    +----------+
```

- **CDN + WAF:** caches static assets and public event images while blocking abusive traffic before it uses application capacity.
- **Waiting room/rate limiter:** meters popular-sale traffic into a fair, controlled stream of checkout attempts.
- **Load balancer:** distributes requests among healthy stateless app servers so more servers can be added during sales.
- **App servers:** run authentication, APIs, seat-hold transactions, and checkout orchestration without storing user session state locally.
- **Cache:** serves popular event details and non-authoritative seat-map reads quickly; it is invalidated after seat changes.
- **Primary relational database:** provides transactions, row locks, and constraints for the source of truth for seat inventory and orders.
- **Read replicas:** absorb browsing and order-history reads while the primary focuses on seat holds and writes.
- **Payment provider:** securely authorizes payment tokens, keeping card data outside TicketHub.
- **Queue and workers:** perform non-critical work such as email confirmations and analytics asynchronously so checkout remains fast.

During a big sale, the CDN handles assets, the waiting room limits the 333 attempts per second, app servers scale horizontally, and only the smaller controlled checkout stream reaches the primary database. Inventory-changing writes do not use replicas or cached availability, preserving correctness under contention.

## 6. Trade-offs

- **A five-minute seat hold improves buyer confidence but temporarily hides seats from other buyers;** a shorter hold releases inventory sooner but makes checkout feel rushed.
- **A waiting room is fairer and protects the database but adds delay and operational complexity;** accepting every request immediately would feel faster until the sale overloads and fails for everyone.
- **Read replicas and cached seat maps lower browse latency but can be stale;** the design accepts stale display data because the primary database rechecks availability before creating a hold or order.
- **Strong transactions and row locks prevent overselling but reduce throughput for the same hot seats;** this cost is justified because correctness for a scarce seat matters more than accepting every simultaneous request.
