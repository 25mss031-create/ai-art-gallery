# 🔴 Constructivist AI Art Studio

A full-stack web application for generating, showcasing, and collecting **Constructivist-inspired AI artwork**. Inspired by the 1920s avant-garde movement (El Lissitzky, Aleksander Rodchenko, Kazimir Malevich), the platform combines procedural geometric art algorithms with a bold, dynamic user experience.

---

## 🎨 Features

- **Geometric AI Art Generator**: Create unique vector artwork featuring diagonal grids, dynamic color blocking, architectural lines, and typographic accents.
- **Interactive Art Studio**: Customize generation parameters, preview designs, and generate constructivist compositions.
- **Community Art Gallery**: Explore public artwork, view creation metadata, and like community pieces.
- **User Dashboard & Collections**: Save generated pieces, manage your personal portfolio, and view user statistics.
- **Secure Authentication**: User registration and login using JSON Web Tokens (JWT) and `bcryptjs` password hashing.
- **Constructivist Design System**: Custom Vanilla CSS featuring dynamic grid overlays, high-contrast color palettes (Crimson, Gold, Slate, Ink), and sleek micro-animations.

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: React 19 + Vite 6
- **Routing**: React Router v7
- **Styling**: Vanilla CSS (Custom Constructivist Design Tokens & Animations)
- **Icons & Graphics**: Custom SVG Graphics & Dynamic Background Canvas

### **Backend**
- **Server**: Node.js + Express
- **Database**: SQLite (via `better-sqlite3`)
- **Authentication**: JWT (`jsonwebtoken`) & `bcryptjs`
- **Asset Storage**: Express static file server for generated SVG & image assets

---

## 📁 Project Structure

```
website-2/
├── package.json            # Root workspace scripts (runs client & server concurrently)
├── .gitignore              # Ignored files (node_modules, db, logs)
├── client/                 # React Frontend Application
│   ├── public/             # Static assets & icons
│   ├── src/
│   │   ├── assets/         # Images & vectors
│   │   ├── components/     # Navbar, ImageCard, GeometricBackground, ProtectedRoute
│   │   ├── context/        # AuthContext for global session management
│   │   ├── pages/          # Landing, Studio, Gallery, Dashboard, Login, Register
│   │   ├── App.jsx         # Router setup & layout
│   │   └── main.jsx        # Entry point & styles
│   ├── package.json
│   └── vite.config.js
└── server/                 # Express Backend API
    ├── data/               # SQLite Database storage (`studio.db`)
    ├── public/images/      # Generated SVG artwork repository
    ├── src/
    │   ├── middleware/     # Auth middleware (`auth.js`)
    │   ├── routes/         # Auth & Image API endpoints
    │   ├── db.js           # Database initialization & schemas
    │   ├── generator.js    # Constructivist procedural SVG generation logic
    │   └── index.js        # Server entry point
    └── package.json
```

---

## 🚀 Getting Started

### **Prerequisites**
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)

### **Installation**

1. **Clone the Repository**
   ```bash
   git clone https://github.com/25mss031-create/website-.git
   cd website-
   ```

2. **Install Dependencies**
   Install dependencies for the root, client, and server:
   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   cd ..
   ```

---

## 🏃 Running the Application

Run both the **Frontend** and **Backend** concurrently from the root directory:

```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

### **Individual Commands**

- Run Server only:
  ```bash
  npm run dev:server
  ```
- Run Client only:
  ```bash
  npm run dev:client
  ```

---

## 📡 API Endpoints

### **Authentication**
- `POST /api/auth/register` - Create a new user account
- `POST /api/auth/login` - Authenticate user & receive JWT token
- `GET /api/auth/me` - Fetch authenticated user profile

### **Artwork & Generator**
- `POST /api/images/generate` - Generate new constructivist artwork (Authenticated)
- `GET /api/images/gallery` - Retrieve public gallery images
- `GET /api/images/user` - Retrieve artworks created by the current user
- `POST /api/images/:id/like` - Toggle like on an artwork

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
