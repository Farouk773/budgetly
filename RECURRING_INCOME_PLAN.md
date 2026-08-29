# Plan — Revenu récurrent (`Income.isRecurring`), sur le modèle de `FixedCharge.active`

Statut : plan d'architecture, à exécuter par l'agent `backend` puis l'agent `frontend`.
Ne modifie aucun fichier hors de ce document.

## 0. Décision produit (rappel, actée avec l'utilisateur)

Un `Income` peut être marqué "récurrent" via une case à cocher au moment de
l'ajout (et modifiable après coup). Un revenu récurrent avec `periodMonth` =
mois de départ est compté pour CE mois **et tous les mois suivants**, sans
qu'il faille le ressaisir — calculé "en direct" à chaque requête, exactement
comme `FixedCharge.active` (pas de génération d'une ligne par mois, pas de
job planifié). Un revenu ponctuel (`isRecurring = false`, valeur par défaut)
continue de ne compter que pour son `periodMonth` exact, comportement actuel
inchangé.

**Limite connue et acceptée**, identique à celle déjà documentée pour
`FixedCharge` : désactiver, modifier le montant ou déplacer le `periodMonth`
d'un revenu récurrent recalcule aussi les mois passés avec la configuration
actuelle plutôt que de préserver l'historique réel. Ce n'est **pas** un bug à
corriger ici (hors scope) — c'est le même compromis produit déjà accepté pour
les charges fixes ; l'introduire de façon symétrique pour les revenus évite
une incohérence où l'un serait "mieux historisé" que l'autre.

---

## 1. Schéma Prisma

Dans `prisma/schema.prisma`, ajouter un champ sur `Income` (pas de nouveau
modèle — contrairement à `LoanPayment`, il n'y a ici aucune notion
d'événement daté à historiser, juste un flag de comportement, exactement le
rôle que joue `FixedCharge.active`) :

```prisma
model Income {
  id                  String     @id @default(cuid())
  userId              String
  user                User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  type                IncomeType
  label               String?
  netAmountCents      Int
  grossAmountCents    Int?
  contributionsCents  Int?
  bonusCents          Int?
  overtimeCents       Int?
  periodMonth         DateTime
  // When true, this income is counted every month from `periodMonth`
  // (inclusive) onward, not just for that one month — same "computed live,
  // no per-month row generated" model as FixedCharge.active. `periodMonth`
  // becomes the recurrence's start month in that case. Known limitation
  // (shared with FixedCharge): editing amount/periodMonth/isRecurring later
  // recomputes past months too, it does not preserve point-in-time history.
  isRecurring         Boolean    @default(false)
  payslipOriginalName String?
  payslipStoredName   String?
  payslipMimeType     String?
  createdAt           DateTime   @default(now())
  updatedAt           DateTime   @updatedAt

  @@index([userId])
}
```

- Nom du champ : `isRecurring` (plutôt que `recurring` ou `active`) — cohérent
  avec le style booléen `is*` déjà utilisé nulle part explicitement dans ce
  schéma, mais c'est le nom le plus explicite pour lire le code appelant
  (`isRecurring: true` se lit sans ambiguïté ; `active: true` sur un `Income`
  aurait été confus avec "revenu actif" qui ne veut rien dire). Choix
  documenté, pas une convention préexistante à respecter à l'identique.
- `@default(false)` non nullable : migration additive pure, toutes les lignes
  `Income` existantes deviennent `isRecurring = false` automatiquement (aucun
  backfill à écrire) — comportement strictement inchangé pour tout revenu
  déjà enregistré, exactement comme `Currency` l'a fait pour `User`.
- Pas de nouvel index nécessaire : les requêtes filtrent toujours d'abord par
  `userId` (déjà indexé) puis par `periodMonth`/`isRecurring`, sur un volume
  par utilisateur trop faible pour justifier un index composite.
- **Migration** : `npx prisma migrate dev --name add_income_is_recurring`.

---

## 2. Nouveau calcul de `incomeCents` dans `getMonthlyBudget`

Fichier : `backend/queries/balance.ts`.

