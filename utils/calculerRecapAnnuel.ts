import { Contrat } from "../types/contrat";
import { parseDate } from "./date";

export interface RecapMois {
  index: number;
  mois: Date;
  heures: number;
  salaire: number;
  nombreContrats: number;
  enCours: boolean;
}

export function calculerRecapAnnuel(
  contrats: Contrat[],
  aujourdhui: Date = new Date()
): RecapMois[] {
  const moisCourant = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);

  return Array.from({ length: 12 }, (_, i) => {
    const mois = new Date(moisCourant.getFullYear(), moisCourant.getMonth() - i, 1);
    const contratsDuMois = contrats.filter((c) => {
      const debut = parseDate(c.dateDebut);
      return debut && debut.getFullYear() === mois.getFullYear() && debut.getMonth() === mois.getMonth();
    });

    return {
      index: i,
      mois,
      heures: contratsDuMois.reduce((s, c) => s + c.heures, 0),
      salaire: contratsDuMois.reduce((s, c) => s + c.salaireBrut, 0),
      nombreContrats: contratsDuMois.length,
      enCours: i === 0,
    };
  });
}
