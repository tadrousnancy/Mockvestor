import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";

type GameFeedbackPopupProps = {
  message: string;
  visible: boolean;
  duration?: number;
};

const BLACK = "#0b0b0b";
const GREEN = "#2FD59B";

export default function GameFeedbackPopup({
  message,
  visible,
  duration = 10000,
}: GameFeedbackPopupProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);

      const timer = setTimeout(() => {
        setShow(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration]);

  if (!show) return null;

  return (
    <View style={styles.popup}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  popup: {
    position: "absolute",
    top: 120,
    alignSelf: "center",
    backgroundColor: BLACK,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    zIndex: 999,
    borderWidth: 1,
    borderColor: GREEN,
  },
  text: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
  },
});