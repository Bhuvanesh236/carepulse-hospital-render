# 🚀 How to Host CarePulse on Render (Free & Fast)

This guide walks you through deploying the **Intelligent Hospital Appointment & Queue Optimization System** to **[Render.com](https://render.com)**.

---

## 🌟 Why This Setup Works Seamlessly on Render

- **Zero-Config Monolith**: Express serves both the **API/WebSockets** and the **Production React Frontend** from a single service.
- **100% Free-Tier Compatible**: Runs completely on Render's Free Web Service plan ($0/month).
- **Zero CORS Issues**: Because the frontend and backend share the same domain (e.g., `https://carepulse.onrender.com`), all API requests and WebSocket queue updates connect automatically.

---

## 📋 Step-by-Step Deployment Guide

### Step 1: Push Your Project to GitHub

1. Open your terminal in the project folder (`c:\Users\bhuvi\Desktop\HOSPITAL`):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - CarePulse Hospital System"
   ```
2. Create a new repository on **[GitHub](https://github.com/new)** (e.g. `carepulse-hospital`).
3. Link and push your code:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/carepulse-hospital.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 2: Create a Web Service on Render

1. Go to **[dashboard.render.com](https://dashboard.render.com)** and sign in (or create a free account).
2. Click the **"New +"** button at the top right and select **"Web Service"**.
3. Choose **"Build and deploy from a Git repository"** and click **Next**.
4. Connect your GitHub account and select your repository (`carepulse-hospital`).

---

### Step 3: Configure the Web Service

Fill in the settings as shown below:

| Field | Value | Notes |
|---|---|---|
| **Name** | `carepulse-hospital` *(or any name you like)* | This becomes your URL: `https://carepulse-hospital.onrender.com` |
| **Region** | Oregon (US West) / Frankfurt / Singapore | Pick the closest region to you |
| **Branch** | `main` | Default branch |
| **Root Directory** | *(Leave Blank)* | Runs from project root |
| **Runtime** | `Node` | Standard Node.js environment |
| **Build Command** | `npm run build` | Builds both frontend and backend |
| **Start Command** | `npm start` | Launches Express & WebSocket server |
| **Instance Type** | **Free** | $0/month free tier |

---

### Step 4: Add Environment Variables

Scroll down to the **"Environment Variables"** section and click **"Add Environment Variable"**:

| Key | Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production optimizations |
| `JWT_SECRET` | *(Click "Generate" or enter a random string)* | Secret for signing auth tokens |
| `CORS_ORIGIN` | `*` | Allows client connections |

*(Optional: If you want to use an external MySQL database like Clever Cloud / PlanetScale / Aiven, you can add `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`. If not provided, the system automatically uses its high-performance built-in relational database!)*

---

### Step 5: Deploy!

1. Click **"Create Web Service"** at the bottom of the page.
2. Render will start building the frontend and backend automatically:
   - Installing dependencies
   - Compiling React + TypeScript frontend bundle (`frontend/dist`)
   - Compiling Express backend TypeScript (`backend/dist`)
   - Starting the server and running initial database seeds
3. Once the build finishes (usually 1-2 minutes), the status will change to **"Live"** with a green checkmark!
4. Click your Render URL (e.g. `https://carepulse-hospital.onrender.com`) to open your live web application!

---

## ⚡ Alternative: 1-Click Render Blueprint (render.yaml)

Since this repository contains a pre-configured `render.yaml` file:

1. In Render Dashboard, click **"New +"** ➔ **"Blueprint"**.
2. Select your `carepulse-hospital` GitHub repository.
3. Render will read `render.yaml` and configure everything automatically.
4. Click **"Apply"** to deploy!

---

## 🔑 Pre-Seeded Accounts for Live Testing

Once your Render app is live, you can log in immediately using the 1-click presets on the login screen:

| Role | Email | Password |
|---|---|---|
| **👑 Hospital Admin** | `admin@hospital.com` | `Admin@2026` |
| **👨‍⚕️ Cardiologist** | `doctor.sarah@hospital.com` | `Doctor@2026` |
| **👨‍⚕️ Neurologist** | `doctor.robert@hospital.com` | `Doctor@2026` |
| **🧑 Patient** | `patient.john@example.com` | `Patient@2026` |
| **🧑 New Patient** | Register directly via `/register` | Custom password |
