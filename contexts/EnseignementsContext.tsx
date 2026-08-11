import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { Enseignement } from "../types/enseignement";
import { chargerParCle, sauvegarderParCle, cleProfilData } from "../utils/storage";
import { useProfils } from "./ProfilsContext";
import { parseDate } from "../utils/date";

interface EnseignementsContextType {
  enseignements: Enseignement[];
  chargementTermine: boolean;
  ajouterEnseignement: (enseignement: Omit<Enseignement, "id">) => void;
  modifierEnseignement: (id: string, enseignement: Omit<Enseignement, "id">) => void;
  supprimerEnseignement: (id: string) => void;
  reinitialiserEnseignements: (enseignements: Omit<Enseignement, "id">[]) => void;
}

const EnseignementsContext = createContext<EnseignementsContextType | null>(null);

function trierParDate(enseignements: Enseignement[]): Enseignement[] {
  return [...enseignements].sort(
    (a, b) => (parseDate(a.dateDebut)?.getTime() ?? 0) - (parseDate(b.dateDebut)?.getTime() ?? 0)
  );
}

function maxId(enseignements: Enseignement[]): number {
  if (enseignements.length === 0) return 0;
  return Math.max(...enseignements.map((e) => Number(e.id) || 0));
}

export function EnseignementsProvider({ children }: { children: ReactNode }) {
  const { profilActifId, versionDonneesExternes } = useProfils();
  const [enseignements, setEnseignements] = useState<Enseignement[]>([]);
  const [chargementTermine, setChargementTermine] = useState(false);
  const nextId = useRef(1);
  const profilActifIdRef = useRef(profilActifId);
  profilActifIdRef.current = profilActifId;

  useEffect(() => {
    if (!profilActifId) {
      setEnseignements([]);
      nextId.current = 1;
      setChargementTermine(true);
      return;
    }

    let ignore = false;
    setChargementTermine(false);
    setEnseignements([]);
    nextId.current = 1;

    chargerParCle<Enseignement[]>(cleProfilData(profilActifId, "enseignements")).then((donnees) => {
      if (ignore) return;
      if (donnees && donnees.length > 0) {
        setEnseignements(trierParDate(donnees));
        nextId.current = maxId(donnees) + 1;
      }
      setChargementTermine(true);
    }).catch(() => {
      if (!ignore) setChargementTermine(true);
    });

    return () => { ignore = true; };
  }, [profilActifId, versionDonneesExternes]);

  const persister = useCallback((nouveauxEnseignements: Enseignement[]) => {
    const id = profilActifIdRef.current;
    if (id) sauvegarderParCle(cleProfilData(id, "enseignements"), nouveauxEnseignements);
  }, []);

  const ajouterEnseignement = useCallback((enseignementSansId: Omit<Enseignement, "id">) => {
    const nouveau: Enseignement = {
      ...enseignementSansId,
      id: String(nextId.current++),
    };
    setEnseignements((prev) => {
      const maj = trierParDate([...prev, nouveau]);
      persister(maj);
      return maj;
    });
  }, [persister]);

  const modifierEnseignement = useCallback((id: string, enseignementSansId: Omit<Enseignement, "id">) => {
    setEnseignements((prev) => {
      const maj = trierParDate(
        prev.map((e) => (e.id === id ? { ...enseignementSansId, id } : e))
      );
      persister(maj);
      return maj;
    });
  }, [persister]);

  const supprimerEnseignement = useCallback((id: string) => {
    setEnseignements((prev) => {
      const maj = prev.filter((e) => e.id !== id);
      persister(maj);
      return maj;
    });
  }, [persister]);

  const reinitialiserEnseignements = useCallback((nouveauxEnseignements: Omit<Enseignement, "id">[]) => {
    nextId.current = 1;
    const avecIds = nouveauxEnseignements.map((e) => ({ ...e, id: String(nextId.current++) }));
    const maj = trierParDate(avecIds);
    setEnseignements(maj);
    persister(maj);
  }, [persister]);

  return (
    <EnseignementsContext.Provider
      value={{ enseignements, chargementTermine, ajouterEnseignement, modifierEnseignement, supprimerEnseignement, reinitialiserEnseignements }}
    >
      {children}
    </EnseignementsContext.Provider>
  );
}

export function useEnseignements() {
  const context = useContext(EnseignementsContext);
  if (!context) {
    throw new Error("useEnseignements doit être utilisé dans un EnseignementsProvider");
  }
  return context;
}
