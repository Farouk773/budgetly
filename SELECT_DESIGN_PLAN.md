# Spec design — Listbox custom (remplacement des `<select>` natifs)

Contexte : voir `DESIGN_SYSTEM.md` pour les fondations (dégradé de marque, tokens de surface, cartes, boutons, transitions). Ce document spécifie un unique composant réutilisable — appelons-le `Select` (ou `Listbox`) — qui doit remplacer les 7 usages de `<select>` natif listés ci-dessous, sans changer leur comportement fonctionnel (valeur contrôlée, `onChange`).

## Fichiers concernés (pour information, à traiter par l'agent frontend)

1. `components/expenses/NewExpenseForm.tsx` — catégorie de dépense
2. `components/fixed-charges/NewFixedChargeForm.tsx` — catégorie de charge fixe
3. `components/dashboard/QuickIncomeCard.tsx` — type de revenu
4. `components/incomes/EditIncomeForm.tsx` — type de revenu
5. `app/(app)/incomes/new/page.tsx` — type de revenu
6. `components/dashboard/BalanceCard.tsx` — "Ce montant, c'est..." (BANK / CASH / MIXED)
7. `app/signup/page.tsx` — devise d'affichage

Tous partagent aujourd'hui la même base visuelle de champ :
`rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-white/15`. Le nouveau composant doit reprendre exactement cette base pour le bouton fermé, afin de rester visuellement identique aux `<input>` du même formulaire.

---

## 1. Bouton fermé (trigger)

Doit être indiscernable d'un `<input>` texte du formulaire — même hauteur, même rayon, même bordure — pour que l'œil ne perçoive aucune rupture entre les champs d'un même form.

- Conteneur : `<button type="button">` pleine largeur du champ (`w-full`), pas un `<div>` cliquable.
- Layout interne : texte de la valeur sélectionnée à gauche, chevron à droite. `flex items-center justify-between gap-2`.
- Classes de base (reprises telles quelles du `<select>` actuel) :
  `w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm text-left transition-colors dark:border-white/15`
- Texte de la valeur : `text-slate-900 dark:text-slate-100`. Si aucune valeur sélectionnée (cas rare, normalement toujours une valeur par défaut) : placeholder en `text-slate-400 dark:text-slate-500`.
- Chevron : icône chevron-down 16px, `text-slate-400 dark:text-slate-500`, transition `transform 0.2s ease` — **rotation 180°** quand le popup est ouvert (`rotate-180`). C'est le seul indice visuel supplémentaire par rapport à l'actuel, et il renforce la sensation de fluidité.
- États du bouton fermé :
  - **Repos** : tel que décrit ci-dessus.
  - **Hover** : `border-slate-400 dark:border-white/25` (léger raffermissement de la bordure, pas de fond).
  - **Focus clavier / ouvert** : reprendre exactement le style de focus des `<input>` du form pour la cohérence : `border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-500/20`. Garder cet état actif tant que le popup est ouvert (pas seulement au focus initial), pour que l'utilisateur voie clairement à quel champ le popup ouvert appartient.
  - **Disabled** (si un jour nécessaire) : `opacity-50 cursor-not-allowed`, popup non ouvrable.
- Fond : `bg-transparent` en thème clair, comme aujourd'hui. En thème sombre, les usages avec `dark:bg-[#131a2e]` (BalanceCard, signup) doivent garder ce fond plein — sinon `bg-transparent` (les selects de catégorie/type de revenu héritent du fond de leur `card-surface` parent).

## 2. Popup ouvert (panel d'options)

Doit avoir un rendu "premium", pas un simple menu plat collé au champ — d'où l'usage d'une vraie carte élevée, cohérente avec `.card-elevated` mais en version plus légère (le popup ne doit pas dominer visuellement l'écran).

- Positionnement : `absolute`, ancré sous le trigger (`top: 100% + 6px`), largeur = largeur du trigger au minimum, `min-width: 100%` (peut être légèrement plus large si le contenu l'exige, jamais plus étroit).
- Fond : `var(--surface)` — pas `--surface-muted` — pour que le popup se détache clairement du fond de la carte/form qui est souvent déjà `--surface` ou `--surface-muted`. En thème sombre ça donne `#131a2e`, cohérent avec le `dark:bg-[#131a2e]` déjà utilisé sur les selects à fond plein.
- Bordure : `1px solid var(--surface-border-strong)` — la variante "strong" (pas la bordure fine des cartes plates) pour bien détacher le popup, vu qu'il flotte au-dessus du contenu.
- Rayon : `rounded-xl` (0.75rem), légèrement inférieur au `card-surface` (1rem) pour marquer visuellement que c'est un élément flottant plus petit, pas une carte de page.
- Ombre : c'est l'élément clé du côté "attractif/premium". Ne pas se contenter d'une ombre neutre grise plate — reprendre l'esprit de `--brand-shadow` (teinte violette/indigo) utilisé par `.card-elevated`, mais plus discrète puisque le popup est petit et flotte au-dessus d'interactions fréquentes :
  `box-shadow: 0 12px 28px -8px var(--brand-shadow), 0 4px 10px rgba(15, 23, 42, 0.08)`
  Cela donne une ombre colorée subtilement mauve/indigo qui rattache visuellement le popup à l'identité de marque, sans être criarde.
- Padding interne : `p-1.5` autour de la liste d'options (pas d'options collées aux bords du popup).
- Largeur max en pratique : les listes sont courtes (3 à ~8 catégories), donc pas de scroll interne à prévoir dans le cas général ; si une liste dépasse ~8 items (catégories de dépenses par ex.), prévoir `max-h-64 overflow-y-auto` avec un scroll natif discret (pas de scrollbar custom nécessaire dans un premier temps).
- z-index : suffisant pour passer au-dessus des cartes voisines et du `BottomNav` mobile (`z-50`).

