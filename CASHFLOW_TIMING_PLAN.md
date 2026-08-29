# Plan — Risque de trésorerie temporaire (`Income.payDay` + `computeCashFlowTimingRisk`)

Statut : plan d'architecture, à exécuter par l'agent `backend` puis l'agent `frontend`.
Ne modifie aucun fichier hors de ce document.

## 0. Décision produit (rappel, actée avec l'utilisateur)

Le modèle actuel raisonne uniquement en **total mensuel** : `getAlertsSnapshot` /
`computeOverdraftRisk` (`backend/alerts.ts`) comparent l'argent réellement
disponible maintenant (`currentCashOnHandCents`) aux engagements théoriques du
mois (`budget.fixedChargesCents + remainingLoanCommitmentCents`), sans jamais
regarder **quel jour** chaque euro rentre ou sort. Deux personnes avec le même
total mensuel positif peuvent vivre des situations opposées si l'une est payée
le 1er et l'autre le 28 — un loyer prélevé le 1er peut mettre à découvert
quelqu'un payé le 28 pendant presque tout le mois, sans que l'alerte actuelle
ne le détecte jamais (elle ne regarde que le solde du jour de la requête vs.
le total du mois).

**Solution actée** : ajouter un jour de versement habituel (`Income.payDay`,
optionnel) et une **nouvelle alerte distincte** de "risque de trésorerie
temporaire", qui simule jour par jour, jusqu'à la fin du mois en cours
uniquement, l'ordre réel d'arrivée des sorties datées (charges fixes + prêts,
qui ont déjà `dayOfMonth`/`dueDayOfMonth`) et des entrées datées (revenus,
avec le nouveau `payDay`). Les deux alertes ne se déclenchent **jamais**
ensemble pour le même mois (voir section 3.3 — preuve mathématique, pas
seulement une convention documentée).

---

## 1. Schéma Prisma

Dans `prisma/schema.prisma`, ajouter un champ optionnel sur `Income` :

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
  isRecurring         Boolean    @default(false)
  // Jour habituel de versement (1-31), optionnel — utilisé uniquement par le
  // calcul de risque de trésorerie temporaire (backend/alerts.ts) pour situer
  // CE revenu dans le mois plutôt que de supposer qu'il est disponible dès le
  // 1er. Nullable : un revenu ponctuel peut être ajouté sans qu'on connaisse
  // encore son jour exact, et un revenu déjà passé n'a pas besoin d'en avoir
  // un. Pas de contrainte @@check en base (Prisma ne le permet pas nativement
  // ici sans SQL brut) — la borne [1, 31] est validée côté zod
  // (`backend/validations/income.ts`), comme le reste des champs numériques
  // de ce formulaire.
  payDay              Int?
  payslipOriginalName String?
  payslipStoredName   String?
  payslipMimeType     String?
  createdAt           DateTime   @default(now())
  updatedAt           DateTime   @updatedAt

  @@index([userId])
}
```

- Nullable, pas de `@default` : migration purement additive, toutes les lignes
  `Income` existantes deviennent `payDay = NULL` automatiquement, aucun
  backfill, comportement d'affichage/calcul inchangé tant que l'utilisateur ne
  renseigne rien (le calcul traite `NULL` par une hypothèse par défaut
  explicite côté fonction pure, voir section 2 — la valeur par défaut vit dans
  le code métier, pas en base, pour rester testable/documentée à un seul
  endroit).
- Pas de nouvel index : `payDay` n'est jamais filtré en base (`WHERE`), il est
  seulement lu avec le reste de la ligne dans une requête déjà filtrée par
  `userId`/`periodMonth`/`isRecurring` (section 3.1) — un index dédié
  n'apporterait rien.
- **Migration** : `npx prisma migrate dev --name add_income_pay_day`.

---

## 2. Algorithme — `computeCashFlowTimingRisk`

### 2.1 Correction de l'emplacement demandé dans la tâche

La tâche demande de placer la fonction dans `backend/finance.ts`, à côté de
`computeOverdraftRisk`. **Ce n'est pas exact** : `computeOverdraftRisk` (et
`daysUntilDue`) vivent en réalité dans `backend/alerts.ts` (testés dans
`backend/alerts.test.ts`), pas dans `backend/finance.ts` (qui contient les
calculs de budget/amortissement/épargne — un domaine différent, sans notion de
jour). La nouvelle fonction est un calcul de **risque d'alerte daté**,
exactement le rôle déjà tenu par `daysUntilDue`/`computeOverdraftRisk` :
**elle doit donc aller dans `backend/alerts.ts`**, avec ses tests dans
`backend/alerts.test.ts`, pas dans `finance.ts`/`finance.test.ts`. Reste une
fonction pure (pas de Prisma dedans), même exigence que le reste du fichier.

### 2.2 Contrat de la fonction

```ts
// backend/alerts.ts

