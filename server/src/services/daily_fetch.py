import os
import sys
import csv
import uuid
import time
import traceback
import requests
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional
from pathlib import Path

from dotenv import load_dotenv
from sqlmodel import SQLModel, create_engine, Session, Field, select
from sqlalchemy import Column, Numeric, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, insert
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException

#-------------------------------------------------------------
# Database Models
#-------------------------------------------------------------
class DailyMarketSummary(SQLModel, table=True):
    __tablename__ = "daily_market_summaries"

    id: Optional[uuid.UUID] = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            primary_key=True,
            server_default="gen_random_uuid()"
        )
    )
    ticker: str = Field(index=True)
    trading_date: date = Field(index=True)
    open_price: Optional[Decimal] = Field(sa_column=Column(Numeric(20, 4)))
    high_price: Optional[Decimal] = Field(sa_column=Column(Numeric(20, 4)))
    low_price: Optional[Decimal] = Field(sa_column=Column(Numeric(20, 4)))
    close_price: Optional[Decimal] = Field(sa_column=Column(Numeric(20, 4)))
    volume: Optional[Decimal] = Field(sa_column=Column(Numeric(20, 0)))
    vwap: Optional[Decimal] = Field(sa_column=Column(Numeric(20, 4)))
    num_transactions: Optional[int]
    is_otc: bool = False
    unix_timestamp: Optional[int]
    created_at: Optional[datetime] = Field(sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False))


#-------------------------------------------------------------
# Environment & Database Setup
#-------------------------------------------------------------
# set path to .env file
env_path = Path(__file__).parent.parent / "core" / ".env"

# load .env file
load_dotenv(dotenv_path=env_path)

# get database info
db_url = os.getenv("DATABASE_URL")
massive = os.getenv("MASSIVE")

engine = create_engine(db_url, echo=False, pool_pre_ping=True)

#-------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------
# Limit tickers to SP500 & a few ETFs
def load_approved_tickers(filename: str = "tickers.csv") -> set:
    approved = set()
    csv_path = Path(__file__).parent / filename
    print(csv_path)

    try:
        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.reader(f)
            for row in reader:
                for item in row:
                    if row:  # skip empty lines
                        ticker = item.strip().upper()
                        # Ignore the header if it exists
                        if ticker not in ('TICKER', 'SYMBOL', 'TICKERS'):
                            approved.add(ticker)
    except FileNotFoundError:
        logger.warning(f"Warning: {filename} not found in {Path(__file__).parent}. Proceeding with empty approved list.")

    return approved

