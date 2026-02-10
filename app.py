from __future__ import annotations

import sqlite3
from datetime import date
from pathlib import Path
from typing import Any

import pandas as pd
import streamlit as st

DB_PATH = Path(__file__).resolve().parent / "ev_sales.db"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS bikes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ola_model TEXT NOT NULL,
            variant TEXT,
            manufacture_year INTEGER,
            purchase_date TEXT NOT NULL,
            purchase_price REAL NOT NULL CHECK (purchase_price >= 0),
            asking_price REAL CHECK (asking_price >= 0),
            kms_run INTEGER NOT NULL CHECK (kms_run >= 0),
            battery_health_pct REAL CHECK (battery_health_pct >= 0 AND battery_health_pct <= 100),
            condition_grade TEXT CHECK (condition_grade IN ('A', 'B', 'C', 'D')),
            color TEXT,
            registration_no TEXT UNIQUE,
            chassis_no TEXT UNIQUE,
            location TEXT,
            status TEXT NOT NULL DEFAULT 'in_stock'
                CHECK (status IN ('in_stock', 'reserved', 'sold', 'inactive')),
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS parties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            party_type TEXT NOT NULL CHECK (party_type IN ('buyer', 'vendor', 'both')),
            phone TEXT,
            email TEXT,
            city TEXT,
            address TEXT,
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bike_id INTEGER NOT NULL UNIQUE REFERENCES bikes (id) ON DELETE RESTRICT,
            buyer_id INTEGER NOT NULL REFERENCES parties (id) ON DELETE RESTRICT,
            listed_price REAL CHECK (listed_price >= 0),
            final_sale_price REAL NOT NULL CHECK (final_sale_price >= 0),
            sale_date TEXT NOT NULL,
            delivery_date TEXT,
            sale_status TEXT NOT NULL DEFAULT 'open'
                CHECK (sale_status IN ('open', 'closed', 'cancelled')),
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER NOT NULL REFERENCES sales (id) ON DELETE CASCADE,
            payment_date TEXT NOT NULL,
            amount REAL NOT NULL CHECK (amount != 0),
            payment_mode TEXT NOT NULL
                CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer', 'card', 'cheque', 'other')),
            payment_stage TEXT NOT NULL
                CHECK (payment_stage IN ('advance', 'installment', 'final', 'refund')),
            reference_no TEXT,
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_bikes_status ON bikes (status);
        CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales (sale_date);
        CREATE INDEX IF NOT EXISTS idx_sales_status ON sales (sale_status);
        CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON payments (sale_id);
        CREATE INDEX IF NOT EXISTS idx_payments_date ON payments (payment_date);
        """
    )
    conn.commit()


def query_df(conn: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> pd.DataFrame:
    return pd.read_sql_query(sql, conn, params=params)


def _safe_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def sync_sale_status(conn: sqlite3.Connection, sale_id: int) -> None:
    row = conn.execute(
        """
        SELECT
            s.id,
            s.bike_id,
            s.final_sale_price,
            s.sale_status,
            s.delivery_date,
            COALESCE(SUM(p.amount), 0) AS paid_amount
        FROM sales s
        LEFT JOIN payments p ON p.sale_id = s.id
        WHERE s.id = ?
        GROUP BY s.id, s.bike_id, s.final_sale_price, s.sale_status, s.delivery_date
        """,
        (sale_id,),
    ).fetchone()

    if row is None or row["sale_status"] == "cancelled":
        return

    final_price = _safe_float(row["final_sale_price"])
    paid_amount = _safe_float(row["paid_amount"])

    if paid_amount >= final_price and final_price > 0:
        sale_status = "closed"
        bike_status = "sold"
    elif final_price == 0:
        # Zero-value transfers should not remain "open".
        sale_status = "closed"
        bike_status = "sold"
    else:
        sale_status = "open"
        bike_status = "sold" if row["delivery_date"] else "reserved"

    conn.execute("UPDATE sales SET sale_status = ? WHERE id = ?", (sale_status, sale_id))
    conn.execute("UPDATE bikes SET status = ? WHERE id = ?", (bike_status, row["bike_id"]))
    conn.commit()


def sync_all_sales(conn: sqlite3.Connection) -> None:
    sale_ids = conn.execute(
        "SELECT id FROM sales WHERE sale_status IN ('open', 'closed')"
    ).fetchall()
    for item in sale_ids:
        sync_sale_status(conn, int(item["id"]))


def render_dashboard(conn: sqlite3.Connection) -> None:
    st.subheader("Business Dashboard")

    inv_summary = conn.execute(
        """
        SELECT
            COUNT(*) AS total_bikes,
            SUM(CASE WHEN status IN ('in_stock', 'reserved') THEN 1 ELSE 0 END) AS active_inventory,
            SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) AS sold_bikes,
            COALESCE(SUM(purchase_price), 0) AS total_purchase_cost
        FROM bikes
        """
    ).fetchone()

    sales_summary = conn.execute(
        """
        SELECT
            COALESCE(SUM(final_sale_price), 0) AS contracted_value
        FROM sales
        WHERE sale_status != 'cancelled'
        """
    ).fetchone()

    payment_summary = conn.execute(
        "SELECT COALESCE(SUM(amount), 0) AS total_received FROM payments"
    ).fetchone()

    total_bikes = int(inv_summary["total_bikes"] or 0)
    active_inventory = int(inv_summary["active_inventory"] or 0)
    sold_bikes = int(inv_summary["sold_bikes"] or 0)
    total_purchase_cost = _safe_float(inv_summary["total_purchase_cost"])
    contracted_value = _safe_float(sales_summary["contracted_value"])
    total_received = _safe_float(payment_summary["total_received"])
    outstanding = contracted_value - total_received

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Total Bikes", total_bikes)
    c2.metric("Active Inventory", active_inventory)
    c3.metric("Sold Bikes", sold_bikes)
    c4.metric("Outstanding (Rs)", f"{outstanding:,.2f}")

    c5, c6, c7 = st.columns(3)
    c5.metric("Total Purchase Cost (Rs)", f"{total_purchase_cost:,.2f}")
    c6.metric("Contracted Sales (Rs)", f"{contracted_value:,.2f}")
    c7.metric("Total Received (Rs)", f"{total_received:,.2f}")

    st.markdown("---")

    stock_by_model = query_df(
        conn,
        """
        SELECT ola_model AS model, COUNT(*) AS units
        FROM bikes
        WHERE status IN ('in_stock', 'reserved')
        GROUP BY ola_model
        ORDER BY units DESC, model
        """,
    )

    km_bucket = query_df(
        conn,
        """
        SELECT
            CASE
                WHEN kms_run < 100 THEN '<100 km'
                WHEN kms_run < 1000 THEN '100-999 km'
                WHEN kms_run < 5000 THEN '1k-4.9k km'
                WHEN kms_run < 20000 THEN '5k-19.9k km'
                ELSE '20k+ km'
            END AS bucket,
            COUNT(*) AS units
        FROM bikes
        GROUP BY bucket
        ORDER BY units DESC
        """,
    )

    open_receivables = query_df(
        conn,
        """
        SELECT
            s.id AS sale_id,
            b.ola_model || ' ' || COALESCE(b.variant, '') AS bike,
            p.name AS buyer,
            s.final_sale_price AS contract_amount,
            COALESCE(SUM(pay.amount), 0) AS received_amount,
            s.final_sale_price - COALESCE(SUM(pay.amount), 0) AS balance_amount
        FROM sales s
        JOIN bikes b ON b.id = s.bike_id
        JOIN parties p ON p.id = s.buyer_id
        LEFT JOIN payments pay ON pay.sale_id = s.id
        WHERE s.sale_status != 'cancelled'
        GROUP BY s.id, b.ola_model, b.variant, p.name, s.final_sale_price
        HAVING s.final_sale_price - COALESCE(SUM(pay.amount), 0) > 0
        ORDER BY balance_amount DESC
        LIMIT 10
        """,
    )

    left_col, right_col = st.columns(2)

    with left_col:
        st.caption("Inventory by Model")
        if stock_by_model.empty:
            st.info("No bikes in active inventory yet.")
        else:
            st.bar_chart(stock_by_model.set_index("model")["units"])

    with right_col:
        st.caption("KM Distribution")
        if km_bucket.empty:
            st.info("No bike data available.")
        else:
            st.bar_chart(km_bucket.set_index("bucket")["units"])

    st.caption("Top Open Receivables")
    if open_receivables.empty:
        st.success("No outstanding sale balances.")
    else:
        st.dataframe(open_receivables, use_container_width=True, hide_index=True)


def render_bikes(conn: sqlite3.Connection) -> None:
    st.subheader("Bike Inventory")
    st.write("Track each OLA 2W unit by model, age, condition, KM run, and pricing.")

    with st.form("add_bike_form", clear_on_submit=True):
        c1, c2, c3 = st.columns(3)
        ola_model = c1.text_input("OLA Model *", placeholder="S1, S1 Pro, S1 Air")
        variant = c2.text_input("Variant", placeholder="Gen 2 / 3kWh / 4kWh")
        manufacture_year = c3.number_input(
            "Manufacture Year", min_value=2010, max_value=2100, value=2024, step=1
        )

        c4, c5, c6 = st.columns(3)
        purchase_date = c4.date_input("Purchase Date", value=date.today())
        purchase_price = c5.number_input(
            "Purchase Price (Rs) *", min_value=0.0, value=0.0, step=1000.0
        )
        asking_price = c6.number_input(
            "Expected Sale Price (Rs)", min_value=0.0, value=0.0, step=1000.0
        )

        c7, c8, c9 = st.columns(3)
        kms_run = c7.number_input("KM Run *", min_value=0, value=0, step=1)
        battery_health = c8.number_input(
            "Battery Health %", min_value=0.0, max_value=100.0, value=100.0, step=1.0
        )
        condition_grade = c9.selectbox("Condition Grade", options=["A", "B", "C", "D"])

        c10, c11, c12 = st.columns(3)
        color = c10.text_input("Color")
        registration_no = c11.text_input("Registration Number", placeholder="Optional unique")
        chassis_no = c12.text_input("Chassis Number", placeholder="Optional unique")

        c13, c14 = st.columns(2)
        location = c13.text_input("Current Location")
        status = c14.selectbox("Status", options=["in_stock", "reserved", "sold", "inactive"])
        notes = st.text_area("Notes")

        submitted = st.form_submit_button("Add Bike")
        if submitted:
            if not ola_model.strip():
                st.error("OLA Model is required.")
            else:
                try:
                    conn.execute(
                        """
                        INSERT INTO bikes (
                            ola_model, variant, manufacture_year, purchase_date, purchase_price,
                            asking_price, kms_run, battery_health_pct, condition_grade, color,
                            registration_no, chassis_no, location, status, notes
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            ola_model.strip(),
                            variant.strip() or None,
                            int(manufacture_year),
                            purchase_date.isoformat(),
                            float(purchase_price),
                            float(asking_price) if asking_price > 0 else None,
                            int(kms_run),
                            float(battery_health),
                            condition_grade,
                            color.strip() or None,
                            registration_no.strip() or None,
                            chassis_no.strip() or None,
                            location.strip() or None,
                            status,
                            notes.strip() or None,
                        ),
                    )
                    conn.commit()
                    st.success("Bike added successfully.")
                    st.rerun()
                except sqlite3.IntegrityError as exc:
                    st.error(f"Could not add bike: {exc}")

    st.markdown("---")
    st.caption("Current Bike Register")
    bikes = query_df(
        conn,
        """
        SELECT
            id,
            ola_model,
            COALESCE(variant, '') AS variant,
            manufacture_year,
            purchase_date,
            CAST((julianday('now') - julianday(purchase_date)) / 30 AS INTEGER) AS age_months,
            purchase_price,
            COALESCE(asking_price, 0) AS asking_price,
            kms_run,
            COALESCE(battery_health_pct, 0) AS battery_health_pct,
            condition_grade,
            COALESCE(color, '') AS color,
            COALESCE(registration_no, '') AS registration_no,
            COALESCE(chassis_no, '') AS chassis_no,
            COALESCE(location, '') AS location,
            status,
            COALESCE(notes, '') AS notes
        FROM bikes
        ORDER BY id DESC
        """,
    )
    st.dataframe(bikes, use_container_width=True, hide_index=True)

    if not bikes.empty:
        st.markdown("#### Quick Status Update")
        bike_options = {
            f"#{int(row['id'])} | {row['ola_model']} {row['variant']} | {row['status']}": int(
                row["id"]
            )
            for _, row in bikes.iterrows()
        }
        selected_label = st.selectbox("Select Bike", options=list(bike_options.keys()))
        new_status = st.selectbox(
            "New Status", options=["in_stock", "reserved", "sold", "inactive"], key="bike_status_upd"
        )
        if st.button("Update Bike Status"):
            bike_id = bike_options[selected_label]
            conn.execute("UPDATE bikes SET status = ? WHERE id = ?", (new_status, bike_id))
            conn.commit()
            st.success("Bike status updated.")
            st.rerun()


