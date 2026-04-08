import React from "react";
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import XPBar from "@/components/game/xp";
import AchievementBadge from "@/components/game/achievement";

const BG = "#F4F4F4";
const BLACK = "#0b0b0b";
const GREEN = "#2FD59B";
const DARK_GREEN = "#1B7A61";
const SELL_PINK = "#ff4d7d";
const YELLOW = "#FFD166";

// placeholder values for xp bar 
const currentXP = 120;
const maxXP = 200;
const level = 3;

// placeholder value for daily streak 
const streakCount = 3;

// placeholder achievement data 
const achievements = [
    {
      title: "First Trade",
      icon: "swap-horizontal-outline",
      unlocked: true,
    },
    {
      title: "First Profitable Trade",
      icon: "trending-up-outline",
      unlocked: true,
    },
    {
      title: "3-Day Streak",
      icon: "flame-outline",
      unlocked: true,
    },
    {
      title: "Diversified Portfolio",
      icon: "git-network-outline",
      unlocked: false,
    },
    {
      title: "Risk Aware",
      icon: "shield-checkmark-outline",
      unlocked: false,
    },
  ];


const insights = [
  {
    title: "Top Holding",
    icon: "pie-chart-outline",
    accent: YELLOW,
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
            Personalized portfolio observations based on your current holdings and allocation.
          </Text>
        </View>

        {/* xp bar */}
        <XPBar currentXP={currentXP} maxXP={maxXP} level={level} />

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
            {achievements.map((item) => (
                <AchievementBadge
                   key={item.title}
                   title={item.title}
                   icon={item.icon as any}
                   unlocked={item.unlocked}
                />
            ))}
            </ScrollView>
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