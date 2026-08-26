# Plan — Paiements de prêts réels, datés (remplace la déduction mensuelle automatique)

Statut : plan d'architecture, à exécuter par l'agent `backend` puis l'agent `frontend`.
Ne modifie aucun fichier hors de ce document.

## 0. Décision produit (rappel, actée avec l'utilisateur)

Le solde global ("ce qu'il te reste") ne doit plus intégrer automatiquement
`Loan.monthlyPaymentCents` chaque mois. Il ne baisse que lorsqu'un paiement de
prêt est réellement enregistré (bouton « Payer »), daté au jour où il a été
cliqué — exactement comme une `Expense`. C'est un changement de modèle de
données (nouvelle table `LoanPayment`) et un changement de source pour
`loanPaymentsCents` dans `getMonthlyBudget`, pas un changement de la formule
`computeMonthlyAvailableCents` elle-même (elle continue de faire
`income - fixedCharges - loanPayments - expenses`, seule la provenance de
`loanPayments` change).

Limite connue et acceptée : les prêts existants n'ont aucun historique de
paiement avant ce changement. Pas de backfill — le premier mois après le
déploiement, `loanPaymentsCents` sera 0 pour tout le monde tant qu'aucun
paiement n'a été cliqué. C'est le comportement voulu (cohérent avec le nouveau
modèle : « rien n'est déduit tant que ce n'est pas enregistré »).

---

## 1. Modèle Prisma — `LoanPayment`

