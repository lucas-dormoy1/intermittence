import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { Formation } from "../types/formation";
import { chargerParCle, sauvegarderParCle, cleProfilData } from "../utils/storage";
import { useProfils } from "./ProfilsContext";
import { parseDate } from "../utils/date";

interface FormationsContextType {
  formations: Formation[];
  chargementTermine: boolean;
  ajouterFormation: (formation: Omit<Formation, "id">) => void;
  modifierFormation: (id: string, formation: Omit<Formation, "id">) => void;
  supprimerFormation: (id: string) => void;
  reinitialiserFormations: (formations: Omit<Formation, "id">[]) => void;
}

const FormationsContext = createContext<FormationsContextType | null>(null);

function trierParDate(formations: Formation[]): Formation[] {
  return [...formations].sort(
    (a, b) => (parseDate(a.dateDebut)?.getTime() ?? 0) - (parseDate(b.dateDebut)?.getTime() ?? 0)
  );
}

function maxId(formations: Formation[]): number {
  if (formations.length === 0) return 0;
  return Math.max(...formations.map((f) => Number(f.id) || 0));
}

export function FormationsProvider({ children }: { children: ReactNode }) {
  const { profilActifId, versionDonneesExternes } = useProfils();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [chargementTermine, setChargementTermine] = useState(false);
  const nextId = useRef(1);
  const profilActifIdRef = useRef(profilActifId);
  profilActifIdRef.current = profilActifId;

  useEffect(() => {
    if (!profilActifId) {
      setFormations([]);
      nextId.current = 1;
      setChargementTermine(true);
      return;
    }

    let ignore = false;
    setChargementTermine(false);
    setFormations([]);
    nextId.current = 1;

    chargerParCle<Formation[]>(cleProfilData(profilActifId, "formations")).then((donnees) => {
      if (ignore) return;
      if (donnees && donnees.length > 0) {
        setFormations(trierParDate(donnees));
        nextId.current = maxId(donnees) + 1;
      }
      setChargementTermine(true);
    }).catch(() => {
      if (!ignore) setChargementTermine(true);
    });

    return () => { ignore = true; };
  }, [profilActifId, versionDonneesExternes]);

  const persister = useCallback((nouvellesFormations: Formation[]) => {
    const id = profilActifIdRef.current;
    if (id) sauvegarderParCle(cleProfilData(id, "formations"), nouvellesFormations);
  }, []);

  const ajouterFormation = useCallback((formationSansId: Omit<Formation, "id">) => {
    const nouvelle: Formation = {
      ...formationSansId,
      id: String(nextId.current++),
    };
    setFormations((prev) => {
      const maj = trierParDate([...prev, nouvelle]);
      persister(maj);
      return maj;
    });
  }, [persister]);

  const modifierFormation = useCallback((id: string, formationSansId: Omit<Formation, "id">) => {
    setFormations((prev) => {
      const maj = trierParDate(
        prev.map((f) => (f.id === id ? { ...formationSansId, id } : f))
      );
      persister(maj);
      return maj;
    });
  }, [persister]);

  const supprimerFormation = useCallback((id: string) => {
    setFormations((prev) => {
      const maj = prev.filter((f) => f.id !== id);
      persister(maj);
      return maj;
    });
  }, [persister]);

  const reinitialiserFormations = useCallback((nouvellesFormations: Omit<Formation, "id">[]) => {
    nextId.current = 1;
    const avecIds = nouvellesFormations.map((f) => ({ ...f, id: String(nextId.current++) }));
    const maj = trierParDate(avecIds);
    setFormations(maj);
    persister(maj);
  }, [persister]);

  return (
    <FormationsContext.Provider
      value={{ formations, chargementTermine, ajouterFormation, modifierFormation, supprimerFormation, reinitialiserFormations }}
    >
      {children}
    </FormationsContext.Provider>
  );
}

export function useFormations() {
  const context = useContext(FormationsContext);
  if (!context) {
    throw new Error("useFormations doit être utilisé dans un FormationsProvider");
  }
  return context;
}
