# Supabase Database Migrations & Schema

This directory contains version-controlled PostgreSQL migrations for the Progressive Website Blocker backend.

---

## Migration Files

- **`migrations/20261015000001_initial_schema.sql`**: Initial database schema covering user profiles, preferences/settings sync, synced websites, unlock history, indexes, triggers, and Row Level Security (RLS) policies.
- **`migrations/20261015000002_harden_permissions.sql`**: Removes client writes to profiles/billing fields, enforces cloud-data consent through restrictive RLS policies, and hardens the signup trigger function. Apply this to existing databases after the initial schema; it has no data-deletion statements.
- **`migrations/20261015000003_versioned_website_sync.sql`**: Adds server-controlled website revisions, a consistent snapshot RPC, and atomic list replacement with revision checks. Required for automatic sync. It updates grants on user settings so clients cannot forge revisions; existing settings upserts remain supported.

After applying migration 3 in staging, run `tests/versioned_sync.sql` as `postgres`. It checks revision conflicts, all-or-nothing replacements, removals, invalid input, consent, revision protection, settings upserts, and anonymous denial, then rolls back its fixtures. Re-run `tests/permissions.sql` too. These scripts are prepared checks, not a claim that the hosted database has already been verified.

## Security verification

Apply both migrations in filename order. Then run `tests/permissions.sql` as `postgres` in a staging project's SQL editor. It verifies profile protection, per-user isolation, opt-in enforcement, anonymous denial, and trusted billing updates. The script creates temporary test users inside a transaction and ends with `ROLLBACK`; if it fails, roll back the failed transaction before retrying. Do not treat a successful table SELECT or the API's unit tests as proof that these database checks passed.

The repository includes the hardening migration and SQL assertions; their presence does not mean they have been applied to a hosted database.

## Authentication behavior

Signup and login use fresh, non-persistent Supabase clients for each request. Protected database reads use the caller's bearer token. Logout requires a valid bearer token and revokes only that session's refresh token, preserving other devices. Existing access JWTs can remain valid until their expiry; the client must clear its local credentials on successful logout. See [Supabase sign-out behavior](https://supabase.com/docs/guides/auth/signout).

---

## Schema Overview

| Table Name | Purpose | Primary Key | Foreign Key | Privacy & Security Guarantees |
| :--- | :--- | :--- | :--- | :--- |
| `public.profiles` | User account tier & subscription status | `id (UUID)` | `auth.users(id)` | Extends Supabase Auth. RLS restricted to owner (`auth.uid() = id`). |
| `public.user_settings` | User preferences & sync options | `id (UUID)` | `auth.users(id)` | Defaults `analytics_opt_in = false` and `sync_enabled = false`. RLS restricted to owner. |
| `public.synced_websites` | Optional synced blocklist domains | `id (UUID)` | `auth.users(id)` | Only populated if sync is opted-in. Unique on `(user_id, domain)`. RLS restricted to owner. |
| `public.unlock_history` | Domain-level unlock milestone logs | `id (UUID)` | `auth.users(id)` | Minimal data: stores only domain, tier, and timestamp. **NEVER** stores full browsing URLs or search queries. |

---

## Automatic Triggers

1. **`set_<table_name>_updated_at`**: Automatically synchronizes the `updated_at` timestamp on every update.
2. **`on_auth_user_created`**: Triggers `handle_new_user()` when a new user signs up in `auth.users`, automatically inserting default rows in `public.profiles` and `public.user_settings`.

---

## How to Apply in Supabase Cloud Dashboard

1. Open your project dashboard at [https://supabase.com/dashboard/project/eahktzdgggsciahcmbqq](https://supabase.com/dashboard/project/eahktzdgggsciahcmbqq).
2. Navigate to **SQL Editor** in the left sidebar.
3. Click **New Query**.
4. Copy and paste the entire contents of [`migrations/20261015000001_initial_schema.sql`](./migrations/20261015000001_initial_schema.sql).
5. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
6. Navigate to **Table Editor** to confirm the 4 tables (`profiles`, `user_settings`, `synced_websites`, `unlock_history`) appear with RLS enabled.
