# Audit de sécurité — Budgetly (pré-déploiement Vercel)

Date de l'audit : 2026-08-26
Méthode : lecture exhaustive et indépendante du code réel sous `app/api/**`, `backend/auth.ts`,
`backend/validations/**`, `prisma/schema.prisma`, `.env.example`, `.gitignore`. Aucune affirmation de
`roadmap.md` (Phase 13) n'a été prise pour acquise — chaque route a été relue individuellement.

**Conclusion générale (point 1)** : contrairement au risque annoncé dans la consigne, je n'ai trouvé
**aucune faille d'isolation** sur les routes existantes au moment de l'audit — y compris sur les
fonctionnalités ajoutées récemment (paiements de prêt datés, analytics par `loanId`, devise). Le motif
`getOwned<Resource>(userId, id)` (ou l'équivalent inline `resource.userId !== user.id`) est appliqué
systématiquement avant toute lecture/modification/suppression. Ce constat ne dispense pas de la
checklist de non-régression en fin de document : c'est précisément le genre de garantie qui se casse
silencieusement à la prochaine route ajoutée sans middleware centralisé (voir point 2).

---

## 1. Tableau route par route — isolation des données

| Route | Méthodes | Vérification `userId === session.user.id` | Statut |
|---|---|---|---|
| `app/api/expenses/[id]/route.ts` | PATCH, DELETE | `getOwnedExpense()` L7-11 compare `expense.userId !== userId` avant toute opération (L23, L65) | Conforme |
| `app/api/expenses/route.ts` | GET, POST | `findMany({ where: { userId: user.id } })` L23-24 ; POST force `userId: user.id` L53 | Conforme |
| `app/api/fixed-charges/[id]/route.ts` | PATCH, DELETE | `getOwnedFixedCharge()` L7-11, appelé L23 et L62 | Conforme |
| `app/api/fixed-charges/route.ts` | GET, POST | `where: { userId: user.id }` L14 ; POST force `userId` L43 | Conforme |
| `app/api/incomes/[id]/route.ts` | GET, PATCH, DELETE | `getOwnedIncome()` L8-12, appelé L24, L42, L91 | Conforme |
| `app/api/incomes/[id]/payslip/route.ts` | GET | `income.userId !== user.id` inline L18, contrôle **avant** lecture du fichier sur disque L22 | Conforme |
| `app/api/incomes/route.ts` | GET, POST | `where: { userId: user.id }` L19 ; POST force `userId` L93 | Conforme |
| `app/api/loans/[id]/route.ts` | PATCH, DELETE | `getOwnedLoan()` L7-11, appelé L23, L60 | Conforme |
| `app/api/loans/[id]/simulate-early-repayment/route.ts` | POST | `loan.userId !== user.id` inline L18, avant toute simulation basée sur les données du prêt | Conforme |
| `app/api/loans/[id]/payment/route.ts` | POST | `existing.userId !== user.id` inline L18 ; `LoanPayment.userId` forcé à `user.id` (jamais lu depuis le body) L52, commentaire explicite anti-IDOR | Conforme |
| `app/api/loans/route.ts` | GET, POST | `where: { userId: user.id }` L14 ; POST force `userId` L35 | Conforme |
| `app/api/savings-goals/[id]/route.ts` | PATCH, DELETE | `getOwnedGoal()` L7-11, appelé L23, L60 | Conforme |
| `app/api/savings-goals/[id]/contribute/route.ts` | POST | `existing.userId !== user.id` inline L18 ; `SavingsContribution.userId` forcé à `user.id` L36 | Conforme |
| `app/api/savings-goals/route.ts` | GET, POST | `where: { userId: user.id }` L14 ; POST force `userId` L35 | Conforme |
| `app/api/analytics/[type]/route.ts` | GET | délègue à `backend/queries/analytics.ts`, chaque fonction reçoit `user.id` et filtre en base | Conforme (voir détail ci-dessous) |
| `backend/queries/analytics.ts` — `getPretAnalytics(userId, loanId)` | — | Charge d'abord `loans = findMany({ where: { userId } })` (L232-243) puis fait `loans.find(l => l.id === loanId)` (L263) **dans ce sous-ensemble déjà filtré** — un `loanId` d'un autre utilisateur ne peut donc jamais matcher, retourne `null` → 404. Pas de `prisma.loan.findUnique({ where: { id: loanId }})` direct. | Conforme (vérifié explicitement car c'est le seul endroit où un ID appartenant potentiellement à un autre utilisateur transite en paramètre de requête) |
| `app/api/balance/route.ts` | GET, PATCH | Toutes les requêtes utilisent `user.id` (L21, L41) ; pas d'ID de ressource externe en entrée | Conforme |
| `app/api/balance/simulate/route.ts` | POST | Idem, tout dérivé de `user.id` | Conforme |
| `app/api/household/route.ts` | GET | `getPartnerLinks(user.id)` filtre `OR: [{requesterId}, {partnerId}]` sur `user.id` | Conforme |
| `app/api/household/invite/route.ts` | POST | Crée un lien `PENDING` avec `requesterId: user.id` ; pas d'accès à des données tierces, juste une invitation | Conforme |
| `app/api/household/summary/route.ts` | GET | `getHouseholdSummary()` → `getAcceptedPartnerIds()` filtre **`status: "ACCEPTED"`** avant d'ajouter un autre `userId` à `memberIds` (household.ts L13-24) — un lien `PENDING` ou `DECLINED` ne donne jamais accès aux données de l'autre | Conforme, co-consentement réel vérifié (pas supposé) |
| `app/api/household/[id]/route.ts` | DELETE | `existing.requesterId !== user.id && existing.partnerId !== user.id` L16-19 — seuls les deux membres du lien peuvent le supprimer | Conforme |
| `app/api/household/[id]/accept/route.ts` | POST | `existing.partnerId !== user.id` L18 — seul l'invité peut accepter ; vérifie aussi `status === "PENDING"` L21 (empêche de ré-accepter un lien déjà `DECLINED`) | Conforme |
| `app/api/household/[id]/decline/route.ts` | POST | Idem, `partnerId !== user.id` L17 | Conforme |
| `app/api/account/route.ts` | DELETE | Vérifie le mot de passe avant suppression (L22-28), supprime `user.id` uniquement, cascade Prisma (`onDelete: Cascade` sur toutes les relations dans le schéma) | Conforme |
| `app/api/account/export/route.ts` | GET | Toutes les requêtes `where: { userId: user.id }` ou `OR` sur `user.id` pour `partnerLinks` (L47-49) ; exclut `passwordHash` (`select` explicite L24-31) | Conforme |
| `app/api/export/pdf/route.ts` | GET | `getMonthlyReportData(user.id, month)` — pas d'ID de ressource tierce | Conforme |
| `app/api/export/excel/route.ts` | GET | Idem | Conforme |
| `app/api/alerts/route.ts` | GET | `getAlertsSnapshot(user.id)` | Conforme |
| `app/api/motivation/route.ts` | GET | `getMotivationSnapshot(user.id)` | Conforme |
| `app/api/categories/route.ts` | GET | Données de référence partagées (pas de `userId` dans le modèle `Category`, volontaire — voir schéma L150-156), pas de fuite entre utilisateurs possible | Conforme (pas une ressource privée) |
| `app/api/auth/me`, `login`, `logout`, `signup` | — | Pas de paramètre d'ID de ressource, hors périmètre du point 1 | N/A |

**Point d'attention non bloquant (à surveiller, pas une faille aujourd'hui) :**
`expenses/[id]` PATCH et `fixed-charges/[id]` PATCH valident que `categoryId` existe (`prisma.category.findUnique`)
mais ne vérifient pas d'appartenance — c'est correct car `Category` est un référentiel partagé sans `userId`,
donc il n'y a pas de fuite de données personnelles, juste la possibilité de rattacher sa propre dépense à
n'importe quelle catégorie existante (comportement voulu).

---

## 2. Protection des routes — décision middleware vs vérification par route

### Constat factuel
- Il **n'existe aucun `middleware.ts`** à la racine ni sous `app/` (`Glob` sur `**/middleware.ts` ne renvoie que
  du code de `node_modules/redux`, confirmé absent du projet).