## 3. États des options

Chaque option est un `<li role="option">` (ou équivalent), hauteur confortable au clic/tactile (voir section 6), avec les états suivants :

- **Repos** : `text-slate-700 dark:text-slate-200`, fond transparent, `rounded-lg` (arrondi interne pour que le hover/sélection n'ait pas d'angles vifs même si le popup externe est arrondi), padding `px-3 py-2`.
- **Hover (survol souris)** : fond teinté marque à faible opacité, pas la couleur pleine — évite l'effet "bloc plein" agressif tout en signalant clairement l'item survolé :
  `bg-indigo-50 dark:bg-indigo-500/10`, texte inchangé (pas besoin de contraste fort au simple survol).
- **Focus clavier (navigation flèches)** : même traitement visuel que le hover pour cohérence (`bg-indigo-50 dark:bg-indigo-500/10`), avec en plus un léger anneau interne ou une bordure gauche accent pour les utilisateurs qui naviguent au clavier sans souris — proposition : une barre verticale de 2px à gauche de l'option, en dégradé de marque (`bg-brand-gradient`), à l'intérieur du padding. C'est discret mais donne un repère net qui bouge avec les flèches.
- **Sélectionné (valeur actuelle)** : c'est l'état qui doit le plus se démarquer, car il remplace le surlignage bleu générique du navigateur que l'utilisateur reproche.
  - Fond : dégradé de marque en version douce, pas plein — `bg-gradient-to-r from-violet-500/15 via-indigo-500/15 to-blue-500/15` (mauve → indigo → bleu, cohérent avec `--brand-from/via/to`), ou plus simplement une teinte indigo unique à 12-15% d'opacité si le dégradé est visuellement trop chargé sur un item aussi petit — à trancher en implémentation selon le rendu réel, mais l'intention est : **on doit reconnaître l'item sélectionné à sa teinte de marque, pas au bleu système**.
  - Texte : `text-indigo-700 dark:text-indigo-300`, `font-medium` (au lieu de `font-normal`) pour distinguer l'option active même sans regarder la couleur (accessibilité daltonisme).
  - Icône check (chevron ou coche) à droite de l'item sélectionné, 16px, `text-indigo-600 dark:text-indigo-400` — signal redondant avec la couleur, important pour l'accessibilité.
  - Si un item est à la fois sélectionné ET survolé/focus clavier : le fond de sélection prime, ne pas superposer les deux traitements (évite un mélange de teintes confus).
- **Transition** : chaque option a `transition-colors duration-150 ease-out` sur son fond — pas d'animation individuelle plus complexe, le fluide vient surtout de l'animation d'ouverture du popup (section 4) et du hover instantané mais adouci.

## 4. Animation d'ouverture / fermeture

Objectif : donner une sensation "fluide" citée par l'utilisateur, en réutilisant le vocabulaire d'animation déjà présent dans l'app plutôt que d'inventer un nouveau système.

- **Ouverture** : reprendre `.animate-scale-in` tel que défini dans `app/globals.css` (fade + scale de 0.96 → 1, `0.16s ease-out`) — c'est déjà la classe utilisée pour l'apparition de dialogues/formulaires dans l'app, donc cohérent. Ajouter une légère translation verticale d'origine (le popup "sort" de sous le trigger) : partir de `translateY(-4px) scale(0.97)` vers `translateY(0) scale(1)`, opacité 0 → 1, `150ms ease-out`. Si on veut rester strictement DRY avec l'existant, `.animate-scale-in` seul (sans translateY) est acceptable aussi — la priorité est la cohérence avec le reste de l'app plutôt que l'invention d'un effet inédit.
- **Origine de la transformation** : `transform-origin: top` (le popup s'ouvre "vers le bas" depuis le trigger, jamais depuis le centre).
- **Fermeture** : plus rapide que l'ouverture pour ne pas donner l'impression de ralentir l'utilisateur qui a déjà fait son choix — fade-out simple, opacité 1 → 0, `100ms ease-in`, sans nécessairement rejouer le scale inverse (une fermeture instantanée dès le clic sur une option, avec juste un fade très bref, suffit ; ne pas faire attendre l'utilisateur pour voir sa sélection appliquée).
- **Chevron du trigger** : rotation synchronisée avec l'ouverture, `200ms ease` (légèrement plus longue que le popup pour un effet de "traîne" doux, pas de saccade).
- Pas d'animation individuelle par option à l'ouverture (pas de stagger) — la liste est courte, un stagger ajouterait de la latence perçue sans bénéfice, contraire à l'objectif "en quelques secondes" mobile-first du produit.

