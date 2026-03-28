import React, { useMemo, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const GREEN = "#2FD59B";
const DARK_GREEN = "#1B7A61";
const BG = "#F4F4F4";
const BLACK = "#0b0b0b";
const SELL_PINK = "#ff4d7d";

type RangeKey = "1D" | "1W" | "1M" | "3M" | "6M" | "YTD";
type TradeMode = "BUY" | "SELL";

export default function TradeScreen() {
    const [range, setRange] = useState<RangeKey>("1W");
    const [mode, setMode] = useState<TradeMode>("SELL");
    const [quantity, setQuantity] = useState("1.0");

    const ticker = "AAPL";
    const price = 182.64;
    const changePctToday = 0.012;
    const buyingPower = 5225;

    const rangeButtons: RangeKey[] = useMemo(
        () => ["1D", "1W", "1M", "3M", "6M", "YTD"],
        []
    );

    const estimatedCost = Number(quantity || 0) * price;

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                {/* header */}
                <View style={styles.headerRow}>
                    <View style={styles.brandRow}>
                        <Ionicons name="trending-up" size={26} color={DARK_GREEN} />
                        <Text style={styles.brand}>MOCKVESTOR</Text>
                    </View>

                    <Pressable onPress={() => console.log("profile pressed")} hitSlop={10}>
                        <Ionicons name="person-circle-outline" size={30} color={DARK_GREEN} />
                    </Pressable>
                </View>

                {/* stock header card */}
                <View style={styles.stockCard}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.stockSymbol}>{ticker}</Text>
                    </View>

                    <View style={styles.stockInfoRight}>
                        <Text style={styles.stockPrice}>{formatMoney(price)}</Text>
                        <Text style={styles.stockDelta}>{formatPct(changePctToday)} today</Text>
                    </View>

                    <View style={styles.stockIconWrap}>
                        <Ionicons name="wallet-outline" size={22} color="#0b2b22" />
                    </View>
                </View>

                {/* chart placeholder */}
                <View style={styles.chartCard}>
                    <View style={styles.chartTopRow}>
                        <View style={styles.chartTitleStub} />
                        <View style={styles.chartTitleStubSmall} />
                    </View>

                    <View style={styles.chartBody}>
                        <Ionicons name="stats-chart" size={44} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.chartHint}>Chart placeholder ({range})</Text>
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
                            >
                                <Text style={[styles.rangeText, active && styles.rangeTextActive]}>
                                    {k}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* buy/sell toggle buttons*/}
                <View style={styles.toggleRow}>
                    <Pressable
                        style={[styles.toggleBtn, mode === "BUY" && styles.buyActive]}
                        onPress={() => setMode("BUY")}
                    >
                        <Text
                            style={[
                                styles.toggleText,
                                mode === "BUY" ? styles.buyTextActive : styles.toggleTextInactive,
                            ]}
                        >
                            BUY
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[styles.toggleBtn, mode === "SELL" && styles.sellActive]}
                        onPress={() => setMode("SELL")}
                    >
                        <Text
                            style={[
                                styles.toggleText,
                                mode === "SELL" ? styles.sellTextActive : styles.toggleTextInactive,
                            ]}
                        >
                            SELL
                        </Text>
                    </Pressable>
                </View>

                {/* quantity */}
                <View style={styles.quantityCard}>
                    <Text style={styles.quantityLabel}>Quantity</Text>

                    <View style={styles.quantityControls}>
                        <Pressable
                            style={styles.qtyCircle}
                            onPress={() =>
                                setQuantity((Math.max(0, Number(quantity || 0) - 1)).toFixed(1))
                            }
                        >
                            <Ionicons name="remove-circle-outline" size={24} color="#fff" />
                        </Pressable>

                        <TextInput
                            value={quantity}
                            onChangeText={setQuantity}
                            keyboardType="numeric"
                            style={styles.qtyInput}
                        />

                        <Pressable
                            style={styles.qtyCircle}
                            onPress={() => setQuantity((Number(quantity || 0) + 1).toFixed(1))}
                        >
                            <Ionicons name="add-circle-outline" size={24} color="#fff" />
                        </Pressable>
                    </View>
                </View>

                {/* review transaction */}
                <View style={styles.reviewCard}>
                    <Text
                        style={[
                            styles.reviewTitle,
                            { color: mode === "BUY" ? GREEN : SELL_PINK }
                        ]}
                    >
                        Review Transaction
                    </Text>

                    <View style={styles.reviewRow}>
                        <Text style={styles.reviewLabel}>Buying Power:</Text>
                        <Text style={styles.reviewValue}>{formatMoney(buyingPower)}</Text>
                    </View>

                    <View style={styles.reviewRow}>
                        <Text style={styles.reviewLabel}>Estimated Cost:</Text>
                        <Text style={styles.reviewValue}>{formatMoney(estimatedCost)}</Text>
                    </View>

                    <View style={styles.reviewRow}>
                        <Text style={styles.reviewLabel}>Shares:</Text>
                        <Text style={styles.reviewValue}>{quantity}</Text>
                    </View>
                </View>

                {/* execute button */}
                <Pressable
                    style={[styles.executeBtn, mode === "SELL" && styles.executeBtnSell]}
                    onPress={() => console.log(`${mode} ${ticker}`)}
                >
                    <Text style={styles.executeText}>
                        {mode === "BUY" ? `BUY ${ticker}` : `SELL ${ticker}`}
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

