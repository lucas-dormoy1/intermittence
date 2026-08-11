import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { useLocalSearchParams } from "expo-router";
import { useContrats } from "../../contexts/ContratsContext";
import { useProfils } from "../../contexts/ProfilsContext";
import { useFormations } from "../../contexts/FormationsContext";
import { useEnseignements } from "../../contexts/EnseignementsContext";
import {
  calculerIndemnisationMensuelle,
  IndemnisationMensuelle,
} from "../../utils/calculerIndemnisationMensuelle";
import { ProfilIntermittent } from "../../types/profil";
import { styles, pageScrollStyle } from "../../styles/mois/moisIndex.styles";
import { formaterHeures } from "../../utils/formatHeures";
import { formatMois } from "../../utils/formatMois";
import {
  InfoContenu,
  InfoModal,
  buildInfoDelaiAttente,
  buildInfoFranchiseCP,
  buildInfoFranchiseSalaire,
} from "../../components/InfoFranchises";

function formatEuros(montant: number): string {
  return `${Math.round(montant)} €`;
}

function LigneDetail({
  label,
  valeur,
  testID,
  bold,
  onInfoPress,
}: {
  label: string;
  valeur: string;
  testID?: string;
  bold?: boolean;
  onInfoPress?: () => void;
}) {
  return (
    <View style={styles.ligne}>
      <View style={styles.labelRow}>
        <Text style={[styles.libelleValeur, bold ? styles.bold : undefined]}>
          {label}
        </Text>
        {onInfoPress && (
          <TouchableOpacity
            style={styles.infoButton}
            onPress={onInfoPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID={`info-${testID}`}
          >
            <Text style={styles.infoButtonText}>?</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text
        style={[styles.valeur, bold ? styles.boldValeur : undefined]}
        testID={testID}
      >
        {valeur}
      </Text>
    </View>
  );
}

function FormulePlafond({ mois }: { mois: IndemnisationMensuelle }) {
  return (
    <>
      <View style={styles.ligneFormule}>
        <Text style={styles.texteFormulePlafond}>
          {`Plafond ARE : ${formatEuros(mois.plafondMontant)}`}
        </Text>
      </View>
      <View style={styles.ligneFormule}>
        {mois.areVersee > 0 ? (
          <Text style={styles.texteFormulePlafond}>
            {`${formatEuros(mois.plafondMontant)} − ${formatEuros(mois.salaireDuMois)} = ${formatEuros(mois.areVersee)}`}
          </Text>
        ) : (
          <Text style={styles.texteFormulePlafond}>
            {`Salaires (${formatEuros(mois.salaireDuMois)}) > plafond → ARE nulle`}
          </Text>
        )}
      </View>
    </>
  );
}



type PageMoisProps = { mois: IndemnisationMensuelle; profil: ProfilIntermittent; width: number; height: number; bottomInset: number };

function PageMois({ mois, profil, width, height, bottomInset }: PageMoisProps) {
  const [infoContenu, setInfoContenu] = useState<InfoContenu | null>(null);

  const showInfo = useCallback((contenu: InfoContenu) => {
    setInfoContenu(contenu);
  }, []);

  return (
    <ScrollView
      style={pageScrollStyle(width, height).page}
      contentContainerStyle={[styles.pageContent, { paddingBottom: 20 + bottomInset }]}
      nestedScrollEnabled
      testID={`detail-mois-${mois.index}`}
    >
      <InfoModal
        visible={infoContenu !== null}
        contenu={infoContenu}
        onClose={() => setInfoContenu(null)}
      />
      <Text style={styles.titreMois}>{formatMois(mois.mois)}</Text>

      <View
        testID={`section-contrats-${mois.index}`}
        style={styles.section}
      >
        <Text style={styles.titreSection}>Contrats</Text>
        {mois.contratsDuMois.length === 0 ? (
          <Text style={styles.vide}>Aucun contrat ce mois-ci</Text>
        ) : (
          mois.contratsDuMois.map((c, i) => (
            <View
              key={c.id}
              testID={`contrat-item-${mois.index}-${i}`}
              style={styles.contratItem}
            >
              <Text style={styles.employeur}>{c.employeur}</Text>
              <View style={styles.contratDetails}>
                <Text style={styles.detailVal}>{formatEuros(c.salaireBrut)}</Text>
                <Text style={styles.detailVal}>{formaterHeures(c)}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {mois.formationsDuMois.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.titreSection}>Formations</Text>
          {mois.formationsDuMois.map((fo) => (
            <View key={fo.id} style={styles.contratItem}>
              <Text style={styles.employeur}>{fo.intitule}</Text>
              <View style={styles.contratDetails}>
                <Text style={styles.detailVal}>{fo.heures}h</Text>
                <Text style={styles.detailVal}>
                  {fo.option === "compterHeures" ? "Heures comptées" : "ARE maintenue"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {mois.enseignementsDuMois.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.titreSection}>Enseignement</Text>
          {mois.enseignementsDuMois.map((e) => (
            <View key={e.id} style={styles.contratItem}>
              <Text style={styles.employeur}>{e.etablissement}</Text>
              <Text style={styles.detailVal}>{e.dateDebut} → {e.dateFin}</Text>
              <View style={styles.contratDetails}>
                <Text style={styles.detailVal}>{e.heures}h</Text>
                <Text style={styles.detailVal}>{formatEuros(e.salaireBrut)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.titreSection}>Décomposition</Text>
        <LigneDetail
          label="Jours calendaires"
          valeur={`${mois.joursCalendaires} j`}
          testID={`jours-calendaires-${mois.index}`}
        />
        <LigneDetail
          label="Jours travaillés"
          valeur={`-${mois.joursTravailles} j`}
          testID={`jours-travailles-${mois.index}`}
        />
        {mois.joursFormation > 0 && (
          <LigneDetail
            label="Jours de formation"
            valeur={`-${mois.joursFormation} j`}
            testID={`jours-formation-${mois.index}`}
          />
        )}
        {mois.joursEnseignement > 0 && (
          <LigneDetail
            label="Jours d'enseignement"
            valeur={`-${mois.joursEnseignement} j`}
            testID={`jours-enseignement-${mois.index}`}
          />
        )}
        {mois.delaiAttente > 0 && (
          <LigneDetail
            label="Délai d'attente"
            valeur={`-${mois.delaiAttente} j`}
            testID={`delai-attente-${mois.index}`}
            onInfoPress={() => showInfo(buildInfoDelaiAttente(mois))}
          />
        )}
        {mois.franchiseCP > 0 && (
          <LigneDetail
            label="Franchise congés payés"
            valeur={`-${mois.franchiseCP} j`}
            testID={`franchise-cp-${mois.index}`}
            onInfoPress={() => showInfo(buildInfoFranchiseCP(mois, profil))}
          />
        )}
        {mois.franchiseSalaire > 0 && (
          <LigneDetail
            label="Franchise salaire"
            valeur={`-${mois.franchiseSalaire} j`}
            testID={`franchise-salaire-${mois.index}`}
            onInfoPress={() => showInfo(buildInfoFranchiseSalaire(mois, profil))}
          />
        )}
        <LigneDetail
          label="Jours indemnisés"
          valeur={`${mois.joursIndemnises} j`}
          testID={`jours-indemnises-${mois.index}`}
        />
        {mois.seuilNonIndemnisationAtteint && (
          <View style={styles.ligneFormule}>
            <Text
              style={styles.texteFormulePlafond}
              testID={`seuil-non-indemnisation-${mois.index}`}
            >
              Seuil de non-indemnisation atteint — aucune ARE due ce mois
            </Text>
          </View>
        )}
        {(mois.joursIndemnises > 0 || mois.plafondAtteint) && (
          <>
            <View style={styles.separateur} />
            {mois.joursIndemnises > 0 && (
              <>
                <View style={styles.ligneFormule}>
                  <Text style={styles.texteFormule}>
                    {`${mois.joursIndemnises} j × ${mois.aj.toFixed(2).replace(".", ",")} €/j = ${mois.areVerseeAvantPlafond} € brut`}
                  </Text>
                </View>
                <View style={styles.ligneFormule}>
                  <Text style={styles.texteFormuleNet} testID={`are-nette-${mois.index}`}>
                    {`${mois.joursIndemnises} j × ${mois.ajNette.toFixed(2).replace(".", ",")} €/j = ${mois.areNetteEstimee} € net`}
                  </Text>
                </View>
              </>
            )}
            {mois.plafondAtteint && <FormulePlafond mois={mois} />}
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.titreSection}>Totaux</Text>
        <LigneDetail
          label="Salaire brut"
          valeur={formatEuros(mois.salaireDuMois)}
          testID={`salaire-brut-${mois.index}`}
        />
        <LigneDetail
          label="ARE versée"
          valeur={formatEuros(mois.areVersee)}
          testID={`are-versee-${mois.index}`}
        />
        <LigneDetail
          label="Total reçu"
          valeur={formatEuros(mois.totalRecu)}
          testID={`total-recu-${mois.index}`}
          bold
        />
      </View>
    </ScrollView>
  );
}

export default function DetailMoisScreen() {
  const { width: pageWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { moisIndex } = useLocalSearchParams<{ moisIndex: string }>();
  const indexNum = Math.max(0, parseInt(moisIndex ?? "0", 10) || 0);
  const { contrats } = useContrats();
  const { profilActif: profil } = useProfils();
  const { formations } = useFormations();
  const { enseignements } = useEnseignements();
  const flatListRef = useRef<FlatList>(null);
  const [listHeight, setListHeight] = useState(0);

  const mois = useMemo(
    () => (profil?.aOuvertDroits ? calculerIndemnisationMensuelle(profil, contrats, formations, enseignements) : []),
    [profil, contrats, formations, enseignements]
  );

  useEffect(() => {
    if (flatListRef.current && mois.length > 0 && indexNum > 0) {
      flatListRef.current.scrollToIndex({ index: indexNum, animated: false });
    }
  }, [indexNum, mois.length]);

  if (!profil || !profil.aOuvertDroits) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>
          {!profil
            ? "Configurez votre profil"
            : "Ouvrez vos droits ARE pour voir la simulation"}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      style={styles.flatList}
      onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
      data={mois}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      extraData={pageWidth}
      keyExtractor={(item) => String(item.index)}
      getItemLayout={(_, i) => ({
        length: pageWidth,
        offset: pageWidth * i,
        index: i,
      })}
      onScrollToIndexFailed={(info) => {
        flatListRef.current?.scrollToIndex({
          index: info.index,
          animated: false,
        });
      }}
      renderItem={({ item }) => <PageMois mois={item} profil={profil} width={pageWidth} height={listHeight || windowHeight} bottomInset={insets.bottom} />}
    />
  );
}
