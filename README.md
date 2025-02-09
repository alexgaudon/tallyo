# Tallyo

# DISCLAIMER: This is in no way meant for "production" use. It's still very early, and there may be bugs.

# Local Development Environment

1. Run

```sh
cp .env.example .env
```

2. Go to discord dev portal to generate an app and get the secrets for OAuth.
3. Fill out your .env file
4. Run

```sh
pnpm install
```

5. Run

```sh
pnpm db:auth:generate && pnpm db
```

6. Run

```sh
pnpm dev
```

7. Open browser to `http://localhost:3000`

"What is not defined cannot be measured. What is not measured, cannot be improved. What is not improved, is always degraded" - William Thomson Kelvin

Tallyo is an attempt to measure personal finance, and provide you with the insights you need to hopefully make a change for the better.

<img width="1800" alt="image" src="https://github.com/user-attachments/assets/2fbb3396-a218-4827-921e-1042e01687b9">

# Features

- Transaction Logging
  - Transactions can be created via POST request to /api/new-transactions. The thought being you can configure any integration with any financial provider to upload transactions into the system.
- Categorization
  - Transactions can be grouped by category. Tallyo has a basic implementation of "Auto Categorization", which basically means you can click the `function` button to automatically assign the category that previous transactions with the same `vendor` have been assigned.
- Charts
  - As pictured above Tallyo has simple charts to give you an inital view on your finances.
    - Monthly Expenses
    - Income vs Expenses
    - Transaction Category Breakdown
    - "Stats for Nerds"
      - Transaction Count
      - Total Income Tracked
      - Total Expenses Tracked
      - Savings Rate