- L'authentification est donc **appliquée route par route**, à la main, dans chaque handler :
  `const user = await getCurrentUser(); if (!user) return 401;` — répété **31 fois** dans les 30 fichiers de
  route API (comptage sur les fichiers listés en section 1), à l'identique à chaque fois.
- Les pages (`app/(app)/**`) sont protégées via un seul point central : `app/(app)/layout.tsx` (L12-16)
  fait `getCurrentUser()` puis `redirect("/login")` si absent — **ça, c'est déjà centralisé** et fiable
  car un layout Next.js s'applique à toutes les routes filles sans exception possible.

### Risque réel de l'approche route-par-route sur `app/api/**`
Le risque n'est pas hypothétique : c'est un pattern textuel identique copié-collé dans chaque fichier,
donc à haut risque d'oubli au fur et à mesure que le projet grossit (Phase 8 IA, Phase 11 Stripe vont
ajouter des routes). Aujourd'hui, toutes les routes existantes l'ont bien — mais rien dans le code
n'empêche structurellement d'oublier ce bloc sur une future route, et aucun test ne le garantit
actuellement (voir section 5). C'est une dette de robustesse, pas une faille présente.

### Décision recommandée
**Oui, un middleware Next.js centralisé est faisable proprement ici**, sans casser les routes publiques,
car le projet a une séparation nette et simple :
- Toutes les routes sous `app/api/auth/*` (signup, login, logout, me) doivent rester publiques/mixtes
  (elles gèrent elles-mêmes leur propre logique d'auth).
- Toutes les autres routes sous `app/api/**` exigent une session.

Proposition concrète (à destination de l'agent `backend`, ne pas l'implémenter ici) :
créer `middleware.ts` à la racine avec un `matcher` couvrant `app/api/**` sauf `app/api/auth/**`, qui lit
le cookie `session`, vérifie sa présence (le middleware Edge ne peut pas interroger Prisma directement de
façon fiable pour un hash sha256 en base — donc il ne remplace **pas** `validateSessionToken()`, il fait
un filtre grossier "cookie absent → 401 immédiat" en amont, et chaque route garde son `getCurrentUser()`
pour la validation réelle contre la base). Alternative plus robuste : garder `getCurrentUser()` route par
route (fiable aujourd'hui) mais ajouter un test automatisé (section 5) qui échoue si une nouvelle route
API ne retourne pas 401 sans cookie — ça couvre le risque d'oubli sans réécrire l'existant qui fonctionne.
**Recommandation : privilégier le filet de sécurité automatisé (test) plutôt qu'un middleware Edge qui ne
peut de toute façon pas remplacer la vérification en base — le combiner avec le middleware "cookie absent"
en défense en profondeur est un bonus, pas un remplacement.**

### Routes publiques (doivent le rester)
| Route | Justification |
|---|---|
| `app/page.tsx` | Redirige vers `/login` ou `/dashboard`, pas de donnée sensible |
| `app/login/page.tsx` | Page de connexion |
| `app/signup/page.tsx` | Page d'inscription |
| `app/api/auth/signup/route.ts` | Création de compte |
| `app/api/auth/login/route.ts` | Connexion |
| `app/api/auth/me/route.ts` | Retourne `null` si pas de session — safe par construction, ne fuite rien |
| `app/api/auth/logout/route.ts` | Doit fonctionner même si le cookie est déjà expiré/absent (no-op sûr) |
| `app/favicon.ico`, assets statiques | Pas de données |

### Routes protégées — statut actuel (toutes vérifiées conformes, cf. section 1 pour le détail fichier:ligne)
Toutes les routes sous `app/api/**` listées en section 1 (hors `auth/*` et `categories`) vérifient
`getCurrentUser()` en première ligne de chaque handler. Toutes les pages sous `app/(app)/**` sont
protégées par le layout commun. Aucune route protégée manquante trouvée à ce jour.

---

## 3. Inscription (signup)

Fichiers : `app/api/auth/signup/route.ts`, `backend/auth.ts`, `backend/validations/auth.ts`.

- **Hashage** : `bcrypt.hash(password, 12)` (`backend/auth.ts` L10-12) — coût 12, raisonnable pour bcrypt en 2026
  (au-dessus du défaut historique de 10). Conforme.
- **Unicité email** : `email String @unique` au niveau du schéma Prisma (`prisma/schema.prisma` L17) —
  contrainte DB réelle, pas seulement applicative. La route `signup/route.ts` L24-35 capture explicitement
  l'erreur Prisma `P2002` (violation de contrainte unique) en filet de sécurité en cas de race condition
  (deux inscriptions simultanées avec le même email) — bonne pratique, le `findUnique` préalable seul ne
  suffirait pas contre une race condition. Conforme.
- **Robustesse mot de passe** : `password: z.string().min(8).max(72)` (`backend/validations/auth.ts` L6)
  — minimum **8 caractères**, aucune exigence de complexité (majuscule/chiffre/symbole). Le plafond à 72
  correspond à la limite technique de bcrypt (troncature silencieuse au-delà) — correct de le borner ici.
  8 caractères sans complexité est un minimum acceptable mais faible pour des données financières ; à
  documenter comme choix assumé ou à renforcer (voir checklist section 4, non bloquant).
- **Énumération de comptes** : le message d'erreur en cas d'email déjà utilisé est **`"Cet email est déjà
  utilisé"`** (`signup/route.ts` L30) avec status 409. C'est un message explicite qui confirme
  qu'un compte existe avec cet email — permet l'énumération de comptes (un attaquant peut tester une
  liste d'emails et savoir lesquels sont inscrits). Idéalement, un signup ne devrait *jamais* confirmer
  qu'un email existe déjà (ex : renvoyer un email "un compte existe déjà, connectez-vous" plutôt qu'une
  erreur bloquante dans le flux, ou au minimum garder un message générique côté API et gérer la nuance
  côté UX/email uniquement). **Constat : énumération possible, à traiter (priorité modérée, section 4).**

---

## 4. Connexion (login)

Fichier : `app/api/auth/login/route.ts`.

- **Rate limiting** : recherche exhaustive (`rate-limit`, `rateLimit`, `throttle` dans tout le repo,
  et dépendances dans `package.json`) → **aucun mécanisme de limitation de tentatives trouvé**, ni au
  niveau applicatif (pas de compteur en base/mémoire), ni au niveau infra (pas de config Vercel Edge
  Config / Upstash visible). La route `login/route.ts` accepte un nombre illimité de tentatives par IP
  ou par compte. **Constat : absence totale de rate limiting sur `/api/auth/login` (et `/api/auth/signup`),
  vulnérable au brute-force de mot de passe et au credential stuffing. Priorité haute pour un déploiement
  public (section 4 checklist).**
- **Cookies de session** : posés de façon identique dans `login/route.ts` L36-42 et `signup/route.ts`
  L47-53 :
  ```
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  expires: expiresAt,
  ```
  `httpOnly` : conforme (pas accessible en JS, protège contre XSS-based session theft).
  `secure` : conditionné à `NODE_ENV === "production"` — **correct pour Vercel** (qui sert toujours en
  HTTPS et positionne `NODE_ENV=production` en déploiement), mais à vérifier explicitement une fois
  déployé (voir checklist test).
  `sameSite: "lax"` : raisonnable, protège contre la plupart des CSRF cross-site tout en gardant les
  liens entrants fonctionnels ; pas `strict` (pourrait casser un flux d'invitation par email/lien externe
  à l'avenir) — choix défendable, pas une faille.
  Le token brut n'est jamais stocké en base : seul son hash sha256 l'est (`backend/auth.ts` L21-23,
  `createSession` L34) — conforme, une fuite de la table `Session` ne permettrait pas de rejouer une
  session valide sans connaître le token original.
- **Énumération de comptes au login** : `login/route.ts` L18-24 — que l'utilisateur n'existe pas
  (`!user`) ou que le mot de passe soit invalide (`!isValid`), la réponse est **identique** :
  `{ error: "Email ou mot de passe incorrect" }`, status 401. Message volontairement générique,
  ne distingue pas les deux cas. **Conforme, bonne pratique respectée.**
  Note : `verifyPassword` n'est appelé que si `user` existe (L18 : `user ? await verifyPassword(...) :
  false`) — cela introduit un écart de timing mesurable entre "email inconnu" (retour quasi immédiat)
  et "email connu, mauvais mot de passe" (attend le temps de calcul bcrypt), ce qui est un canal
  d'énumération par timing, plus difficile à exploiter que le canal applicatif mais réel. Amélioration
  possible : toujours faire un `bcrypt.compare` contre un hash factice quand `user` est `null`, pour
  égaliser le temps de réponse (mentionné en checklist, priorité basse).

---

## 5. Variables sensibles

- **Recherche de secrets en dur** : grep sur des patterns de clés (`sk-`, `postgresql://` avec
  identifiants, `AKIA`, `api_key=`) sur l'ensemble du code source (hors `node_modules`) →
  **aucun secret en dur trouvé** dans le code applicatif. La seule occurrence de
  `postgresql://user:password@...` est dans `.env.example` (L2), avec des valeurs placeholder génériques
  (`user`/`password`), pas des identifiants réels. Conforme.
- **`.env` / `.gitignore`** : `.gitignore` (L33-35) exclut `.env*` mais garde explicitement
  `!.env.example` en clair — pattern correct. `.env` existe en local (confirmé par `Glob`) et n'est pas
  suivi par git (à reconfirmer avec `git ls-files | grep .env` avant tout push, voir checklist test —
  je n'ai pas exécuté de commande git ici, seulement lu la config). `.env.example` (5 lignes) ne contient
  que des placeholders vides ou génériques (`ANTHROPIC_API_KEY=""`, `AUTH_SECRET=""`) — conforme.
- **Variable `AUTH_SECRET`** : déclarée dans `.env.example` (L8) mais **jamais lue** nulle part dans le
  code (`grep process.env.AUTH_SECRET` → 0 résultat en dehors du fichier `.env.example` lui-même). Ce
  n'est pas un risque de sécurité (le système de session actuel n'a pas besoin de secret de signature,
  les tokens sont des `randomBytes(32)` opaques stockés hashés en base — un token n'a pas besoin d'être
  signé pour être vérifié par lookup DB). C'est en revanche une variable fantôme trompeuse à nettoyer ou
  documenter (faux sentiment qu'un secret de session est configuré quelque part).
- **Exposition côté client** : une seule variable `NEXT_PUBLIC_*` dans tout le projet —
  `NEXT_PUBLIC_APP_URL` (`.env.example` L11), qui est une URL publique par nature (pas un secret).
  Aucune clé API (`ANTHROPIC_API_KEY`) ni `DATABASE_URL` n'est préfixée `NEXT_PUBLIC_`. Conforme.

---

## 6. Checklist de correction pour l'agent `backend` (priorisée)

### Priorité critique
Aucune faille d'isolation trouvée à corriger aujourd'hui (voir section 1). Rien à faire ici pour le
moment — mais **ne pas ajouter de nouvelle route `[id]` sans reproduire exactement le motif
`getOwned<Resource>(userId, id)`** utilisé partout dans le code actuel (comparaison `resource.userId !==
user.id` avant toute lecture/écriture, retour 404 — pas 403 — pour ne pas révéler l'existence de la
ressource à un utilisateur non autorisé, comme c'est déjà fait partout aujourd'hui).

### Priorité haute
1. **Rate limiting sur `/api/auth/login` et `/api/auth/signup`.**
   Où : `app/api/auth/login/route.ts`, `app/api/auth/signup/route.ts`.
   Comment : ajouter un compteur de tentatives (par IP + par email si possible) avec fenêtre glissante
   (ex. 5 tentatives / 15 min avant blocage temporaire). Sur Vercel, éviter un stockage en mémoire du
   process (non partagé entre instances serverless) — utiliser un store partagé (ex. table Prisma dédiée
   `LoginAttempt` avec `email`/`ip`/`createdAt`, ou un service externe type Upstash Redis si le budget le
   permet). Retourner 429 avec un message générique une fois la limite atteinte, sans révéler le nombre
   de tentatives restantes de façon trop précise.

2. **Filet de sécurité automatisé contre l'oubli d'authentification sur une future route API.**
   Où : nouveau fichier, ex. `middleware.ts` à la racine.
   Comment : cf. section 2 — `matcher: ["/api/:path*"]` avec exclusion explicite de `/api/auth/:path*`,
   qui vérifie juste la présence du cookie `session` (401 immédiat si absent) en complément de
   `getCurrentUser()` gardé dans chaque route (le middleware Edge ne remplace pas la vérification DB).
   Objectif : réduire, pas éliminer, le risque de nouvelle route oubliant `getCurrentUser()`.

### Priorité modérée
3. **Énumération de comptes au signup.**
   Où : `app/api/auth/signup/route.ts` L29-33.
   Comment : ne plus renvoyer une erreur 409 explicite "Cet email est déjà utilisé" en clair au flux
   synchrone. Options : (a) accepter la requête normalement et envoyer un email "un compte existe déjà"
   à l'adresse fournie sans jamais le dire dans la réponse HTTP (nécessite un service d'envoi d'email,
   actuellement absent du projet — non trivial à court terme) ; (b) solution intermédiaire immédiate :
   garder le comportement actuel mais documenter/accepter le compromis (produit B2C avec faible surface
   d'attaque ciblée) — à trancher avec le porteur produit plutôt qu'à corriger aveuglément si (a) n'est
   pas priorisé maintenant.

4. **Renforcer la politique de mot de passe (optionnel, à trancher produit).**
   Où : `backend/validations/auth.ts` L6 (`signupSchema.password`).
   Comment : si décidé, passer à `min(10)` ou `min(12)` et/ou ajouter une règle de complexité
   (`.regex(...)` exigeant au moins une lettre et un chiffre). Ne pas complexifier à l'excès (nuit à
   l'UX sans gain de sécurité proportionnel pour un mot de passe déjà hashé en bcrypt coût 12).

5. **Nettoyer `AUTH_SECRET` dans `.env.example`.**
   Où : `.env.example` L7-8.
   Comment : soit le supprimer (variable inutilisée aujourd'hui), soit ajouter un commentaire explicite
   expliquant qu'elle n'est pas encore utilisée par le système de session actuel (tokens opaques hashés
   en base), pour éviter toute confusion lors d'un futur audit ou d'un onboarding.

### Priorité basse
6. **Timing d'énumération au login.**
   Où : `app/api/auth/login/route.ts` L18.
   Comment : toujours exécuter `bcrypt.compare` (contre un hash bcrypt factice précalculé en constante
   si `user` est `null`) pour égaliser le temps de réponse entre "email inconnu" et "mauvais mot de
   passe", au lieu du court-circuit actuel `user ? await verifyPassword(...) : false`.

### RGPD / conformité (déjà en bon état, à ne pas régresser)
- `app/api/account/export/route.ts` exclut déjà `passwordHash` — s'assurer que toute nouvelle donnée
  personnelle ajoutée au modèle `User` (ex. futures données Stripe en Phase 11) soit explicitement
  exclue par défaut du `select` de cette route plutôt qu'incluse par erreur via un futur `include: {
  user: true }` non filtré.
- Vérifier lors de l'implémentation Stripe (Phase 11) qu'aucune donnée de carte bancaire ne transite ou
  n'est stockée côté application (utiliser Stripe Checkout/Elements, jamais de saisie de PAN côté
  serveur applicatif).

---

## 7. Tests d'isolation à écrire pour l'agent `test`

Pattern général pour chaque test : créer deux utilisateurs A et B (sessions distinctes), créer une
ressource appartenant à A, puis tenter d'y accéder/la modifier/la supprimer avec la session de B — la
réponse attendue est **404** (pas 403, pour rester cohérent avec le comportement actuel qui ne révèle
pas l'existence de la ressource) et l'état en base de la ressource de A doit rester inchangé après la
tentative de B.

| Route | Scénario à tester |
|---|---|
| `PATCH /api/expenses/[id]` | B ne peut pas modifier une dépense de A → 404, dépense de A inchangée en base |
| `DELETE /api/expenses/[id]` | B ne peut pas supprimer une dépense de A → 404, dépense toujours présente |
| `GET /api/expenses?month=...` | La liste retournée à B ne contient jamais une dépense créée par A |
| `PATCH /api/fixed-charges/[id]` | Idem dépenses |
| `DELETE /api/fixed-charges/[id]` | Idem dépenses |
| `GET /api/incomes/[id]` | B ne peut pas lire un revenu de A → 404 |
| `PATCH /api/incomes/[id]` | B ne peut pas modifier un revenu de A → 404 |
| `DELETE /api/incomes/[id]` | B ne peut pas supprimer un revenu de A (et le fichier de fiche de paie associé doit rester sur disque) → 404 |
| `GET /api/incomes/[id]/payslip` | B ne peut pas télécharger le fichier de fiche de paie de A → 404, même si B connaît/devine l'`id` de l'income |
| `PATCH /api/loans/[id]` | B ne peut pas modifier un prêt de A → 404 |
| `DELETE /api/loans/[id]` | B ne peut pas supprimer un prêt de A → 404 |
| `POST /api/loans/[id]/payment` | B ne peut pas enregistrer un paiement sur un prêt de A → 404 ; vérifier qu'aucune ligne `LoanPayment` n'est créée et que `Loan.remainingCents` de A reste inchangé |
| `POST /api/loans/[id]/simulate-early-repayment` | B ne peut pas simuler un remboursement anticipé sur un prêt de A → 404 (ne doit pas fuiter les montants du prêt de A dans la réponse) |
| `PATCH /api/savings-goals/[id]` | B ne peut pas modifier un objectif d'épargne de A → 404 |
| `DELETE /api/savings-goals/[id]` | B ne peut pas supprimer un objectif d'épargne de A → 404 |
| `POST /api/savings-goals/[id]/contribute` | B ne peut pas ajouter une contribution sur l'objectif de A → 404 ; vérifier qu'aucune `SavingsContribution` n'est créée et que `currentCents` de A reste inchangé |
| `GET /api/analytics/pret?loanId=<id de A>` | En tant que B, avec l'`id` du prêt de A en paramètre → 404, aucune donnée financière de A dans la réponse |
| `GET /api/analytics/depenses`, `/revenu`, `/epargne`, `/charges` | En tant que B, vérifier que les points de données retournés ne contiennent que ses propres montants, même si A a des données sur la même période |
| `DELETE /api/household/[id]` | Un troisième utilisateur C (ni A ni B, non partie au lien) ne peut pas supprimer un `PartnerLink` entre A et B → 404 |
| `POST /api/household/[id]/accept` | Le `requester` A ne peut pas accepter sa propre invitation à la place du destinataire B → 404 (seul B doit pouvoir) ; C (tiers) ne peut pas non plus → 404 |
| `POST /api/household/[id]/decline` | Idem accept, seul le `partnerId` (destinataire) peut décliner |
| `GET /api/household/summary` | Tant que le lien A↔B est `PENDING` (non accepté des deux côtés), le résumé de A ne doit **pas** inclure les montants de B, et réciproquement. Une fois `ACCEPTED`, vérifier que le résumé inclut bien B ; un lien `DECLINED` ne doit jamais réapparaître dans le résumé |
| `GET /api/account/export` | Le fichier exporté par A ne doit contenir aucune donnée de B, y compris dans `partnerLinks` (seuls les liens où A est `requester` ou `partner` doivent apparaître) |
| `DELETE /api/account` | La suppression du compte de A (avec bon mot de passe) ne doit supprimer aucune ligne appartenant à B, même si un `PartnerLink` ACCEPTED existe entre eux ; vérifier la cascade complète (sessions, incomes, expenses, fixedCharges, loans, loanPayments, savingsGoals, savingsContributions, partnerLinks de A) et l'absence de ligne orpheline |
| `GET /api/export/pdf`, `/api/export/excel` | Le rapport généré pour A ne doit contenir que les montants de A, même en partageant un mois avec B |

### Tests transverses (auth, hors IDOR)
| Scénario | Attendu |
|---|---|
| Appeler chaque route protégée listée en section 1 sans cookie de session | 401 sur toutes, sans exception (test automatisé, à faire tourner sur la liste complète des routes pour détecter tout oubli futur — répond directement au risque du point 2) |
| Login avec email inexistant vs mot de passe incorrect pour un email existant | Même message d'erreur, même code HTTP (401) dans les deux cas |
| Signup avec un email déjà utilisé | Vérifier le comportement actuel (409 explicite) est un choix assumé et documenté, pas un oubli — sert de garde-fou si la correction de la section 4 point 3 est appliquée plus tard (le test devra alors être mis à jour) |
| Cookie de session posé après login/signup | `httpOnly=true`, `sameSite=Lax`, et `secure=true` **une fois déployé en production sur Vercel** (`NODE_ENV=production`) — à vérifier en environnement de préproduction réel, pas seulement en local où `secure` sera `false` |
| Brute-force login (si la protection de la section 4 point 1 est implémentée) | Après N tentatives échouées, la Nème+1 tentative retourne 429 même avec le bon mot de passe |
