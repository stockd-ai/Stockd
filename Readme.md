# Stockd 🍽️

> AI-powered inventory management with dynamic pricing and demand forecasting for modern restaurants.

[![Built at UGAHacks 11](https://img.shields.io/badge/Built%20at-UGAHacks%2011-green)](https://ugahacks.com/)
[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Gemini-blue)](https://ai.google.dev/)
[![Powered by Supabase](https://img.shields.io/badge/Powered%20by-Supabase-brightgreen)](https://supabase.com/)

**Stockd turns inventory data into restaurant profits.** We help restaurants improve margins by 2-5%, save 8+ hours per week, and increase revenue 10-15% during peak periods through intelligent inventory management and dynamic pricing.

---

## Course Project Enhancements

This repository now also serves as the real codebase for the networking course project, **"Secure, Optimize, and Monitor Your Website."**

Assignment-focused additions in this repo:

- XSS hardening and safer imported-text handling in the real frontend
- server-enforced brute-force login protection through a Supabase Edge Function and lockout table
- security event persistence plus a monitoring page at `Frontend/pages/security-monitor.html`
- deterministic security-analysis artifacts in `logs/`
- GitHub Actions CI and deploy workflows in `.github/workflows/`

Useful course-project docs:

- `docs/security-hardening.md`
- `assignment-integration-status.md`
- `assignment-deploy-checklist.md`
- `assignment-requirements-mapping.md`
- `final-submission-checklist.md`
- `final-demo-script.md`
- `final-report-notes.md`

### Live Rollout Status (April 22, 2026)

- Supabase rollout completed for the assignment enhancements:
  - `auth_login_guards` migration applied
  - `security_events` migration applied
  - `auth-login`, `security-log-event`, and `security-analyze` deployed
- live monitoring artifacts were regenerated from the real Stockd Supabase project
- remaining manual step: redeploy the updated frontend through the real Stockd Vercel project so the public site exposes the guarded login flow and security monitor page
- GitHub Actions workflows are in repo, but repository secrets still need to be configured before deploy automation can run
- GitHub repository URL: `https://github.com/stockd-ai/Stockd`
- Live website URL: `<paste the verified Stockd production URL before submission>`

---

## 🚀 The Problem

Every year, restaurants in the United States waste **22-33 billion pounds of food** and lose **$162 billion annually** to food waste. The average restaurant throws away **4-10% of purchases** before it reaches a customer's plate.

**Why?** Most restaurants still track inventory with pen and paper or basic spreadsheets, leading to:
- Guesswork ordering based on gut feeling
- Over-purchasing that results in spoilage
- Stockouts and lost revenue
- No visibility into usage patterns

Traditional inventory systems cost thousands per month or are too complex for daily use.

---

## 💡 Our Solution

**Stockd** combines real-time inventory tracking, AI-powered forecasting, and dynamic pricing to turn inventory management into a profit center.

### Key Benefits

✅ **Improve profit margins by 2-5%** through optimized purchasing and dynamic revenue management
✅ **Save 8+ hours per week** with automated reorder suggestions
✅ **Increase revenue 10-15%** during peak periods with intelligent surge pricing
✅ **Reduce food waste by 20-40%** through precise ordering

---

## ✨ Key Features

### 📊 Intelligent Dashboard
- Real-time KPI tracking: revenue, inventory alerts, menu performance
- Interactive charts showing 4-week trends and category breakdowns
- Forecast accuracy metrics (MAPE tracking)
- Profit optimization metrics

### 🤖 AI-Powered Forecasting
- Predicts next-day demand using Google Gemini
- Analyzes 90 days of historical sales data
- Generates 7-day revenue forecasts
- Adapts to seasonal variations and day-of-week patterns

### 📦 Smart Inventory Management
- Real-time ingredient tracking with automatic alerts
- **Days of Supply** calculation—know when ingredients will run out
- Par level suggestions based on usage patterns
- Visual health dashboard (Critical, Warning, Healthy)
- Automated reorder quantity suggestions

### 💵 Dynamic Pricing & Demand Intelligence
- Real-time surge pricing based on demand patterns
- Toast POS API integration for live order flow
- Automatic price adjustments during peak hours
- Revenue optimization through convenience pricing

### 💰 Cost & Waste Tracking
- Track food costs as percentage of revenue
- Identify waste hotspots and high-spoilage ingredients
- Calculate ROI of waste reduction initiatives
- Monitor inventory shrinkage

### ✨ AI Copilot
- Natural language interface powered by Gemini
- Ask questions like "What's my forecast for tomorrow?" or "Should I raise prices tonight?"
- Get actionable business insights instantly

---

## 🛠️ Tech Stack

### Frontend
- **Vanilla JavaScript** - Lightweight client-side logic
- **HTML5 + CSS3** - Apple-inspired responsive design
- **Chart.js** - Interactive data visualizations

### Backend
- **Supabase** - PostgreSQL database with real-time subscriptions
- **PostgreSQL Functions** - Custom RPC endpoints for complex queries
- **Row Level Security (RLS)** - Multi-tenant data isolation

### AI/ML
- **Google Gemini API** - Natural language processing and forecasting
- **Custom algorithms** - Time-series analysis with moving averages

### Data Processing
- **PapaParse** - CSV parsing for bulk data imports
- **Toast POS API (emulated)** - Order flow data for surge pricing

---

## 🏗️ Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Frontend   │ ◄─────► │   Supabase   │ ◄─────► │   Gemini    │
│  (Vanilla   │         │  (PostgreSQL │         │     API     │
│     JS)     │         │   + Realtime)│         │(Forecasting)│
└─────────────┘         └──────────────┘         └─────────────┘
```

### Core Algorithms

**Days of Supply:**
```
Days of Supply = Quantity on Hand / Average Daily Usage
```

**Forecast Error (MAPE):**
```
MAPE = (100% / n) × Σ|Actual - Forecast| / Actual
```

---

## 🎯 Key Accomplishments

✅ **Sub-200ms Dashboard Load Time** - Optimized queries and parallel data fetching
✅ **13% MAPE Forecast Accuracy** - Rivals commercial solutions costing thousands/month
✅ **Dynamic Pricing Engine** - Increase revenue 10-15% during peak periods
✅ **Beautiful, Intuitive UI** - Apple-inspired design system
✅ **90-Day Historical Analysis** - Process thousands of transactions for insights
✅ **Functional AI Copilot** - Natural language interface with actionable recommendations

---

## 🧠 What We Learned

### Technical Skills
- **PostgreSQL Mastery** - Window functions, CTEs, RLS policies, custom aggregates
- **AI Integration** - JSON schema validation, prompt engineering for Gemini
- **Real-Time Architecture** - WebSocket management, optimistic UI updates
- **Data Visualization** - Chart selection, color theory, accessibility

### Domain Knowledge
- **Restaurant Operations** - Par levels, food cost percentages, menu engineering
- **Time-Series Forecasting** - Moving averages, seasonality, MAPE measurement
- **Dynamic Pricing** - Price elasticity, surge pricing, race condition handling

---

## 🚦 Challenges We Overcame

### 1. Real-Time Inventory Accuracy
Built custom PostgreSQL functions with aggressive caching to aggregate transaction-based ledger on-demand.

### 2. Forecast Model Accuracy
Improved from 35% MAPE to **13% MAPE** by integrating Gemini API for contextual analysis of menu item relationships.

### 3. Toast API Emulation
Created synthetic data generator simulating realistic order flow patterns for testing surge pricing without live POS access.

### 4. Concurrent Price Updates
Solved race conditions using PostgreSQL transactions with row-level locking and timestamp-based price versioning.

### 5. Chart.js Performance
Optimized rendering of 90-day datasets through data sampling and proper instance cleanup.

---

## 🔮 What's Next

### Near-Term (3 Months)
- 📱 **Mobile App** - iOS/Android with barcode scanning and offline support
- 💰 **Advanced Dynamic Pricing** - ML-based price elasticity modeling
- 🔗 **Supplier Integration** - Direct API connections to distributors
- 🧾 **Recipe Cost Analysis** - Real-time menu item profitability

### Medium-Term (6-12 Months)
- 🏢 **Multi-Location Support** - Enterprise features for restaurant groups
- 🤝 **Team Collaboration** - Task assignments and approval workflows
- 📊 **Advanced Analytics** - ML-powered profit optimization
- 🎯 **Revenue Intelligence** - Dynamic bundling and upsell recommendations

### Long-Term Vision
- 🌍 **Industry Expansion** - Hotels, catering, food trucks, retail
- 🤖 **Predictive Automation** - Auto-generate purchase orders
- 💳 **Financial Integration** - QuickBooks, Xero, P&L automation
- 📱 **Customer Experience** - Loyalty programs, personalized menus

---

## 📊 Impact Potential

If just **10% of US restaurants** adopted Stockd:

- 💰 Save **$4+ billion/year** through optimized purchasing
- 📈 Generate **$2+ billion in additional revenue** via dynamic pricing
- ⏱️ Free up **8+ million hours of manager time** annually
- 🌱 Prevent **550-825 million pounds of food waste**

**Stockd turns inventory management from a cost center into a profit driver.**

---

## 👥 Team

Built with ❤️ at **UGAHacks 11** by:
- [Karan Pratap Singh](https://github.com/KaranPratapSingh)
- [Vihaan Dhaka](https://github.com/vihaan-dhaka)
- [Hardik Saini](https://github.com/hardik-saini)

---

## 🏆 Hackathon

**UGAHacks 11** - University of Georgia
📍 Designed in Athens, GA
🗓️ February 2026

---

## 📄 License

This project was created for UGAHacks 11. All rights reserved.

---

## 🔗 Links

- 🌐 [Devpost Submission](https://devpost.com/software/stockd)

---

**Turning inventory data into restaurant profits.** 🚀
