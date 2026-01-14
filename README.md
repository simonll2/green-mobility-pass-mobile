# Green Mobility Pass - Backend API (V1 POC)

Backend FastAPI pour le projet Green Mobility Pass (PFE Michelin & SNCF - Movin'On).

## Stack Technique

- **Framework** : FastAPI 0.121.2
- **ORM** : SQLModel 0.0.27 (Pydantic + SQLAlchemy)
- **Base de donnees** : PostgreSQL 16
- **Authentification** : JWT (python-jose)
- **Hashage** : Argon2 (passlib)
- **Serveur ASGI** : Uvicorn

## Installation

### 1. Cloner le projet

```bash
git clone https://github.com/simonll2/green-mobility-pass-mobile.git
cd green-mobility-pass-mobile
```

### 2. Creer un environnement virtuel

```bash
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# ou: venv\Scripts\activate  # Windows
```

### 3. Installer les dependances

```bash
pip install -r requirements.txt
```

### 4. Configurer les variables d'environnement

Copier le fichier `.env.example` en `.env` et adapter les valeurs :

```bash
cp .env.example .env
```

Contenu du fichier `.env` :

```env
# Base de donnees PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/mydb

# Securite JWT (OBLIGATOIRE: changer la cle secrete!)
SECRET_KEY=votre-cle-secrete-tres-longue-et-aleatoire
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

**Important** : Les variables `DATABASE_URL` et `SECRET_KEY` sont obligatoires. L'application ne demarrera pas sans elles.

## Base de Donnees

### Option A : Docker (recommande)

Lancer PostgreSQL avec Docker Compose :

```bash
docker-compose up -d
```

Cela demarre :
- PostgreSQL sur le port 5432 (user: postgres, password: password, db: mydb)
- PgAdmin sur le port 5050 (admin@admin.com / admin)

### Option B : PostgreSQL local

1. Installer PostgreSQL :
```bash
sudo apt update && sudo apt install postgresql postgresql-contrib
```

2. Demarrer PostgreSQL :
```bash
sudo service postgresql start
```

3. Creer la base de donnees :
```bash
sudo -u postgres psql -c "CREATE DATABASE mydb;"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'password';"
```

### Initialisation automatique des tables

Les tables sont creees **automatiquement** au demarrage de l'API via SQLModel.
Aucune commande SQL manuelle n'est necessaire.

## Lancer l'API

```bash
chmod 744 run.sh
./run.sh
# ou: uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

L'API est accessible sur :
- http://127.0.0.1:8000
- Documentation Swagger : http://127.0.0.1:8000/docs
- Documentation ReDoc : http://127.0.0.1:8000/redoc

## Authentification JWT

L'API utilise des tokens JWT pour l'authentification :

- **Access Token** : Expire apres 30 minutes (configurable)
- **Refresh Token** : Expire apres 7 jours (configurable)

### Obtenir un token

```bash
curl -X POST "http://localhost:8000/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=john&password=secret"
```

Reponse :
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

### Utiliser le token

Ajouter le header `Authorization: Bearer <token>` a chaque requete protegee.

## Tests Manuels

### 1. Creer un utilisateur

```bash
curl -X POST "http://localhost:8000/users" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "password": "secret",
    "email": "john@example.com"
  }'
```

### 2. Se connecter (obtenir un token)

```bash
curl -X POST "http://localhost:8000/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=john&password=secret"
```

Sauvegarder le `access_token` retourne pour les prochaines requetes.

### 3. Creer un trajet

```bash
curl -X POST "http://localhost:8000/journey/" \
  -H "Authorization: Bearer <votre_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "place_departure": "Domicile",
    "place_arrival": "Bureau",
    "time_departure": "2024-01-15T08:00:00",
    "time_arrival": "2024-01-15T08:30:00",
    "distance_km": 5.2,
    "transport_type": "velo",
    "detection_source": "manual"
  }'
```

### 4. Rejeter un trajet

```bash
curl -X POST "http://localhost:8000/journey/1/reject" \
  -H "Authorization: Bearer <votre_token>"
```

### 5. Consulter les statistiques

```bash
curl -X GET "http://localhost:8000/journey/statistics/me" \
  -H "Authorization: Bearer <votre_token>"
```

Reponse :
```json
{
  "total_journeys": 10,
  "total_distance_km": 52.5,
  "total_score": 1420
}
```

## Endpoints API

### Authentification (`/token`)

| Methode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/token` | Login, retourne access + refresh token | Non |
| GET | `/me` | Info utilisateur courant | JWT |
| POST | `/token/refresh` | Rafraichir le token | Refresh |

### Trajets (`/journey`)

| Methode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/journey/` | Creer un trajet valide | JWT |
| GET | `/journey/validated` | Lister ses trajets valides | JWT |
| GET | `/journey/{id}` | Recuperer un trajet | JWT |
| POST | `/journey/{id}/reject` | Rejeter un trajet | JWT |
| DELETE | `/journey/{id}` | Supprimer un trajet | JWT |
| GET | `/journey/statistics/me` | Statistiques utilisateur | JWT |

### Utilisateurs (`/users`)

| Methode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/users` | Creer un utilisateur | Non |
| GET | `/users` | Lister les utilisateurs | Admin |
| GET | `/users/{id}` | Recuperer un utilisateur | JWT |
| DELETE | `/users/{id}` | Supprimer un utilisateur | Admin |

### Entreprises (`/company`)

| Methode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | `/company/` | Lister les entreprises | Admin |
| GET | `/company/{id}` | Recuperer une entreprise | Admin |
| POST | `/company/` | Creer une entreprise | Admin |
| PUT | `/company/{id}` | Modifier une entreprise | Admin |
| DELETE | `/company/{id}` | Supprimer une entreprise | Admin |

## Architecture

```
green-mobility-pass-mobile/
├── api.py                    # Point d'entree FastAPI
├── .env.example              # Template configuration
├── requirements.txt          # Dependances Python
├── docker-compose.yml        # Config Docker
├── run.sh                    # Script de demarrage
│
├── core/                     # Logique metier
│   ├── core_auth.py         # Authentification JWT
│   ├── core_journey.py      # Gestion des trajets
│   ├── core_score.py        # Calcul des scores
│   ├── core_user.py         # Gestion utilisateurs
│   ├── core_company.py      # Gestion entreprises
│   └── database.py          # Configuration BDD
│
├── models/                   # Modeles de donnees
│   ├── model_journey.py     # Trajet
│   ├── model_user.py        # Utilisateur
│   ├── model_company.py     # Entreprise
│   └── model_*.py           # Enums (status, transport, etc.)
│
└── endpoints/                # Routes API
    ├── endpoint_auth.py
    ├── endpoint_journey.py
    ├── endpoint_user.py
    └── endpoint_company.py
```

## Documentation Complementaire

Pour plus de details sur l'architecture et les choix techniques, voir :
- `REFONTE_ARCHITECTURE.md` : Documentation complete de l'architecture V1 POC

## Projet

**Green Mobility Pass** - PFE Michelin & SNCF (Movin'On)

Application de gamification de la mobilite durable encourageant les deplacements ecologiques.