export type DatedOutflow = {
  label: string;
  dayOfMonth: number; // FixedCharge.dayOfMonth ou Loan.dueDayOfMonth, tel quel (pas encore borné au mois)
  amountCents: number;
};

export type DatedInflow = {
  label: string;
  payDay: number | null; // Income.payDay ; null = jour inconnu
  amountCents: number;
};

export type CashFlowTimingRisk = {
  atRisk: boolean;
  worstDayOfMonth: number | null; // jour du creux le plus bas, null si atRisk=false
  shortfallCents: number;         // montant du plus grand manque observé, 0 si atRisk=false
  recoversOnDay: number | null;   // premier jour après le creux où le solde simulé repasse >= 0
};

export function computeCashFlowTimingRisk(params: {
  // Même valeur EXACTE que `currentCashOnHandCents` calculé dans
  // `getAlertsSnapshot` et passée à `computeOverdraftRisk({ balanceCents })` —
  // c'est-à-dire : solde de départ du mois + tout ce qui a DÉJÀ bougé ce
  // mois-ci (revenus déclarés, dépenses faites, prêts déjà payés). Important :
  // cette valeur compte déjà la TOTALITÉ des revenus déclarés ce mois, y
  // compris un revenu récurrent compté "à l'avance" dès le 1er du mois par
  // `getMonthlyBudget`, alors qu'il n'arrive réellement que le `payDay`. La
  // fonction neutralise elle-même cet effet en avance (voir 2.3) — l'appelant
  // n'a rien à retraiter, il passe cette valeur telle quelle.
  currentCashOnHandCents: number;
  todayDayOfMonth: number;   // today.getUTCDate()
  daysInMonthCount: number;  // daysInMonth(month), déjà dans backend/dateUtils.ts
  outflows: DatedOutflow[];  // charges fixes actives (montant plein) + part de prêt encore due CE mois
  inflows: DatedInflow[];    // revenus comptés ce mois (ponctuels + récurrents actifs), avec leur payDay
}): CashFlowTimingRisk
```

### 2.3 Raisonnement, étape par étape

1. **Pourquoi la simulation démarre à "aujourd'hui" et pas au 1er du mois** :
   `currentCashOnHandCents` intègre déjà tout ce qui s'est passé depuis le
   début du mois (revenus déclarés, dépenses faites, prêts payés) — le
   retraiter depuis le 1er en y rejouant les mêmes événements les compterait
   deux fois. Les dépenses ponctuelles (`Expense`) ne sont donc **jamais**
   des événements datés de cette simulation : elles sont déjà "digérées" dans
   `currentCashOnHandCents`, exactement comme l'énonce la consigne.

2. **Le piège à neutraliser : le revenu du mois est déjà compté "en entier,
   dès aujourd'hui" dans `currentCashOnHandCents`.** `getMonthlyBudget`
   additionne `incomeCents` pour tout le mois sans notion de jour (un revenu
   récurrent "actif" est compté dès le 1er du mois par construction, voir
   `RECURRING_INCOME_PLAN.md`). C'est exactement le problème métier que cette
   fonctionnalité corrige : un salaire du 28 ne doit **pas** être traité comme
   déjà en poche le 1er. La fonction retire donc de `currentCashOnHandCents`
   la part des revenus **pas encore arrivés** à `todayDayOfMonth` (leur
   `payDay`, ou le dernier jour du mois par défaut — voir point 3), pour les
   réinjecter plus tard, au bon jour, pendant la simulation. C'est un
   raffinement de la valeur, pas un recalcul différent : sans information de
   jour, `computeOverdraftRisk` ne peut pas faire mieux que "tout est déjà
   là" ; avec `payDay`, cette fonction peut faire mieux, à partir de la même
   base.

3. **Revenu sans `payDay` renseigné → hypothèse prudente : dernier jour du
   mois.** Un revenu dont on ignore le jour de versement est traité comme
   "pas encore arrivé" jusqu'au dernier jour possible — pire cas plausible.
   Mieux vaut une fausse alerte (revenu en réalité arrivé plus tôt) que de
   rater un vrai risque (revenu en réalité arrivé plus tard que supposé). Même
   logique de prudence que la consigne pour l'ordre sorties-avant-entrées à
   égalité de jour.

4. **Sorties déjà en retard (jour < aujourd'hui) : traitées comme dues
   immédiatement, pas ignorées.** Ce projet n'a aucune notion de "charge fixe
   payée" (voir commentaire existant dans `alerts.ts` : *"this app has no
   'mark this charge as paid' action"*) — une charge dont le jour est déjà
   passé ce mois-ci n'est donc jamais retirée de `currentCashOnHandCents`
   ailleurs dans le calcul. Si la simulation l'ignorait sous prétexte que son
   jour est dans le passé, elle ne serait **jamais** comptée nulle part dans
   ce calcul-ci, ce qui sous-estimerait le risque. Elle est donc appliquée dès
   `todayDayOfMonth` (`effectiveDay = max(dayOfMonth, todayDayOfMonth)`), même
   logique pour les prêts dont l'échéance est déjà passée mais pas encore
   payée (`LoanPayment` de ce mois insuffisant).

5. **Bornage au mois courant.** `payDay`/`dayOfMonth`/`dueDayOfMonth` peuvent
   valoir jusqu'à 31 alors que le mois affiché peut n'en compter que 28-30 :
   chaque jour est borné (`clamp`) à `[1, daysInMonthCount]`. Choix
   **délibérément différent** de `daysUntilDue` (qui, lui, laisse le
   dépassement rouler sur le mois suivant) : `daysUntilDue` répond à "dans
   combien de jours, potentiellement le mois prochain", cette fonction répond
   à "que se passe-t-il *dans le mois en cours*" — un événement du 31 dans un
   mois de 30 jours doit rester dans ce mois-ci (dernier jour), pas glisser au
   mois suivant.

6. **Simulation jour par jour, sorties avant entrées à égalité de jour**
   (hypothèse prudente demandée) :
   ```ts
   const clamp = (day: number) =>
     Math.min(Math.max(day, 1), params.daysInMonthCount);

   const pendingInflows = params.inflows
     .map((inc) => ({
       ...inc,
       effectiveDay: clamp(inc.payDay ?? params.daysInMonthCount),
     }))
     .filter((inc) => inc.effectiveDay >= params.todayDayOfMonth);

   const pendingInflowsCents = pendingInflows.reduce(
     (sum, inc) => sum + inc.amountCents,
     0
   );

   const outflowsByDay = new Map<number, number>();
   for (const o of params.outflows) {
     const day = Math.max(clamp(o.dayOfMonth), params.todayDayOfMonth);
     outflowsByDay.set(day, (outflowsByDay.get(day) ?? 0) + o.amountCents);
   }

   const inflowsByDay = new Map<number, number>();
   for (const inc of pendingInflows) {
     inflowsByDay.set(
       inc.effectiveDay,
       (inflowsByDay.get(inc.effectiveDay) ?? 0) + inc.amountCents
     );
   }

   let running = params.currentCashOnHandCents - pendingInflowsCents;
   const dailyBalances: { day: number; balanceCents: number }[] = [];
   for (let day = params.todayDayOfMonth; day <= params.daysInMonthCount; day++) {
     running -= outflowsByDay.get(day) ?? 0; // sorties d'abord
     running += inflowsByDay.get(day) ?? 0;  // entrées ensuite
     dailyBalances.push({ day, balanceCents: running });
   }

   let worst = dailyBalances[0];
   for (const point of dailyBalances) {
     if (point.balanceCents < worst.balanceCents) worst = point;
   }

   if (worst.balanceCents >= 0) {
     return { atRisk: false, worstDayOfMonth: null, shortfallCents: 0, recoversOnDay: null };
   }

   const recovery = dailyBalances.find(
     (p) => p.day > worst.day && p.balanceCents >= 0
   );

   return {
     atRisk: true,
     worstDayOfMonth: worst.day,
     shortfallCents: -worst.balanceCents,
     recoversOnDay: recovery ? recovery.day : null,
   };
   ```

### 2.4 Preuve : jamais de doublon avec l'alerte de découvert existante

Le dernier point de `dailyBalances` (jour = `daysInMonthCount`) vaut :

```
running_final = (currentCashOnHandCents - pendingInflowsCents)
              - Σ(outflows)
              + pendingInflowsCents
              = currentCashOnHandCents - Σ(outflows)
