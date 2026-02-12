from __future__ import annotations

import sqlite3
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import altair as alt
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


def _format_rs(value: float) -> str:
    return f"Rs {value:,.0f}"


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
    st.subheader("Executive Dashboard")
    st.caption("Professional control view for sales, collections, and inventory movement.")

    st.markdown(
        """
        <style>
        div[data-testid="stMetric"] {
            border: 1px solid rgba(120, 120, 120, 0.22);
            border-radius: 12px;
            padding: 12px 14px;
            background-color: rgba(120, 120, 120, 0.03);
        }
        div[data-testid="stMetricValue"] {
            font-size: 1.35rem;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    bikes_df = query_df(
        conn,
        """
        SELECT
            id,
            ola_model,
            COALESCE(variant, '') AS variant,
            purchase_date,
            purchase_price,
            COALESCE(asking_price, purchase_price) AS asking_price,
            kms_run,
            COALESCE(battery_health_pct, 0) AS battery_health_pct,
            COALESCE(condition_grade, 'NA') AS condition_grade,
            COALESCE(location, 'Unassigned') AS location,
            status,
            CAST((julianday('now') - julianday(purchase_date)) / 30 AS INTEGER) AS age_months
        FROM bikes
        """
    )

    sales_df = query_df(
        conn,
        """
        SELECT
            s.id AS sale_id,
            s.sale_date,
            s.sale_status,
            COALESCE(s.listed_price, s.final_sale_price) AS listed_price,
            s.final_sale_price,
            b.id AS bike_id,
            b.ola_model,
            COALESCE(b.variant, '') AS variant,
            b.purchase_price,
            b.kms_run,
            COALESCE(b.location, 'Unassigned') AS location,
            COALESCE(p.name, 'Unknown') AS buyer
        FROM sales s
        JOIN bikes b ON b.id = s.bike_id
        LEFT JOIN parties p ON p.id = s.buyer_id
        """
    )

    payments_df = query_df(
        conn,
        """
        SELECT
            id AS payment_id,
            sale_id,
            payment_date,
            amount,
            payment_mode,
            payment_stage
        FROM payments
        """
    )

    if not bikes_df.empty:
        bikes_df["purchase_date"] = pd.to_datetime(bikes_df["purchase_date"], errors="coerce")
        bikes_df["purchase_price"] = pd.to_numeric(bikes_df["purchase_price"], errors="coerce").fillna(0.0)
        bikes_df["asking_price"] = pd.to_numeric(bikes_df["asking_price"], errors="coerce").fillna(0.0)
        bikes_df["kms_run"] = pd.to_numeric(bikes_df["kms_run"], errors="coerce").fillna(0)
        bikes_df["age_months"] = pd.to_numeric(bikes_df["age_months"], errors="coerce").fillna(0)

    if not sales_df.empty:
        sales_df["sale_date"] = pd.to_datetime(sales_df["sale_date"], errors="coerce")
        sales_df["final_sale_price"] = pd.to_numeric(
            sales_df["final_sale_price"], errors="coerce"
        ).fillna(0.0)
        sales_df["listed_price"] = pd.to_numeric(sales_df["listed_price"], errors="coerce").fillna(0.0)
        sales_df["purchase_price"] = pd.to_numeric(
            sales_df["purchase_price"], errors="coerce"
        ).fillna(0.0)

    if not payments_df.empty:
        payments_df["payment_date"] = pd.to_datetime(payments_df["payment_date"], errors="coerce")
        payments_df["amount"] = pd.to_numeric(payments_df["amount"], errors="coerce").fillna(0.0)

    if payments_df.empty:
        payment_rollup = pd.DataFrame({"sale_id": [], "received_amount": []})
    else:
        payment_rollup = (
            payments_df.groupby("sale_id", as_index=False)["amount"]
            .sum()
            .rename(columns={"amount": "received_amount"})
        )

    sales_ledger = sales_df.merge(payment_rollup, on="sale_id", how="left")
    if sales_ledger.empty:
        sales_ledger["received_amount"] = pd.Series(dtype=float)
        sales_ledger["balance_amount"] = pd.Series(dtype=float)
        sales_ledger["gross_margin"] = pd.Series(dtype=float)
    else:
        sales_ledger["received_amount"] = sales_ledger["received_amount"].fillna(0.0)
        sales_ledger["balance_amount"] = (
            sales_ledger["final_sale_price"] - sales_ledger["received_amount"]
        )
        sales_ledger["gross_margin"] = (
            sales_ledger["final_sale_price"] - sales_ledger["purchase_price"]
        )

    today = date.today()
    if not sales_ledger.empty and sales_ledger["sale_date"].notna().any():
        min_sale_date = sales_ledger["sale_date"].min().date()
        max_sale_date = sales_ledger["sale_date"].max().date()
    else:
        min_sale_date = today
        max_sale_date = today

    with st.container(border=True):
        st.markdown("##### Filters")
        f1, f2, f3, f4, f5 = st.columns([1.4, 1.8, 2.0, 2.0, 1.8])
        quick_range = f1.selectbox(
            "Quick Range",
            options=["All Time", "Last 30 Days", "Last 90 Days", "Year to Date"],
        )

        if quick_range == "Last 30 Days":
            default_start = max(min_sale_date, today - timedelta(days=29))
            default_end = min(max_sale_date, today)
        elif quick_range == "Last 90 Days":
            default_start = max(min_sale_date, today - timedelta(days=89))
            default_end = min(max_sale_date, today)
        elif quick_range == "Year to Date":
            default_start = max(min_sale_date, date(today.year, 1, 1))
            default_end = min(max_sale_date, today)
        else:
            default_start = min_sale_date
            default_end = max_sale_date

        if default_start > default_end:
            default_start = default_end

        max_filter_date = max(max_sale_date, today)
        selected_range = f2.date_input(
            "Sale Date Window",
            value=(default_start, default_end),
            min_value=min_sale_date,
            max_value=max_filter_date,
        )

        if isinstance(selected_range, tuple):
            start_date, end_date = selected_range
        elif isinstance(selected_range, list) and len(selected_range) == 2:
            start_date, end_date = selected_range[0], selected_range[1]
        else:
            start_date, end_date = selected_range, selected_range

        if start_date > end_date:
            start_date, end_date = end_date, start_date

        model_options = sorted(bikes_df["ola_model"].dropna().unique().tolist()) if not bikes_df.empty else []
        location_options = (
            sorted(bikes_df["location"].dropna().unique().tolist()) if not bikes_df.empty else []
        )
        status_options = ["open", "closed", "cancelled"]

        selected_models = f3.multiselect("Models", options=model_options, default=model_options)
        selected_locations = f4.multiselect(
            "Locations", options=location_options, default=location_options
        )
        selected_sale_status = f5.multiselect(
            "Sale Status", options=status_options, default=["open", "closed"]
        )

    filtered_bikes = bikes_df.copy()
    if not filtered_bikes.empty and selected_models:
        filtered_bikes = filtered_bikes[filtered_bikes["ola_model"].isin(selected_models)]
    if not filtered_bikes.empty and selected_locations:
        filtered_bikes = filtered_bikes[filtered_bikes["location"].isin(selected_locations)]

    filtered_sales = sales_ledger.copy()
    if not filtered_sales.empty and selected_models:
        filtered_sales = filtered_sales[filtered_sales["ola_model"].isin(selected_models)]
    if not filtered_sales.empty and selected_locations:
        filtered_sales = filtered_sales[filtered_sales["location"].isin(selected_locations)]
    if not filtered_sales.empty:
        sale_day = filtered_sales["sale_date"].dt.date
        filtered_sales = filtered_sales[(sale_day >= start_date) & (sale_day <= end_date)]
    if not filtered_sales.empty and selected_sale_status:
        filtered_sales = filtered_sales[filtered_sales["sale_status"].isin(selected_sale_status)]

    filtered_sale_ids = (
        filtered_sales["sale_id"].dropna().astype(int).tolist() if not filtered_sales.empty else []
    )
    if payments_df.empty or not filtered_sale_ids:
        filtered_payments = payments_df.iloc[0:0].copy()
    else:
        filtered_payments = payments_df[payments_df["sale_id"].isin(filtered_sale_ids)].copy()
        if not filtered_payments.empty:
            payment_day = filtered_payments["payment_date"].dt.date
            filtered_payments = filtered_payments[
                (payment_day >= start_date) & (payment_day <= end_date)
            ]

    valid_sales = (
        filtered_sales[filtered_sales["sale_status"] != "cancelled"].copy()
        if not filtered_sales.empty
        else filtered_sales
    )

    inventory_units = int(len(filtered_bikes))
    active_inventory = int(filtered_bikes["status"].isin(["in_stock", "reserved"]).sum()) if not filtered_bikes.empty else 0
    sold_inventory = int((filtered_bikes["status"] == "sold").sum()) if not filtered_bikes.empty else 0
    contracted_value = float(valid_sales["final_sale_price"].sum()) if not valid_sales.empty else 0.0
    received_value = float(valid_sales["received_amount"].sum()) if not valid_sales.empty else 0.0
    outstanding_value = float(valid_sales["balance_amount"].clip(lower=0).sum()) if not valid_sales.empty else 0.0
    projected_margin = float(valid_sales["gross_margin"].sum()) if not valid_sales.empty else 0.0
    avg_ticket = contracted_value / len(valid_sales) if not valid_sales.empty else 0.0
    collection_rate = (received_value / contracted_value * 100) if contracted_value > 0 else 0.0
    sell_through = (sold_inventory / inventory_units * 100) if inventory_units > 0 else 0.0
    open_deals = int((valid_sales["balance_amount"] > 0).sum()) if not valid_sales.empty else 0

    k1, k2, k3, k4, k5, k6 = st.columns(6)
    k1.metric("Inventory Units", f"{inventory_units:,}", delta=f"{active_inventory:,} active")
    k2.metric("Sell-through", f"{sell_through:.1f}%", delta=f"{sold_inventory:,} sold")
    k3.metric("Contracted Value", _format_rs(contracted_value), delta=f"{len(valid_sales):,} sales")
    k4.metric("Collections", _format_rs(received_value), delta=f"{collection_rate:.1f}% collected")
    k5.metric(
        "Outstanding",
        _format_rs(outstanding_value),
        delta=f"{open_deals:,} open deals",
        delta_color="inverse",
    )
    k6.metric("Projected Margin", _format_rs(projected_margin), delta=f"Avg ticket {_format_rs(avg_ticket)}")

    tab1, tab2, tab3 = st.tabs(
        ["Commercial Overview", "Inventory Intelligence", "Receivables Control"]
    )

    with tab1:
        left, right = st.columns([1.9, 1.1])
        with left:
            st.markdown("##### Contract vs Collection Trend")
            if valid_sales.empty and filtered_payments.empty:
                st.info("No commercial data for selected filters.")
            else:
                if valid_sales.empty:
                    monthly_contract = pd.DataFrame({"month": [], "Contracted": []})
                else:
                    monthly_contract = (
                        valid_sales.assign(month=valid_sales["sale_date"].dt.to_period("M").astype(str))
                        .groupby("month", as_index=False)["final_sale_price"]
                        .sum()
                        .rename(columns={"final_sale_price": "Contracted"})
                    )

                if filtered_payments.empty:
                    monthly_collection = pd.DataFrame({"month": [], "Collected": []})
                else:
                    monthly_collection = (
                        filtered_payments.assign(
                            month=filtered_payments["payment_date"].dt.to_period("M").astype(str)
                        )
                        .groupby("month", as_index=False)["amount"]
                        .sum()
                        .rename(columns={"amount": "Collected"})
                    )

                trend_df = pd.merge(monthly_contract, monthly_collection, on="month", how="outer").fillna(0.0)
                if trend_df.empty:
                    st.info("No trend points available.")
                else:
                    trend_df["month_date"] = pd.to_datetime(trend_df["month"] + "-01")
                    trend_df = trend_df.sort_values("month_date")
                    trend_long = trend_df.melt(
                        id_vars=["month", "month_date"],
                        value_vars=["Contracted", "Collected"],
                        var_name="Metric",
                        value_name="Amount",
                    )

                    trend_chart = (
                        alt.Chart(trend_long)
                        .mark_line(point=True, strokeWidth=3)
                        .encode(
                            x=alt.X("month_date:T", title="Month"),
                            y=alt.Y("Amount:Q", title="Amount (Rs)"),
                            color=alt.Color("Metric:N", title=None),
                            tooltip=[
                                alt.Tooltip("month:N", title="Month"),
                                alt.Tooltip("Metric:N", title="Metric"),
                                alt.Tooltip("Amount:Q", title="Amount", format=","),
                            ],
                        )
                        .properties(height=320)
                    )
                    st.altair_chart(trend_chart, use_container_width=True)

        with right:
            st.markdown("##### Collections by Payment Mode")
            if filtered_payments.empty:
                st.info("No payment records for selected filters.")
            else:
                mode_split = (
                    filtered_payments.groupby("payment_mode", as_index=False)["amount"]
                    .sum()
                    .sort_values("amount", ascending=False)
                )
                mode_chart = (
                    alt.Chart(mode_split)
                    .mark_bar(cornerRadiusTopRight=5, cornerRadiusBottomRight=5)
                    .encode(
                        x=alt.X("amount:Q", title="Amount (Rs)"),
                        y=alt.Y("payment_mode:N", sort="-x", title=None),
                        color=alt.Color("payment_mode:N", legend=None),
                        tooltip=[
                            alt.Tooltip("payment_mode:N", title="Mode"),
                            alt.Tooltip("amount:Q", title="Amount", format=","),
                        ],
                    )
                    .properties(height=160)
                )
                st.altair_chart(mode_chart, use_container_width=True)

            st.markdown("##### Top Models by Contract Value")
            if valid_sales.empty:
                st.info("No sales records for selected filters.")
            else:
                model_revenue = (
                    valid_sales.groupby("ola_model", as_index=False)["final_sale_price"]
                    .sum()
                    .rename(columns={"final_sale_price": "contracted_value"})
                    .sort_values("contracted_value", ascending=False)
                    .head(8)
                )
                st.dataframe(
                    model_revenue,
                    use_container_width=True,
                    hide_index=True,
                    column_config={
                        "ola_model": "Model",
                        "contracted_value": st.column_config.NumberColumn(
                            "Contracted (Rs)", format="%.0f"
                        ),
                    },
                )

    with tab2:
        upper_left, upper_right = st.columns([1.5, 1.5])
        with upper_left:
            st.markdown("##### Inventory Mix by Model and Status")
            if filtered_bikes.empty:
                st.info("No inventory data for selected filters.")
            else:
                inv_mix = (
                    filtered_bikes.groupby(["ola_model", "status"])
                    .size()
                    .reset_index(name="units")
                )
                mix_chart = (
                    alt.Chart(inv_mix)
                    .mark_bar()
                    .encode(
                        x=alt.X("ola_model:N", title="Model"),
                        y=alt.Y("units:Q", title="Units"),
                        color=alt.Color("status:N", title="Status"),
                        tooltip=[
                            alt.Tooltip("ola_model:N", title="Model"),
                            alt.Tooltip("status:N", title="Status"),
                            alt.Tooltip("units:Q", title="Units"),
                        ],
                    )
                    .properties(height=300)
                )
                st.altair_chart(mix_chart, use_container_width=True)

        with upper_right:
            st.markdown("##### Stock Age Buckets")
            if filtered_bikes.empty:
                st.info("No inventory data for selected filters.")
            else:
                age_bucketed = filtered_bikes.assign(
                    age_bucket=pd.cut(
                        filtered_bikes["age_months"],
                        bins=[-1, 3, 6, 12, 9999],
                        labels=["0-3 months", "4-6 months", "7-12 months", "12+ months"],
                        include_lowest=True,
                    )
                )
                age_mix = (
                    age_bucketed.groupby("age_bucket", as_index=False)
                    .size()
                    .rename(columns={"size": "units"})
                )
                age_chart = (
                    alt.Chart(age_mix)
                    .mark_bar(cornerRadiusTopLeft=5, cornerRadiusTopRight=5)
                    .encode(
                        x=alt.X("age_bucket:N", title="Age"),
                        y=alt.Y("units:Q", title="Units"),
                        color=alt.value("#2f80ed"),
                        tooltip=[
                            alt.Tooltip("age_bucket:N", title="Bucket"),
                            alt.Tooltip("units:Q", title="Units"),
                        ],
                    )
                    .properties(height=300)
                )
                st.altair_chart(age_chart, use_container_width=True)

        st.markdown("##### Active Stock Pricing vs KM Run")
        active_stock = (
            filtered_bikes[filtered_bikes["status"].isin(["in_stock", "reserved"])].copy()
            if not filtered_bikes.empty
            else filtered_bikes
        )
        if active_stock.empty:
            st.info("No active stock available for selected filters.")
        else:
            active_stock["bike_label"] = (
                active_stock["ola_model"] + " " + active_stock["variant"].fillna("").str.strip()
            ).str.strip()
            scatter_chart = (
                alt.Chart(active_stock)
                .mark_circle(size=95, opacity=0.8)
                .encode(
                    x=alt.X("kms_run:Q", title="KM Run"),
                    y=alt.Y("asking_price:Q", title="Asking Price (Rs)"),
                    color=alt.Color("condition_grade:N", title="Condition"),
                    tooltip=[
                        alt.Tooltip("id:Q", title="Bike ID"),
                        alt.Tooltip("bike_label:N", title="Bike"),
                        alt.Tooltip("kms_run:Q", title="KM", format=","),
                        alt.Tooltip("asking_price:Q", title="Asking Price", format=","),
                        alt.Tooltip("battery_health_pct:Q", title="Battery %", format=".1f"),
                        alt.Tooltip("age_months:Q", title="Age (Months)"),
                        alt.Tooltip("location:N", title="Location"),
                    ],
                )
                .properties(height=320)
                .interactive()
            )
            st.altair_chart(scatter_chart, use_container_width=True)

    with tab3:
        open_receivables = (
            valid_sales[valid_sales["balance_amount"] > 0].copy() if not valid_sales.empty else valid_sales
        )
        st.markdown("##### Receivable Aging")
        if open_receivables.empty:
            st.success("No outstanding balances for selected filters.")
        else:
            open_receivables["days_since_sale"] = (
                pd.Timestamp.now().normalize() - open_receivables["sale_date"]
            ).dt.days.clip(lower=0)
            open_receivables["aging_bucket"] = pd.cut(
                open_receivables["days_since_sale"],
                bins=[-1, 15, 30, 60, 99999],
                labels=["0-15 days", "16-30 days", "31-60 days", "60+ days"],
                include_lowest=True,
            )
            aging_mix = (
                open_receivables.groupby("aging_bucket", as_index=False)["balance_amount"]
                .sum()
                .sort_values("aging_bucket")
            )

            aging_chart = (
                alt.Chart(aging_mix)
                .mark_bar(cornerRadiusTopLeft=5, cornerRadiusTopRight=5)
                .encode(
                    x=alt.X("aging_bucket:N", title="Age Bucket"),
                    y=alt.Y("balance_amount:Q", title="Outstanding (Rs)"),
                    color=alt.value("#eb5757"),
                    tooltip=[
                        alt.Tooltip("aging_bucket:N", title="Bucket"),
                        alt.Tooltip("balance_amount:Q", title="Outstanding", format=","),
                    ],
                )
                .properties(height=280)
            )
            st.altair_chart(aging_chart, use_container_width=True)

            table_df = (
                open_receivables[
                    [
                        "sale_id",
                        "buyer",
                        "ola_model",
                        "variant",
                        "sale_date",
                        "final_sale_price",
                        "received_amount",
                        "balance_amount",
                        "days_since_sale",
                    ]
                ]
                .copy()
                .sort_values("balance_amount", ascending=False)
            )
            table_df["bike"] = (table_df["ola_model"] + " " + table_df["variant"]).str.strip()
            table_df["sale_date"] = table_df["sale_date"].dt.date
            table_df = table_df.rename(
                columns={
                    "sale_id": "Sale ID",
                    "buyer": "Buyer",
                    "sale_date": "Sale Date",
                    "final_sale_price": "Contract (Rs)",
                    "received_amount": "Received (Rs)",
                    "balance_amount": "Balance (Rs)",
                    "days_since_sale": "Days Open",
                }
            )[
                [
                    "Sale ID",
                    "Buyer",
                    "bike",
                    "Sale Date",
                    "Contract (Rs)",
                    "Received (Rs)",
                    "Balance (Rs)",
                    "Days Open",
                ]
            ]
            st.markdown("##### High-Risk Open Deals")
            st.dataframe(
                table_df.head(20),
                use_container_width=True,
                hide_index=True,
            )

    decision_signals: list[str] = []
    if outstanding_value > 0:
        decision_signals.append(
            f"Follow up outstanding receivables of {_format_rs(outstanding_value)} across {open_deals} deals."
        )
    if collection_rate < 70 and contracted_value > 0:
        decision_signals.append(
            "Collection efficiency is below 70%; tighten advance policy for new bookings."
        )
    if active_inventory > sold_inventory:
        decision_signals.append(
            "Active stock is higher than sold stock; prioritize high-mileage discount campaigns."
        )
    if decision_signals:
        st.markdown("##### Decision Signals")
        for signal in decision_signals:
            st.write(f"- {signal}")


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
