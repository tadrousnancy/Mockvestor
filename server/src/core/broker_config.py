import os
from pathlib import Path
from dotenv import load_dotenv
from alpaca.broker.client import BrokerClient
from alpaca.data.historical import StockHistoricalDataClient

def get_broker_client():
    # set .env file path
    env_path = Path(__file__).parent / ".env"

    # load api and secret key
    load_dotenv(dotenv_path=env_path)

    # return broker client
    return BrokerClient(
        api_key=os.getenv("ALPACA_KEY"),
        secret_key=os.getenv("ALPACA_SECRET"),
        sandbox=True
    )

def get_data_client():
    # set .env file path
    env_path = Path(__file__).parent / ".env"

    # load api and secret key
    load_dotenv(dotenv_path=env_path)

    # return data client
    return StockHistoricalDataClient(
        api_key=os.getenv("ALPACA_KEY"),
        secret_key=os.getenv("ALPACA_SECRET"),
        sandbox=True
    )
