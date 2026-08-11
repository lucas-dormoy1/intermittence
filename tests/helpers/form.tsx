import {
  render,
  fireEvent,
  screen,
} from "@testing-library/react-native";
import ContratsScreen from "../../app/(tabs)/contrats";
import { ProfilsProvider } from "../../contexts/ProfilsContext";
import { EmployeursProvider } from "../../contexts/EmployeursContext";
import { ContratsProvider } from "../../contexts/ContratsContext";
import { FormationsProvider } from "../../contexts/FormationsContext";
import { EnseignementsProvider } from "../../contexts/EnseignementsContext";
import { simulateDayPress } from "./mocks";
import { ddmmyyyyToIso } from "./date";
import { ContratRow } from "./types";
import { flushAsync } from "./act";

export const renderScreen = async () => {
  const result = render(
    <ProfilsProvider>
      <EmployeursProvider>
        <ContratsProvider>
          <FormationsProvider>
            <EnseignementsProvider>
              <ContratsScreen />
            </EnseignementsProvider>
          </FormationsProvider>
        </ContratsProvider>
      </EmployeursProvider>
    </ProfilsProvider>
  );
  await flushAsync();
  return result;
};

export const ouvrirFormulaire = () => {
  fireEvent.press(screen.getByTestId("btn-ouvrir-formulaire"));
};

export const selectDateRange = (isoDateDebut: string, isoDateFin: string) => {
  fireEvent.press(screen.getByTestId("input-date-range"));
  simulateDayPress(isoDateDebut);
  simulateDayPress(isoDateFin);
  fireEvent.press(screen.getByText("Sélectionner"));
};

export const ajouterContratViaFormulaire = (row: ContratRow) => {
  ouvrirFormulaire();
  fireEvent.changeText(screen.getByTestId("input-employeur"), row.Employeur);
  selectDateRange(ddmmyyyyToIso(row["Début"]), ddmmyyyyToIso(row.Fin));
  if (row.Type === "cachets") {
    fireEvent.press(screen.getByTestId("toggle-cachets"));
  }
  fireEvent.changeText(screen.getByTestId("input-heures"), row.Heures);
  fireEvent.changeText(screen.getByTestId("input-salaire-brut"), row.Salaire);
  fireEvent.press(screen.getByText("Ajouter"));
};

export const fixerDate = (ddmmyyyy: string) => {
  jest.useFakeTimers();
  const isoDate = ddmmyyyyToIso(ddmmyyyy);
  jest.setSystemTime(new Date(isoDate + "T12:00:00"));
};
