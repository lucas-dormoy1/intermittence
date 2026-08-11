import { defineFeature, loadFeature } from "jest-cucumber";
import { render, screen, waitFor, RenderResult } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AccueilScreen from "../../app/(tabs)/index";
import { ProfilsProvider } from "../../contexts/ProfilsContext";
import { EmployeursProvider } from "../../contexts/EmployeursContext";
import { ContratsProvider } from "../../contexts/ContratsContext";
import { FormationsProvider } from "../../contexts/FormationsContext";
import { EnseignementsProvider } from "../../contexts/EnseignementsContext";
import { ProfilRow, prechargerProfil } from "../helpers/accueil";
import { flushAsync } from "../helpers/act";
import {
  creerProfilArtiste,
  creerProfilTechnicien,
  sauvegarderDonneesTest,
} from "../../utils/donneesTest";

const feature = loadFeature("tests/features/persistance.feature");

const renderAccueil = async () => {
  const result = render(
    <ProfilsProvider>
      <EmployeursProvider>
        <ContratsProvider>
          <FormationsProvider>
            <EnseignementsProvider>
              <AccueilScreen />
            </EnseignementsProvider>
          </FormationsProvider>
        </ContratsProvider>
      </EmployeursProvider>
    </ProfilsProvider>
  );
  await flushAsync();
  return result;
};

const seedDonneesTest = async (type: "artiste" | "technicien") => {
  const profil = type === "artiste" ? creerProfilArtiste() : creerProfilTechnicien();
  await AsyncStorage.setItem("intermittence:profils", JSON.stringify([profil]));
  await AsyncStorage.setItem("intermittence:profilActifId", JSON.stringify(profil.id));
  await sauvegarderDonneesTest(profil.id, type);
};

defineFeature(feature, (test) => {
  let vue: RenderResult;

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("Les contrats et le profil sont restaurés au redémarrage", ({
    given,
    when,
    then,
    and,
  }) => {
    given(
      /^je charge les données de test "(.*)" sur l'écran d'accueil$/,
      async (type: string) => {
        await seedDonneesTest(type as "artiste" | "technicien");
        vue = await renderAccueil();
      }
    );

    when("l'application redémarre", async () => {
      vue.unmount();
      vue = await renderAccueil();
      await waitFor(() => {
        expect(screen.getByTestId("aj-value")).toBeTruthy();
      });
    });

    then("l'indemnité journalière estimée est affichée", () => {
      expect(screen.getByTestId("aj-value")).toBeTruthy();
    });

    and("le dashboard affiche des contrats", () => {
      const count = screen.getByTestId("contrats-count");
      expect(Number(count.props.children)).toBeGreaterThan(0);
    });
  });

  test("Le profil configuré manuellement est restauré au redémarrage", ({
    given,
    and,
    when,
    then,
  }) => {
    given(
      "un profil est configuré",
      async (table: ProfilRow[]) => {
        await prechargerProfil(table[0]);
      }
    );

    and("l'écran d'accueil est affiché", async () => {
      vue = await renderAccueil();
    });

    when("l'application redémarre", async () => {
      vue.unmount();
      vue = await renderAccueil();
      await waitFor(() => {
        expect(screen.getByTestId("aj-value")).toBeTruthy();
      });
    });

    then("l'indemnité journalière estimée est affichée", () => {
      expect(screen.getByTestId("aj-value")).toBeTruthy();
    });
  });

  test("La réinitialisation supprime les données persistées", ({
    given,
    when,
    then,
    and,
  }) => {
    given(
      /^je charge les données de test "(.*)" sur l'écran d'accueil$/,
      async (type: string) => {
        await seedDonneesTest(type as "artiste" | "technicien");
        vue = await renderAccueil();
      }
    );

    when("le storage est vidé et l'application redémarre", async () => {
      vue.unmount();
      await AsyncStorage.clear();
      vue = await renderAccueil();
      await flushAsync();
    });

    then("aucun profil n'est configuré", () => {
      expect(screen.queryByTestId("aj-card")).toBeNull();
    });

    and(
      /^le dashboard affiche "(.*)" contrats$/,
      (nombre: string) => {
        const count = screen.getByTestId("contrats-count");
        expect(count.props.children).toBe(Number(nombre));
      }
    );
  });
});