Ajouter dans `prisma/schema.prisma`, juste après le modèle `Loan` (même
emplacement logique que `SavingsContribution` après `SavingsGoal` — pattern
identique, un paiement/versement daté rattaché à son parent et à l'utilisateur
pour l'isolation) :

```prisma
model Loan {
  ...
  payments            LoanPayment[]
  ...
}

// One row per real, dated loan repayment, recorded when the user clicks
// "Payer" — this is what makes a loan payment affect the global balance the
// same way a dated Expense does, instead of Loan.monthlyPaymentCents being
// deducted automatically every month regardless of user action. Kept
// separate from the decrement already applied to Loan.remainingCents: that
// field still represents "principal left to pay off", this table represents
// "money that actually left the budget, and when".
model LoanPayment {
  id          String   @id @default(cuid())
  loanId      String
  loan        Loan     @relation(fields: [loanId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  amountCents Int
  date        DateTime
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([date])
}
```

Ajouter la relation inverse sur `User` :
```prisma
model User {
  ...
  loanPayments LoanPayment[]
}
```

Champs :
- `date` : date du paiement, **au jour** (comme `Expense.date`). Le contrat
  backend (section 4) fixe toujours `date = now()` au moment du clic — pas de
  saisie de date arbitraire dans l'UI pour l'instant, pour rester simple et
  cohérent avec « paiement réel enregistré maintenant ». Le champ existe en
  `DateTime` (pas juste un mois) pour permettre plus tard une correction/
  saisie rétroactive sans migration.
- `amountCents` : montant réellement payé ce jour-là, en centimes, peut
  différer de `Loan.monthlyPaymentCents` (paiement partiel, remboursement
  anticipé plus gros, etc.) — c'est déjà le comportement actuel du champ
  `amountCents` du formulaire « Payer », inchangé.
- `userId` : dénormalisé depuis `loan.userId` (au lieu de forcer un join pour
  chaque filtre) — même choix que `SavingsContribution.userId` dénormalisé
  depuis `savingsGoal.userId`. Permet d'indexer et de filtrer directement par
  utilisateur sans jointure, et sert de deuxième verrou d'isolation si jamais
  une requête oublie de filtrer par `loanId`.
- Index `[userId]` (isolation, pattern constant du projet) + `[date]` (même
  raison que `Expense.date` : les agrégations par plage de dates dans
  `getMonthlyBudget` doivent rester des range scans indexés, pas des scans
  complets).

**Migration** : additive pure (`CREATE TABLE`), aucune colonne modifiée sur
`Loan`, aucun backfill. `npx prisma migrate dev --name add_loan_payment`.

---

## 2. Nouveau calcul de `loanPaymentsCents` dans `getMonthlyBudget`

Fichier : `backend/queries/balance.ts`.

Remplacer l'agrégation actuelle :
```ts
prisma.loan.aggregate({
  where: { userId, active: true },
  _sum: { monthlyPaymentCents: true },
}),
```
par, exactement le même pattern que `expenseAgg` (agrégation Prisma sur une
plage de dates, pas de boucle JS, pas de filtre sur `Loan.active`) :
```ts
prisma.loanPayment.aggregate({
  where: { userId, date: range },
  _sum: { amountCents: true },
}),
```
et
```ts
const loanPaymentsCents = loanPaymentAgg._sum.amountCents ?? 0;
```

Point important : **ne pas filtrer par `loan.active`**. Un paiement réel
enregistré ce mois-ci doit compter même si le prêt vient d'être soldé par ce
paiement (il était actif au moment du clic, il devient inactif juste après —
cf. `app/api/loans/[id]/payment/route.ts` qui passe `active: newRemainingCents > 0`).
Filtrer sur l'état actuel du prêt exclurait à tort le dernier paiement d'un
prêt qui vient d'être soldé.

Le reste de `getMonthlyBudget` (appel à `computeMonthlyAvailableCents`,
`suggestSavingsCents`) ne change pas : ces fonctions pures ne savent pas d'où
vient `loanPaymentsCents`, seule la requête qui alimente ce paramètre change.
Aucun changement nécessaire dans `backend/finance.ts`.

---

## 3. Impact en cascade — vérifié fichier par fichier

Tout ce qui consomme `getMonthlyBudget(...).loanPaymentsCents` ou
`.availableCents` continue de fonctionner sans changement de code, **avec un
changement de sémantique qu'il faut documenter** : `loanPaymentsCents`
signifie désormais « paiements de prêts réellement enregistrés ce mois »,
plus « mensualités théoriques des prêts actifs ».

- `getRunningBalance` (balance.ts) : appelle `getMonthlyBudget` par mois pour
  reconstruire le solde cumulé. Aucun changement de code. Effet : un mois
  passé sans paiement cliqué contribue désormais `loanPaymentsCents = 0` au
  lieu de la mensualité théorique — c'est exactement l'effet recherché
  (le solde ne baisse que sur action réelle).
- `combineMonthlyBudgets` / `getHouseholdSummary` (household.ts) : somme les
  `MonthlyBudget` de plusieurs membres. Aucun changement de code — chaque
  membre doit avoir enregistré ses propres paiements pour que
  `combined.loanPaymentsCents` les reflète.
- `computeOverdraftRisk` / `getAlertsSnapshot` (alerts.ts) — **ATTENTION,
  changement de comportement à corriger, pas juste à documenter** : voir
  section 5 ci-dessous. C'est le seul consommateur qui casse réellement si on
  ne fait rien.
- `getMonthlyReportData` / exports PDF & Excel (`backend/queries/report.ts`,
  `backend/export/pdf.ts`, `backend/export/excel.ts`) : utilisent
  `budget.loanPaymentsCents` pour la ligne « Mensualités de prêts » du bilan.
  Aucun changement de code nécessaire, mais le **libellé** devient trompeur
  (voir section 6 — à renommer en « Paiements de prêts enregistrés »).
- `app/api/balance/simulate` (simulateur d'achat) : consomme `availableCents`
  indirectement via le running balance déjà projeté — pas de changement de
  code, cohérent automatiquement.

---

## 4. Contrat du bouton « Payer »

Fichier : `app/api/loans/[id]/payment/route.ts`.

Le comportement `remainingCents -= amountCents` (avec floor à 0 et
`active = newRemainingCents > 0`) **ne change pas**. On ajoute la création
d'un `LoanPayment` daté à aujourd'hui, dans **une seule transaction Prisma**
— même pattern que `app/api/savings-goals/[id]/contribute/route.ts` qui fait
déjà `prisma.$transaction([update, create])` :

```ts
const [loan] = await prisma.$transaction([
  prisma.loan.update({
    where: { id },
    data: { remainingCents: newRemainingCents, active: newRemainingCents > 0 },
  }),
  prisma.loanPayment.create({
    data: {
      loanId: id,
      userId: user.id,
      amountCents: parsed.data.amountCents,
      date: new Date(),
    },
  }),
]);

return NextResponse.json({ loan: toLoanDto(loan) });
```

Contrat inchangé côté requête/réponse HTTP : `POST /api/loans/[id]/payment`,
body `{ amountCents: string }` (validé par `loanPaymentSchema`, déjà
existant, aucun changement de schéma nécessaire), réponse `{ loan: Loan }`
(DTO inchangé — `Loan` n'expose pas ses paiements, pas besoin de les
retourner ici ; le dashboard/les analytics vont les chercher via
`getMonthlyBudget`/`getPretAnalytics` au prochain rendu).

Pourquoi la même transaction plutôt que deux écritures séquentielles : si
l'une des deux échoue (ex. contrainte DB), on ne veut jamais un état
incohérent où le capital restant a baissé sans qu'un paiement daté existe
(ou l'inverse) — c'est le même raisonnement déjà appliqué à
`SavingsGoal.currentCents` + `SavingsContribution`.

---

## 5. Rappels d'échéance (« upcoming dues ») vs paiement réel — coexistence tranchée

Deux mécanismes distincts qui doivent **rester découplés** :

1. **Rappel théorique** (« dans N jours, ta mensualité de prêt X tombe ») —
   sert à prévenir *avant* l'échéance, indépendamment de tout paiement
   enregistré. Doit continuer à se baser sur `Loan.monthlyPaymentCents` +
   `Loan.dueDayOfMonth`, comme aujourd'hui dans `getAlertsSnapshot`
   (`backend/queries/alerts.ts`, boucle `loans.map(...)` construisant
   `upcomingDues`). **Aucun changement ici** — ce code interroge directement
   `prisma.loan.findMany`, pas `getMonthlyBudget`, donc il n'est pas affecté
   par le changement de section 2. À documenter en commentaire dans le code
   pour éviter qu'un futur refactor le fasse pointer vers
   `budget.loanPaymentsCents` par erreur.

2. **Paiement réel enregistré** (`LoanPayment`) — sert à faire baisser le
   solde quand l'utilisateur clique « Payer ». N'a aucun rôle dans le calcul
   du rappel : un rappel prévient d'une échéance à venir *que le paiement
   ait été cliqué ou non ce mois-ci*.

**Bug à corriger dans `computeOverdraftRisk` (`getAlertsSnapshot`)** :
aujourd'hui,
```ts
const overdraft = computeOverdraftRisk({
  balanceCents: running.startingBalanceCents,
  upcomingCommittedCents: budget.fixedChargesCents + budget.loanPaymentsCents,
});
```
utilise `budget.loanPaymentsCents` comme proxy de « ce qui va encore tomber
ce mois ». Avec le nouveau calcul (section 2), `budget.loanPaymentsCents`
devient « ce qui a déjà été payé », donc **avant tout clic sur « Payer », le
risque de découvert serait sous-évalué** (les mensualités de prêts à venir
disparaîtraient silencieusement du calcul de risque). C'est un vrai
régression fonctionnelle, pas juste un changement de libellé — à corriger
maintenant, dans le même chantier.

Correction : dans `getAlertsSnapshot`, calculer séparément l'engagement
théorique des prêts actifs (déjà chargés via `prisma.loan.findMany`, pas de
requête supplémentaire) plutôt que de réutiliser `budget.loanPaymentsCents` :

```ts
const theoreticalLoanCommitmentCents = loans.reduce(
  (sum, l) => sum + l.monthlyPaymentCents,
  0
);

const overdraft = computeOverdraftRisk({
  balanceCents: running.startingBalanceCents,
  upcomingCommittedCents: budget.fixedChargesCents + theoreticalLoanCommitmentCents,
});
```

Documenter en commentaire pourquoi `theoreticalLoanCommitmentCents` (mensualité
théorique de tous les prêts actifs) est délibérément différent de
`budget.loanPaymentsCents` (paiements réellement enregistrés ce mois) : le
risque de découvert doit anticiper *toutes* les mensualités encore dues, pas
seulement celles déjà cliquées — sinon l'alerte arriverait systématiquement
trop tard (après coup). `fixedChargesCents`, lui, reste correct tel quel car
il n'a pas changé de sémantique (toujours la somme des charges actives,
indépendamment d'un enregistrement daté).

---

## 6. Textes UI à adapter (liste précise pour l'agent frontend)

1. `app/(app)/dashboard/page.tsx` — bloc « Détail du mois » :
   - ligne ~162-164 : phrase d'intro
     *« Les charges fixes et mensualités de prêts restent constantes d'un
     mois à l'autre ; revenus et dépenses varient. »*
     → reformuler pour ne plus inclure les prêts dans « constant » puisque
     ce n'est plus vrai. Suggestion : *« Les charges fixes restent constantes
     d'un mois à l'autre ; revenus, dépenses et paiements de prêts varient
     selon ce que tu enregistres. »*
   - ligne ~182-189 : libellé de la ligne prêts
     *« Mensualités de prêts (constant) »* → supprimer le badge « (constant) »
     et renommer en quelque chose comme *« Paiements de prêts enregistrés »*
     pour matcher le libellé de `expensesCents` juste en dessous
     (« Dépenses déjà faites ») — même registre temporel (« déjà fait »,
     pas « prévu »).

2. `components/loans/LoanCard.tsx` — bloc d'aide sous le formulaire « Payer »
   (lignes ~134-141), qui dit aujourd'hui explicitement l'inverse du nouveau
   comportement :
   *« « Payer » met à jour uniquement le capital restant dû ci-dessus. Ta
   mensualité est déjà comptée chaque mois dans ton solde global du tableau
   de bord, que tu enregistres un paiement ici ou non — pas besoin de le
   refaire. »*
   → à réécrire entièrement (ou supprimer). Contenu correct à transmettre :
   *« « Payer » enregistre un paiement daté à aujourd'hui : il met à jour le
   capital restant dû ci-dessus ET déduit ce montant de ton solde global du
   tableau de bord, comme une dépense. Rien n'est déduit automatiquement si
   tu ne cliques pas ce bouton. »*

3. `app/(app)/household/page.tsx` (ligne ~69) : libellé *« Mensualités de
   prêts cumulées »* → même renommage que le dashboard, ex. *« Paiements de
   prêts cumulés »*, pour rester cohérent avec le fait que ce n'est plus une
   mensualité théorique sommée mais des paiements réellement enregistrés
   par chaque membre du foyer.

4. `backend/export/pdf.ts` (ligne 99) et `backend/export/excel.ts` (ligne 22)
   : libellé *« Mensualités de prêts »* dans le bilan exporté → renommer en
   *« Paiements de prêts enregistrés »* pour cohérence avec le dashboard (ces
   deux fichiers sont générés côté backend mais produisent du texte visible
   par l'utilisateur ; à traiter par l'agent backend en même temps que le
   reste de ce fichier, ou signalé à l'agent frontend si vous préférez
   centraliser tous les changements de libellés ensemble — au choix de
   l'exécution, mais ne pas oublier ces deux fichiers).

Pas d'autre occurrence trouvée (vérifié par recherche globale de
`monthlyPaymentCents`, `loanPaymentsCents`, `Mensualité`, `mensualité`,
`constant` dans `app/`, `components/`, `backend/`). Le champ « Mensualité »
affiché sur la fiche de prêt elle-même (`LoanCard.tsx` ligne 127,
`app/(app)/loans/new/page.tsx` ligne 131 — libellé du champ de saisie) reste
correct et ne doit **pas** changer : il désigne la mensualité théorique du
prêt (paramètre du prêt, utilisé pour l'amortissement/simulateur), qui existe
toujours indépendamment des paiements réels.

---

## 7. Analytics « pret » (`backend/queries/analytics.ts`)

Décision : **ne pas complexifier maintenant.** `getPretAnalytics` continue
d'utiliser `reconstructLoanBalanceHistory` (reconstruction estimée à partir
de `remainingCents`/`monthlyPaymentCents`/`annualRateBps` actuels) pour toute
la courbe, `PRET_CAVEAT` inchangé.

Pourquoi ne pas brancher les `LoanPayment` réels dès maintenant : la courbe
« Restant dû » représente le capital restant, pas les paiements — pour
qu'un `LoanPayment` daté améliore réellement cette courbe, il faudrait
recalculer un vrai amortissement point par point à partir de chaque paiement
réel (montant + date), ce qui suppose une historisation fiable et un capital
de départ connu (`Loan` n'a pas de `initialCents`, seulement `remainingCents`
actuel) — sans cette donnée, mélanger reconstruction estimée et paiements
réels produirait une courbe incohérente (un segment "réel" raccordé à un
segment "estimé" sans garantie qu'ils partent du même point). Le gain
immédiat est marginal (un seul point — le mois courant — serait potentiellement
exact, ce qui est déjà le cas aujourd'hui : `reconstructLoanBalanceHistory`
ancre déjà son dernier point sur `currentRemainingCents`, la valeur réelle).

**Amélioration à noter pour plus tard** (ne pas faire maintenant) : une fois
plusieurs mois de `LoanPayment` accumulés pour un prêt, on pourra construire
une courbe hybride — remplacer les points des mois où un `LoanPayment` existe
par `remainingCents` recalculé à partir de la somme des paiements réels
depuis la création du prêt, et ne garder `reconstructLoanBalanceHistory` que
pour les mois antérieurs à l'introduction de cette fonctionnalité. Nécessite
d'abord de stocker `Loan.initialCents` (capital initial) pour ancrer le
calcul — actuellement absent du schéma. Pas d'action requise dans ce chantier ;
si `ANALYTICS_PLAN.md` doit être touché, se limiter à ajouter cette note dans
sa section 4.4 sans changer le contrat actuel de `PretAnalyticsResponse`.

---

## 8. Sécurité / RGPD

- `LoanPayment.userId` obligatoire (non nullable), indexé, filtré sur chaque
  requête (`getMonthlyBudget`, futur usage analytics) — même règle que tout
  autre modèle du projet. Isolation garantie côté DB par la contrainte
  `onDelete: Cascade` vers `User`.
- Double vérification d'appartenance dans la route paiement : `loan.userId
  === user.id` (déjà fait avant la transaction, inchangé) — le
  `LoanPayment` créé hérite de `user.id` (session courante), jamais d'un
  `userId` fourni dans le body, pour empêcher un IDOR qui créerait un
  paiement au nom d'un autre utilisateur.
- `amountCents` validé par `loanPaymentSchema` existant (`centsField` : regex
  `^\d+$`, borne `0..100_000_000`) — aucun nouveau schéma zod à écrire pour
  la création du `LoanPayment`, le body de la requête ne change pas.
- Montant toujours en centimes (`Int` Prisma), jamais en float — cohérent
  avec toute la base.
- Donnée financière sensible : ne jamais logger `amountCents` ni `date` en
  clair dans un `console.log`/logger applicatif (règle déjà en place dans
  `CLAUDE.md`, s'applique identiquement au nouveau modèle).
- Pas de nouvelle surface d'export/partage : `LoanPayment` n'est pour l'instant
  exposé nulle part en lecture directe (pas de `GET /api/loans/[id]/payments`
  prévu dans ce chantier) — seul son agrégat (`loanPaymentsCents`) traverse
  les API existantes (`getMonthlyBudget`, `getHouseholdSummary`), qui ont déjà
  toutes les vérifications d'isolation nécessaires.

---

## 9. Tests existants impactés

- `backend/finance.test.ts` — **aucun changement requis.** Les tests portent
  sur `computeMonthlyAvailableCents`, `combineMonthlyBudgets`,
  `projectEndOfMonthCents`, etc., qui prennent `loanPaymentsCents` en
  paramètre déjà agrégé — ils sont indifférents à sa provenance (mensualité
  théorique ou paiements réels). Aucune assertion ne dépend de
  `Loan.monthlyPaymentCents` par elle-même dans ce fichier.
- `backend/validations/loan.test.ts` — vérifié : porte sur
  `createLoanSchema`/`updateLoanSchema`/`paymentCoversInterest`, aucun de ces
  schémas ne change (`loanPaymentSchema` reste `{ amountCents: centsField }`).
  **Aucun changement requis.**
- Aucun test unitaire n'existe aujourd'hui pour `getMonthlyBudget`,
  `getAlertsSnapshot` ou la route `POST /api/loans/[id]/payment` elles-mêmes
  (ce sont des fonctions/routes qui touchent la DB, pas couvertes par les
  tests Vitest actuels qui ne testent que des fonctions pures dans
  `backend/finance.ts` et `backend/validations/`). **Aucun test cassé** par
  ce changement au sens strict.
- **Tests à ajouter** (recommandé à l'agent `test`, pas bloquant pour ce
  chantier) :
  - `backend/alerts.test.ts` (si créé) : un cas couvrant
    `computeOverdraftRisk` isolément — celui-ci ne change pas, mais son
    *appelant* (`getAlertsSnapshot`) doit être couvert par un test
    d'intégration si le projet en a (vérifier `tests/` ou équivalent) pour
    prouver que le risque de découvert continue d'inclure les mensualités de
    prêts théoriques même sans paiement enregistré ce mois-ci — c'est
    précisément le point que la section 5 corrige.
  - Un test (unitaire ou intégration DB) pour la nouvelle logique de
    `getMonthlyBudget` : *"un prêt actif sans aucun LoanPayment ce mois-ci
    donne loanPaymentsCents = 0"* et *"un LoanPayment enregistré ce mois-ci
    est bien sommé, même si le prêt est devenu `active: false` juste après
    ce paiement"* (cas du dernier paiement qui solde le prêt, cf. section 2).

---

## 10. Récapitulatif — fichiers à toucher, dans l'ordre

**Backend (agent `backend`) :**
1. `prisma/schema.prisma` — modèle `LoanPayment` + relations `Loan.payments`,
   `User.loanPayments` (section 1).
2. Migration Prisma (`npx prisma migrate dev`).
3. `backend/queries/balance.ts` — nouvelle agrégation `loanPaymentsCents`
   dans `getMonthlyBudget` (section 2).
4. `backend/queries/alerts.ts` — correction de `computeOverdraftRisk` pour
   utiliser l'engagement théorique des prêts actifs, pas
   `budget.loanPaymentsCents` (section 5) + commentaire explicatif.
5. `app/api/loans/[id]/payment/route.ts` — transaction
   `[loan.update, loanPayment.create]` (section 4).
6. `backend/export/pdf.ts`, `backend/export/excel.ts` — renommage du libellé
   (section 6, point 4).
7. (Optionnel, note seulement) `ANALYTICS_PLAN.md` section 4.4 — ajouter la
   note d'amélioration future (section 7), sans changer le contrat actuel.

**Frontend (agent `frontend`), après validation du backend :**
1. `app/(app)/dashboard/page.tsx` — reformulation des deux textes (section 6,
   points 1).
2. `components/loans/LoanCard.tsx` — réécriture du texte d'aide sous « Payer »
   (section 6, point 2).
3. `app/(app)/household/page.tsx` — renommage du libellé (section 6, point 3).

Aucun changement de type partagé requis dans `backend/types.ts` :
`MonthlyBudget.loanPaymentsCents` et `HouseholdSummary` gardent la même forme
(`number`), seule la donnée sous-jacente change de source. Pas de nouveau DTO
`LoanPayment` nécessaire côté frontend puisqu'aucune route ne l'expose
individuellement dans ce chantier (section 8, dernier point).
