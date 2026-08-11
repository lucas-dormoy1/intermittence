import { ComponentType } from "react";
import { render, act } from "@testing-library/react-native";
import { ContratsProvider, useContrats } from "../../contexts/ContratsContext";
import { EmployeursProvider } from "../../contexts/EmployeursContext";
import { ProfilsProvider, useProfils } from "../../contexts/ProfilsContext";
import { FormationsProvider } from "../../contexts/FormationsContext";
import { EnseignementsProvider } from "../../contexts/EnseignementsContext";
import { ProfilSansId } from "../../types/profil";
import { Contrat } from "../../types/contrat";
import { ContratRow } from "./types";
import { fixerDate } from "./form";
import { flushAsync } from "./act";

export type ProfilRow = {
  Annexe: string;
  Heures: string;
  Salaire: string;
  "Date anniversaire": string;
};

export const captures: {
  ajouterContrat: ((c: Omit<Contrat, "id">) => void) | null;
  ajouterProfil: ((p: ProfilSansId) => void) | null;
} = { ajouterContrat: null, ajouterProfil: null };

export const resetCaptures = () => {
  captures.ajouterContrat = null;
  captures.ajouterProfil = null;
};

function Setup({ Screen }: { Screen: ComponentType }) {
  const { ajouterProfil } = useProfils();
  const { ajouterContrat } = useContrats();
  captures.ajouterContrat = ajouterContrat;
  captures.ajouterProfil = ajouterProfil;
  return <Screen />;
}

export const renderEcranMensuel = async (Screen: ComponentType) => {
  const result = render(
    <ProfilsProvider>
      <EmployeursProvider>
        <ContratsProvider>
          <FormationsProvider>
            <EnseignementsProvider>
              <Setup Screen={Screen} />
            </EnseignementsProvider>
          </FormationsProvider>
        </ContratsProvider>
      </EmployeursProvider>
    </ProfilsProvider>
  );
  await flushAsync();
  return result;
};

export const fixerDateStep = (given: (pattern: RegExp, fn: (date: string) => void) => void) => {
  given(/^nous sommes le "(.*)"$/, (date: string) => {
    fixerDate(date);
  });
};

export const unProfilExiste = async () => {
  act(() => {
    captures.ajouterProfil!({
      nom: "Test",
      annexe: "8",
      aOuvertDroits: false,
      tauxCSG: "standard",
      alsaceMoselle: false,
    });
  });
  await flushAsync();
};

export const configurerProfil = async (row: ProfilRow) => {
  act(() => {
    captures.ajouterProfil!({
      nom: "Test",
      annexe: row.Annexe as "8" | "10",
      aOuvertDroits: true,
      heuresTravaillees: Number(row.Heures),
      salaireReference: Number(row.Salaire),
      dateAnniversaire: row["Date anniversaire"],
      tauxCSG: "standard",
      alsaceMoselle: false,
    });
  });
  await flushAsync();
};

export const ajouterContrats = (table: ContratRow[]) => {
  table.forEach((row) => {
    act(() => {
      captures.ajouterContrat!({
        employeur: row.Employeur,
        dateDebut: row["Début"],
        dateFin: row.Fin,
        heures: Number(row.Heures),
        salaireBrut: Number(row.Salaire),
      });
    });
  });
};
