import joblib
import pandas as pd
import numpy as np
import shap
from pathlib import Path
from src.services.daily_fetch import engine
from sqlalchemy import text
from src.services.features import Features


def sort_by_importance(shap_values):
    """
    Takes the features from the shap values, and reorders them so the top 3 (most impactful) are given

    :param shap_values: indicates the importance of a feature on the model's prediction
    :return features: most impactful features on the model's prediction
    """

    mean_shap = np.abs(shap_values.values).mean(axis=0)
    top3_idx = np.argsort(mean_shap)[::-1][:3]
    features = [shap_values.feature_names[i] for i in top3_idx]
    return features


class Feedback:
    def __init__(self):
        oneDay_model_path = Path(__file__).parent.parent / "models" / "LGBM_1d.joblib"
        fiveDay_model_path = Path(__file__).parent.parent / "models" / "LGBM_5d.joblib"
        twentyOneDay_model_path = Path(__file__).parent.parent / "models" / "LGBM_21d.joblib"
        #self.model_1d = joblib.load("../models/LGBM_1d.joblib")
        #self.model_5d = joblib.load("../models/LGBM_5d.joblib")
        #self.model_21d = joblib.load("../models/LGBM_21d.joblib")
        self.model_1d = joblib.load(oneDay_model_path)
        self.model_5d = joblib.load(fiveDay_model_path)
        self.model_21d = joblib.load(twentyOneDay_model_path)
        self.feature_labels = {
            "return_1d": "Return Since Yesterday",
            "return_5d": "Return Since Last Week",
            "return_21d": "Return Since Last Month",
            "volatility_10d": "Volatility Over Last 2 Weeks",
            "volatility_21d": "Volatility Over Last Month",
            "volatility_42d": "Volatility Over Last 2 Months",
            "volatility_ratio": "Volatility Ratio",
            "hl_spread": "High-Low Spread",
            "hl_pct": "High-Low Percentage",
            "atr": "Average True Range",
            "park_10d": "Volatility Over Last 2 Weeks",
            "volume_ratio": "Volume Ratio",
            "rsi": "Relative Strength Index",
            "vwap_dev": "Volume-Weighted Average Price Deviation",
            "dist_from_52w_high": "Distance From Yearly High",
            "gap": "Overnight Gap",
            "upper_shadow": "Upper Shadow",
            "lower_shadow": "Lower Shadow",
            "vol_vs_vix": "VIX vs. Actual Volatility",
            "corr_to_spy": "Correlation to S&P 500",
            "beta": "Beta Volatility",
            "down_dev": "Downside Deviation",
            "max_dd_10d": "Max Drawdown Over Last 2 Weeks",
            "vix_level": "VIX Level",
            "vix_ratio": "VIX Ratio",
            "spy_return_1d": "S&P 500 Return Since Yesterday",
        }

    def explain_preds(self, X_test):
        """
        Explains why the model made its predictions

        :param X_test: data the model made predictions on
        :return feats_1d, feats_5d, feats_21d: feature labels for each prediction:
            e.g. ["Return Since Yesterday", "Overnight Gap", "Volume Ratio"]
        """

        # create explainer objects
        explainer_1d = shap.TreeExplainer(self.model_1d)
        explainer_5d = shap.TreeExplainer(self.model_5d)
        explainer_21d = shap.TreeExplainer(self.model_21d)

        # calculate SHAP values
        shap_vals_1d = explainer_1d(X_test)
        shap_vals_5d = explainer_5d(X_test)
        shap_vals_21d = explainer_21d(X_test)

        # top 3 features impacting volatility predictions
        feats_1d = sort_by_importance(shap_vals_1d)
        feats_5d = sort_by_importance(shap_vals_5d)
        feats_21d = sort_by_importance(shap_vals_21d)

        # relabel each feature for UI readability
        feats_1d = [self.feature_labels[i] for i in feats_1d]
        feats_5d = [self.feature_labels[i] for i in feats_5d]
        feats_21d = [self.feature_labels[i] for i in feats_21d]

        # visuals for debugging
        # shap.summary_plot(shap_vals_1d, X_test, feature_names=shap_vals_1d.feature_names)
        # shap.summary_plot(shap_vals_5d, X_test, feature_names=shap_vals_1d.feature_names)
        # shap.summary_plot(shap_vals_21d, X_test, feature_names=shap_vals_1d.feature_names)

        return feats_1d, feats_5d, feats_21d

    def predict_risk(self, ticker):
        """
        Predicts the future volatility of a stock after the user makes a trade

        :param ticker: the stock the user just traded
        :return future_preds: dictionary listing the stock's expected volatility and range N days in the future
            e.g. {"1d": [volatility, low, high, vol_elevation],
                  "5d": [volatility, low, high, vol_elevation],
                  "21d": [volatility, low, high, vol_elevation]}
        :return risk_level: overall riskiness of a trade (Low, Medium, High, or Very High)
        """

        # query for the traded stock from database
        query = text("""
            SELECT ticker, trading_date, open_price, high_price, low_price, close_price, volume, vwap
            FROM daily_market_summaries
            WHERE ticker = :ticker
            ORDER BY trading_date
        """)
        X_test = pd.read_sql(query, engine, params={"ticker": ticker})
        feat = Features()
        X_test = feat.calculate_features(X_test)
        X_test = feat.order_features(X_test)[0]

        current_price = float(X_test["close_price"].iloc[-1])
        trading_date = X_test['trading_date'].max()

        # drop unnecessary columns
        X_test = X_test.drop(columns=["ticker", "trading_date", "open_price",
                                      "high_price", "low_price", "close_price",
                                      "volume", "vwap", "spy_close", "vix_close"])

        # make predictions
        Y_pred_1d = self.model_1d.predict(X_test)
        Y_pred_5d = self.model_5d.predict(X_test)
        Y_pred_21d = self.model_21d.predict(X_test)
        top_features = self.explain_preds(X_test)

        # estimate volatility levels
        vol_1d = float(Y_pred_1d[-1])
        vol_5d = float(Y_pred_5d[-1])
        vol_21d = float(Y_pred_21d[-1])

        # determine volatility levels and range
        print(f"Predicted volatility for: {ticker}...")
        print(f"Current price: ${current_price:.2f}")
        print(f"Date: {trading_date}")
        print("----------------------")

        i = 0
        total_points = 0
        future_preds = {"1d": [vol_1d],
                        "5d": [vol_5d],
                        "21d": [vol_21d]}
        for label, vol in future_preds.items():
            days = int(label[:-1])
            move = float(vol[0] * np.sqrt(days))
            low = current_price * (1 - move)
            high = current_price * (1 + move)

            future_preds[label][0] = move
            future_preds[label].append(low)
            future_preds[label].append(high)

            # allocate points (riskiness) for each prediction
                # 1 - low, 2 - medium, 3 - high, 4 - very high
            # weighted as so:
                # daily - 40%, weekly - 35%, monthly - 25%
            weight = {"1d": 0.4, "5d": 0.35, "21d": 0.25}
            thresholds = {"1d": [0.01, 0.02, 0.04],
                          "5d": [0.02, 0.04, 0.08],
                          "21d": [0.04, 0.08, 0.15]}
            day_range = thresholds[label]
            if move < day_range[0]:
                total_points += weight[label]
                level = "Low"
            elif (move >= day_range[0]) and (move < day_range[1]):
                total_points += 2 * weight[label]
                level = "Moderate"
            elif (move >= day_range[1]) and (move < day_range[2]):
                total_points += 3 * weight[label]
                level = "High"
            else:
                total_points += 4.0 * weight[label]
                level = "Very High"
            future_preds[label].append(level)

            print(f"{label} Expected Volatility: {move:.2%} ({level}) | Expected Range: ${low:.2f} - ${high:.2f}")
            print(f"Determined By: {top_features[i][0]}")
            print(f"               {top_features[i][1]}")
            print(f"               {top_features[i][2]}")
            print("----------------------")
            i += 1

        # determine risk factor based on total points
        if total_points < 1.75:
            risk_level = "Low"
        elif (total_points >= 1.75) and (total_points < 2.5):
            risk_level = "Moderate"
        elif (total_points >= 2.5) and (total_points < 3.25):
            risk_level = "High"
        else:
            risk_level = "Very High"

        print(f"Risk Level: {risk_level} | {total_points} / 4 \n")

        return future_preds, risk_level, top_features


# testing
# if __name__ == '__main__':
#     feedback = Feedback()
#     preds, risk, top = feedback.predict_risk("AAPL")
#
#     for i in preds:
#         print(i, " ", preds[i])

"""
Example UI structure:
    Tomorrow:
        Expected Volatility: X% (Low, Moderate, High, Very High)
        Expected Range: $Y - $Z
        Determined by these factors:
            top_features[0][0]
            top_features[0][1]
            top_features[0][2]

    1 Week From Now:
        Expected Volatility: X% (Low, Moderate, High, Very High)
        Expected Range: $Y - $Z
        Determined by these factors:
            top_features[1][0]
            top_features[1][1]
            top_features[1][2]

    1 Month From Now:
        Expected Volatility: X% (Low, Moderate, High, Very High)
        Expected Range: $Y - $Z
        Determined by these factors:
            top_features[2][0]
            top_features[2][1]
            top_features[2][2]

    Overall Risk: [Low, Moderate, High, Very High]
"""