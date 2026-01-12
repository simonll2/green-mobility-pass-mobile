# 📱 Green Mobility Pass - Application Mobile (POC)

> Application React Native avec module Android natif de détection automatique de trajets

**Projet de fin d'études (PFE)** — Green Mobility Pass (Movin'On / Michelin / SNCF)

---

## 🎯 Objectif

Cette application mobile est un **POC fonctionnel** permettant de :

1. **Détecter automatiquement les trajets** via un module Android natif (Kotlin)
2. **Valider ou rejeter** les trajets détectés
3. **Envoyer les trajets validés** au backend FastAPI
4. **Consulter les statistiques** et le score utilisateur

⚠️ **Il ne s'agit PAS de l'application finale produit**, mais d'un **outil technique de validation** du pipeline complet *mobile → backend*.

---

## 🏗️ Architecture Technique

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────┐
│          Application React Native (TypeScript)      │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │  Écrans (UI)                               │    │
│  │  - Login, Home, JourneyList, Detail, Stats│    │
│  └────────────────┬───────────────────────────┘    │
│                   │                                 │
│  ┌────────────────▼───────────────────────────┐    │
│  │  Services                                  │    │
│  │  - API Backend (Axios + JWT)               │    │
│  │  - Storage Local (AsyncStorage)            │    │
│  └────────────────┬───────────────────────────┘    │
│                   │                                 │
│  ┌────────────────▼───────────────────────────┐    │
│  │  Wrapper TypeScript                        │    │
│  │  NativeJourneyDetection.ts                 │    │
│  └────────────────┬───────────────────────────┘    │
│                   │ (React Native Bridge)           │
└───────────────────┼─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│       Module Android Natif (Kotlin)                 │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │  JourneyDetectionModule (RN Bridge)        │    │
│  └────────────────┬───────────────────────────┘    │
│                   │                                 │
│  ┌────────────────▼───────────────────────────┐    │
│  │  JourneyDetectionManager (Orchestrateur)   │    │
│  │  - Gestion cycle de vie des trajets        │    │
│  │  - Calcul de distance (Haversine)          │    │
│  │  - Filtrage micro-trajets                  │    │
│  │  - Persistence locale                      │    │
│  └────────────────┬───────────────────────────┘    │
│                   │                                 │
│         ┌─────────┴──────────┐                     │
│         │                     │                     │
│  ┌──────▼─────────┐  ┌───────▼────────────┐       │
│  │ Activity       │  │ Location           │       │
│  │ Detection      │  │ Tracking           │       │
│  │ Service        │  │ Service            │       │
│  │                │  │                    │       │
│  │ • Activity     │  │ • FusedLocation    │       │
│  │   Recognition  │  │   API              │       │
│  │   API          │  │ • Fréquence: 30s   │       │
│  │ • Fréquence:   │  │ • Précision:       │       │
│  │   10s          │  │   BALANCED         │       │
│  └────────────────┘  └────────────────────┘       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Composants principaux

#### 1. Module Android Natif (Kotlin)

**Package:** `com.greenmobilitypass.detection`

- **JourneyDetectionManager** : Orchestrateur central
  - Gestion du cycle de vie des trajets
  - Ouverture/clôture automatique
  - Filtrage des micro-trajets (< 100m, < 2min)
  - Calcul de distance (formule de Haversine)
  - Persistence locale (SharedPreferences + JSON)

- **ActivityDetectionService** : Service de détection d'activité
  - Activity Recognition API (Google Play Services)
  - Détection : STATIONARY, WALKING, RUNNING, CYCLING, IN_VEHICLE
  - Fréquence : 10 secondes
  - Foreground service

- **LocationTrackingService** : Service de tracking GPS
  - FusedLocationProviderClient
  - Fréquence : 30 secondes (faible batterie)
  - Précision : BALANCED_POWER_ACCURACY
  - Foreground service

- **JourneyDetectionModule** : Native Module React Native
  - Bridge Kotlin ↔ JavaScript
  - API exposée : startDetection(), stopDetection(), getCurrentJourney(), etc.
  - Événements émis vers JS

#### 2. Application React Native (TypeScript)

**Structure des dossiers :**

