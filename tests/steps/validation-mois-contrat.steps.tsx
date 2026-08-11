import { defineFeature, loadFeature } from "jest-cucumber";
import { fireEvent, screen } from "@testing-library/react-native";
import { resetPickerCallbacks } from "../helpers/mocks";
import { ContratRow } from "../helpers/types";
import { renderScreen, ouvrirFormulaire, selectDateRange, fixerDate } from "../helpers/form";
import { ddmmyyyyToIso } from "../helpers/date";

jest.mock("react-native-calendars", () =>
  require("../helpers/mocks").mockCalendarsFactory()
);

const feature = loadFeature("tests/features/validation-mois-contrat.feature");

const fixerDateStep = (given: (pattern: RegExp, fn: (date: string) => void) => void) => {
  given(/^nous sommes le "(.*)"$/, (date: string) => {
    fixerDate(date);
  });
};

defineFeature(feature, (test) => {
  beforeEach(() => {
    resetPickerCallbacks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const remplirFormulaire = (row: ContratRow) => {
    fireEvent.changeText(screen.getByTestId("input-employeur"), row.Employeur);
    selectDateRange(ddmmyyyyToIso(row["Début"]), ddmmyyyyToIso(row.Fin));
    fireEvent.changeText(screen.getByTestId("input-heures"), row.Heures);
    fireEvent.changeText(screen.getByTestId("input-salaire-brut"), row.Salaire);
  };

  test("Dates dans le même mois sont acceptées", ({ given, and, when, then }) => {
    fixerDateStep(given);

    given("le formulaire de saisie est ouvert", async () => {
      await renderScreen();
      ouvrirFormulaire();
    });

    when("je remplis le formulaire avec les données suivantes", (table: ContratRow[]) => {
      remplirFormulaire(table[0]);
    });

    and(/^j'appuie sur "(.*)"$/, (texte: string) => {
      fireEvent.press(screen.getByText(texte));
    });

    then(/^le contrat "(.*)" apparaît dans la liste$/, (employeur: string) => {
      expect(screen.getByText(employeur)).toBeTruthy();
    });
  });

  test("Dates sur deux mois différents affichent une erreur", ({ given, and, when, then }) => {
    fixerDateStep(given);

    given("le formulaire de saisie est ouvert", async () => {
      await renderScreen();
      ouvrirFormulaire();
    });

    when("je remplis le formulaire avec les données suivantes", (table: ContratRow[]) => {
      remplirFormulaire(table[0]);
    });

    and(/^j'appuie sur "(.*)"$/, (texte: string) => {
      fireEvent.press(screen.getByText(texte));
    });

    then(/^le message "(.*)" est affiché$/, (message: string) => {
      expect(screen.getByText(message)).toBeTruthy();
    });
  });

  test("Dates sur deux mois différents ne créent pas de contrat", ({ given, and, when, then }) => {
    fixerDateStep(given);

    given("le formulaire de saisie est ouvert", async () => {
      await renderScreen();
      ouvrirFormulaire();
    });

    when("je remplis le formulaire avec les données suivantes", (table: ContratRow[]) => {
      remplirFormulaire(table[0]);
    });

    and(/^j'appuie sur "(.*)"$/, (texte: string) => {
      fireEvent.press(screen.getByText(texte));
    });

    and(/^j'annule la saisie$/, () => {
      fireEvent.press(screen.getByText("Annuler"));
    });

    then("aucun contrat n'est ajouté", () => {
      expect(screen.getByText("Aucun contrat ni formation. Ajoute ton premier contrat !")).toBeTruthy();
    });
  });
});
