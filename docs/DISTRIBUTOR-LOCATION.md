# Distributor & delivery location (KM + nearest first)

Distance is how dispatch decides who carries a parcel: a partner 2 km from the
salon beats one 40 km away, whatever their names are. This note describes the
coordinates that make that possible and the API contract the admin panel
(`my-naai-frontend`) and the salon portal (`my-naai-web`) read.

## Storage

| Table | Column | Meaning |
| --- | --- | --- |
| `distributors` | `latitude`, `longitude` (DOUBLE, nullable) | The partner's dispatch point: pinned by the admin while adding them, refreshed by the distributor portal's GPS ("live location"). |
| `distributors` | `location_updated_at` | When the point was last set — a three-week-old pin is shown as such, so nobody is sorted by a stale position. |
| `shop_orders` | `delivery_latitude`, `delivery_longitude` (DOUBLE, nullable) | The delivery point, **snapshotted** at placement (the salon's coordinates, or the address pin the client sent). Moving a salon later never rewrites where an old parcel went. |

Both tables are already created with `sync({ alter: true })` at boot, so the new
columns appear on deploy; no manual migration is required.

Coordinates are always a **pair**. A lone latitude is rejected by validation —
half a location is worse than none, because it silently drops out of sorting.

## Distance

`src/utils/geo.js` holds the single implementation (haversine, great-circle,
rounded to 2 decimals ≈ 10 m). It is not a road distance and is not billed as
one; every response field is called `distanceKm` so a routing provider can
replace the maths later without changing a single client.

## API

### `POST /api/distributors/list` (admin)

```json
{ "page": 1, "searchString": "", "latitude": 21.1458, "longitude": 79.0882, "sortBy": "distance" }
```

* Sending the pair (the order's delivery location) returns **nearest first**
  with `distanceKm` on every row. Partners with no pin go **last** — unknown is
  not "near". Sorting happens across the whole filtered set before paging, so
  the nearest partner cannot be stranded on page 3.
* Without the pair the list stays alphabetical (`sortBy: "name"`).
* `data.reference` echoes what the ordering was based on.
* Each row also carries `latitude`, `longitude`, `locationUpdatedAt`,
  `hasLocation`.

### `POST /api/distributors/create` / `update` (admin)

Optional `latitude` + `longitude` (both or neither). On update, sending neither
leaves the pin untouched; sending `null`s clears it.

### `POST /api/distributors/location`

Distributor token (own row) **or** admin token + `distributorId`.

```json
{ "latitude": 21.1466, "longitude": 79.0888 }
```

Updates the point and `location_updated_at`; returns the row.

### `POST /api/shop-orders/admin-set-delivery-location` (admin)

```json
{ "orderId": "MN…", "latitude": 21.1458, "longitude": 79.0882 }
```

For a salon with no coordinates (or a delivery to a different gate). Locked once
the order is `DELIVERED`/`CANCELLED`; lands in the order timeline as
`DELIVERY_LOCATION_SET`.

### Order payloads (admin + distributor portal)

Both list and detail responses add:

```json
"deliveryLocation": { "latitude": 21.1458, "longitude": 79.0882, "source": "ORDER", "hasLocation": true },
"distributor": { "…": "…", "latitude": 21.1466, "longitude": 79.0888, "hasLocation": true, "distanceKm": 1.42 }
```

`source` is `ORDER` (the snapshot), `SALON` (fallback to the salon's current
coordinates) or `null` when neither exists.

The **salon** payload keeps `deliveryLocation` (it is the salon's own address —
so they can confirm the pin) and still never sees the distributor, the internal
status or the distance. Assignments write the distance into the audit note
("… — 1.4 km from the delivery location"), so "why this partner?" stays
answerable.
