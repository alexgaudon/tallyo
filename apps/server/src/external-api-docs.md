# Tallyo External API

Base URL: `/api`

Authentication: Bearer token in the `Authorization` header. Generate a token from the Tallyo web UI (Settings).

All endpoints return JSON. Error responses have the shape `{ "error": string }`.

---

## POST /api/transactions

Create transactions in bulk (1-100 per request).

### Request Headers
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

### Request Body
```json
{
  "transactions": [
    {
      "amount": -1250,
      "date": "2024-01-15",
      "transactionDetails": "WHOLEFDS",
      "externalId": "unique-id-123",
      "merchantId": "optional-merchant-uuid",
      "categoryId": "optional-category-uuid",
      "notes": "optional note"
    }
  ]
}
```

- `amount` (integer, required): Amount in cents. Negative for expenses, positive for income.
- `date` (string, required): ISO date `YYYY-MM-DD`.
- `transactionDetails` (string, required): Raw transaction description.
- `externalId` (string, required): Unique identifier from the source system. Used for deduplication per user.
- `merchantId` (string, optional): Pre-assign a merchant UUID.
- `categoryId` (string, optional): Pre-assign a category UUID.
- `notes` (string, optional): Free-form note.

### Response
```json
{
  "message": "Transactions received",
  "count": 1
}
```

- `count`: Number of transactions actually inserted (excludes duplicates by `externalId`).

---

## GET /api/transactions

List transactions with filtering, sorting, and pagination.

### Request Headers
- `Authorization: Bearer <token>` (required)

### Query Parameters
- `page` (number, default: `1`): Page number.
- `pageSize` (number, default: `50`, max: `100`): Items per page.
- `dateFrom` (string, optional): `YYYY-MM-DD` inclusive.
- `dateTo` (string, optional): `YYYY-MM-DD` inclusive.
- `categoryIds` (string, optional): Comma-separated category UUIDs.
- `merchantIds` (string, optional): Comma-separated merchant UUIDs.
- `amountMin` (number, optional): Minimum amount in cents.
- `amountMax` (number, optional): Maximum amount in cents.
- `reviewed` (boolean, optional): Filter by reviewed status (`true` or `false`).
- `search` (string, optional): Case-insensitive search on `transactionDetails`, `notes`, and `id`.

### Response
```json
{
  "transactions": [
    {
      "id": "txn-uuid",
      "userId": "user-uuid",
      "merchantId": "merchant-uuid",
      "categoryId": "category-uuid",
      "amount": -1250,
      "date": "2024-01-15",
      "transactionDetails": "WHOLEFDS",
      "notes": null,
      "externalId": "unique-id-123",
      "reviewed": false,
      "splitFromId": null,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z",
      "merchant": { "id": "...", "name": "Whole Foods", ... },
      "category": { "id": "...", "name": "Groceries", ..., "parentCategory": null }
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "pageSize": 50,
    "totalPages": 3
  }
}
```

Results are sorted by `date` descending, then `amount` descending. Transactions more than 30 days in the future are excluded.

---

## PATCH /api/transactions/:id

Update a transaction's reviewed status, merchant, and/or category.

### Request Headers
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

### Path Parameters
- `id` (string, required): Transaction UUID.

### Request Body
At least one field is required.

```json
{
  "reviewed": true,
  "merchantId": "merchant-uuid",
  "categoryId": "category-uuid"
}
```

- `reviewed` (boolean, optional): Set reviewed status explicitly (`true` or `false`).
- `merchantId` (string | null, optional): Assign or clear the merchant. Pass `null` to remove the merchant.
- `categoryId` (string | null, optional): Assign or clear the category. Pass `null` to remove the category.

When `merchantId` is updated without `categoryId`, the category is automatically set to the merchant's recommended category (or cleared if the merchant has none). If both are provided, `categoryId` takes precedence.

Merchant and category IDs must belong to the authenticated user.

### Response
```json
{
  "transaction": {
    "id": "txn-uuid",
    "userId": "user-uuid",
    "merchantId": "merchant-uuid",
    "categoryId": "category-uuid",
    "amount": -1250,
    "date": "2024-01-15",
    "transactionDetails": "WHOLEFDS",
    "notes": null,
    "externalId": "unique-id-123",
    "reviewed": true,
    "splitFromId": null,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:05:00.000Z",
    "merchant": { "id": "...", "name": "Whole Foods", ... },
    "category": { "id": "...", "name": "Groceries", ..., "parentCategory": null }
  }
}
```

Returns `404` if the transaction, merchant, or category is not found. Returns `403` if the transaction belongs to another user.

---

## GET /api/transactions/search

Broad search across transactions. Matches when the query appears in `transactionDetails`, `notes`, `merchant.name`, or `category.name`.

### Request Headers
- `Authorization: Bearer <token>` (required)

### Query Parameters
- `q` (string, required): Search query.
- `page` (number, default: `1`): Page number.
- `pageSize` (number, default: `50`, max: `100`): Items per page.

### Response
```json
{
  "transactions": [
    {
      "id": "txn-uuid",
      "userId": "user-uuid",
      "merchantId": "merchant-uuid",
      "categoryId": "category-uuid",
      "amount": -1250,
      "date": "2024-01-15",
      "transactionDetails": "SHELL OIL",
      "notes": null,
      "externalId": "unique-id-123",
      "reviewed": false,
      "splitFromId": null,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z",
      "merchant": { "id": "...", "name": "Shell", ... },
      "category": { "id": "...", "name": "Gas", ..., "parentCategory": null }
    }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "pageSize": 50,
    "totalPages": 1
  }
}
```

Returns `400` if `q` is missing or empty.

---

## GET /api/categories

List all categories for the authenticated user.

### Request Headers
- `Authorization: Bearer <token>` (required)

### Response
```json
{
  "categories": [
    {
      "id": "cat-uuid",
      "name": "Food",
      "userId": "user-uuid",
      "parentCategoryId": null,
      "icon": null,
      "treatAsIncome": false,
      "hideFromInsights": false,
      "createdAt": "...",
      "updatedAt": "...",
      "parentCategory": null,
      "subCategories": [
        { "id": "sub-cat-uuid", "name": "Restaurants", ... }
      ]
    }
  ]
}
```

---

## GET /api/merchants

List all merchants for the authenticated user.

### Request Headers
- `Authorization: Bearer <token>` (required)

### Response
```json
{
  "merchants": [
    {
      "id": "merchant-uuid",
      "name": "Whole Foods",
      "userId": "user-uuid",
      "recommendedCategoryId": "cat-uuid",
      "createdAt": "...",
      "updatedAt": "...",
      "keywords": [
        { "id": "kw-uuid", "merchantId": "merchant-uuid", "userId": "user-uuid", "keyword": "WHOLEFDS", ... }
      ],
      "recommendedCategory": { "id": "cat-uuid", "name": "Groceries", ... }
    }
  ]
}
```
