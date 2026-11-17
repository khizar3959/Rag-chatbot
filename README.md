# 🛒 AI E-Commerce Support Agent (Next.js Capstone Project)

A production-ready, full-stack AI-powered e-commerce customer support agent built with **Next.js 14**, **Tailwind CSS**, **Google Gemini**, and **Google Sheets API**.

The agent assists customers with product discovery, pricing, stock availability, order tracking, and automated refund processing based on official company policies read directly from a Word (`.docx`) document.

---

## 🌟 Features

- 🤖 **Context-Aware AI Chatbot**: Powered by Google Gemini (`gemini-flash-lite-latest`) for real-time customer query resolution.
- 📄 **Word (.docx) Policy Document Reading**: Uses `mammoth` to dynamically ingest and parse `Company_Policy.docx` for return, refund, shipping, and warranty rules.
- 📊 **Live Google Sheets Integration**:
  - **Products Catalog**: Fetches real-time price, stock availability, category, and specifications from Google Sheets.
  - **Orders System**: Retrieves real-time customer orders, purchase dates, and fulfillment statuses.
  - **Refund & Bank Logging**: Logs interactions and updates refund approval states.
- ⚡ **Automated Refund Decision Engine**:
  - Evaluates eligibility according to company return policies (e.g., **15 days** for electronics like laptops/phones/headphones; **30 days** for other items).
  - Automatically approves or declines refund requests with transparent policy citations.
  - Updates order status to `Return Approved` in Google Sheets.
- 📧 **Automated Refund Confirmation Emails**:
  - Dispatches professional HTML confirmation emails to customers via `nodemailer` upon refund approval.
  - Features local simulated email fallback for environments without SMTP credentials.
- 🎨 **Modern Interactive Dashboard**:
  - **Live AI Support Chat**: Interactive customer chat with quick prompt suggestions.
  - **Google Sheets Products Viewer**: Filterable view of products, stock levels, and pricing.
  - **Orders & Refund Tracker**: Live inspection of orders, days elapsed, and refund states.
  - **Company Policy Viewer**: Full text of official return and refund policies.

---

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── chat/route.js       # Main AI chat & refund agent endpoint
│   │   ├── orders/route.js     # Live orders Google Sheets fetcher
│   │   └── products/route.js   # Live products Google Sheets fetcher
│   ├── globals.css             # Tailwind CSS styles
│   ├── layout.jsx              # Root layout & metadata
│   └── page.jsx                # Full interactive multi-tab dashboard
├── lib/
│   ├── agent.js                # Core agent decision engine & Gemini prompt logic
│   ├── email.js                # Nodemailer automated refund email dispatcher
│   ├── policy.js               # Word (.docx) document parser using mammoth
│   └── sheets.js               # Google Sheets CSV fetcher and status updater
├── streamlit_app/              # Original Python Streamlit RAG application
│   ├── app.py
│   ├── rag.py
│   └── requirements.txt
├── Company_Policy.docx         # Official company return & refund policy
├── jsconfig.json               # Path alias configuration (@/*)
├── next.config.mjs             # Next.js configuration
├── package.json                # Node.js dependencies
└── tailwind.config.js          # Tailwind styling configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node 20 & 24)
- Google Gemini API Key

### 2. Installation
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the project root:
```env
GOOGLE_API_KEY=your_gemini_api_key_here

# Optional: Custom Google Sheets IDs
# GOOGLE_SHEET_PRODUCTS_ID=1vWSe1-GsTXi9lXrLyEEee0q3QXgtspepO6JWD0DNiPk
# GOOGLE_SHEET_ORDERS_ID=1xl3LS8xbNuJMGssg5UD89CSbHdnh2FBYMU3on4DI-U0
# GOOGLE_SHEET_BANK_ID=1Ic0mnXGUEDYoGA5JRoOO3Ofk9NYpa9gJKw-HmzCJfzw

# Optional: SMTP Email Configuration (Nodemailer uses simulated fallback if omitted)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your_email@gmail.com
# SMTP_PASS=your_app_password
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploy to Vercel

1. Push this repository to GitHub:
   ```bash
   git add .
   git commit -m "Deploy AI E-Commerce Support Agent"
   git push origin main
   ```
2. Go to [Vercel Dashboard](https://vercel.com/) and click **Add New Project**.
3. Select your GitHub repository (`Rag-chatbot`).
4. In **Project Settings ➔ Environment Variables**, add:
   - `GOOGLE_API_KEY`: Your Google Gemini API Key
5. Click **Deploy**. Vercel will automatically build and deploy your Next.js application!
