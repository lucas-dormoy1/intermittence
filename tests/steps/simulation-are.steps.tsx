import { defineFeature, loadFeature } from "jest-cucumber";
import { fireEvent, screen, within, act } from "@testing-library/react-native";
import SimulationAREScreen from "../../app/simulation-are";
import {
  captures,
  resetCaptures,
  renderEcranMensuel,
  fixerDateStep,
  configurerProfil,
  ajouterContrats,
  ProfilRow,
} from "../helpers/simulationMensuelle";
import { ContratRow } from "../helpers/types";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const renderScreen = () => renderEcranMensuel(SimulationAREScreen);

const feature = loadFeature("tests/features/simulation-are.feature");

defineFeature(feature, (test) => {
  beforeEach(() => {
    resetCaptures();
    mockPush.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("Profil non configuré - invitation à configurer", ({ given, then }) => {
    fixerDateStep(given);

    given("le profil n'est pas configuré", async () => {
      await renderScreen();
    });

    then("le message d'invitation à configurer le profil est visible", () => {
      expect(screen.getByTestId("message-profil-manquant")).toBeTruthy();
    });
  });

  test("Profil sans droits ARE - invitation à ouvrir ses droits", ({ given, then }) => {
    fixerDateStep(given);

    given("le profil est configuré sans droits ARE", async (table: { Nom: string; Annexe: string }[]) => {
      await renderScreen();
      act(() => {
        captures.ajouterProfil!({
          nom: table[0].Nom,
          annexe: table[0].Annexe as "8" | "10",
          aOuvertDroits: false,
          tauxCSG: "standard",
          alsaceMoselle: false,
        });
      });
    });

    then("le message d'invitation à ouvrir ses droits est visible", () => {
      expect(screen.getByTestId("message-profil-manquant")).toBeTruthy();
      expect(screen.getByTestId("message-profil-manquant").props.children).toBe(
        "Ouvrez vos droits ARE pour voir la simulation"
      );
    });
  });

  test("12 cartes affichées avec profil configuré", ({ given, then }) => {
    fixerDateStep(given);

    given("le profil est configuré", async (table: ProfilRow[]) => {
      await renderScreen();
      await configurerProfil(table[0]);
    });

    then("12 cartes de mois sont affichées", () => {
      const cartes = screen.getAllByTestId(/^carte-mois-\d+$/);
      expect(cartes).toHaveLength(12);
    });
  });

  test("Heures travaillées affichées sur la carte d'un mois avec contrat", ({
    given,
    and,
    then,
  }) => {
    fixerDateStep(given);

    given("le profil est configuré", async (table: ProfilRow[]) => {
      await renderScreen();
      await configurerProfil(table[0]);
    });

    and("ces contrats existent", (table: ContratRow[]) => {
      ajouterContrats(table);
    });

    then(
      /^la carte du mois (\d+) affiche "(.*)"$/,
      (index: string, texte: string) => {
        const carte = screen.getByTestId(`carte-mois-${index}`);
        expect(within(carte).getByText(texte)).toBeTruthy();
      }
    );

    and(
      /^la carte du mois (\d+) affiche "(.*)" pour les jours de formation$/,
      (index: string, texte: string) => {
        const carte = screen.getByTestId(`carte-mois-${index}`);
        expect(within(carte).getByText(texte)).toBeTruthy();
      }
    );
  });

  test("Jours indemnisés affichés sur la carte", ({ given, then }) => {
    fixerDateStep(given);

    given("le profil est configuré", async (table: ProfilRow[]) => {
      await renderScreen();
      await configurerProfil(table[0]);
    });

    then(
      /^la carte du mois (\d+) affiche les jours indemnisés$/,
      (index: string) => {
        const carte = screen.getByTestId(`carte-mois-${index}`);
        expect(within(carte).getByText("Jours indemnisés")).toBeTruthy();
        const lignes = within(carte).getAllByText(/^\d+ j$/);
        expect(lignes.length).toBeGreaterThanOrEqual(1);
      }
    );
  });

  test("Navigation vers le détail d'un mois", ({ given, when, then }) => {
    fixerDateStep(given);

    given("le profil est configuré", async (table: ProfilRow[]) => {
      await renderScreen();
      await configurerProfil(table[0]);
    });

    when(/^je tape sur la carte du mois (\d+)$/, (index: string) => {
      fireEvent.press(screen.getByTestId(`carte-mois-${index}`));
    });

    then(/^je suis redirigé vers "(.*)"$/, (route: string) => {
      expect(mockPush).toHaveBeenCalledWith(route);
    });
  });
});
