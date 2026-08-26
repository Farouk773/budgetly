# Plan d'architecture — Section "Analyses" (courbes historiques)

Statut : plan à exécuter par l'agent `backend` (routes + queries) puis `frontend` (UI + toggle/sélecteur).
Aucune modification de schéma Prisma n'est nécessaire pour ce plan (voir section 6 pour les limites que cela implique et les recommandations futures, hors scope ici).

---

## 1. Audit des données existantes (ce qu'on peut reconstituer fidèlement, et ce qu'on ne peut pas)

| Modèle | Champ de date exploitable | Historisé fidèlement ? | Conclusion |
|---|---|---|---|
| `Expense` | `date` (jour exact saisi par l'utilisateur, stocké minuit UTC sans composante horaire) | Oui | Chaque ligne porte sa vraie date. Agrégation jour/mois directe et fiable. |
| `Income` | `periodMonth` (jour exact saisi, pas forcément le 1er du mois) | Oui | Chaque ligne porte sa vraie période. Agrégation mensuelle fiable après troncature au mois. |
| `SavingsContribution` | `createdAt` (horodatage serveur, immuable) | Oui pour les flux loggés | Fiable pour le flux mensuel réel. **Mais** `SavingsGoal.currentCents` est modifiable directement via `PATCH /api/savings-goals/[id]` (voir `updateSavingsGoalSchema`) et un `currentCents` initial peut être fixé à la création — sans création de `SavingsContribution` correspondante. Le cumul reconstitué depuis les contributions peut donc diverger du vrai total actuel (`SavingsGoal.currentCents`). Décision au point 5. |
| `FixedCharge` | `createdAt` (fiable, immuable), `updatedAt` + `active` (indice, pas une preuve) | **Non, best-effort seulement** | Pas de log des changements de montant, pas de log des activations/désactivations successives, et une suppression physique (hard delete) efface toute trace. `createdAt` prouve une borne basse fiable ("n'existait pas avant"). `active`/`updatedAt` ne donnent qu'un indice de fin. |
| `Loan` | `createdAt` (fiable), mais **aucun log de paiement** | **Non, best-effort seulement** | `remainingCents`, `monthlyPaymentCents`, `annualRateBps`, `endDate` sont tous modifiables directement via `PATCH /api/loans/[id]` sans log, et `POST /api/loans/[id]/payment` mute `remainingCents` instantanément sans enregistrer de ligne de paiement datée. Seule la valeur **actuelle** de `remainingCents` est certaine. |

Conclusion générale : les courbes **Dépenses**, **Revenu** et le **flux mensuel d'épargne** peuvent être reconstruites avec une précision réelle (données transactionnelles datées, jamais réécrites rétroactivement). Les courbes **Charges fixes** et **Prêt** ne peuvent pas être reconstruites avec certitude car l'app ne conserve pas d'historique de leurs changements — elles doivent être des **reconstructions estimées**, explicitement marquées comme telles (décision détaillée en section 5). Le **cumul d'épargne** est un cas intermédiaire : fiable sauf si l'utilisateur a déjà utilisé l'édition manuelle de `currentCents` (décision en section 5).

---

## 2. Contrat de l'endpoint générique

### Route

`GET /api/analytics/[type]`

où `type` (segment d'URL) ∈ `depenses | revenu | epargne | pret | charges`.

Une seule route `app/api/analytics/[type]/route.ts`, avec un `switch` interne qui délègue à une fonction dédiée par type dans `backend/queries/analytics.ts` (une fonction par type — pas de duplication de la logique d'authentification/validation, qui reste dans la route ; pas de duplication de la logique d'agrégation, qui reste dans `backend/queries/`). C'est la même séparation route/query que le reste du code (`app/api/balance/route.ts` → `backend/queries/balance.ts`).

### Query params

| Param | Obligatoire | Format | Notes |
|---|---|---|---|
| `granularite` | oui | `jour` \| `mois` | `jour` n'est valide que pour `type=depenses` (400 sinon, voir tableau d'erreurs). |
| `month` | non | `YYYY-MM` | Utilisé uniquement avec `granularite=jour` : le mois affiché en vue journalière. Par défaut le mois en cours si absent. Ignoré (et donc inutile) pour `granularite=mois` : la vue mensuelle retourne toujours tout l'historique depuis `firstDataMonth` jusqu'au mois en cours, jamais un sous-ensemble. |
| `loanId` | non | `string` (cuid) | Utilisé uniquement avec `type=pret`. Si absent, le premier prêt de l'utilisateur (tri par `createdAt asc`) est sélectionné par défaut ; la liste complète des prêts est toujours renvoyée pour alimenter le sélecteur front. |

### Codes d'erreur

| Code | Cas |
|---|---|
| 401 | Utilisateur non authentifié (`getCurrentUser()` retourne `null`) — pattern identique à toutes les routes existantes. |
| 400 | `type` hors de l'ensemble autorisé, `granularite` absente/invalide, `month` fourni avec un format invalide, `granularite=jour` demandée pour un `type` qui ne le supporte pas (tout sauf `depenses`). |
| 404 | `type=pret` avec un `loanId` fourni qui n'existe pas ou n'appartient pas à l'utilisateur courant (même pattern que `getOwnedLoan` dans `app/api/loans/[id]/route.ts` — jamais un 403 qui confirmerait l'existence de la ressource à un autre utilisateur). |
| 200 | Toujours en cas de succès, **y compris quand il n'y a aucune donnée** — jamais de 404 pour "pas d'historique". Le tableau `points` contient alors des valeurs à 0, avec au minimum le mois en cours (voir gestion du cas 1 mois en section 4). |

