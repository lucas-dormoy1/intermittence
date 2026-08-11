import { defineFeature, loadFeature } from "jest-cucumber";
import { render, fireEvent, screen, act, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleAuthProvider } from "../../contexts/GoogleAuthContext";
import { ProfilsProvider } from "../../contexts/ProfilsContext";
import { EmployeursProvider } from "../../contexts/EmployeursContext";
import { ContratsProvider } from "../../contexts/ContratsContext";
import { FormationsProvider } from "../../contexts/FormationsContext";
import { EnseignementsProvider } from "../../contexts/EnseignementsContext";
import BoutonProfil from "../../components/BoutonProfil";
import PanneauProfils from "../../components/PanneauProfils";
import { ProfilIntermittent } from "../../types/profil";
import { profil as profilFactory } from "../helpers/factories";
import { flushAsync } from "../helpers/act";

jest.mock("../../contexts/GoogleAuthContext", () =>
  require("../helpers/mocks").mockGoogleAuthContextFactory()
);
jest.mock("@react-native-community/datetimepicker", () =>
  require("../helpers/mocks").mockDateTimePickerFactory()
);

const feature = loadFeature("tests/features/panneau-profils.feature");

let onFermer: jest.Mock;
let panneauVisible: boolean;
let profilsCrees: ProfilIntermittent[];

const appuyerMenuProfil = (nom: string) => {
  const profil = profilsCrees.find((p) => p.nom === nom);
  fireEvent.press(screen.getByTestId(`btn-menu-${profil!.id}`));
};

const seedProfils = async (profils: ProfilIntermittent[], actifId: string) => {
  await AsyncStorage.setItem(
    "intermittence:profils",
    JSON.stringify(profils)
  );
  await AsyncStorage.setItem(
    "intermittence:profilActifId",
    JSON.stringify(actifId)
  );
};

const renderComposants = async (visible = false) => {
  panneauVisible = visible;
  onFermer = jest.fn(() => {
    panneauVisible = false;
  });

  const result = render(
    <GoogleAuthProvider>
      <ProfilsProvider>
        <EmployeursProvider>
          <ContratsProvider>
            <FormationsProvider>
              <EnseignementsProvider>
                <BoutonProfil onPress={() => { panneauVisible = true; }} />
                <PanneauProfils visible={panneauVisible} onFermer={onFermer} />
              </EnseignementsProvider>
            </FormationsProvider>
          </ContratsProvider>
        </EmployeursProvider>
      </ProfilsProvider>
    </GoogleAuthProvider>
  );
  await flushAsync();
  return result;
};

const renderAvecPanneau = async (profils: ProfilIntermittent[], actifId: string) => {
  await seedProfils(profils, actifId);
  onFermer = jest.fn();

  const result = render(
    <GoogleAuthProvider>
      <ProfilsProvider>
        <EmployeursProvider>
          <ContratsProvider>
            <FormationsProvider>
              <EnseignementsProvider>
                <BoutonProfil onPress={() => {}} />
                <PanneauProfils visible={true} onFermer={onFermer} />
              </EnseignementsProvider>
            </FormationsProvider>
          </ContratsProvider>
        </EmployeursProvider>
      </ProfilsProvider>
    </GoogleAuthProvider>
  );
  await flushAsync();
  return result;
};

type ProfilRow = { Nom: string; Annexe: string };

