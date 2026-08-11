# OAuth Google + API Drive — Sauvegarde cloud par profil

## Le problème
Un profil est stocké en local (AsyncStorage) sur un seul appareil. Pour le retrouver sur un autre appareil (téléphone → PC), il faut un endroit partagé : le Google Drive de l'utilisateur. Mais l'app ne peut pas se connecter à un compte Google sans passer par un vrai flow d'authentification — impossible de juste "appeler l'API avec un mot de passe".

## OAuth 2.0 + PKCE, en résumé
OAuth permet à l'app d'obtenir un accès limité (ici : lire/écrire ses propres fichiers dans le Drive de l'utilisateur, scope `drive.file`) **sans jamais voir le mot de passe Google**. PKCE (Proof Key for Code Exchange) est la variante utilisée pour les apps "publiques" (mobile/web) qui ne peuvent pas garder de secret caché — contrairement à un serveur backend, le code de l'app est visible/inspectable.

Le flow, tel qu'implémenté dans `contexts/GoogleAuthContext.tsx` :

1. **`useAuthRequest`** (`expo-auth-session`) génère un `code_verifier` aléatoire, en dérive un `code_challenge`, et prépare une URL d'autorisation Google.
2. **`promptAsync()`** ouvre un navigateur système vers cette URL. L'utilisateur se connecte et accepte le scope demandé.
3. Google redirige vers `redirectUri` (le scheme custom `intermittence://` sur natif, l'origine web en dev/prod) avec un `code` temporaire.
4. **`exchangeCodeAsync`** échange ce `code` + le `code_verifier` original contre un `accessToken` (courte durée) et un `refreshToken` (longue durée). Le `code_verifier` prouve que c'est bien la même app qui a initié la demande — c'est le "P" de PKCE.
5. L'`accessToken` est utilisé dans l'en-tête `Authorization: Bearer ...` de chaque appel à l'API Drive. Quand il expire, **`refreshAsync`** en obtient un nouveau à partir du `refreshToken`, sans repasser par l'étape navigateur.

## Piège : le client_secret sur web
PKCE existe justement pour éviter un secret partagé — mais Google classe les clients OAuth par **type**, pas par flow utilisé. Un client de type "Application Web" est traité comme confidentiel : Google exige un `client_secret` à l'échange de code et au refresh, même en PKCE. Seuls les clients natifs (Android, iOS, Desktop) en sont dispensés. Sans backend pour le garder caché, ce projet l'embarque directement dans le bundle web, uniquement quand `Platform.OS === "web"` — un compromis acceptable ici vu le scope limité (`drive.file`) et le mode "Testing" restreint à des comptes choisis. La valeur vient de `process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_SECRET`, lu localement depuis `.env.local` (jamais commité — voir le `.env.example` à la racine), et surtout **pas** de `app.json`/`extra`, pour ne pas finir dans l'historique git. La source de vérité de ce fichier n'est pas la machine locale mais les EAS Environment Variables du projet (voir section "Configuration Google Drive" du `README.md`) : `.env.local` est régénéré à la demande via `npm run env:pull`, jamais synchronisé manuellement entre machines.

Piège n°2 : `expo-auth-session` propose un champ `clientSecret` sur `exchangeCodeAsync`/`refreshAsync`, mais quand il est renseigné, la lib l'envoie via un en-tête HTTP `Authorization: Basic ...` (RFC 6749 §2.3.1) — et retire `client_id` du corps de la requête. Google n'accepte pas cette méthode ici (erreur `client_secret is missing`, alors qu'il est bien envoyé, juste pas là où Google le cherche). La solution : ne jamais passer le champ `clientSecret` de haut niveau, et injecter `client_secret` directement dans `extraParams` à la place — il atterrit alors dans le corps `application/x-www-form-urlencoded`, comme Google l'attend.

## Où sont stockés les tokens ?
- Natif (Android) : `expo-secure-store`, chiffré par l'OS.
- Web : `localStorage` (pas d'équivalent SecureStore sur web — acceptable pour une app à usage personnel).

## Scope `drive.file`
Ce scope limite l'app aux fichiers qu'elle a elle-même créés (ou explicitement ouverts par l'utilisateur) — elle ne voit jamais le reste du Drive. C'est pour ça qu'on peut créer un dossier "Intermittence" visible dans le Drive de l'utilisateur sans demander un accès complet à son compte.

## Retrouver le bon fichier (`appProperties`)
Un fichier Drive peut porter des métadonnées invisibles dans l'UI (`appProperties`). `utils/googleDrive.ts` tague chaque fichier avec `{ intermittenceProfilId: <id du profil> }` à la création. La recherche se fait ensuite par cette propriété (`trouverFichierProfil`) plutôt que par nom de fichier — l'utilisateur peut renommer le fichier dans son Drive sans casser la synchro.

## Pourquoi une sauvegarde manuelle (pas automatique) ?
Sans serveur central, deux appareils modifiés en parallèle n'ont aucun moyen de savoir lequel est "à jour" — c'est le problème classique de synchronisation offline-first. Ici, on l'évite volontairement : l'utilisateur choisit explicitement quand pousser ("Sauvegarder sur Google Drive") et quand tirer ("Restaurer depuis Google Drive", avec confirmation car ça écrase les données locales). Pas de résolution de conflit à construire.