function formatMoney(n: number) {
    return `$${n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatPct(x: number) {
    const sign = x >= 0 ? "+" : "";
    return `${sign}${(x * 100).toFixed(1)}%`;
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: BG },
    container: { flex: 1, paddingHorizontal: 18, paddingTop: 10 },

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

    stockCard: {
        width: "100%",
        backgroundColor: GREEN,
        borderRadius: 18,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    stockSymbol: {
        fontSize: 28,
        fontWeight: "900",
        color: "#0b2b22",
    },
    stockInfoRight: {
        alignItems: "flex-end",
        marginRight: 10,
    },
    stockPrice: {
        fontSize: 18,
        fontWeight: "900",
        color: "#0b2b22",
    },
    stockDelta: {
        marginTop: 4,
        fontWeight: "800",
        color: "#0b2b22",
        opacity: 0.9,
    },
    stockIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.35)",
        alignItems: "center",
        justifyContent: "center",
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
        height: 130,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.06)",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    chartHint: {
        color: "rgba(255,255,255,0.75)",
        fontWeight: "800",
    },

    rangeRow: {
        width: "100%",
        backgroundColor: BLACK,
        borderRadius: 14,
        padding: 6,
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    rangeBtn: {
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 12,
    },
    rangeBtnActive: {
        backgroundColor: "rgba(255,255,255,0.12)",
    },
    rangeText: {
        color: "rgba(255,255,255,0.75)",
        fontWeight: "900",
        fontSize: 12,
    },
    rangeTextActive: { color: "#fff" },

    toggleRow: {
        width: "100%",
        backgroundColor: BLACK,
        borderRadius: 16,
        flexDirection: "row",
        overflow: "hidden",
        marginBottom: 12,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
    },
    buyActive: { backgroundColor: GREEN },
    sellActive: { backgroundColor: SELL_PINK },
    toggleText: {
        fontSize: 18,
        fontWeight: "900",
    },
    buyTextActive: { color: "#fff" },
    sellTextActive: { color: "#fff" },
    toggleTextInactive: { color: "rgba(255,255,255,0.65)" },

    quantityCard: {
        width: "100%",
        backgroundColor: BLACK,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    quantityLabel: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "900",
    },
    quantityControls: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    qtyCircle: {
        alignItems: "center",
        justifyContent: "center",
    },
    qtyInput: {
        minWidth: 56,
        textAlign: "center",
        color: "#fff",
        fontSize: 20,
        fontWeight: "900",
    },

    reviewCard: {
        width: "100%",
        backgroundColor: BLACK,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
    },
    reviewTitle: {
        color: SELL_PINK,
        fontSize: 16,
        fontWeight: "900",
        marginBottom: 10,
    },
    reviewRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    reviewLabel: {
        color: "#fff",
        fontWeight: "700",
    },
    reviewValue: {
        color: "#fff",
        fontWeight: "900",
    },

    executeBtn: {
        width: "100%",
        backgroundColor: GREEN,
        borderRadius: 18,
        paddingVertical: 14,
        alignItems: "center",
        marginBottom: 10,
    },
    executeBtnSell: {
        backgroundColor: SELL_PINK,
    },
    executeText: {
        color: "#fff",
        fontSize: 22,
        fontWeight: "900",
        letterSpacing: 1,
    },
});