### Format de réponse

Voir les types complets en section 3 (`backend/types.ts`). Résumé : chaque réponse a une enveloppe commune `{ type, meta, points, ... champs spécifiques au type }`. `meta.estimated` indique si la série est une reconstruction best-effort (voir section 5) et `meta.caveat` porte le texte explicatif à afficher côté front quand `estimated` est vrai.

---

## 3. Types partagés à ajouter dans `backend/types.ts`

```ts
export type AnalyticsType = "depenses" | "revenu" | "epargne" | "pret" | "charges";
export type AnalyticsGranularity = "jour" | "mois";

export type AnalyticsPoint = {
  /** "YYYY-MM-DD" en granularité jour, "YYYY-MM" en granularité mois. */
  date: string;
  valueCents: number;
};

export type AnalyticsMeta = {
  granularity: AnalyticsGranularity;
  /** Mois d'ancrage utilisé comme premier point de la série (voir règle en section 4). */
  firstDataMonth: string;
  /** true si la série est une reconstruction best-effort et non un historique
   * réellement enregistré (voir section 5) — le front DOIT afficher `caveat`
   * de façon visible (bandeau/tooltip) quand cette valeur est true. */
  estimated: boolean;
  /** Texte explicatif en français, présent seulement quand estimated=true. */
  caveat?: string;
};

export type DepensesAnalyticsResponse = {
  type: "depenses";
  meta: AnalyticsMeta;
  points: AnalyticsPoint[];
};

export type RevenuAnalyticsResponse = {
  type: "revenu";
  meta: AnalyticsMeta;
  points: AnalyticsPoint[];
};

export type EpargneAnalyticsResponse = {
  type: "epargne";
  meta: AnalyticsMeta;
  /** Flux mensuel : montant versé ce mois-là. */
  points: AnalyticsPoint[];
  /** Cumul à date, même axe X que points (voir reconciliation en section 5). */
  cumulativePoints: AnalyticsPoint[];
  /** Cumul total actuel, toujours égal à la somme des SavingsGoal.currentCents
   * de l'utilisateur (source de vérité utilisée partout ailleurs dans l'app) —
   * et donc toujours égal au dernier point de cumulativePoints. */
  totalSavedCents: number;
};

export type LoanOption = { id: string; name: string };

export type PretAnalyticsResponse = {
  type: "pret";
  meta: AnalyticsMeta; // estimated toujours true pour ce type
  loans: LoanOption[];
  selectedLoanId: string | null; // null seulement si l'utilisateur n'a aucun prêt
  points: AnalyticsPoint[]; // remainingCents par mois pour selectedLoanId
};

export type ChargesAnalyticsResponse = {
  type: "charges";
  meta: AnalyticsMeta; // estimated toujours true pour ce type
  points: AnalyticsPoint[];
};

export type AnalyticsResponse =
  | DepensesAnalyticsResponse
  | RevenuAnalyticsResponse
  | EpargneAnalyticsResponse
  | PretAnalyticsResponse
  | ChargesAnalyticsResponse;
```

