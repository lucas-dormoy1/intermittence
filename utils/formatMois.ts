const NOMS_MOIS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export function formatMois(date: Date): string {
  return `${NOMS_MOIS[date.getMonth()]} ${date.getFullYear()}`;
}
