# OLA Used EV Bike Sales Tracker

This repository now includes a complete MVP system to manage used OLA 2-wheeler EV inventory, sales, split payments (advance + later installments), and dashboard reporting.

## Why this system

Used EV resale needs more than a simple list:

- Bikes come in different models, variants, and age bands.
- Odometer can vary from under 100 km to 20,000+ km.
- Money may come in multiple parts (advance now, balance later).
- Buyers may be end customers or vendors/dealers.

This app handles all of that in one place.

## Stack

- **App UI**: Streamlit
- **Database**: SQLite (`ev_sales.db`)
- **Language**: Python

## Data model

### 1) `bikes`
Tracks each inventory unit:

- model / variant / manufacture year
- purchase date and purchase price
- expected sale price
- kms run, battery health, condition grade
- registration/chassis identifiers
- location and status (`in_stock`, `reserved`, `sold`, `inactive`)

### 2) `parties`
Master table for people/companies:

- type can be `buyer`, `vendor`, or `both`
- contact details, city, notes

### 3) `sales`
One sale contract per bike:

- linked bike and buyer/vendor
- listed price vs final sale price
- sale date and delivery date
- status (`open`, `closed`, `cancelled`)

### 4) `payments`
Multiple entries per sale:

- payment stage (`advance`, `installment`, `final`, `refund`)
- amount, mode, date, reference

## Important business logic

- A bike can have one active sale record.
- When sale is created, bike moves to **reserved**.
- Sale closes automatically once total payments meet final sale value.
- Closed sale marks bike as **sold**.
- Refund entries are stored as negative amounts.

## Features

- Dashboard KPIs:
  - total bikes
  - active inventory
  - sold bikes
  - contracted value
  - amount received
  - outstanding receivable
- Inventory register with quick status update
- Buyer/vendor master
- Sale creation with optional instant advance capture
- Installment payment tracker
- Outstanding report with CSV export
- Low-km and high-km inventory views

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
streamlit run app.py
```

Then open the local URL shown in terminal.

## Suggested operating flow

1. Add all bikes in **Bikes**
2. Add buyers/vendors in **Parties**
3. Create contract in **Sales** (optionally with advance)
4. Record each incoming payment in **Payments**
5. Monitor outstanding and km/age segments in **Dashboard** and **Reports**

## Notes for production scaling

For larger operations, recommended next upgrades:

- role-based login and user audit logs
- invoice/document uploads
- WhatsApp/SMS payment reminders
- vendor payout and expense tracking
- API layer (FastAPI) + hosted PostgreSQL