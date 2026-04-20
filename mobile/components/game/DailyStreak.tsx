// seperate component for integration - current daily streak is UI only in headers 

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type DailyStreakProps = {
  streakCount: number;
};

const DARK_GREEN = "#1B7A61";

export default function DailyStreak({ streakCount }: DailyStreakProps) {
  return (
    <View style={styles.streakMini}>
      <Ionicons name="flame" size={25} color={DARK_GREEN} />
      <Text style={styles.streakMiniText}>{streakCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
});