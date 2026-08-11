import { createContext, useContext, useCallback, useMemo, ReactNode } from "react";
import { Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";

WebBrowser.maybeCompleteAuthSession();

const DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

const SCOPE_DRIVE_FILE = "https://www.googleapis.com/auth/drive.file";
const CLE_TOKENS = "intermittence-google-drive-tokens";

interface TokensStockes {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  issuedAt: number;
}

async function chargerTokens(): Promise<TokensStockes | null> {
  const brut =
    Platform.OS === "web"
      ? localStorage.getItem(CLE_TOKENS)
      : await SecureStore.getItemAsync(CLE_TOKENS);
  return brut ? JSON.parse(brut) : null;
}

async function persisterTokens(tokens: TokensStockes): Promise<void> {
  const brut = JSON.stringify(tokens);
  if (Platform.OS === "web") {
    localStorage.setItem(CLE_TOKENS, brut);
  } else {
    await SecureStore.setItemAsync(CLE_TOKENS, brut);
  }
}

async function supprimerTokens(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(CLE_TOKENS);
  } else {
    await SecureStore.deleteItemAsync(CLE_TOKENS);
  }
}

interface GoogleAuthContextType {
  obtenirToken: () => Promise<string>;
  seDeconnecter: () => Promise<void>;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | null>(null);

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const clientId: string | undefined =
    Platform.OS === "web"
      ? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
      : process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  const clientSecret: string | undefined =
    Platform.OS === "web" ? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_SECRET : undefined;

  const redirectUri = AuthSession.makeRedirectUri({ scheme: "intermittence" });

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    { clientId: clientId ?? "", redirectUri, scopes: [SCOPE_DRIVE_FILE] },
    DISCOVERY
  );

  const seConnecter = useCallback(async (): Promise<string> => {
    if (!clientId) {
      throw new Error(
        "Client ID Google manquant : configure EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID / EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID dans .env.local."
      );
    }
    const resultat = await promptAsync();
    if (resultat.type !== "success") {
      throw new Error("Connexion Google annulée.");
    }
    const tokens = await AuthSession.exchangeCodeAsync(
      {
        clientId,
        code: resultat.params.code,
        redirectUri,
        extraParams: {
          code_verifier: request?.codeVerifier ?? "",
          ...(clientSecret ? { client_secret: clientSecret } : {}),
        },
      },
      DISCOVERY
    );
    await persisterTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      issuedAt: tokens.issuedAt,
    });
    return tokens.accessToken;
  }, [clientId, clientSecret, promptAsync, redirectUri, request]);

  const obtenirToken = useCallback(async (): Promise<string> => {
    const stockes = await chargerTokens();
    if (!stockes) return seConnecter();

    if (AuthSession.TokenResponse.isTokenFresh({ expiresIn: stockes.expiresIn, issuedAt: stockes.issuedAt })) {
      return stockes.accessToken;
    }
    if (!stockes.refreshToken || !clientId) return seConnecter();

    const rafraichis = await AuthSession.refreshAsync(
      {
        clientId,
        refreshToken: stockes.refreshToken,
        extraParams: clientSecret ? { client_secret: clientSecret } : undefined,
      },
      DISCOVERY
    );
    const fusionnes: TokensStockes = {
      accessToken: rafraichis.accessToken,
      refreshToken: rafraichis.refreshToken ?? stockes.refreshToken,
      expiresIn: rafraichis.expiresIn,
      issuedAt: rafraichis.issuedAt,
    };
    await persisterTokens(fusionnes);
    return fusionnes.accessToken;
  }, [clientId, clientSecret, seConnecter]);

  const seDeconnecter = useCallback(async () => {
    await supprimerTokens();
  }, []);

  const valeur = useMemo<GoogleAuthContextType>(
    () => ({ obtenirToken, seDeconnecter }),
    [obtenirToken, seDeconnecter]
  );

  return <GoogleAuthContext.Provider value={valeur}>{children}</GoogleAuthContext.Provider>;
}

export function useGoogleAuth() {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error("useGoogleAuth doit être utilisé dans un GoogleAuthProvider");
  }
  return context;
}
