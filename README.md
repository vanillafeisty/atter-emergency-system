# 🚨 ATTER — AI-Driven Two-Tier Emergency Response System

> Real-time coordinated emergency transport with live GPS tracking, edge AI rendezvous, and Razorpay payments.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js 18, React Router v6, Socket.io-client, Leaflet + OSM |
| Backend | Node.js, Express.js, Socket.io |
| Database | MongoDB Atlas (free tier) |
| Auth | JWT (JSON Web Tokens) |
| Payments | Razorpay (INR) |
| Deployment | Frontend → Vercel | Backend → Render.com |

---

## 🚀 STEP-BY-STEP DEPLOYMENT GUIDE

### STEP 1 — Set Up MongoDB Atlas (Free)

1. Go to https://www.mongodb.com/atlas and click **Try Free**
2. Create a free account and create a **new project**
3. Click **Build a Database** → Choose **M0 Free Tier** → Region: Mumbai (ap-south-1)
4. Create a **username and password** (save these!)
5. Under **Network Access** → Add IP Address → Allow access from anywhere: `0.0.0.0/0`
6. Click **Connect** → **Connect your application** → Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/atter?retryWrites=true&w=majority
   ```
   Replace `<username>` and `<password>` with yours.

---

### STEP 2 — Set Up Razorpay

1. Go to https://razorpay.com and create a free account
2. Go to **Settings → API Keys** → Generate Test Key
3. Copy your **Key ID** (`rzp_test_xxx`) and **Key Secret**
4. For production later: Complete KYC and switch to live keys

---

### STEP 3 — Push to GitHub

```bash
# Navigate to the atter-system folder
cd atter-system

# Initialize git
git init
git add .
git commit -m "Initial ATTER system commit"

# Create a new repo on GitHub: https://github.com/new
# Name it: atter-emergency-system
# Keep it Public (required for free Vercel + Render deployment)

# Push to GitHub (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/atter-emergency-system.git
git branch -M main
git push -u origin main
```

---

### STEP 4 — Deploy Backend to Render.com (Free)

1. Go to https://render.com and sign in with GitHub
2. Click **New +** → **Web Service**
3. Connect your GitHub repo: `atter-emergency-system`
4. Set these settings:
   - **Name**: `atter-backend`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Under **Environment Variables**, add ALL of these:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | Your Atlas connection string from Step 1 |
| `JWT_SECRET` | Any long random string (e.g. `atter_secret_2024_xyz_abc_very_long`) |
| `JWT_EXPIRE` | `7d` |
| `RAZORPAY_KEY_ID` | `rzp_test_xxx` from Step 2 |
| `RAZORPAY_KEY_SECRET` | Your secret from Step 2 |
| `CLIENT_URL` | `https://atter-emergency.vercel.app` (you'll set this after Step 5) |
| `NODE_ENV` | `production` |
| `PORT` | `5000` |

6. Click **Create Web Service**
7. Wait ~3 minutes. Copy your backend URL: `https://atter-backend.onrender.com`

---

### STEP 5 — Deploy Frontend to Vercel (Free)

1. Go to https://vercel.com and sign in with GitHub
2. Click **New Project** → Import `atter-emergency-system`
3. Set **Root Directory** to `frontend`
4. Under **Environment Variables**, add:

| Key | Value |
|-----|-------|
| `REACT_APP_API_URL` | `https://atter-backend.onrender.com/api` |
| `REACT_APP_SOCKET_URL` | `https://atter-backend.onrender.com` |
| `REACT_APP_RAZORPAY_KEY_ID` | `rzp_test_xxx` from Step 2 |

5. Click **Deploy**
6. Your site will be live at: `https://atter-emergency-system.vercel.app`

---

### STEP 6 — Update Backend CORS (after Vercel deployment)

1. Go back to Render → your backend service → **Environment** tab
2. Update `CLIENT_URL` to your actual Vercel URL: `https://atter-emergency-system.vercel.app`
3. Click **Save Changes** → Render will redeploy automatically

---

### STEP 7 — Add Razorpay Script to Frontend

In `frontend/public/index.html`, the Razorpay script is already included. For production, make sure this line exists in `<head>`:
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

---

### STEP 8 — Get Indexed by Google

After your site is live:

1. Go to https://search.google.com/search-console
2. Add your Vercel URL as a property
3. Submit your sitemap (Vercel generates one automatically)
4. Use **URL Inspection** → **Request Indexing** for your homepage

Your site will appear in Google search within 1–4 weeks.

---

## 🖥️ Running Locally (Development)

```bash
# 1. Clone your repo
git clone https://github.com/YOUR_USERNAME/atter-emergency-system.git
cd atter-emergency-system

# 2. Set up backend environment
cd backend
cp .env.example .env
# Edit .env with your real values (MongoDB URI, JWT secret, Razorpay keys)
npm install
npm run dev
# Backend runs on http://localhost:5000

# 3. Set up frontend (new terminal)
cd frontend
cp .env.example .env
# Edit .env:
#   REACT_APP_API_URL=http://localhost:5000/api
#   REACT_APP_SOCKET_URL=http://localhost:5000
#   REACT_APP_RAZORPAY_KEY_ID=rzp_test_xxx
npm install
npm start
# Frontend runs on http://localhost:3000
```

