# PeerLink Reviewer Directory Public

A lightweight, authenticated reviewer directory for authorized Emperion and PeerLink staff to identify reviewer coverage by specialty, jurisdiction, and availability.

## Purpose

This project was built to provide a simple operational reference tool for scheduling and reviewer selection workflows.

The application allows approved users to quickly identify:

- reviewer specialty
- state licensure / jurisdiction coverage
- availability status
- internal do-not-use indicators
- limited operational notes

This tool is intentionally narrow in scope and designed to expose only a minimal operational dataset.

## Scope

This application is intentionally small and isolated:

- single-page React application
- separate Supabase project and PostgreSQL database
- authenticated access required
- no connection to Peer Exchange (PXC) production systems
- no client system integration
- no public self-registration

## Data Stored

The database stores operational reference data only.

Fields include:

- reviewer name
- specialty
- state licensure / WC jurisdictions
- availability indicators (unavailable are hidden)
- internal DNU flags
- optional operational notes
- timestamps / sync metadata

## Data Explicitly Not Stored

This application does not store:

- PHI
- medical records
- claimant data
- client data
- financial data
- reviewer contact information
- credentials used for internal production systems

## Architecture

### Frontend
- React
- Material UI
- JavaScript
- Hosted on Vercel

### Backend
- Supabase
- PostgreSQL database
- Supabase Auth for passwordless login
- Supabase Edge Functions for scheduled synchronization

## Authentication Model

Authentication is handled through Supabase magic-link email authentication.

### Access model
Users cannot self-register.

Access requires:

1. user email is manually added to Supabase Auth
2. user requests a magic login link from the login page
3. Supabase sends a one-time sign-in link to the approved email
4. successful authentication creates a session and allows access to the application

This creates a whitelisted access model.

### Notes
- `shouldCreateUser: false` is used when requesting magic links
- only pre-provisioned email accounts may authenticate
- anonymous access is blocked

## Authorization and Database Security

Row Level Security (RLS) is enabled on the primary directory table.

Current policy model:

- `SELECT`: authenticated users only
- `UPDATE`: authenticated users only (used only for limited operational note updates)
- anonymous access: blocked

This ensures the frontend only reads and updates data through authenticated sessions.

## Data Synchronization

The public directory database is updated through a scheduled Supabase Edge Function.

### Sync behavior
- runs on a scheduled interval
- refreshes the public directory table using a limited operational dataset
- synchronization is one-directional
- only the approved operational reference fields are replicated

## Database Schema Overview

The application is centered on a single operational directory table.

Columns include:

- `id`
- `reviewer_name`
- `specialty`
- `states`
- `availability_status`
- `dnu_flag`
- `notes`
- `updated_at`

## Environment Variables

Create a `.env` file using the variables listed in `.env.example`.

Required variables:

- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_ANON_KEY
- REACT_APP_SUPPORT_EMAIL
- REACT_APP_STATUS_URL (optional)