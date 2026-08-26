# Projet : App de gestion de salaire (SaaS avec IA)

## Stack technique (obligatoire, ne pas dévier)
- **Framework** : Next.js (App Router) + TypeScript
- **Base de données** : PostgreSQL
- **ORM** : Prisma
- **IA** : API Claude (Anthropic) pour l'extraction de fiche de paie et le chat conversationnel
- **Déploiement cible** : Vercel
- **Style** : Tailwind CSS

## Contexte produit
Application qui permet à un utilisateur de :
- importer sa fiche de paie (lecture automatique par IA)
- suivre ses charges fixes et dépenses ponctuelles
- voir en temps réel combien il lui reste à dépenser/épargner
- suivre son épargne, ses prêts, et obtenir des conseils générés par IA
- voir un dashboard mensuel avec des éléments de motivation

Voir `roadmap.md` pour le détail complet des fonctionnalités et l'ordre de développement.

## RÈGLE DE FONCTIONNEMENT — TRÈS IMPORTANT
Ce projet se développe **étape par étape**, dans l'ordre défini dans `roadmap.md`.

À chaque fois qu'une étape est terminée et validée :
1. Coche la case correspondante dans `roadmap.md`
2. Fais un résumé court de ce qui a été fait
3. Indique clairement **quelle est la prochaine étape** à développer (nom + numéro + ce qu'elle contient)
4. Ne passe JAMAIS à l'étape suivante sans confirmation explicite de l'utilisateur

Ne saute jamais une étape. Ne développe pas plusieurs étapes en même temps, sauf demande explicite.

## Règles générales de code
- TypeScript strict partout, pas de `any` sauf cas justifié
- Toutes les données financières (montants) en centimes (integer), jamais en float, pour éviter les erreurs d'arrondi
- Toute route API doit valider les entrées (zod recommandé)
- Les données sensibles (fiches de paie, montants) ne doivent jamais être loggées en clair
- Commits atomiques, un commit = une fonctionnalité claire

## Agents disponibles
Voir `.claude/agents/` — 6 agents spécialisés : `architecte`, `backend`, `frontend`, `design`, `ia-data`, `test`.
Utilise l'agent adapté à chaque tâche plutôt que de tout faire dans le contexte principal.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
