# Backend - Green Mobility Pass (V1 POC)

## 📋 Résumé Exécutif

Ce document décrit l'architecture **pour la V1** du backend du projet Green Mobility Pass (PFE Michelin & SNCF - Movin'On).

**Objectif** : Fournir un backend **réaliste pour un POC**, en se concentrant sur les fonctionnalités essentielles et en éliminant tout ce qui est over-engineered pour une V1.

---

## 🎯 Vision Métier Implémentée

### Workflow V1

1. **Validation locale** : L'utilisateur valide ou rejette des trajets sur son smartphone
2. **Synchronisation** : Seuls les trajets valides sont envoyes au backend
3. **Score automatique** : Le backend calcule le score instantanement
4. **Consultation** : L'utilisateur peut consulter ses trajets et statistiques

> **Note importante** : Un trajet valide peut etre rejete a posteriori par l'utilisateur (erreur de detection, correction manuelle). Cette transition `VALIDATED -> REJECTED` est autorisee pour permettre les corrections.

### Principes Respectes

✅ **RGPD** : Seules les données validées sont centralisées
✅ **Simplicité** : Pas de statuts intermédiaires, pas d'historique complexe
✅ **Sécurité** : Authentification JWT obligatoire, isolation des données par utilisateur
✅ **POC réaliste** : Fonctionnalités essentielles uniquement

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
┌─────────────────────────────────────────┐
│          Backend FastAPI                │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Endpoints Journey (protégés JWT)│  │
│  │  - POST / (créer validé)         │  │
│  │  - GET /validated (lister)       │  │
│  │  - GET /{id} (consulter)         │  │
│  │  - POST /{id}/reject             │  │
│  │  - DELETE /{id}                  │  │
│  │  - GET /statistics/me            │  │
│  └───────────┬──────────────────────┘  │
│              │                          │
│  ┌───────────▼──────────────────────┐  │
│  │  Core Journey (logique métier)   │  │
│  │  - Création trajets validés      │  │
│  │  - Calcul automatique durée      │  │
│  │  - Déclenchement calcul score    │  │
│  └───────────┬──────────────────────┘  │
│              │                          │
│  ┌───────────▼──────────────────────┐  │
│  │  Core Score (calcul simple)      │  │
│  │  - Score de base par transport   │  │
│  │  - Bonus distance                │  │
│  │  - Bonus écologique              │  │
│  └───────────┬──────────────────────┘  │
│              │                          │
└──────────────┼──────────────────────────┘
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

---

## 📁 Modèles de Données

### 1. **JourneyStatus**

```python
class JourneyStatus(str, Enum):
    """
    Statut du cycle de vie d'un trajet (simplifié pour un POC)
    """
    VALIDATED = "validated"  # Trajet validé, éligible aux récompenses
    REJECTED = "rejected"    # Trajet rejeté
```

