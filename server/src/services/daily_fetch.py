import os
import sys
import csv
import uuid
import time
import traceback
import requests
import yfinance as yf
import pandas as pd
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional
from pathlib import Path

from dotenv import load_dotenv
from sqlmodel import SQLModel, create_engine, Session, Field, select
from sqlalchemy import Column, Numeric, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, insert
from sqlalchemy.exc import SQLAlchemyError

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

class TickerMetadata(SQLModel, table=True):
    __tablename__ = "ticker_metadata"

    ticker: str = Field(primary_key=True)
    sector: Optional[str] = None
    industry: Optional[str] = None
    market_cap: Optional[float] = None


#-------------------------------------------------------------
# Environment & Database Setup
#-------------------------------------------------------------
# set path to .env file
env_path = Path(__file__).parent.parent / ".env"
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
        with open(csv_path, mode='r', encoding='utf-8-sig') as f:
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

def sync_vix(target_date: str):
    """
    Add the Cboe Volatility Index to the database (for LightGBM)
    Current Massive plan does not support VIX, so Yahoo Finance is used
    """

    end_date = (date.fromisoformat(target_date) + timedelta(days=1)).isoformat()

    vix = yf.download("^VIX", start=target_date, end=end_date, progress=False, timeout=3)
    if vix.empty:
        print(f"No VIX data for {target_date}")
        return

    if isinstance(vix.columns, pd.MultiIndex):
        vix.columns = vix.columns.get_level_values(0)

    row = vix.iloc[0]
    data_to_insert = [
        {
            "ticker": "VIX",
            "trading_date": date.fromisoformat(target_date),
            "open_price": Decimal(str(round(float(row["Open"]), 4))),
            "high_price": Decimal(str(round(float(row["High"]), 4))),
            "low_price": Decimal(str(round(float(row["Low"]), 4))),
            "close_price": Decimal(str(round(float(row["Close"]), 4))),
            "volume": 0,
            "vwap": None,
            "num_transactions": None,
            "is_otc": False,
            "unix_timestamp": None
        }
    ]

    with Session(engine) as session:
        stmt = insert(DailyMarketSummary).values(data_to_insert)
        upsert_stmt = stmt.on_conflict_do_update(
            constraint="market_data_unique_row",
            set_={
                "open_price": stmt.excluded.open_price,
                "high_price": stmt.excluded.high_price,
                "low_price": stmt.excluded.low_price,
                "close_price": stmt.excluded.close_price
            }
        )
        session.execute(upsert_stmt)
        session.commit()
        print(f"VIX synced for {target_date}")

def populate_ticker_metadata():
    with Session(engine) as session:
        existing = session.exec(select(TickerMetadata.ticker)).all()
        existing_tickers = set(existing)

    # only check for new tickers
    approved_tickers = load_approved_tickers("tickers.csv")
    print(approved_tickers)
    new_tickers = [t for t in approved_tickers if t not in existing_tickers]
    if not new_tickers:
        print("No new tickers to populate")
        return

    with Session(engine) as session:
        for ticker in new_tickers:
            try:
                url = f"https://api.massive.com/v3/reference/tickers/{ticker}"
                response = requests.get(url, params={"apiKey": massive})
                result = response.json()
                data = result.get("results", None)
                if data is None:
                    print(f"No data found for {ticker}")
                    continue

                session.add(TickerMetadata(
                    ticker=ticker,
                    sector=data.get("sic_description", None),
                    industry=data.get("sic_code", None),
                    market_cap=data.get("market_cap", None)
                ))
                print(f"{ticker} added successfully")
            except Exception as e:
                print(f"Failed {ticker}: {e}")
        session.commit()
        print("Complete")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "populate_metadata":
            print("Populating ticker metadata")
            populate_ticker_metadata()
        else:
            date_to_sync = sys.argv[1]
            print(f"Executing daily automated sync for date: {date_to_sync}")
            sync_data(date_to_sync)
            sync_vix(date_to_sync)
    else:
        date_to_sync = (date.today() - timedelta(days=1)).isoformat()
        print(f"Executing daily automated sync for date: {date_to_sync}")
        sync_data(date_to_sync)

    # populate_ticker_metadata()

    #date_to_sync = date.today().isoformat()
    #print(f"Executing daily automated sync for date: {date_to_sync}")
    #sync_data(date_to_sync)
#-------------------------------------------------------------
# Previously used block to fill in 7 years worth of data
#-------------------------------------------------------------
    today = date.today()
    start_date = today - timedelta(days=7*365 + (1 if today.month > 2 and today.year % 4 == 0 else 0))
    seven_years_ago = date(today.year - 7, today.month, today.day)
    one_day = timedelta(days=1)
    current_date = start_date
    count = 0

    while current_date <= today:
        print(f"Running data sync for {str(current_date)}...")
        sync_vix(str(current_date))

        current_date += one_day
        count += 1

        # if count == 5:
        #     time.sleep(60)
        #     count = 0
