Feature: Récapitulatif des 12 derniers mois glissants

  Background:
    Given nous sommes le "15/06/2026"
    And un profil existe

  Scenario: Le récap affiche toujours 12 mois glissants
    Then 12 cartes de récap sont affichées

  Scenario: Heures et salaire affichés pour un mois avec contrat
    Given ces contrats existent
      | Employeur | Début      | Fin        | Heures | Salaire |
      | Théâtre   | 10/03/2026 | 20/03/2026 | 40     | 1500    |
    Then la carte du mois 3 affiche "40 h"
    And la carte du mois 3 affiche "1500 €"

  Scenario: Le mois courant est marqué comme en cours
    Then la carte du mois 0 affiche "Juin 2026 (en cours)"
