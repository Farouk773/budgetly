# Roadmap MVP — App de gestion de salaire

Ordre de développement logique (les fondations d'abord, l'IA après avoir un squelette fonctionnel).
Chaque étape correspond à un ou plusieurs points de la spec initiale (indiqué entre parenthèses).

## Phase 0 — Setup technique (base du point 13)
- [x] Initialiser Next.js + TypeScript + Tailwind
- [x] Configurer PostgreSQL + Prisma
- [x] Structure de dossiers (app/, components/, lib/, prisma/)
- [ ] Déploiement initial vide sur Vercel (différé — développement en local pour l'instant, hébergement Vercel prévu à la fin)
- [x] Variables d'environnement (.env) + gestion des secrets (clé API Claude, DB)

## Phase 1 — Compte utilisateur et sécurité (point 10)
- [x] Authentification (email/mot de passe)
- [x] Modèle User en base
- [x] Sessions sécurisées
- [x] Pages login/signup basiques

## Phase 2 — Gestion des revenus (point 1)
- [x] Modèle de données : Salaire/Revenu
- [x] Ajout manuel d'un salaire
- [x] Upload de fiche de paie (stockage fichier, sans extraction IA pour l'instant)
- [x] Historique des salaires

## Phase 3 — Gestion des dépenses (point 2)
- [x] Modèle de données : Charge fixe / Dépense
- [x] Ajout de charges fixes récurrentes
- [x] Ajout de dépenses ponctuelles
- [x] Catégories (manuelles pour l'instant, IA plus tard)

## Phase 4 — Solde en temps réel (point 3)
- [x] Calcul : revenu − charges − dépenses = reste disponible
- [x] Affichage du solde total actuel
- [x] Simulateur "puis-je me permettre cet achat"

## Phase 5 — Dashboard basique (point 7, version simple)
- [x] Vue d'ensemble du mois en cours
- [x] Répartition des dépenses (graphique simple)

## Phase 6 — Épargne (point 4)
- [x] Objectifs d'épargne
- [x] Suggestion de montant à épargner
- [x] Suivi de progression

## Phase 7 — Dettes et prêts (point 5)
- [x] Modèle de données : Prêt
- [x] Suivi du montant restant / mensualités
- [x] Impact affiché sur le budget mensuel
- [x] Simulateur de remboursement anticipé (bonus, prévu dans la spec initiale section 5)

## Phase 8 — Intelligence artificielle (point 6)
**Différée — nécessite une clé API Anthropic réelle pour être testée. Reprendre cette phase quand la clé sera fournie.**
- [ ] Extraction automatique de fiche de paie via API Claude
- [ ] Catégorisation automatique des dépenses via IA
- [ ] Chat conversationnel (poser des questions sur son budget)
- [ ] Conseils personnalisés générés automatiquement

## Phase 9 — Motivation et gamification (point 8)
- [x] Messages de motivation contextuels
- [x] Badges/streaks liés à de vrais comportements

## Phase 10 — Notifications et alertes (point 9)
- [x] Alerte risque de découvert
- [x] Rappel d'échéances (loyer, prêts, abonnements) — alertes in-app sur le dashboard ; email/push differé (nécessite un service d'envoi externe)

## Phase 11 — Monétisation (point 11)
**Différée — nécessite un compte Stripe (clés API) pour être testée. Reprendre quand les clés seront fournies.**
- [ ] Plan gratuit vs. payant
- [ ] Intégration paiement (Stripe)
- [ ] Limitation des fonctionnalités IA au plan payant

## Phase 12 — Fonctionnalités additionnelles (point 12)
- [x] Export PDF/Excel du bilan
- [~] Multi-devises — non implémenté, la spec le marque "si pertinent" ; aucun signal d'usage hors zone euro pour l'instant, à réévaluer si besoin
- [x] Partage de budget en couple/famille (invitation par email, vue commune en lecture seule, aucune donnée individuelle n'est mutualisée sans acceptation des deux côtés)
- [ ] Intégration bancaire (Open Banking) — optionnel, post-MVP, nécessite un compte fournisseur (Powens/Budget Insight) : différé

## Phase 13 — Finitions techniques (reste du point 13)
- [x] Gestion des erreurs d'extraction IA (correction manuelle possible) — page de correction pour les revenus (GET/PATCH/DELETE déjà en place depuis la Phase 2, page d'édition ajoutée) ; s'appliquera directement à l'extraction IA une fois la Phase 8 activée
- [x] Tests de bout en bout — 113 tests unitaires (logique financière, validation) + parcours complet vérifié manuellement en conditions réelles (signup → revenus/dépenses/charges/prêts/épargne/solde/alertes/motivation/export/foyer → suppression de compte), 0 régression
- [x] Audit sécurité / RGPD final — voir détail ci-dessous
- [x] Optimisation performance — index DB sur tous les champs userId/date, pas de N+1, requêtes agrégées (aggregate/groupBy) plutôt que boucles

**Audit sécurité/RGPD (résultat) :**
- Toutes les routes API (hors signup/login/logout/me) vérifient l'authentification ; toutes les routes à `[id]` vérifient la propriété de la ressource (userId) avant lecture/modification/suppression
- Toutes les routes acceptant un body JSON le valident avec zod ; aucun parsing numérique non contrôlé en dehors des validateurs centralisés (lib/validations/money.ts)
- Mots de passe hashés (bcrypt), tokens de session hashés en base (sha256), aucune donnée sensible loguée (aucun `console.*` dans app/ ou lib/ hors scripts de seed/tests)
- RGPD : export complet des données (`/api/account/export`, exclut le hash de mot de passe) et suppression de compte avec confirmation par mot de passe (`DELETE /api/account`), suppression en cascade vérifiée en base (0 ligne orpheline) y compris les fichiers de fiches de paie sur disque
- `.env` non versionné, aucun secret en dur dans le code
- Lacune connue : 2FA non implémentée (recommandée par la spec section 10, non bloquante, non présente dans la checklist initiale de la Phase 1)

---
**Statut actuel : 11 des 13 phases terminées (1 à 7, 9, 10, 12, 13). Phases 8 et 11 différées (clé API Anthropic / compte Stripe requis). L'app est fonctionnellement complète pour un usage local ; le déploiement Vercel (Phase 0) reste à faire à la demande de l'utilisateur.**
