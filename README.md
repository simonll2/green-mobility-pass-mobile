# 🚀 Green Mobility Pass — API Backend

Ce projet est une API FastAPI utilisant PostgreSQL comme base de données, avec une gestion des utilisateurs, un système d’authentification JWT et une structure backend propre et maintenable.

## 📦 Installation & Lancement du serveur

### 1️⃣ Cloner le projet

```
git clone https://gitlab.com/hugobrenet/green-mobility-pass-mobile.git
cd green-mobility-pass-mobile
```

### 2️⃣ Créer et activer un environnement virtuel

```
python3 -m venv venv
. ./venv/bin/activate
```

### 3️⃣ Installer les dépendances

```
pip install -r requirements.txt
```

## 🧩 Installation de PostgreSQL

### 1️⃣ Installer PostgreSQL (Linux only)

```
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### 2️⃣ Lancer PostgreSQL

```
sudo service postgresql start
```

### 3️⃣ Se connecter en tant que super-utilisateur

```
sudo -u postgres psql
```

### 5️⃣ Créer la table users

```

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);
```

### 6️⃣ Définir le mot de passe PostgreSQL

```
ALTER USER postgres WITH PASSWORD 'your_password';
```

Puis mettre à jour core/database.py :

```
DATABASE_URL = "postgresql://postgres:your_password@localhost:5432/postgres"
```

## ▶️ Lancer l’API

Avec le script :

```
chmod 744 run.sh
./run.sh
```

Accessible sur :

- http://127.0.0.1:8000
- http://127.0.0.1:8000/docs
