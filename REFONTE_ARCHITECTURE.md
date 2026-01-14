## Évolution du Backend : Comparaison Ancienne Version vs Nouvelle Version (V1 POC)

Cette section décrit les **changements apportés au backend** entre la version initiale et la version actuelle, ainsi que les **motivations techniques et métier** ayant conduit à cette refonte.

L’objectif de cette évolution est de transformer un backend générique en un **backend aligné avec les besoins réels du POC Green Mobility Pass**, en cohérence avec l’application mobile et le workflow utilisateur.

---

## 🏗️ Architecture V1

### Schéma de l'Architecture pour la logique des trajets

```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │
│                 │
│  ┌───────────┐  │
│  │ Local DB  │  │  Validation locale
│  └─────┬─────┘  │
│        │        │
│   Trajets       │
│   validés       │
│        │        │
└────────┼────────┘
         │ HTTPS + JWT
         ▼
┌────────────────────────────────────────┐
│          Backend FastAPI               │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Endpoints Journey (protégés JWT)│  │
│  │  - POST / (créer validé)         │  │
│  │  - GET /validated (lister)       │  │
│  │  - GET /{id} (consulter)         │  │
│  │  - POST /{id}/reject             │  │
│  │  - DELETE /{id}                  │  │
│  │  - GET /statistics/me            │  │
│  └───────────┬──────────────────────┘  │
│              │                         │
│  ┌───────────▼──────────────────────┐  │
│  │  Core Journey (logique métier)   │  │
│  │  - Création trajets validés      │  │
│  │  - Calcul automatique durée      │  │
│  │  - Déclenchement calcul score    │  │
│  └───────────┬──────────────────────┘  │
│              │                         │
│  ┌───────────▼──────────────────────┐  │
│  │  Core Score (calcul simple)      │  │
│  │  - Score de base par transport   │  │
│  │  - Bonus distance                │  │
│  │  - Bonus écologique              │  │
│  └───────────┬──────────────────────┘  │
│              │                         │
└──────────────┼─────────────────────────┘
               │
               ▼
      ┌────────────────┐
      │  PostgreSQL    │
      │                │
      │  - Journey     │
      │  - Users       │
      │  - Company     │
      └────────────────┘
```

## 1. Limites de l’ancienne version du backend

L’ancienne version du backend constituait une **base fonctionnelle**, mais présentait plusieurs limites dans le cadre du projet :

### 1.1 Backend orienté CRUD générique

L’API initiale exposait essentiellement :
- des endpoints CRUD classiques
- peu de logique métier centralisée
- une responsabilité importante laissée au client (mobile)

Exemples :
- le score du trajet était fourni par le client
- l’utilisateur pouvait spécifier `id_user` lors de la création d’un trajet
- aucune vérification de propriété systématique des ressources

Cela entraînait :
- un **risque de sécurité**
- une **faible robustesse métier**
- une architecture difficilement défendable académiquement

---

### 1.2 Modèle de trajet incomplet

Le modèle `Journey` de l’ancienne version était limité à :
- des champs temporels basiques
- un score optionnel
- aucun statut métier
- aucune notion de cycle de vie du trajet

Conséquences :
- impossibilité de distinguer un trajet valide d’un trajet rejeté
- absence de logique de validation/rejet
- absence de statistiques fiables

---

### 1.3 Couplage excessif client ↔ backend

Dans l’ancienne version :
- le client envoyait des données déjà « interprétées »
- le backend ne recalculait rien
- aucune centralisation de la logique métier

Cela rendait :
- les tests plus fragiles
- l’évolution du scoring complexe
- le backend dépendant du comportement du client

---

## 2. Principes directeurs de la refonte

La refonte du backend repose sur plusieurs principes clés :

- **Le backend est garant de la logique métier**
- **Le client mobile valide localement, le backend consolide**
- **La sécurité prime sur la flexibilité**
- **La simplicité est privilégiée pour un POC**

Ces principes ont guidé l’ensemble des changements décrits ci-dessous.

---

## 3. Évolutions majeures apportées

### 3.1 Sécurisation de l’authentification

#### Avant
- `SECRET_KEY` codée en dur
- Configuration partiellement statique
- Absence de contrôle fin des rôles

#### Après
- Configuration via variables d’environnement (`.env`)
- Démarrage bloquant si configuration manquante
- Introduction explicite des rôles (`admin`, `user`)
- Vérification des privilèges via `require_admin`

**Bénéfices** :
- conformité aux bonnes pratiques
- sécurité renforcée
- architecture plus professionnelle et défendable

---

### 3.2 Refonte complète du modèle Journey

#### Ajouts structurants
- `JourneyStatus` : `VALIDATED`, `REJECTED`
- `DetectionSource` : `AUTO`, `MANUAL`
- `distance_km`
- `duration_minutes` (calculée côté backend)
- timestamps métier (`created_at`, `validated_at`, `rejected_at`)

#### Suppressions volontaires
- `score_journey` fourni par le client
- `id_user` fourni par le client
- modification directe d’un trajet existant

**Bénéfices** :
- cycle de vie clair et explicite
- modèle aligné avec la réalité métier
- réduction drastique des cas limites

---

### 3.3 Centralisation de la logique métier

#### Avant
- logique dispersée
- score calculé côté client
- peu de validations métier

#### Après
- introduction de `core_journey.py`
- validations strictes :
  - cohérence temporelle
  - distance positive
  - propriété du trajet
- création des trajets **directement validés**
- rejet explicite possible a posteriori

**Bénéfices** :
- backend maître des règles métier
- comportement cohérent quel que soit le client
- tests et maintenance facilités

---

### 3.4 Introduction d’un moteur de scoring dédié

#### Nouvelle brique : `core_score.py`

- calcul automatique du score
- règles simples et explicites
- aucune dépendance au client

```text
SCORE = BASE_SCORE + DISTANCE_BONUS + ECO_BONUS
