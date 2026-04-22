// small auth/session helper
import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "mockvestor_access_token";
const USERNAME_KEY = "mockvestor_username";
const USER_ID_KEY = "mockvestor_user_id";
const ALPACA_ACCOUNT_ID_KEY = "mockvestor_alpaca_account_id";

// added: difficulty mode persistence keys/helpers
type DifficultyMode = "sandbox" | "easy" | "hard";

function modeKey(username: string) {
    return `mockvestor_difficulty_mode_${username}`;
}

function startingAmountKey(username: string) {
    return `mockvestor_starting_amount_${username}`;
}

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

// added: save/load difficulty settings per user so progress persists across logout/app restart
export async function saveDifficultySettings(params: {
    username: string;
    mode: DifficultyMode;
    startingAmount: string;
}) {
    await SecureStore.setItemAsync(modeKey(params.username), params.mode);
    await SecureStore.setItemAsync(startingAmountKey(params.username), params.startingAmount);
}

export async function getDifficultyMode(username: string): Promise<DifficultyMode | null> {
    const value = await SecureStore.getItemAsync(modeKey(username));
    if (value === "sandbox" || value === "easy" || value === "hard") {
        return value;
    }
    return null;
}

export async function getStartingAmount(username: string): Promise<string | null> {
    return SecureStore.getItemAsync(startingAmountKey(username));
}

export async function clearDifficultySettings(username: string) {
    await SecureStore.deleteItemAsync(modeKey(username));
    await SecureStore.deleteItemAsync(startingAmountKey(username));
}

//matches backend JWT based auth flow and API format to store the token after login

// added: simple local portfolio chart history per user
type PortfolioChartPoint = {
    date: string;   // YYYY-MM-DD
    value: number;
};

function portfolioChartKey(username: string) {
    return `mockvestor_portfolio_chart_${username}`;
}

export async function getPortfolioChartHistory(username: string): Promise<PortfolioChartPoint[]> {
    const raw = await SecureStore.getItemAsync(portfolioChartKey(username));
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed.filter(
                (p) =>
                    typeof p?.date === "string" &&
                    typeof p?.value === "number" &&
                    Number.isFinite(p.value)
            );
        }
        return [];
    } catch {
        return [];
    }
}

export async function savePortfolioChartHistory(
    username: string,
    history: PortfolioChartPoint[]
) {
    await SecureStore.setItemAsync(portfolioChartKey(username), JSON.stringify(history));
}

export async function upsertPortfolioSnapshot(username: string, value: number) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const history = await getPortfolioChartHistory(username);

    const existingIndex = history.findIndex((p) => p.date === today);

    if (existingIndex >= 0) {
        history[existingIndex] = { date: today, value };
    } else {
        history.push({ date: today, value });
    }

    history.sort((a, b) => a.date.localeCompare(b.date));
    await savePortfolioChartHistory(username, history);

    return history;
}
