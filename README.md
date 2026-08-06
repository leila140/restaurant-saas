# Restaurant SaaS

SaaS de gestion de restaurant : menu public par QR code, commandes en temps réel, réservations, encaissement et rapport de caisse.

## Fonctionnalités

- **Menu public** : menu consultable en ligne, QR code par table, suivi de commande en temps réel.
- **Commandes en temps réel** : nouvelle commande, changement de statut (`pending` → `preparing` → `ready` → `served` → `paid` / `cancelled`), son de notification, filtres et badge « en cours ».
- **Réservations** : prise de réservation publique, statuts (en attente / confirmée / refusée), feuille du jour imprimable.
- **Encaissement** : espèces ou carte, remise (%), pourboire, ticket imprimable, historique des reçus.
- **Rapport de caisse (Z-report)** : total encaissé par jour, répartition espèces/carte, remises, pourboires, tickets, panier moyen, détail par table — imprimable.
- **Export CSV** des commandes sur une période.
- **Dashboard** : revenus, commandes actives, top articles, revenus par catégorie.
- **Gestion du compte** : profil, changement de mot de passe, suppression du compte (avec purge en cascade).
- **PWA** : installable, coquille d'app en cache, mode hors-ligne (lecture seule).
- **Notifications** (optionnelles) : email via Resend, SMS via Twilio.

### Rôles

| Rôle | Accès |
|---|---|
| `owner` | Tout : dashboard, menu, commandes, tables, réservations, équipe, réglages |
| `manager` | Dashboard, commandes, tables, réservations |
| `kitchen` | Commandes uniquement |
| `server` | Commandes, tables, encaissement |

## Stack technique

- **Frontend** : React 19, Vite 8, Tailwind CSS 4, TanStack Query, Socket.io-client, PWA (vite-plugin-pwa).
- **Backend** : Node.js, Express 5, Mongoose 9, Socket.io, JWT, bcrypt, multer, qrcode.

## Prérequis

- Node.js 20+
- MongoDB (locale via `mongod` ou Atlas)

## Installation

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # puis éditez .env
npm run dev            # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173 (proxy /api et /socket.io vers :5000)
```

## Variables d'environnement (backend/.env)

| Variable | Description | Défaut |
|---|---|---|
| `PORT` | Port du serveur | `5000` |
| `MONGODB_URI` | URI de connexion MongoDB | `mongodb://localhost:27017/restaurant-saas` |
| `JWT_SECRET` | Secret des access tokens | — |
| `JWT_REFRESH_SECRET` | Secret des refresh tokens | — |
| `CLIENT_URL` | Origines autorisées (CORS, séparées par virgules) | `http://localhost:5173` |
| `RESEND_API_KEY` / `RESEND_FROM` | Emails transactionnels (optionnel) | — |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM` | SMS (optionnel) | — |

## Scripts

**Backend**
- `npm run dev` — démarrage avec rechargement automatique (nodemon)
- `npm start` — démarrage en production

**Frontend**
- `npm run dev` — serveur de développement
- `npm run build` — build de production
- `npm run lint` — oxlint
- `npm run preview` — prévisualisation du build (`http://localhost:4173`)

## PWA / hors-ligne

Le service worker n'est généré qu'au build. Pour tester l'installation et le mode hors-ligne :

```bash
cd frontend
npm run build
npm run preview   # http://localhost:4173
```

À noter : le service worker ne s'enregistre que sur `localhost` ou en HTTPS (pas sur une IP en HTTP).

## Structure du projet

```
backend/
  config/       # connexion MongoDB
  controllers/  # logique métier (auth, orders, menu, tables, …)
  middleware/   # auth, tenant, roleCheck, upload
  models/       # schémas Mongoose
  routes/       # routes Express
  services/     # notifications (Resend, Twilio)
  sockets/      # Socket.io
  scripts/      # utilitaires (nettoyage de données de test)
  server.js     # point d'entrée
frontend/
  src/
    components/ # UI réutilisable (modales, squelette, …)
    context/    # AuthContext
    hooks/      # useSocket, useOnline
    pages/      # auth, dashboard, public
    services/   # client API
    utils/      # csv, sound, hours
```


