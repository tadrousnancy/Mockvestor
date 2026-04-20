import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type AchievementBadgeProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  unlocked: boolean;
};

const GREEN = "#2FD59B";
const BLACK = "#0b0b0b";

export default function AchievementBadge({
  title,
  icon,
  unlocked,
}: AchievementBadgeProps) {
  return (
    <View style={[styles.badge, unlocked ? styles.unlockedBadge : styles.lockedBadge]}>
      <View style={[styles.iconWrap, unlocked ? styles.unlockedIconWrap : styles.lockedIconWrap]}>
        <Ionicons
          name={icon}
          size={18}
          color={unlocked ? "#fff" : "rgba(255,255,255,0.8)"}
        />
      </View>

      <Text style={[styles.title, unlocked ? styles.unlockedText : styles.lockedText]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 110,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  unlockedBadge: {
    backgroundColor: GREEN,
  },

  lockedBadge: {
    backgroundColor: BLACK,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  unlockedIconWrap: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },

  lockedIconWrap: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  title: {
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 16,
  },

  unlockedText: {
    color: "#0b2b22",
  },

  lockedText: {
    color: "rgba(255,255,255,0.9)",
  },
});