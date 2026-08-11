import { renderHook, act, waitFor } from "@testing-library/react-native";
import { createElement, ReactNode } from "react";
import { ProfilsProvider, useProfils } from "../../contexts/ProfilsContext";
import { EmployeursProvider } from "../../contexts/EmployeursContext";
import { ContratsProvider, useContrats } from "../../contexts/ContratsContext";

const mockTrouverOuCreerDossier = jest.fn();
const mockTrouverFichierProfil = jest.fn();
const mockTelechargerFichier = jest.fn();

jest.mock("../../utils/googleDrive", () => ({
  trouverOuCreerDossier: (...args: unknown[]) => mockTrouverOuCreerDossier(...args),
  trouverFichierProfil: (...args: unknown[]) => mockTrouverFichierProfil(...args),
  telechargerFichier: (...args: unknown[]) => mockTelechargerFichier(...args),
  televerserFichier: jest.fn(),
}));

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(
    ProfilsProvider,
    null,
    createElement(EmployeursProvider, null, createElement(ContratsProvider, null, children))
  );

function renderContexteComplet() {
  return renderHook(() => ({ profils: useProfils(), contrats: useContrats() }), { wrapper });
}

const profilSanId = {
  nom: "Artiste",
  annexe: "10" as const,
  aOuvertDroits: true,
  dateAnniversaire: "15/09/2026",
  salaireReference: 16200,
  heuresTravaillees: 545,
  tauxCSG: "standard" as const,
  alsaceMoselle: false,
};

describe("Rafraîchissement de ContratsContext après une restauration Drive", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("recharge les contrats du profil actif après restaurerProfilDepuisDrive, sans changement de profilActifId", async () => {
    const { result } = renderContexteComplet();
    await waitFor(() => expect(result.current.profils.chargementTermine).toBe(true));

    act(() => result.current.profils.ajouterProfil(profilSanId));
    const id = result.current.profils.profils[0].id;

    await waitFor(() => expect(result.current.contrats.chargementTermine).toBe(true));

    act(() => {
      result.current.contrats.ajouterContrat({
        employeur: "Ancien Théâtre",
        dateDebut: "01/01/2026",
        dateFin: "31/01/2026",
        heures: 40,
        salaireBrut: 1500,
      });
    });
    expect(result.current.contrats.contrats).toHaveLength(1);

    mockTrouverOuCreerDossier.mockResolvedValue("dossier-1");
    mockTrouverFichierProfil.mockResolvedValue("fichier-1");
    mockTelechargerFichier.mockResolvedValue(
      JSON.stringify({
        version: "1.0",
        profil: { ...profilSanId, id },
        contrats: [
          { id: "c-drive", employeur: "Depuis Drive", dateDebut: "01/02/2026", dateFin: "28/02/2026", heures: 40, salaireBrut: 1600 },
        ],
        formations: [],
        enseignements: [],
      })
    );

    await act(() => result.current.profils.restaurerProfilDepuisDrive(id, "token-fake"));

    await waitFor(() => {
      expect(result.current.contrats.contrats).toHaveLength(1);
      expect(result.current.contrats.contrats[0].employeur).toBe("Depuis Drive");
    });
  });
});
