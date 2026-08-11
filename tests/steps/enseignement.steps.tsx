import { defineFeature, loadFeature } from "jest-cucumber";
import { render, fireEvent, screen, act } from "@testing-library/react-native";
import ContratsScreen from "../../app/(tabs)/contrats";
import AccueilScreen from "../../app/(tabs)/index";
import { ContratsProvider, useContrats } from "../../contexts/ContratsContext";
import { EmployeursProvider } from "../../contexts/EmployeursContext";
import { ProfilsProvider, useProfils } from "../../contexts/ProfilsContext";
import { FormationsProvider } from "../../contexts/FormationsContext";
import { EnseignementsProvider, useEnseignements } from "../../contexts/EnseignementsContext";
import { ProfilSansId } from "../../types/profil";
import { Contrat } from "../../types/contrat";
import { Enseignement } from "../../types/enseignement";
import { fixerDate } from "../helpers/form";
import { flushAsync } from "../helpers/act";
import { simulateDayPress } from "../helpers/mocks";
import { ddmmyyyyToIso } from "../helpers/date";
import { ContratRow } from "../helpers/types";

jest.mock("@react-native-community/datetimepicker", () =>
  require("../helpers/mocks").mockDateTimePickerFactory()
);

jest.mock("react-native-calendars", () =>
  require("../helpers/mocks").mockCalendarsFactory()
);

let capturedAjouterProfil: ((p: ProfilSansId) => void) | null = null;
let capturedAjouterContrat: ((c: Omit<Contrat, "id">) => void) | null = null;
let capturedAjouterEnseignement: ((e: Omit<Enseignement, "id">) => void) | null = null;

function SetupContrats() {
  const { ajouterContrat } = useContrats();
  const { ajouterEnseignement } = useEnseignements();
  capturedAjouterContrat = ajouterContrat;
  capturedAjouterEnseignement = ajouterEnseignement;
  return <ContratsScreen />;
}

function SetupAccueil() {
  const { ajouterProfil } = useProfils();
  const { ajouterContrat } = useContrats();
  const { ajouterEnseignement } = useEnseignements();
  capturedAjouterProfil = ajouterProfil;
  capturedAjouterContrat = ajouterContrat;
  capturedAjouterEnseignement = ajouterEnseignement;
  return <AccueilScreen />;
}

const renderContrats = async () => {
  const result = render(
    <ProfilsProvider>
      <EmployeursProvider>
        <ContratsProvider>
          <FormationsProvider>
            <EnseignementsProvider>
              <SetupContrats />
            </EnseignementsProvider>
          </FormationsProvider>
        </ContratsProvider>
      </EmployeursProvider>
    </ProfilsProvider>
  );
  await flushAsync();
  return result;
};

const renderAccueil = async () => {
  const result = render(
    <ProfilsProvider>
      <EmployeursProvider>
        <ContratsProvider>
          <FormationsProvider>
            <EnseignementsProvider>
              <SetupAccueil />
            </EnseignementsProvider>
          </FormationsProvider>
        </ContratsProvider>
      </EmployeursProvider>
    </ProfilsProvider>
  );
  await flushAsync();
  return result;
};

type EnseignementRow = {
  "Établissement": string;
  "Début": string;
  Fin: string;
  Heures: string;
  Salaire: string;
};

type ProfilRow = {
  Annexe: string;
  Heures: string;
  Salaire: string;
  "Date anniversaire": string;
};

const feature = loadFeature("tests/features/enseignement.feature");

const fixerDateStep = (given: (pattern: RegExp, fn: (date: string) => void) => void) => {
  given(/^nous sommes le "(.*)"$/, (date: string) => {
    fixerDate(date);
  });
};

const configurerProfilStep = (given: Function) => {
  given("un profil configuré", async (table: ProfilRow[]) => {
    await renderAccueil();
    const row = table[0];
    act(() => {
      capturedAjouterProfil!({
        nom: "Test",
        annexe: row.Annexe as "8" | "10",
        aOuvertDroits: true,
        dateAnniversaire: row["Date anniversaire"],
        salaireReference: Number(row.Salaire),
        heuresTravaillees: Number(row.Heures),
        tauxCSG: "standard",
        alsaceMoselle: false,
      });
    });
    await flushAsync();
  });
};

