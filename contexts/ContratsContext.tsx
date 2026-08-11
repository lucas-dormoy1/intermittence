import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { Contrat } from "../types/contrat";
import { chargerParCle, sauvegarderParCle, cleProfilData } from "../utils/storage";
import { useProfils } from "./ProfilsContext";
import { useEmployeurs } from "./EmployeursContext";

interface ContratsContextType {
  contrats: Contrat[];
  chargementTermine: boolean;
  ajouterContrat: (contrat: Omit<Contrat, "id">) => void;
  modifierContrat: (id: string, contrat: Omit<Contrat, "id">) => void;
  supprimerContrat: (id: string) => void;
  reinitialiserContrats: (contrats: Omit<Contrat, "id">[]) => void;
}

const ContratsContext = createContext<ContratsContextType | null>(null);

function parseDateFR(date: string): number {
  const parts = date.split("/");
  if (parts.length !== 3) return 0;
  const [jour, mois, annee] = parts;
  const timestamp = new Date(`${annee}-${mois}-${jour}`).getTime();
  return isNaN(timestamp) ? 0 : timestamp;
}

function trierParDate(contrats: Contrat[]): Contrat[] {
  return [...contrats].sort(
    (a, b) => parseDateFR(a.dateDebut) - parseDateFR(b.dateDebut)
  );
}

function maxId(contrats: Contrat[]): number {
  if (contrats.length === 0) return 0;
  return Math.max(...contrats.map((c) => Number(c.id) || 0));
}

export function ContratsProvider({ children }: { children: ReactNode }) {
  const { profilActifId, versionDonneesExternes } = useProfils();
  const { ajouterEmployeur } = useEmployeurs();
  const [contrats, setContrats] = useState<Contrat[]>([]);
  const [chargementTermine, setChargementTermine] = useState(false);
  const nextId = useRef(1);
  const profilActifIdRef = useRef(profilActifId);
  profilActifIdRef.current = profilActifId;

  useEffect(() => {
    if (!profilActifId) {
      setContrats([]);
      nextId.current = 1;
      setChargementTermine(true);
      return;
    }

    let ignore = false;
    setChargementTermine(false);
    setContrats([]);
    nextId.current = 1;

    chargerParCle<Contrat[]>(cleProfilData(profilActifId, "contrats")).then((donnees) => {
      if (ignore) return;
      if (donnees && donnees.length > 0) {
        setContrats(trierParDate(donnees));
        nextId.current = maxId(donnees) + 1;
      }
      setChargementTermine(true);
    }).catch(() => {
      if (!ignore) setChargementTermine(true);
    });

    return () => { ignore = true; };
  }, [profilActifId, versionDonneesExternes]);

  const persister = useCallback((nouveauxContrats: Contrat[]) => {
    const id = profilActifIdRef.current;
    if (id) sauvegarderParCle(cleProfilData(id, "contrats"), nouveauxContrats);
  }, []);

  const ajouterContrat = useCallback((contratSansId: Omit<Contrat, "id">) => {
    ajouterEmployeur(contratSansId.employeur);

    const nouveau: Contrat = {
      ...contratSansId,
      id: String(nextId.current++),
    };
    setContrats((prev) => {
      const maj = trierParDate([...prev, nouveau]);
      persister(maj);
      return maj;
    });
  }, [persister, ajouterEmployeur]);

  const modifierContrat = useCallback((id: string, contratSansId: Omit<Contrat, "id">) => {
    ajouterEmployeur(contratSansId.employeur);

    setContrats((prev) => {
      const maj = trierParDate(
        prev.map((c) => (c.id === id ? { ...contratSansId, id } : c))
      );
      persister(maj);
      return maj;
    });
  }, [persister, ajouterEmployeur]);

  const supprimerContrat = useCallback((id: string) => {
    setContrats((prev) => {
      const maj = prev.filter((c) => c.id !== id);
      persister(maj);
      return maj;
    });
  }, [persister]);

  const reinitialiserContrats = useCallback((nouveauxContrats: Omit<Contrat, "id">[]) => {
    nextId.current = 1;
    const avecIds = nouveauxContrats.map((c) => ({ ...c, id: String(nextId.current++) }));
    const maj = trierParDate(avecIds);
    setContrats(maj);
    persister(maj);
  }, [persister]);

  return (
    <ContratsContext.Provider
      value={{ contrats, chargementTermine, ajouterContrat, modifierContrat, supprimerContrat, reinitialiserContrats }}
    >
      {children}
    </ContratsContext.Provider>
  );
}

export function useContrats() {
  const context = useContext(ContratsContext);
  if (!context) {
    throw new Error("useContrats doit être utilisé dans un ContratsProvider");
  }
  return context;
}
