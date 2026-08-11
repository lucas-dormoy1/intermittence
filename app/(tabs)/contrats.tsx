import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useContrats } from "../../contexts/ContratsContext";
import { useProfils } from "../../contexts/ProfilsContext";
import { useEmployeurs } from "../../contexts/EmployeursContext";
import { useFormations } from "../../contexts/FormationsContext";
import { useEnseignements } from "../../contexts/EnseignementsContext";
import { Contrat, TypeHeures } from "../../types/contrat";
import { Formation, OptionFormation } from "../../types/formation";
import { Enseignement } from "../../types/enseignement";
import { formatDate, parseDate } from "../../utils/date";
import { formatRangeCourt } from "../../utils/formatDateCourt";
import { formaterHeures } from "../../utils/formatHeures";
import { PLAFOND_HEURES_FORMATION, PLAFOND_HEURES_ENSEIGNEMENT } from "../../utils/reglementation";
import DateRangePicker from "../../components/DateRangePicker";
import {
  styles,
  addIconColor,
  placeholderColor,
  contratIconColor,
  formationIconColor,
  enseignementIconColor,
} from "../../styles/tabs/contrats.styles";

type AvecStatut<T> = T & { passe: boolean };
type ChampContrat = "employeur" | "dateDebut" | "dateFin" | "heures" | "salaireBrut";
type ChampFormation = "intitule" | "dateDebut" | "dateFin" | "heures";
type ChampEnseignement = "etablissement" | "dateDebut" | "dateFin" | "heures" | "salaireBrut";
type TypeSaisie = "contrat" | "formation" | "enseignement";

type ElementListe =
  | { kind: "contrat"; data: AvecStatut<Contrat> }
  | { kind: "formation"; data: AvecStatut<Formation> }
  | { kind: "enseignement"; data: AvecStatut<Enseignement> };

const isDateFinPassee = (dateFin: string): boolean => {
  const fin = parseDate(dateFin);
  if (!fin) return false;
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  return fin.getTime() < aujourdhui.getTime();
};

function partitionnerParDate<T extends { dateFin: string }>(items: T[]) {
  const actifs: (T & { passe: false })[] = [];
  const passes: (T & { passe: true })[] = [];
  for (const item of items) {
    if (isDateFinPassee(item.dateFin)) passes.push({ ...item, passe: true as const });
    else actifs.push({ ...item, passe: false as const });
  }
  return { actifs, passes };
}

