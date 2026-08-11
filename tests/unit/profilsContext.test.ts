import { renderHook, act, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createElement, ReactNode } from "react";
import { ProfilsProvider, useProfils } from "../../contexts/ProfilsContext";
import { ProfilIntermittent } from "../../types/profil";
import { cleProfilData, cleBackupRestauration } from "../../utils/storage";

const mockTrouverOuCreerDossier = jest.fn();
const mockTrouverFichierProfil = jest.fn();
const mockTelechargerFichier = jest.fn();
const mockTeleverserFichier = jest.fn();
const mockListerSauvegardes = jest.fn();

jest.mock("../../utils/googleDrive", () => ({
  trouverOuCreerDossier: (...args: unknown[]) => mockTrouverOuCreerDossier(...args),
  trouverFichierProfil: (...args: unknown[]) => mockTrouverFichierProfil(...args),
  telechargerFichier: (...args: unknown[]) => mockTelechargerFichier(...args),
  televerserFichier: (...args: unknown[]) => mockTeleverserFichier(...args),
  listerSauvegardes: (...args: unknown[]) => mockListerSauvegardes(...args),
}));

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(ProfilsProvider, null, children);

function renderProfils() {
  return renderHook(() => useProfils(), { wrapper });
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

describe("ProfilsContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("démarre vide et chargé", async () => {
    const { result } = renderProfils();
    await waitFor(() => expect(result.current.chargementTermine).toBe(true));
    expect(result.current.profils).toEqual([]);
    expect(result.current.profilActif).toBeNull();
  });

  it("ajoute un profil et le rend actif", async () => {
    const { result } = renderProfils();
    await waitFor(() => expect(result.current.chargementTermine).toBe(true));

    act(() => result.current.ajouterProfil(profilSanId));

    expect(result.current.profils).toHaveLength(1);
    expect(result.current.profils[0].nom).toBe("Artiste");
    expect(result.current.profils[0].id).toBeDefined();
    expect(result.current.profilActif?.nom).toBe("Artiste");
  });

  it("modifie un profil existant", async () => {
    const { result } = renderProfils();
    await waitFor(() => expect(result.current.chargementTermine).toBe(true));

    act(() => result.current.ajouterProfil(profilSanId));
    const id = result.current.profils[0].id;

    act(() => result.current.modifierProfil(id, { ...profilSanId, nom: "Technicien", annexe: "8" }));

    expect(result.current.profils[0].nom).toBe("Technicien");
    expect(result.current.profils[0].annexe).toBe("8");
    expect(result.current.profils[0].id).toBe(id);
  });

  it("supprime un profil et ses données scopées", async () => {
    const { result } = renderProfils();
    await waitFor(() => expect(result.current.chargementTermine).toBe(true));

    act(() => result.current.ajouterProfil(profilSanId));
    const id = result.current.profils[0].id;

    await AsyncStorage.setItem(cleProfilData(id, "contrats"), JSON.stringify([]));
    await AsyncStorage.setItem(cleProfilData(id, "formations"), JSON.stringify([]));
    await AsyncStorage.setItem(cleBackupRestauration(id), JSON.stringify({ profil: profilSanId }));

    act(() => result.current.supprimerProfil(id));

    expect(result.current.profils).toHaveLength(0);
    const contrats = await AsyncStorage.getItem(cleProfilData(id, "contrats"));
    expect(contrats).toBeNull();
    const backup = await AsyncStorage.getItem(cleBackupRestauration(id));
    expect(backup).toBeNull();
  });

  it("switch le profil actif vers un autre après suppression", async () => {
    const { result } = renderProfils();
    await waitFor(() => expect(result.current.chargementTermine).toBe(true));

    act(() => result.current.ajouterProfil(profilSanId));
    act(() => result.current.ajouterProfil({ ...profilSanId, nom: "Technicien" }));

    const idPremier = result.current.profils[0].id;
    const idSecond = result.current.profils[1].id;

    expect(result.current.profilActifId).toBe(idSecond);

    act(() => result.current.changerProfilActif(idPremier));
    expect(result.current.profilActifId).toBe(idPremier);

    act(() => result.current.supprimerProfil(idPremier));

    await waitFor(() => {
      expect(result.current.profils).toHaveLength(1);
      expect(result.current.profilActif?.nom).toBe("Technicien");
    });
  });

  it("duplique un profil avec ses données scopées", async () => {
    const { result } = renderProfils();
    await waitFor(() => expect(result.current.chargementTermine).toBe(true));

    act(() => result.current.ajouterProfil(profilSanId));
    const idSource = result.current.profils[0].id;

    const contratsSource = [{ id: "c1", employeur: "Test" }];
    await AsyncStorage.setItem(
      cleProfilData(idSource, "contrats"),
      JSON.stringify(contratsSource)
    );

    await act(() => result.current.dupliquerProfil(idSource, "Copie Artiste"));

    expect(result.current.profils).toHaveLength(2);
    const copie = result.current.profils[1];
    expect(copie.nom).toBe("Copie Artiste");
    expect(copie.id).not.toBe(idSource);
    expect(copie.annexe).toBe("10");

    const contratsCopie = await AsyncStorage.getItem(cleProfilData(copie.id, "contrats"));
    expect(JSON.parse(contratsCopie!)).toEqual(contratsSource);
  });

  it("change le profil actif", async () => {
    const { result } = renderProfils();
    await waitFor(() => expect(result.current.chargementTermine).toBe(true));

    act(() => result.current.ajouterProfil(profilSanId));
    act(() => result.current.ajouterProfil({ ...profilSanId, nom: "Technicien" }));

    const idPremier = result.current.profils[0].id;

    act(() => result.current.changerProfilActif(idPremier));

    expect(result.current.profilActifId).toBe(idPremier);
    expect(result.current.profilActif?.nom).toBe("Artiste");
  });

  it("persiste et restaure depuis le storage", async () => {
    const { result, unmount } = renderProfils();
    await waitFor(() => expect(result.current.chargementTermine).toBe(true));

    act(() => result.current.ajouterProfil(profilSanId));
    const id = result.current.profils[0].id;

    unmount();

    const { result: result2 } = renderProfils();
    await waitFor(() => expect(result2.current.chargementTermine).toBe(true));

    expect(result2.current.profils).toHaveLength(1);
    expect(result2.current.profils[0].id).toBe(id);
    expect(result2.current.profilActifId).toBe(id);
  });

  it("restaure depuis le Drive en écrasant en place un profil local existant", async () => {
    const { result } = renderProfils();
    await waitFor(() => expect(result.current.chargementTermine).toBe(true));

    act(() => result.current.ajouterProfil(profilSanId));
    const id = result.current.profils[0].id;

    mockTrouverOuCreerDossier.mockResolvedValue("dossier-1");
    mockTrouverFichierProfil.mockResolvedValue("fichier-1");
    mockTelechargerFichier.mockResolvedValue(
      JSON.stringify({
        version: "1.0",
        profil: { ...profilSanId, id, nom: "Artiste (Drive)" },
        contrats: [{ id: "c1", employeur: "Depuis Drive" }],
        formations: [],
        enseignements: [],
      })
    );

    await act(() => result.current.restaurerProfilDepuisDrive(id, "token-fake"));

    expect(result.current.profils).toHaveLength(1);
    expect(result.current.profils[0].id).toBe(id);
    expect(result.current.profils[0].nom).toBe("Artiste (Drive)");

    const contrats = await AsyncStorage.getItem(cleProfilData(id, "contrats"));
    expect(JSON.parse(contrats!)).toEqual([{ id: "c1", employeur: "Depuis Drive" }]);
  });

  it("restaure depuis le Drive en créant le profil avec le même id s'il n'existe pas localement", async () => {
    const { result } = renderProfils();
    await waitFor(() => expect(result.current.chargementTermine).toBe(true));

    mockTrouverOuCreerDossier.mockResolvedValue("dossier-1");
    mockTrouverFichierProfil.mockResolvedValue("fichier-1");
    mockTelechargerFichier.mockResolvedValue(
      JSON.stringify({
        version: "1.0",
        profil: { ...profilSanId, id: "id-venu-du-drive" },
        contrats: [],
        formations: [],
        enseignements: [],
      })
    );

    await act(() => result.current.restaurerProfilDepuisDrive("id-venu-du-drive", "token-fake"));

    expect(result.current.profils).toHaveLength(1);
    expect(result.current.profils[0].id).toBe("id-venu-du-drive");
  });

  it("sauvegarde un backup local avant restauration et permet de l'annuler", async () => {
    const { result } = renderProfils();
    await waitFor(() => expect(result.current.chargementTermine).toBe(true));

    act(() => result.current.ajouterProfil(profilSanId));
    const id = result.current.profils[0].id;

    await AsyncStorage.setItem(
      cleProfilData(id, "contrats"),
      JSON.stringify([{ id: "c-local", employeur: "Local" }])
    );
    await AsyncStorage.setItem(
      cleProfilData(id, "formations"),
      JSON.stringify([{ id: "f-local", option: "garderARE" }])
    );
    await AsyncStorage.setItem(
      cleProfilData(id, "enseignements"),
      JSON.stringify([{ id: "e-local", heures: 10 }])
    );

    mockTrouverOuCreerDossier.mockResolvedValue("dossier-1");
    mockTrouverFichierProfil.mockResolvedValue("fichier-1");
    mockTelechargerFichier.mockResolvedValue(
      JSON.stringify({
        version: "1.0",
        profil: { ...profilSanId, id, nom: "Artiste (Drive)" },
        contrats: [{ id: "c-drive", employeur: "Depuis Drive" }],
        formations: [{ id: "f-drive", option: "reprendreTravail" }],
        enseignements: [],
      })
    );

    await act(() => result.current.restaurerProfilDepuisDrive(id, "token-fake"));
    expect(result.current.profils[0].nom).toBe("Artiste (Drive)");

    await act(() => result.current.annulerDerniereRestauration(id));

    expect(result.current.profils[0].nom).toBe("Artiste");
    const contrats = await AsyncStorage.getItem(cleProfilData(id, "contrats"));
    expect(JSON.parse(contrats!)).toEqual([{ id: "c-local", employeur: "Local" }]);
    const formations = await AsyncStorage.getItem(cleProfilData(id, "formations"));
    expect(JSON.parse(formations!)).toEqual([{ id: "f-local", option: "garderARE" }]);
    const enseignements = await AsyncStorage.getItem(cleProfilData(id, "enseignements"));
    expect(JSON.parse(enseignements!)).toEqual([{ id: "e-local", heures: 10 }]);
    const backup = await AsyncStorage.getItem(cleBackupRestauration(id));
    expect(backup).toBeNull();
  });

  it("n'annule rien si aucune restauration n'a eu lieu pour ce profil", async () => {
    const { result } = renderProfils();
    await waitFor(() => expect(result.current.chargementTermine).toBe(true));

    act(() => result.current.ajouterProfil(profilSanId));
    const id = result.current.profils[0].id;

    await act(() => result.current.annulerDerniereRestauration(id));

    expect(result.current.profils[0].nom).toBe("Artiste");
  });

  it("refuse une restauration sans sauvegarde correspondante sur le Drive", async () => {
    const { result } = renderProfils();
    await waitFor(() => expect(result.current.chargementTermine).toBe(true));

    act(() => result.current.ajouterProfil(profilSanId));
    const id = result.current.profils[0].id;

    mockTrouverOuCreerDossier.mockResolvedValue("dossier-1");
    mockTrouverFichierProfil.mockResolvedValue(null);

    await act(() => result.current.restaurerProfilDepuisDrive(id, "token-fake"));

    expect(mockTelechargerFichier).not.toHaveBeenCalled();
    expect(result.current.profils[0].nom).toBe("Artiste");
  });

  it("sauvegarde un profil sur le Drive en réutilisant le fichier existant s'il y en a un", async () => {
    const { result } = renderProfils();
    await waitFor(() => expect(result.current.chargementTermine).toBe(true));

    act(() => result.current.ajouterProfil(profilSanId));
    const id = result.current.profils[0].id;

    mockTrouverOuCreerDossier.mockResolvedValue("dossier-1");
    mockTrouverFichierProfil.mockResolvedValue("fichier-existant");
    mockTeleverserFichier.mockResolvedValue("fichier-existant");

    await act(() => result.current.sauvegarderProfilSurDrive(id, "token-fake"));

    expect(mockTeleverserFichier).toHaveBeenCalledWith(
      "token-fake",
      "dossier-1",
      id,
      "Artiste.json",
      expect.any(String),
      "fichier-existant"
    );
  });

  it("liste les sauvegardes disponibles sur le Drive pour le compte connecté", async () => {
    const { result } = renderProfils();
    await waitFor(() => expect(result.current.chargementTermine).toBe(true));

    mockTrouverOuCreerDossier.mockResolvedValue("dossier-1");
    mockListerSauvegardes.mockResolvedValue([
      { profilId: "profil-a", nom: "Artiste.json" },
      { profilId: "profil-b", nom: "Technicien.json" },
    ]);

    const liste = await result.current.listerSauvegardesDrive("token-fake");

    expect(mockListerSauvegardes).toHaveBeenCalledWith("token-fake", "dossier-1");
    expect(liste).toEqual([
      { profilId: "profil-a", nom: "Artiste.json" },
      { profilId: "profil-b", nom: "Technicien.json" },
    ]);
  });
});
