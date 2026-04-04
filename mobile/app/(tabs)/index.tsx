import React, { useCallback, useMemo, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, Pressable, FlatList, Alert, TextInput, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { apiFetch } from "../../lib/api";
import { clearSession, getStoredUsername } from "../../lib/auth";
//updated imports

const GREEN = "#2FD59B"
const DARK_GREEN = "#1B7A61";
const BG = "#F4F4F4";
const BLACK = "#0b0b0b";

type Holding = {    symbol: string;
    shares: number;
    market_value: number;
    avg_entry_price?: number;
    current_price?: number;
    total_return?: number;
    total_return_percent?: number;
}; // now matches the backend portfolio/holdings response

/* getting rid of placeholder holdings
const HOLDINGS: Holding[] = [
    { symbol: "AAPL", price: 182.64, shares: 1.2, changePctToday: 0.012 },
    { symbol: "NVDA", price: 342.35, shares: 4, changePctToday: 0.028 },
    { symbol: "TSLA", price: 107.65, shares: 2.3, changePctToday: -0.031 },
];
*/
type RangeKey = "1D" | "1W" | "1M" | "3M" | "6M" | "YTD";

export default function TabIndex() {
  // replace placeholder portfolio values and add fetch state
  const router = useRouter();
  const [range, setRange] = useState<RangeKey>("1W");
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositing, setDepositing] = useState(false);

  const portfolioValue = portfolio?.portfolio_value ?? 0;
  const buyingPower = portfolio?.buying_power ?? 0;
  const cashBalance = portfolio?.cash_balance ?? portfolio?.cash ?? 0;
  const portfolioChangePctToday = 0.0; // placeholder until backend returns day change

  const rangeButtons: RangeKey[] = useMemo(
      () => ["1D", "1W", "1M", "3M", "6M", "YTD"],
      []
  );    // add the fetch function
  const loadPortfolio = useCallback(async () => {
      try {
          setLoading(true);

          const username = await getStoredUsername();
          if (!username) {
              throw new Error("No stored username found. Please log in again.");
          }

          const data = await apiFetch(`/accounts/${username}/portfolio`, {}, true);

          setPortfolio(data.portfolio || null);

          if (Array.isArray(data.holdings)) {
              setHoldings(data.holdings);
          } else if (data.holdings?.positions) {
              setHoldings(data.holdings.positions);
          } else {
              setHoldings([]);
          }
      } catch (error: any) {
          Alert.alert("Portfolio Error", error.message || "Failed to load portfolio");
      } finally {
          setLoading(false);
      }
  }, []);
  useFocusEffect(
      useCallback(() => {
          loadPortfolio();
      }, [loadPortfolio])
  ); // this should now load the portfolio whenever the dashboard tab is opened again
// logout handler
  async function handleLogout() {
      await clearSession();
      router.dismissAll(); // added to clear nested stacked routes, should logout and update screen to login page
      router.replace("/");
  }

  async function handleDeposit() {
      const amountNum = Number(depositAmount);

      if (!Number.isFinite(amountNum) || amountNum <= 0) {
          Alert.alert("Invalid amount", "Please enter a deposit amount greater than 0.");
          return;
      }

      try {
          setDepositing(true);

          const username = await getStoredUsername();
          if (!username) {
              throw new Error("No stored username found. Please log in again.");
          }

          const data = await apiFetch(
              `/accounts/${username}/deposit`,
              {
                  method: "POST",
                  body: JSON.stringify({
                      amount: amountNum,
                  }),
              },
              true
          );

          Alert.alert("Deposit Successful", data.message || `Successfully deposited $${amountNum}`);
          setDepositAmount("");
          await loadPortfolio();
      } catch (error: any) {
          Alert.alert("Deposit Error", error.message || "Failed to deposit funds.");
      } finally {
          setDepositing(false);
      }
  }

  return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            {/* header */}
            <View style={styles.headerRow}>
              <View style={styles.brandRow}>
                <Ionicons name="trending-up" size={26} color={DARK_GREEN} />
                <Text style={styles.brand}>MOCKVESTOR</Text>
              </View>
    
              <Pressable
                onPress={() => console.log("profile pressed")}
                hitSlop={10}
                style={styles.profileBtn}
              >
                <Ionicons name="person-circle-outline" size={30} color={DARK_GREEN} />
              </Pressable>
            </View>
    
            {/* portfolio value card. updated to use real backend data instead of placeholders */}
            <View style={styles.portfolioCard}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.portfolioTitle}>Portfolio Value</Text>
                    <Text style={styles.portfolioValue}>
                        {loading ? "Loading..." : formatMoney(portfolioValue)}
                    </Text>
                    <Text style={styles.portfolioDelta}>
                        Buying Power: {loading ? "Loading..." : formatMoney(buyingPower)}
                    </Text>
                    <Text style={styles.portfolioDelta}>
                        Cash: {loading ? "Loading..." : formatMoney(cashBalance)}
                    </Text>
                </View>

                <View style={styles.portfolioIconWrap}>
                    <Ionicons name="wallet-outline" size={26} color="#0b2b22" />
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
                <Text style={styles.chartHint}>
                  Chart placeholder ({range})
                </Text>
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
                    hitSlop={8}
                  >
                    <Text style={[styles.rangeText, active && styles.rangeTextActive]}>
                      {k}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
    
            {/* holdings header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Current Holdings</Text>
              <Ionicons name="cash-outline" size={18} color={DARK_GREEN} />                
            </View>

            {/* holdings list */}
            <FlatList
                data={holdings}
                keyExtractor={(item) => item.symbol}
                contentContainerStyle={{ paddingBottom: 14 }}
                renderItem={({ item }) => <HoldingRow item={item} />}
                style={{ width: "100%" }}
            />

            <View style={styles.depositCard}>
                <Text style={styles.depositTitle}>Add Funds</Text>

                <TextInput
                    value={depositAmount}
                    onChangeText={setDepositAmount}
                    keyboardType="decimal-pad"
                    placeholder="5000"
                    placeholderTextColor="rgba(255,255,255,0.55)"
                    style={styles.depositInput}
                />

                <Pressable
                    style={[styles.depositBtn, depositing && { opacity: 0.7 }]}
                    onPress={handleDeposit}
                    disabled={depositing}
                >
                    <Text style={styles.secondaryBtnText}>
                        {depositing ? "DEPOSITING..." : "DEPOSIT FUNDS"}
                    </Text>
                </Pressable>
            </View>

            {/* trade button */}
            <Pressable
                style={styles.tradeBtn}
                onPress={() => router.push("./trade")}// potential expo router typed-route issue
            >
                <Text style={styles.tradeText}>TRADE</Text>
            </Pressable>

            <Pressable style={styles.refreshBtn} onPress={loadPortfolio}>
                <Text style={styles.secondaryBtnText}>REFRESH</Text>
            </Pressable>

            <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.secondaryBtnText}>LOG OUT</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
  );
}
function HoldingRow({ item }: { item: Holding }) {
    const pct = item.total_return_percent ?? 0;
    const isUp = pct >= 0;

    return (
        <View style={styles.holdingRow}>
            <View style={styles.symbolPill}>
                <Text style={styles.symbolText}>{item.symbol}</Text>
            </View>

            <View style={styles.midCol}>
                <Text style={styles.priceText}>
                    ${item.current_price?.toFixed?.(2) ?? "0.00"}
                </Text>
                <Text style={[styles.smallText, { opacity: 0.85 }]}>
                    {isUp ? "▲" : "▼"} {pct.toFixed(1)}%
                </Text>
            </View>

            <View style={styles.rightCol}>
                <Text style={styles.smallText}>SHARES</Text>
                <Text style={styles.sharesText}>{stripTrailingZeros(item.shares)}</Text>
            </View>
        </View>
    );
}

