# 🐺 Wolf Pack Dashboard System

**Complete Wolf Pack coaching and business intelligence dashboard system**

Created by: **Donnie** (AI Assistant)  
For: **Melvin Lassooy** - The Wolf Pack Group  
Date: March 2026  
Status: **OPERATIONAL** ✅

## 🎯 What This Is

The complete Wolf Pack dashboard ecosystem featuring:

1. **🏠 Control Room** - Central command center
2. **📊 Company KPI** - Business intelligence dashboard  
3. **👨‍🎓 Coaching Pipeline** - Student progress tracking (143+ students)
4. **💰 Coach Performance** - Revenue and performance metrics

## 🚀 Live Dashboard

**URL**: https://aurelio-bountiful-pilar.ngrok-free.dev/

### Main Dashboards
- **Control Room**: `/controlroom/` (navigation hub)
- **Coaching Pipeline**: `/pipeline/` (main student tracking)  
- **Company KPI**: `/companykpi/` (password: 123456)
- **Coach Performance**: `/coaches/` (revenue tracking)

## 📈 Current Stats

- **143+ Students** tracked across 14 pipeline stages
- **21 Active Clients** (synced from Wolf Pack Admin API)
- **6 Active Coaches** (Melvin, Eray, Maurice, Nabil, Dilano, Lorenzo)
- **Real-time Airtable sync** every 5 seconds
- **Complete GoHighLevel integration** with coach mapping

## 🛠 Technical Architecture

### Core Features
- ✅ **Drag & Drop Pipeline** - Move students between stages
- ✅ **Real-time Airtable Sync** - Bulletproof bidirectional sync
- ✅ **GoHighLevel Integration** - Automatic coaching notes import
- ✅ **Client Synchronization** - Live data from Wolf Pack Admin API
- ✅ **Coach Performance Tracking** - Revenue metrics and targets
- ✅ **Password Protection** - Secure access to sensitive dashboards

### Key Components
- **Pipeline Dashboard** (`pipeline/index.html`) - Main coaching interface
- **Bulletproof Sync** (`bulletproof-sync-daemon.js`) - Production-grade sync system
- **GoHighLevel API** (`ghl-api-sync.js`) - Coaching notes integration
- **Client Sync** (`sync-clients-from-admin.js`) - Admin API integration
- **Shared Coaching** (`shared-coaching-sync.js`) - Multi-coach collaboration

## 🔧 Setup & Deployment

### Server Requirements
```bash
# Python server (port 8085)
cd /Users/macmini/.openclaw/workspace/wolf-dashboards
python3 -m http.server 8085

# Ngrok tunnel (for external access)
ngrok http 8085
```

### Configuration
- **Airtable Base**: `appFR2ovH2m5XN6I3`
- **Airtable Table**: `Coaching Pipeline`
- **GoHighLevel Integration**: API token configured
- **Wolf Pack Admin API**: Client sync enabled

## 📊 Pipeline Stages

1. **New Unassigned Wolf** - New students
2. **Onboarding Fase** - Initial setup
3. **STAP 1-6** - Training progression
4. **Red/Yellow Groups** - Performance categories
5. **Graduated - Green Group** - Completed training
6. **Active/Signed Closer** - Working closers
7. **Hungry Wolf** - Special status
8. **ON HOLD** - Paused students

## 👥 Coach Performance Targets

| Coach | Target | Current | Status |
|-------|--------|---------|---------|
| Maurice | €50K | €230K+ | 🔵 LEGENDARY++ (461%) |
| Eray | €50K | €123K+ | 🔵 LEGENDARY++ (246%) |
| Melvin | - | - | Head Coach |
| Nabil | - | - | Active Coach |
| Dilano | - | - | Active Coach |
| Lorenzo | €80K | €0 | Head of Delivery |

## 🔄 Data Sources

- **Airtable** - Central database and sync
- **GoHighLevel** - Coaching notes and session data
- **Wolf Pack Admin API** - Client and revenue data
- **Local Storage** - Browser cache (synced to Airtable)

## 🎯 Recent Updates (March 2026)

### ✅ Completed
- **Client Sync Resolution** - Fixed 21 vs 34 client discrepancy
- **Hungry Wolf & ON HOLD** - Added new pipeline stages
- **Password Protection** - Secured sensitive dashboards
- **GoHighLevel Integration** - Complete coaching notes sync
- **Shared Coaching System** - Multi-coach collaboration
- **Revenue Integration** - Real coach performance data

### 🔧 Technical Fixes
- **Bulletproof Sync Daemon** - Production-grade reliability
- **Client API Integration** - Real-time Wolf Pack Admin sync  
- **Coach Mapping System** - GoHighLevel user ID attribution
- **Session Migration** - Complete data structure upgrade
- **Real-time Updates** - 5-second bidirectional sync

## 🚨 Critical Features

### Shared Coaching System
**Problem**: Coaches couldn't see each other's notes  
**Solution**: Real-time sync system allowing all coaches to see Maurice's notes, Nabil's sessions, etc.

**Activation**: Click "🤝 Enable Shared Coaching" button in dashboard

### Client Synchronization  
**Problem**: Outdated hardcoded client list causing sync failures  
**Solution**: Live sync from Wolf Pack Admin API with 21 real clients

### Password Protection
**Sensitive Dashboards**: Company KPI (123456), others open access

## 📞 Support

Created and maintained by **Donnie** for Melvin Lassooy  
Wolf Pack Group - Sales Training Academy  

**"Wolf Pack Strong"** 🐺

---

## 📂 File Structure

```
wolf-dashboards/
├── controlroom/         # Control center
├── pipeline/            # Main coaching dashboard  
├── companykpi/          # Business intelligence
├── coaches/             # Performance tracking
├── *.js                # Sync and API systems
├── *.html               # Dashboard interfaces
└── README.md           # This file
```

**Backup Created**: March 20, 2026 20:38 GMT+4  
**GitHub Repository**: Complete system backup for Melvin