# Update database with daily OHLC data
def sync_data(target_date: str):
    # fetch from  Massive
    url = f"https://api.massive.com/v2/aggs/grouped/locale/us/market/stocks/{target_date}"
    response = requests.get(url, params={"apiKey": massive, "include_otc": "false"})
    results = response.json().get("results", [])
    unique_results = {item["T"]: item for item in results}
    deduplicated_items = list(unique_results.values())
    approved_tickers = load_approved_tickers("tickers.csv")

    clean_universe_items = [
        item for item in deduplicated_items
        if item["T"] in approved_tickers
    ]

    if not clean_universe_items:
        print(f"No approved tickers found in the API response for {target_date}.")
        return

    # prepare data for SQLModel
    data_to_insert = [
        {
            "ticker": item["T"],
            "trading_date": date.fromisoformat(target_date),
            "open_price": Decimal(str(item.get("o"))) if item.get("o") else None,
            "high_price": Decimal(str(item.get("h"))) if item.get("h") else None,
            "low_price": Decimal(str(item.get("l"))) if item.get("l") else None,
            "close_price": Decimal(str(item.get("c"))) if item.get("c") else None,
            "volume": item.get("v", 0),
            "vwap": Decimal(str(item.get("vw"))) if item.get("vw") else None,
            "num_transactions": item.get("n"),
            "unix_timestamp": item.get("t"),
            "is_otc": item.get("otc", False),
        }
        for item in clean_universe_items
    ]

    # perform upsert for better data inser performance
    chunk_size = 5000
    with Session(engine) as session:
        try:
            # Loop through the data in chunks
            for i in range(0, len(data_to_insert), chunk_size):
                chunk = data_to_insert[i:i + chunk_size]

                # postgresql native 'ON CONFLICT DO UPDATE'
                stmt = insert(DailyMarketSummary).values(chunk)

                # We now point EXACTLY to the name we created in SQL
                upsert_stmt = stmt.on_conflict_do_update(
                    constraint="market_data_unique_row",
                    set_={
                        "open_price": stmt.excluded.open_price,
                        "high_price": stmt.excluded.high_price,
                        "low_price": stmt.excluded.low_price,
                        "close_price": stmt.excluded.close_price,
                        "volume": stmt.excluded.volume,
                        "vwap": stmt.excluded.vwap,
                        "num_transactions": stmt.excluded.num_transactions,
                        "unix_timestamp": stmt.excluded.unix_timestamp
                    }
                )
                session.execute(upsert_stmt)

            # Commit the transaction only if all chunks are successful
            session.commit()
            print("Sync successful!")

        except SQLAlchemyError as e:
            session.rollback()
            print(f"DATABASE ERROR DETECTED:{str(e)}")
        except Exception as e:
            session.rollback()
            print("AN UNEXPECTED ERROR OCCURRED:")
            traceback.print_exc()

    # DEBUGGING TO DETERMINE FAILURE POINT
    #chunk_size = 1
    #with Session(engine) as session:
    #    for i in range(0, len(data_to_insert), chunk_size):
    #        chunk = data_to_insert[i:i + chunk_size]
    #
    #        stmt = insert(DailyMarketSummary).values(chunk)
    #        upsert_stmt = stmt.on_conflict_do_update(
    #            constraint="market_data_unique_row",
    #            set_={
    #                "open_price": stmt.excluded.open_price,
    #                "high_price": stmt.excluded.high_price,
    #                "low_price": stmt.excluded.low_price,
    #                "close_price": stmt.excluded.close_price,
    #                "volume": stmt.excluded.volume,
    #                "vwap": stmt.excluded.vwap,
    #                "num_transactions": stmt.excluded.num_transactions,
    #                "unix_timestamp": stmt.excluded.unix_timestamp
    #            }
    #        )
    #
    #        try:
    #            # Execute and commit row-by-row just for debugging
    #            session.execute(upsert_stmt)
    #            session.commit()
    #        except SQLAlchemyError as e:
    #            session.rollback()
    #            print("\n" + "="*50)
    #            print(f"🔥 CRASH DETECTED ON TICKER: {chunk[0].get('ticker')}")
    #            print("="*50)
    #            print(f"EXACT DATA PAYLOAD:\n{chunk[0]}\n")
    #
    #            # e.orig strips away the SQLAlchemy wrapper and shows the raw Postgres error
    #            print(f"SPECIFIC POSTGRES ERROR:\n{getattr(e, 'orig', e)}")
    #            print("="*50 + "\n")
    #
    #            # Stop the script immediately so you can read the error
    #            sys.exit(1)

    print(f"Successfully synced {len(data_to_insert)} rows for {target_date}")

def get_historical_chart_data(db: Session, ticker: str):
    """
    Query the database for hitorical OHLCV data to power charts
    """

    try:
        statement = select(DailyMarketSummary).where(
            DailyMarketSummary.ticker == ticker.upper()
        ).order_by(DailyMarketSummary.trading_date.asc())

        # Debugging print
        print("🚨🚨🚨Reaching in for history🚨🚨🚨")

        results = db.scalars(statement).all()

        if not results:
            raise HTTPException(
                status_code=404,
                detail=f"No historical data found for {ticker}"
            )

        chart_data = []
        for row in results:
            chart_data.append({
                "date": row.trading_date.isoformat(),
                "open": float(row.open_price),
                "close": float(row.close_price),
                "high": float(row.high_price),
                "low": float(row.low_price),
                "volume": int(row.volume)
            })

        return {
            "symbol": ticker.upper(),
            "data_points": len(chart_data),
            "chart_data": chart_data
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"🚨 DB QUERY ERROR: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve historical data"
        )

if __name__ == "__main__":
    if len(sys.argv) > 1:
        date_to_sync = sys.argv[1]
    else:
        date_to_sync = (date.today() - timedelta(days=1)).isoformat()

    print(f"Executing daily automated sync for date: {date_to_sync}")
    sync_data(date_to_sync)

    #date_to_sync = date.today().isoformat()
    #print(f"Executing daily automated sync for date: {date_to_sync}")
    #sync_data(date_to_sync)
#-------------------------------------------------------------
# Previously used block to fill in 2 years worth of data
#-------------------------------------------------------------
    #today = date.today()
    #start_date = today - timedelta(days=2*365 + (1 if today.month > 2 and today.year % 4 == 0 else 0))
    #two_years_ago = date(today.year - 2, today.month, today.day)
    #one_day = timedelta(days=1)
    #current_date = start_date
    #count = 0
    #
    #while current_date <= today:
    #    print(f"Running data sync for {str(current_date)}...")
    #    sync_data(str(current_date))
    #
    #    current_date += one_day
    #    count += 1
    #
    #    if count == 5:
    #        time.sleep(60)
    #        count = 0
