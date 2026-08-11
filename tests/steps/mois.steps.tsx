import { defineFeature, loadFeature } from "jest-cucumber";
import { render, screen, within, act } from "@testing-library/react-native";
import DetailMoisScreen from "../../app/mois/[moisIndex]";
import { ContratsProvider, useContrats } from "../../contexts/ContratsContext";
import { EmployeursProvider } from "../../contexts/EmployeursContext";
import { ProfilsProvider, useProfils } from "../../contexts/ProfilsContext";
import { FormationsProvider } from "../../contexts/FormationsContext";
import { EnseignementsProvider } from "../../contexts/EnseignementsContext";
import { ProfilSansId } from "../../types/profil";
import { Contrat } from "../../types/contrat";
import { ContratRow } from "../helpers/types";
import { fixerDate } from "../helpers/form";
import { flushAsync } from "../helpers/act";

let mockIndex = "0";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ index: mockIndex }),
  useRouter: () => ({ navigate: jest.fn() }),
  useNavigation: () => ({ setOptions: jest.fn() }),
}));

type ProfilRow = {
  Annexe: string;
  Heures: string;
  Salaire: string;
  "Date anniversaire": string;
};

let capturedAjouterContrat: ((c: Omit<Contrat, "id">) => void) | null = null;
let capturedAjouterProfil: ((p: ProfilSansId) => void) | null = null;
let pendingProfil: ProfilRow | null = null;
let pendingContrats: ContratRow[] = [];

function Setup() {
  const { ajouterProfil } = useProfils();
  const { ajouterContrat } = useContrats();
  capturedAjouterContrat = ajouterContrat;
  capturedAjouterProfil = ajouterProfil;
  return <DetailMoisScreen />;
}

const renderScreen = async () => {
  const result = render(
    <ProfilsProvider>
      <EmployeursProvider>
        <ContratsProvider>
          <FormationsProvider>
            <EnseignementsProvider>
              <Setup />
            </EnseignementsProvider>
          </FormationsProvider>
        </ContratsProvider>
      </EmployeursProvider>
    </ProfilsProvider>
  );
  await flushAsync();
  return result;
};

const fixerDateStep = (
  given: (pattern: RegExp, fn: (date: string) => void) => void
) => {
  given(/^nous sommes le "(.*)"$/, (date: string) => {
    fixerDate(date);
  });
};

const franchiseCPStep = (
  and: (pattern: RegExp, fn: (valeur: string) => void) => void
) => {
  and(/^la franchise congés payés affichée est "(\d+)"$/, (valeur: string) => {
    expect(
      screen.getByTestId(`franchise-cp-${mockIndex}`).props.children
    ).toBe(`-${valeur} j`);
  });
};

const franchiseSalaireStep = (
  and: (pattern: RegExp, fn: (valeur: string) => void) => void
) => {
  and(/^la franchise salaire affichée est "(\d+)"$/, (valeur: string) => {
    expect(
      screen.getByTestId(`franchise-salaire-${mockIndex}`).props.children
    ).toBe(`-${valeur} j`);
  });
};

const setupMoisScreen = async (index: string) => {
  mockIndex = index;
  await renderScreen();
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
  if (pendingContrats.length > 0) {
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
    });
  }
};

const feature = loadFeature("tests/features/mois.feature");

