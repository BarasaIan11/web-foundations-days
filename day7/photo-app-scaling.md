# SnapShare Scaling Plan

## Assumptions and estimates

- SnapShare has **10 million registered users**.
- **10%** of registered users are active each day, so daily active users (DAU) are **1 million**.
- Every active user uploads **one photo per day**, giving **1 million uploads per day**.
- Every active user views **50 feed pages per day**, giving **50 million feed views per day**.
- A day has 86,400 seconds, traffic is evenly distributed for the average estimate, and peak traffic is **5 times** the average.
- Each original photo is 2 MB and each thumbnail is 50 KB; the storage figures use decimal units (1 MB = 1,000 KB).

| Measure | Calculation | Estimate |
| --- | --- | --- |
| Average uploads/second | 1,000,000 / 86,400 | about **11.6 uploads/s** |
| Peak uploads/second | 11.6 × 5 | about **57.9 uploads/s** |
| Average feed views/second | 50,000,000 / 86,400 | about **578.7 views/s** |
| Peak feed views/second | 578.7 × 5 | about **2,893.5 views/s** |
| Photos stored/year | 1,000,000 × 365 | **365 million photos** |
| Original-photo storage/year | 365 million × 2 MB | **730 TB** |
| Thumbnail storage/year | 365 million × 50 KB | **18.25 TB** |
| Total photo storage/year | 730 TB + 18.25 TB | about **748.25 TB (0.75 PB)** |

## Read or write heavy?

SnapShare is **read-heavy**: it has 50 feed reads for every photo upload, so the design should prioritize fast cached feed data, read replicas, and CDN delivery while still processing uploads reliably.

Photos should not be stored inside the database because large binary files make database storage, backups, replication, and queries unnecessarily expensive. Store original photos and thumbnails in durable **object storage** instead, and store only their keys/URLs and metadata in the database.

## Architecture

```text
                 +------------------+
                 |      Users       |
                 +--------+---------+
                          |
             photo/feed requests and media downloads
                          |
             +------------v------------+
             |           CDN            |
             +------------+------------+
                          | cache miss / API request
                          v
                  +-------+--------+
                  | Load balancer  |
                  +-------+--------+
                          |
              +-----------v-----------+
              |      App servers       |
              +-----+-----------+-----+
                    |           |
          feed data |           | photo metadata
                    v           v
             +------+----+  +---+-------------------+
             |  Cache    |  | Database primary      |
             | (Redis)   |  |          |            |
             +-----------+  |          v            |
                            |    Read replica       |
                            +-----------------------+
                    |                 |
                    | upload URL      | photo key, caption,
                    |                 | follows, feed metadata
                    v                 v
             +------+------------------+-----+
             |       Object storage          |
             | originals and thumbnails      |
             +------+------------------+-----+
                    |                  ^
                    v                  |
             +------+-----+     +------+------+
             |    Queue    |---->| Thumbnail   |
             |             |     | worker      |
             +------------+     +-------------+
```

## Components

- **CDN:** Caches and serves photos and thumbnails close to users, reducing latency and load on the application.
- **Load balancer:** Spreads API requests across app servers and removes unhealthy servers from traffic.
- **App servers:** Authenticate users, create upload requests, write metadata, and build or retrieve feeds.
- **Cache:** Stores frequently requested feeds and metadata so repeated reads do not always reach the database.
- **Database primary:** Reliably stores users, follow relationships, photo metadata, and writes such as new uploads.
- **Read replica:** Handles read queries such as feed and profile metadata without overloading the primary database.
- **Object storage:** Durably and cheaply holds the large original-photo and thumbnail files outside the database.
- **Queue:** Buffers thumbnail jobs so an upload does not wait for image processing and traffic bursts can be absorbed.
- **Thumbnail worker:** Takes queued original photos, produces thumbnails, and saves them back to object storage.

## Photo upload flow

1. The user selects a photo and submits its caption and category details to an app server.
2. The app server authenticates the user, creates a pending metadata record, and returns a pre-signed object-storage upload URL.
3. The client uploads the 2 MB original directly to object storage rather than sending its bytes through the app servers.
4. Object storage confirms the upload, and the app server marks the photo record as available and stores its object key in the database primary.
5. The app server adds a thumbnail-generation message containing the original object key and photo ID to the queue.
6. A thumbnail worker takes the message, reads the original from object storage, creates the 50 KB thumbnail, and writes that thumbnail back to object storage.
7. The worker records the thumbnail key in the database; subsequent feed requests can use the CDN to deliver the thumbnail.

## Trade-offs

- **Direct-to-object-storage uploads** reduce app-server bandwidth and scale well, but require pre-signed URLs and careful validation of file type, size, and upload ownership.
- **Caching feeds** makes the read-heavy workload fast, but cached feeds can briefly be stale when someone uploads or changes follow relationships.
- **Read replicas** improve read capacity, but replication lag means a new photo may not appear immediately when a feed is read from a replica.
- **Asynchronous thumbnails** keep uploads responsive and absorb spikes, but a photo may temporarily appear without a thumbnail while the worker processes its job.
