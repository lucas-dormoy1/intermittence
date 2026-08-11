Feature: Simulation ARE (12 mois)

  Background:
    Given nous sommes le "15/06/2026"

  Scenario: Profil non configuré - invitation à configurer
    Given le profil n'est pas configuré
    Then le message d'invitation à configurer le profil est visible

  Scenario: Profil sans droits ARE - invitation à ouvrir ses droits
    Given le profil est configuré sans droits ARE
      | Nom  | Annexe |
      | Test | 8      |
    Then le message d'invitation à ouvrir ses droits est visible

  Scenario: 12 cartes affichées avec profil configuré
    Given le profil est configuré
      | Nom  | Annexe | Heures | Salaire | Date anniversaire |
      | Test | 8      | 507    | 13800   | 01/04/2026        |
    Then 12 cartes de mois sont affichées

  Scenario: Heures travaillées affichées sur la carte d'un mois avec contrat
    Given le profil est configuré
      | Nom  | Annexe | Heures | Salaire | Date anniversaire |
      | Test | 8      | 507    | 13800   | 01/04/2026        |
    And ces contrats existent
      | Employeur | Début      | Fin        | Heures | Salaire |
      | Théâtre   | 01/04/2026 | 30/04/2026 | 40     | 1500    |
    Then la carte du mois 0 affiche "40 h"
    And la carte du mois 0 affiche "0 j" pour les jours de formation

  Scenario: Jours indemnisés affichés sur la carte
    Given le profil est configuré
      | Nom  | Annexe | Heures | Salaire | Date anniversaire |
      | Test | 8      | 507    | 13800   | 01/04/2026        |
    Then la carte du mois 1 affiche les jours indemnisés

  Scenario: Navigation vers le détail d'un mois
    Given le profil est configuré
      | Nom  | Annexe | Heures | Salaire | Date anniversaire |
      | Test | 8      | 507    | 13800   | 01/04/2026        |
    When je tape sur la carte du mois 1
    Then je suis redirigé vers "/mois/1"