```

Or `Σ(outflows)` (charges fixes actives, montant plein + part encore due de
chaque prêt ce mois) est **exactement** `budget.fixedChargesCents +
remainingLoanCommitmentCents`, c'est-à-dire `upcomingCommittedCents` tel que
déjà calculé et passé à `computeOverdraftRisk` dans `getAlertsSnapshot`. Donc :

```
running_final = currentCashOnHandCents - upcomingCommittedCents
              = -overdraft.shortfallCents (si overdraft.atRisk)
              = le surplus du mois (sinon)
```

**Conséquence exploitée à la section 3** : si `overdraft.atRisk` est déjà
`true`, le dernier jour simulé est nécessairement négatif, donc
`computeCashFlowTimingRisk` détecterait forcément aussi un risque — ce serait
un doublon du même problème ("tu finis le mois dans le rouge"), pas un
problème de timing distinct. **`getAlertsSnapshot` n'appelle donc
`computeCashFlowTimingRisk` que lorsque `overdraft.atRisk === false`** — à ce
moment-là, `running_final >= 0` est garanti par construction, ce qui garantit
aussi que `recoversOnDay` est **toujours non-null** quand `atRisk` est `true`
(le dernier jour de `dailyBalances`, forcément `>= 0`, est un candidat de
secours systématique). Le type reste `number | null` par prudence défensive
(si le gate venait à changer), mais ce n'est jamais `null` en pratique dans le
flux normal — à documenter en commentaire au-dessus du `return` dans
`alerts.ts`.

C'est une garantie mathématique, pas une convention à respecter de mémoire :
les deux alertes ne peuvent physiquement pas se déclencher ensemble pour le
même mois.

---

## 3. Intégration dans `getAlertsSnapshot` (`backend/queries/alerts.ts`)

### 3.1 Nouvelles données à récupérer

Deux ajouts aux requêtes existantes de `getAlertsSnapshot` :

1. **Les lignes de revenu du mois, avec leur `payDay`** — même filtre `OR`
   que celui déjà défini dans `RECURRING_INCOME_PLAN.md` (section 3.1, déjà
   utilisé par `report.ts`) pour rester exactement cohérent avec ce qui
   compose `budget.incomeCents` :
   ```ts
   const monthRangeValue = monthRange(month); // déjà exporté par backend/queries/balance.ts
   const monthIncomes = await prisma.income.findMany({
     where: {
       userId,
       OR: [
         { isRecurring: false, periodMonth: monthRangeValue },
         { isRecurring: true, periodMonth: { lt: monthRangeValue.lt } },
       ],
     },
     select: { label: true, type: true, netAmountCents: true, payDay: true },
   });
   ```
2. **La part déjà payée de chaque prêt ce mois-ci, par prêt** (pas juste
   l'agrégat global `budget.loanPaymentsCents` déjà utilisé pour
   `remainingLoanCommitmentCents`) — nécessaire pour dater correctement
   l'échéance restante de CHAQUE prêt individuellement, pas seulement le
   total :
   ```ts
   const loanPaymentsByLoan = await prisma.loanPayment.groupBy({
     by: ["loanId"],
     where: { userId, date: monthRangeValue },
     _sum: { amountCents: true },
   });
   const paidByLoanId = new Map(
     loanPaymentsByLoan.map((r) => [r.loanId, r._sum.amountCents ?? 0])
   );
   ```
   Un prêt déjà entièrement payé ce mois (`paid >= monthlyPaymentCents`) ne
   génère aucun événement de sortie — il est déjà net dans
   `currentCashOnHandCents` via la soustraction de `budget.loanPaymentsCents`,
   l'ajouter en plus le compterait deux fois.

### 3.2 Construction des listes et appel

```ts
const outflows: DatedOutflow[] = [
  ...fixedCharges.map((c) => ({
    label: c.label,
    dayOfMonth: c.dayOfMonth,
    amountCents: c.amountCents,
  })),
  ...loans
    .map((l) => {
      const paid = paidByLoanId.get(l.id) ?? 0;
      const remaining = Math.max(0, l.monthlyPaymentCents - paid);
      return remaining > 0
        ? { label: l.name, dayOfMonth: l.dueDayOfMonth, amountCents: remaining }
        : null;
    })
    .filter((o): o is DatedOutflow => o !== null),
];

