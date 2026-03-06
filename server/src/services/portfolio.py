from pypfopt import EfficientFrontier, risk_models, expected_returns
from pypfopt.discrete_allocation import DiscreteAllocation, get_latest_prices


def optimize_portfolio(df, portfolio_value):
    """
    Must have at least 2 holdings
    Calculates weights for each holding
    Suggests how much of each stock to allocate to
        e.g. 30% GOOGL,
             25% NVDA,
             25% AMZN,
             20% AAPL

    :param df: returned dataframe from account_service.get_market_data()
    :param portfolio_value: how much money the user has (in dollars)
    :return allocation: list of each stock and how much they should be allocated
        denoted by [stock_name, value(%)]
    :return leftover: remainder of portfolio value that can't be distributed further
    """

    if len(df.columns) < 2:
        raise ValueError("Portfolio needs at least 2 holdings!")

    try:
        # calculate expected returns and sample covariance
        mu = expected_returns.mean_historical_return(df)
        S = risk_models.sample_cov(df)

        # maximize sharpe ratio
        ef = EfficientFrontier(mu, S)
        ef.max_sharpe()

        # clean weights
        cleaned_weights = ef.clean_weights()

        # print results (for debugging)
        exp_return, volatility, sharpe = ef.portfolio_performance(verbose=True)
    except Exception as e:
        raise ValueError(f"Optimization failed: {e}") from e

    # convert weights to allocation
    latest_prices = get_latest_prices(df)
    da = DiscreteAllocation(cleaned_weights, latest_prices, total_portfolio_value=portfolio_value)
    allocation, leftover = da.greedy_portfolio()

    # for debugging
    for name, value in allocation.items():
        print(f"{name}: {value}")
    print("Funds remaining: ${:.2f}".format(leftover))

    return allocation, leftover
