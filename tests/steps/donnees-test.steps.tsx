import { defineFeature, loadFeature } from "jest-cucumber";
import { render, screen, fireEvent } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import EcranOnboarding from "../../components/EcranOnboarding";
import { GoogleAuthProvider } from "../../contexts/GoogleAuthContext";
import { ProfilsProvider } from "../../contexts/ProfilsContext";
import { EmployeursProvider } from "../../contexts/EmployeursContext";
import { ContratsProvider } from "../../contexts/ContratsContext";
import { FormationsProvider } from "../../contexts/FormationsContext";
import { EnseignementsProvider } from "../../contexts/EnseignementsContext";
import { flushAsync } from "../helpers/act";

jest.mock("../../contexts/GoogleAuthContext", () =>
  require("../helpers/mocks").mockGoogleAuthContextFactory()
);

const feature = loadFeature("tests/features/donnees-test.feature");

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
  test("Les boutons de test sont visibles en mode création", ({ given, then }) => {
    given("l'écran d'onboarding est affiché", async () => {
      await renderOnboarding();
    });

    then("les boutons de données de test sont visibles", () => {
      expect(screen.getByTestId("btn-test-artiste")).toBeTruthy();
      expect(screen.getByTestId("btn-test-technicien")).toBeTruthy();
    });
  });

  test("Application du profil artiste", ({ given, when, then }) => {
    given("l'écran d'onboarding est affiché", async () => {
      await renderOnboarding();
    });

    when(/^j'applique le profil de test "(.*)"$/, async (type: string) => {
      fireEvent.press(screen.getByTestId(`btn-test-${type}`));
      await flushAsync();
    });

    then(/^le profil est enregistré avec le nom "(.*)"$/, async (nom: string) => {
      const stored = await AsyncStorage.getItem("intermittence:profils");
      const profils = JSON.parse(stored!);
      expect(profils).toHaveLength(1);
      expect(profils[0].nom).toBe(nom);
    });
  });

  test("Application du profil technicien", ({ given, when, then }) => {
    given("l'écran d'onboarding est affiché", async () => {
      await renderOnboarding();
    });

    when(/^j'applique le profil de test "(.*)"$/, async (type: string) => {
      fireEvent.press(screen.getByTestId(`btn-test-${type}`));
      await flushAsync();
    });

    then(/^le profil est enregistré avec le nom "(.*)"$/, async (nom: string) => {
      const stored = await AsyncStorage.getItem("intermittence:profils");
      const profils = JSON.parse(stored!);
      expect(profils).toHaveLength(1);
      expect(profils[0].nom).toBe(nom);
    });
  });
});
