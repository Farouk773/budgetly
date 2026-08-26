# Rapport de sécurité — Budgetly (pré-déploiement Vercel)

Date : 2026-08-26
Rôle : `test` — vérification indépendante du plan d'audit (`SECURITY_AUDIT_PLAN.md`, rôle `architecte`) et
des corrections livrées par l'agent `backend`.

## Méthode

1. **Lecture de code** — relecture ligne à ligne de `backend/rate-limit.ts`, `middleware.ts`,
   `app/api/auth/login/route.ts`, `app/api/auth/signup/route.ts`, `backend/auth.ts`,
   `prisma/schema.prisma` (modèle `LoginAttempt`) pour vérifier par moi-même que la checklist de la
   section 6 de `SECURITY_AUDIT_PLAN.md` est bien implémentée — sans me fier au résumé de l'agent
   `backend`.
2. **Tests d'intégration réels** — un script Node ponctuel (pas une suite vitest permanente, décision
   justifiée ci-dessous) a exercé le vrai serveur de dev Next.js (`npm run dev`, `localhost:3000`) contre
   la vraie base Postgres locale (`DATABASE_URL` de `.env`). Il crée 4 comptes de test
   (`security-test-a/b/c/d@example.com`), reproduit **chaque** scénario de la section 7 du plan
   (isolation A/B/C, tests transverses d'authentification, rate limiting), puis **supprime tout** ce
   qu'il a créé (comptes, sessions, dépenses, charges, revenus + fichier de fiche de paie sur disque,
   prêts, paiements de prêt, objectifs d'épargne, contributions, liens de foyer, lignes
   `LoginAttempt`) — vérifié par une requête d'absence de lignes orphelines après coup (0 ligne
   orpheline sur les 9 tables concernées). Aucune donnée préexistante de l'utilisateur n'a été touchée
   (le script filtre strictement sur le préfixe d'email `security-test-`).
3. **Pourquoi un script ponctuel plutôt qu'une suite vitest permanente** : les tests d'isolation
   nécessitent (a) une vraie base Postgres avec état partagé entre requêtes, (b) le vrai `middleware.ts`
   Next.js (qui ne s'active que dans le pipeline de requêtes réel de `next dev`/`next start`, pas en
   important les handlers de route directement dans un test), et (c) le vrai rate limiting basé sur
   l'IP/l'heure — trois choses qu'un test vitest « unitaire » important les handlers de route
   directement ne peut pas exercer fidèlement (`cookies()` de `next/headers` n'a d'ailleurs pas de
   contexte de requête hors du serveur Next.js réel). Un script HTTP contre le serveur de dev réel est
   donc le test le plus fidèle à ce qui tournera en production, au prix de ne pas être ré-exécutable en
   CI sans un serveur + une base dédiés — acceptable pour un audit ponctuel pré-déploiement. Le script et
   son contre-script de nettoyage ont été exécutés puis supprimés (aucun script résiduel dans le repo,
   `git status` vérifié propre après coup).
4. `npm test` (123 tests vitest existants), `npx tsc --noEmit` et `npm run lint` ont été exécutés après
   coup : **tous passent sans erreur**, confirmant qu'aucune régression n'a été introduite ailleurs dans
   le projet pendant cet audit (je n'ai modifié aucun fichier de code de production, uniquement écrit ce
   rapport).

**Résultat du script d'intégration : 56/56 scénarios passés (0 échec) après correction de deux erreurs
dans le script de test lui-même (voir note ci-dessous — ce ne sont pas des failles applicatives).**

Note sur les deux faux positifs initiaux, corrigés dans le script avant la version finale :
- `GET /api/analytics/*` exige un paramètre `granularite` obligatoire (pas de valeur par défaut) — un
  appel sans ce paramètre renvoie 400, ce qui est le comportement de validation attendu, pas une faille.
- La réponse de création d'un revenu (`POST /api/incomes`) n'expose délibérément **pas**
  `payslipStoredName` (seul `payslipOriginalName` l'est) — c'est une bonne pratique (le nom de fichier
  interne sur disque n'a pas à transiter vers le client), pas un bug.

---

## 1. Vérification indépendante de la checklist section 6 (corrections `backend`)

| Point de la checklist | Statut constaté en lisant le code | Fichier(s) |
|---|---|---|
| Rate limiting login/signup | **Conforme.** Table `LoginAttempt` (Prisma, migration `20260826163150_add_login_attempt` appliquée en base — vérifié via `prisma migrate status` : "Database schema is up to date"), fenêtre glissante 15 min / 5 tentatives, clé `email` OU `ip`, purge opportuniste des lignes expirées. Pour LOGIN seuls les échecs comptent (un mot de passe correct ne bloque jamais un utilisateur légitime à cause des essais d'un tiers) ; pour SIGNUP chaque tentative compte. Testé en conditions réelles (voir section 3) : blocage effectif à la tentative n°4 sur ce run (le compteur IP partagé par les tests d'énumération précédents a fait déclencher le blocage plus tôt que 5 — comportement correct et attendu, pas un bug). | `backend/rate-limit.ts`, `prisma/schema.prisma` L230-251 |
| Middleware de défense en profondeur | **Conforme.** `matcher: ["/api/:path*"]`, exclut explicitement `/api/auth/*`, renvoie 401 immédiat si le cookie `session` est absent, ne remplace pas `getCurrentUser()` (commentaire explicite dans le code référence la bonne raison : l'Edge runtime ne peut pas fiabilement interroger Postgres). Testé : les 24 routes protégées échantillonnées retournent bien 401 sans cookie. | `middleware.ts` |
| Timing du login (énumération par timing) | **Conforme.** `DUMMY_PASSWORD_HASH` précalculé (bcrypt coût 12), `bcrypt.compare` toujours exécuté même si `user` est `null` (`login/route.ts` L37-40), au lieu du court-circuit précédent. Testé : message et code HTTP identiques pour email inconnu vs mot de passe incorrect. | `backend/auth.ts` L11-16, `app/api/auth/login/route.ts` |
| Nettoyage `AUTH_SECRET` | **Conforme.** Variable commentée dans `.env.example` avec une explication claire (système de session actuel = tokens opaques hashés en base, pas de secret de signature nécessaire) plutôt que supprimée silencieusement — bon compromis pour ne pas perdre l'information en cas de futur besoin JWT. | `.env.example` L7-12 |

Aucune de ces quatre corrections n'a nécessité d'ajustement de ma part : le code correspond exactement à
ce que la checklist de priorité haute/basse de la section 6 demandait.

---

## 2. Tableau route par route — statut final

Toutes les routes listées en section 1 de `SECURITY_AUDIT_PLAN.md` restent **conformes** (aucune
régression détectée par relecture ni par les tests d'intégration). Statut détaillé, avec le résultat du
test d'intégration quand la route en a un :

| Route | Statut | Preuve |
|---|---|---|
| `GET/POST /api/expenses` | Sécurisée | Filtrage `userId` ; B ne voit jamais les dépenses de A (testé) |
| `PATCH/DELETE /api/expenses/[id]` | Sécurisée | B → 404 sur modif/suppression d'une dépense de A, donnée de A inchangée (testé) |
| `GET/POST /api/fixed-charges` | Sécurisée | Idem dépenses |
| `PATCH/DELETE /api/fixed-charges/[id]` | Sécurisée | B → 404, donnée de A inchangée (testé) |
| `GET/POST /api/incomes` | Sécurisée | Filtrage `userId` (testé indirectement) |
| `GET/PATCH/DELETE /api/incomes/[id]` | Sécurisée | B → 404 sur lecture/modif/suppression d'un revenu de A (testé) |
| `GET /api/incomes/[id]/payslip` | Sécurisée | B → 404, ne peut pas télécharger le fichier de A même en connaissant l'id (testé) ; A peut toujours accéder à son propre fichier après (testé) |
| `GET/POST /api/loans` | Sécurisée | Filtrage `userId` (testé indirectement) |
| `PATCH/DELETE /api/loans/[id]` | Sécurisée | B → 404, prêt de A inchangé (testé) |
| `POST /api/loans/[id]/payment` | Sécurisée | B → 404, aucune ligne `LoanPayment` créée, `remainingCents` de A inchangé (testé, comparaison avant/après) |
| `POST /api/loans/[id]/simulate-early-repayment` | Sécurisée | B → 404, aucune donnée financière de A dans la réponse (testé) |
| `GET/POST /api/savings-goals` | Sécurisée | Filtrage `userId` (testé indirectement) |
| `PATCH/DELETE /api/savings-goals/[id]` | Sécurisée | B → 404, objectif de A inchangé (testé) |
| `POST /api/savings-goals/[id]/contribute` | Sécurisée | B → 404, aucune `SavingsContribution` créée, `currentCents` de A inchangé (testé) |
| `GET /api/analytics/pret?loanId=...` | Sécurisée | B avec l'id du prêt de A → 404, aucune fuite de montant (testé) |
| `GET /api/analytics/depenses/revenu/epargne/charges` | Sécurisée | B ne voit que ses propres montants dans le même mois que A (testé, comparaison de la valeur exacte du point du mois) |
| `GET /api/balance`, `PATCH /api/balance`, `POST /api/balance/simulate` | Sécurisée | Aucun ID de ressource tierce en entrée ; 401 sans cookie vérifié |
| `GET /api/household` | Sécurisée | Filtré sur `user.id` |
| `POST /api/household/invite` | Sécurisée | Testée A→B et A→D |
| `GET /api/household/summary` | Sécurisée | Lien `PENDING` → aucune donnée croisée (testé) ; lien `ACCEPTED` → les deux se voient (testé) ; lien `DECLINED` → jamais présent (testé) |
| `DELETE /api/household/[id]` | Sécurisée | C (tiers) → 404 (testé) |
| `POST /api/household/[id]/accept` | Sécurisée | A (requester) → 404, C (tiers) → 404, seul B (invité) → 200 (testé) |
| `POST /api/household/[id]/decline` | Sécurisée | A (requester) → 404, C (tiers) → 404, seul D (invité) → 200 (testé) |
| `GET /api/account/export` | Sécurisée | `passwordHash` absent, données de B/C absentes, seuls les propres `partnerLinks` de A présents (testé) |
| `DELETE /api/account` | Sécurisée | Mauvais mot de passe → 401 (testé) ; bon mot de passe → 200, session invalidée immédiatement (testé) ; cascade complète vérifiée sans ligne orpheline sur les 9 tables liées ; données de B et D intactes après suppression de A (testé) ; lien de foyer A↔B disparaît bien du résumé de B après coup (testé) |
| `GET /api/export/pdf`, `/api/export/excel` | Sécurisée | Générés avec succès pour B, aucune trace du libellé secret de A dans le contenu binaire scanné (testé) |
| `GET /api/categories` | Sécurisée (référentiel partagé, pas de données privées) | 401 sans cookie vérifié |
| `app/api/auth/{me,login,logout,signup}` | Conformes à leur rôle public/mixte | Voir section 3 |

---

## 3. Tests transverses d'authentification

| Scénario | Résultat |
|---|---|
| 24 routes protégées échantillonnées, appelées **sans cookie** | **401 sur les 24**, aucune exception. Échantillon couvrant `expenses`, `fixed-charges`, `incomes`, `loans`, `savings-goals`, `analytics`, `balance` (+`simulate`), `household` (+`invite`, `+summary`), `account` (+`export`), `export/pdf`, `export/excel`, `alerts`, `motivation`, `categories`. |
| `GET /api/auth/me` sans cookie | 200 avec `{ user: null }` — comportement sûr par construction, confirmé |
| Login avec email inexistant vs mot de passe incorrect (email existant) | **Statut identique (401) et message identique** (`"Email ou mot de passe incorrect"`) dans les deux cas — confirmé |
| Signup avec un email déjà utilisé | 409 explicite `"Cet email est déjà utilisé"` — comportement actuel confirmé conforme au choix produit déjà tranché (non-bloquant, voir section 5) |
| Cookie de session posé après login/signup | `HttpOnly` présent, `SameSite=Lax` présent, `Secure` absent — **attendu en local** car conditionné à `NODE_ENV === "production"` (le code source le confirme littéralement, `login/route.ts` et `signup/route.ts` identiques : `secure: process.env.NODE_ENV === "production"`). **À reconfirmer une fois déployé sur Vercel** (impossible à tester depuis cet environnement local) — voir point ouvert en section 5. |
| Rate limiting brute-force login | Après plusieurs tentatives échouées sur le compte de test D, **429 obtenu** (bloqué à la tentative n°4 dans ce run précis, car le compteur est partagé par IP avec deux tentatives d'énumération faites juste avant dans le même run — comportement correct, le seuil de 5 sur la fenêtre glissante est bien respecté au global) ; **tentative suivante avec le bon mot de passe → toujours 429** (le blocage n'est pas contournable en devinant enfin le bon mot de passe). |

---

## 4. Confirmation login/signup (points du prompt de sécurité original)

- **Hashage** : `bcrypt.hash(password, 12)` — confirmé par lecture de `backend/auth.ts` L18-20.
- **Unicité email** : contrainte `@unique` en base + capture explicite de l'erreur Prisma `P2002` en
  filet de sécurité contre les race conditions — confirmé par lecture et par le test « signup avec email
  déjà utilisé » (409).
- **Validation mot de passe** : `min(8).max(72)` via zod (`backend/validations/auth.ts`) — appliqué,
  aucune régression. Politique volontairement laissée telle quelle (décision produit déjà tranchée, voir
  section 5).
- **Pas d'énumération exploitable au login** : message et code HTTP identiques email inconnu / mot de
  passe incorrect (confirmé par test), **et** le timing est désormais égalisé par le `bcrypt.compare`
  systématique contre un hash factice (confirmé par lecture de code — l'écart de timing entre les deux
  cas n'est plus dû à un court-circuit applicatif).
- **Rate limiting** : implémenté et vérifié fonctionnel en conditions réelles (429 après épuisement de la
  fenêtre, blocage qui résiste même à un mot de passe correct).
- **Cookies sécurisés** : `httpOnly: true` et `sameSite: "lax"` confirmés en pratique (cookie réel inspecté) ;
  `secure` correctement conditionné à la production dans le code, non vérifiable en pratique depuis cet
  environnement local (voir section 5, point ouvert non bloquant).

---

## 5. Verdict final

**L'application est prête pour un déploiement Vercel du point de vue sécurité.**

Aucune faille d'isolation de données n'a été trouvée (0 échec sur 56 scénarios de test d'intégration réels
couvrant toutes les routes de la section 7 du plan d'audit, y compris le cas à trois utilisateurs A/B/C
pour le foyer). Les quatre corrections de la checklist section 6 (rate limiting, middleware de défense en
profondeur, timing du login, nettoyage `AUTH_SECRET`) ont été vérifiées par lecture directe du code (pas
seulement par confiance dans le résumé de l'agent `backend`) et confirmées fonctionnelles par des tests
réels contre le serveur et la base. `npm test` (123 tests), `npx tsc --noEmit` et `npm run lint` passent
tous sans erreur.

### Points encore ouverts (non bloquants pour le déploiement)

1. **Énumération de comptes au signup** (409 explicite "Cet email est déjà utilisé") — **décision produit
   déjà tranchée par l'utilisateur : conservée telle quelle.** Ce n'est pas une faille non traitée, c'est
   un compromis assumé pour un produit B2C à faible surface d'attaque ciblée. Comportement re-confirmé
   stable par le test transverse de cette session.
2. **Politique de mot de passe** (min 8 caractères, aucune règle de complexité) — **décision produit déjà
   tranchée par l'utilisateur : conservée telle quelle.** Acceptable en combinaison avec bcrypt coût 12 ;
   à ne pas confondre avec une négligence.
3. **`secure: true` sur le cookie de session en production** — le code est correct (conditionné à
   `NODE_ENV === "production"`, ce que Vercel positionne automatiquement), mais **n'a pas pu être vérifié
   en conditions réelles** depuis cet environnement local où `NODE_ENV !== "production"`. Recommandation :
   vérifier une fois, après le premier déploiement, que le cookie `session` porte bien l'attribut `Secure`
   en inspectant les headers de réponse HTTP en production (`curl -i` ou l'onglet réseau du navigateur).
   Non bloquant pour le déploiement lui-même (le code est déjà correct), c'est une simple vérification
   post-déploiement à ne pas oublier.

Aucun autre point ouvert. Aucune donnée de test résiduelle n'a été laissée en base ni sur le disque
(vérifié : 0 utilisateur `security-test-*`, 0 ligne orpheline sur les 9 tables liées par cascade, 0 ligne
`LoginAttempt` résiduelle, dossier `storage/payslips/` vide). Aucun fichier de code de production n'a été
modifié pendant cet audit ; seul ce rapport a été ajouté.