## 5. Comportement clavier attendu

Le composant doit respecter le pattern ARIA "Listbox"/"Combobox" standard, a minima :

- **Clic ou `Entrée`/`Espace` sur le trigger** (quand fermé, focus dessus) : ouvre le popup, le focus logique se place sur l'option actuellement sélectionnée (ou la première option si aucune valeur).
- **Flèche bas / Flèche haut** : déplace la surbrillance (état "focus clavier" de la section 3) d'une option à la suivante/précédente, sans fermer le popup. Si en bout de liste, ne pas boucler (rester sur le dernier/premier item) — comportement plus prévisible qu'un cycle infini pour des listes courtes.
- **`Entrée`** (popup ouvert, option en surbrillance) : valide la sélection, ferme le popup, redonne le focus visuel au trigger, déclenche `onChange`.
- **`Échap`** : ferme le popup sans changer la valeur, focus repasse sur le trigger.
- **`Tab`** : ferme le popup (sans changer la valeur si aucune sélection explicite n'a eu lieu) et poursuit la navigation normale du formulaire vers le champ suivant — ne jamais piéger le focus dans le popup.
- **Recherche par lettre (typeahead)** : quand le popup est ouvert (ou même fermé, focus sur le trigger) et que l'utilisateur tape une lettre, la sélection saute à la première option dont le libellé commence par cette lettre. Utile ici surtout pour la liste des devises (potentiellement plus longue) et les catégories de dépenses.
- **Clic en dehors du popup** : ferme le popup sans changer la valeur (comportement identique à `Échap`).
- Le trigger doit exposer `aria-haspopup="listbox"`, `aria-expanded`, et le popup `role="listbox"` avec chaque option `role="option"` + `aria-selected` — nécessaire pour que le composant reste au moins aussi accessible que le `<select>` natif qu'il remplace.

## 6. Comportement mobile / tactile

- Le popup ne doit jamais être plus petit/dense qu'au clavier-souris — pas de mode "compact" spécifique mobile, la même mise en page fonctionne car les formulaires de l'app sont déjà mobile-first en pleine largeur.
- Hauteur tactile de chaque option : minimum 44px de zone cliquable (recommandation d'accessibilité tactile standard), obtenue avec `py-2.5` à `py-3` plutôt que `py-2` si le rendu final est en dessous de 44px avec le padding de la section 3 — à ajuster en implémentation selon le rendu réel avec la police du design system.
- Pas de survol tactile bien sûr : sur mobile, seul l'état "sélectionné" (section 3) doit rester visible en permanence dans le popup ouvert, pas de fond hover fantôme au premier tap.
- Le tap sur une option sélectionne immédiatement et ferme le popup (pas de bouton "valider" séparé) — cohérent avec l'usage rapide "en quelques secondes" visé par le produit.
- Si le clavier virtuel du téléphone risque de recouvrir le popup (cas où le trigger est bas dans le viewport, ex. formulaires en bas d'écran) : ce composant n'ouvre pas de clavier (ce n'est pas un champ texte), donc pas de conflit à gérer — mais s'assurer que le popup reste toujours entièrement visible dans le viewport (si le trigger est trop bas, le popup peut s'ouvrir vers le haut plutôt que vers le bas — comportement "flip" standard, à activer seulement si l'espace en dessous est insuffisant, avec `transform-origin: bottom` dans ce cas).
- Pas de retrait visuel du chrome navigateur mobile à gérer puisqu'il ne s'agit plus d'un `<select>` natif : c'est justement tout l'intérêt de ce composant, l'app garde entièrement la main sur le rendu, y compris sur mobile Safari/Chrome où le `<select>` natif ouvrait auparavant sa propre feuille système.

---

## Résumé pour l'agent frontend

Un seul composant `Select` à créer (ex. `components/ui/Select.tsx`), API proche du `<select>` natif contrôlé (`value`, `onChange`, liste d'options `{ value, label }`), à substituer dans les 7 fichiers listés en tête de document. Réutiliser tel quel : `.animate-scale-in` (ou variante décrite en section 4), les tokens `--surface` / `--surface-muted` / `--surface-border-strong` / `--brand-from` / `--brand-via` / `--brand-to` / `--brand-shadow` déjà déclarés dans `app/globals.css`, et les classes de champ existantes (`rounded-lg border border-slate-300 ... dark:border-white/15`) pour le trigger fermé. Ne pas conserver le `<select>` natif, même caché — le nouveau composant doit être piloté entièrement en React/clavier pour garantir l'accessibilité décrite en section 5.