const inflows: DatedInflow[] = monthIncomes.map((i) => ({
  label: i.label ?? INCOME_TYPE_LABELS_SERVER[i.type], // ou simplement "Revenu" si pas de mapping serveur pratique
  payDay: i.payDay,
  amountCents: i.netAmountCents,
}));

// Ne calculer le risque de timing QUE si le mois n'est pas déjà en
// découverte totale (section 2.4) — sinon c'est le même problème que
// `overdraft`, pas un problème de timing distinct.
const cashFlowRisk: CashFlowTimingRisk = overdraft.atRisk
  ? { atRisk: false, worstDayOfMonth: null, shortfallCents: 0, recoversOnDay: null }
  : computeCashFlowTimingRisk({
      currentCashOnHandCents,
      todayDayOfMonth: today.getUTCDate(),
      daysInMonthCount: daysInMonth(month),
      outflows,
      inflows,
    });

return { overdraft, cashFlowRisk, upcomingDues };
```

Importer `daysInMonth` depuis `backend/dateUtils.ts` et `monthRange` depuis
`backend/queries/balance.ts` (déjà exporté, déjà utilisé ailleurs de la même
façon). `INCOME_TYPE_LABELS_SERVER` n'existe pas côté backend aujourd'hui
(`INCOME_TYPE_LABELS` est un objet frontend dans `backend/types.ts`, mais rien
n'empêche de l'importer aussi côté serveur — c'est un simple `Record`, pas un
composant) ; alternative plus simple laissée à l'agent backend : utiliser
`i.label ?? "Revenu"` si l'import croisé semble too much pour un simple
libellé de repli jamais affiché nulle part dans le MVP de cette alerte (voir
section 4 — `AlertsPanel` n'a pas besoin d'afficher le libellé de la source du
revenu, seulement le jour et le montant du creux).

### 3.3 Sécurité — aucune régression `userId`

Les deux nouvelles requêtes (3.1) filtrent toutes les deux `userId` en
première clause de `where`, exactement comme le reste de `getAlertsSnapshot`
et comme `getMonthlyBudget`/`report.ts`. `computeCashFlowTimingRisk` elle-même
ne touche jamais Prisma (fonction pure, section 2.1) — aucun risque IDOR
nouveau introduit par ce chantier.

---

## 4. Contrat API / validation

### 4.1 `backend/validations/income.ts`

Ajouter un champ optionnel `payDay`, même style à deux étages que
`optionalCentsField` (`backend/validations/money.ts`) mais avec les bornes
`[1, 31]` plutôt que des centimes :

```ts
export const optionalDayField = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v === "" ? undefined : v))
  .pipe(
    z
      .string()
      .regex(/^\d{1,2}$/)
      .transform((v) => parseInt(v, 10))
      .refine((v) => v >= 1 && v <= 31, "Jour invalide")
      .optional()
  );

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
  payDay: optionalDayField, // <-- ajout
});
```

- Placé dans `income.ts` (pas `money.ts`) : ce n'est pas un montant, c'est
  spécifique au domaine `Income` ; pas de raison de le partager ailleurs pour
  l'instant (YAGNI — aucune autre entité n'a besoin d'un champ "jour" saisi
  librement par l'utilisateur, `FixedCharge.dayOfMonth`/`Loan.dueDayOfMonth`
  sont déjà des `centsField`-like dédiés inline dans leurs propres schémas).
- Absent/vide → `undefined` → `Income.payDay = null` en base (comportement
  "je ne sais pas encore", traité par la valeur par défaut prudente de
  `computeCashFlowTimingRisk`, jamais par une valeur par défaut en base).
- **Limite héritée, non nouvelle** : comme `grossAmountCents`/
  `contributionsCents` déjà aujourd'hui, envoyer `payDay` absent dans un
  `PATCH` ne réinitialise pas un `payDay` déjà enregistré à `null` (Prisma
  ignore une clé `undefined` dans `data`, il ne l'efface pas) — c'est un
  comportement déjà accepté par ce projet pour tous les champs optionnels de
  ce formulaire, pas une régression introduite ici. Le frontend doit donc,
  comme pour `isRecurring`, envoyer explicitement la valeur actuelle (vide ou
  non) à chaque `PATCH` plutôt que d'omettre le champ par erreur — mais
  contrairement à `isRecurring` (qui a un défaut sûr `false`), il n'existe
  aujourd'hui aucun moyen de forcer un `payDay` déjà renseigné à revenir à
  `null` via ce endpoint. **Hors scope de ce chantier** (limite déjà acceptée
  pour les autres champs optionnels du même formulaire) ; à signaler à
  l'agent backend s'il souhaite l'améliorer, non bloquant.

### 4.2 `POST /api/incomes` (`app/api/incomes/route.ts`)

Ajouter `payDay: form.get("payDay") ?? undefined` au `safeParse`, puis
propager `payDay: parsed.data.payDay` dans `prisma.income.create({ data })`
(même style exact que `isRecurring`, voir `RECURRING_INCOME_PLAN.md` section
4.2).

### 4.3 `PATCH /api/incomes/[id]` (`app/api/incomes/[id]/route.ts`)

Body JSON, ajouter `payDay: payDay !== null ? String(payDay) : undefined`
côté frontend (voir section 6.3), et côté route propager `payDay:
parsed.data.payDay` dans `prisma.income.update({ data })`. Contrat "PATCH
complet" identique au reste du schéma (pas de `.partial()`, cohérent avec la
décision déjà actée pour `isRecurring`).

### 4.4 Types partagés

`backend/types.ts` :
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
  isRecurring: boolean;
  payDay: number | null;   // <-- ajout
  payslipOriginalName: string | null;
  createdAt: string;
};

export type CashFlowTimingRisk = {
  atRisk: boolean;
  worstDayOfMonth: number | null;
  shortfallCents: number;
  recoversOnDay: number | null;
};

export type AlertsSnapshot = {
  overdraft: { atRisk: boolean; shortfallCents: number };
  cashFlowRisk: CashFlowTimingRisk;   // <-- ajout, jamais null (voir raisonnement ci-dessous)
  upcomingDues: UpcomingDue[];
};
```

