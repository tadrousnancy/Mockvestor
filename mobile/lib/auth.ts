// small auth/session helper
import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "mockvestor_access_token";
const USERNAME_KEY = "mockvestor_username";
const USER_ID_KEY = "mockvestor_user_id";
const ALPACA_ACCOUNT_ID_KEY = "mockvestor_alpaca_account_id";

export async function saveSession(params: {
    accessToken: string;
    username: string;
    userId: string;
    alpacaAccountId?: string | null;
}) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, params.accessToken);
    await SecureStore.setItemAsync(USERNAME_KEY, params.username);
    await SecureStore.setItemAsync(USER_ID_KEY, params.userId);

    if (params.alpacaAccountId) {
        await SecureStore.setItemAsync(ALPACA_ACCOUNT_ID_KEY, params.alpacaAccountId);
    } else {
        await SecureStore.deleteItemAsync(ALPACA_ACCOUNT_ID_KEY);
    }
}

export async function getAccessToken() {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getStoredUsername() {
    return SecureStore.getItemAsync(USERNAME_KEY);
}

export async function getStoredUserId() {
    return SecureStore.getItemAsync(USER_ID_KEY);
}

export async function getStoredAlpacaAccountId() {
    return SecureStore.getItemAsync(ALPACA_ACCOUNT_ID_KEY);
}

export async function clearSession() {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USERNAME_KEY);
    await SecureStore.deleteItemAsync(USER_ID_KEY);
    await SecureStore.deleteItemAsync(ALPACA_ACCOUNT_ID_KEY);
}

//matches backend JWT based auth flow and API format to store the token after login
