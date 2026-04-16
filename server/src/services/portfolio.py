from pypfopt import EfficientFrontier, risk_models, expected_returns
from pypfopt.discrete_allocation import DiscreteAllocation, get_latest_prices
from daily_fetch import engine
from sqlmodel import text
import pandas as pd


def get_market_data(holdings):
    """
    Retrieves stock market data from the current daily market summary
    :param holdings: current stocks the user is invested in
    :return prices: dataframe compatible with PyPortfolioOpt
    """

    # query for current holdings
    query = text("""
        SELECT trading_date, ticker, close_price 
        FROM daily_market_summaries
        WHERE ticker IN :holdings
            AND trading_date >= NOW() - INTERVAL '4 years'
    """)
    df = pd.read_sql(query, engine, params={"holdings": tuple(holdings)})
    prices = (df.pivot(index="trading_date", columns="ticker", values="close_price")
              .sort_index()
              .astype(float)
              .dropna())
    return prices


def optimize_portfolio(prices, portfolio_value):
    """
    Must have at least 2 holdings
    Calculates weights for each holding
    Suggests how much of each stock to allocate to

    :param prices: returned dataframe from get_market_data()
    :param portfolio_value: how much money the user has (in dollars)

    :return total_allocation: dictionary listing each ticker and how much should be allocated
        e.g. { "AAPL": {"shares": 7, "weight": 0.35},
               "GOOGL": {"shares": 5, "weight": 0.25},
               "NVDA": {"shares": 8, "weight": 0.40} }
    :return leftover: remainder of portfolio value that can't be distributed further (in $)
    """

    if len(prices.columns) < 2:
        raise ValueError("Portfolio needs at least 2 holdings!")

    try:
        # calculate expected returns and sample covariance
        mu = expected_returns.mean_historical_return(prices)
        S = risk_models.sample_cov(prices)

        # maximize sharpe ratio
        ef = EfficientFrontier(mu, S, weight_bounds=(0.10, 0.4))
        ef.min_volatility()

        # clean weights
        cleaned_weights = ef.clean_weights()

    except Exception as e:
        raise ValueError(f"Optimization failed: {e}") from e

    # convert weights to allocated shares
    latest_prices = get_latest_prices(prices)
    da = DiscreteAllocation(cleaned_weights, latest_prices, total_portfolio_value=portfolio_value)
    allocation, leftover = da.greedy_portfolio()

    # include weights in allocation
    total_allocation = {}
    for ticker, shares in allocation.items():
        total_allocation[ticker] = {
            "shares": shares,
            "weight": cleaned_weights.get(ticker, 0)
        }

    return total_allocation, leftover


# debugging
# if __name__ == '__main__':
#     holdings = ["NVDA", "AAPL", "QQQ", "ORCL", "SPY", "NFLX", "LLY"]
#     df = get_market_data(holdings)
#     total, remainder = optimize_portfolio(df, 50000)
#
#     print("-------------------------------------------")
#     print("Recommendation:")
#     print("-------------------------------------------")
#     for i in total:
#         print(i, total[i])
#     print("-------------------------------------------")
#     print(f"Leftover: ${remainder}")
#     print("-------------------------------------------")
