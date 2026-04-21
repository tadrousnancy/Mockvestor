import React, { useState, useCallback, useMemo} from "react";
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import XPBar from "@/components/game/xp";
import AchievementBadge from "@/components/game/achievement";
import { useFocusEffect } from "expo-router";
import { apiFetch } from "../../lib/api";
import { getStoredUsername } from "../../lib/auth";

const BG = "#F4F4F4";
const BLACK = "#0b0b0b";
const GREEN = "#2FD59B";
const DARK_GREEN = "#1B7A61";
const SELL_PINK = "#ff4d7d";
const YELLOW = "#FFD166";

type Holding = {
  symbol: string;
  shares: number;
  market_value: number;
  avg_entry_price?: number;
  current_price?: number;
  total_return?: number;
  total_return_percent?: number;
};

export default function InsightsScreen() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);

  const streakCount =3;
  const gameData = useMemo(() => {
    const hasHoldings = holdings.length > 0;
    const isDiversified = holdings.length >= 3;
    const hasWinningHolding = holdings.some(
      (h: Holding) => (h.total_return_percent ?? 0) > 0
    );

    const holdingXP = holdings.length * 25;
    const profitXP = hasWinningHolding ? 30 : 0;
    const diversificationXP = isDiversified ? 40 : 0;
    const streakXP = streakCount * 10;

    const totalXP = holdingXP + profitXP + diversificationXP + streakXP;

    const maxXP = 200;
    const level = Math.max(1, Math.floor(totalXP / 150) + 1);
    const currentXP = totalXP % maxXP;
  
    return {
      streakCount,
      currentXP,
      maxXP,
      level,
      achievements: [
        {
          title: "First Trade",
          icon: "swap-horizontal-outline",
          unlocked: hasHoldings,
        },
        {
          title: "First Profitable Trade",
          icon: "trending-up-outline",
          unlocked: hasWinningHolding,
        },
        {
          title: "3-Day Streak",
          icon: "flame-outline",
          unlocked: streakCount >= 3,
        },
        {
          title: "Diversified Portfolio",
          icon: "git-network-outline",
          unlocked: isDiversified,
        },
        {
          title: "Risk Aware",
          icon: "shield-checkmark-outline",
          unlocked: hasHoldings,
        },
      ],
    };
  }, [holdings]);

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
      Alert.alert("Insights Error", error.message || "Failed to load portfolio insights.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPortfolio();
    }, [loadPortfolio])
  );

  const insightCards = useMemo(() => {
    const portfolioValue = portfolio?.portfolio_value ?? 0;

    if (!holdings.length || portfolioValue <= 0) {
      return [
        {
          title: "Top Holding",
          icon: "pie-chart-outline",
          accent: GREEN,
          text: "No holdings available yet. Make a trade to begin generating portfolio insights.",
        },
        {
          title: "Concentration",
          icon: "warning-outline",
          accent: YELLOW,
          text: "No concentration data is available yet because your portfolio has no active holdings.",
        },
        {
          title: "Diversification",
          icon: "git-network-outline",
          accent: SELL_PINK,
          text: "Diversification insights will appear once you build positions across one or more assets.",
        },
        {
          title: "Risk Profile",
          icon: "pulse-outline",
          accent: YELLOW,
          text: "Risk profile will update automatically once your portfolio contains holdings.",
        },
        {
          title: "Recommended",
          icon: "bulb-outline",
          accent: GREEN,
          text: "Start with a small position, then diversify across multiple assets as you build your portfolio.",
        },
      ];
    }

    const sortedHoldings = [...holdings].sort(
      (a, b) => (b.market_value ?? 0) - (a.market_value ?? 0)
    );

    const topHolding = sortedHoldings[0];
    const topHoldingPct = ((topHolding.market_value ?? 0) / portfolioValue) * 100;
    const holdingCount = holdings.length;

    const avgAbsReturn =
      holdings.reduce((sum: number, h: Holding) => sum + Math.abs(h.total_return_percent ?? 0), 0) / holdingCount;

    let concentrationText = "";
    let concentrationAccent = YELLOW;

    if (topHoldingPct >= 50) {
      concentrationText = `${topHolding.symbol} makes up ${topHoldingPct.toFixed(
        1
      )}% of your portfolio, which suggests high concentration risk.`;
      concentrationAccent = SELL_PINK;
    } else if (topHoldingPct >= 30) {
      concentrationText = `${topHolding.symbol} makes up ${topHoldingPct.toFixed(
        1
      )}% of your portfolio, which suggests moderate concentration.`;
      concentrationAccent = YELLOW;
    } else {
      concentrationText = `${topHolding.symbol} makes up ${topHoldingPct.toFixed(
        1
      )}% of your portfolio, which suggests relatively balanced exposure.`;
      concentrationAccent = GREEN;
    }

    let diversificationText = "";
    let diversificationAccent = SELL_PINK;

    if (holdingCount <= 2) {
      diversificationText = `You currently hold ${holdingCount} position${
        holdingCount === 1 ? "" : "s"
      }, which suggests low diversification.`;
      diversificationAccent = SELL_PINK;
    } else if (holdingCount <= 5) {
      diversificationText = `You currently hold ${holdingCount} positions, which suggests moderate diversification.`;
      diversificationAccent = YELLOW;
    } else {
      diversificationText = `You currently hold ${holdingCount} positions, which suggests strong diversification.`;
      diversificationAccent = GREEN;
    }

    let riskText = "";
    let riskAccent = YELLOW;

    if (topHoldingPct >= 50 || avgAbsReturn >= 10) {
      riskText =
        "Your portfolio currently appears higher risk due to concentration or larger swings in holding performance.";
      riskAccent = SELL_PINK;
    } else if (topHoldingPct >= 30 || avgAbsReturn >= 5) {
      riskText =
        "Your portfolio currently appears moderate risk based on concentration and recent holding movement.";
      riskAccent = YELLOW;
    } else {
      riskText =
        "Your portfolio currently appears relatively balanced based on concentration and overall holding movement.";
      riskAccent = GREEN;
    }

    let recommendationText = "";
    if (topHoldingPct >= 50) {
      recommendationText =
        "Consider reducing exposure to your top holding or adding other positions to lower concentration risk.";
    } else if (holdingCount <= 2) {
      recommendationText =
        "Consider adding more positions over time so your portfolio is less dependent on one or two assets.";
    } else {
      recommendationText =
        "Your portfolio structure looks reasonably balanced. Continue monitoring position size so no single holding dominates.";
    }

    return [
      {
        title: "Top Holding",
        icon: "pie-chart-outline",
        accent: YELLOW,
        text: `${topHolding.symbol} is currently your largest holding, making up ${topHoldingPct.toFixed(
          1
        )}% of your portfolio.`,
      },
      {
        title: "Concentration",
        icon: "warning-outline",
        accent: concentrationAccent,
        text: concentrationText,
      },
      {
        title: "Diversification",
        icon: "git-network-outline",
        accent: diversificationAccent,
        text: diversificationText,
      },
      {
        title: "Risk Profile",
        icon: "pulse-outline",
        accent: riskAccent,
        text: riskText,
      },
      {
        title: "Recommended",
        icon: "bulb-outline",
        accent: GREEN,
        text: recommendationText,
      },
    ];
  }, [holdings, portfolio]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* header */}
        <View style={styles.headerRow}>
            <View style={styles.brandRow}>
                <Ionicons name="trending-up" size={26} color={DARK_GREEN} />
                <Text style={styles.brand}>MOCKVESTOR</Text>
            </View>
                
            <View style={styles.headerRight}>
                <View style={styles.streakMini}>
                    <Ionicons name="flame" size={25} color={DARK_GREEN} />
                    <Text style={styles.streakMiniText}>{gameData.streakCount}</Text>
                </View>
                
                <Pressable onPress={() => console.log("profile pressed")} hitSlop={10}>
                    <Ionicons name="person-circle-outline" size={30} color={DARK_GREEN} />
                </Pressable>
            </View>
        </View>

        <View style={styles.headerCard}>
          <View style={styles.headerCardRow}>
            <Ionicons name="analytics-outline" size={24} color={GREEN} />
            <Text style={styles.headerTitle}>Insights</Text>
          </View>

          <Text style={styles.headerText}>
            {loading 
              ? "Loading personalized portfolio insights..."
              : "Personalized portfolio insights based on current holdings." }
          </Text>
        </View>

        {/* xp bar */}
        <XPBar currentXP={gameData.currentXP} maxXP={gameData.maxXP} level={gameData.level} />

        <View style={styles.achievementCard}>
            <View style={styles.achievementHeaderRow}>
                <View style={[styles.iconWrap, { backgroundColor: GREEN }]}>
                   <Ionicons name="trophy-outline" size={18} color="#fff" />
                </View>
                <Text style={styles.achievementTitle}>Achievements</Text>
            </View>
            
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.achievementRow}
            >
            {gameData.achievements.map((item: any) => (
                <AchievementBadge
                   key={item.title}
                   title={item.title}
                   icon={item.icon as any}
                   unlocked={item.unlocked}
                />
            ))}
            </ScrollView>
        </View>    


        {insightCards.map((item) => (
          <View key={item.title} style={styles.card}>
            <View style={styles.cardTopRow}>
              <View style={[styles.iconWrap, { backgroundColor: item.accent }]}>
                <Ionicons name={item.icon as any} size={18} color="#fff" />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
            </View>

            <Text style={styles.cardText}>{item.text}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    paddingHorizontal: 18,
    paddingTop:10,
    paddingBottom: 28,
    width: "100%",
  },
  headerCard: {
    width: "100%",
    backgroundColor: BLACK,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  headerCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  headerText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  card: {
    width: "100%",
    backgroundColor: BLACK,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  cardText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  
  brand: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
    color: DARK_GREEN,
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

  headerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  
  achievementCard: {
    width: "100%",
    backgroundColor: BLACK,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  
  achievementHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  
  achievementTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  
  achievementRow: {
    paddingRight: 8,
    gap: 10,
  },
  
  
});