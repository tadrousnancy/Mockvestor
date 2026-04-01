import React from "react";
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const BG = "#F4F4F4";
const BLACK = "#0b0b0b";
const GREEN = "#2FD59B";

const concepts = [
  {
    title: "Volatility",
    description:
      "Volatility reflects the magnitude and frequency of price fluctuations in an asset over time.",
    why:
      "Higher volatility increases uncertainty. It can amplify returns, but also accelerates losses especially in concentrated positions.",
  },
  {
    title: "Diversification",
    description:
      "Diversification reduces risk by allocating capital across assets with different behaviors and correlations.",
    why:
      "Holding multiple assets is not enough, true diversification depends on how independently those assets move.",
  },
  {
    title: "Concentration Risk",
    description:
      "Concentration risk arises when a large portion of a portfolio is allocated to a single asset or sector.",
    why:
      "Even strong assets can underperform. High concentration increases exposure to single-point failure.",
  },
  {
    title: "Correlation",
    description:
      "Correlation measures how assets move in relation to one another, ranging from -1 to +1.",
    why:
      "Owning highly correlated assets reduces the effectiveness of diversification and increases systemic risk.",
  },
  {
    title: "Drawdown",
    description:
      "Drawdown represents the decline from a portfolio’s peak value to its lowest point before recovery.",
    why:
      "Large drawdowns require disproportionately higher gains to recover, making risk control critical.",
  },
  {
    title: "Risk-Reward Tradeoff",
    description:
      "The relationship between the potential return of an investment and the level of risk taken to achieve it.",
    why:
      "Chasing high returns often involves accepting higher volatility and potential losses. Balance is key.",
  },
  {
    title: "Position Sizing",
    description:
      "Position sizing determines how much capital is allocated to a single trade relative to total portfolio value.",
    why:
      "Even good trades can cause damage if position sizes are too large. Proper sizing helps control downside risk.",
  },
  {
    title: "Liquidity",
    description:
      "Liquidity refers to how easily an asset can be bought or sold without significantly affecting its price.",
    why:
      "Low liquidity can lead to slippage, making entries and exits more costly and unpredictable.",
  },
];

export default function LearningScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Ionicons name="school-outline" size={24} color={GREEN} />
            <Text style={styles.headerTitle}>Learning</Text>
          </View>

          <Text style={styles.headerText}>
            Key investing concepts for making stronger portfolio decisions.
          </Text>
        </View>

        {concepts.map((concept) => (
          <View key={concept.title} style={styles.card}>
            <Text style={styles.cardTitle}>{concept.title}</Text>
            <Text style={styles.cardDescription}>{concept.description}</Text>

            <Text style={styles.whyLabel}>Why it matters</Text>
            <Text style={styles.cardWhy}>{concept.why}</Text>
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
    padding: 18,
    paddingBottom: 28,
  },
  headerCard: {
    width: "100%",
    backgroundColor: BLACK,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
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
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },
  cardDescription: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginBottom: 10,
  },
  whyLabel: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardWhy: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
});