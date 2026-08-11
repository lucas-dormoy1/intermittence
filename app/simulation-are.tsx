import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useMemo } from "react";
import { useRouter } from "expo-router";
import { useContrats } from "../contexts/ContratsContext";
import { useProfils } from "../contexts/ProfilsContext";
import { useFormations } from "../contexts/FormationsContext";
import { useEnseignements } from "../contexts/EnseignementsContext";
import {
  calculerIndemnisationMensuelle,
  IndemnisationMensuelle,
} from "../utils/calculerIndemnisationMensuelle";
import { formatMois } from "../utils/formatMois";
import { styles } from "../styles/tabs/vue-mensuelle.styles";

function CarteMois({
  mois,
  onPress,
}: {
  mois: IndemnisationMensuelle;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      testID={`carte-mois-${mois.index}`}
      style={styles.carte}
      onPress={onPress}
    >
      <Text style={styles.carteTitre}>{formatMois(mois.mois)}</Text>
      <View style={styles.carteBody}>
        <View style={styles.ligne}>
          <Text style={styles.libelleValeur}>Heures travaillées</Text>
          <Text style={styles.valeur}>{mois.heuresDuMois} h</Text>
        </View>
        <View style={styles.ligne}>
          <Text style={styles.libelleValeur}>Jours de formation</Text>
          <Text style={styles.valeur}>{mois.joursFormation} j</Text>
        </View>
        {mois.joursEnseignement > 0 && (
          <View style={styles.ligne}>
            <Text style={styles.libelleValeur}>Jours d'enseignement</Text>
            <Text style={styles.valeur}>{mois.joursEnseignement} j</Text>
          </View>
        )}
        <View style={styles.ligne}>
          <Text style={styles.libelleValeur}>Jours indemnisés</Text>
          <Text style={styles.valeur}>{mois.joursIndemnises} j</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SimulationAREScreen() {
  const { contrats } = useContrats();
  const { profilActif: profil } = useProfils();
  const { formations } = useFormations();
  const { enseignements } = useEnseignements();
  const router = useRouter();

  const mois = useMemo(
    () => (profil?.aOuvertDroits ? calculerIndemnisationMensuelle(profil, contrats, formations, enseignements) : []),
    [profil, contrats, formations, enseignements]
  );

  if (!profil || !profil.aOuvertDroits) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty} testID="message-profil-manquant">
          {!profil
            ? "Configurez votre profil pour voir la simulation"
            : "Ouvrez vos droits ARE pour voir la simulation"}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={mois}
      keyExtractor={(item) => String(item.index)}
      contentContainerStyle={styles.liste}
      initialNumToRender={12}
      renderItem={({ item }) => (
        <CarteMois
          mois={item}
          onPress={() => router.push(`/mois/${item.index}` as any)}
        />
      )}
    />
  );
}
