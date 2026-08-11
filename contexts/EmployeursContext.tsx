import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { Employeur } from "../types/employeur";

interface EmployeursContextType {
  employeurs: Employeur[];
  ajouterEmployeur: (nom: string) => Promise<void>;
  supprimerEmployeur: (id: string) => Promise<void>;
  chargementTermine: boolean;
}

const EmployeursContext = createContext<EmployeursContextType | undefined>(undefined);

export const EmployeursProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employeurs, setEmployeurs] = useState<Employeur[]>([]);
  const [chargementTermine, setChargementTermine] = useState(false);

  const STORAGE_KEY = "intermittence:employeurs";

  useEffect(() => {
    const chargerEmployeurs = async () => {
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (json) {
          setEmployeurs(JSON.parse(json));
        }
      } catch (e) {
        console.error("Erreur chargement employeurs", e);
      } finally {
        setChargementTermine(true);
      }
    };
    chargerEmployeurs();
  }, []);

  const ajouterEmployeur = useCallback(async (nom: string) => {
    const nomNettoye = nom.trim();
    if (!nomNettoye) return;

    setEmployeurs((prev) => {
      // Éviter les doublons (on compare en minuscules pour être sûr)
      if (prev.some((e) => e.nom.toLowerCase() === nomNettoye.toLowerCase())) {
        return prev;
      }
      const nouveaux = [...prev, { id: Crypto.randomUUID(), nom: nomNettoye }];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nouveaux));
      return nouveaux;
    });
  }, []);

  const supprimerEmployeur = useCallback(async (id: string) => {
    setEmployeurs((prev) => {
      const nouveaux = prev.filter((e) => e.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nouveaux));
      return nouveaux;
    });
  }, []);

  return (
    <EmployeursContext.Provider value={{ employeurs, ajouterEmployeur, supprimerEmployeur, chargementTermine }}>
      {children}
    </EmployeursContext.Provider>
  );
};

export const useEmployeurs = () => {
  const context = useContext(EmployeursContext);
  if (!context) {
    throw new Error("useEmployeurs doit être utilisé au sein de EmployeursProvider");
  }
  return context;
};