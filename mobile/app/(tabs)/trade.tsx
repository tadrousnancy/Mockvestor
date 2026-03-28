import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "../../lib/api";
import { getStoredUsername } from "../../lib/auth";

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

export default function TradeScreen() {
  const [range, setRange] = useState<RangeKey>("1W");
  const [mode, setMode] = useState<TradeMode>("BUY");
  const [quantity, setQuantity] = useState("1.0");
  const [symbol, setSymbol] = useState("AAPL");

  const [buyingPower, setBuyingPower] = useState(0);
  const [heldShares, setHeldShares] = useState(0);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const rangeButtons: RangeKey[] = useMemo(
    () => ["1D", "1W", "1M", "3M", "6M", "YTD"],
    []
  );

  const qtyNum = Number(quantity || 0);
  const normalizedSymbol = symbol.trim().toUpperCase();
  const estimatedCost = currentPrice != null && Number.isFinite(qtyNum)
    ? qtyNum * currentPrice
    : null;

  const loadAccountInfo = useCallback(async () => {
    try {
      setLoading(true);

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
        (h) => h.symbol?.toUpperCase() === normalizedSymbol
      );

      setHeldShares(match?.shares ?? 0);
      setCurrentPrice(match?.current_price ?? null);
    } catch (error: any) {
      Alert.alert("Trade Screen Error", error.message || "Failed to load account info.");
    } finally {
      setLoading(false);
    }
  }, [normalizedSymbol]);

  useEffect(() => {
    loadAccountInfo();
  }, [loadAccountInfo]);

  async function handleExecuteTrade() {
    if (!normalizedSymbol) {
      Alert.alert("Missing symbol", "Please enter a stock symbol.");
      return;
    }

    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      Alert.alert("Invalid quantity", "Please enter a quantity greater than 0.");
      return;
    }

    if (mode === "SELL" && qtyNum > heldShares) {
      Alert.alert(
        "Not enough shares",
        `You currently hold ${heldShares} shares of ${normalizedSymbol}.`
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
            symbol: normalizedSymbol,
            qty: qtyNum,
            side: mode.toLowerCase(), // backend requires exactly "buy" or "sell"
          }),
        },
        true
      );

      Alert.alert(
        "Order submitted",
        `${String(data.side ?? mode.toLowerCase()).toUpperCase()} ${data.qty ?? qtyNum} ${data.symbol ?? normalizedSymbol}\nStatus: ${data.order_status ?? "accepted"}`
      );

      await loadAccountInfo();
    } catch (error: any) {
      Alert.alert("Trade Error", error.message || "Failed to submit order.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
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
              value={symbol}
              onChangeText={(text) => setSymbol(text.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              spellCheck={false}
              style={styles.symbolInput}
              placeholder="AAPL"
              placeholderTextColor="rgba(11,43,34,0.45)"
            />
          </View>

          <View style={styles.stockInfoRight}>
            <Text style={styles.stockPrice}>
              {currentPrice != null ? formatMoney(currentPrice) : "Price N/A"}
            </Text>
            <Text style={styles.stockDelta}>
              {loading
                ? "Loading..."
                : heldShares > 0
                ? `Held: ${stripTrailingZeros(heldShares)} shares`
                : "Not currently held"}
            </Text>
          </View>

          <View style={styles.stockIconWrap}>
            <Ionicons name="wallet-outline" size={22} color="#0b2b22" />
          </View>
        </View>

        {/* chart placeholder */}
        <View style={styles.chartCard}>
          <View style={styles.chartTopRow}>
            <View style={styles.chartTitleStub} />
            <View style={styles.chartTitleStubSmall} />
          </View>

          <View style={styles.chartBody}>
            <Ionicons name="stats-chart" size={44} color="rgba(255,255,255,0.8)" />
            <Text style={styles.chartHint}>Chart placeholder ({range})</Text>
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

        {/* buy/sell toggle buttons */}
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
            <Text style={styles.reviewValue}>{formatMoney(buyingPower)}</Text>
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
        </View>

        {/* execute button */}
        <Pressable
          style={[
            styles.executeBtn,
            mode === "SELL" && styles.executeBtnSell,
            submitting && { opacity: 0.7 },
          ]}
          onPress={handleExecuteTrade}
          disabled={submitting}
        >
          <Text style={styles.executeText}>
            {submitting
              ? "SUBMITTING..."
              : mode === "BUY"
              ? `BUY ${normalizedSymbol || "STOCK"}`
              : `SELL ${normalizedSymbol || "STOCK"}`}
          </Text>
        </Pressable>
      </View>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, paddingHorizontal: 18, paddingTop: 10 },

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
  chartTopRow: { flexDirection: "row", justifyContent: "space-between" },
  chartTitleStub: {
    width: 120,
    height: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  chartTitleStubSmall: {
    width: 50,
    height: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  chartBody: {
    marginTop: 18,
    height: 130,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chartHint: {
    color: "rgba(255,255,255,0.75)",
    fontWeight: "800",
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