function formatMoney(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPct(x: number) {
  const sign = x >= 0 ? "+" : "";
  return `${sign}${(x * 100).toFixed(1)}%`;
}

function stripTrailingZeros(n: number) {
  // 1.2 -> "1.2", 4.0 -> "4"
  return Number.isInteger(n) ? String(n) : String(n);
}
      
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, paddingHorizontal: 18, paddingTop: 10 },
  scrollContent: { paddingBottom: 24},

    depositCard: {
        width: "100%",
        backgroundColor: BLACK,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
    },
    depositTitle: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "900",
        marginBottom: 10,
    },
    depositInput: {
        backgroundColor: "rgba(255,255,255,0.12)",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        color: "#fff",
        fontSize: 16,
        fontWeight: "800",
        marginBottom: 10,
    },
    depositBtn: {
        width: "100%",
        backgroundColor: "#1B7A61",
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: "center",
    },
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
  profileBtn: { padding: 2 },

  portfolioCard: {
    width: "100%",
    backgroundColor: GREEN,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  portfolioTitle: { fontSize: 14, fontWeight: "900", color: "#0b2b22" },
  portfolioValue: { fontSize: 24, fontWeight: "900", marginTop: 6, color: "#0b2b22" },
  portfolioDelta: { marginTop: 4, fontWeight: "800", color: "#0b2b22", opacity: 0.9 },

  portfolioIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
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
    height: 150,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chartHint: { color: "rgba(255,255,255,0.75)", fontWeight: "800" },

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
  rangeBtnActive: { backgroundColor: "rgba(255,255,255,0.12)" },
  rangeText: { color: "rgba(255,255,255,0.75)", fontWeight: "900", fontSize: 12 },
  rangeTextActive: { color: "#fff" },

  sectionHeader: {
    width: "100%",
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#0b2b22" },

  holdingRow: {
    width: "100%",
    backgroundColor: BLACK,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  symbolPill: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minWidth: 74,
    alignItems: "center",
  },
  symbolText: { fontWeight: "900", color: "#0b2b22", fontSize: 14 },

  midCol: { flex: 1, marginLeft: 12 },
  priceText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  smallText: { color: "rgba(255,255,255,0.75)", fontWeight: "800", fontSize: 11 },

  rightCol: { alignItems: "flex-end" },
  sharesText: { color: "#fff", fontWeight: "900", fontSize: 18, marginTop: 2 },

  tradeBtn: {
    width: "100%",
    backgroundColor: GREEN,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  refreshBtn: {
      width: "100%",
      backgroundColor: "#1B7A61",
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: "center",
      marginBottom: 10,
  },

  logoutBtn: {
      width: "100%",
      backgroundColor: "#444",
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: "center",
      marginBottom: 16,
  },
  tradeText: { fontSize: 24, fontWeight: "900", letterSpacing: 1, color: "#0b2b22" },
  secondaryBtnText: { fontSize: 18, fontWeight: "900", letterSpacing: 1, color: "#fff" },
});
