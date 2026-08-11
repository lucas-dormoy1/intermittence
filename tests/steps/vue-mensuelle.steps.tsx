import { defineFeature, loadFeature } from "jest-cucumber";
import { screen, within } from "@testing-library/react-native";
import VueMensuelleScreen from "../../app/(tabs)/vue-mensuelle";
import {
  resetCaptures,
  renderEcranMensuel,
  fixerDateStep,
  unProfilExiste,
  ajouterContrats,
} from "../helpers/simulationMensuelle";
import { ContratRow } from "../helpers/types";

const renderScreen = () => renderEcranMensuel(VueMensuelleScreen);

const carteAfficheTexte = (index: string, texte: string) => {
  const carte = screen.getByTestId(`carte-recap-${index}`);
  expect(within(carte).getByText(texte)).toBeTruthy();
};

const feature = loadFeature("tests/features/vue-mensuelle.feature");

defineFeature(feature, (test) => {
  beforeEach(() => {
    resetCaptures();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("Le récap affiche toujours 12 mois glissants", ({ given, then }) => {
    fixerDateStep(given);

    given("un profil existe", async () => {
      await renderScreen();
      await unProfilExiste();
    });

    then("12 cartes de récap sont affichées", () => {
      const cartes = screen.getAllByTestId(/^carte-recap-\d+$/);
      expect(cartes).toHaveLength(12);
    });
  });

  test("Heures et salaire affichés pour un mois avec contrat", ({ given, and, then }) => {
    fixerDateStep(given);

    given("un profil existe", async () => {
      await renderScreen();
      await unProfilExiste();
    });

    and("ces contrats existent", (table: ContratRow[]) => {
      ajouterContrats(table);
    });

    then(/^la carte du mois (\d+) affiche "(.*)"$/, carteAfficheTexte);
    and(/^la carte du mois (\d+) affiche "(.*)"$/, carteAfficheTexte);
  });

  test("Le mois courant est marqué comme en cours", ({ given, then }) => {
    fixerDateStep(given);

    given("un profil existe", async () => {
      await renderScreen();
      await unProfilExiste();
    });

    then(/^la carte du mois (\d+) affiche "(.*)"$/, carteAfficheTexte);
  });
});
