import { Stack, useRouter } from "expo-router";
import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { colors } from "../theme/colors";
import { ContratsProvider } from "../contexts/ContratsContext";
import { FormationsProvider } from "../contexts/FormationsContext";
import { EmployeursProvider } from "../contexts/EmployeursContext";
import { EnseignementsProvider } from "../contexts/EnseignementsContext";
import { ProfilsProvider, useProfils } from "../contexts/ProfilsContext";
import { GoogleAuthProvider } from "../contexts/GoogleAuthContext";
import { ErrorBoundary } from "../components/ErrorBoundary";
import EcranOnboarding from "../components/EcranOnboarding";
import { styles } from "../styles/root-layout.styles";

SplashScreen.preventAutoHideAsync();

function BoutonRetour() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      style={styles.boutonRetour}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="chevron-back" size={24} color={colors.textOnPrimary} />
    </TouchableOpacity>
  );
}

function AppContent() {
  const { profils, chargementTermine } = useProfils();

  if (!chargementTermine) return null;

  if (profils.length === 0) {
    return <EcranOnboarding />;
  }

  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="mois/[moisIndex]"
          options={{
            headerShown: true,
            title: "Détail du mois",
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: colors.textOnPrimary,
            headerLeft: () => <BoutonRetour />,
          }}
        />
        <Stack.Screen
          name="detail-calcul-aj"
          options={{
            headerShown: true,
            title: "Détail du calcul AJ",
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: colors.textOnPrimary,
            headerLeft: () => <BoutonRetour />,
          }}
        />
        <Stack.Screen
          name="simulation-are"
          options={{
            headerShown: true,
            title: "Simulation ARE",
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: colors.textOnPrimary,
            headerLeft: () => <BoutonRetour />,
          }}
        />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <GoogleAuthProvider>
        <ProfilsProvider>
          <EmployeursProvider>
            <ContratsProvider>
              <FormationsProvider>
                <EnseignementsProvider>
                  <AppContent />
                </EnseignementsProvider>
              </FormationsProvider>
            </ContratsProvider>
          </EmployeursProvider>
        </ProfilsProvider>
      </GoogleAuthProvider>
    </ErrorBoundary>
  );
}
