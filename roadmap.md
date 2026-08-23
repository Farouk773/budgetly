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
- [ ] Modèle de données : Charge fixe / Dépense
- [ ] Ajout de charges fixes récurrentes
- [ ] Ajout de dépenses ponctuelles
- [ ] Catégories (manuelles pour l'instant, IA plus tard)

## Phase 4 — Solde en temps réel (point 3)
- [ ] Calcul : revenu − charges − dépenses = reste disponible
- [ ] Affichage du solde total actuel
- [ ] Simulateur "puis-je me permettre cet achat"

## Phase 5 — Dashboard basique (point 7, version simple)
- [ ] Vue d'ensemble du mois en cours
- [ ] Répartition des dépenses (graphique simple)

## Phase 6 — Épargne (point 4)
- [ ] Objectifs d'épargne
- [ ] Suggestion de montant à épargner
- [ ] Suivi de progression

## Phase 7 — Dettes et prêts (point 5)
- [ ] Modèle de données : Prêt
- [ ] Suivi du montant restant / mensualités
- [ ] Impact affiché sur le budget mensuel

## Phase 8 — Intelligence artificielle (point 6)
- [ ] Extraction automatique de fiche de paie via API Claude
- [ ] Catégorisation automatique des dépenses via IA
- [ ] Chat conversationnel (poser des questions sur son budget)
- [ ] Conseils personnalisés générés automatiquement

## Phase 9 — Motivation et gamification (point 8)
- [ ] Messages de motivation contextuels
- [ ] Badges/streaks liés à de vrais comportements

## Phase 10 — Notifications et alertes (point 9)
- [ ] Alerte risque de découvert
- [ ] Rappel d'échéances (loyer, prêts, abonnements)

## Phase 11 — Monétisation (point 11)
- [ ] Plan gratuit vs. payant
- [ ] Intégration paiement (Stripe)
- [ ] Limitation des fonctionnalités IA au plan payant

## Phase 12 — Fonctionnalités additionnelles (point 12)
- [ ] Export PDF/Excel du bilan
- [ ] Multi-devises (si pertinent)
- [ ] Partage de budget en couple/famille
- [ ] Intégration bancaire (Open Banking) — optionnel, post-MVP

## Phase 13 — Finitions techniques (reste du point 13)
- [ ] Gestion des erreurs d'extraction IA (correction manuelle possible)
- [ ] Tests de bout en bout
- [ ] Audit sécurité / RGPD final
- [ ] Optimisation performance

---
**Statut actuel : Phase 2 terminée. Accord global reçu pour enchaîner toutes les phases restantes sans validation intermédiaire.**
