# Gemini Chatbot - Test Technique
Ce projet est une application de chat en temps réel alimentée par le LLM Google Gemini, développée dans le cadre du processus de recrutement. L'application met l'accent sur une UX moderne, la sécurité des données et la performance.

## Fonctionnalités Clés
- Chat en Streaming : Réponse fluide et progressive (effet machine à écrire) pour réduire la latence perçue.

- Authentification Complète : Gestion des utilisateurs (Inscription/Connexion) via Supabase Auth.

- Historique Persistant : Sauvegarde automatique des conversations en base de données PostgreSQL.

- Design Responsive : Interface mobile-friendly ("Glassmorphism") réalisée avec Tailwind CSS.

- Monitoring Temps Réel : Calcul expérimental du débit de tokens (Tokens/sec).

## Choix d'Architecture
Voici les décisions techniques prises pour répondre aux contraintes :

1. Next.js 14 (App Router)

J'ai choisi l'App Router pour sa capacité à séparer clairement les Server Components (sécurité, accès DB) des Client Components (interactivité).

Sécurité API : La clé Gemini n'est jamais exposée au client. Les requêtes passent par une API Route (```/api/chat```) qui agit comme un proxy sécurisé.

2. Supabase (Backend-as-a-Service)

Utilisé pour gérer l'authentification et la base de données sans complexité inutile.

Row Level Security (RLS) : La sécurité est implémentée au niveau de la base de données. Une politique SQL garantit qu'un utilisateur ne peut lire que ses propres messages (```auth.uid() = user_id```).

3. Gestion de l'État & Streaming

L'application utilise un ReadableStream personnalisé entre le serveur Next.js et le client React. Cela permet d'afficher les premiers mots de l'IA instantanément (faible TTFT) sans attendre la génération complète de la réponse.

## Réponse au Bonus : Critique de la métrique "Tokens/s"
J'ai implémenté le compteur de tokens/seconde (TPS) comme demandé. Cependant, utiliser cette métrique comme unique KPI de performance dans le monde réel présente 4 défauts majeurs :

Ignorance de la Latence (TTFT) : Le TPS mesure le débit mais masque le temps d'attente initial ("Time To First Token"). Une app peut avoir un gros débit mais être très lente à démarrer, ce qui frustre l'utilisateur.

Dépendance Externe : Cette métrique mesure la santé des serveurs de Google, pas la qualité de notre code ou de notre infrastructure.

Limite Physiologique : Au-delà de ~30 tokens/s, l'humain ne peut plus lire en temps réel. Optimiser le débit au-delà de ce seuil n'apporte aucune valeur UX.

Variabilité : Le débit varie selon la complexité de la réponse (code vs texte simple), rendant la métrique instable pour des comparaisons fiables.

Conclusion : Un bon dashboard devrait prioriser le TTFT (réactivité) et le Taux d'erreur plutôt que le débit brut.

## Auteur
Charles Ndiaye
Développé avec TypeScript et Next.js
