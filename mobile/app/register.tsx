import React, { useMemo, useState } from "react";
import { SafeAreaView, View, Text, TextInput, Pressable, StyleSheet } from "react-native";

export default function Register() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");

    const passwordsMatch = useMemo(() => {
        if (!password || !confirm) return true;
        return password === confirm;
    }, [password, confirm]);

    const canSubmit = username.trim().length >= 3 && password.length >= 6 && passwordsMatch;

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <Text style={styles.title}>MOCKVESTER</Text>
                <Text style={styles.subtitle}>Create an account to continue</Text>

                <View style={styles.card}>
                    <Text style={styles.label}>Username</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="User_1234"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={username}
                        onChangeText={setUsername}
                    />

                    <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        secureTextEntry
                        autoCapitalize="none"
                        value={password}
                        onChangeText={setPassword}
                    />

                    <Text style={[styles.label, { marginTop: 12 }]}>Confirm Password</Text>
                    <TextInput
                        style={[styles.input, !passwordsMatch && styles.inputError]}
                        placeholder="••••••••"
                        secureTextEntry
                        autoCapitalize="none"
                        value={confirm}
                        onChangeText={setConfirm}
                    />
                    {!passwordsMatch && <Text style={styles.error}>Passwords do not match</Text>}

                    <Pressable
                        style={[styles.button, !canSubmit && styles.buttonDisabled]}
                        disabled={!canSubmit}
                        onPress={() => alert("Account created (UI only).")}
                    >
                        <Text style={styles.buttonText}>Create Account</Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}

const GREEN = "#2FD59B";

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#F4F4F4" },
    container: { flex: 1, padding: 18, alignItems: "center" },
    title: { fontSize: 36, fontWeight: "900", letterSpacing: 1, color: "#1B7A61", marginTop: 10 },
    subtitle: { marginTop: 6, fontSize: 14, opacity: 0.75 },
    card: { width: "100%", maxWidth: 420, marginTop: 22, backgroundColor: GREEN, borderRadius: 18, padding: 16 },
    label: { fontSize: 12, fontWeight: "800", color: "#0b2b22", marginBottom: 6 },
    input: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
    inputError: { borderWidth: 2, borderColor: "#D7263D" },
    error: { marginTop: 6, fontSize: 12, color: "#5b0b16", fontWeight: "700" },
    button: { marginTop: 16, backgroundColor: "#fff", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
    buttonDisabled: { opacity: 0.65 },
    buttonText: { fontWeight: "900", fontSize: 16, color: "#0b2b22" },
});