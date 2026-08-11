import { defineFeature, loadFeature } from "jest-cucumber";
import { fireEvent, screen } from "@testing-library/react-native";
import {
  renderAccueilScreen,
  prechargerProfil,
  ProfilRow,
} from "../helpers/accueil";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const feature = loadFeature("tests/features/simulation-are-navigation.feature");

defineFeature(feature, (test) => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  test("Le bouton de simulation ARE apparaît quand un profil est configuré", ({ given, when, then }) => {
    given("un profil est configuré", async (table: ProfilRow[]) => {
      await prechargerProfil(table[0]);
    });

    when("l'écran d'accueil est affiché", async () => {
      await renderAccueilScreen();
    });

    then(/^le bouton "(.*)" est visible$/, (texte: string) => {
      expect(screen.getByTestId("btn-simulation-are")).toBeTruthy();
      expect(screen.getByText(texte)).toBeTruthy();
    });
  });

  test("Le bouton de simulation ARE navigue vers la page de simulation", ({ given, when, and, then }) => {
    given("un profil est configuré", async (table: ProfilRow[]) => {
      await prechargerProfil(table[0]);
    });

    when("l'écran d'accueil est affiché", async () => {
      await renderAccueilScreen();
    });

    and("j'appuie sur le bouton de simulation ARE", () => {
      fireEvent.press(screen.getByTestId("btn-simulation-are"));
    });

    then(/^la navigation vers "(.*)" est déclenchée$/, (route: string) => {
      expect(mockPush).toHaveBeenCalledWith(route);
    });
  });
});
