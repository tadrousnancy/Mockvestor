import { API_BASE_URL } from "../config";
import { saveSession } from "../lib/auth";
import React, { useRef, useState } from "react";
import {
    SafeAreaView,
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function Index() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [showPass, setShowPass] = useState(false);
    const passRef = useRef<TextInput>(null);

    //updated handleLogin to match the backend login response structure shown in main.py and integration doc
    async function handleLogin() {
        if (!username.trim() || !password.trim()) {
            Alert.alert("Missing info", "Please enter your username and password.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/accounts/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Login failed");
            }

            await saveSession({
                accessToken: data.access_token,
                username: data.username ?? username,
                userId: data.user_id,
                alpacaAccountId: data.alpaca_account_id,
            });

            Alert.alert("Success", "Login successful!");
            router.replace("/(tabs)");
        } catch (error: any) {
            Alert.alert("Login Error", error.message || "Something went wrong.");
        }
    }

    function toggleShowPassword() {
        setShowPass((prev) => !prev);

        // iOS fix: keep text from visually clearing when secureTextEntry toggles
        requestAnimationFrame(() => {
            passRef.current?.setNativeProps({ text: password });
        });
    }

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <Text style={styles.title}>MOCKVESTOR</Text>
                <Text style={styles.subtitle}>Sign in to Continue</Text>

                <View style={styles.hero}>
                    <Ionicons name="trending-up" size={88} color={DARK_GREEN} />
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Username</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="User_Here"
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                        value={username}
                        onChangeText={setUsername}
                    />

                    <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
                    <View style={styles.inputWrap}>
                        <TextInput
                            ref={passRef}
                            style={[styles.input, styles.inputWithRightIcon]}
                            placeholder="••••••••"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPass}
                            autoCapitalize="none"
                            autoCorrect={false}
                            spellCheck={false}
                            // stop iOS strong-password/keychain prompts for now, causing werid React state glitches
                            textContentType="none"
                            autoComplete="off"
                        />
                        <Pressable onPress={toggleShowPassword} style={styles.eyeBtn} hitSlop={10}>
                            <Ionicons name={showPass ? "eye-off" : "eye"} size={18} color="#333" />
                        </Pressable>
                    </View>

                    <Pressable
                        onPress={() => Alert.alert("UI only", "Forgot Password pressed")}
                        hitSlop={10}
                    >
                        <Text style={styles.forgot}>Forgot Password?</Text>
                    </Pressable>

                    <Pressable style={styles.button} onPress={handleLogin}>
                        <Text style={styles.buttonText}>Login</Text>
                    </Pressable>

                    <View style={styles.orRow}>
                        <View style={styles.orLine} />
                        <Text style={styles.orText}>OR</Text>
                        <View style={styles.orLine} />
                    </View>

                    <Pressable onPress={() => router.push("/register")} hitSlop={10}>
                        <Text style={styles.create}>Create an Account</Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}

const GREEN = "#2FD59B";
const DARK_GREEN = "#1B7A61";

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#F4F4F4" },
    container: { flex: 1, padding: 18, alignItems: "center" },

    title: {
        fontSize: 38,
        fontWeight: "900",
        letterSpacing: 1,
        color: DARK_GREEN,
        marginTop: 10,
    },
    subtitle: { marginTop: 6, fontSize: 14, opacity: 0.75 },

    hero: { marginTop: 16, width: "100%", alignItems: "center" },

    card: {
        width: "100%",
        maxWidth: 420,
        marginTop: 18,
        backgroundColor: GREEN,
        borderRadius: 18,
        padding: 16,
    },

    label: { fontSize: 12, fontWeight: "800", color: "#0b2b22", marginBottom: 6 },

    input: {
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 14,
    },

    inputWrap: { position: "relative" },
    inputWithRightIcon: { paddingRight: 44 }, // keep full width equal to username
    eyeBtn: {
        position: "absolute",
        right: 10,
        top: 0,
        bottom: 0,
        width: 34,
        alignItems: "center",
        justifyContent: "center",
    },

    forgot: {
        marginTop: 10,
        textAlign: "center",
        fontSize: 12,
        color: "#0b2b22",
        opacity: 0.85,
        textDecorationLine: "underline",
    },

    button: {
        marginTop: 14,
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: "center",
    },
    buttonText: { fontWeight: "900", fontSize: 16, color: "#0b2b22" },

    orRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 14,
        marginBottom: 8,
    },
    orLine: { flex: 1, height: 1, backgroundColor: "rgba(0,0,0,0.25)" },
    orText: { marginHorizontal: 10, fontWeight: "800", color: "#0b2b22", opacity: 0.8 },

    create: {
        textAlign: "center",
        fontWeight: "900",
        color: "#0b2b22",
        textDecorationLine: "underline",
    },
});