---

## 👥 Testing All Four Interfaces

Open 3 browser tabs:

| Tab | URL | Login as |
|-----|-----|---------|
| 1 | `/register?role=patient` | Register as Patient |
| 2 | `/register?role=helper` | Register as Helper Vehicle |
| 3 | `/register?role=ambulance` | Register as Ambulance |

**Test flow:**
1. **Patient** presses SOS → emergency created
2. **Helper** sees alert → accepts → navigates to patient
3. **Ambulance** sees intercept alert → accepts → sets rendezvous point
4. All three track each other live on the map
5. **Helper** enters vitals → ambulance sees them in real-time
6. **Patient** completes payment via Razorpay after emergency ends

---

## 📁 Project Structure

```
atter-system/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── User.js          # Patient, Helper, Ambulance schema
│   │   │   └── Emergency.js     # Full emergency lifecycle schema
│   │   ├── routes/
│   │   │   ├── auth.js          # Register, Login, /me
│   │   │   ├── emergency.js     # Request, accept, status, history
│   │   │   ├── payment.js       # Razorpay create-order + verify
│   │   │   └── user.js          # Location update, availability
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT protect + role authorize
│   │   ├── socket/
│   │   │   └── socketHandler.js # Live location, chat, vitals, status
│   │   └── server.js            # Express + Socket.io + MongoDB
│   ├── .env.example
│   ├── render.yaml
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html           # SEO meta tags, Leaflet CSS, fonts
    ├── src/
    │   ├── context/
    │   │   ├── AuthContext.js   # JWT auth, login, register, logout
    │   │   └── SocketContext.js # Socket.io connection + helpers
    │   ├── components/
    │   │   ├── Navbar.js        # Fixed nav with role badge + live indicator
    │   │   ├── LiveMap.js       # Leaflet OSM map with all 4 markers
    │   │   └── StatusBadge.js   # Animated status pill
    │   ├── pages/
    │   │   ├── HomePage.js      # Landing, how-it-works, role cards, sign-in
    │   │   ├── LoginPage.js     # JWT login → role-based redirect
    │   │   ├── RegisterPage.js  # Role selector + form → auto login
    │   │   ├── PatientDashboard.js    # SOS, live map, payment, chat
    │   │   ├── HelperDashboard.js     # Dispatch alerts, vitals entry, nav
    │   │   └── AmbulanceDashboard.js  # Intercept, rendezvous, vitals display
    │   ├── App.js               # Router + ProtectedRoute
    │   ├── index.js
    │   └── index.css            # CSS variables, dark theme
    ├── .env.example
    ├── vercel.json
    └── package.json
```

---

## 🔑 API Endpoints Reference

### Auth
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login + get JWT |
| GET | `/api/auth/me` | Protected | Get current user |

### Emergency
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/api/emergency/request` | Patient | Create SOS request |
| GET | `/api/emergency/active` | Any | Get active emergency |
| GET | `/api/emergency/pending` | Helper/AMB | Get unassigned requests |
| PATCH | `/api/emergency/:id/accept` | Helper/AMB | Accept an emergency |
| PATCH | `/api/emergency/:id/status` | Any | Update status/vitals/rendezvous |
| GET | `/api/emergency/history` | Any | Past completed emergencies |

### Payment
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/api/payment/create-order` | Patient | Create Razorpay order |
| POST | `/api/payment/verify` | Patient | Verify payment signature |

### User
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| PATCH | `/api/user/location` | Protected | Update GPS coordinates |
| GET | `/api/user/available/:role` | Protected | List available helpers/AMBs |
| PATCH | `/api/user/availability` | Protected | Toggle on/off duty |

---

## ⚡ Socket.io Events Reference

| Event (emit) | Direction | Description |
|-------------|-----------|-------------|
| `location:update` | Client → Server | Send my GPS every 5s |
| `location:received` | Server → Client | Receive others' GPS |
| `emergency:new` | Client → Server | Broadcast SOS to helpers |
| `emergency:alert` | Server → Client | Notify helpers/AMBs of new emergency |
| `emergency:helper_accepted` | Client → Server | Helper accepted, notify AMBs |
| `emergency:status_change` | Client → Server | Status changed, notify all |
| `emergency:status_update` | Server → Client | Receive status update |
| `vitals:update` | Client → Server | Helper sends vitals to AMB |
| `vitals:received` | Server → Client | AMB receives vitals |
| `chat:message` | Bidirectional | Real-time chat between participants |

---

## 📞 Support

Built for the INJRD Conference paper:
**"ATTER: An AI-Driven Two-Tier Emergency Response Framework with Edge-Based Dynamic Rendezvous Optimization for Rural and Congested Urban Environments"**

NIST Institute of Science and Technology, Berhampur, Odisha — 2025
