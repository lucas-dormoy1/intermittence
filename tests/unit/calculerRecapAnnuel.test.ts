import { calculerRecapAnnuel } from "../../utils/calculerRecapAnnuel";
import { contrat } from "../helpers/factories";

describe("calculerRecapAnnuel", () => {
  it("retourne toujours 12 mois glissants se terminant au mois courant", () => {
    const recap = calculerRecapAnnuel([], new Date(2026, 6, 31));

    expect(recap).toHaveLength(12);
    expect(recap[0].mois).toEqual(new Date(2026, 6, 1));
    expect(recap[11].mois).toEqual(new Date(2025, 7, 1));
  });

  it("ne marque que le mois courant comme en cours", () => {
    const recap = calculerRecapAnnuel([], new Date(2026, 6, 31));

    expect(recap.filter((r) => r.enCours)).toHaveLength(1);
    expect(recap[0].enCours).toBe(true);
  });

  it("regroupe les heures, le salaire et le nombre de contrats par mois de début", () => {
    const contrats = [
      contrat({ dateDebut: "10/06/2026", dateFin: "20/06/2026", heures: 40, salaireBrut: 1500 }),
      contrat({ dateDebut: "25/06/2026", dateFin: "02/07/2026", heures: 20, salaireBrut: 800 }),
    ];

    const recap = calculerRecapAnnuel(contrats, new Date(2026, 6, 31));
    const juin = recap.find(
      (r) => r.mois.getMonth() === 5 && r.mois.getFullYear() === 2026
    )!;

    expect(juin.heures).toBe(60);
    expect(juin.salaire).toBe(2300);
    expect(juin.nombreContrats).toBe(2);
  });

  it("ignore les contrats en dehors de la fenêtre de 12 mois glissants", () => {
    const contrats = [
      contrat({ dateDebut: "10/06/2024", dateFin: "20/06/2024", heures: 40, salaireBrut: 1500 }),
    ];

    const recap = calculerRecapAnnuel(contrats, new Date(2026, 6, 31));
    const total = recap.reduce((s, r) => s + r.nombreContrats, 0);

    expect(total).toBe(0);
  });
});
