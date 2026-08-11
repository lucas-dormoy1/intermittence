import { defineFeature, loadFeature } from "jest-cucumber";
import { render, fireEvent, renderHook, screen } from "@testing-library/react-native";
import { useProfils } from "../../contexts/ProfilsContext";
import { ProfilsProvider } from "../../contexts/ProfilsContext";
import { EmployeursProvider } from "../../contexts/EmployeursContext";
import { ContratsProvider } from "../../contexts/ContratsContext";
import { FormationsProvider } from "../../contexts/FormationsContext";
import { EnseignementsProvider } from "../../contexts/EnseignementsContext";
import EcranOnboarding from "../../components/EcranOnboarding";
import { GoogleAuthProvider } from "../../contexts/GoogleAuthContext";
import {
  renderAccueilScreen,
  prechargerProfil,
  ProfilRow,
} from "../helpers/accueil";
import { flushAsync } from "../helpers/act";

jest.mock("../../contexts/GoogleAuthContext", () =>
  require("../helpers/mocks").mockGoogleAuthContextFactory()
);
jest.mock("@react-native-community/datetimepicker", () =>
  require("../helpers/mocks").mockDateTimePickerFactory()
);

const feature = loadFeature("tests/features/profil.feature");

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
  test("Configuration du profil", ({ given, when, then }) => {
    given("un profil est configuré", async (table: ProfilRow[]) => {
      await prechargerProfil(table[0]);
    });

    when("l'écran d'accueil est affiché", async () => {
      await renderAccueilScreen();
    });

    then("l'indemnité journalière estimée est affichée", () => {
      expect(screen.getByTestId("aj-value")).toBeTruthy();
    });
  });

  test("Le nom du profil est affiché dans la carte AJ", ({ given, when, then }) => {
    given("un profil est configuré", async (table: ProfilRow[]) => {
      await prechargerProfil(table[0]);
    });

    when("l'écran d'accueil est affiché", async () => {
      await renderAccueilScreen();
    });

    then(/^la carte AJ contient "(.*)"$/, (texte: string) => {
      const escaped = texte.replace(/[()]/g, "\\$&");
      expect(screen.getByText(new RegExp(escaped))).toBeTruthy();
    });
  });

  test("Le bouton Valider est désactivé si le nom est vide dans l'onboarding", ({ given, when, then }) => {
    given("l'écran d'onboarding est affiché", async () => {
      await renderOnboarding();
    });

    when("je vide le champ nom", () => {
      fireEvent.changeText(screen.getByTestId("input-nom-profil"), "");
    });

    then("le bouton Valider est désactivé", () => {
      const btn = screen.getByTestId("btn-valider-profil");
      expect(btn.props.accessibilityState?.disabled).toBe(true);
    });
  });

  test("Erreur hors du Provider", ({ then }) => {
    then("useProfils lance une erreur si utilisé hors du Provider", () => {
      expect(() => {
        renderHook(() => useProfils());
      }).toThrow("useProfils doit être utilisé dans un ProfilsProvider");
    });
  });
});
