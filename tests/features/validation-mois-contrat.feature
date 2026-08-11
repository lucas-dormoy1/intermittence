Feature: Validation du mois d'un contrat

  Background:
    Given nous sommes le "15/06/2026"

  Scenario: Dates dans le même mois sont acceptées
    And le formulaire de saisie est ouvert
    When je remplis le formulaire avec les données suivantes
      | Employeur | Début      | Fin        | Heures | Salaire |
      | Théâtre   | 01/06/2026 | 15/06/2026 | 40     | 2000    |
    And j'appuie sur "Ajouter"
    Then le contrat "Théâtre" apparaît dans la liste

  Scenario: Dates sur deux mois différents affichent une erreur
    And le formulaire de saisie est ouvert
    When je remplis le formulaire avec les données suivantes
      | Employeur | Début      | Fin        | Heures | Salaire |
      | Théâtre   | 15/06/2026 | 05/07/2026 | 40     | 2000    |
    And j'appuie sur "Ajouter"
    Then le message "Les dates doivent être dans le même mois calendaire." est affiché

  Scenario: Dates sur deux mois différents ne créent pas de contrat
    And le formulaire de saisie est ouvert
    When je remplis le formulaire avec les données suivantes
      | Employeur | Début      | Fin        | Heures | Salaire |
      | Théâtre   | 15/06/2026 | 05/07/2026 | 40     | 2000    |
    And j'appuie sur "Ajouter"
    And j'annule la saisie
    Then aucun contrat n'est ajouté