def render_parties(conn: sqlite3.Connection) -> None:
    st.subheader("Buyer / Vendor Master")
    st.write("Maintain all potential buyers, dealers, and vendors in one place.")

    with st.form("add_party_form", clear_on_submit=True):
        c1, c2, c3 = st.columns(3)
        name = c1.text_input("Name *")
        party_type = c2.selectbox("Type *", options=["buyer", "vendor", "both"])
        phone = c3.text_input("Phone")

        c4, c5 = st.columns(2)
        email = c4.text_input("Email")
        city = c5.text_input("City")
        address = st.text_area("Address")
        notes = st.text_area("Notes", key="party_notes")

        submitted = st.form_submit_button("Add Party")
        if submitted:
            if not name.strip():
                st.error("Name is required.")
            else:
                conn.execute(
                    """
                    INSERT INTO parties (name, party_type, phone, email, city, address, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        name.strip(),
                        party_type,
                        phone.strip() or None,
                        email.strip() or None,
                        city.strip() or None,
                        address.strip() or None,
                        notes.strip() or None,
                    ),
                )
                conn.commit()
                st.success("Party added successfully.")
                st.rerun()

    st.markdown("---")
    parties = query_df(
        conn,
        """
        SELECT
            id,
            name,
            party_type,
            COALESCE(phone, '') AS phone,
            COALESCE(email, '') AS email,
            COALESCE(city, '') AS city,
            COALESCE(address, '') AS address,
            COALESCE(notes, '') AS notes
        FROM parties
        ORDER BY id DESC
        """,
    )
    st.dataframe(parties, use_container_width=True, hide_index=True)


def render_sales(conn: sqlite3.Connection) -> None:
    st.subheader("Sales")
    st.write("Create sale contracts and optionally capture advance amounts at booking time.")

    available_bikes = query_df(
        conn,
        """
        SELECT
            b.id,
            b.ola_model,
            COALESCE(b.variant, '') AS variant,
            b.kms_run,
            COALESCE(b.asking_price, b.purchase_price) AS suggested_price
        FROM bikes b
        LEFT JOIN sales s
            ON s.bike_id = b.id
            AND s.sale_status != 'cancelled'
        WHERE s.id IS NULL
          AND b.status IN ('in_stock', 'reserved')
        ORDER BY b.id DESC
        """,
    )
    buyers = query_df(
        conn,
        """
        SELECT id, name, party_type
        FROM parties
        ORDER BY name
        """,
    )

    if available_bikes.empty:
        st.info("No available bikes to sell. Add bikes first.")
    elif buyers.empty:
        st.info("No parties found. Add buyer/vendor details first.")
    else:
        bike_label_map: dict[str, int] = {}
        for _, row in available_bikes.iterrows():
            bike_label = (
                f"#{int(row['id'])} | {row['ola_model']} {row['variant']} "
                f"| {int(row['kms_run'])} km | Rs {float(row['suggested_price']):,.0f}"
            )
            bike_label_map[bike_label] = int(row["id"])

        buyer_label_map: dict[str, int] = {}
        for _, row in buyers.iterrows():
            label = f"#{int(row['id'])} | {row['name']} ({row['party_type']})"
            buyer_label_map[label] = int(row["id"])

        with st.form("add_sale_form", clear_on_submit=True):
            bike_label = st.selectbox("Bike *", options=list(bike_label_map.keys()))
            buyer_label = st.selectbox("Buyer / Vendor *", options=list(buyer_label_map.keys()))
            c1, c2, c3 = st.columns(3)
            listed_price = c1.number_input(
                "Listed Price (Rs)", min_value=0.0, value=0.0, step=1000.0
            )
            final_sale_price = c2.number_input(
                "Final Sale Price (Rs) *", min_value=0.0, value=0.0, step=1000.0
            )
            sale_date = c3.date_input("Sale Date", value=date.today())

            c4, c5 = st.columns(2)
            delivered_now = c4.checkbox("Delivery done now", value=False)
            delivery_date = c5.date_input("Delivery Date", value=date.today())
            capture_advance = st.checkbox("Record advance payment now", value=False)

            c6, c7 = st.columns(2)
            advance_amount = c6.number_input(
                "Advance Amount (Rs)", value=0.0, step=1000.0, disabled=not capture_advance
            )
            advance_mode = c7.selectbox(
                "Advance Mode",
                options=["cash", "upi", "bank_transfer", "card", "cheque", "other"],
                disabled=not capture_advance,
            )
            notes = st.text_area("Sale Notes")

            submitted = st.form_submit_button("Create Sale")
            if submitted:
                if final_sale_price <= 0:
                    st.error("Final Sale Price must be greater than 0.")
                else:
                    bike_id = bike_label_map[bike_label]
                    buyer_id = buyer_label_map[buyer_label]
                    delivery_value = delivery_date.isoformat() if delivered_now else None

                    try:
                        cursor = conn.execute(
                            """
                            INSERT INTO sales (
                                bike_id, buyer_id, listed_price, final_sale_price,
                                sale_date, delivery_date, sale_status, notes
                            ) VALUES (?, ?, ?, ?, ?, ?, 'open', ?)
                            """,
                            (
                                bike_id,
                                buyer_id,
                                float(listed_price) if listed_price > 0 else None,
                                float(final_sale_price),
                                sale_date.isoformat(),
                                delivery_value,
                                notes.strip() or None,
                            ),
                        )
                        sale_id = int(cursor.lastrowid)
                        conn.execute("UPDATE bikes SET status = 'reserved' WHERE id = ?", (bike_id,))

                        if capture_advance and advance_amount > 0:
                            conn.execute(
                                """
                                INSERT INTO payments (
                                    sale_id, payment_date, amount, payment_mode, payment_stage, reference_no, notes
                                ) VALUES (?, ?, ?, ?, 'advance', NULL, 'Captured during sale creation')
                                """,
                                (
                                    sale_id,
                                    sale_date.isoformat(),
                                    float(advance_amount),
                                    advance_mode,
                                ),
                            )

                        conn.commit()
                        sync_sale_status(conn, sale_id)
                        st.success(f"Sale #{sale_id} created successfully.")
                        st.rerun()
                    except sqlite3.IntegrityError as exc:
                        st.error(f"Could not create sale: {exc}")

    st.markdown("---")
    st.caption("Sales Register")
    sales = query_df(
        conn,
        """
        SELECT
            s.id AS sale_id,
            b.id AS bike_id,
            b.ola_model || ' ' || COALESCE(b.variant, '') AS bike,
            p.name AS buyer,
            s.sale_date,
            COALESCE(s.delivery_date, '') AS delivery_date,
            COALESCE(s.listed_price, 0) AS listed_price,
            s.final_sale_price,
            COALESCE(SUM(pay.amount), 0) AS received,
            s.final_sale_price - COALESCE(SUM(pay.amount), 0) AS balance,
            s.sale_status,
            COALESCE(s.notes, '') AS notes
        FROM sales s
        JOIN bikes b ON b.id = s.bike_id
        JOIN parties p ON p.id = s.buyer_id
        LEFT JOIN payments pay ON pay.sale_id = s.id
        GROUP BY
            s.id, b.id, b.ola_model, b.variant, p.name, s.sale_date, s.delivery_date,
            s.listed_price, s.final_sale_price, s.sale_status, s.notes
        ORDER BY s.id DESC
        """,
    )
    st.dataframe(sales, use_container_width=True, hide_index=True)


def render_payments(conn: sqlite3.Connection) -> None:
    st.subheader("Payment Tracker")
    st.write("Capture advance, installments, final settlements, and refunds.")

    sales_balance = query_df(
        conn,
        """
        SELECT
            s.id AS sale_id,
            b.ola_model || ' ' || COALESCE(b.variant, '') AS bike,
            p.name AS buyer,
            s.final_sale_price,
            COALESCE(SUM(pay.amount), 0) AS amount_received,
            s.final_sale_price - COALESCE(SUM(pay.amount), 0) AS balance,
            s.sale_status
        FROM sales s
        JOIN bikes b ON b.id = s.bike_id
        JOIN parties p ON p.id = s.buyer_id
        LEFT JOIN payments pay ON pay.sale_id = s.id
        WHERE s.sale_status != 'cancelled'
        GROUP BY s.id, b.ola_model, b.variant, p.name, s.final_sale_price, s.sale_status
        ORDER BY s.id DESC
        """
    )

    if sales_balance.empty:
        st.info("No sale contracts found. Create a sale first.")
    else:
        sale_label_map: dict[str, int] = {}
        for _, row in sales_balance.iterrows():
            label = (
                f"Sale #{int(row['sale_id'])} | {row['bike']} | {row['buyer']} "
                f"| Balance Rs {float(row['balance']):,.0f} | {row['sale_status']}"
            )
            sale_label_map[label] = int(row["sale_id"])

        with st.form("payment_form", clear_on_submit=True):
            sale_label = st.selectbox("Sale *", options=list(sale_label_map.keys()))
            c1, c2, c3 = st.columns(3)
            payment_date = c1.date_input("Payment Date", value=date.today())
            amount = c2.number_input("Amount (Rs)", value=0.0, step=500.0)
            payment_mode = c3.selectbox(
                "Payment Mode", options=["cash", "upi", "bank_transfer", "card", "cheque", "other"]
            )

            c4, c5 = st.columns(2)
            payment_stage = c4.selectbox(
                "Payment Stage", options=["advance", "installment", "final", "refund"]
            )
            reference_no = c5.text_input("Reference / Transaction ID")
            notes = st.text_area("Notes")
            submitted = st.form_submit_button("Add Payment")

            if submitted:
                sale_id = sale_label_map[sale_label]
                normalized_amount = float(amount)
                if payment_stage == "refund" and normalized_amount > 0:
                    normalized_amount = -normalized_amount

                if normalized_amount == 0:
                    st.error("Amount cannot be zero.")
                else:
                    conn.execute(
                        """
                        INSERT INTO payments (
                            sale_id, payment_date, amount, payment_mode, payment_stage, reference_no, notes
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            sale_id,
                            payment_date.isoformat(),
                            normalized_amount,
                            payment_mode,
                            payment_stage,
                            reference_no.strip() or None,
                            notes.strip() or None,
                        ),
                    )
                    conn.commit()
                    sync_sale_status(conn, sale_id)
                    st.success("Payment recorded successfully.")
                    st.rerun()

    st.markdown("---")
    st.caption("Latest Payments")
    latest_payments = query_df(
        conn,
        """
        SELECT
            p.id AS payment_id,
            p.sale_id,
            p.payment_date,
            p.amount,
            p.payment_mode,
            p.payment_stage,
            COALESCE(p.reference_no, '') AS reference_no,
            COALESCE(p.notes, '') AS notes
        FROM payments p
        ORDER BY p.id DESC
        LIMIT 200
        """
    )
    st.dataframe(latest_payments, use_container_width=True, hide_index=True)