Remplacer l'agrégation unique actuelle :
```ts
prisma.income.aggregate({
  where: { userId, periodMonth: range },
  _sum: { netAmountCents: true },
}),
```
par **deux** agrégations distinctes, sommées ensuite en JS (pattern déjà
utilisé dans ce même fichier pour combiner plusieurs `_sum` en un seul
nombre) :

```ts
const [nonRecurringIncomeAgg, recurringIncomeAgg, expenseAgg, activeFixedCharges, loanPaymentAgg] =
  await Promise.all([
    // One-off incomes: only the exact month they were declared for.
    prisma.income.aggregate({
      where: { userId, isRecurring: false, periodMonth: range },
      _sum: { netAmountCents: true },
    }),
    // Recurring incomes: counted every month from their start month
    // (periodMonth) onward — `periodMonth < range.lt` covers "started this
    // month or any earlier month", exactly the FixedCharge.active model but
    // anchored to a start date instead of being unconditionally always-on.
    prisma.income.aggregate({
      where: { userId, isRecurring: true, periodMonth: { lt: range.lt } },
      _sum: { netAmountCents: true },
    }),
    prisma.expense.aggregate({ where: { userId, date: range }, _sum: { amountCents: true } }),
    prisma.fixedCharge.aggregate({ where: { userId, active: true }, _sum: { amountCents: true } }),
    prisma.loanPayment.aggregate({ where: { userId, date: range }, _sum: { amountCents: true } }),
  ]);

const incomeCents =
  (nonRecurringIncomeAgg._sum.netAmountCents ?? 0) +
  (recurringIncomeAgg._sum.netAmountCents ?? 0);
```

**Pas de double comptage** : le premier filtre exige `isRecurring: false`,
donc un revenu récurrent ne peut jamais matcher la première requête. Le
second filtre n'a pas de borne basse sur `periodMonth` (volontaire — un
revenu récurrent démarré il y a 6 mois doit toujours compter aujourd'hui),
seulement `periodMonth: { lt: range.lt }` pour exclure un revenu récurrent
dont le mois de départ est *futur* par rapport au mois affiché (ex. un
revenu récurrent créé avec un `periodMonth` en avance ne doit pas compter
avant son démarrage — cohérent avec la sémantique "compté à partir de son
mois de départ").

Le reste de `getMonthlyBudget` (`computeMonthlyAvailableCents`,
`suggestSavingsCents`, `getRunningBalance`, `getDeclaredBalance`) ne change
pas — ces fonctions consomment `incomeCents` déjà agrégé, indifférentes à sa
provenance. Aucun changement dans `backend/finance.ts` ni dans
`backend/finance.test.ts` (les tests passent `incomeCents` directement en
paramètre).

---

## 3. Impact en cascade — fichiers à corriger pour rester cohérents

Tout consommateur qui recalcule ses propres agrégats `Income`/`periodMonth`
(au lieu de simplement lire `budget.incomeCents` déjà calculé par
`getMonthlyBudget`) doit recevoir le même correctif, sous peine de
désynchronisation dès le 2ᵉ mois d'un revenu récurrent.

### 3.1 À corriger — logique de calcul dupliquée

- **`backend/queries/analytics.ts` → `getRevenuAnalytics`** (courbe
  "Revenus" de `/incomes`). Aujourd'hui, une seule agrégation
  `prisma.income.aggregate({ where: { userId, periodMonth: monthRange(m) } })`
  par mois de la plage affichée. À remplacer par les deux mêmes agrégations
  que la section 2, par mois :
  ```ts
  const aggregates = await Promise.all(
    months.map((m) => {
      const range = monthRange(m);
      return Promise.all([
        prisma.income.aggregate({
          where: { userId, isRecurring: false, periodMonth: range },
          _sum: { netAmountCents: true },
        }),
        prisma.income.aggregate({
          where: { userId, isRecurring: true, periodMonth: { lt: range.lt } },
          _sum: { netAmountCents: true },
        }),
      ]);
    })
  );

  const points: AnalyticsPoint[] = months.map((m, i) => ({
    date: m,
    valueCents:
      (aggregates[i][0]._sum.netAmountCents ?? 0) +
      (aggregates[i][1]._sum.netAmountCents ?? 0),
  }));
  ```
  `anchorMonth`/`firstDataMonth` (basé sur `earliestIncome._min.periodMonth`)
  ne change pas — il ancre juste le début de la plage affichée, indépendant
  de la récurrence. Sans ce correctif, la courbe "Revenus" redeviendrait
  fausse dès le mois suivant la création d'un revenu récurrent (elle
  retomberait à 0 alors que `getMonthlyBudget` compte toujours le revenu) —
  c'est exactement le risque signalé dans la tâche.
  `meta.estimated` reste `false` : ce n'est pas une estimation, c'est un
  calcul exact, juste avec une règle de comptage différente de "somme brute
  par periodMonth".

