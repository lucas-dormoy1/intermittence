# Intermittence - Simulateur ARE Spectacle

## Objectif du projet
Application mobile (Android + iOS) permettant aux intermittents du spectacle en France de :
- Saisir leurs contrats (dates, chiffre d'affaire)
- Simuler le montant de leur ARE (Aide au Retour à l'Emploi)
- Prévoir à l'avance leurs droits

## Objectif pédagogique
Ce projet sert aussi de formation à React Native / Expo pour l'utilisateur.
**À chaque étape** : expliquer clairement ce qu'on fait et pourquoi, pour que l'utilisateur apprenne et retienne.

## Stack technique
- **Framework** : Expo SDK 54 (React Native)
- **Langage** : TypeScript
- **Navigation** : Expo Router (file-based routing avec onglets)
- **State management** : React Context (Contrats, Formations, Enseignements, Employeurs, Profils, GoogleAuth)
- **Tests** : Jest + jest-expo + React Native Testing Library + jest-cucumber (Gherkin)
- **État du projet** : Formulaire de contrats + dashboard + multi-profils + sauvegarde Google Drive fonctionnels

## Git
- Remote : git@github-perso:lucas-dormoy1/intermittence.git
- Identité : lucas-dormoy1 <luludorm@gmail.com>
- Branche principale : main
- **Conventional commits** (feat:, fix:, refactor:, docs:, chore:, etc.)

## Architecture
```
app/                    ← Dossier des routes (Expo Router) — PAS de fichiers non-route ici
├── _layout.tsx         ← Layout racine (Stack global)
├── (tabs)/             ← Groupe d'onglets
│   ├── _layout.tsx     ← Config des onglets (barre du bas)
│   ├── index.tsx           ← Onglet Accueil (dashboard)
│   ├── contrats.tsx        ← Onglet Contrats (saisie)
│   └── vue-mensuelle.tsx   ← Onglet Vue mensuelle (récap heures/salaire/contrats sur 12 mois glissants se terminant au mois courant, indépendant du profil/droits ARE)
├── simulation-are.tsx      ← Simulation ARE 12 mois depuis la date anniversaire (Stack, accessible depuis le dashboard si droits ouverts)
└── mois/                   ← Écran de détail (Stack, hors tabs)
    └── [moisIndex].tsx     ← Détail swipeable d'un mois d'indemnisation (alimenté par simulation-are)
styles/                 ← Styles séparés (hors app/ pour éviter conflits Expo Router)
├── root-layout.styles.ts  ← Styles du layout racine
├── tabs/
│   ├── layout.styles.ts       ← Styles du tab bar
│   ├── index.styles.ts        ← Styles de l'accueil
│   ├── contrats.styles.ts     ← Styles des contrats
│   └── vue-mensuelle.styles.ts ← Styles partagées par l'onglet Vue mensuelle et simulation-are.tsx
└── mois/
    └── moisIndex.styles.ts    ← Styles du détail d'un mois
theme/
├── colors.ts           ← Tokens de couleurs partagés (source de vérité)
├── fonts.ts            ← Tokens de polices partagés (source de vérité)
└── webStyles.ts        ← Styles web partagés (React.CSSProperties)
types/contrat.ts            ← Interface TypeScript du contrat
types/profil.ts             ← Interface TypeScript du profil intermittent
contexts/ContratsContext.tsx ← Contrats scopés par profil actif
contexts/ProfilsContext.tsx  ← Gestion multi-profils (profils, profilActif, CRUD, export/import, sauvegarde Drive)
contexts/FormationsContext.tsx ← Formations scopées par profil actif
contexts/EnseignementsContext.tsx ← Enseignements scopés par profil actif
contexts/EmployeursContext.tsx ← Liste des employeurs (autocomplétion contrats)
contexts/GoogleAuthContext.tsx ← OAuth PKCE Google (connexion, tokens, refresh)
utils/donneesTest.ts            ← Données de démo (profils, contrats, formations, enseignements)
utils/calculerAJ.ts         ← Calcul de l'indemnité journalière
utils/calculerIndemnisationMensuelle.ts ← Calcul des 12 mois de la période d'indemnisation (simulation ARE)
utils/calculerRecapAnnuel.ts ← Récap heures/salaire/contrats sur 12 mois glissants depuis aujourd'hui (onglet Vue mensuelle)
utils/storage.ts            ← Helpers AsyncStorage (par clé globale et par profil)
utils/googleDrive.ts         ← Appels REST API Google Drive (dossier, fichiers, appProperties)
utils/alerte.ts              ← Alerte cross-plateforme : Alert.alert natif, window.alert web (react-native-web n'implémente pas Alert.alert)
docs/                   ← Documentation du projet
├── tech/               ← Fiches pédagogiques React Native / Expo
└── metier/             ← Fiches règles métier ARE intermittents + guide officiel PDF
tests/                  ← Tests
├── features/           ← Fichiers Gherkin (.feature)
├── steps/              ← Step definitions Jest/Cucumber (.steps.tsx)
└── unit/               ← Tests unitaires logique métier (.test.ts)
jest.config.js          ← Configuration Jest
app.json                ← Configuration Expo
assets/                 ← Images et ressources
```

## Secrets
- Identifiants OAuth Google (Web/Android) dans `.env.local` (gitignored, jamais commité), variables `EXPO_PUBLIC_GOOGLE_*` — voir `.env.example` pour la liste et `docs/tech/04-oauth-google-drive.md` pour le détail
- Source de vérité de ces identifiants : EAS Environment Variables (projet `@skaa14/intermittence`), pas le poste local. Pour les récupérer sur une nouvelle machine : `npx eas login` puis `npm run env:pull` (régénère `.env.local`). Voir section "Configuration Google Drive" du `README.md`
- Ne jamais mettre de vraie valeur de secret dans `app.json`/`extra` — ce fichier est commité

## Lecture de fichiers PDF
- Utiliser le **Read tool sans paramètre `pages`** : `Read("chemin/fichier.pdf")` (sans spécifier de pages)
- Ne PAS utiliser `pages:` ni Bash/Python — `pdftoppm` n'est pas installé sur cette machine
- Cette méthode fonctionne et retourne le contenu complet du PDF page par page

## Règles de développement
- **Pas de commentaires explicatifs dans le code** — les explications de concepts vont dans des fiches Markdown dans `docs/`
- Garder le code simple et lisible
- Mettre à jour ce fichier à chaque étape
- L'utilisateur connaît TypeScript, ne pas expliquer les bases TS
- **Toujours lancer les tests** (`npm test`) après une modification qui peut les impacter
- **Toujours écrire des tests** pour chaque feature ou fix
- **Tests UI** (Gherkin + step definitions dans `tests/steps/`) pour les écrans et interactions utilisateur
- **Tests unitaires** (`tests/unit/*.test.ts`) pour la logique métier pure (calculs ARE, filtrage contrats, franchises, etc.) — fonctions dans `utils/` qui ne dépendent pas de React
- **Avant d'écrire des tests** : charger le skill `/test` pour connaître les conventions, patterns et mocks du projet

## Conventions de style
- **Zéro couleur hex en dur** dans les fichiers `.tsx` ou `.styles.ts` — toujours passer par `theme/colors.ts`
- **Styles séparés** : chaque écran a son fichier `.styles.ts` dans `styles/` (pas dans `app/` — Expo Router traite tout fichier `.ts` dans `app/` comme une route), qui exporte `styles` (et éventuellement des constantes associées). Exception assumée : `styles/tabs/vue-mensuelle.styles.ts` est partagé entre l'onglet Vue mensuelle et `app/simulation-are.tsx`, deux écrans avec des cartes visuellement identiques
- **Styles web** (`React.CSSProperties`) : utiliser `webDateInputBase` depuis `theme/webStyles.ts` comme base, étendre avec les propriétés spécifiques
- Les fichiers `.tsx` n'importent que `{ styles }` depuis leur `.styles.ts` — pas de `StyleSheet` ni de couleurs directement dans le JSX
