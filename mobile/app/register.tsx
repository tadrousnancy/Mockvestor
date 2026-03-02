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

export default function Register() {
    //registration values for alpaca: first name, last, email, username, and password
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");

    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const passRef = useRef<TextInput>(null);
    const confirmRef = useRef<TextInput>(null);

    function toggleShowPassword() {
        setShowPass((prev) => !prev);
        requestAnimationFrame(() => {
            passRef.current?.setNativeProps({ text: password });
        });
    }

    function toggleShowConfirm() {
        setShowConfirm((prev) => !prev);
        requestAnimationFrame(() => {
            confirmRef.current?.setNativeProps({ text: confirm });
        });
    }

    function handleCreate() {
        if (!firstName.trim() || !lastName.trim() || !email.trim() || !username.trim()) {
            Alert.alert("Missing info", "Please fill out First Name, Last Name, Email, and Username.");
            return;
        }
        if (!password) {
            Alert.alert("Missing password", "Please enter a password.");
            return;
        }
        if (password !== confirm) {
            Alert.alert("Passwords do not match", "Confirm Password must match Password.");
            return;
        }

        // Later: Supabase signUp / backend call with:
        // { firstName, lastName, email, username, password }
        Alert.alert(
            "UI only",
            `Create pressed\n${firstName} ${lastName}\nemail=${email}\nusername=${username}`
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <Text style={styles.title}>MOCKVESTOR</Text>
                <Text style={styles.subtitle}>Create an account to continue</Text>

                <View style={styles.card}>
                    <Text style={styles.label}>First Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="First"
                        value={firstName}
                        onChangeText={setFirstName}
                        autoCapitalize="words"
                        autoCorrect={false}
                        spellCheck={false}
                    />

                    <Text style={[styles.label, { marginTop: 12 }]}>Last Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Last"
                        value={lastName}
                        onChangeText={setLastName}
                        autoCapitalize="words"
                        autoCorrect={false}
                        spellCheck={false}
                    />

                    <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="you@example.com"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                        keyboardType="email-address"
                    />

                    <Text style={[styles.label, { marginTop: 12 }]}>Username</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="User_1234"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
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
                            // disable iOS keychain prompt for now
                            textContentType="none"
                            autoComplete="off"
                        />
                        <Pressable onPress={toggleShowPassword} style={styles.eyeBtn} hitSlop={10}>
                            <Ionicons name={showPass ? "eye-off" : "eye"} size={18} color="#333" />
                        </Pressable>
                    </View>

                    <Text style={[styles.label, { marginTop: 12 }]}>Confirm Password</Text>
                    <View style={styles.inputWrap}>
                        <TextInput
                            ref={confirmRef}
                            style={[styles.input, styles.inputWithRightIcon]}
                            placeholder="••••••••"
                            value={confirm}
                            onChangeText={setConfirm}
                            secureTextEntry={!showConfirm}
                            autoCapitalize="none"
                            autoCorrect={false}
                            spellCheck={false}
                            // disable iOS Keychain prompt for now
                            textContentType="none"
                            autoComplete="off"
                        />
                        <Pressable onPress={toggleShowConfirm} style={styles.eyeBtn} hitSlop={10}>
                            <Ionicons name={showConfirm ? "eye-off" : "eye"} size={18} color="#333" />
                        </Pressable>
                    </View>

                    <Pressable style={styles.button} onPress={handleCreate}>
                        <Text style={styles.buttonText}>Create Account</Text>
                    </Pressable>

                    <Pressable onPress={() => router.back()} hitSlop={10}>
                        <Text style={styles.back}>Back to Login</Text>
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
    inputWithRightIcon: { paddingRight: 44 }, // same width as username
    eyeBtn: {
        position: "absolute",
        right: 10,
        top: 0,
        bottom: 0,
        width: 34,
        alignItems: "center",
        justifyContent: "center",
    },

    button: {
        marginTop: 16,
        backgroundColor: "#d7f6ea",
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
    },
    buttonText: { fontWeight: "900", fontSize: 18, color: "#0b2b22" },

    back: {
        textAlign: "center",
        marginTop: 14,
        textDecorationLine: "underline",
        fontWeight: "800",
        color: "#0b2b22",
    },
});