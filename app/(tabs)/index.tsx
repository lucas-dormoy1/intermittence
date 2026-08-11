import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useContrats } from "../../contexts/ContratsContext";
import { useProfils } from "../../contexts/ProfilsContext";
import { useFormations } from "../../contexts/FormationsContext";
import { useEnseignements } from "../../contexts/EnseignementsContext";
import { formatDate } from "../../utils/date";
import { calculerAJ, calculerAJNette, calculerSJM } from "../../utils/calculerAJ";
import { filtrerContratsPeriodeReference, trouverFCT, calculerDebutPeriodeReference, filtrerParPeriodeReference } from "../../utils/filtrerContratsPeriodeReference";
import { calculerHeuresFormationPlafonnees } from "../../utils/calculerHeuresFormation";
import { calculerHeuresEnseignementPlafonnees } from "../../utils/calculerHeuresEnseignement";
import { trouverDatesOuvertureEligibles, simulerOuverture } from "../../utils/simulerOuvertureDroits";
import { PLAFOND_HEURES_FORMATION, PLAFOND_HEURES_ENSEIGNEMENT } from "../../utils/reglementation";
import { styles } from "../../styles/tabs/index.styles";

export default function AccueilScreen() {
  const { contrats } = useContrats();
  const { profilActif: profil } = useProfils();
  const { formations } = useFormations();
  const { enseignements } = useEnseignements();
  const router = useRouter();

  const [contratFctId, setContratFctId] = useState<string | null>(null);

  const { ajBrute, ajNette } = useMemo(() => {
    if (!profil || !profil.aOuvertDroits) return { ajBrute: 0, ajNette: 0 };
    const brute = calculerAJ(profil.annexe, profil.salaireReference, profil.heuresTravaillees);
    const sjm = calculerSJM(profil.annexe, profil.salaireReference, profil.heuresTravaillees);
    const nette = calculerAJNette(brute, sjm, profil.tauxCSG, profil.alsaceMoselle);
    return { ajBrute: brute, ajNette: nette };
  }, [profil]);

  const contratsFiltrés = useMemo(
    () => filtrerContratsPeriodeReference(contrats),
    [contrats]
  );
  const fct = useMemo(() => trouverFCT(contrats), [contrats]);
  const debutPeriode = useMemo(
    () => (fct ? calculerDebutPeriodeReference(fct) : undefined),
    [fct]
  );

  const datesEligibles = useMemo(
    () => trouverDatesOuvertureEligibles(contrats, formations, enseignements),
    [contrats, formations, enseignements]
  );

  const simulation = useMemo(() => {
    if (!contratFctId || !profil) return undefined;
    const eligible = datesEligibles.find((d) => d.contrat.id === contratFctId);
    if (!eligible) return undefined;
    return simulerOuverture(contrats, formations, eligible.dateFCT, profil, enseignements);
  }, [contratFctId, profil, contrats, formations, datesEligibles]);

  const totalHeuresContrats = contratsFiltrés.reduce((sum, c) => sum + c.heures, 0);
  const formationsFiltrees = fct ? filtrerParPeriodeReference(formations, fct) : formations;
  const enseignementsFiltres = fct ? filtrerParPeriodeReference(enseignements, fct) : enseignements;
  const heuresFormation = calculerHeuresFormationPlafonnees(formationsFiltrees);
  const heuresEnseignement = calculerHeuresEnseignementPlafonnees(enseignementsFiltres);
  const totalHeures = totalHeuresContrats + heuresFormation + heuresEnseignement;
  const totalSalaire = contratsFiltrés.reduce((sum, c) => sum + c.salaireBrut, 0);
  const progression = Math.min((totalHeures / 507) * 100, 100);

  const annexeLabel = profil?.annexe === "10" ? "Artiste" : "Technicien";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Progression vers les 507h</Text>
        <Text style={styles.cardValue}>{totalHeures}h / 507h</Text>
        <View style={styles.barreContainer}>
          <View style={[styles.barre, { width: `${progression}%` }]} />
        </View>
        <Text style={styles.cardHint}>
          {totalHeures >= 507
            ? "Seuil atteint ! Tu peux ouvrir tes droits."
            : `Il te manque ${507 - totalHeures}h`}
        </Text>
        {(heuresFormation > 0 || heuresEnseignement > 0) && (
          <Text style={styles.cardHint}>
            {[
              "dont",
              heuresEnseignement > 0 ? `${heuresEnseignement}h d'enseignement (plafond ${PLAFOND_HEURES_ENSEIGNEMENT}h)` : "",
              heuresEnseignement > 0 && heuresFormation > 0 ? "—" : "",
              heuresFormation > 0 ? `${heuresFormation}h de formation (plafond ${PLAFOND_HEURES_FORMATION}h)` : "",
            ].filter(Boolean).join(" ")}
          </Text>
        )}
        {debutPeriode && fct && (
          <Text testID="periode-reference" style={styles.cardPeriode}>
            Période : {formatDate(debutPeriode)} → {formatDate(fct)} ({contratsFiltrés.length} contrat{contratsFiltrés.length > 1 ? "s" : ""})
          </Text>
        )}
        {totalHeures >= 507 && (
          <View testID="simulation-section" style={styles.simulationSection}>
            <Text style={styles.simulationTitle}>Simuler l'ouverture de droits</Text>
            <Text style={styles.simulationHint}>
              Simulation basée sur tes contrats et formations renseignés
            </Text>
            {!profil ? (
              <Text testID="simulation-profil-requis" style={styles.simulationProfilHint}>
                Configure ton profil pour simuler l'ouverture de droits
              </Text>
            ) : (
              <>
                <Text style={styles.simulationHint}>
                  Choisis la date de fin de contrat pour l'ouverture :
                </Text>
                <View style={styles.chipRow}>
                  {datesEligibles.map((d) => (
                    <Pressable
                      key={d.contrat.id}
                      testID={`chip-fct-${d.contrat.id}`}
                      style={[
                        styles.chip,
                        contratFctId === d.contrat.id && styles.chipActive,
                      ]}
                      onPress={() =>
                        setContratFctId(
                          contratFctId === d.contrat.id ? null : d.contrat.id
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          contratFctId === d.contrat.id && styles.chipTextActive,
                        ]}
                      >
                        {d.contrat.employeur} — {d.contrat.dateFin}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {simulation && (
                  <View testID="simulation-resultats" style={styles.simulationResultats}>
                    <Text style={styles.simulationPeriode}>
                      Période couverte : {formatDate(simulation.dateAnniversaire)} → {formatDate(simulation.dateFinIndemnisation)}
                    </Text>
                    <View style={styles.simulationAjRow}>
                      <View style={styles.simulationAjCol}>
                        <Text style={styles.simulationAjLabel}>AJ brute</Text>
                        <Text testID="simulation-aj-brute" style={styles.simulationAjValue}>
                          {simulation.ajBrute.toFixed(2)} €
                        </Text>
                      </View>
                      <View style={styles.simulationAjCol}>
                        <Text style={styles.simulationAjLabel}>AJ nette</Text>
                        <Text testID="simulation-aj-nette" style={styles.simulationAjValue}>
                          {simulation.ajNette.toFixed(2)} €
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.simulationDetail}>
                      {simulation.heuresEligiblesAJ}h travaillées — {simulation.salaireReference.toFixed(0)} € de salaire référence
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Salaire brut cumulé</Text>
        <Text style={styles.cardValue}>{totalSalaire.toFixed(0)} €</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Contrats enregistrés</Text>
        <Text testID="contrats-count" style={styles.cardValue}>{contrats.length}</Text>
      </View>

      {profil?.aOuvertDroits && (
        <View testID="aj-card" style={styles.ajCard}>
          <Text style={styles.ajLabel}>Indemnité journalière estimée</Text>
          <View style={styles.ajRow}>
            <View style={styles.ajCol}>
              <Text style={styles.ajColLabel}>Brut</Text>
              <Text testID="aj-value" style={styles.ajValue}>
                {ajBrute.toFixed(2)} €
              </Text>
            </View>
            <View style={styles.ajCol}>
              <Text style={styles.ajColLabel}>Net</Text>
              <Text testID="aj-nette-value" style={styles.ajNetteValue}>
                {ajNette.toFixed(2)} €
              </Text>
            </View>
          </View>
          <Text style={styles.ajDetail}>
            {profil.nom} ({annexeLabel}) — Annexe {profil.annexe} — {profil.heuresTravaillees}h —{" "}
            {profil.salaireReference.toFixed(0)} € — Anniversaire :{" "}
            {profil.dateAnniversaire}
          </Text>
          <Pressable
            testID="btn-detail-calcul"
            style={styles.btnDetailCalcul}
            onPress={() => router.push("/detail-calcul-aj")}
          >
            <Text style={styles.btnDetailCalculText}>Voir le détail du calcul</Text>
          </Pressable>
          <Pressable
            testID="btn-simulation-are"
            style={styles.btnDetailCalcul}
            onPress={() => router.push("/simulation-are")}
          >
            <Text style={styles.btnDetailCalculText}>Voir la simulation ARE (12 mois)</Text>
          </Pressable>
        </View>
      )}

    </ScrollView>
  );
}