**Forme choisie, différente de la suggestion `| null` de la tâche** : le
champ `cashFlowRisk` reste un objet non-nullable, exactement comme `overdraft`
l'est déjà (`{ atRisk: boolean; shortfallCents: number }`, jamais `null`) —
cohérence de forme entre les deux alertes soeurs dans le même type. "Pas de
risque" et "risque déjà couvert par `overdraft`" sont tous deux représentés
par `{ atRisk: false, ... }`, ce qui est suffisant : `AlertsPanel` n'a besoin
de rien savoir de plus que "dois-je afficher ce bloc ou non", il n'a pas
besoin de distinguer "aucun risque" de "risque neutralisé par l'autre
alerte" — les deux mènent au même affichage (rien).

`backend/serializers/income.ts` → `toIncomeDto` : ajouter `payDay:
income.payDay` (passthrough direct, déjà `number | null` côté Prisma comme
côté DTO, aucune conversion — contrairement à `periodMonth`/`createdAt`).

---

## 5. Décision d'affichage

### 5.1 `components/dashboard/AlertsPanel.tsx`

Nouveau bloc, affiché uniquement quand `snapshot.cashFlowRisk.atRisk` est
`true` — par construction (section 2.4), ce bloc et le bloc `overdraft` ne
sont **jamais** visibles en même temps, donc pas de risque de superposition
visuelle à gérer.

