import React from "react";
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const BG = "#F4F4F4";
const BLACK = "#0b0b0b";
const GREEN = "#2FD59B";
const SELL_PINK = "#ff4d7d";
const YELLOW = "#FFD166";

const insights = [
  {
    title: "Top Holding",
    icon: "pie-chart-outline",
    accent: GREEN,
    text: "AAPL is currently your largest holding, making up 40% of your portfolio.",
  },
  {
    title: "Concentration",
    icon: "warning-outline",
    accent: YELLOW,
    text: "Your portfolio is moderately concentrated in one asset, which can increase risk if that stock underperforms.",
  },
  {
    title: "Diversification",
    icon: "git-network-outline",
    accent: SELL_PINK,
    text: "Your holdings span multiple stocks, but several may still move similarly under market stress.",
  },
  {
    title: "Risk Profile",
    icon: "pulse-outline",
    accent: YELLOW,
    text: "Your current portfolio suggests moderate risk exposure based on concentration and allocation.",
  },

  {
    title: "Recommended",
    icon: "bulb-outline",
    accent: GREEN,
    text: "Consider diversifying your holdings to reduce overall portfolio risk."
  },
];

export default function InsightsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Ionicons name="analytics-outline" size={24} color={GREEN} />
            <Text style={styles.headerTitle}>Insights</Text>
          </View>

          <Text style={styles.headerText}>
            Personalized portfolio observations based on your current holdings and allocation.
          </Text>
        </View>

        {insights.map((item) => (
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
});