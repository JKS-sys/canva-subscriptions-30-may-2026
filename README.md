## ✅ Correct raw README.md (copy everything below this line)

````
# Canva Subscription Tracker

A secure, multi‑platform web app to store **name & email addresses** for Canva subscriptions.
It automatically counts **re‑uploads** of the same pair, records the **first entry date** (in 24‑hour format), and lets you **export/import** the data as an Excel file.
All data is stored online in **Firebase Firestore**, while sensitive credentials stay hidden on the backend.

---

## ✨ Features

- 🔐 **Password‑protected** – Only people with the correct password can see or modify the data.
- 📋 **Smart parsing** – Paste your raw name/email list (the exact format you already use) – stray lines, extra spaces, and single‑letter lines are ignored.
- 🔁 **Re‑upload counter** – If a name+email pair appears again, its counter increases; the first entry date never changes.
- 📊 **Excel export / import** – Download all entries as `.xlsx` or replace the database with a previously exported file.
- 🕒 **24‑hour time display** – All dates and times are shown in 24‑hour format (e.g., `30/05/2026, 14:30`).
- ⏳ **Progress indicator** – A loading overlay prevents accidental tab close / refresh during uploads or imports.
- 🛡️ **Secure architecture** – Firebase Admin credentials are **never** sent to the browser. The password hash is stored only on the server (in `.env`).
- 🌐 **Multi‑platform** – Works on desktop, tablet, and mobile (any modern browser).

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Express |
| Database | Firebase Firestore (Admin SDK) |
| File handling | Multer, SheetJS (`xlsx`) |
| Environment | `dotenv` |
| Frontend | Plain HTML/CSS/JavaScript |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher) – [Download](https://nodejs.org/)
- **A Firebase project** with Firestore enabled – [Firebase Console](https://console.firebase.google.com/)
- A **service account key** for that project (JSON file)

### 1. Clone / download the repository

Place all project files in a folder.

### 2. Install dependencies

```bash
npm install
````

### 3. Set up environment variables

Create a file named **`.env`** in the root folder with the following content:

```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"canva-tracker","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-fbsvc@canva-tracker.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40canva-tracker.iam.gserviceaccount.com","universe_domain":"googleapis.com"}
PASSWORD_HASH=a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3
```

- `FIREBASE_SERVICE_ACCOUNT` – the **minified one‑line JSON** of your Firebase service account key.  
  (Open the downloaded JSON, remove all line breaks, and paste as a single string.)
- `PASSWORD_HASH` – the **SHA‑256 hash** of the password you want to use (default `a665a4...` corresponds to `123`).  
  To generate a hash for a different password, run:
  ```bash
  node -e "console.log(require('crypto').createHash('sha256').update('YOUR_PASSWORD').digest('hex'))"
  ```

### 4. Start the server

```bash
npm start
```

The app will be available at:  
**`http://localhost:3000`**

### 5. Log in

Enter the password (`123` if you kept the default hash).  
The main tracker interface appears.

---

## 📖 Usage

### Paste & Upload

1. Copy your list of name‑email pairs in the format you already use.  
   Example:

   ```
   John Doe
   johndoe@gmail.com

   Jane Smith
   janesmith@email.com
   ```

2. Paste it into the text box.
3. Click **📥 Upload & Process**.
   - New pairs are added with `Re‑upload Count = 0` and the current date as first entry.
   - Pairs that already exist have their count incremented.

### Export to Excel

Click **📊 Export to Excel** – a file `canva_subscriptions.xlsx` downloads with columns: Name, Email, Date of Entry, Re‑upload Count.

### Import Excel

Click **📂 Import Excel**, choose a previously exported `.xlsx` file.  
⚠️ **This replaces ALL current data** with the contents of the file.

### Clear All Data

Click **🗑️ Clear All Data** – after confirmation, the entire online database is deleted.

---

## 🔒 Security

- The **Firebase service account JSON** is stored only in the `.env` file on the server and is **never exposed** to the browser.
- The **password hash** is kept only on the server (in `.env`). The browser sends the plain password, which the server hashes and compares – the actual hash is never in the frontend source code.
- All API routes are protected – a valid password must be sent in the `x-password` header.
- Use **HTTPS** when deploying to a public URL to encrypt all traffic.

---

## 🐞 Troubleshooting

| Issue                              | Solution                                                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Favicon 404** in browser console | Harmless – the server returns a `204 No Content` for `/favicon.ico`. Clear browser cache if the 404 persists.                                                                  |
| **401 Unauthorized**               | Wrong password, or `PASSWORD_HASH` in `.env` doesn’t match the password you entered. Double‑check both.                                                                        |
| **500 Internal Server Error**      | Check the server terminal for errors. The most common cause is missing `protobufjs` – run `npm install protobufjs`. Also ensure Firestore is enabled in your Firebase project. |
| **Data not loading**               | Make sure your Firestore database has the correct security rules. For a personal project you can use `allow read, write: if true;` (but be careful with public exposure).      |
| **`MODULE_NOT_FOUND`**             | Run `npm install` again to ensure all dependencies are installed.                                                                                                              |

---

## 🌍 Deployment

You can host this app on any Node.js platform (Render, Railway, Heroku, etc.).

1. Set the **environment variables** (`FIREBASE_SERVICE_ACCOUNT`, `PASSWORD_HASH`) in the hosting dashboard – not via `.env` file.
2. Ensure the platform runs `npm start` (or the equivalent start command).
3. All static files are served from the `public/` folder automatically.

---

## 📂 Project structure

```
your-project/
├── .env                  (ignored by git)
├── .gitignore
├── package.json
├── server.js
├── public/
│   └── index.html
└── README.md
```

---

## 📄 License

MIT – feel free to use and modify for your own needs.

```

```