`ApiError` (déjà défini dans `backend/types.ts`) est réutilisé tel quel pour les réponses d'erreur — pas de nouveau type d'erreur à créer.

---

## 4. Requêtes d'agrégation par courbe (backend/queries/analytics.ts)

Convention reprise du code existant : agrégation Prisma (`aggregate`/`groupBy`) par période, en parallèle via `Promise.all` sur la liste des mois de l'intervalle — exactement le pattern déjà utilisé dans `getRunningBalance` (`backend/queries/balance.ts`), plutôt que du SQL brut ou une boucle qui somme des lignes côté JS. Réutiliser `monthRange()` et `toMonthString`/`shiftMonth` (`backend/dateUtils.ts`) tels quels.

### Règle commune : `firstDataMonth`

```
firstDataMonth(type) = MIN(
  toMonthString(user.createdAt),
  mois de la donnée la plus ancienne pertinente pour ce type (si elle existe)
)
```

Justification : la règle du brief ("date de création du compte OU date de la première donnée si plus pertinent") sert à ne jamais couper une donnée antidatée (ex. une fiche de paie importée pour un mois antérieur à l'inscription). S'il n'existe aucune donnée pour ce type, `firstDataMonth` retombe sur le mois de création du compte — la série a alors un seul point (mois courant) à 0, ce qui couvre nativement le cas "1 mois d'historique" demandé dans le brief (aucune duplication de point nécessaire côté backend ; c'est au composant de graphique front de savoir afficher un point isolé plutôt qu'une ligne).

Exception : pour `type=pret`, l'ancre n'est pas le compte mais **le prêt lui-même** (`loan.createdAt`) — le brief est explicite ("depuis le début du prêt"), et un prêt peut avoir été ajouté bien après la création du compte.

### 4.1 Dépenses (`type=depenses`)

Portée volontairement limitée au modèle `Expense` (dépenses ponctuelles), **sans les charges fixes** — contrairement à `getSpendingByCategory` (`backend/queries/spending.ts`) qui fusionne les deux pour la répartition par catégorie du dashboard. Ici le brief distingue explicitement "Dépenses" (point 1) et "Charges fixes" (point 5) comme deux courbes séparées ; les fusionner romprait cette distinction et rendrait la courbe "Charges fixes" redondante. À documenter en commentaire dans le code pour éviter qu'un futur refactor les fusionne par erreur en réutilisant `getSpendingByCategory`.

**`granularite=jour`** (un seul mois, `month` param ou mois courant par défaut) :

```ts
prisma.expense.groupBy({
  by: ["date"],
  where: { userId, date: monthRange(month) },
  _sum: { amountCents: true },
  orderBy: { date: "asc" },
});
```

Un vrai `groupBy` DB puisque `date` n'a pas de composante horaire (confirmé : `expenseInputSchema` valide `YYYY-MM-DD` puis `new Date(...)`, donc chaque jour est une valeur distincte). Le backend complète ensuite les jours sans dépense avec `valueCents: 0` pour produire un tableau dense `jour 1 → dernier jour du mois` (remplissage de trous, pas un recalcul d'agrégat — l'agrégation elle-même reste 100% DB-side).

**`granularite=mois`** (depuis `firstDataMonth` jusqu'au mois courant) :

```ts
Promise.all(months.map((m) =>
  prisma.expense.aggregate({
    where: { userId, date: monthRange(m) },
    _sum: { amountCents: true },
  })
));
```

`meta.estimated = false` (données transactionnelles réelles, datées, jamais réécrites rétroactivement).

### 4.2 Revenu (`type=revenu`)

`granularite=jour` non supporté → 400 (le brief ne demande qu'une vue mensuelle pour le revenu).

`firstDataMonth` : `MIN(compte, MIN(periodMonth) via prisma.income.aggregate({ where:{userId}, _min:{ periodMonth:true } }))`.

```ts
Promise.all(months.map((m) =>
  prisma.income.aggregate({
    where: { userId, periodMonth: monthRange(m) },
    _sum: { netAmountCents: true },
  })
));
```

`meta.estimated = false`.

### 4.3 Épargne (`type=epargne`)

`granularite=jour` non supporté → 400.

Flux mensuel réel (agrégation DB) :

```ts
Promise.all(months.map((m) =>
  prisma.savingsContribution.aggregate({
    where: { userId, createdAt: monthRange(m) },
    _sum: { amountCents: true },
  })
));
```

Total actuel (source de vérité, identique à ce qui est affiché ailleurs dans l'app) :

```ts
prisma.savingsGoal.aggregate({
  where: { userId },
  _sum: { currentCents: true },
});
```

`firstDataMonth` : `MIN(compte, MIN(SavingsGoal.createdAt), MIN(SavingsContribution.createdAt))`.

Cumul (`cumulativePoints`) : calculé en additionnant les totaux mensuels déjà agrégés par la DB (pas une re-sommation de lignes brutes — même principe que le `reduce` déjà utilisé sur des totaux mensuels dans `getRunningBalance`), **puis réconcilié** avec `totalSavedCents` — voir la fonction proposée en section 5.

### 4.4 Prêt (`type=pret`)

`granularite=jour` non supporté → 400.

Liste des prêts pour le sélecteur :

```ts
prisma.loan.findMany({
  where: { userId },
  orderBy: { createdAt: "asc" },
  select: { id: true, name: true, remainingCents: true, monthlyPaymentCents: true, annualRateBps: true, createdAt: true },
});
```

Si `loanId` est fourni, vérifier `loan.userId === user.id` (sinon 404) avant de calculer quoi que ce soit — même garde que `getOwnedLoan`. À défaut de `loanId`, prendre le premier de la liste triée.

Pas d'agrégat DB ici : la série est calculée par une fonction pure (voir section 5) à partir des 4 champs déjà chargés du prêt sélectionné (`remainingCents`, `monthlyPaymentCents`, `annualRateBps`, `createdAt`). `meta.estimated = true` systématiquement.

### 4.5 Charges fixes (`type=charges`)

`granularite=jour` non supporté → 400.

Pour chaque mois `m` de `firstDataMonth` à aujourd'hui :

```ts
prisma.fixedCharge.aggregate({
  where: {
    userId,
    createdAt: { lt: monthRange(m).lt },       // existait déjà à la fin du mois m
    OR: [
      { active: true },                          // toujours active aujourd'hui
      { updatedAt: { gte: monthRange(m).lt } },  // désactivée seulement après la fin du mois m
    ],
  },
  _sum: { amountCents: true },
});
```

en `Promise.all` sur la liste des mois — reste un vrai agrégat DB par mois, cohérent avec le reste du fichier. `meta.estimated = true` systématiquement (voir justification section 5).

`firstDataMonth` : `MIN(compte, MIN(FixedCharge.createdAt))`.

---

## 5. Décision sur le point d'attention critique

**Constat confirmé par l'audit (section 1) :** `getMonthlyBudget`/`getRunningBalance` filtrent les charges/prêts sur leur `active` **actuel**, sans filtre de date — un mois passé se recalcule donc avec la configuration d'aujourd'hui. Ce comportement est correct pour son usage actuel (solde courant/projeté, qui doit refléter l'état présent), mais serait faux pour une courbe censée montrer une évolution réelle : il produirait une ligne plate (le total actuel répété sur tous les mois passés).

**Décision : la route `analytics/charges` (et `analytics/pret`) n'utilisent PAS la logique de `balance.ts`.** Elles ont leur propre requête, définie en section 4.5 (charges) et 4.4+section suivante (prêt), qui exploite les seules données réellement disponibles (`createdAt`/`updatedAt`/`active` pour les charges ; `remainingCents`/`monthlyPaymentCents`/`annualRateBps`/`createdAt` pour les prêts) pour produire une **vraie courbe qui varie dans le temps**, plutôt qu'une ligne plate.

Cette courbe reste toutefois une **reconstruction estimée, pas un historique enregistré**, pour deux raisons distinctes selon le type :

**Charges fixes** — `FixedCharge` n'a aucune table d'historique : pas de log des changements de montant (le montant actuel est utilisé pour tous les mois passés où la charge est considérée active, même si son montant a changé depuis), pas de log des activations/désactivations successives (seule la dernière transition est visible via `updatedAt`+`active`), et une suppression physique de charge est totalement invisible (aucune trace en base). `createdAt` reste une borne basse fiable ("cette charge n'existait pas avant telle date"), ce qui permet une bien meilleure approximation qu'une ligne plate — mais ce n'est pas un historique exact.

**Prêt** — même limite : `remainingCents`, `monthlyPaymentCents`, `annualRateBps` et `endDate` sont tous éditables sans log (`PATCH /api/loans/[id]`), et chaque paiement (`POST /api/loans/[id]/payment`) mute `remainingCents` instantanément sans créer de ligne datée. Seule la valeur actuelle de `remainingCents` (à l'instant de la requête) est certaine. La courbe est reconstruite par simulation d'amortissement **en arrière** à partir de cette valeur certaine, en supposant `monthlyPaymentCents`/`annualRateBps` constants depuis la création du prêt (hypothèse qui peut être fausse si ces champs ont été édités, ou si des remboursements anticipés ponctuels ont eu lieu — la simulation ne peut pas les détecter).

Fonction pure à ajouter dans `backend/finance.ts` (aux côtés de `computeRemainingMonths`/`simulateEarlyRepayment`, mêmes conventions : pas de Prisma, testable unitairement) :

```ts
/** Reconstruit une estimation mois par mois du capital restant dû d'un prêt,
 * ancrée sur la vraie valeur actuelle de remainingCents et remontant le temps
 * en inversant la formule d'amortissement, en supposant monthlyPaymentCents
 * et annualRateBps constants depuis la création du prêt. C'est une
 * reconstruction, pas un historique enregistré : elle ne peut pas détecter
 * un remboursement anticipé passé ni un changement de mensualité/taux. Le
 * dernier point (mois courant) est la seule valeur exacte (non estimée) de
 * la série. */
export function reconstructLoanBalanceHistory(params: {
  currentRemainingCents: number;
  monthlyPaymentCents: number;
  annualRateBps: number;
  loanCreatedMonth: string; // "YYYY-MM"
  currentMonth: string;     // "YYYY-MM"
}): { month: string; remainingCents: number }[]
```

Logique attendue (à implémenter par l'agent backend) : `balance[currentMonth] = currentRemainingCents` ; en remontant mois par mois jusqu'à `loanCreatedMonth` inclus, `balance[prevMonth] = round((balance[month] + monthlyPaymentCents) / (1 + monthlyRate))` avec `monthlyRate = annualRateBps / 10_000 / 12` (ou `balance[month] + monthlyPaymentCents` si `monthlyRate === 0`) ; clamp à 0 minimum ; retourner le tableau réordonné chronologiquement. `analytics/pret` fixe donc `meta.estimated = true` **systématiquement**, avec un caveat qui précise que seul le dernier point est une vraie valeur.

**Textes `caveat` par défaut (à affiner par l'agent design/frontend, pas figés) :**
- Charges : *"Cette courbe est une estimation basée sur les charges actuellement enregistrées et leur date d'ajout — les suppressions ou changements de montant antérieurs à aujourd'hui ne sont pas garantis d'être reflétés avec exactitude."*
- Prêt : *"Cette courbe est une reconstruction estimée à partir des paramètres actuels du prêt (mensualité, taux) — elle ne peut pas détecter d'éventuels remboursements anticipés passés. Seul le point du mois en cours reflète le montant réellement restant dû."*

**Épargne — cas intermédiaire, décision incluse ici par cohérence :** `SavingsGoal.currentCents` (source de vérité affichée partout dans l'app) peut diverger de la somme des `SavingsContribution` si l'utilisateur a défini un `currentCents` initial à la création d'un objectif, ou l'a modifié via `PATCH`. Fonction pure à ajouter dans `backend/finance.ts` :

```ts
/** Additionne les flux mensuels déjà agrégés en DB (pas de re-sommation de
 * lignes brutes) en un cumul, puis réconcilie le dernier point avec le total
 * actuel réellement affiché ailleurs dans l'app (SavingsGoal.currentCents) :
 * tout écart (ajustement manuel non horodaté, currentCents initial fixé à la
 * création d'un objectif) est imputé au premier mois de la série plutôt que
 * réparti arbitrairement sur plusieurs mois. */
export function reconcileSavingsCumulative(params: {
  monthlyFlowsCents: { month: string; amountCents: number }[]; // triés chronologiquement
  authoritativeTotalCents: number;
}): { cumulativePoints: { month: string; valueCents: number }[]; estimated: boolean }
```

`estimated` vaut `true` seulement si un écart non nul a dû être imputé (sinon `false` — la majorité des utilisateurs qui n'ont jamais édité `currentCents` manuellement auront une courbe d'épargne 100% exacte, sans caveat inutile). Le flux mensuel brut (`points`, non cumulé) reste toujours `estimated: false` car chaque `SavingsContribution` individuelle est réellement datée.

---

## 6. Sécurité / RGPD

- **Isolation stricte par `userId`** : chaque requête Prisma listée en section 4 filtre sur `userId` du `getCurrentUser()` courant — aucune n'accepte un `userId` en paramètre d'URL/body. Pattern identique au reste de l'app.
- **IDOR sur `loanId`** : `type=pret` doit vérifier `loan.userId === user.id` avant tout calcul, avec un **404** générique ("Introuvable") en cas d'échec — jamais un 403, qui confirmerait l'existence du prêt d'un autre utilisateur à un tiers malveillant. Même garde que `getOwnedLoan` (`app/api/loans/[id]/route.ts`).
- **Étanchéité avec la fonctionnalité foyer (`PartnerLink`/household)** : `analytics/*` ne doit **jamais** agréger les données d'un partenaire lié, même accepté. Seule la route dédiée `/api/household/summary` (Phase 12) a le droit de combiner plusieurs utilisateurs, et seulement après acceptation mutuelle. Point à documenter en commentaire dans `backend/queries/analytics.ts` pour qu'un futur ajout de "vue analytics du foyer" ne réutilise pas ces fonctions par erreur sans reproduire les vérifications de consentement de `household.ts`.
- **Minimisation des données exposées** : les réponses ne renvoient que des sommes agrégées (`date`/`month` + `valueCents`), jamais de lignes brutes (labels de dépenses, catégories, noms de charges) — réduit la surface si la réponse est un jour mise en cache ou loguée par erreur.
- **Pas de log de données financières en clair** : respecter la règle déjà en place (aucun `console.*` sur des montants/labels) dans les nouvelles fonctions `backend/queries/analytics.ts`.
- **Montants en centimes (integer)** partout, aucun `float` — cohérent avec `centsField`/`signedCentsField` (`backend/validations/money.ts`), déjà utilisés dans tout le projet.
- **Validation des query params avec zod**, nouveau fichier `backend/validations/analytics.ts` (`type`, `granularite`, `month`, `loanId`), suivant exactement le pattern `safeParse` + 400 "Entrée invalide" déjà utilisé dans toutes les routes existantes.
- **Aucune modification de schéma** = aucun nouveau risque de migration/donnée orpheline pour l'audit RGPD déjà réalisé en Phase 13 (export de compte, suppression en cascade) — ce plan ne touche à aucun de ces mécanismes.

---

## 7. Fichiers à créer/modifier (résumé pour l'agent backend)

- `app/api/analytics/[type]/route.ts` — nouvelle route, auth + validation zod + dispatch vers `backend/queries/analytics.ts`.
- `backend/validations/analytics.ts` — nouveau, schémas zod pour `granularite`/`month`/`loanId`.
- `backend/queries/analytics.ts` — nouveau, une fonction par type (`getDepensesAnalytics`, `getRevenuAnalytics`, `getEpargneAnalytics`, `getPretAnalytics`, `getChargesAnalytics`) + un helper `firstDataMonth` partagé. Réutilise `monthRange`/`currentMonthValue` de `backend/queries/balance.ts` et `shiftMonth`/`toMonthString` de `backend/dateUtils.ts` — ne pas les redéfinir.
- `backend/finance.ts` — ajouter `reconstructLoanBalanceHistory` et `reconcileSavingsCumulative` (fonctions pures, aux côtés des fonctions existantes ; à couvrir par des tests unitaires par l'agent `test`, même convention que le reste du fichier).
- `backend/dateUtils.ts` — ajouter un helper `daysInMonth(month: string): number` pour le remplissage dense de la vue journalière des dépenses.
- `backend/types.ts` — ajouter les types listés en section 3.

Aucune modification de `prisma/schema.prisma` n'est nécessaire pour ce plan.

**Recommandation future (hors scope, à ne PAS faire maintenant)** : pour supprimer complètement les caveats "estimé" sur les courbes Charges et Prêt, une phase ultérieure pourrait ajouter une historisation légère (ex. un modèle `LoanPayment` créé à chaque paiement au lieu de muter `remainingCents` directement, et un log de changement pour `FixedCharge` à chaque création/modification/désactivation). Non nécessaire pour livrer cette fonctionnalité — à évaluer seulement si les utilisateurs signalent que la précision actuelle est insuffisante.
