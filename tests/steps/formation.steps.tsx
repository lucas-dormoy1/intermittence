import { defineFeature, loadFeature } from "jest-cucumber";
import { render, screen, act } from "@testing-library/react-native";
import AccueilScreen from "../../app/(tabs)/index";
import DetailMoisScreen from "../../app/mois/[moisIndex]";
import { ContratsProvider, useContrats } from "../../contexts/ContratsContext";
import { EmployeursProvider } from "../../contexts/EmployeursContext";
import { ProfilsProvider, useProfils } from "../../contexts/ProfilsContext";
import { FormationsProvider, useFormations } from "../../contexts/FormationsContext";
import { EnseignementsProvider } from "../../contexts/EnseignementsContext";
import { ProfilSansId } from "../../types/profil";
import { Contrat } from "../../types/contrat";
import { Formation, OptionFormation } from "../../types/formation";
import { fixerDate } from "../helpers/form";
import { flushAsync } from "../helpers/act";
import { ContratRow } from "../helpers/types";

let mockIndex = "0";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => ({ moisIndex: mockIndex }),
  useNavigation: () => ({ setOptions: jest.fn() }),
}));

type ProfilRow = {
  Annexe: string;
  Heures: string;
  Salaire: string;
  "Date anniversaire": string;
};

type FormationRow = {
  "Intitulé": string;
  "Début": string;
  Fin: string;
  Heures: string;
  Option: string;
};

let capturedAjouterProfil: ((p: ProfilSansId) => void) | null = null;
let capturedAjouterContrat: ((c: Omit<Contrat, "id">) => void) | null = null;
let capturedAjouterFormation: ((f: Omit<Formation, "id">) => void) | null = null;

function SetupAccueil() {
  const { ajouterProfil } = useProfils();
  const { ajouterContrat } = useContrats();
  const { ajouterFormation } = useFormations();
  capturedAjouterProfil = ajouterProfil;
  capturedAjouterContrat = ajouterContrat;
  capturedAjouterFormation = ajouterFormation;
  return <AccueilScreen />;
}

function SetupMois() {
  const { ajouterProfil } = useProfils();
  const { ajouterContrat } = useContrats();
  const { ajouterFormation } = useFormations();
  capturedAjouterProfil = ajouterProfil;
  capturedAjouterContrat = ajouterContrat;
  capturedAjouterFormation = ajouterFormation;
  return <DetailMoisScreen />;
}

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

const renderMois = async () => {
  const result = render(
    <ProfilsProvider>
      <EmployeursProvider>
        <ContratsProvider>
          <FormationsProvider>
            <EnseignementsProvider>
              <SetupMois />
            </EnseignementsProvider>
          </FormationsProvider>
        </ContratsProvider>
      </EmployeursProvider>
    </ProfilsProvider>
  );
  await flushAsync();
  return result;
};

let pendingProfil: ProfilRow | null = null;
let pendingContrats: ContratRow[] = [];
let pendingFormations: FormationRow[] = [];

const fixerDateStep = (given: (pattern: RegExp, fn: (date: string) => void) => void) => {
  given(/^nous sommes le "(.*)"$/, (date: string) => {
    fixerDate(date);
  });
};

const configurerProfilStep = (given: Function) => {
  given("le profil est configuré", (table: ProfilRow[]) => {
    pendingProfil = table[0];
  });
};

const contratsStep = (and: Function) => {
  and("ces contrats existent", (table: ContratRow[]) => {
    pendingContrats = table;
  });
};

const formationsStep = (and: Function) => {
  and("ces formations existent", (table: FormationRow[]) => {
    pendingFormations = table;
  });
};

const injecterDonnees = async () => {
  if (pendingProfil) {
    act(() => {
      capturedAjouterProfil!({
        nom: "Test",
        annexe: pendingProfil!.Annexe as "8" | "10",
        aOuvertDroits: true,
        heuresTravaillees: Number(pendingProfil!.Heures),
        salaireReference: Number(pendingProfil!.Salaire),
        dateAnniversaire: pendingProfil!["Date anniversaire"],
        tauxCSG: "standard",
        alsaceMoselle: false,
      });
    });
    await flushAsync();
  }
  act(() => {
    pendingContrats.forEach((row) => {
      capturedAjouterContrat!({
        employeur: row.Employeur,
        dateDebut: row["Début"],
        dateFin: row.Fin,
        heures: Number(row.Heures),
        salaireBrut: Number(row.Salaire),
      });
    });
    pendingFormations.forEach((row) => {
      capturedAjouterFormation!({
        intitule: row["Intitulé"],
        dateDebut: row["Début"],
        dateFin: row.Fin,
        heures: Number(row.Heures),
        option: row.Option as OptionFormation,
      });
    });
  });
};

const feature = loadFeature("tests/features/formation.feature");

defineFeature(feature, (test) => {
  beforeEach(() => {
    pendingProfil = null;
    pendingContrats = [];
    pendingFormations = [];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderEtInjecterAccueil = async () => {
    await renderAccueil();
    await injecterDonnees();
  };

  test("Formation option A ajoute des heures au compteur 507h", ({ given, and, then }) => {
    fixerDateStep(given);
    configurerProfilStep(given);
    contratsStep(and);
    formationsStep(and);

    then(/^le compteur affiche "(.*)"$/, async (texte: string) => {
      await renderEtInjecterAccueil();
      expect(screen.getByText(texte)).toBeTruthy();
    });

    and(/^le texte "(.*)" est visible$/, (texte: string) => {
      expect(screen.getByText(new RegExp(texte))).toBeTruthy();
    });
  });

  test("Formation option B ne change pas le compteur 507h", ({ given, and, then }) => {
    fixerDateStep(given);
    configurerProfilStep(given);
    contratsStep(and);
    formationsStep(and);

    then(/^le compteur affiche "(.*)"$/, async (texte: string) => {
      await renderEtInjecterAccueil();
      expect(screen.getByText(texte)).toBeTruthy();
    });

    and(/^le texte "(.*)" n'est pas visible$/, (texte: string) => {
      expect(screen.queryByText(new RegExp(texte))).toBeNull();
    });
  });

  test("Formation option A plafonnée à 338h", ({ given, and, then }) => {
    fixerDateStep(given);
    configurerProfilStep(given);
    contratsStep(and);
    formationsStep(and);

    then(/^le compteur affiche "(.*)"$/, async (texte: string) => {
      await renderEtInjecterAccueil();
      expect(screen.getByText(texte)).toBeTruthy();
    });

    and(/^le texte "(.*)" est visible$/, (texte: string) => {
      expect(screen.getByText(new RegExp(texte))).toBeTruthy();
    });
  });

  test("Formation option A réduit les jours indemnisés sur la vue mensuelle", ({ given, and, when, then }) => {
    fixerDateStep(given);
    configurerProfilStep(given);
    formationsStep(and);

    when(/^je navigue vers le détail du mois (\d+)$/, async (index: string) => {
      mockIndex = index;
      await renderMois();
      await injecterDonnees();
    });

    then(/^les jours de formation affichent "(.*)"$/, (texte: string) => {
      expect(
        screen.getByTestId(`jours-formation-${mockIndex}`)
      ).toBeTruthy();
      expect(
        screen.getByTestId(`jours-formation-${mockIndex}`).props.children
      ).toBe(texte);
    });
  });
});
