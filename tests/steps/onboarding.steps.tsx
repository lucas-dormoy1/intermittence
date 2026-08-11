import { defineFeature, loadFeature } from "jest-cucumber";
import { render, fireEvent, screen } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import EcranOnboarding from "../../components/EcranOnboarding";
import { GoogleAuthProvider } from "../../contexts/GoogleAuthContext";
import { ProfilsProvider } from "../../contexts/ProfilsContext";
import { EmployeursProvider } from "../../contexts/EmployeursContext";
import { ContratsProvider } from "../../contexts/ContratsContext";
import { FormationsProvider } from "../../contexts/FormationsContext";
import { EnseignementsProvider } from "../../contexts/EnseignementsContext";
import { resetPickerCallbacks, selectDatePicker } from "../helpers/mocks";
import { ddmmyyyyToIso } from "../helpers/date";
import { flushAsync } from "../helpers/act";
import { ProfilRow } from "../helpers/accueil";

jest.mock("../../contexts/GoogleAuthContext", () =>
  require("../helpers/mocks").mockGoogleAuthContextFactory()
);
jest.mock("@react-native-community/datetimepicker", () =>
  require("../helpers/mocks").mockDateTimePickerFactory()
);

const feature = loadFeature("tests/features/onboarding.feature");

const renderOnboarding = async () => {
  render(
    <GoogleAuthProvider>
      <ProfilsProvider>
        <EmployeursProvider>
          <ContratsProvider>
            <FormationsProvider>
              <EnseignementsProvider>
                <EcranOnboarding />
              </EnseignementsProvider>
            </FormationsProvider>
          </ContratsProvider>
        </EmployeursProvider>
      </ProfilsProvider>
    </GoogleAuthProvider>
  );
  await flushAsync();
};

defineFeature(feature, (test) => {
  beforeEach(() => {
    resetPickerCallbacks();
  });

  test("L'écran d'onboarding affiche le formulaire sans bouton Annuler", ({ given, then, and }) => {
    given("l'écran d'onboarding est affiché", async () => {
      await renderOnboarding();
    });

    then("le message de bienvenue est affiché", () => {
      expect(screen.getByText("Bienvenue !")).toBeTruthy();
    });

    and("le formulaire de profil est visible", () => {
      expect(screen.getByTestId("input-nom-profil")).toBeTruthy();
      expect(screen.getByTestId("btn-valider-profil")).toBeTruthy();
    });

    and("le bouton Annuler n'est pas visible", () => {
      expect(screen.queryByText("Annuler")).toBeNull();
    });
  });

  test("Créer un profil depuis l'onboarding", ({ given, when, then }) => {
    given("l'écran d'onboarding est affiché", async () => {
      await renderOnboarding();
    });

    when("je remplis le formulaire d'onboarding", (table: ProfilRow[]) => {
      const row = table[0];
      fireEvent.changeText(screen.getByTestId("input-nom-profil"), row.Nom);
      fireEvent.press(screen.getByTestId(`btn-annexe-${row.Annexe}`));
      selectDatePicker(
        "btn-date-anniversaire",
        "picker-anniversaire",
        ddmmyyyyToIso(row["Date anniversaire"])
      );
      fireEvent.changeText(screen.getByTestId("input-salaire-reference"), row.Salaire);
      fireEvent.changeText(screen.getByTestId("input-heures-travaillees"), row.Heures);
      fireEvent.press(screen.getByTestId("btn-valider-profil"));
    });

    then("le profil est enregistré", async () => {
      await flushAsync();
      const stored = await AsyncStorage.getItem("intermittence:profils");
      const profils = JSON.parse(stored!);
      expect(profils).toHaveLength(1);
      expect(profils[0].nom).toBe("Jean");
      expect(profils[0].annexe).toBe("8");
    });
  });
});