defineFeature(feature, (test) => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  test("Le bouton profil affiche l'initiale du profil actif", ({ given, then }) => {
    given(/^un profil actif avec le nom "(.*)"$/, async (nom: string) => {
      const p = profilFactory({ nom });
      await seedProfils([p], p.id);
      await renderComposants();
    });

    then(/^le bouton profil affiche "(.*)"$/, (initiale: string) => {
      expect(screen.getByText(initiale)).toBeTruthy();
    });
  });

  test("Le bouton profil affiche une icône quand il n'y a pas de profil", ({ given, then }) => {
    given("aucun profil n'existe", async () => {
      await renderComposants();
    });

    then("le bouton profil affiche l'icône par défaut", () => {
      expect(screen.getByText("person-circle-outline")).toBeTruthy();
    });
  });

  test("Ouverture du panneau de profils", ({ given, when, then, and }) => {
    given(/^un profil actif avec le nom "(.*)"$/, async (nom: string) => {
      const p = profilFactory({ nom });
      await renderAvecPanneau([p], p.id);
    });

    when("j'appuie sur le bouton profil", () => {});

    then("le panneau de profils est visible", () => {
      expect(screen.getByTestId("panneau-profils")).toBeTruthy();
    });

    and(/^le titre "(.*)" est affiché$/, (titre: string) => {
      expect(screen.getByText(titre)).toBeTruthy();
    });
  });

  test("La liste des profils est affichée", ({ given, when, then, and }) => {
    given("les profils suivants existent", async (table: ProfilRow[]) => {
      const profils = table.map((row, i) =>
        profilFactory({ id: `profil-${i}`, nom: row.Nom, annexe: row.Annexe as "8" | "10" })
      );
      await renderAvecPanneau(profils, profils[0].id);
    });

    when("j'appuie sur le bouton profil", () => {});

    then(/^je vois le profil "(.*)" avec "(.*)"$/, (nom: string, annexe: string) => {
      expect(screen.getByText(nom)).toBeTruthy();
      expect(screen.getByText(annexe)).toBeTruthy();
    });

    and(/^je vois le profil "(.*)" avec "(.*)"$/, (nom: string, annexe: string) => {
      expect(screen.getByText(nom)).toBeTruthy();
      expect(screen.getByText(annexe)).toBeTruthy();
    });
  });

  test("Le profil actif est surligné", ({ given, when, then }) => {
    given("les profils suivants existent", async (table: ProfilRow[]) => {
      const profils = table.map((row, i) =>
        profilFactory({ id: `profil-${i}`, nom: row.Nom, annexe: row.Annexe as "8" | "10" })
      );
      await renderAvecPanneau(profils, profils[0].id);
    });

    when("j'appuie sur le bouton profil", () => {});

    then(/^le profil "(.*)" est marqué comme actif$/, (nom: string) => {
      const profilItem = screen.getByTestId("profil-item-profil-0");
      expect(profilItem).toBeTruthy();
    });
  });

  test("Sélection d'un autre profil", ({ given, when, then, and }) => {
    let vue: ReturnType<typeof render>;

    given("les profils suivants existent", async (table: ProfilRow[]) => {
      const profils = table.map((row, i) =>
        profilFactory({ id: `profil-${i}`, nom: row.Nom, annexe: row.Annexe as "8" | "10" })
      );
      vue = await renderAvecPanneau(profils, profils[0].id);
    });

    when("j'appuie sur le bouton profil", () => {});

    and(/^je sélectionne le profil "(.*)"$/, (nom: string) => {
      const item = screen.getByText(nom);
      fireEvent.press(item);
    });

    then("le panneau se ferme", () => {
      expect(onFermer).toHaveBeenCalled();
    });

    and(/^le bouton profil affiche "(.*)"$/, async (initiale: string) => {
      vue.unmount();
      const stored = await AsyncStorage.getItem("intermittence:profilActifId");
      const actifId = JSON.parse(stored!);
      expect(actifId).toBe("profil-1");
    });
  });

  test("Fermeture du panneau en tapant sur l'overlay", ({ given, when, then, and }) => {
    given(/^un profil actif avec le nom "(.*)"$/, async (nom: string) => {
      const p = profilFactory({ nom });
      await renderAvecPanneau([p], p.id);
    });

    when("j'appuie sur le bouton profil", () => {});

    and("je tape sur l'overlay", () => {
      fireEvent.press(screen.getByTestId("panneau-overlay"));
    });

    then("le panneau se ferme", () => {
      expect(onFermer).toHaveBeenCalled();
    });
  });

  test("Ajout d'un profil ouvre la dialogue de création", ({ given, when, then, and }) => {
    given(/^un profil actif avec le nom "(.*)"$/, async (nom: string) => {
      const p = profilFactory({ nom });
      await renderAvecPanneau([p], p.id);
    });

    when("j'appuie sur le bouton profil", () => {});

    and("j'appuie sur le bouton ajouter un profil", () => {
      fireEvent.press(screen.getByTestId("btn-ajouter-profil"));
    });

    then("le formulaire de création est affiché dans une dialogue", () => {
      expect(screen.getByTestId("input-nom-profil")).toBeTruthy();
      expect(screen.getByTestId("btn-valider-profil")).toBeTruthy();
    });
  });

  test("Fermeture de la dialogue de création par annulation", ({ given, when, then, and }) => {
    given(/^un profil actif avec le nom "(.*)"$/, async (nom: string) => {
      const p = profilFactory({ nom });
      await renderAvecPanneau([p], p.id);
    });

    when("j'appuie sur le bouton profil", () => {});

    and("j'appuie sur le bouton ajouter un profil", () => {
      fireEvent.press(screen.getByTestId("btn-ajouter-profil"));
    });

    and("j'annule la création", () => {
      const btnAnnuler = screen.getByText("Annuler");
      fireEvent.press(btnAnnuler);
    });

    then("le formulaire de création n'est plus affiché", () => {
      expect(screen.queryByTestId("input-nom-profil")).toBeNull();
    });
  });

  test("Le menu actions s'ouvre au tap sur les 3 points", ({ given, when, then }) => {
    given("les profils suivants existent", async (table: ProfilRow[]) => {
      profilsCrees = table.map((row, i) =>
        profilFactory({ id: `profil-${i}`, nom: row.Nom, annexe: row.Annexe as "8" | "10" })
      );
      await renderAvecPanneau(profilsCrees, profilsCrees[0].id);
    });

    when(/^j'appuie sur le menu 3 points du profil "(.*)"$/, (nom: string) => {
      appuyerMenuProfil(nom);
    });

    then(/^le menu actions est visible avec les options "(.*)" "(.*)" "(.*)" "(.*)"$/, (a: string, b: string, c: string, d: string) => {
      expect(screen.getByTestId("menu-actions")).toBeTruthy();
      expect(screen.getByText(a)).toBeTruthy();
      expect(screen.getByText(b)).toBeTruthy();
      expect(screen.getByText(c)).toBeTruthy();
      expect(screen.getByText(d)).toBeTruthy();
    });
  });

  test("Le menu se ferme au tap sur l'overlay du menu", ({ given, when, then, and }) => {
    given("les profils suivants existent", async (table: ProfilRow[]) => {
      profilsCrees = table.map((row, i) =>
        profilFactory({ id: `profil-${i}`, nom: row.Nom, annexe: row.Annexe as "8" | "10" })
      );
      await renderAvecPanneau(profilsCrees, profilsCrees[0].id);
    });

    when(/^j'appuie sur le menu 3 points du profil "(.*)"$/, (nom: string) => {
      appuyerMenuProfil(nom);
    });

    and("je tape sur l'overlay du menu", () => {
      fireEvent.press(screen.getByTestId("menu-overlay"));
    });

    then("le menu actions n'est plus visible", () => {
      expect(screen.queryByTestId("menu-actions")).toBeNull();
    });
  });

  test("Modifier un profil via le menu actions", ({ given, when, then, and }) => {
    given("les profils suivants existent", async (table: ProfilRow[]) => {
      profilsCrees = table.map((row, i) =>
        profilFactory({ id: `profil-${i}`, nom: row.Nom, annexe: row.Annexe as "8" | "10" })
      );
      await renderAvecPanneau(profilsCrees, profilsCrees[0].id);
    });

    when(/^j'appuie sur le menu 3 points du profil "(.*)"$/, (nom: string) => {
      appuyerMenuProfil(nom);
    });

    and(/^je choisis "(.*)" dans le menu$/, () => {
      fireEvent.press(screen.getByTestId("menu-modifier"));
    });

    then(/^le formulaire d'édition est affiché avec le nom "(.*)"$/, (nom: string) => {
      const input = screen.getByTestId("input-nom-profil");
      expect(input.props.value).toBe(nom);
    });
  });

  test("Renommer un profil via le menu actions", ({ given, when, then, and }) => {
    given("les profils suivants existent", async (table: ProfilRow[]) => {
      profilsCrees = table.map((row, i) =>
        profilFactory({ id: `profil-${i}`, nom: row.Nom, annexe: row.Annexe as "8" | "10" })
      );
      await renderAvecPanneau(profilsCrees, profilsCrees[0].id);
    });

    when(/^j'appuie sur le menu 3 points du profil "(.*)"$/, (nom: string) => {
      appuyerMenuProfil(nom);
    });

    and(/^je choisis "(.*)" dans le menu$/, () => {
      fireEvent.press(screen.getByTestId("menu-renommer"));
    });

    then(/^le dialogue de renommage s'affiche avec "(.*)"$/, (nom: string) => {
      const input = screen.getByTestId("dialogue-texte-input");
      expect(input.props.value).toBe(nom);
    });
  });

  test("Dupliquer un profil via le menu actions", ({ given, when, then, and }) => {
    given("les profils suivants existent", async (table: ProfilRow[]) => {
      profilsCrees = table.map((row, i) =>
        profilFactory({ id: `profil-${i}`, nom: row.Nom, annexe: row.Annexe as "8" | "10" })
      );
      await renderAvecPanneau(profilsCrees, profilsCrees[0].id);
    });

    when(/^j'appuie sur le menu 3 points du profil "(.*)"$/, (nom: string) => {
      appuyerMenuProfil(nom);
    });

    and(/^je choisis "(.*)" dans le menu$/, () => {
      fireEvent.press(screen.getByTestId("menu-dupliquer"));
    });

    then(/^le dialogue de duplication s'affiche avec "(.*)"$/, (valeur: string) => {
      const input = screen.getByTestId("dialogue-texte-input");
      expect(input.props.value).toBe(valeur);
    });
  });

  test("Supprimer un profil via le menu actions", ({ given, when, then, and }) => {
    let alertSpy: jest.SpyInstance;
    let lastAlertButtons: any[];

    given("les profils suivants existent", async (table: ProfilRow[]) => {
      lastAlertButtons = [];
      alertSpy = jest.spyOn(Alert, "alert").mockImplementation(
        (_title, _message, buttons) => {
          lastAlertButtons = buttons ?? [];
        }
      );
      profilsCrees = table.map((row, i) =>
        profilFactory({ id: `profil-${i}`, nom: row.Nom, annexe: row.Annexe as "8" | "10" })
      );
      await renderAvecPanneau(profilsCrees, profilsCrees[0].id);
    });

    when(/^j'appuie sur le menu 3 points du profil "(.*)"$/, (nom: string) => {
      appuyerMenuProfil(nom);
    });

    and(/^je choisis "(.*)" dans le menu$/, () => {
      fireEvent.press(screen.getByTestId("menu-supprimer"));
    });

    then(/^une alerte de confirmation s'affiche pour "(.*)"$/, (nom: string) => {
      expect(alertSpy).toHaveBeenCalled();
      const [, message] = alertSpy.mock.calls[0];
      expect(message).toContain(nom);
      alertSpy.mockRestore();
    });
  });

  test("Confirmer la suppression d'un profil", ({ given, when, then, and }) => {
    let alertSpy: jest.SpyInstance;
    let lastAlertButtons: any[];

    given("les profils suivants existent", async (table: ProfilRow[]) => {
      lastAlertButtons = [];
      alertSpy = jest.spyOn(Alert, "alert").mockImplementation(
        (_title, _message, buttons) => {
          lastAlertButtons = buttons ?? [];
        }
      );
      profilsCrees = table.map((row, i) =>
        profilFactory({ id: `profil-${i}`, nom: row.Nom, annexe: row.Annexe as "8" | "10" })
      );
      await renderAvecPanneau(profilsCrees, profilsCrees[0].id);
    });

    when(/^j'appuie sur le menu 3 points du profil "(.*)"$/, (nom: string) => {
      appuyerMenuProfil(nom);
    });

    and(/^je choisis "(.*)" dans le menu$/, () => {
      fireEvent.press(screen.getByTestId("menu-supprimer"));
    });

    and("je confirme la suppression", () => {
      const btnSupprimer = lastAlertButtons.find((b: any) => b.style === "destructive");
      expect(btnSupprimer).toBeDefined();
      act(() => { btnSupprimer?.onPress?.(); });
    });

    then(/^le profil "(.*)" n'est plus dans la liste$/, async (nom: string) => {
      await waitFor(() => {
        expect(screen.queryByText(nom)).toBeNull();
      });
      alertSpy.mockRestore();
    });
  });
});
