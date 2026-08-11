import { useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useProfils } from "../contexts/ProfilsContext";
import { useGoogleAuth } from "../contexts/GoogleAuthContext";
import { ProfilSansId } from "../types/profil";
import { SauvegardeDrive } from "../utils/googleDrive";
import { alerterInfo } from "../utils/alerte";
import FormulaireProfil from "./FormulaireProfil";
import { TypeDonneesTest, sauvegarderDonneesTest } from "../utils/donneesTest";
import { colors } from "../theme/colors";
import { styles } from "../styles/components/ecran-onboarding.styles";

export default function EcranOnboarding() {
  const { ajouterProfil, listerSauvegardesDrive, restaurerProfilDepuisDrive } = useProfils();
  const { obtenirToken } = useGoogleAuth();
  const insets = useSafeAreaInsets();
  const [sauvegardes, setSauvegardes] = useState<SauvegardeDrive[] | null>(null);
  const [chargementDrive, setChargementDrive] = useState(false);

  const handleValider = async (profil: ProfilSansId, donneesTest?: TypeDonneesTest) => {
    const id = ajouterProfil(profil);
    if (donneesTest) {
      await sauvegarderDonneesTest(id, donneesTest);
    }
  };

  const handleListerDrive = async () => {
    setChargementDrive(true);
    try {
      const token = await obtenirToken();
      const liste = await listerSauvegardesDrive(token);
      if (liste.length === 0) {
        alerterInfo("Aucune sauvegarde", "Aucun profil sauvegardé n'a été trouvé sur ce compte Google Drive.");
      } else {
        setSauvegardes(liste);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      alerterInfo("Erreur", `Connexion à Google Drive impossible: ${message}.`);
    } finally {
      setChargementDrive(false);
    }
  };

  const handleRestaurer = async (profilId: string) => {
    setChargementDrive(true);
    try {
      const token = await obtenirToken();
      await restaurerProfilDepuisDrive(profilId, token);
    } finally {
      setChargementDrive(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.titre}>Bienvenue !</Text>
      <Text style={styles.sousTitre}>
        Crée ton premier profil pour commencer à simuler tes droits ARE.
      </Text>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <Pressable
          testID="btn-restaurer-drive-onboarding"
          style={styles.btnDrive}
          onPress={handleListerDrive}
          disabled={chargementDrive}
        >
          {chargementDrive ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
          )}
          <Text style={styles.btnDriveTexte}>Restaurer un profil depuis Google Drive</Text>
        </Pressable>

        {sauvegardes && (
          <View style={styles.listeSauvegardes}>
            {sauvegardes.map((s) => (
              <Pressable
                key={s.profilId}
                testID={`sauvegarde-drive-${s.profilId}`}
                style={styles.sauvegardeItem}
                onPress={() => handleRestaurer(s.profilId)}
              >
                <Ionicons name="document-text-outline" size={18} color={colors.textDark} />
                <Text style={styles.sauvegardeItemTexte}>{s.nom}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <FormulaireProfil onValider={handleValider} />
      </ScrollView>
    </View>
  );
}