Réutiliser le même registre visuel "carte d'avertissement" déjà en place
(`bg-amber-50 dark:bg-amber-500/10`, texte `text-amber-800 dark:text-amber-300`)
plutôt qu'introduire une nouvelle couleur — le design system ne définit pas
de second token d'alerte, et les deux messages ne se chevauchant jamais à
l'écran, la couleur seule n'a pas besoin de les différencier. La distinction
se fait par l'icône et le texte : icône `Clock` (lucide-react, pas encore
utilisée dans ce fichier, à distinguer de `AlertTriangle` déjà pris par
`overdraft` et de `CalendarClock` déjà pris par les échéances à venir) :

```tsx
{snapshot.cashFlowRisk.atRisk && (
  <p className="animate-fade-in flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
    <Clock className="mt-0.5 h-4 w-4 shrink-0" />
    <span>
      Petit creux de trésorerie en vue : ton solde pourrait passer sous zéro
      autour du {snapshot.cashFlowRisk.worstDayOfMonth} du mois (jusqu&apos;à{" "}
      <strong>{formatCents(snapshot.cashFlowRisk.shortfallCents, currency)}</strong>{" "}
      manquant), le temps que ton revenu du{" "}
      {snapshot.cashFlowRisk.recoversOnDay} arrive. Le mois s&apos;équilibre
      bien au global — c&apos;est une question de timing, pas de budget.
    </span>
  </p>
)}
```

Ton volontairement rassurant en fin de phrase ("le mois s'équilibre bien au
global") — cohérent avec l'exigence "apaisant mais clair" du
`DESIGN_SYSTEM.md` : cette alerte prévient d'un vrai risque (le compte peut
réellement passer en négatif) sans dramatiser un problème qui n'est pas un
problème de budget de fond. Placer ce bloc **avant** le bloc `overdraft` dans
le JSX (ou juste après — l'ordre n'a pas d'impact puisqu'ils ne coexistent
jamais) ; le plus simple est de l'ajouter juste après le bloc `overdraft`
existant, avant `upcomingDues`, sans changer la condition de retour
`null` du composant (`hasOverdraftWarning`, `hasUpcomingDues` → ajouter
`hasCashFlowWarning = snapshot.cashFlowRisk.atRisk` à la condition globale de
sortie anticipée).

### 5.2 Champ "jour de versement habituel" dans les 3 formulaires

