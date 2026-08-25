# Design system — Budgetly

Identité visuelle définie pour rendre l'app reconnaissable, appliquée pour l'instant au **dashboard** (layout, header, nav). Les autres pages (dépenses, charges fixes, prêts, épargne, revenus, foyer, compte) suivent la même recette dans un prochain passage.

## Palette

- **Dégradé de marque** (mauve → indigo → bleu) : `bg-brand-gradient` (fond) et `text-brand-gradient` (texte en dégradé), définis dans `app/globals.css` via les variables `--brand-from` / `--brand-via` / `--brand-to`.
- Réservé aux éléments clés : carte héro du solde disponible, logo dans le header, montants importants (solde de départ), bouton d'action principal d'une carte.
- **Neutres** : `--background` / `--foreground` / `--surface` basculent automatiquement en mode sombre (`prefers-color-scheme: dark`), pas de bascule manuelle pour l'instant.
- Couleurs sémantiques inchangées et volontairement douces : `emerald` (positif), `amber` (attention, jamais de rouge agressif), `rose` réservé aux confirmations de suppression uniquement.

## Profondeur (3D / glassmorphism) — à utiliser avec parcimonie

- `.card-surface` : carte plate du quotidien (listes, formulaires, la majorité des cartes).
- `.card-elevated` : carte à relief (ombre douce colorée + bordure plus marquée), réservée aux 1-2 éléments les plus importants d'un écran — la carte héro du solde et `BalanceCard`. Ne pas l'utiliser partout.

## Boutons — `components/ui/Button.tsx`

| Variant | Usage |
|---|---|
| `primary` | LE bouton principal d'une carte/formulaire (dégradé de marque). Un seul par carte. |
| `secondary` | Bouton **Annuler**, actions secondaires. |
| `ghost` | Actions discrètes (ex. "Corriger"). |
| `danger` | Confirmation d'une action destructive, dans `ConfirmDialog` uniquement. |

## Boutons d'annulation systématiques

Règle : toute action qui modifie une donnée doit afficher un bouton **Annuler** à côté de la confirmation.
- Édition (ex. correction du solde) → `Annuler` ferme le formulaire sans sauvegarder (déjà en place, restylé).
- Création avec brouillon (ex. ajout de revenu) → `Annuler` n'apparaît que si l'utilisateur a commencé à saisir, et réinitialise le formulaire.
- **Suppression** → ne jamais supprimer directement au clic. Utiliser `components/ui/ConfirmDialog.tsx` (déjà prêt, pas encore branché sur une page) : bouton `secondary` "Annuler" + bouton `danger` "Confirmer", fermeture au clic extérieur ou `Échap`. À brancher sur les boutons de suppression des pages dépenses / charges fixes / prêts / revenus / compte lors du prochain passage.

## Transitions

- Cartes/inputs : transitions douces déjà incluses dans `.card-surface`/`.card-elevated`/`.btn-base` (200ms).
- Apparition d'un état (erreur, résultat, alerte) : classe utilitaire `.animate-fade-in`.
- Apparition d'un dialogue/formulaire : `.animate-scale-in`.

## Contrainte respectée

Pas de bouton flottant en bas à gauche — la navigation mobile reste une barre pleine largeur (`BottomNav`).

## Prochaine étape

Appliquer `card-surface`/`card-elevated`/`Button`/dark: variants aux pages : `expenses`, `fixed-charges`, `incomes`, `loans`, `savings`, `household`, `account`, `login`, `signup` — et brancher `ConfirmDialog` sur chaque suppression.