export default function ContratsScreen() {
  const { contrats, ajouterContrat, modifierContrat, supprimerContrat } = useContrats();
  const { profilActif: profil } = useProfils();
  const { employeurs } = useEmployeurs();
  const { formations, ajouterFormation, modifierFormation, supprimerFormation } = useFormations();
  const { enseignements, ajouterEnseignement, modifierEnseignement, supprimerEnseignement } = useEnseignements();
  const estAnnexe10 = profil?.annexe === "10";

  const [typeSaisie, setTypeSaisie] = useState<TypeSaisie>("contrat");
  const [employeur, setEmployeur] = useState("");
  const [intitule, setIntitule] = useState("");
  const [etablissement, setEtablissement] = useState("");
  const [dateDebut, setDateDebut] = useState<Date | undefined>();
  const [dateFin, setDateFin] = useState<Date | undefined>();
  const [typeHeures, setTypeHeures] = useState<TypeHeures>("heures");
  const [heures, setHeures] = useState("");
  const [salaireBrut, setSalaireBrut] = useState("");
  const [optionFormation, setOptionFormation] = useState<OptionFormation>("compterHeures");
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [afficherPasses, setAfficherPasses] = useState(false);
  const [contratEnEdition, setContratEnEdition] = useState<string | null>(null);
  const [formationEnEdition, setFormationEnEdition] = useState<string | null>(null);
  const [enseignementEnEdition, setEnseignementEnEdition] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<Partial<Record<ChampContrat | ChampFormation | ChampEnseignement, boolean>>>({});
  const [erreurMois, setErreurMois] = useState<string | null>(null);

  // Suggestions d'employeurs basées sur la saisie
  const suggestionsEmployeurs = useMemo(() => {
    if (!employeur.trim() || employeur.length < 2) return [];
    return employeurs
      .filter(e => e.nom.toLowerCase().includes(employeur.toLowerCase()) && e.nom.toLowerCase() !== employeur.toLowerCase())
      .slice(0, 3); // On limite à 3 suggestions pour ne pas encombrer
  }, [employeur, employeurs]);

  const { actifs: contratsActifs, passes: contratsPasses } = useMemo(
    () => partitionnerParDate(contrats), [contrats]
  );

  const { actifs: formationsActives, passes: formationsPassees } = useMemo(
    () => partitionnerParDate(formations), [formations]
  );

  const { actifs: enseignementsActifs, passes: enseignementsPasses } = useMemo(
    () => partitionnerParDate(enseignements), [enseignements]
  );

  const nbPasses = contratsPasses.length + formationsPassees.length + enseignementsPasses.length;

  const elements: ElementListe[] = useMemo(() => {
    const items: ElementListe[] = [];
    const contratsAffiches = afficherPasses
      ? [...contratsActifs, ...contratsPasses]
      : contratsActifs;
    const formationsAffichees = afficherPasses
      ? [...formationsActives, ...formationsPassees]
      : formationsActives;
    const enseignementsAffiches = afficherPasses
      ? [...enseignementsActifs, ...enseignementsPasses]
      : enseignementsActifs;
    for (const c of contratsAffiches) items.push({ kind: "contrat", data: c });
    for (const f of formationsAffichees) items.push({ kind: "formation", data: f });
    for (const e of enseignementsAffiches) items.push({ kind: "enseignement", data: e });
    items.sort((a, b) => {
      const da = parseDate(a.data.dateDebut);
      const db = parseDate(b.data.dateDebut);
      if (!da || !db) return 0;
      return da.getTime() - db.getTime();
    });
    return items;
  }, [contratsActifs, contratsPasses, formationsActives, formationsPassees, enseignementsActifs, enseignementsPasses, afficherPasses]);

  const reinitialiserFormulaire = () => {
    setEmployeur("");
    setIntitule("");
    setEtablissement("");
    setDateDebut(undefined);
    setDateFin(undefined);
    setTypeHeures("heures");
    setHeures("");
    setSalaireBrut("");
    setOptionFormation("compterHeures");
    setContratEnEdition(null);
    setFormationEnEdition(null);
    setEnseignementEnEdition(null);
    setFormulaireOuvert(false);
    setShowDatePicker(false);
    setErreurs({});
    setErreurMois(null);
  };

  const lancerEdition = (contrat: Contrat) => {
    const type = contrat.type ?? "heures";
    setTypeSaisie("contrat");
    setEmployeur(contrat.employeur);
    setDateDebut(parseDate(contrat.dateDebut));
    setDateFin(parseDate(contrat.dateFin));
    setTypeHeures(type);
    setHeures(type === "cachets" ? (contrat.heures / 12).toString() : contrat.heures.toString());
    setSalaireBrut(contrat.salaireBrut.toString());
    setContratEnEdition(contrat.id);
    setFormationEnEdition(null);
    setFormulaireOuvert(true);
  };

  const lancerEditionFormation = (formation: Formation) => {
    setTypeSaisie("formation");
    setIntitule(formation.intitule);
    setDateDebut(parseDate(formation.dateDebut));
    setDateFin(parseDate(formation.dateFin));
    setHeures(formation.heures.toString());
    setOptionFormation(formation.option);
    setFormationEnEdition(formation.id);
    setContratEnEdition(null);
    setFormulaireOuvert(true);
  };

  const confirmerSuppression = (contrat: Contrat) => {
    if (Platform.OS === "web") {
      if (
        typeof window !== "undefined" &&
        window.confirm(
          `Supprimer le contrat ${contrat.employeur} — ${contrat.dateDebut} → ${contrat.dateFin} ?`
        )
      ) {
        supprimerContrat(contrat.id);
      }
    } else {
      Alert.alert(
        "Supprimer ce contrat ?",
        `${contrat.employeur} — ${contrat.dateDebut} → ${contrat.dateFin}`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Supprimer",
            style: "destructive",
            onPress: () => supprimerContrat(contrat.id),
          },
        ],
      );
    }
  };

  const lancerEditionEnseignement = (enseignement: Enseignement) => {
    setTypeSaisie("enseignement");
    setEtablissement(enseignement.etablissement);
    setDateDebut(parseDate(enseignement.dateDebut));
    setDateFin(parseDate(enseignement.dateFin));
    setHeures(enseignement.heures.toString());
    setSalaireBrut(enseignement.salaireBrut.toString());
    setEnseignementEnEdition(enseignement.id);
    setContratEnEdition(null);
    setFormationEnEdition(null);
    setFormulaireOuvert(true);
  };

  const confirmerSuppressionEnseignement = (enseignement: Enseignement) => {
    if (Platform.OS === "web") {
      if (
        typeof window !== "undefined" &&
        window.confirm(
          `Supprimer l'enseignement ${enseignement.etablissement} — ${enseignement.dateDebut} → ${enseignement.dateFin} ?`
        )
      ) {
        supprimerEnseignement(enseignement.id);
      }
    } else {
      Alert.alert(
        "Supprimer cet enseignement ?",
        `${enseignement.etablissement} — ${enseignement.dateDebut} → ${enseignement.dateFin}`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Supprimer",
            style: "destructive",
            onPress: () => supprimerEnseignement(enseignement.id),
          },
        ],
      );
    }
  };

  const confirmerSuppressionFormation = (formation: Formation) => {
    if (Platform.OS === "web") {
      if (
        typeof window !== "undefined" &&
        window.confirm(
          `Supprimer la formation ${formation.intitule} — ${formation.dateDebut} → ${formation.dateFin} ?`
        )
      ) {
        supprimerFormation(formation.id);
      }
    } else {
      Alert.alert(
        "Supprimer cette formation ?",
        `${formation.intitule} — ${formation.dateDebut} → ${formation.dateFin}`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Supprimer",
            style: "destructive",
            onPress: () => supprimerFormation(formation.id),
          },
        ],
      );
    }
  };

  const handleValiderContrat = () => {
    const nouvellesErreurs: Record<string, boolean> = {
      employeur: !employeur,
      dateDebut: !dateDebut,
      dateFin: !dateFin,
      heures: !heures,
      salaireBrut: !salaireBrut,
    };
    setErreurs(nouvellesErreurs);

    if (Object.values(nouvellesErreurs).some(Boolean)) return;

    const memesMois =
      dateDebut!.getMonth() === dateFin!.getMonth() &&
      dateDebut!.getFullYear() === dateFin!.getFullYear();
    if (!memesMois) {
      setErreurMois("Les dates doivent être dans le même mois calendaire.");
      return;
    }
    setErreurMois(null);

    const valeurSaisie = parseFloat(heures);
    const donnees = {
      employeur,
      dateDebut: formatDate(dateDebut!),
      dateFin: formatDate(dateFin!),
      heures: typeHeures === "cachets" ? valeurSaisie * 12 : valeurSaisie,
      salaireBrut: parseFloat(salaireBrut),
      type: typeHeures,
    };

    if (contratEnEdition) {
      modifierContrat(contratEnEdition, donnees);
    } else {
      ajouterContrat(donnees);
    }

    reinitialiserFormulaire();
  };

  const handleValiderFormation = () => {
    const nouvellesErreurs: Record<string, boolean> = {
      intitule: !intitule,
      dateDebut: !dateDebut,
      dateFin: !dateFin,
      heures: !heures,
    };
    setErreurs(nouvellesErreurs);

    if (Object.values(nouvellesErreurs).some(Boolean)) return;

    const donnees = {
      intitule,
      dateDebut: formatDate(dateDebut!),
      dateFin: formatDate(dateFin!),
      heures: parseFloat(heures),
      option: optionFormation,
    };

    if (formationEnEdition) {
      modifierFormation(formationEnEdition, donnees);
    } else {
      ajouterFormation(donnees);
    }

    reinitialiserFormulaire();
  };

  const handleValiderEnseignement = () => {
    const nouvellesErreurs: Record<string, boolean> = {
      etablissement: !etablissement,
      dateDebut: !dateDebut,
      dateFin: !dateFin,
      heures: !heures,
      salaireBrut: !salaireBrut,
    };
    setErreurs(nouvellesErreurs);

    if (Object.values(nouvellesErreurs).some(Boolean)) return;

    const donnees = {
      etablissement,
      dateDebut: formatDate(dateDebut!),
      dateFin: formatDate(dateFin!),
      heures: parseFloat(heures),
      salaireBrut: parseFloat(salaireBrut),
    };

    if (enseignementEnEdition) {
      modifierEnseignement(enseignementEnEdition, donnees);
    } else {
      ajouterEnseignement(donnees);
    }

    reinitialiserFormulaire();
  };

  const handleValider = () => {
    if (typeSaisie === "formation") handleValiderFormation();
    else if (typeSaisie === "enseignement") handleValiderEnseignement();
    else handleValiderContrat();
  };

  const handleDateRangeConfirm = (debut: Date, fin: Date) => {
    setDateDebut(debut);
    setDateFin(fin);
    setErreurs((e) => ({ ...e, dateDebut: false, dateFin: false }));
    setErreurMois(null);
    setShowDatePicker(false);
  };

  const renderDateField = () => {
    const hasDate = dateDebut && dateFin;
    const hasError = erreurs.dateDebut || erreurs.dateFin;

    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Période</Text>
        <Pressable
          testID="input-date-range"
          style={[styles.input, hasError && styles.inputErreur]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={hasDate ? styles.dateText : styles.datePlaceholder}>
            {hasDate ? formatRangeCourt(dateDebut, dateFin) : "Sélectionner les dates"}
          </Text>
          <Ionicons name="calendar-outline" size={20} color={placeholderColor} />
        </Pressable>
        {erreurMois && (
          <Text testID="erreur-mois" style={styles.erreurMois}>{erreurMois}</Text>
        )}
      </View>
    );
  };

  const renderFormulaireContrat = () => (
    <>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Employeur</Text>
        <TextInput
          testID="input-employeur"
          style={[styles.input, erreurs.employeur && styles.inputErreur]}
          value={employeur}
          onChangeText={(v) => { setEmployeur(v); setErreurs((e) => ({ ...e, employeur: false })); }}
        />
        {suggestionsEmployeurs.length > 0 && (
          <View style={localStyles.suggestions}>
            {suggestionsEmployeurs.map((s) => (
              <Pressable
                key={s.id}
                style={localStyles.suggestionItem}
                onPress={() => {
                  setEmployeur(s.nom);
                  setErreurs((e) => ({ ...e, employeur: false }));
                }}
              >
                <Text style={localStyles.suggestionText}>{s.nom}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      {renderDateField()}
      {estAnnexe10 && (
        <View testID="toggle-type-heures" style={styles.toggleRow}>
          <Pressable
            testID="toggle-heures"
            style={[styles.toggleBtn, typeHeures === "heures" && styles.toggleBtnActif]}
            onPress={() => { setTypeHeures("heures"); setHeures(""); }}
          >
            <Text style={[styles.toggleBtnText, typeHeures === "heures" && styles.toggleBtnTextActif]}>
              Heures
            </Text>
          </Pressable>
          <Pressable
            testID="toggle-cachets"
            style={[styles.toggleBtn, typeHeures === "cachets" && styles.toggleBtnActif]}
            onPress={() => { setTypeHeures("cachets"); setHeures("1"); }}
          >
            <Text style={[styles.toggleBtnText, typeHeures === "cachets" && styles.toggleBtnTextActif]}>
              Cachets
            </Text>
          </Pressable>
        </View>
      )}
      <View style={styles.row}>
        <View style={[styles.fieldGroup, styles.inputHalf]}>
          <Text style={styles.label}>
            {typeHeures === "cachets" ? "Cachets" : "Heures"}
          </Text>
          {typeHeures === "cachets" ? (
            <View style={styles.stepperRow}>
              <Pressable
                testID="btn-moins-cachets"
                style={[styles.stepperBtn, styles.stepperBtnLeft]}
                onPress={() => {
                  const v = Math.max(1, (parseInt(heures, 10) || 1) - 1);
                  setHeures(v.toString());
                  setErreurs((e) => ({ ...e, heures: false }));
                }}
              >
                <Text style={styles.stepperBtnText}>−</Text>
              </Pressable>
              <TextInput
                testID="input-heures"
                style={[styles.input, styles.inputStepper, erreurs.heures && styles.inputErreur]}
                value={heures}
                onChangeText={(v) => { setHeures(v); setErreurs((e) => ({ ...e, heures: false })); }}
                keyboardType="numeric"
              />
              <Pressable
                testID="btn-plus-cachets"
                style={[styles.stepperBtn, styles.stepperBtnRight]}
                onPress={() => {
                  const v = (parseInt(heures, 10) || 0) + 1;
                  setHeures(v.toString());
                  setErreurs((e) => ({ ...e, heures: false }));
                }}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </Pressable>
            </View>
          ) : (
            <TextInput
              testID="input-heures"
              style={[styles.input, erreurs.heures && styles.inputErreur]}
              value={heures}
              onChangeText={(v) => { setHeures(v); setErreurs((e) => ({ ...e, heures: false })); }}
              keyboardType="numeric"
            />
          )}
        </View>
        <View style={[styles.fieldGroup, styles.inputHalf]}>
          <Text style={styles.label}>Salaire brut (€)</Text>
          <TextInput
            testID="input-salaire-brut"
            style={[styles.input, erreurs.salaireBrut && styles.inputErreur]}
            value={salaireBrut}
            onChangeText={(v) => { setSalaireBrut(v); setErreurs((e) => ({ ...e, salaireBrut: false })); }}
            keyboardType="numeric"
          />
        </View>
      </View>
    </>
  );

  const renderFormulaireFormation = () => (
    <>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Intitulé de la formation</Text>
        <TextInput
          testID="input-intitule"
          style={[styles.input, erreurs.intitule && styles.inputErreur]}
          value={intitule}
          onChangeText={(v) => { setIntitule(v); setErreurs((e) => ({ ...e, intitule: false })); }}
        />
      </View>
      {renderDateField()}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Nombre d'heures</Text>
        <TextInput
          testID="input-heures-formation"
          style={[styles.input, erreurs.heures && styles.inputErreur]}
          value={heures}
          onChangeText={(v) => { setHeures(v); setErreurs((e) => ({ ...e, heures: false })); }}
          keyboardType="numeric"
        />
      </View>
      <View testID="toggle-option-formation" style={styles.toggleRow}>
        <Pressable
          testID="toggle-compter-heures"
          style={[styles.toggleBtn, optionFormation === "compterHeures" && styles.toggleBtnActif]}
          onPress={() => setOptionFormation("compterHeures")}
        >
          <Text style={[styles.toggleBtnText, optionFormation === "compterHeures" && styles.toggleBtnTextActif]}>
            Compter les heures
          </Text>
        </Pressable>
        <Pressable
          testID="toggle-garder-are"
          style={[styles.toggleBtn, optionFormation === "garderARE" && styles.toggleBtnActif]}
          onPress={() => setOptionFormation("garderARE")}
        >
          <Text style={[styles.toggleBtnText, optionFormation === "garderARE" && styles.toggleBtnTextActif]}>
            Garder l'ARE
          </Text>
        </Pressable>
      </View>
      <Text style={styles.optionHint}>
        {optionFormation === "compterHeures"
          ? `Les heures comptent pour les 507h (plafond ${PLAFOND_HEURES_FORMATION}h). Pas d'ARE pendant la formation.`
          : "L'ARE est maintenue. Les heures ne comptent pas pour les 507h."}
      </Text>
    </>
  );

  const renderFormulaireEnseignement = () => (
    <>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Établissement</Text>
        <TextInput
          testID="input-etablissement"
          style={[styles.input, erreurs.etablissement && styles.inputErreur]}
          value={etablissement}
          onChangeText={(v) => { setEtablissement(v); setErreurs((e) => ({ ...e, etablissement: false })); }}
        />
      </View>
      {renderDateField()}
      <View style={styles.row}>
        <View style={[styles.fieldGroup, styles.inputHalf]}>
          <Text style={styles.label}>Heures</Text>
          <TextInput
            testID="input-heures-enseignement"
            style={[styles.input, erreurs.heures && styles.inputErreur]}
            value={heures}
            onChangeText={(v) => { setHeures(v); setErreurs((e) => ({ ...e, heures: false })); }}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.fieldGroup, styles.inputHalf]}>
          <Text style={styles.label}>Salaire brut (€)</Text>
          <TextInput
            testID="input-salaire-brut-enseignement"
            style={[styles.input, erreurs.salaireBrut && styles.inputErreur]}
            value={salaireBrut}
            onChangeText={(v) => { setSalaireBrut(v); setErreurs((e) => ({ ...e, salaireBrut: false })); }}
            keyboardType="numeric"
          />
        </View>
      </View>
      <Text style={styles.optionHint}>
        Les heures comptent pour les 507h (plafond {PLAFOND_HEURES_ENSEIGNEMENT}h) mais sont exclues du calcul de l'AJ (SR et NHT).
      </Text>
    </>
  );

  const renderElement = ({ item }: { item: ElementListe }) => {
    if (item.kind === "contrat") {
      const c = item.data;
      return (
        <View testID={`contrat-${c.id}`} style={[styles.contratCard, c.passe && styles.contratCardPasse]}>
          <View style={styles.contratHeader}>
            <View style={styles.contratTitre}>
              <Ionicons name="document-text" size={16} color={c.passe ? placeholderColor : contratIconColor} />
              <Text testID={`employeur-${c.id}`} style={[styles.contratEmployeur, c.passe && styles.contratTextPasse]}>
                {c.employeur}
              </Text>
              {c.passe && (
                <View style={styles.badgePasse}>
                  <Text style={styles.badgePasseText}>Passé</Text>
                </View>
              )}
            </View>
            <View style={styles.contratActions}>
              <Pressable onPress={() => lancerEdition(c)}>
                <Text style={styles.modifier}>✎</Text>
              </Pressable>
              <Pressable onPress={() => confirmerSuppression(c)}>
                <Text style={styles.supprimer}>✕</Text>
              </Pressable>
            </View>
          </View>
          <Text style={[styles.contratDates, c.passe && styles.contratTextPasse]}>
            {c.dateDebut} → {c.dateFin}
          </Text>
          <View style={styles.contratDetails}>
            <Text testID={`heures-${c.id}`} style={[styles.contratDetail, c.passe && styles.contratDetailPasse]}>
              {formaterHeures(c)}
            </Text>
            <Text style={[styles.contratDetail, c.passe && styles.contratDetailPasse]}>
              {c.salaireBrut}€ brut
            </Text>
          </View>
        </View>
      );
    }

    if (item.kind === "formation") {
      const f = item.data;
      return (
        <View testID={`formation-${f.id}`} style={[styles.contratCard, f.passe ? styles.contratCardPasse : styles.formationCard]}>
          <View style={styles.contratHeader}>
            <View style={styles.contratTitre}>
              <Ionicons name="school" size={16} color={f.passe ? placeholderColor : formationIconColor} />
              <Text style={[styles.contratEmployeur, f.passe && styles.contratTextPasse]}>{f.intitule}</Text>
              <View style={f.passe ? styles.badgeFormationPasse : styles.badgeFormation}>
                <Text style={f.passe ? styles.badgeFormationPasseText : styles.badgeFormationText}>Formation</Text>
              </View>
              {f.passe && (
                <View style={styles.badgePasse}>
                  <Text style={styles.badgePasseText}>Passé</Text>
                </View>
              )}
            </View>
            <View style={styles.contratActions}>
              <Pressable onPress={() => lancerEditionFormation(f)}>
                <Text style={styles.modifier}>✎</Text>
              </Pressable>
              <Pressable onPress={() => confirmerSuppressionFormation(f)}>
                <Text style={styles.supprimer}>✕</Text>
              </Pressable>
            </View>
          </View>
          <Text style={[styles.contratDates, f.passe && styles.contratTextPasse]}>
            {f.dateDebut} → {f.dateFin}
          </Text>
          <View style={styles.contratDetails}>
            <Text style={[styles.contratDetail, f.passe && styles.contratDetailPasse]}>{f.heures}h</Text>
            <Text style={[styles.formationOption, f.passe && styles.contratDetailPasse]}>
              {f.option === "compterHeures" ? "Heures comptées" : "ARE maintenue"}
            </Text>
          </View>
        </View>
      );
    }

    const e = item.data as AvecStatut<Enseignement>;
    return (
      <View testID={`enseignement-${e.id}`} style={[styles.contratCard, e.passe ? styles.contratCardPasse : styles.enseignementCard]}>
        <View style={styles.contratHeader}>
          <View style={styles.contratTitre}>
            <Ionicons name="school-outline" size={16} color={e.passe ? placeholderColor : enseignementIconColor} />
            <Text style={[styles.contratEmployeur, e.passe && styles.contratTextPasse]}>{e.etablissement}</Text>
            <View style={e.passe ? styles.badgeEnseignementPasse : styles.badgeEnseignement}>
              <Text style={e.passe ? styles.badgeEnseignementPasseText : styles.badgeEnseignementText}>Enseignement</Text>
            </View>
            {e.passe && (
              <View style={styles.badgePasse}>
                <Text style={styles.badgePasseText}>Passé</Text>
              </View>
            )}
          </View>
          <View style={styles.contratActions}>
            <Pressable onPress={() => lancerEditionEnseignement(e)}>
              <Text style={styles.modifier}>✎</Text>
            </Pressable>
            <Pressable onPress={() => confirmerSuppressionEnseignement(e)}>
              <Text style={styles.supprimer}>✕</Text>
            </Pressable>
          </View>
        </View>
        <Text style={[styles.contratDates, e.passe && styles.contratTextPasse]}>
          {e.dateDebut} → {e.dateFin}
        </Text>
        <View style={styles.contratDetails}>
          <Text style={[styles.contratDetail, e.passe && styles.contratDetailPasse]}>{e.heures}h</Text>
          <Text style={[styles.contratDetail, e.passe && styles.contratDetailPasse]}>{e.salaireBrut}€ brut</Text>
        </View>
      </View>
    );
  };

  if (showDatePicker) {
    return (
      <DateRangePicker
        initialStart={dateDebut}
        initialEnd={dateFin}
        onConfirm={handleDateRangeConfirm}
        onCancel={() => setShowDatePicker(false)}
      />
    );
  }

  if (formulaireOuvert) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView style={styles.formulaire} contentContainerStyle={styles.formulaireContent}>
          {!contratEnEdition && !formationEnEdition && !enseignementEnEdition && (
            <View testID="toggle-type-saisie" style={[styles.toggleRow, styles.toggleTypeSaisie]}>
              <Pressable
                testID="toggle-saisie-contrat"
                style={[styles.toggleBtn, typeSaisie === "contrat" && styles.toggleBtnActif]}
                onPress={() => setTypeSaisie("contrat")}
              >
                <Text style={[styles.toggleBtnText, typeSaisie === "contrat" && styles.toggleBtnTextActif]}>
                  Contrat
                </Text>
              </Pressable>
              <Pressable
                testID="toggle-saisie-formation"
                style={[styles.toggleBtn, typeSaisie === "formation" && styles.toggleBtnActif]}
                onPress={() => setTypeSaisie("formation")}
              >
                <Text style={[styles.toggleBtnText, typeSaisie === "formation" && styles.toggleBtnTextActif]}>
                  Formation
                </Text>
              </Pressable>
              <Pressable
                testID="toggle-saisie-enseignement"
                style={[styles.toggleBtn, typeSaisie === "enseignement" && styles.toggleBtnActif]}
                onPress={() => setTypeSaisie("enseignement")}
              >
                <Text style={[styles.toggleBtnText, typeSaisie === "enseignement" && styles.toggleBtnTextActif]}>
                  Enseignement
                </Text>
              </Pressable>
            </View>
          )}
          {typeSaisie === "contrat"
            ? renderFormulaireContrat()
            : typeSaisie === "formation"
              ? renderFormulaireFormation()
              : renderFormulaireEnseignement()}
        </ScrollView>
        <View style={styles.formulaireActions}>
          <Pressable
            style={styles.btnAnnuler}
            onPress={reinitialiserFormulaire}
          >
            <Text style={styles.btnAnnulerText}>Annuler</Text>
          </Pressable>
          <Pressable style={styles.btnAjouter} onPress={handleValider}>
            <Text style={styles.btnAjouterText}>
              {contratEnEdition || formationEnEdition || enseignementEnEdition ? "Modifier" : "Ajouter"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.buttonsRow}>
        <Pressable
          testID="btn-ouvrir-formulaire"
          style={styles.btnOuvrir}
          onPress={() => setFormulaireOuvert(true)}
        >
          <Ionicons name="add-circle" size={44} color={addIconColor} />
        </Pressable>
        {nbPasses > 0 && (
          <Pressable
            testID="btn-toggle-passes"
            style={styles.btnTogglePasses}
            onPress={() => setAfficherPasses(!afficherPasses)}
          >
            <Text style={styles.btnTogglePassesText}>
              {afficherPasses
                ? `Masquer passés (${nbPasses})`
                : `Passés (${nbPasses})`}
            </Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={elements}
        keyExtractor={(item) => `${item.kind}-${item.data.id}`}
        contentContainerStyle={styles.liste}
        ListEmptyComponent={
          <Text style={styles.vide}>
            {contrats.length === 0 && formations.length === 0 && enseignements.length === 0
              ? "Aucun contrat ni formation. Ajoute ton premier contrat !"
              : "Aucun élément en cours. Utilise le bouton ci-dessus pour afficher les passés."}
          </Text>
        }
        renderItem={renderElement}
      />
    </View>
  );
}

const localStyles = StyleSheet.create({
  suggestions: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  suggestionText: {
    color: "#374151",
    fontSize: 14,
  },
});
