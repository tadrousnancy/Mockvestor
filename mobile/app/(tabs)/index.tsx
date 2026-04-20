import React, { useCallback, useMemo, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, Pressable, FlatList, Alert, TextInput, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { apiFetch } from "../../lib/api";
import {
    clearSession,
    getStoredUsername,
    saveDifficultySettings,
    getDifficultyMode,
    getStartingAmount,
    getPortfolioChartHistory, // added for portfolio chart implementation
    upsertPortfolioSnapshot,
} from "../../lib/auth";
//updated imports

const GREEN = "#2FD59B"
const DARK_GREEN = "#1B7A61";
const BG = "#F4F4F4";
const BLACK = "#0b0b0b";


// placeholder value for daily streak
const streakCount = 3;

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
type RangeKey = "1W" | "1M" | "3M" | "6M" | "YTD"; // changed to only include 1W since 1D does not make sense here

// added: frontend-only difficulty mode type
type DifficultyMode = "sandbox" | "easy" | "hard";

export default function TabIndex() {
  // replace placeholder portfolio values and add fetch state
  const router = useRouter();
  const [range, setRange] = useState<RangeKey>("1W");
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositing, setDepositing] = useState(false);

  // added: difficulty mode state
  const [difficultyMode, setDifficultyMode] = useState<DifficultyMode>("sandbox");
  const [startingAmount, setStartingAmount] = useState("");

  const portfolioValue = portfolio?.portfolio_value ?? 0;
  const buyingPower = portfolio?.buying_power ?? 0;
  const cashBalance = portfolio?.cash_balance ?? portfolio?.cash ?? 0;
  const portfolioChangePctToday = 0.0; // placeholder until backend returns day change

  // added: difficulty mode calculations
  const startingAmountNum = Number(startingAmount || 0);

  //added: portfolio dashboard chart  
  const [chartHistory, setChartHistory] = useState<{ date: string; value: number }[]>([]);

  const depositAllowed =
      difficultyMode === "sandbox" ||
      (difficultyMode === "easy" && startingAmountNum > 0 && portfolioValue < startingAmountNum) ||
      (difficultyMode === "hard" && startingAmountNum > 0 && portfolioValue < startingAmountNum / 2);

  const depositBlockedMessage =
      difficultyMode === "sandbox"
          ? ""
          : difficultyMode === "easy"
              ? "Easy mode only allows deposits once your portfolio drops below your original starting amount."
              : "Hard mode only allows deposits once your portfolio drops below half of your original starting amount.";

  const rangeButtons: RangeKey[] = useMemo(
      () => ["1W", "1M", "3M", "6M", "YTD"],
      []
    );
  
  
  // add the fetch function
  const loadPortfolio = useCallback(async () => {
      try {
          setLoading(true);

          const username = await getStoredUsername();
          if (!username) {
              throw new Error("No stored username found. Please log in again.");
          }

          const data = await apiFetch(`/accounts/${username}/portfolio`, {}, true);

          setPortfolio(data.portfolio || null);
          // added: portfolio chart
          const currentPortfolioValue = data?.portfolio?.portfolio_value ?? 0;
          const history = await upsertPortfolioSnapshot(username, currentPortfolioValue);
          setChartHistory(history);

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

  // added: load saved difficulty mode + starting amount for the logged in user
  const loadDifficultySettings = useCallback(async () => {
      try {
          const username = await getStoredUsername();
          if (!username) return;

          const savedMode = await getDifficultyMode(username);
          const savedStartingAmount = await getStartingAmount(username);

          if (savedMode) {
              setDifficultyMode(savedMode);
          }

          if (savedStartingAmount !== null) {
              setStartingAmount(savedStartingAmount);
          }
      } catch (error) {
          console.log("Failed to load difficulty settings", error);
      }
  }, []);
    // added: portfolio chart, add filtered chart data
    const filteredChartHistory = useMemo(() => {
    if (!chartHistory.length) return [];

    const today = new Date();
    const startOfYear = `${today.getFullYear()}-01-01`;

    switch (range) {
        case "1D":
            return chartHistory.slice(-1);
        case "1W":
            return chartHistory.slice(-7);
        case "1M":
            return chartHistory.slice(-30);
        case "3M":
            return chartHistory.slice(-90);
        case "6M":
            return chartHistory.slice(-180);
        case "YTD":
            return chartHistory.filter((p) => p.date >= startOfYear);
        default:
            return chartHistory;
    }
}, [chartHistory, range]);

    const chartHasEnoughDays = filteredChartHistory.length >= 2;

    const chartBars = useMemo(() => {
        if (!filteredChartHistory.length) return [];
    
        const values = filteredChartHistory.map((p) => p.value);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const span = Math.max(maxValue - minValue, 1);
    
        return filteredChartHistory.map((point, index) => {
            const prev = index > 0 ? filteredChartHistory[index - 1].value : point.value;
            const wentUp = point.value >= prev;
    
            return {
                ...point,
                height: ((point.value - minValue) / span) * 90 + 20,
                wentUp,
            };
        });
    }, [filteredChartHistory]);
    
    // added: portfolio dashboard chart, load existing chart history helper
    const loadChartHistory = useCallback(async () => {
    try {
        const username = await getStoredUsername();
        if (!username) return;

        const history = await getPortfolioChartHistory(username);
        setChartHistory(history);
    } catch (error) {
        console.log("Failed to load chart history", error);
    }
}, []);
    
useFocusEffect(
    useCallback(() => {
        loadPortfolio();
        loadDifficultySettings();
    }, [loadPortfolio, loadDifficultySettings])
); // this should now load the portfolio whenever the dashboard tab is opened again
    //added: portfolio chart
// logout handler
  async function handleLogout() {
      await clearSession();
      router.dismissAll(); // added to clear nested stacked routes, should logout and update screen to login page
      router.replace("/");
  }

  async function handleDeposit() {
      const amountNum = Number(depositAmount);

      // added: difficulty mode restrictions (changes frontend only, good for our demo but backend deposits could theoretically still be called directly)
      if (difficultyMode !== "sandbox") {
          if (!Number.isFinite(startingAmountNum) || startingAmountNum <= 0) {
              Alert.alert("Set starting amount", "Please enter your original starting amount first.");
              return;
          }

          if (!depositAllowed) {
              Alert.alert("Deposit locked", depositBlockedMessage);
              return;
          }
      }

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
        <ScrollView contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* header */}
            <View style={styles.headerRow}>
              <View style={styles.brandRow}>
                <Ionicons name="trending-up" size={26} color={DARK_GREEN} />
                <Text style={styles.brand}>MOCKVESTOR</Text>
              </View>

       <View style={styles.headerRight}>
                <View style={styles.streakMini}>
                  <Ionicons name="flame" size={25} color={DARK_GREEN} />
                  <Text style={styles.streakMiniText}>{streakCount}</Text>
                </View>
    

              <Pressable
                onPress={() => console.log("profile pressed")}
                hitSlop={10}
                style={styles.profileBtn}
              >
                <Ionicons name="person-circle-outline" size={30} color={DARK_GREEN} />
              </Pressable>
              </View>
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

            {/* portfolio chart */}
            <View style={styles.chartCard}>
              <View style={styles.chartTopRow}>
                <Text style={styles.chartTitle}>Portfolio Trend</Text>
                <Text style={styles.chartSmallLabel}>{range}</Text>
              </View>
            
              <View style={styles.chartBody}>
                {!chartHasEnoughDays ? (
                  <Text style={styles.chartHint}>
                    Portfolio chart will generate when you have enough days to compare
                  </Text>
                ) : (
                  <View style={styles.barChartRow}>
                    {chartBars.map((bar, index) => (
                      <View key={`${bar.date}-${index}`} style={styles.barWrap}>
                        <View
                          style={[
                            styles.bar,
                            {
                              height: bar.height,
                              backgroundColor: bar.wentUp ? GREEN : "#ff4d7d",
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

            {/* added: difficulty mode card */}
            <View style={styles.modeCard}>
                <Text style={styles.modeTitle}>Difficulty Mode</Text>

                <View style={styles.modeRow}>
                    {(["sandbox", "easy", "hard"] as DifficultyMode[]).map((mode) => {
                        const active = difficultyMode === mode;
                        return (
                            <Pressable
                                key={mode}
                                style={[styles.modeBtn, active && styles.modeBtnActive]}
                                onPress={async () => {
                                    setDifficultyMode(mode);

                                    const username = await getStoredUsername();
                                    if (!username) return;

                                    await saveDifficultySettings({
                                        username,
                                        mode,
                                        startingAmount,
                                    });
                                }}
                            >
                                <Text style={[styles.modeBtnText, active && styles.modeBtnTextActive]}>
                                    {mode.toUpperCase()}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                <Text style={styles.modeLabel}>Original Starting Amount</Text>
                <TextInput
                    value={startingAmount}
                    onChangeText={async (text) => {
                        setStartingAmount(text);

                        const username = await getStoredUsername();
                        if (!username) return;

                        await saveDifficultySettings({
                            username,
                            mode: difficultyMode,
                            startingAmount: text,
                        });
                    }}
                    keyboardType="decimal-pad"
                    placeholder="10000"
                    placeholderTextColor="rgba(255,255,255,0.55)"
                    style={styles.modeInput}
                />

                <Pressable
                    style={styles.modeHelperBtn}
                    onPress={async () => {
                        const value = String(portfolioValue || 0);
                        setStartingAmount(value);

                        const username = await getStoredUsername();
                        if (!username) return;

                        await saveDifficultySettings({
                            username,
                            mode: difficultyMode,
                            startingAmount: value,
                        });
                    }}
                >
                    <Text style={styles.modeHelperText}>Use Current Portfolio Value</Text>
                </Pressable>

                <Text style={styles.modeStatus}>
                    Mode: {difficultyMode.toUpperCase()}
                </Text>

                {difficultyMode !== "sandbox" && (
                    <Text style={styles.modeHint}>
                        {depositAllowed
                            ? "Deposits are currently allowed."
                            : depositBlockedMessage}
                    </Text>
                )}
            </View>

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
                    style={[
                        styles.depositBtn,
                        (depositing || (difficultyMode !== "sandbox" && !depositAllowed)) && { opacity: 0.7 }
                    ]}
                    onPress={handleDeposit}
                    disabled={depositing || (difficultyMode !== "sandbox" && !depositAllowed)}
                >
                    <Text style={styles.secondaryBtnText}>
                        {depositing
                            ? "DEPOSITING..."
                            : difficultyMode !== "sandbox" && !depositAllowed
                                ? "DEPOSIT LOCKED"
                                : "DEPOSIT FUNDS"}
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
//added: portfolio chart
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, paddingHorizontal: 18, paddingTop: 10 },
  scrollContent: { paddingBottom: 24},

    // added: difficulty mode styles
    modeCard: {
        width: "100%",
        backgroundColor: BLACK,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
    },
    modeTitle: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "900",
        marginBottom: 10,
    },
    modeRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
        gap: 8,
    },
    modeBtn: {
        flex: 1,
        backgroundColor: "rgba(255,255,255,0.08)",
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: "center",
    },
    modeBtnActive: {
        backgroundColor: GREEN,
    },
    modeBtnText: {
        color: "#fff",
        fontWeight: "900",
        fontSize: 12,
    },
    modeBtnTextActive: {
        color: "#0b2b22",
    },
    modeLabel: {
        color: "#fff",
        fontWeight: "800",
        marginBottom: 6,
    },
    modeInput: {
        backgroundColor: "rgba(255,255,255,0.12)",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        color: "#fff",
        fontSize: 16,
        fontWeight: "800",
        marginBottom: 10,
    },
    modeHelperBtn: {
        backgroundColor: "#1B7A61",
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: "center",
        marginBottom: 10,
    },
    modeHelperText: {
        color: "#fff",
        fontWeight: "900",
        fontSize: 13,
    },
    modeStatus: {
        color: "#fff",
        fontWeight: "900",
        marginBottom: 6,
    },
    modeHint: {
        color: "rgba(255,255,255,0.8)",
        fontSize: 12,
        lineHeight: 18,
    },

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
    marginHorizontal: 2,
},
bar: {
    width: "70%",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
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
  
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  streakMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  streakMiniText: {
    color: DARK_GREEN,
    fontSize: 20,
    fontWeight: "900",
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
