import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, Pressable, TextInput, Alert, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../lib/api";
import { getStoredUsername } from "../../lib/auth";

// risk banner
import RiskWarningBanner from "../../components/education/RiskWarningBanner";

const GREEN = "#2FD59B";
const DARK_GREEN = "#1B7A61";
const BG = "#F4F4F4";
const BLACK = "#0b0b0b";
const SELL_PINK = "#ff4d7d";

type RangeKey = "1D" | "1W" | "1M" | "3M" | "6M" | "YTD";
type TradeMode = "BUY" | "SELL";

type Holding = {
    symbol: string;
    shares: number;
    current_price?: number;
    market_value?: number;
    profit_loss?: number;
    total_return_percent?: number;
};

// added: live quote response type from new backend quote endpoint
type QuoteData = {
    symbol: string;
    ask_price: number;
    bid_price: number;
    timestamp: string;
};

// added: historical chart data type from new backend chart endpoint
type ChartPoint = {
    date: string;
    open: number;
    close: number;
    high: number;
    low: number;
    volume: number;
};

export default function TradeScreen() {
  const [range, setRange] = useState<RangeKey>("1W");
  const [mode, setMode] = useState<TradeMode>("BUY");
  const [quantity, setQuantity] = useState("1.0");
  const [warningDismissed, setWarningDismissed] = useState(false);

  // changed: split symbol into raw typed input and the symbol actually searched
  const [symbolInput, setSymbolInput] = useState("");
  const [activeSymbol, setActiveSymbol] = useState("");

  const [buyingPower, setBuyingPower] = useState(0);
  const [heldShares, setHeldShares] = useState(0);

  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);

  const rangeButtons: RangeKey[] = useMemo(
      () => ["1D", "1W", "1M", "3M", "6M", "YTD"],
      []
  );

  const qtyNum = Number(quantity || 0);
  const normalizedInputSymbol = symbolInput.trim().toUpperCase();
  const normalizedActiveSymbol = activeSymbol.trim().toUpperCase();
  const symbolIsSynced = normalizedInputSymbol === normalizedActiveSymbol;

  // changed: use ask price for buying and bid price for selling from the live quote endpoint
  const displayPrice =
      mode === "BUY"
          ? quote?.ask_price ?? null
          : quote?.bid_price ?? null;

  const estimatedCost = displayPrice != null && Number.isFinite(qtyNum) ? qtyNum * displayPrice : null;

  // trade impact indicator 
  const tradeImpact = useMemo(() => {
    const qty = Number(quantity || 0);
    if (qty === 0) return null;
  
    // % of buying power used
    //const usage = estimatedCost / buyingPower;
    const usage = buyingPower ? (estimatedCost ?? 0) / buyingPower : 0;
  
    if (usage >= 0.8 || qty >= 10) {
      return "High";
    } else if (usage >= 0.4 || qty >= 5) {
      return "Moderate";
    } else {
      return "Low";
    }
  }, [quantity, estimatedCost, buyingPower]);

  // risk warning banner messages 
  const riskWarningMessage = useMemo(() => {
    const qty = Number(quantity || 0);
  
    if (mode === "BUY") {
      if ((estimatedCost ?? 0) >= buyingPower * 0.8) {
        return "This trade would use most of your buying power, leaving you with less flexibility for future trades.";
      } else if (qty >= 5) {
        return "This purchase increases concentration in one stock, which raises risk if that company performs poorly.";
      } else if (qty >= 3) {
        return "Adding more to the same position reduces diversification by making your portfolio rely more heavily on one asset.";
      }
    }
  
    if (mode === "SELL") {
      if (qty >= 10) {
        return "This sale may significantly reduce your exposure to this stock and shift your portfolio allocation.";
      } else if (qty >= 5) {
        return "Selling a large portion of one holding can change diversification and alter the balance of your portfolio.";
      } else if (qty > 0) {
        return "This trade increases available buying power, but it may also reduce your investment in a position that was supporting portfolio growth.";
      }
    }
  
    return null;
  }, [mode, quantity, estimatedCost, buyingPower]);

  // changed: still uses portfolio endpoint, but now only to get buying power + held shares for active searched symbol
  const loadPortfolioInfo = useCallback(async () => {
      try {
          setLoadingPortfolio(true);

          const username = await getStoredUsername();
          if (!username) {
              throw new Error("No stored username found. Please log in again.");
          }

          const data = await apiFetch(`/accounts/${username}/portfolio`, {}, true);

          const bp = data?.portfolio?.buying_power ?? 0;
          setBuyingPower(bp);

          const holdings: Holding[] = Array.isArray(data?.holdings)
              ? data.holdings
              : data?.holdings?.positions ?? [];

          const match = holdings.find(
              (h) => h.symbol?.toUpperCase() === normalizedActiveSymbol
          );

          setHeldShares(match?.shares ?? 0);
      } catch (error: any) {
          Alert.alert("Trade Screen Error", error.message || "Failed to load account info.");
      } finally {
          setLoadingPortfolio(false);
      }
  }, [normalizedActiveSymbol]);

  // added: call new live quote backend endpoint only for active searched symbol
  const loadLiveQuote = useCallback(async () => {
      if (!normalizedActiveSymbol) {
          setQuote(null);
          setLoadingQuote(false);
          return;
      }

      try {
          setLoadingQuote(true);
          const data = await apiFetch(`/markets/quote/${normalizedActiveSymbol}`, {}, true);
          setQuote(data?.data ?? null);
      } catch (error: any) {
          setQuote(null);
          throw error;
      } finally {
          setLoadingQuote(false);
      }
  }, [normalizedActiveSymbol]);

  // added: call new historical chart endpoint only for active searched symbol
  const loadHistoricalData = useCallback(async () => {
      if (!normalizedActiveSymbol) {
          setChartData([]);
          setLoadingChart(false);
          return;
      }

      try {
          setLoadingChart(true);
          const data = await apiFetch(`/market/historical/${normalizedActiveSymbol}`, {}, true);
          setChartData(data?.chart_data ?? []);
      } catch (error: any) {
          setChartData([]);
          throw error;
      } finally {
          setLoadingChart(false);
      }
  }, [normalizedActiveSymbol]);

  // changed: only reload automatically when the active searched symbol changes, not every keystroke
  useEffect(() => {
      loadPortfolioInfo();
      loadLiveQuote().catch(() => {});
      loadHistoricalData().catch(() => {});
  }, [loadPortfolioInfo, loadLiveQuote, loadHistoricalData]);

  useEffect(() => {
      if (searching && !loadingPortfolio && !loadingQuote && !loadingChart) {
          setSearching(false);
      }
  }, [searching, loadingPortfolio, loadingQuote, loadingChart]);

  // added: explicit search button handler so invalid partial ticker input does not spam the backend
  async function handleSearch() {
      if (normalizedInputSymbol === normalizedActiveSymbol) {
          try {
              setSearching(true);
              await Promise.allSettled([
                  loadPortfolioInfo(),
                  loadLiveQuote(),
                  loadHistoricalData(),
              ]);
          } finally {
              setSearching(false);
          }
          return;
      }

      if (!normalizedInputSymbol) {
          Alert.alert("Missing symbol", "Please enter a stock symbol.");
          return;
      }

      setSearching(true);

      setQuote(null);
      setChartData([]);
      setHeldShares(0);

      setLoadingPortfolio(true);
      setLoadingQuote(true);
      setLoadingChart(true);

      setActiveSymbol(normalizedInputSymbol);
  }

  async function handleExecuteTrade() {
      if (!symbolIsSynced) {
          Alert.alert("Search required", "Please press Search for the ticker you entered before placing a trade.");
          return;
      }

      if (!normalizedActiveSymbol) {
          Alert.alert("Missing symbol", "Please search for a stock symbol first.");
          return;
      }

      if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
          Alert.alert("Invalid quantity", "Please enter a quantity greater than 0.");
          return;
      }

      if (mode === "SELL" && qtyNum > heldShares) {
          Alert.alert(
              "Not enough shares",
              `You currently hold ${heldShares} shares of ${normalizedActiveSymbol}.`
          );
          return;
      }

      try {
          setSubmitting(true);

          const username = await getStoredUsername();
          if (!username) {
              throw new Error("No stored username found. Please log in again.");
          }

          const data = await apiFetch(
              `/accounts/${username}/orders`,
              {
                  method: "POST",
                  body: JSON.stringify({
                      symbol: normalizedActiveSymbol,
                      qty: qtyNum,
                      side: mode.toLowerCase(), // backend requires exactly "buy" or "sell"
                  }),
              },
              true
          );

          Alert.alert(
              "Order submitted",
              `${String(data.side ?? mode.toLowerCase()).toUpperCase()} ${data.qty ?? qtyNum} ${data.symbol ?? normalizedActiveSymbol}\nStatus: ${data.order_status ?? "accepted"}`
          );

          // changed: refresh holdings and quote after a real trade submission
          await loadPortfolioInfo();
          await loadLiveQuote().catch(() => {});
      } catch (error: any) {
          Alert.alert("Trade Error", error.message || "Failed to submit order.");
      } finally {
          setSubmitting(false);
      }
  }

  // added: filter historical data by the selected chart range
  const filteredChartData = useMemo(() => {
      if (!chartData.length) return [];

      switch (range) {
          case "1D":
              return chartData.slice(-1);
          case "1W":
              return chartData.slice(-5);
          case "1M":
              return chartData.slice(-22);
          case "3M":
              return chartData.slice(-66);
          case "6M":
              return chartData.slice(-132);
          case "YTD": {
              const currentYear = new Date().getFullYear();
              return chartData.filter((point) => new Date(point.date).getFullYear() === currentYear);
          }
          default:
              return chartData;
      }
  }, [chartData, range]);

  // added: compute simple chart change info from filtered historical data
  const latestClose =
      filteredChartData.length > 0
          ? filteredChartData[filteredChartData.length - 1].close
          : null;

  const earliestClose =
      filteredChartData.length > 0
          ? filteredChartData[0].close
          : null;

  const chartChangePct =
      latestClose != null &&
      earliestClose != null &&
      earliestClose !== 0
          ? ((latestClose - earliestClose) / earliestClose) * 100
          : null;

  // added: convert chart data into simple bar heights for the UI
  const chartBars = useMemo(() => {
      if (!filteredChartData.length) return [];

      const closes = filteredChartData.map((point) => point.close);
      const minClose = Math.min(...closes);
      const maxClose = Math.max(...closes);
      const rangeSize = Math.max(maxClose - minClose, 1);

      return filteredChartData.map((point) => {
          const normalizedHeight = ((point.close - minClose) / rangeSize) * 90 + 20;
          return {
              date: point.date,
              close: point.close,
              height: normalizedHeight,
          };
      });
  }, [filteredChartData]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>

        {/* header */}
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <Ionicons name="trending-up" size={26} color={DARK_GREEN} />
            <Text style={styles.brand}>MOCKVESTOR</Text>
          </View>

          <Pressable onPress={() => console.log("profile pressed")} hitSlop={10}>
            <Ionicons name="person-circle-outline" size={30} color={DARK_GREEN} />
          </Pressable>
        </View>

        {/* stock header card */}
        <View style={styles.stockCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Symbol</Text>
            <TextInput
                value={symbolInput}
                onChangeText={(text) => setSymbolInput(text.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                spellCheck={false}
                style={styles.symbolInput}
                placeholder="AAPL"
                placeholderTextColor="rgba(11,43,34,0.45)"
            />

            {/* added: explicit search button so backend only checks after user clicks it */}
            <Pressable
                style={[styles.searchBtn, searching && { opacity: 0.7 }]}
                onPress={handleSearch}
                disabled={searching}
            >
                <Text style={styles.searchBtnText}>
                    {searching ? "SEARCHING..." : "SEARCH"}
                </Text>
            </Pressable>
          </View>

          <View style={styles.stockInfoRight}>
            <Text style={styles.stockPrice}>
                {loadingQuote
                    ? "Loading..."
                    : displayPrice != null
                        ? formatMoney(displayPrice)
                        : "Price N/A"}
            </Text>
            <Text style={styles.stockDelta}>
                {loadingQuote
                    ? "Fetching quote..."
                    : quote
                        ? `${mode === "BUY" ? "Ask" : "Bid"} ${formatMoney(displayPrice ?? 0)}`
                        : "No live quote"}
            </Text>
            {/* added: show quote timestamp from backend */}
            <Text style={styles.quoteTime}>
                {quote?.timestamp
                    ? `Updated: ${new Date(quote.timestamp).toLocaleTimeString()}`
                    : ""}
            </Text>
          </View>

          <View style={styles.stockIconWrap}>
            <Ionicons name="wallet-outline" size={22} color="#0b2b22" />
          </View>
        </View>

        {/* chart placeholder */}
        <View style={styles.chartCard}>
          <View style={styles.chartTopRow}>
              {/* changed: now shows real symbol title and simple percentage change */}
              <Text style={styles.chartTitle}>{normalizedActiveSymbol || "Ticker"} Price History</Text>
              <Text style={styles.chartSmallLabel}>
                  {chartChangePct != null
                      ? `${chartChangePct >= 0 ? "+" : ""}${chartChangePct.toFixed(2)}%`
                      : ""}
              </Text>
          </View>

          <View style={styles.chartBody}>
              {/* changed: now renders real chart bars from historical backend data */}
              {loadingChart ? (
                  <Text style={styles.chartHint}>Loading chart...</Text>
              ) : chartBars.length === 0 ? (
                  <Text style={styles.chartHint}>No historical data available</Text>
              ) : (
                  <View style={styles.barChartRow}>
                      {chartBars.slice(-24).map((bar, index) => (
                          <View key={`${bar.date}-${index}`} style={styles.barWrap}>
                              <View
                                  style={[
                                      styles.bar,
                                      {
                                          height: bar.height,
                                          backgroundColor:
                                              chartChangePct != null && chartChangePct < 0
                                                  ? SELL_PINK
                                                  : GREEN,
                                      },
                                  ]}
                              />
                          </View>
                      ))}
                  </View>
              )}
          </View>
        </View>

        {/* time range tabs */}
        <View style={styles.rangeRow}>
          {rangeButtons.map((k) => {
            const active = k === range;
            return (
              <Pressable
                key={k}
                onPress={() => setRange(k)}
                style={[styles.rangeBtn, active && styles.rangeBtnActive]}
              >
                <Text style={[styles.rangeText, active && styles.rangeTextActive]}>
                  {k}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* buy/sell toggle buttons*/}
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleBtn, mode === "BUY" && styles.buyActive]}
            onPress={() => setMode("BUY")}
          >
            <Text
              style={[
                styles.toggleText,
                mode === "BUY" ? styles.buyTextActive : styles.toggleTextInactive,
              ]}
            >
              BUY
            </Text>
          </Pressable>

          <Pressable
            style={[styles.toggleBtn, mode === "SELL" && styles.sellActive]}
            onPress={() => setMode("SELL")}
          >
            <Text
              style={[
                styles.toggleText,
                mode === "SELL" ? styles.sellTextActive : styles.toggleTextInactive,
              ]}
            >
              SELL
            </Text>
          </Pressable>
        </View>

        {/* risk banner */}
        {riskWarningMessage && !warningDismissed && (
            <RiskWarningBanner message={riskWarningMessage}
            onClose={() => setWarningDismissed(true)}
            />
        )}

        {/* quantity */}
        <View style={styles.quantityCard}>
          <Text style={styles.quantityLabel}>Quantity</Text>

          <View style={styles.quantityControls}>
            <Pressable
              style={styles.qtyCircle}
              onPress={() =>
                setQuantity((Math.max(0, Number(quantity || 0) - 1)).toFixed(1))
              }
            >
              <Ionicons name="remove-circle-outline" size={24} color="#fff" />
            </Pressable>

            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              style={styles.qtyInput}
            />

            <Pressable
              style={styles.qtyCircle}
              onPress={() => setQuantity((Number(quantity || 0) + 1).toFixed(1))}
            >
              <Ionicons name="add-circle-outline" size={24} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* review transaction */}
        <View style={styles.reviewCard}>
          <Text 
            style={[
                styles.reviewTitle,
                { color: mode === "BUY" ? GREEN : SELL_PINK }
            ]}
          >
            Review Transaction
          </Text>

          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Buying Power:</Text>
            <Text style={styles.reviewValue}>
                {loadingPortfolio ? "Loading..." : formatMoney(buyingPower)}
            </Text>
          </View>

          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Estimated Cost:</Text>
            <Text style={styles.reviewValue}>
                {estimatedCost != null ? formatMoney(estimatedCost) : "N/A"}
            </Text>
          </View>

          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Shares Entered:</Text>
            <Text style={styles.reviewValue}>{quantity}</Text>
          </View>

          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Shares Held:</Text>
            <Text style={styles.reviewValue}>{stripTrailingZeros(heldShares)}</Text>
          </View>

          {/* added: include latest close from historical data in the transaction review */}
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Latest Close:</Text>
            <Text style={styles.reviewValue}>
                {latestClose != null ? formatMoney(latestClose) : "N/A"}
            </Text>
          </View>
        </View>
        
        {tradeImpact && (
            <View style={styles.impactPill}>
                <Text style={styles.impactTitle}>Trade Impact: {tradeImpact} </Text>
                <View style={styles.dotRow}>
                    {[1, 2, 3, 4, 5].map((i) => {
                        let activeCount = 0;
                        if (tradeImpact === "Low") activeCount = 2;
                        if (tradeImpact === "Moderate") activeCount = 3;
                        if (tradeImpact === "High") activeCount = 5;
                        
                        return (
                          <View
                            key={i}
                            style={[
                              styles.dot,
                              i <= activeCount && {
                                backgroundColor:
                                  tradeImpact === "Low"
                                    ? "#2FD59B"
                                    : tradeImpact === "Moderate"
                                    ? "#FFD166"
                                    : "#ff4d7d",
                              },
                            ]}
                          />
                        );
                    })}
                </View>
            </View>
        )}
        

        {/* execute button */}
        <Pressable
            style={[
                styles.executeBtn,
                mode === "SELL" && styles.executeBtnSell,
                (submitting || !symbolIsSynced) && { opacity: 0.7 },
            ]}
            onPress={handleExecuteTrade}
            disabled={submitting || !symbolIsSynced}
        >
            <Text style={styles.executeText}>
                {!symbolIsSynced
                    ? "PRESS SEARCH FIRST"
                    : submitting
                        ? "SUBMITTING..."
                        : mode === "BUY"
                            ? `BUY ${normalizedActiveSymbol || "STOCK"}`
                            : `SELL ${normalizedActiveSymbol || "STOCK"}`}
            </Text>
        </Pressable>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatMoney(n: number) {
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function stripTrailingZeros(n: number) {
    return Number.isInteger(n) ? String(n) : String(n);
}

function formatPct(x: number) {
  const sign = x >= 0 ? "+" : "";
  return `${sign}${(x * 100).toFixed(1)}%`;
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },
    // changed: switched container layout to work with ScrollView content
    container: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24 },
    scrollContent: { paddingBottom: 24},

    headerRow: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    brand: {
        fontSize: 24,
        fontWeight: "900",
        letterSpacing: 1,
        color: DARK_GREEN,
    },

    stockCard: {
        width: "100%",
        backgroundColor: GREEN,
        borderRadius: 18,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: "800",
        color: "#0b2b22",
        marginBottom: 6,
    },
    symbolInput: {
        backgroundColor: "rgba(255,255,255,0.85)",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 24,
        fontWeight: "900",
        color: "#0b2b22",
        minWidth: 110,
    },
    // added: explicit search button styles
    searchBtn: {
        marginTop: 10,
        backgroundColor: "#1B7A61",
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: "center",
    },
    searchBtnText: {
        color: "#fff",
        fontWeight: "900",
        fontSize: 14,
        letterSpacing: 0.5,
    },
    stockInfoRight: {
        alignItems: "flex-end",
        marginRight: 10,
        marginLeft: 10,
    },
    stockPrice: {
        fontSize: 18,
        fontWeight: "900",
        color: "#0b2b22",
    },
    stockDelta: {
        marginTop: 4,
        fontWeight: "800",
        color: "#0b2b22",
        opacity: 0.9,
        textAlign: "right",
    },
    // added: style for live quote timestamp
    quoteTime: {
        marginTop: 2,
        fontSize: 11,
        fontWeight: "700",
        color: "#0b2b22",
        opacity: 0.8,
        textAlign: "right",
    },
    stockIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.35)",
        alignItems: "center",
        justifyContent: "center",
    },

    chartCard: {
        width: "100%",
        borderRadius: 18,
        backgroundColor: BLACK,
        padding: 14,
        marginBottom: 10,
    },
    // added: real chart heading row styles
    chartTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    chartTitle: {
        color: "#fff",
        fontWeight: "900",
        fontSize: 14,
    },
    chartSmallLabel: {
        color: "rgba(255,255,255,0.8)",
        fontWeight: "800",
        fontSize: 12,
    },
    chartBody: {
        marginTop: 18,
        height: 150,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.06)",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 10,
        overflow: "hidden",
    },
    chartHint: {
        color: "rgba(255,255,255,0.75)",
        fontWeight: "800",
    },
    // added: simple bar chart styles for historical data
    barChartRow: {
        width: "100%",
        height: "100%",
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
    },
    barWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-end",
        marginHorizontal: 1,
    },
    bar: {
        width: "75%",
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
    },

    rangeRow: {
        width: "100%",
        backgroundColor: BLACK,
        borderRadius: 14,
        padding: 6,
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    rangeBtn: {
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 12,
    },
    rangeBtnActive: {
        backgroundColor: "rgba(255,255,255,0.12)",
    },
    rangeText: {
        color: "rgba(255,255,255,0.75)",
        fontWeight: "900",
        fontSize: 12,
    },
    rangeTextActive: { color: "#fff" },

    toggleRow: {
        width: "100%",
        backgroundColor: BLACK,
        borderRadius: 16,
        flexDirection: "row",
        overflow: "hidden",
        marginBottom: 12,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
    },
    buyActive: { backgroundColor: GREEN },
    sellActive: { backgroundColor: SELL_PINK },
    toggleText: {
        fontSize: 18,
        fontWeight: "900",
    },
    buyTextActive: { color: "#fff" },
    sellTextActive: { color: "#fff" },
    toggleTextInactive: { color: "rgba(255,255,255,0.65)" },

    quantityCard: {
        width: "100%",
        backgroundColor: BLACK,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    quantityLabel: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "900",
    },
    quantityControls: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    qtyCircle: {
        alignItems: "center",
        justifyContent: "center",
    },
    qtyInput: {
        minWidth: 56,
        textAlign: "center",
        color: "#fff",
        fontSize: 20,
        fontWeight: "900",
    },

    reviewCard: {
        width: "100%",
        backgroundColor: BLACK,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
    },
    reviewTitle: {
        color: SELL_PINK,
        fontSize: 16,
        fontWeight: "900",
        marginBottom: 10,
    },
    reviewRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    reviewLabel: {
        color: "#fff",
        fontWeight: "700",
    },
    reviewValue: {
        color: "#fff",
        fontWeight: "900",
    },
    impactPill: {
      marginTop: 10,
      marginBottom: 10,
      backgroundColor: "#111",
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: "center",
    },
    impactTitle: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "800",
      marginBottom: 6,
    },
    dotRow: {
      flexDirection: "row",
      gap: 6,
    },  
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "rgba(255,255,255,0.2)",
    },
    executeBtn: {
        width: "100%",
        backgroundColor: GREEN,
        borderRadius: 18,
        paddingVertical: 14,
        alignItems: "center",
        marginBottom: 10,
    },
    executeBtnSell: {
        backgroundColor: SELL_PINK,
    },
    executeText: {
        color: "#fff",
        fontSize: 22,
        fontWeight: "900",
        letterSpacing: 1,
    },
});