**Simplifications** :
- ❌ Supprimé `DETECTED` (Les trajets sont uniquement envoyé depuis l'app mobile avec soit validé ou rejeté)
- ❌ Supprimé `PENDING_VALIDATION` (validation côté mobile uniquement)
- ❌ Supprimé `MODIFIED` (pas de modification après création, modification locale uniquement depuis l'app mobile avant l'envoie du trajet au backend)

---

### 2. **TransportType** (Simplifié)

```python
class TransportType(str, Enum):
    """
    Types de transport disponibles.
    """
    marche = "marche"
    velo = "velo"
    transport_commun = "transport_commun"  # Regroupe bus/métro/tram/train
    voiture = "voiture"  # Regroupe électrique/thermique
```

**Simplifications** :
- ❌ Supprimé les distinctions fines (bus/métro/tram/train) → regroupé en `transport_commun`
- ❌ Supprimé les distinctions voiture électrique/thermique → regroupé en `voiture`
- ❌ Supprimé trottinette, moto, covoiturage

**Justification** : Évite toute ambiguïté sur la détection réelle et simplifie le scoring.

---

### 3. **Journey** (Simplifié)

```python
class Journey(SQLModel, table=True):
    """Modèle de trajet."""

    # Identifiants
    id: int
    id_user: int

    # Cycle de vie
    status: JourneyStatus = VALIDATED
    detection_source: DetectionSource = MANUAL

    # Données spatiales et temporelles
    place_departure: str
    place_arrival: str
    time_departure: datetime
    time_arrival: datetime

    # Données calculées
    distance_km: float
    duration_minutes: int  # Calculé automatiquement

    # Mode de transport
    transport_type: TransportType

    # Score
    score_journey: Optional[int]  # Calculé à la création

    # Dates
    created_at: datetime
    validated_at: Optional[datetime]
    rejected_at: Optional[datetime]
```

**Simplifications** :
- ❌ Supprimé `original_place_departure` (pas d'historique de modification)
- ❌ Supprimé `original_place_arrival` (pas d'historique de modification)
- ❌ Supprimé `original_transport_type` (pas d'historique de modification)

---

### 4. **ScoreHistory** ❌ SUPPRIMÉ

**Justification** : Dans la V1 du POC, le score est calculé une seule fois et ne change pas. Pas besoin de traçabilité complexe ni de recalcul.

---

## 🔧 Logique Métier Simplifiée

### Core Journey (core_journey.py)

**Fonctions disponibles** :
1. `create_validated_journey_core()` - Crée un trajet validé
2. `list_validated_journeys_core()` - Liste les trajets validés
3. `get_journey_core()` - Récupère un trajet par ID
4. `reject_journey_core()` - Rejette un trajet
5. `delete_journey_core()` - Supprime un trajet
6. `get_user_statistics_core()` - Statistiques simplifiées

**Fonctions supprimées** :
- ❌ `list_pending_journeys_core()` (pas de trajets en attente côté serveur)
- ❌ `update_journey_core()` (pas de modification après création)
- ❌ `validate_journey_core()` (trajets créés directement validés)

---

### Core Score (core_score.py)

**Algorithme** :

```
SCORE_TOTAL = BASE_SCORE + DISTANCE_BONUS + ECO_BONUS

BASE_SCORE :
  - Marche : 100 points
  - Vélo : 90 points
  - Transport commun : 70 points
  - Voiture : 20 points

DISTANCE_BONUS : 2 points par km

ECO_BONUS : 50 points si mode actif (marche, vélo)
```

**Fonction unique** :
- `calculate_and_save_score(session, journey)` - Calcule et sauvegarde le score

**Fonctions supprimées** :
- ❌ `calculate_score()` (logique intégrée directement)
- ❌ `recalculate_journey_score()` (pas de recalcul)
- ❌ `get_score_history_for_journey()` (pas d'historique)
- ❌ Tout le modèle `ScoreHistory`

---

## 🌐 Endpoints API

### Endpoints disponibles

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/journey/` | Créer un trajet validé |
| GET | `/journey/validated` | Lister les trajets validés |
| GET | `/journey/{id}` | Récupérer un trajet |
| POST | `/journey/{id}/reject` | Rejeter un trajet |
| DELETE | `/journey/{id}` | Supprimer un trajet |
| GET | `/journey/statistics/me` | Statistiques simplifiées |

### Endpoints supprimés

- ❌ `GET /journey/pending` (pas de trajets en attente)
- ❌ `POST /journey/{id}/validate` (trajets créés directement validés)
- ❌ `PATCH /journey/{id}` (pas de modification après création)

---

## 📊 Statistiques

**Données retournées** :
```json
{
  "total_journeys": 42,
  "total_distance_km": 156.8,
  "total_score": 8420
}
```

**Supprimé** :
- ❌ `by_transport_type` (répartition détaillée par mode de transport)

---

## 🎯 Comparaison Avant / Après Simplification

| Aspect | ❌ Avant (Over-engineered) | ✅ Après (V1 POC Réaliste) |
|--------|---------------------------|---------------------------|
| **Statuts** | 5 statuts (DETECTED, PENDING, VALIDATED, REJECTED, MODIFIED) | 2 statuts (VALIDATED, REJECTED) |
| **Transports** | 11 types détaillés | 4 types regroupés |
| **Historique** | Conservation des données originales | Aucun historique |
| **ScoreHistory** | Table complète avec traçabilité | Supprimé |
| **Modification** | Possible avant validation | Non supporté |
| **Validation serveur** | Endpoint /validate | Non supporté |
| **Trajets en attente** | Endpoint /pending | Non supporté |
| **Statistiques** | Détaillées par transport | Totaux uniquement |
| **Recalcul score** | Fonction dédiée | Non supporté |

---

## 🏆 Avantages de la Simplification

### Pour le POC
✅ **Code plus simple** : Moins de fichiers, moins de logique
✅ **Moins de bugs** : Moins de cas limites à gérer
✅ **Plus rapide à développer** : Fonctionnalités essentielles uniquement
✅ **Plus facile à tester** : Surface d'attaque réduite
✅ **Plus facile à expliquer** : Logique claire et directe

### Pour la démo
✅ **Démo plus claire** : Focus sur l'essentiel
✅ **Défendable académiquement** : Choix assumés et justifiés
✅ **Réaliste** : Ce qu'on attend d'une V1 en 1 mois

### Pour l'évolution future
✅ **Base saine** : Architecture propre et modulaire
✅ **Extensible** : Facile d'ajouter des fonctionnalités plus tard
✅ **Pas de dette technique** : Pas de code mort ou inutilisé

---

## 🔮 Évolutions Futures Possibles

Ces fonctionnalités ont été **volontairement exclues de la V1** mais peuvent être ajoutées plus tard :

### Court terme (V2)
- Réintroduire `PENDING_VALIDATION` si besoin de trajets en attente serveur
- Ajouter la modification de trajets avant validation
- Détailler les types de transport (bus/métro distincts)

### Moyen terme (V3)
- Réintroduire `ScoreHistory` pour traçabilité complète
- Ajouter statistiques détaillées par mode de transport
- Ajouter historique des modifications utilisateur

### Long terme (V4+)
- Détection automatique (statut `DETECTED`)
- Multi-modal (segmentation des trajets)
- Gamification (badges, défis)

---

## 📚 Stack Technique Finale

### Backend
- **Framework** : FastAPI 0.121.2
- **ORM** : SQLModel 0.0.27
- **Base de données** : PostgreSQL 16
- **Authentification** : JWT (python-jose 3.5.0)
- **Hashage** : Argon2 (passlib 1.7.4)
- **ASGI Server** : Uvicorn 0.33.0

### Modules Actifs
- `models.model_journey_status` : 2 statuts (VALIDATED, REJECTED)
- `models.model_transport_type` : 4 types de transport
- `models.model_detection_source` : AUTO/MANUAL
- `models.model_journey` : Modèle simplifié
- `core.core_journey` : Logique métier essentielle
- `core.core_score` : Calcul simple de score
- `endpoints.endpoint_journey` : 6 endpoints sécurisés

### Modules Supprimés
- ❌ `models.model_score_history`

---

## ✅ Critères de Succès V1 POC

### Critères Techniques ✅
- ✅ Architecture propre et modulaire
- ✅ Code simple et maintenable
- ✅ Sécurité : JWT + isolation données
- ✅ Pas de code mort ou inutilisé
- ✅ Documentation claire

### Critères Métier ✅
- ✅ Workflow réaliste et simple
- ✅ Fonctionnalités essentielles implémentées
- ✅ Calcul de score automatique
- ✅ Statistiques de base

### Critères PFE ✅
- ✅ Réaliste pour un développement 1 mois
- ✅ Choix assumés et justifiables
- ✅ Défendable académiquement
- ✅ Base saine pour évolutions futures

---

## 📖 Documentation Complémentaire

### Tester l'API

1. **Obtenir un token JWT** :
```bash
curl -X POST "http://localhost:8000/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=john&password=secret"
```

2. **Créer un trajet validé** :
```bash
curl -X POST "http://localhost:8000/journey/" \
  -H "Authorization: Bearer <token>" \
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

3. **Récupérer les trajets validés** :
```bash
curl -X GET "http://localhost:8000/journey/validated" \
  -H "Authorization: Bearer <token>"
```

4. **Récupérer les statistiques** :
```bash
curl -X GET "http://localhost:8000/journey/statistics/me" \
  -H "Authorization: Bearer <token>"
```

### Documentation Swagger
Accessible sur : `http://localhost:8000/docs`

---

## ✅ Conclusion

Cette version simplifiée du backend représente une **V1 de POC réaliste et défendable** qui :

- ✅ Se concentre sur l'essentiel
- ✅ Élimine tout ce qui est over-engineered
- ✅ Reste propre, modulaire et extensible
- ✅ Est réaliste pour un développement 1 mois
- ✅ Fournit une base saine pour les évolutions futures

Le système est **prêt pour la démo finale du PFE** avec une architecture justifiable et des choix assumés.

---

**Auteur** : Claude (AI Assistant)
**Date** : 2026-01-12
**Version** : 1.0 (Simplifiée)
**Projet** : Green Mobility Pass (PFE Michelin & SNCF - Movin'On)