- **`backend/queries/report.ts` → `getMonthlyReportData`** (alimente les
  exports PDF/Excel). La liste `incomes` (pas juste le total, qui vient déjà
  de `budget.incomeCents` via `getMonthlyBudget` — donc déjà correct) doit
  lister, pour le mois exporté, à la fois les revenus ponctuels de ce mois
  ET les revenus récurrents actifs à cette date, sinon le total du "Résumé"
  ne correspondrait plus aux lignes détaillées de la section "Revenus" du
  même document (incohérence visible directement par l'utilisateur dans son
  propre export). Remplacer :
  ```ts
  prisma.income.findMany({
    where: { userId, periodMonth: range },
    orderBy: { periodMonth: "asc" },
  }),
  ```
  par :
  ```ts
  prisma.income.findMany({
    where: {
      userId,
      OR: [
        { isRecurring: false, periodMonth: range },
        { isRecurring: true, periodMonth: { lt: range.lt } },
      ],
    },
    orderBy: { periodMonth: "asc" },
  }),
  ```
  Une seule requête Prisma avec `OR`, pas une boucle JS — même exigence que
  section 2. `backend/export/pdf.ts` et `backend/export/excel.ts` n'ont
  besoin d'**aucun changement de code** : ils consomment déjà `data.incomes`
  tel quel ; seul son contenu s'enrichit. Optionnel, laissé à l'appréciation
  de l'agent backend : ajouter `(récurrent)` après le libellé de chaque
  revenu récurrent dans la boucle PDF/Excel (`writer.line`/`incomeSheet.addRow`)
  pour que l'export reste lisible sans avoir besoin du badge visuel de l'app —
  non bloquant, l'information `income.isRecurring` sera de toute façon déjà
  présente sur l'objet une fois le type partagé étendu (section 5).

- **`app/(app)/dashboard/page.tsx`** — la requête `monthIncomes` qui
  alimente `QuickIncomeCard` (ligne ~74) a exactement le même défaut que
  `report.ts` : `prisma.income.findMany({ where: { userId: user.id,
  periodMonth: monthRange(month) } })`. Même correctif (`OR`), et voir
  section 6 pour la décision d'affichage associée (le composant doit aussi
  changer pour distinguer visuellement les lignes récurrentes).

### 3.2 Déjà cohérents sans aucun changement de code

- **`backend/queries/alerts.ts` (`getAlertsSnapshot`)** et
  **`backend/queries/household.ts` (`getHouseholdSummary` /
  `combineMonthlyBudgets`)** : consomment uniquement `budget.incomeCents`
  déjà agrégé par `getMonthlyBudget`, jamais de requête `Income` directe.
  Corrects automatiquement dès que la section 2 est appliquée.
- **`getRunningBalance`** (`backend/queries/balance.ts`) : reconstruit le
  solde cumulé en rappelant `getMonthlyBudget` mois par mois — corrigé
  automatiquement, aucun changement de code.
