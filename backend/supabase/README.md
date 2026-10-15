# Supabase Database Migrations & Schema

This directory contains version-controlled PostgreSQL migrations for the Progressive Website Blocker backend.

---

## Migration Files

- **`migrations/20261015000001_initial_schema.sql`**: Initial database schema covering user profiles, preferences/settings sync, synced websites, unlock history, indexes, triggers, and Row Level Security (RLS) policies.

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