```
mobile/src/
├── contexts/
│   └── AuthContext.tsx           # Contexte d'authentification global
├── modules/
│   └── JourneyDetection/
│       └── NativeJourneyDetection.ts  # Wrapper TypeScript du module natif
├── services/
│   ├── api.ts                    # Communication backend (Axios + JWT)
│   └── storage.ts                # Stockage local (AsyncStorage)
├── types/
│   └── journey.types.ts          # Définitions TypeScript
├── screens/
│   ├── LoginScreen.tsx           # Authentification
│   ├── HomeScreen.tsx            # Écran principal (détection)
│   ├── JourneyListScreen.tsx     # Liste des trajets
│   ├── JourneyDetailScreen.tsx   # Validation/rejet trajet
│   └── StatisticsScreen.tsx      # Statistiques backend
├── navigation/
│   └── AppNavigator.tsx          # React Navigation
└── App.tsx                       # Point d'entrée
```

---

## 📋 Prérequis

### Environnement de développement

- **Node.js** >= 18
- **npm** ou **yarn**
- **React Native CLI** (global) : `npm install -g @react-native-community/cli`
- **Android Studio** avec :
  - Android SDK Platform 34
  - Android SDK Build-Tools 34.0.0
  - Android Emulator ou appareil physique
- **JDK** 17 ou 11

### Backend FastAPI

Le backend FastAPI doit être **lancé et accessible** depuis l'appareil/émulateur.