const ajouterContratStep = (and: Function) => {
  and("un contrat existe", (table: ContratRow[]) => {
    const row = table[0];
    act(() => {
      capturedAjouterContrat!({
        employeur: row.Employeur,
        dateDebut: row["Début"],
        dateFin: row.Fin,
        heures: Number(row.Heures),
        salaireBrut: Number(row.Salaire),
      });
    });
  });
};

const ajouterEnseignementStep = (and: Function) => {
  and("un enseignement existe", (table: EnseignementRow[]) => {
    const row = table[0];
    act(() => {
      capturedAjouterEnseignement!({
        etablissement: row["Établissement"],
        dateDebut: row["Début"],
        dateFin: row.Fin,
        heures: Number(row.Heures),
        salaireBrut: Number(row.Salaire),
      });
    });
  });
};

const verifierDashboardStep = (then: Function) => {
  then(/^le dashboard affiche "(.*)"$/, (texte: string) => {
    expect(screen.getByText(new RegExp(texte))).toBeTruthy();
  });
};

const verifierTexteStep = (and: Function) => {
  and(/^le texte "(.*)" est visible$/, (texte: string) => {
    expect(screen.getByText(new RegExp(texte))).toBeTruthy();
  });
};

defineFeature(feature, (test) => {
  afterEach(() => {
    jest.useRealTimers();
    capturedAjouterProfil = null;
    capturedAjouterContrat = null;
    capturedAjouterEnseignement = null;
  });

  test("Ajouter un enseignement via le formulaire", ({ given, when, and, then }) => {
    fixerDateStep(given);

    when("j'ouvre le formulaire", async () => {
      await renderContrats();
      fireEvent.press(screen.getByTestId("btn-ouvrir-formulaire"));
    });

    and(/^je sélectionne le type "(.*)"$/, (type: string) => {
      fireEvent.press(screen.getByTestId(`toggle-saisie-${type}`));
    });

    and("je saisis un enseignement", (table: EnseignementRow[]) => {
      const row = table[0];
      fireEvent.changeText(screen.getByTestId("input-etablissement"), row["Établissement"]);
      fireEvent.press(screen.getByTestId("input-date-range"));
      simulateDayPress(ddmmyyyyToIso(row["Début"]));
      simulateDayPress(ddmmyyyyToIso(row.Fin));
      fireEvent.press(screen.getByText("Sélectionner"));
      fireEvent.changeText(screen.getByTestId("input-heures-enseignement"), row.Heures);
      fireEvent.changeText(screen.getByTestId("input-salaire-brut-enseignement"), row.Salaire);
      fireEvent.press(screen.getByText("Ajouter"));
    });

    then(/^l'enseignement "(.*)" est visible dans la liste$/, (nom: string) => {
      expect(screen.getByText(nom)).toBeTruthy();
      expect(screen.getByText("Enseignement")).toBeTruthy();
    });
  });

  test("Les heures d'enseignement comptent pour les 507h sur le dashboard", ({ given, and, then }) => {
    fixerDateStep(given);
    configurerProfilStep(given);
    ajouterContratStep(and);
    ajouterEnseignementStep(and);
    verifierDashboardStep(then);
    verifierTexteStep(and);
  });

  test("Les heures d'enseignement sont plafonnées à 70h", ({ given, and, then }) => {
    fixerDateStep(given);
    configurerProfilStep(given);
    ajouterContratStep(and);
    ajouterEnseignementStep(and);
    verifierDashboardStep(then);
    verifierTexteStep(and);
  });

  test("Un enseignement passé est grisé", ({ given, and, then }) => {
    fixerDateStep(given);

    given("un enseignement existe", async (table: EnseignementRow[]) => {
      await renderContrats();
      const row = table[0];
      act(() => {
        capturedAjouterEnseignement!({
          etablissement: row["Établissement"],
          dateDebut: row["Début"],
          dateFin: row.Fin,
          heures: Number(row.Heures),
          salaireBrut: Number(row.Salaire),
        });
      });
    });

    and("les éléments passés sont affichés", () => {
      fireEvent.press(screen.getByTestId("btn-toggle-passes"));
    });

    then(/^l'enseignement "(.*)" porte le badge "(.*)"$/, (_nom: string, badge: string) => {
      expect(screen.getByText(badge)).toBeTruthy();
    });
  });
});
