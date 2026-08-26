# Plan d'architecture — Devise d'affichage configurable

Statut : plan à exécuter par l'agent `backend` puis l'agent `frontend`, dans cet ordre
(le backend doit exister — schéma, migration, `formatCents`, provider — avant que le
frontend ne s'y branche).

Périmètre confirmé avec l'utilisateur : la devise se choisit **à l'inscription**.
L'ajout d'un changement de devise sur `/account` est noté en fin de document comme
extension naturelle, mais n'est **pas** dans le scope de cette phase.

---

## 0. Décisions clés (résumé)

1. **6 devises supportées** au premier lot : `EUR`, `USD`, `GBP`, `CHF`, `TND`, `MAD`.
2. `User.currency` : nouvel enum Prisma, `@default(EUR)`, non nullable — migration additive
   pure, aucun backfill nécessaire.
3. **Le stockage en centimes ne change pas.** Toutes les devises sont affichées avec
   **exactement 2 décimales**, y compris TND et MAD dont la norme ISO 4217 prévoit 3
   décimales nativement en `Intl` — décision volontaire expliquée en section 4.
4. `parseEurosToCents` / `parseSignedEurosToCents` (backend/money.ts) **ne changent pas** :
   conséquence directe de la décision précédente (toujours 2 décimales), donc aucune
   branche par devise n'est nécessaire côté parsing.
5. Propagation : `formatCents(cents, currency?)` prend un 2ᵉ paramètre optionnel
   (défaut `"EUR"` pour rétrocompatibilité et pour les tests existants) ; les Server
   Components qui ont déjà `user` passent `user.currency` explicitement ; les Client
   Components consomment un nouveau `useCurrency()` via un `CurrencyProvider` posé une
   seule fois dans `app/(app)/layout.tsx`.
6. Aucun risque RGPD significatif — la devise n'est pas une donnée sensible. Un seul
   point d'attention fonctionnel : le résumé "foyer" (`/household`) agrège des montants
   entre deux utilisateurs qui peuvent avoir des devises différentes, sans conversion
   (voir section 7).

---

## 1. Devises supportées et justification

| Code  | Nom                  | Décimales natives ICU | Décimales affichées (forcées) | Pourquoi |
|-------|----------------------|:---:|:---:|---|
| `EUR` | Euro                 | 2 | 2 | devise par défaut actuelle, aucune régression |
| `USD` | Dollar américain     | 2 | 2 | devise internationale la plus demandée après l'EUR |
| `GBP` | Livre sterling       | 2 | 2 | idem, marché anglophone courant |
| `CHF` | Franc suisse         | 2 | 2 | diaspora francophone (Suisse), montants souvent élevés |
| `TND` | Dinar tunisien       | **3** | 2 | demandé explicitement par l'utilisateur |
| `MAD` | Dirham marocain      | 2 | 2 | cohérence régionale avec TND (Maghreb francophone), app en fr-FR |

Ce n'est **pas** un système de change : aucune conversion n'est faite entre devises,
c'est un pur choix de représentation d'un même nombre de centimes déjà stocké.

---

## 2. Schéma Prisma

Dans `prisma/schema.prisma` :

```prisma
enum Currency {
  EUR
  USD
  GBP
  CHF
  TND
  MAD
}

model User {
  id           String        @id @default(cuid())
  email        String        @unique
  passwordHash String
  name         String?
  currency     Currency      @default(EUR)   // <-- ajout
  balanceCents  Int?
  balanceAsOf   DateTime?
  balanceSource BalanceSource?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  ...
}
```

- Colonne **non nullable avec défaut `EUR`** au niveau DB : les lignes `User`
  existantes reçoivent automatiquement `EUR` à la migration, aucun script de backfill
  requis, aucune régression visuelle pour les comptes existants.
- `@@index` non nécessaire (pas de requête filtrée par devise).
- Migration Prisma standard : `prisma migrate dev --name add_user_currency`.

---

## 3. Types partagés (`backend/types.ts`)

Suivre le même pattern que `IncomeType` / `INCOME_TYPE_LABELS` déjà présent dans ce
fichier (ne pas importer l'enum Prisma généré directement dans du code partagé
front/back) :

```ts
export type Currency = "EUR" | "USD" | "GBP" | "CHF" | "TND" | "MAD";

export const SUPPORTED_CURRENCIES: Currency[] = ["EUR", "USD", "GBP", "CHF", "TND", "MAD"];

export const CURRENCY_LABELS: Record<Currency, string> = {
  EUR: "Euro (€)",
  USD: "Dollar américain ($)",
  GBP: "Livre sterling (£)",
  CHF: "Franc suisse (CHF)",
  TND: "Dinar tunisien (DT)",
  MAD: "Dirham marocain (MAD)",
};
```

Étendre `AuthUser` (même fichier), à côté de `createdAt` qui vient d'être ajouté :

```ts
export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  currency: Currency;   // <-- ajout
};
```

Tous les endroits qui construisent un `AuthUser` littéral doivent inclure `currency` :
- `backend/auth.ts` → `validateSessionToken()` (lit `session.user.currency`, déjà
  disponible via `include: { user: true }`, aucune requête supplémentaire)
- `app/api/auth/signup/route.ts` → objet `authUser` après `prisma.user.create()`
- `app/api/auth/login/route.ts` → objet `authUser` après `prisma.user.findUnique()`

---

## 4. `backend/money.ts` — formatage

### Pourquoi forcer 2 décimales partout (y compris TND/MAD)

Vérification factuelle : `Intl.NumberFormat` applique par défaut le nombre de
décimales ISO 4217 propre à chaque devise (table CLDR), **pas** 2 décimales
uniformément. `USD`/`GBP`/`CHF`/`EUR`/`MAD` sont à 2 décimales natives, mais **`TND`
est à 3 décimales natives** (comme KWD, BHD, OMR, JOD — dinars à subdivision en
millimes). Comme la règle du projet est que `amountCents` stocke *toujours*
`valeur_affichée × 100` (jamais × 1000), laisser `Intl` appliquer son défaut TND
afficherait un 3ᵉ chiffre décimal systématiquement à `0` (ex. `1 500,550 DT` au lieu de
`1 500,55 DT`) — pas une erreur de magnitude, mais une précision illusoire trompeuse.
Décision : **forcer `minimumFractionDigits: 2, maximumFractionDigits: 2` pour toutes
les devises**, sans exception, ce qui reflète exactement la précision réellement
stockée en base et évite tout arrondi/troncature surprise si une devise à 0 décimale
était ajoutée plus tard (ex. JPY).

Le symbole et son positionnement (`€` après le nombre, `$US` après le nombre en
fr-FR, `£` après, `CHF`/`DT`/`MAD` en suffixe alphabétique), en revanche, sont
correctement gérés nativement par `Intl` pour ces 6 codes en locale `fr-FR` — **aucun
mapping de symbole manuel n'est nécessaire**, uniquement l'override des décimales.

### Changements proposés

```ts
import type { Currency } from "./types";

const FORMATTERS: Record<Currency, Intl.NumberFormat> = Object.fromEntries(
  SUPPORTED_CURRENCIES.map((currency) => [
    currency,
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  ])
) as Record<Currency, Intl.NumberFormat>;

export function formatCents(cents: number, currency: Currency = "EUR"): string {
  return FORMATTERS[currency].format(cents / 100);
}

/** Symbole/suffixe de devise seul (ex. "€", "$US", "DT"), pour les labels de
 * formulaire ("Montant (€)") — dérivé du même formateur que formatCents pour
 * garantir une cohérence parfaite avec les montants affichés. */
export function currencySymbol(currency: Currency = "EUR"): string {
  const parts = FORMATTERS[currency].formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? currency;
}
```

- `parseEurosToCents` / `parseSignedEurosToCents` : **inchangées**, la regex
  `/^\d+(\.\d{1,2})?$/` reste valide pour les 6 devises puisqu'on impose 2 décimales
  partout. Un renommage (`parseEurosToCents` → `parseAmountToCents`) serait plus
  juste sémantiquement mais est un simple nettoyage cosmétique, laissé au choix de
  l'agent backend, pas obligatoire.
- `backend/money.test.ts` : les tests existants passent tels quels (défaut `EUR`
  inchangé). Ajouter des cas pour `TND` (vérifier que `formatCents(150055, "TND")`
  donne bien 2 décimales et non 3) et pour `currencySymbol()`.

---

## 5. Validation zod à l'inscription

`backend/validations/auth.ts` :

```ts
import { SUPPORTED_CURRENCIES } from "@/backend/types";

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  name: z.string().trim().min(1).max(100).optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).default("EUR"),
});
```

- `default("EUR")` plutôt que `required` : robustesse si un ancien bundle client (cache
  navigateur pendant un déploiement) poste un signup sans champ `currency` — comportement
  identique au défaut DB, jamais d'erreur 400 surprise pour une préférence d'affichage.
- `app/api/auth/signup/route.ts` : passer `currency` à `prisma.user.create({ data: { email, passwordHash, name, currency } })` et l'inclure dans l'objet `authUser` retourné.
- Frontend (`app/signup/page.tsx`) : ajouter un `<select>` devise, valeur par défaut
  `"EUR"`, options = `SUPPORTED_CURRENCIES` affichées via `CURRENCY_LABELS`. Détail
  d'implémentation laissé à l'agent frontend.

**Extension naturelle hors scope** : une fois cette infrastructure en place, ajouter un
changement de devise sur `/account` est trivial (un `PATCH` sur `app/api/account/route.ts`
qui n'a aujourd'hui qu'un `DELETE`, + le même `<select>` réutilisé) — à ne faire que si
l'utilisateur le demande explicitement dans une prochaine étape.

---

## 6. Propagation dans le code

### 6.1 Composants serveur avec accès direct à `user` (appellent déjà `getCurrentUser()`)

Ajouter simplement `user.currency` à chaque appel `formatCents(cents)` →
`formatCents(cents, user.currency)`. Aucune requête supplémentaire.

- `app/(app)/expenses/page.tsx`
- `app/(app)/dashboard/page.tsx`
- `app/(app)/fixed-charges/page.tsx`
- `app/(app)/loans/page.tsx`
- `app/(app)/savings/page.tsx`
- `app/(app)/incomes/page.tsx`
- `app/(app)/household/page.tsx` — voir caveat section 7

### 6.2 Composants serveur SANS accès direct à `user` (reçoivent des props d'un parent qui, lui, a `user`)

Faire remonter `currency` en prop explicite depuis le parent (pas de nouvel appel
`getCurrentUser()`, pas de Context — React Context ne traverse pas les Server
Components) :

- `components/dashboard/AlertsPanel.tsx` — rendu par `app/(app)/dashboard/page.tsx`,
  pas de `"use client"`. Ajouter une prop `currency: Currency` à `AlertsPanel` et
  passer `user.currency` depuis `dashboard/page.tsx`.

### 6.3 Composants client (`"use client"`) → `CurrencyProvider` + `useCurrency()`

Nouveau mécanisme, posé **une seule fois** :

1. `components/providers/CurrencyProvider.tsx` (nouveau fichier, Client Component) :
   ```tsx
   "use client";
   import { createContext, useContext } from "react";
   import type { Currency } from "@/backend/types";

   const CurrencyContext = createContext<Currency>("EUR");

   export function CurrencyProvider({
     currency,
     children,
   }: {
     currency: Currency;
     children: React.ReactNode;
   }) {
     return (
       <CurrencyContext.Provider value={currency}>{children}</CurrencyContext.Provider>
     );
   }

   export function useCurrency(): Currency {
     return useContext(CurrencyContext);
   }
   ```
2. `app/(app)/layout.tsx` (Server Component, a déjà `user`) : envelopper `children`
   (et `AppHeader`/`BottomNav` si besoin d'affichage devise dans le header plus tard) :
   ```tsx
   <CurrencyProvider currency={user.currency}>
     <AppHeader user={user} />
     <div className="...">{children}</div>
     <BottomNav />
   </CurrencyProvider>
   ```
   Ce pattern (Provider Client Component posé dans un layout serveur, wrappant des
   Server Components enfants) est le pattern documenté officiellement par Next.js pour
   partager du contexte React entre Server et Client Components : le Context traverse
   l'arbre de rendu même à travers des Server Components intermédiaires, tant que le
   *consommateur* (`useCurrency()`) est appelé depuis un Client Component. Cela couvre
   tous les composants listés ci-dessous, même ceux profondément imbriqués sous des
   pages serveur (`SavingsGoalCard` sous `savings/page.tsx`, etc.) — zéro prop-drilling.

Composants à migrer vers `useCurrency()` (remplacer l'appel `formatCents(cents)` par
`formatCents(cents, currency)` avec `const currency = useCurrency();`) :

- `components/savings/SavingsGoalCard.tsx`
- `components/loans/LoanCard.tsx`
- `components/dashboard/analytics/AnalyticsLineChart.tsx`
- `components/dashboard/analytics/EpargneAnalyticsChart.tsx`
- `components/incomes/EditIncomeForm.tsx`
- `components/dashboard/CategoryBreakdownChart.tsx` (déjà `"use client"`)
- `components/dashboard/PurchaseSimulator.tsx`
- `components/dashboard/QuickIncomeCard.tsx`
- `components/dashboard/BalanceCard.tsx`

Cas particulier — `components/dashboard/analytics/AnalyticsHeadline.tsx` : ce fichier
n'a **pas** de directive `"use client"` propre, mais il n'est importé que par des
composants qui, eux, l'ont (`EpargneAnalyticsChart`, `RevenuAnalyticsChart`,
`DepensesAnalyticsChart`, `ChargesAnalyticsChart`, `PretAnalyticsChart`) : il fait donc
partie du graphe de modules client et peut appeler `useCurrency()` sans rien changer
d'autre. Ajouter `"use client"` en tête du fichier est optionnel mais recommandé pour
la lisibilité (rend explicite que ce composant n'est jamais rendu côté serveur).

### 6.4 Fonctions non-React (pas de Context possible) — paramètre explicite

- `backend/export/pdf.ts` : `buildMonthlyPdfReport(data: MonthlyReportData, currency: Currency)`.
- `backend/export/excel.ts` : `buildMonthlyExcelReport(data: MonthlyReportData, currency: Currency)`.
- Appelants, qui ont déjà `user` via `getCurrentUser()` :
  - `app/api/export/pdf/route.ts` → `buildMonthlyPdfReport(data, user.currency)`
  - `app/api/export/excel/route.ts` → `buildMonthlyExcelReport(data, user.currency)`

### 6.5 Fichier de définition et de test

- `backend/money.ts` — voir section 4.
- `backend/money.test.ts` — voir section 4 (ajouter cas TND/symbole, ne pas casser les cas EUR existants).

---

## 7. Labels/placeholders avec "€" codé en dur (hors `formatCents`)

Ces fichiers n'appellent pas `formatCents` mais affichent quand même `"€"` en dur dans
un label ou placeholder de formulaire (montant à *saisir*, pas à afficher) — ils
doivent utiliser `currencySymbol(currency)` (section 4) via `useCurrency()` (tous sont
déjà des Client Components) :

- `components/savings/SavingsGoalCard.tsx` — placeholder `"Ajouter un montant (€)"`
- `components/loans/LoanCard.tsx` — 2 placeholders (paiement, remboursement anticipé)
- `components/incomes/EditIncomeForm.tsx` — label `"Montant net perçu (€)"`
- `components/fixed-charges/NewFixedChargeForm.tsx` — label `"Montant mensuel (€)"`
- `components/expenses/NewExpenseForm.tsx` — label `"Montant (€)"`
- `components/dashboard/PurchaseSimulator.tsx` — placeholder `"Montant en €"`
- `components/dashboard/QuickIncomeCard.tsx` — placeholder `"Montant (€)"`
- `components/dashboard/BalanceCard.tsx` — label `"Corriger le solde total (€)"`
- `app/(app)/loans/new/page.tsx` — 2 labels (`"Montant restant dû (€)"`, `"Mensualité (€)"`)
- `app/(app)/savings/new/page.tsx` — label `"Montant à atteindre (€)"`
- `app/(app)/incomes/new/page.tsx` — label `"Montant net perçu (€)"`

Tous ces fichiers sont déjà `"use client"` (vérifié), donc `useCurrency()` s'y branche
sans changement structurel — remplacer par exemple `` `Montant (${currencySymbol(currency)})` ``.

---

## 8. Points d'attention sécurité / RGPD

- **Aucun risque RGPD direct** : la devise préférée n'est pas une donnée financière ni
  une donnée personnelle sensible au sens RGPD (pas de minimisation particulière à
  appliquer au-delà de ce qui existe déjà pour `User`).
- **Validation stricte côté serveur obligatoire** : le champ `currency` doit passer par
  `z.enum(SUPPORTED_CURRENCIES)` avant tout `prisma.user.create`/`update` — ne jamais
  faire confiance à une valeur brute envoyée par le client, même si le `<select>`
  frontend ne propose que les valeurs valides (un client modifié pourrait envoyer une
  chaîne arbitraire ; Prisma rejetterait une valeur hors enum avec une 500 non
  contrôlée si zod ne filtre pas en amont — la 400 propre vient de zod).
- **Foyer partagé (`/household`)** : `getHouseholdSummary()` additionne les montants de
  deux utilisateurs qui peuvent chacun avoir une devise différente, sans aucune
  conversion de change. Avec ce plan, le résumé combiné s'affichera simplement dans la
  devise de l'utilisateur qui consulte la page (`user.currency`), ce qui peut être
  trompeur si les deux membres du foyer n'ont pas la même devise (des centimes TND et
  des centimes EUR additionnés affichés comme un seul montant en EUR n'ont pas de sens
  économique réel). Ce plan ne résout pas la conversion (hors scope, nécessiterait un
  taux de change et une politique de mise à jour) — recommandation pour l'agent
  frontend : afficher un petit avertissement sur `/household` si `currency` diffère
  entre les membres liés (donnée déjà disponible via `PartnerLink.otherUser` — à
  étendre côté backend pour exposer la devise de l'autre membre si ce garde-fou est
  jugé nécessaire dès cette phase, sinon le noter comme dette technique connue).
- **Pas de logging de la devise en clair à éviter** : ce n'est pas un montant, aucune
  règle du projet ne s'applique ici.

---

## 9. Checklist d'exécution pour l'agent backend

1. `prisma/schema.prisma` : ajouter `enum Currency` + `User.currency` (section 2).
2. `prisma migrate dev --name add_user_currency`.
3. `backend/types.ts` : ajouter `Currency`, `SUPPORTED_CURRENCIES`, `CURRENCY_LABELS`,
   étendre `AuthUser` (section 3).
4. `backend/auth.ts`, `app/api/auth/signup/route.ts`, `app/api/auth/login/route.ts` :
   propager `currency` dans chaque construction d'`AuthUser` (section 3).
5. `backend/validations/auth.ts` : ajouter le champ `currency` à `signupSchema` (section 5).
6. `backend/money.ts` : `formatCents(cents, currency?)` + `currencySymbol(currency?)`
   (section 4). Mettre à jour `backend/money.test.ts`.
7. `backend/export/pdf.ts` / `backend/export/excel.ts` : ajouter le paramètre
   `currency` (section 6.4), mettre à jour les deux routes appelantes.
8. `components/providers/CurrencyProvider.tsx` : nouveau fichier (section 6.3).
9. `app/(app)/layout.tsx` : brancher le `CurrencyProvider` (section 6.3).

## 10. Checklist d'exécution pour l'agent frontend (après le backend)

1. `app/signup/page.tsx` : ajouter le `<select>` devise (section 5).
2. Mettre à jour tous les appels `formatCents(cents)` listés en section 6.1/6.2/6.3
   pour passer explicitement la devise (`user.currency`, prop, ou `useCurrency()`
   selon la catégorie du fichier).
3. Remplacer tous les `"(€)"` codés en dur listés en section 7 par
   `currencySymbol(currency)`.
4. Sur `/household`, envisager l'avertissement mentionné en section 8 si les devises
   des membres diffèrent (sinon documenter la limitation en commentaire).