def render_reports(conn: sqlite3.Connection) -> None:
    st.subheader("Reports")

    outstanding = query_df(
        conn,
        """
        SELECT
            s.id AS sale_id,
            s.sale_date,
            p.name AS buyer,
            b.ola_model || ' ' || COALESCE(b.variant, '') AS bike,
            s.final_sale_price AS contract_amount,
            COALESCE(SUM(pay.amount), 0) AS received_amount,
            s.final_sale_price - COALESCE(SUM(pay.amount), 0) AS balance_amount,
            CAST(julianday('now') - julianday(s.sale_date) AS INTEGER) AS days_since_sale
        FROM sales s
        JOIN bikes b ON b.id = s.bike_id
        JOIN parties p ON p.id = s.buyer_id
        LEFT JOIN payments pay ON pay.sale_id = s.id
        WHERE s.sale_status != 'cancelled'
        GROUP BY s.id, s.sale_date, p.name, b.ola_model, b.variant, s.final_sale_price
        HAVING s.final_sale_price - COALESCE(SUM(pay.amount), 0) > 0
        ORDER BY balance_amount DESC
        """
    )

    high_mileage = query_df(
        conn,
        """
        SELECT
            id AS bike_id,
            ola_model,
            COALESCE(variant, '') AS variant,
            kms_run,
            status,
            COALESCE(location, '') AS location
        FROM bikes
        WHERE kms_run >= 20000
        ORDER BY kms_run DESC
        """
    )

    low_mileage = query_df(
        conn,
        """
        SELECT
            id AS bike_id,
            ola_model,
            COALESCE(variant, '') AS variant,
            kms_run,
            status,
            COALESCE(location, '') AS location
        FROM bikes
        WHERE kms_run < 100
        ORDER BY kms_run ASC
        """
    )

    st.caption("Outstanding Amount Report")
    if outstanding.empty:
        st.success("No outstanding balances.")
    else:
        st.dataframe(outstanding, use_container_width=True, hide_index=True)
        st.download_button(
            label="Download Outstanding Report (CSV)",
            data=outstanding.to_csv(index=False).encode("utf-8"),
            file_name="outstanding_report.csv",
            mime="text/csv",
        )

    col1, col2 = st.columns(2)
    with col1:
        st.caption("Low KM Inventory (<100 km)")
        if low_mileage.empty:
            st.info("No bikes in this category.")
        else:
            st.dataframe(low_mileage, use_container_width=True, hide_index=True)
    with col2:
        st.caption("High KM Inventory (>=20,000 km)")
        if high_mileage.empty:
            st.info("No bikes in this category.")
        else:
            st.dataframe(high_mileage, use_container_width=True, hide_index=True)


def main() -> None:
    st.set_page_config(page_title="OLA Used EV Bike Sales Tracker", layout="wide")
    st.title("OLA Used EV Bike Sales Tracker")
    st.caption(
        "Inventory + sales + installment payments + dashboard for used EV 2-wheelers."
    )

    conn = get_conn()
    try:
        init_db(conn)
        sync_all_sales(conn)

        page = st.sidebar.radio(
            "Navigate",
            options=["Dashboard", "Bikes", "Parties", "Sales", "Payments", "Reports"],
        )

        if page == "Dashboard":
            render_dashboard(conn)
        elif page == "Bikes":
            render_bikes(conn)
        elif page == "Parties":
            render_parties(conn)
        elif page == "Sales":
            render_sales(conn)
        elif page == "Payments":
            render_payments(conn)
        else:
            render_reports(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
