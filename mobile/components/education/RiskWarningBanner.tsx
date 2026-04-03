import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type RiskWarningBannerProps = {
  message: string;
  onClose: () => void;
};

const SELL_PINK = "#ff4d7d";

export default function RiskWarningBanner({ message, onClose }: RiskWarningBannerProps) {
  return (
    <View style={styles.banner}>
      <Ionicons name="warning-outline" size={30} color="#fff" />

      <Text style={styles.text}>
        {message}{" "}
        <Text style={styles.gotIt} onPress={onClose}>
          Got it
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: "100%",
    backgroundColor: SELL_PINK,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  text: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  gotIt: {
    textDecorationLine: "underline",
    textDecorationColor: "#000",
    color: "#000",
    fontWeight: "900",
  },
});