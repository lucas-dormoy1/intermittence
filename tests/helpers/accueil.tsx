import { render } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AccueilScreen from "../../app/(tabs)/index";
import { ProfilsProvider } from "../../contexts/ProfilsContext";
import { EmployeursProvider } from "../../contexts/EmployeursContext";
import { ContratsProvider } from "../../contexts/ContratsContext";
import { FormationsProvider } from "../../contexts/FormationsContext";
import { EnseignementsProvider } from "../../contexts/EnseignementsContext";
import { ProfilIntermittent, Annexe } from "../../types/profil";
import { flushAsync } from "./act";

export type ProfilRow = {
  Nom: string;
  Annexe: string;
  Heures: string;
  Salaire: string;
  "Date anniversaire": string;
  CSG?: string;
  "Alsace-Moselle"?: string;
};

const PROFIL_DEFAUT: ProfilIntermittent = {
  id: "default-test-id",
  nom: "Défaut",
  annexe: "8",
  aOuvertDroits: true,
  dateAnniversaire: "01/01/2026",
  salaireReference: 10000,
  heuresTravaillees: 507,
  tauxCSG: "standard",
  alsaceMoselle: false,
};

export const prechargerProfilParDefaut = async () => {
  await AsyncStorage.setItem(
    "intermittence:profils",
    JSON.stringify([PROFIL_DEFAUT])
  );
  await AsyncStorage.setItem(
    "intermittence:profilActifId",
    JSON.stringify(PROFIL_DEFAUT.id)
  );
};

export type ProfilSansDroitsRow = {
  Nom: string;
  Annexe: string;
};

export const prechargerProfil = async (row: ProfilRow) => {
  const profil: ProfilIntermittent = {
    id: "test-profil-id",
    nom: row.Nom,
    annexe: row.Annexe as Annexe,
    aOuvertDroits: true,
    dateAnniversaire: row["Date anniversaire"],
    salaireReference: Number(row.Salaire),
    heuresTravaillees: Number(row.Heures),
    tauxCSG: row.CSG === "reduit" ? "reduit" : "standard",
    alsaceMoselle: row["Alsace-Moselle"] === "oui",
  };
  await AsyncStorage.setItem(
    "intermittence:profils",
    JSON.stringify([profil])
  );
  await AsyncStorage.setItem(
    "intermittence:profilActifId",
    JSON.stringify(profil.id)
  );
};

export const prechargerProfilSansDroits = async (row: ProfilSansDroitsRow) => {
  const profil: ProfilIntermittent = {
    id: "test-profil-id",
    nom: row.Nom,
    annexe: row.Annexe as Annexe,
    aOuvertDroits: false,
    tauxCSG: "standard",
    alsaceMoselle: false,
  };
  await AsyncStorage.setItem(
    "intermittence:profils",
    JSON.stringify([profil])
  );
  await AsyncStorage.setItem(
    "intermittence:profilActifId",
    JSON.stringify(profil.id)
  );
};

export const renderAccueilScreen = async () => {
  const result = render(
    <ProfilsProvider>
      <EmployeursProvider>
        <ContratsProvider>
          <FormationsProvider>
            <EnseignementsProvider>
              <AccueilScreen />
            </EnseignementsProvider>
          </FormationsProvider>
        </ContratsProvider>
      </EmployeursProvider>
    </ProfilsProvider>
  );
  await flushAsync();
  return result;
};