⚠️ **Important** : Si vous utilisez un émulateur Android, l'URL du backend doit être :
- `http://10.0.2.2:8000` (mapping de `localhost` de l'hôte)

Si vous utilisez un appareil physique :
- `http://<IP_DE_VOTRE_MACHINE>:8000`

---

## 🚀 Installation

### 1. Cloner le projet

```bash
git clone https://github.com/votre-repo/green-mobility-pass-mobile.git
cd green-mobility-pass-mobile/mobile
```

### 2. Installer les dépendances

```bash
npm install
# ou
yarn install
```

### 3. Configuration de l'URL du backend

Éditez le fichier `mobile/src/services/api.ts` :

```typescript
const BASE_URL = 'http://10.0.2.2:8000'; // Pour émulateur Android
// ou
const BASE_URL = 'http://192.168.1.X:8000'; // Pour appareil physique (remplacez par votre IP)
```

### 4. Lancer le backend FastAPI

Dans le répertoire racine du projet :

```bash
cd ..  # Retour à la racine
./run.sh
```

Le backend devrait être accessible sur `http://localhost:8000`.

---

## 🏃 Lancement de l'application

### Option 1 : Émulateur Android

1. **Lancer Android Studio** et ouvrir l'AVD Manager
2. **Démarrer un émulateur** Android (API 24+)
3. **Lancer Metro Bundler** :

```bash
cd mobile
npm start
```

4. **Lancer l'app sur l'émulateur** (dans un autre terminal) :

```bash
npm run android
```

### Option 2 : Appareil physique Android

1. **Activer le mode développeur** sur votre téléphone
2. **Activer le débogage USB**
3. **Connecter le téléphone** à votre ordinateur
4. **Vérifier la connexion** :

```bash
adb devices
```

5. **Lancer l'app** :

```bash
cd mobile
npm run android
```

---

## 🧪 Tester le pipeline complet

### 1. Connexion

Utilisez les identifiants de test du backend :

- **Username** : `john`
- **Password** : `secret`

### 2. Accorder les permissions

L'application demande automatiquement :

- ✅ **Localisation** (GPS)
- ✅ **Localisation en arrière-plan**
- ✅ **Reconnaissance d'activité**

Acceptez toutes les permissions.

### 3. Démarrer la détection

Sur l'écran principal :

1. Appuyez sur **"Démarrer la détection"**
2. Les services Android démarrent en foreground
3. L'activité détectée s'affiche en temps réel

### 4. Simuler un trajet

**Sur émulateur** :

1. Ouvrir les **Extended Controls** (⋮ sur le panneau latéral)
2. Aller dans **Location**
3. Charger un trajet GPX ou définir des waypoints
4. Lancer la simulation

**Sur appareil physique** :

1. Sortir faire une vraie marche/vélo !
2. Garder l'application en arrière-plan

### 5. Trajet détecté

Lorsqu'un trajet est détecté :

- Notification : "Nouveau trajet détecté"
- Distance et durée calculées automatiquement
- Filtrage : trajets < 100m ou < 2min sont rejetés

### 6. Valider et envoyer au backend

1. Aller dans **"Mes trajets"**
2. Sélectionner un trajet **COMPLETED**
3. Ajuster le **type de transport** si nécessaire
4. Renseigner **lieu de départ** et **lieu d'arrivée**
5. Appuyer sur **"Valider et envoyer"**

### 7. Voir le score

- Le backend calcule automatiquement le score
- Affichage immédiat du score obtenu
- Consulter les statistiques dans **"Statistiques"**

---

## 📊 Scoring (Rappel Backend)

### Scores de base

- **Marche à pied** : 100 points
- **Vélo** : 90 points
- **Transport en commun** : 70 points
- **Voiture** : 20 points

### Bonus

- **Distance** : +2 points par kilomètre
- **Écologique** : +50 points (marche, vélo uniquement)

### Exemple

Trajet à **vélo** de **5 km** :

```
Score = 90 (base) + 10 (distance) + 50 (éco) = 150 points
```

---

## 🔧 Choix techniques et justifications

### Architecture modulaire

✅ **Module natif indépendant** : Réutilisable dans n'importe quelle app RN
✅ **Séparation claire** : Détection (natif) ≠ UI (React Native)
✅ **Événements déclarés** : Communication unidirectionnelle natif → JS

### Détection bas niveau

✅ **Activity Recognition API** : Détection fiable sans consommer de batterie
✅ **GPS léger** : Fréquence basse (30s) pour économie batterie
✅ **Foreground Services** : Garantie de fonctionnement en arrière-plan

### Filtrage intelligent

✅ **Seuils configurables** : Distance > 100m, Durée > 2min
✅ **Timeout stationnaire** : 5 minutes d'immobilité → fin automatique
✅ **Persistence locale** : Aucune perte de données

### Backend minimal

✅ **Trajets validés uniquement** : Pas de stockage de trajets détectés
✅ **Calcul serveur** : Score calculé côté backend
✅ **JWT sécurisé** : Refresh token pour sessions longues

---

## 🚧 Limitations POC

Cette V1 POC a volontairement exclu certaines fonctionnalités :

### Hors scope

❌ **iOS** : Détection Android uniquement (pas de module Swift)
❌ **Multi-modal** : Un seul mode de transport par trajet
❌ **Carte interactive** : Pas de visualisation géographique
❌ **IA avancée** : Pas de classification automatique poussée
❌ **Gamification** : Pas de badges, défis, classements

### Simplifications

⚠️ **Lieux génériques** : "Départ" / "Arrivée" (pas de géocodage inverse)
⚠️ **Type de transport** : Ajustement manuel si nécessaire
⚠️ **Synchronisation** : Envoi immédiat (pas de queue de synchronisation)

---

## 📂 Structure complète du projet

```
green-mobility-pass-mobile/
├── api.py                        # Backend FastAPI
├── core/                         # Logique métier backend
├── endpoints/                    # Endpoints API
├── models/                       # Modèles backend
├── requirements.txt              # Dépendances Python
├── run.sh                        # Script de lancement backend
├── README.md                     # Doc backend
├── REFONTE_ARCHITECTURE.md       # Architecture backend simplifiée
└── mobile/                       # 📱 APPLICATION MOBILE
    ├── package.json
    ├── tsconfig.json
    ├── babel.config.js
    ├── metro.config.js
    ├── App.tsx                   # Point d'entrée RN
    ├── index.js
    ├── android/
    │   ├── app/
    │   │   ├── build.gradle
    │   │   └── src/main/
    │   │       ├── AndroidManifest.xml
    │   │       ├── java/com/greenmobilitypass/
    │   │       │   ├── MainActivity.kt
    │   │       │   ├── MainApplication.kt
    │   │       │   ├── detection/
    │   │       │   │   ├── models/
    │   │       │   │   │   ├── DetectedActivity.kt
    │   │       │   │   │   └── LocalJourney.kt
    │   │       │   │   ├── JourneyDetectionManager.kt
    │   │       │   │   ├── ActivityDetectionService.kt
    │   │       │   │   └── LocationTrackingService.kt
    │   │       │   └── reactnative/
    │   │       │       ├── JourneyDetectionModule.kt
    │   │       │       └── JourneyDetectionPackage.kt
    │   │       └── res/
    │   ├── build.gradle
    │   ├── settings.gradle
    │   └── gradle.properties
    └── src/
        ├── contexts/
        │   └── AuthContext.tsx
        ├── modules/
        │   └── JourneyDetection/
        │       └── NativeJourneyDetection.ts
        ├── services/
        │   ├── api.ts
        │   └── storage.ts
        ├── types/
        │   └── journey.types.ts
        ├── screens/
        │   ├── LoginScreen.tsx
        │   ├── HomeScreen.tsx
        │   ├── JourneyListScreen.tsx
        │   ├── JourneyDetailScreen.tsx
        │   └── StatisticsScreen.tsx
        └── navigation/
            └── AppNavigator.tsx
```

---

## 🐛 Dépannage

### Problème : "Module not found: JourneyDetection"

**Solution** : Rebuild l'app Android

```bash
cd android
./gradlew clean
cd ..
npm run android
```

### Problème : Permissions refusées

**Solution** : Aller dans les paramètres Android de l'app et accorder manuellement les permissions

### Problème : Backend inaccessible

**Solution** : Vérifier l'URL dans `src/services/api.ts`

- Émulateur : `http://10.0.2.2:8000`
- Appareil physique : `http://<IP>:8000`

### Problème : Détection ne démarre pas

**Solution** : Vérifier les logs Android

```bash
adb logcat | grep "GreenMobilityPass"
```

---

## 📚 API Native Module (JavaScript)

### Méthodes

```typescript
import JourneyDetection from './src/modules/JourneyDetection/NativeJourneyDetection';

// Démarrer la détection
await JourneyDetection.startDetection();

// Arrêter la détection
await JourneyDetection.stopDetection();

// Vérifier si détection active
const isDetecting = await JourneyDetection.isDetecting();

// Récupérer le trajet en cours
const currentJourney = await JourneyDetection.getCurrentJourney();

// Récupérer tous les trajets sauvegardés
const journeys = await JourneyDetection.getSavedJourneys();

// Demander les permissions
const granted = await JourneyDetection.requestPermissions();

// Vérifier les permissions
const hasPermissions = await JourneyDetection.checkPermissions();
```

### Événements

```typescript
// Détection démarrée
const unsubscribe = JourneyDetection.addEventListener('onDetectionStarted', () => {
  console.log('Détection démarrée');
});

// Activité détectée
JourneyDetection.addEventListener('onActivityChanged', (event) => {
  console.log('Activité:', event.activityType, 'Confiance:', event.confidence);
});

// Nouveau trajet
JourneyDetection.addEventListener('onJourneyStarted', (journey) => {
  console.log('Nouveau trajet:', journey);
});

// Trajet mis à jour
JourneyDetection.addEventListener('onJourneyUpdated', (journey) => {
  console.log('Trajet mis à jour:', journey);
});

// Trajet terminé
JourneyDetection.addEventListener('onJourneyCompleted', (journey) => {
  console.log('Trajet terminé:', journey);
});

// Trajet rejeté (trop court)
JourneyDetection.addEventListener('onJourneyDiscarded', (journey) => {
  console.log('Trajet rejeté');
});

// Retirer le listener
unsubscribe();
```

---

## ✅ Critères de succès POC

### Critères techniques ✅

- ✅ Architecture modulaire et réutilisable
- ✅ Code propre et documenté (Kotlin + TypeScript)
- ✅ Détection automatique fonctionnelle
- ✅ Intégration backend complète
- ✅ Gestion des permissions Android
- ✅ Services foreground pour fiabilité

### Critères métier ✅

- ✅ Workflow réaliste (détection → validation → backend)
- ✅ Filtrage des micro-trajets
- ✅ Calcul automatique de score
- ✅ Statistiques utilisateur
- ✅ Authentification JWT sécurisée

### Critères PFE ✅

- ✅ POC réaliste pour démo 1 mois
- ✅ Choix techniques assumés et justifiés
- ✅ Documentation complète
- ✅ Architecture extensible pour V2

---

## 🔮 Évolutions futures possibles

### Court terme (V2)

- Géocodage inverse (lieux automatiques)
- Visualisation sur carte (React Native Maps)
- Mode manuel de création de trajet
- Synchronisation en background (queue)

### Moyen terme (V3)

- Multi-modal (segmentation de trajets)
- Classification IA avancée
- Support iOS (Swift)
- Optimisation batterie

### Long terme (V4+)

- Gamification (badges, défis)
- Social (partage, classements)
- Carbonne footprint détaillé
- Intégration OpenStreetMap

---

## 👥 Auteurs

**Projet de fin d'études (PFE)** — Green Mobility Pass
**Partenaires** : Movin'On, Michelin, SNCF

**Développé avec** : Claude (AI Assistant)

---

## 📄 Licence

Projet académique — Tous droits réservés

---

## 📞 Support

Pour toute question technique :

1. Vérifier la section **Dépannage**
2. Consulter les logs Android : `adb logcat`
3. Vérifier que le backend est lancé et accessible

---

**Bon test du POC ! 🚀**
