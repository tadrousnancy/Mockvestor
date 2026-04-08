import React from "react";
import { View, Text, StyleSheet } from "react-native";

type XPBarProps = {
  currentXP: number;
  maxXP: number;
  level: number;
};

const BLACK = "#0b0b0b";
const GREEN = "#2FD59B";
const BG_BAR = "rgba(255,255,255,0.12)";

export default function XPBar({ currentXP, maxXP, level }: XPBarProps) {
  const progress = Math.min(currentXP / maxXP, 1);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Level {level} Investor</Text>
        <Text style={styles.xpText}>
          {currentXP} / {maxXP} XP
        </Text>
      </View>

      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: BLACK,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  xpText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  barBackground: {
    width: "100%",
    height: 10,
    backgroundColor: BG_BAR,
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: GREEN,
    borderRadius: 999,
  },
});