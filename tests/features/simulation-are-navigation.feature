Feature: Navigation vers la simulation ARE

  Scenario: Le bouton de simulation ARE apparaît quand un profil est configuré
    Given un profil est configuré
      | Nom  | Annexe | Heures | Salaire | Date anniversaire |
      | Test | 8      | 600    | 18000   | 15/09/2026        |
    When l'écran d'accueil est affiché
    Then le bouton "Voir la simulation ARE (12 mois)" est visible

  Scenario: Le bouton de simulation ARE navigue vers la page de simulation
    Given un profil est configuré
      | Nom  | Annexe | Heures | Salaire | Date anniversaire |
      | Test | 8      | 600    | 18000   | 15/09/2026        |
    When l'écran d'accueil est affiché
    And j'appuie sur le bouton de simulation ARE
    Then la navigation vers "/simulation-are" est déclenchée