defineFeature(feature, (test) => {
  beforeEach(() => {
    mockIndex = "0";
    capturedAjouterContrat = null;
    capturedAjouterProfil = null;
    pendingProfil = null;
    pendingContrats = [];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("Décomposition du calcul sans contrat", ({ given, and, then }) => {
    fixerDateStep(given);

    given("le profil est configuré", (table: ProfilRow[]) => {
      pendingProfil = table[0];
    });

    and(/^je suis sur le détail du mois d'index (\d+)$/, async (index: string) => {
      await setupMoisScreen(index);
    });

    then(/^les jours calendaires affichés sont "(\d+)"$/, (valeur: string) => {
      expect(
        screen.getByTestId(`jours-calendaires-${mockIndex}`).props.children
      ).toBe(`${valeur} j`);
    });

    and(/^les jours travaillés affichés sont "(\d+)"$/, (valeur: string) => {
      expect(
        screen.getByTestId(`jours-travailles-${mockIndex}`).props.children
      ).toBe(`-${valeur} j`);
    });

    and(/^le délai d'attente affiché est "(\d+)"$/, (valeur: string) => {
      expect(
        screen.getByTestId(`delai-attente-${mockIndex}`).props.children
      ).toBe(`-${valeur} j`);
    });

    franchiseCPStep(and);

    and(/^les jours indemnisés affichés sont "(\d+)"$/, (valeur: string) => {
      expect(
        screen.getByTestId(`jours-indemnises-${mockIndex}`).props.children
      ).toBe(`${valeur} j`);
    });
  });

  test("Contrat du mois affiché dans le détail", ({ given, and, then }) => {
    fixerDateStep(given);

    given("le profil est configuré", (table: ProfilRow[]) => {
      pendingProfil = table[0];
    });

    and("ces contrats existent", (table: ContratRow[]) => {
      pendingContrats = table;
    });

    and(/^je suis sur le détail du mois d'index (\d+)$/, async (index: string) => {
      await setupMoisScreen(index);
    });

    then(
      /^le contrat de "(.*)" affiche le salaire "(.*)"$/,
      (employeur: string, salaire: string) => {
        const section = screen.getByTestId(`section-contrats-${mockIndex}`);
        expect(within(section).getByText(employeur)).toBeTruthy();
        expect(within(section).getByText(salaire)).toBeTruthy();
      }
    );

    and(
      /^le contrat de "(.*)" affiche "(.*)"$/,
      (employeur: string, valeur: string) => {
        const section = screen.getByTestId(`section-contrats-${mockIndex}`);
        expect(within(section).getByText(employeur)).toBeTruthy();
        expect(within(section).getByText(valeur)).toBeTruthy();
      }
    );
  });

  test("Affichage sans profil configuré", ({ given, and, then }) => {
    fixerDateStep(given);

    given("le profil n'est pas configuré", () => {});

    and(/^je suis sur le détail du mois d'index (\d+)$/, async (index: string) => {
      await setupMoisScreen(index);
    });

    then(/^le message "(.*)" est affiché$/, (message: string) => {
      expect(screen.getByText(message)).toBeTruthy();
    });
  });

  test("Totaux du mois affichés dans le détail", ({ given, and, then }) => {
    fixerDateStep(given);

    given("le profil est configuré", (table: ProfilRow[]) => {
      pendingProfil = table[0];
    });

    and(/^je suis sur le détail du mois d'index (\d+)$/, async (index: string) => {
      await setupMoisScreen(index);
    });

    then(/^l'ARE versée affichée est "(.*)"$/, (valeur: string) => {
      expect(screen.getByTestId(`are-versee-${mockIndex}`).props.children).toBe(
        valeur
      );
    });

    and(/^le salaire brut affiché est "(.*)"$/, (valeur: string) => {
      expect(
        screen.getByTestId(`salaire-brut-${mockIndex}`).props.children
      ).toBe(valeur);
    });

    and(/^le total reçu affiché est "(.*)"$/, (valeur: string) => {
      expect(
        screen.getByTestId(`total-recu-${mockIndex}`).props.children
      ).toBe(valeur);
    });
  });

  test(
    "Exemple officiel 6 — AJ technicien annexe 8 avec 800h et 18000 euros",
    ({ given, and, then }) => {
      fixerDateStep(given);

      given("le profil est configuré", (table: ProfilRow[]) => {
        pendingProfil = table[0];
      });

      and(/^je suis sur le détail du mois d'index (\d+)$/, async (index: string) => {
        await setupMoisScreen(index);
      });

      then(/^l'ARE versée affichée est "(.*)"$/, (valeur: string) => {
        expect(
          screen.getByTestId(`are-versee-${mockIndex}`).props.children
        ).toBe(valeur);
      });

      franchiseCPStep(and);
    }
  );

  test(
    "Exemple officiel 10 — Franchise CP musicien annexe 10 avec 176 jours travaillés",
    ({ given, and, then }) => {
      fixerDateStep(given);

      given("le profil est configuré", (table: ProfilRow[]) => {
        pendingProfil = table[0];
      });

      and(/^je suis sur le détail du mois d'index (\d+)$/, async (index: string) => {
        await setupMoisScreen(index);
      });

      franchiseCPStep(then);
    }
  );

  test(
    "Franchise salaire affichée quand le salaire de référence est élevé",
    ({ given, and, then }) => {
      fixerDateStep(given);

      given("le profil est configuré", (table: ProfilRow[]) => {
        pendingProfil = table[0];
      });

      and(/^je suis sur le détail du mois d'index (\d+)$/, async (index: string) => {
        await setupMoisScreen(index);
      });

      franchiseSalaireStep(then);
    }
  );

  test("Exemple officiel 12 — Plafond mensuel réduit l'ARE", ({ given, and, then }) => {
    fixerDateStep(given);

    given("le profil est configuré", (table: ProfilRow[]) => {
      pendingProfil = table[0];
    });

    and("ces contrats existent", (table: ContratRow[]) => {
      pendingContrats = table;
    });

    and(/^je suis sur le détail du mois d'index (\d+)$/, async (index: string) => {
      await setupMoisScreen(index);
    });

    then(/^l'ARE versée affichée est "(.*)"$/, (valeur: string) => {
      expect(screen.getByTestId(`are-versee-${mockIndex}`).props.children).toBe(valeur);
    });

    and(/^le total reçu affiché est "(.*)"$/, (valeur: string) => {
      expect(screen.getByTestId(`total-recu-${mockIndex}`).props.children).toBe(valeur);
    });
  });

  test("Salaire mensuel seul dépasse le plafond — ARE nulle", ({ given, and, then }) => {
    fixerDateStep(given);

    given("le profil est configuré", (table: ProfilRow[]) => {
      pendingProfil = table[0];
    });

    and("ces contrats existent", (table: ContratRow[]) => {
      pendingContrats = table;
    });

    and(/^je suis sur le détail du mois d'index (\d+)$/, async (index: string) => {
      await setupMoisScreen(index);
    });

    then(/^l'ARE versée affichée est "(.*)"$/, (valeur: string) => {
      expect(screen.getByTestId(`are-versee-${mockIndex}`).props.children).toBe(valeur);
    });

    and(/^le total reçu affiché est "(.*)"$/, (valeur: string) => {
      expect(screen.getByTestId(`total-recu-${mockIndex}`).props.children).toBe(valeur);
    });
  });

  test("Jours indemnisés nuls mais salaire dépasse le plafond", ({ given, and, then }) => {
    fixerDateStep(given);

    given("le profil est configuré", (table: ProfilRow[]) => {
      pendingProfil = table[0];
    });

    and("ces contrats existent", (table: ContratRow[]) => {
      pendingContrats = table;
    });

    and(/^je suis sur le détail du mois d'index (\d+)$/, async (index: string) => {
      await setupMoisScreen(index);
    });

    then(/^les jours indemnisés affichés sont "(\d+)"$/, (valeur: string) => {
      expect(
        screen.getByTestId(`jours-indemnises-${mockIndex}`).props.children
      ).toBe(`${valeur} j`);
    });

    and(/^l'ARE versée affichée est "(.*)"$/, (valeur: string) => {
      expect(screen.getByTestId(`are-versee-${mockIndex}`).props.children).toBe(valeur);
    });

    and(/^le total reçu affiché est "(.*)"$/, (valeur: string) => {
      expect(screen.getByTestId(`total-recu-${mockIndex}`).props.children).toBe(valeur);
    });
  });

  test("Seuil de non-indemnisation atteint annexe 8", ({ given, and, then }) => {
    fixerDateStep(given);

    given("le profil est configuré", (table: ProfilRow[]) => {
      pendingProfil = table[0];
    });

    and("ces contrats existent", (table: ContratRow[]) => {
      pendingContrats = table;
    });

    and(/^je suis sur le détail du mois d'index (\d+)$/, async (index: string) => {
      await setupMoisScreen(index);
    });

    then(/^les jours indemnisés affichés sont "(\d+)"$/, (valeur: string) => {
      expect(
        screen.getByTestId(`jours-indemnises-${mockIndex}`).props.children
      ).toBe(`${valeur} j`);
    });

    and(/^l'ARE versée affichée est "(.*)"$/, (valeur: string) => {
      expect(screen.getByTestId(`are-versee-${mockIndex}`).props.children).toBe(valeur);
    });

    and("le message seuil de non-indemnisation est affiché", () => {
      expect(
        screen.getByTestId(`seuil-non-indemnisation-${mockIndex}`)
      ).toBeTruthy();
    });
  });

  test("Seuil de non-indemnisation atteint annexe 10", ({ given, and, then }) => {
    fixerDateStep(given);

    given("le profil est configuré", (table: ProfilRow[]) => {
      pendingProfil = table[0];
    });

    and("ces contrats existent", (table: ContratRow[]) => {
      pendingContrats = table;
    });

    and(/^je suis sur le détail du mois d'index (\d+)$/, async (index: string) => {
      await setupMoisScreen(index);
    });

    then(/^les jours indemnisés affichés sont "(\d+)"$/, (valeur: string) => {
      expect(
        screen.getByTestId(`jours-indemnises-${mockIndex}`).props.children
      ).toBe(`${valeur} j`);
    });

    and(/^l'ARE versée affichée est "(.*)"$/, (valeur: string) => {
      expect(screen.getByTestId(`are-versee-${mockIndex}`).props.children).toBe(valeur);
    });

    and("le message seuil de non-indemnisation est affiché", () => {
      expect(
        screen.getByTestId(`seuil-non-indemnisation-${mockIndex}`)
      ).toBeTruthy();
    });
  });

  test(
    "Jours calendaires réduits le mois de la date d'anniversaire",
    ({ given, and, then }) => {
      fixerDateStep(given);

      given("le profil est configuré", (table: ProfilRow[]) => {
        pendingProfil = table[0];
      });

      and(/^je suis sur le détail du mois d'index (\d+)$/, async (index: string) => {
        await setupMoisScreen(index);
      });

      then(/^les jours calendaires affichés sont "(\d+)"$/, (valeur: string) => {
        expect(
          screen.getByTestId(`jours-calendaires-${mockIndex}`).props.children
        ).toBe(`${valeur} j`);
      });

      and(/^les jours indemnisés affichés sont "(\d+)"$/, (valeur: string) => {
        expect(
          screen.getByTestId(`jours-indemnises-${mockIndex}`).props.children
        ).toBe(`${valeur} j`);
      });
    }
  );

  test(
    "Jours calendaires complets le mois suivant la date d'anniversaire",
    ({ given, and, then }) => {
      fixerDateStep(given);

      given("le profil est configuré", (table: ProfilRow[]) => {
        pendingProfil = table[0];
      });

      and(/^je suis sur le détail du mois d'index (\d+)$/, async (index: string) => {
        await setupMoisScreen(index);
      });

      then(/^les jours calendaires affichés sont "(\d+)"$/, (valeur: string) => {
        expect(
          screen.getByTestId(`jours-calendaires-${mockIndex}`).props.children
        ).toBe(`${valeur} j`);
      });
    }
  );

  test("Seuil de non-indemnisation non atteint annexe 8", ({ given, and, then }) => {
    fixerDateStep(given);

    given("le profil est configuré", (table: ProfilRow[]) => {
      pendingProfil = table[0];
    });

    and("ces contrats existent", (table: ContratRow[]) => {
      pendingContrats = table;
    });

    and(/^je suis sur le détail du mois d'index (\d+)$/, async (index: string) => {
      await setupMoisScreen(index);
    });

    then("le message seuil de non-indemnisation n'est pas affiché", () => {
      expect(
        screen.queryByTestId(`seuil-non-indemnisation-${mockIndex}`)
      ).toBeNull();
    });

    and(/^l'ARE versée affichée n'est pas "(.*)"$/, (valeur: string) => {
      expect(
        screen.getByTestId(`are-versee-${mockIndex}`).props.children
      ).not.toBe(valeur);
    });
  });

  test(
    "Franchises nulles quand les heures travaillées sont zéro",
    ({ given, and, then }) => {
      fixerDateStep(given);

      given("le profil est configuré", (table: ProfilRow[]) => {
        pendingProfil = table[0];
      });

      and(/^je suis sur le détail du mois d'index (\d+)$/, async (index: string) => {
        await setupMoisScreen(index);
      });

      then(/^les jours indemnisés affichés sont "(\d+)"$/, (valeur: string) => {
        expect(
          screen.getByTestId(`jours-indemnises-${mockIndex}`).props.children
        ).toBe(`${valeur} j`);
      });
    }
  );
});