- **`app/(app)/incomes/page.tsx`** (historique complet, pas scopé à un mois)
  : la requête `prisma.income.findMany({ where: { userId } })` liste chaque
  ligne `Income` telle qu'elle existe en base, sans filtre de mois — un
  revenu récurrent y apparaît **une seule fois**, à son `periodMonth` de
  départ, ce qui est le comportement correct pour un historique de
  déclarations (voir section 6 pour la distinction avec les vues "mois par
  mois"). Aucun changement de requête nécessaire, seulement l'ajout d'un
  badge (section 6).
- **`app/api/incomes/route.ts` (`GET`)** et **`app/api/incomes/[id]/route.ts`
  (`GET`)** : mêmes requêtes non filtrées par mois, même raisonnement, aucun
  changement de requête.

### 3.3 Documentation à mettre à jour (non bloquant)

- `ANALYTICS_PLAN.md`, ligne ~13 (tableau des modèles source) et ~183-188
  (description de `getRevenuAnalytics`) décrivent aujourd'hui un calcul par
  `periodMonth` exact uniquement. À mettre à jour pour refléter la double
  agrégation de la section 3.1, dans le même esprit que la note ajoutée pour
  `LoanPayment` dans `LOAN_PAYMENTS_PLAN.md` section 7 — laissé à l'agent
  backend en fin de chantier, ne bloque pas l'implémentation.

---

## 4. Contrat API

### 4.1 Validation (`backend/validations/income.ts`)

Ajouter un champ `isRecurring` à `incomeFormSchema`, partagé par `POST
/api/incomes` (FormData, à cause de l'upload de fiche de paie) et `PATCH
/api/incomes/[id]` (JSON) — le projet a déjà pour convention d'envoyer tous
les champs comme des chaînes dans les deux cas (ex. `netAmountCents:
String(netAmountCents)` même dans le corps JSON de `EditIncomeForm`), donc
`isRecurring` suit la même convention plutôt que d'introduire un type mixte
`boolean | string` dans un schéma partagé :

```ts
export const isRecurringField = z
  .enum(["true", "false"])
  .optional()
  .transform((v) => v === "true");

export const incomeFormSchema = z.object({
  type: z.enum(["SALARY", "FREELANCE", "OTHER"]),
  label: z.string().trim().max(120).optional().transform((v) => (v === "" ? undefined : v)),
  netAmountCents: centsField,
  grossAmountCents: optionalCentsField,
  contributionsCents: optionalCentsField,
  bonusCents: optionalCentsField,
  overtimeCents: optionalCentsField,
  periodMonth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isRecurring: isRecurringField,
});
```

- Absent (checkbox non cochée, `FormData` ne contient jamais une clé pour une
  case non cochée si le front ne l'ajoute pas explicitement) → `undefined` →
  `transform` renvoie `false`. Comportement par défaut sûr : un formulaire
  qui oublierait d'envoyer le champ crée un revenu ponctuel, jamais un
  revenu récurrent silencieux.
- `PATCH` doit permettre de désactiver la récurrence après coup : le
  frontend (`EditIncomeForm`) doit toujours envoyer explicitement
  `isRecurring: String(isRecurring)` (jamais omettre le champ), sinon un
  `PATCH` partiel réactiverait accidentellement `false` sur un revenu
  actuellement récurrent. **Point d'attention pour l'agent backend** :
  contrairement à `fixedChargeInputSchema.partial()` utilisé tel quel dans
  `PATCH /api/fixed-charges/[id]`, la route `PATCH /api/incomes/[id]`
  n'utilise **pas** `.partial()` aujourd'hui — elle exige déjà tous les
  champs obligatoires à chaque `PATCH` (`incomeFormSchema.safeParse(body)`
  brut). Garder ce même contrat "PATCH complet" pour `isRecurring` : pas de
  `.optional()` sans transform par défaut qui laisserait planer une
  ambiguïté, le champ suit la même règle que `type`/`netAmountCents`/etc.
  déjà obligatoires sur ce endpoint.

### 4.2 `POST /api/incomes`

Aucun changement de signature HTTP (toujours `multipart/form-data`), un champ
`isRecurring` optionnel ajouté au `FormData` :
```ts
const parsed = incomeFormSchema.safeParse({
  type: form.get("type"),
  label: form.get("label") ?? undefined,
  netAmountCents: form.get("netAmountCents"),
  grossAmountCents: form.get("grossAmountCents") ?? undefined,
  contributionsCents: form.get("contributionsCents") ?? undefined,
  bonusCents: form.get("bonusCents") ?? undefined,
  overtimeCents: form.get("overtimeCents") ?? undefined,
  periodMonth: form.get("periodMonth"),
  isRecurring: form.get("isRecurring") ?? undefined,   // <-- ajout
});
```
et propager `isRecurring: parsed.data.isRecurring` dans `prisma.income.create({ data: { ... } })`.

### 4.3 `PATCH /api/incomes/[id]`

Body JSON, ajouter `isRecurring: String(isRecurring)` (voir 4.1), propager
`isRecurring: parsed.data.isRecurring` dans `prisma.income.update({ data: { ... } })`.

### 4.4 Sécurité — aucune régression d'isolation `userId`

- Les deux nouvelles agrégations Prisma (section 2 et 3.1) filtrent toujours
  `userId` en première clause de `where`, identique au reste du fichier —
  aucune requête n'agrège entre utilisateurs.
- `getOwnedIncome(userId, id)` (déjà présent dans
  `app/api/incomes/[id]/route.ts`) continue de vérifier `income.userId ===
  userId` avant tout `PATCH`/`DELETE`/`GET` — `isRecurring` n'introduit
  aucun nouveau chemin d'accès, c'est un champ modifié via le même
  `prisma.income.update({ where: { id } })` déjà protégé par cette
  vérification en amont.
- `isRecurring` n'est jamais un identifiant ni une donnée permettant de
  cibler un autre utilisateur — pas de risque IDOR spécifique à ce champ.

---

## 5. Types partagés (`backend/types.ts`, `backend/serializers/income.ts`)

```ts
export type Income = {
  id: string;
  type: IncomeType;
  label: string | null;
  netAmountCents: number;
  grossAmountCents: number | null;
  contributionsCents: number | null;
  bonusCents: number | null;
  overtimeCents: number | null;
  periodMonth: string;
  isRecurring: boolean;   // <-- ajout
  payslipOriginalName: string | null;
  createdAt: string;
};
```

`backend/serializers/income.ts` → `toIncomeDto` : ajouter `isRecurring:
income.isRecurring` (champ déjà booléen côté Prisma, aucune conversion
nécessaire — contrairement à `periodMonth`/`createdAt` qui passent par
`.toISOString()`).

---

## 6. Décision d'affichage — badge et réapparition mensuelle

### 6.1 Badge visuel

Sur `/incomes` (`app/(app)/incomes/page.tsx`) et dans `QuickIncomeCard`
(dashboard), ajouter un badge pastille cohérent avec le style déjà utilisé
dans le projet pour les badges d'état (`MotivationCard.tsx`,
`AnalyticsHeadline.tsx` — pas de composant `Badge` partagé, convention =
`<span>` inline avec `rounded-full` + fond `indigo-50`/`indigo-500/10`) :

```tsx
{income.isRecurring && (
  <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
    Récurrent
  </span>
)}
```

Placé à côté du badge de type déjà existant sur `/incomes`
(`INCOME_TYPE_LABELS[income.type]`, ligne ~55-57) et à côté du libellé dans
`QuickIncomeCard` (ligne ~87).

### 6.2 Réapparition dans les listes mensuelles — tranché

**Décision : un revenu récurrent DOIT réapparaître littéralement dans la
liste de chaque mois où il s'applique** (dashboard `QuickIncomeCard`, export
PDF/Excel section "Revenus"), pas seulement compter dans le total sans
apparaître.

Raisonnement : c'est exactement le comportement déjà choisi pour
`FixedCharge` sur `/fixed-charges` — cette page liste toutes les charges
actives à chaque visite, pas seulement celles créées ce mois-ci-là (il n'y a
même pas de notion de "mois" sur cette page, elle est volontairement
intemporelle). Reproduire l'inverse pour les revenus (le total du budget
inclut le revenu récurrent mais la liste "Revenus de ce mois" resterait
vide) créerait une incohérence visible et déroutante : l'utilisateur verrait
un solde qui bouge sans qu'aucune ligne ne l'explique dans la liste juste
au-dessus. Puisque `QuickIncomeCard` est déjà scopée "par mois" (contrairement
à `/fixed-charges`), la traduction correcte de la règle `FixedCharge` dans ce
contexte est : chaque mois où le revenu récurrent s'applique, il apparaît
comme une ligne de la liste de ce mois — avec le badge "Récurrent" pour que
l'utilisateur comprenne immédiatement pourquoi il voit une ligne qu'il n'a
pas ressaisie.

Conséquence concrète pour `QuickIncomeCard.tsx` : aucun changement de
structure du composant lui-même (il reçoit déjà `incomes: Income[]` en
prop et les affiche telles quelles) — seul le contenu de la prop change
(section 3.1, requête `OR` dans `dashboard/page.tsx`), plus l'ajout du badge
(section 6.1). Idem pour la section "Revenus" des exports PDF/Excel
(section 3.1) : les lignes récurrentes des mois précédents apparaissent
désormais dans l'export de chaque mois concerné, avec la mention optionnelle
`(récurrent)`.

**Ce qui NE change PAS** : `/incomes` (l'historique complet, non scopé à un
mois) continue de lister chaque `Income` **une seule fois**, à son
`periodMonth` de départ (section 3.2) — cette page répond à la question "quels
revenus ai-je déclarés et quand", pas "qu'est-ce qui compte ce mois-ci". Les
deux pages répondent à des questions différentes et peuvent légitimement
avoir un contenu différent pour un même revenu récurrent : une seule
apparition sur `/incomes` (déclaration), plusieurs apparitions sur le
dashboard/exports mois par mois (effet budgétaire).

### 6.3 Formulaires — case à cocher

`app/(app)/incomes/new/page.tsx`, `components/incomes/EditIncomeForm.tsx`,
`components/dashboard/QuickIncomeCard.tsx` : ajouter une case à cocher
"Revenu récurrent (même montant chaque mois)" avec un texte d'aide court en
dessous, dans le même registre que le texte déjà présent sous le champ
fiche de paie de `new/page.tsx` :
> *"Compté automatiquement chaque mois à partir de {mois choisi ci-dessus},
> jusqu'à ce que tu le modifies ou décoches cette case."*

Sur `EditIncomeForm.tsx`, la case reflète `income.isRecurring` et reste
modifiable (activer ou désactiver la récurrence après coup) — contrat déjà
couvert par la section 4.3.

---

## 7. Sécurité / RGPD

- Aucune nouvelle donnée sensible introduite : `isRecurring` est un simple
  indicateur de comportement, pas une donnée personnelle ou financière en
  tant que telle (le montant `netAmountCents` associé, lui, reste soumis
  aux mêmes règles déjà en place : jamais loggé en clair, toujours en
  centimes).
- Voir section 4.4 pour la vérification explicite qu'aucune requête ne perd
  son filtre `userId` avec ce changement — les deux nouvelles agrégations
  (sections 2 et 3.1) suivent scrupuleusement le même `where: { userId,
  ... }` que les requêtes qu'elles remplacent.
- Pas de nouvelle surface d'export/partage : `isRecurring` traverse les
  mêmes endpoints déjà authentifiés et scopés par session (`GET`/`POST`
  `/api/incomes`, `PATCH`/`DELETE` `/api/incomes/[id]`), aucun nouvel
  endpoint créé.

---

## 8. Tests existants à vérifier/mettre à jour

- **`backend/validations/income.test.ts`** — à étendre avec des cas pour
  `isRecurring` :
  - absent du payload → `result.data.isRecurring === false` (comportement
    par défaut sûr, section 4.1).
  - `"true"` → `true`, `"false"` → `false`.
  - une valeur arbitraire (ex. `"oui"`) → `safeParse` doit échouer (`z.enum`
    rejette tout ce qui n'est pas exactement `"true"`/`"false"`), pour
    vérifier qu'aucune valeur imprévue n'est silencieusement coercée.
- **`backend/finance.test.ts`** — **aucun changement requis.** Toutes les
  assertions passent déjà `incomeCents` en paramètre direct aux fonctions
  pures (`computeMonthlyAvailableCents`, `combineMonthlyBudgets`,
  `projectEndOfMonthCents`), indifférentes à la façon dont ce nombre a été
  agrégé en amont.
- **Aucun test unitaire n'existe aujourd'hui** pour `getMonthlyBudget`,
  `getRevenuAnalytics` ou `getMonthlyReportData` eux-mêmes (fonctions qui
  touchent la DB, hors du périmètre des tests Vitest actuels qui ne testent
  que des fonctions pures et des schémas zod — même constat que dans
  `LOAN_PAYMENTS_PLAN.md` section 9). **Aucun test cassé** par ce
  changement au sens strict.
- **Tests à ajouter** (recommandé à l'agent `test`, non bloquant) :
  - Un cas d'intégration DB pour `getMonthlyBudget` : *"un revenu récurrent
    créé le mois M est compté pour M et M+1 sans être ressaisi"* et *"un
    revenu récurrent créé le mois M+1 (futur par rapport au mois affiché)
    ne compte pas pour M"* — couvre directement la règle `periodMonth: {
    lt: range.lt }` de la section 2.
  - Un cas équivalent pour `getRevenuAnalytics` : *"la courbe reste à la
    valeur du revenu récurrent sur tous les mois suivants sa création, pas
    seulement le mois de création"* — c'est précisément la régression que
    la section 3.1 corrige préventivement.

---

## 9. Récapitulatif — fichiers à toucher, dans l'ordre

**Backend (agent `backend`) :**
1. `prisma/schema.prisma` — champ `Income.isRecurring` (section 1).
2. Migration Prisma (`npx prisma migrate dev --name add_income_is_recurring`).
3. `backend/validations/income.ts` — `isRecurringField` + extension de
   `incomeFormSchema` (section 4.1). Mettre à jour
   `backend/validations/income.test.ts` (section 8).
4. `backend/types.ts` — ajouter `isRecurring: boolean` à `Income` (section 5).
5. `backend/serializers/income.ts` — propager `isRecurring` dans
   `toIncomeDto` (section 5).
6. `app/api/incomes/route.ts` — lire `isRecurring` depuis le `FormData`,
   propager à `prisma.income.create` (section 4.2).
7. `app/api/incomes/[id]/route.ts` — propager `isRecurring` à
   `prisma.income.update` (section 4.3).
8. `backend/queries/balance.ts` — double agrégation `incomeCents` dans
   `getMonthlyBudget` (section 2).
9. `backend/queries/analytics.ts` — double agrégation par mois dans
   `getRevenuAnalytics` (section 3.1).
10. `backend/queries/report.ts` — requête `OR` dans `getMonthlyReportData`
    (section 3.1).
11. `app/(app)/dashboard/page.tsx` — requête `OR` pour `monthIncomes`
    (section 3.1, côté requête serveur uniquement — la partie JSX de ce
    fichier n'a pas besoin de changer, `QuickIncomeCard` reçoit déjà la
    prop `incomes`).
12. (Optionnel) `backend/export/pdf.ts` / `backend/export/excel.ts` —
    mention `(récurrent)` dans les lignes de revenu (section 3.1, non
    bloquant).
13. (Optionnel, note seulement) `ANALYTICS_PLAN.md` — mise à jour de la
    description de `getRevenuAnalytics` (section 3.3).

**Frontend (agent `frontend`), après validation du backend :**
1. `app/(app)/incomes/new/page.tsx` — case à cocher "Revenu récurrent" +
   texte d'aide (section 6.3).
2. `components/incomes/EditIncomeForm.tsx` — case à cocher reflétant/
   modifiant `income.isRecurring`, toujours envoyée explicitement dans le
   `PATCH` (section 4.1, 4.3, 6.3).
3. `components/dashboard/QuickIncomeCard.tsx` — case à cocher dans le mini
   formulaire d'ajout + badge "Récurrent" sur les lignes de la liste
   (section 6.1, 6.3).
4. `app/(app)/incomes/page.tsx` — badge "Récurrent" à côté du badge de type
   existant, aucune autre modification (section 6.1, 3.2).

Aucun nouveau composant partagé (`Badge`) n'est créé dans ce chantier — le
projet n'en a pas et n'en introduit pas ailleurs (`MotivationCard`,
`AnalyticsHeadline` utilisent déjà des `<span>` inline) ; rester cohérent
avec cette convention plutôt que d'ouvrir un nouveau pattern UI pour une
seule fonctionnalité.