`app/(app)/incomes/new/page.tsx`, `components/incomes/EditIncomeForm.tsx`,
`components/dashboard/QuickIncomeCard.tsx` — ajouter un champ numérique juste
en dessous de la case "Revenu récurrent" déjà en place (même bloc `flex
flex-col gap-1`, même style d'`input`) :

```tsx
<div className="flex flex-col gap-1">
  <label htmlFor="payDay" className="text-sm font-medium text-slate-700 dark:text-slate-200">
    Jour de versement habituel (optionnel)
  </label>
  <input
    id="payDay"
    type="number"
    min={1}
    max={31}
    value={payDay}
    onChange={(e) => setPayDay(e.target.value)}
    placeholder="Ex : 28"
    className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-white/15 dark:focus:ring-indigo-500/20"
  />
  <span className="text-xs text-slate-400 dark:text-slate-500">
    Sert à repérer si tes charges ou prêts sont prélevés avant que ce revenu
    n&apos;arrive dans le mois. Laisse vide si tu ne le sais pas encore — on
    part du principe prudent qu&apos;il arrive en fin de mois.
  </span>
</div>
```

Champ affiché **toujours**, pas seulement quand "Revenu récurrent" est coché
(rappel de la consigne : pertinent surtout pour un revenu récurrent, mais pas
limité à lui — un revenu ponctuel dont on connaît déjà la date de versement
profite aussi du calcul du mois en cours). Envoi identique au reste du
formulaire : `formData.set("payDay", payDay)` si non vide (`POST`), ou
`payDay: payDay.trim() !== "" ? payDay.trim() : undefined` dans le JSON du
`PATCH` (`EditIncomeForm`), pré-rempli depuis `income.payDay !== null ?
String(income.payDay) : ""` au montage du formulaire d'édition.

---

## 6. Sécurité / RGPD

- Aucune requête n'omet le filtre `userId` : les deux nouvelles requêtes
  (section 3.1) suivent le même `where: { userId, ... }` que tout le reste de
  `getAlertsSnapshot`. `computeCashFlowTimingRisk` est une fonction pure sans
  accès base (section 2.1) — aucune nouvelle surface d'accès aux données.
- `payDay` n'est ni un identifiant, ni une donnée permettant de cibler un
  autre utilisateur — aucun nouveau risque IDOR. Ce n'est pas non plus une
  donnée plus sensible que `netAmountCents` déjà stocké (donnée financière
  déjà couverte par les règles existantes : jamais loggée en clair). Un jour
  du mois seul (1-31), sans le montant associé, n'a d'ailleurs aucune valeur
  identifiante ou sensible en tant que tel.
- Pas de nouvel endpoint : `payDay` traverse les mêmes routes déjà
  authentifiées et scopées par session (`POST`/`PATCH` `/api/incomes*`).

---

## 7. Tests

### 7.1 `backend/alerts.test.ts` — `computeCashFlowTimingRisk`

Cas explicites demandés par la tâche, plus quelques cas limites :

1. **Salaire le 28, loyer le 1er → doit détecter un risque.**
   ```ts
   computeCashFlowTimingRisk({
     currentCashOnHandCents: 150000, // 0 de départ + le salaire du mois déjà compté par getMonthlyBudget
     todayDayOfMonth: 1,
     daysInMonthCount: 30,
     outflows: [{ label: "Loyer", dayOfMonth: 1, amountCents: 80000 }],
     inflows: [{ label: "Salaire", payDay: 28, amountCents: 150000 }],
   });
   // → { atRisk: true, worstDayOfMonth: 1, shortfallCents: 80000, recoversOnDay: 28 }
   ```

2. **Salaire le 1er, loyer le 28 → ne doit PAS détecter de risque.**
   ```ts
   computeCashFlowTimingRisk({
     currentCashOnHandCents: 150000,
     todayDayOfMonth: 1,
     daysInMonthCount: 30,
     outflows: [{ label: "Loyer", dayOfMonth: 28, amountCents: 80000 }],
     inflows: [{ label: "Salaire", payDay: 1, amountCents: 150000 }],
   });
   // → { atRisk: false, worstDayOfMonth: null, shortfallCents: 0, recoversOnDay: null }
   ```

3. **Mois déjà en découvert total (fin de mois négative) → toujours détecté
   comme un risque par la fonction pure elle-même** (elle ne connaît pas
   `overdraft` — c'est `getAlertsSnapshot` qui doit ne pas l'appeler dans ce
   cas, voir section 2.4/3.2). Test à ce niveau : vérifier que
   `worst.balanceCents` en fin de mois est bien négatif quand les sorties
   totales dépassent `currentCashOnHandCents + toutes les entrées`, pour
   documenter noir sur blanc que le "gate" côté `getAlertsSnapshot` est ce qui
   évite le doublon, pas un hasard de valeurs :
   ```ts
   computeCashFlowTimingRisk({
     currentCashOnHandCents: 50000,
     todayDayOfMonth: 1,
     daysInMonthCount: 30,
     outflows: [{ label: "Loyer", dayOfMonth: 1, amountCents: 80000 }],
     inflows: [],
   });
   // → atRisk: true, et le solde du dernier jour simulé (30) doit rester négatif
   //   (aucune entrée ne vient jamais compenser) — c'est ce cas que
   //   getAlertsSnapshot doit exclure via `overdraft.atRisk ? {...} : computeCashFlowTimingRisk(...)`.
   ```

4. **Revenu sans `payDay` → traité comme arrivant le dernier jour du mois.**
   ```ts
   computeCashFlowTimingRisk({
     currentCashOnHandCents: 150000,
     todayDayOfMonth: 1,
     daysInMonthCount: 30,
     outflows: [{ label: "Loyer", dayOfMonth: 5, amountCents: 80000 }],
     inflows: [{ label: "Salaire", payDay: null, amountCents: 150000 }],
   });
   // → atRisk: true, worstDayOfMonth: 5, shortfallCents: 80000, recoversOnDay: 30
   ```

5. **Sortie déjà en retard (jour < aujourd'hui) → appliquée immédiatement.**
   ```ts
   computeCashFlowTimingRisk({
     currentCashOnHandCents: 150000,
     todayDayOfMonth: 15,
     daysInMonthCount: 30,
     outflows: [{ label: "Loyer", dayOfMonth: 1, amountCents: 200000 }], // déjà "dû" au jour 1, jamais retiré ailleurs
     inflows: [{ label: "Salaire", payDay: 28, amountCents: 150000 }],
   });
   // → atRisk: true, worstDayOfMonth: 15 (appliqué dès aujourd'hui), shortfallCents: 50000, recoversOnDay: 28
   ```

6. **Événement au-delà du nombre de jours du mois (`payDay`/`dayOfMonth` =
   31 dans un mois de 30 jours) → borné au dernier jour, pas de débordement
   sur le mois suivant.**
   ```ts
   computeCashFlowTimingRisk({
     currentCashOnHandCents: 100000,
     todayDayOfMonth: 1,
     daysInMonthCount: 30,
     outflows: [{ label: "Prêt", dayOfMonth: 31, amountCents: 50000 }],
     inflows: [],
   });
   // → l'événement s'applique au jour 30 (clamp), pas d'IndexOutOfRange / pas de jour 31 fantôme
   ```

7. **Deux prêts/charges le même jour que l'entrée d'argent : sorties
   appliquées avant les entrées** (déjà couvert implicitement par le cas 1,
   à isoler dans un test dédié avec `dayOfMonth === payDay` pour vérifier
   explicitement l'ordre de traitement intra-jour).

### 7.2 `backend/validations/income.test.ts` — `optionalDayField`

- Absent → `undefined`.
- `"28"` → `28`.
- `"0"`, `"32"`, `"abc"` → `safeParse` échoue (bornes `[1, 31]`, format
  numérique).
- `""` (chaîne vide, cas d'un champ optionnel vidé dans un formulaire) →
  `undefined`, même comportement que `optionalCentsField`.

### 7.3 Aucun changement requis dans `backend/finance.test.ts`

La fonction ajoutée ne vit pas dans `finance.ts` (section 2.1) — ce fichier
et ses tests restent inchangés.

---

## 8. Récapitulatif — fichiers à toucher, dans l'ordre

**Backend (agent `backend`) :**
1. `prisma/schema.prisma` — champ `Income.payDay` (section 1).
2. Migration (`npx prisma migrate dev --name add_income_pay_day`).
3. `backend/validations/income.ts` — `optionalDayField` + extension de
   `incomeFormSchema` (section 4.1). Étendre
   `backend/validations/income.test.ts` (section 7.2).
4. `backend/alerts.ts` — types `DatedOutflow`/`DatedInflow`/
   `CashFlowTimingRisk` + fonction pure `computeCashFlowTimingRisk` (section
   2). Étendre `backend/alerts.test.ts` (section 7.1).
5. `backend/types.ts` — `Income.payDay`, nouveau type `CashFlowTimingRisk`,
   extension de `AlertsSnapshot` (section 4.4).
6. `backend/serializers/income.ts` — propager `payDay` dans `toIncomeDto`
   (section 4.4).
7. `app/api/incomes/route.ts` — lire `payDay` depuis le `FormData`, propager
   à `prisma.income.create` (section 4.2).
8. `app/api/incomes/[id]/route.ts` — propager `payDay` à
   `prisma.income.update` (section 4.3).
9. `backend/queries/alerts.ts` — nouvelles requêtes (revenus du mois avec
   `payDay`, `LoanPayment.groupBy` par prêt), construction des
   `outflows`/`inflows`, appel gaté de `computeCashFlowTimingRisk`, extension
   du retour de `getAlertsSnapshot` (sections 3.1-3.2).

**Frontend (agent `frontend`), après validation du backend :**
1. `components/dashboard/AlertsPanel.tsx` — nouveau bloc "creux de
   trésorerie" (section 5.1), condition de sortie anticipée du composant
   étendue.
2. `app/(app)/incomes/new/page.tsx` — champ "Jour de versement habituel"
   (section 5.2).
3. `components/incomes/EditIncomeForm.tsx` — même champ, pré-rempli depuis
   `income.payDay`, envoyé explicitement dans le `PATCH` (section 5.2, 4.3).
4. `components/dashboard/QuickIncomeCard.tsx` — même champ dans le mini
   formulaire d'ajout (section 5.2).

Aucun nouveau composant partagé introduit — même registre visuel
(`card-surface`, boîte `bg-amber-50`, `<input>` stylé inline) déjà en place
partout ailleurs dans le projet.
