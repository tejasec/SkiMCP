# Project Startup Guide: PC & Android (Termux)

This guide covers running the **ScourMCP** on your desktop/laptop (Linux, macOS, Windows) and running it directly on an Android device using **Termux**.

---

## 1. Running on PC

### Prerequisites
- Node.js >= 20.x (`node -v`)
- npm >= 10.x (`npm -v`)
- Optional: Docker

Navigate to the project root:
```bash
cd scourmcp
```

---

### Option A: Local Production Mode (Recommended for Quick Demo)
In this mode, Express serves both the backend API (`/api/*`) and the pre-built React frontend from port `8080`.

1. **Install dependencies**:
   ```bash
   npm install
   ```
   *(If prompted by npm regarding install-scripts for esbuild: `npm install-scripts approve esbuild`)*

2. **Build frontend and backend**:
   ```bash
   npm run build
   ```

3. **Start the server**:
   ```bash
   PORT=8080 npm start
   ```

4. **Access the application**:
   - Open your browser to: **`http://localhost:8080`**
   - Health check: `http://localhost:8080/api/health`

---

### Option B: Local Development Mode (Hot-Reloading)
Runs Vite dev server with proxy to the backend Express server:

```bash
npm run dev
```
- **Frontend (Vite UI with hot reload):** `http://localhost:5173`
- **Backend (Express API):** `http://localhost:8080`

---

### Option C: Docker Container
```bash
# 1. Build the multi-stage image
docker build -t scourmcp .

# 2. Run the container
docker run --rm -p 8080:8080 scourmcp

# 3. Open http://localhost:8080
```

---

### Option D: Accessing the PC Server from your Phone (Over Local Wi-Fi)
If you want to view/use the app on your phone without installing Node on Android:
1. Ensure both your PC and phone are connected to the same Wi-Fi network.
2. Find your PC's local IP address:
   - Linux/macOS: `hostname -I` or `ip a`
   - Windows: `ipconfig` (look for IPv4 address, e.g., `192.168.1.50`)
3. Run the project in production mode on PC:
   ```bash
   PORT=8080 npm start
   ```
4. On your phone's browser, navigate to:
   ```
   http://<YOUR_PC_LOCAL_IP>:8080
   ```

---

## 2. Running on Phone with Termux

You can run both the Node.js backend and the web scanner natively inside Android without needing root or a PC.

### Step 1: Install & Set Up Termux
1. Install **Termux** from [F-Droid](https://f-droid.org/en/packages/com.termux/) or GitHub releases (avoid the outdated Google Play version).
2. Open Termux and update packages:
   ```bash
   pkg update && pkg upgrade -y
   ```
3. Install Node.js (LTS), Git, and build tools:
   ```bash
   pkg install nodejs-lts git -y
   ```
4. Verify Node and npm:
   ```bash
   node -v
   npm -v
   ```

---

### Step 2: Transfer or Clone the Project to Termux

#### Method 1: Copy from Phone Internal Storage
If you copied the `scourmcp` folder to your phone's internal storage (e.g. Download folder):
1. Grant Termux storage access:
   ```bash
   termux-setup-storage
   ```
   *(Accept the Android permission prompt)*
2. Copy the folder to your Termux home directory:
   ```bash
   cp -r ~/storage/shared/Download/scourmcp ~/
   cd ~/scourmcp
   ```

#### Method 2: Git Clone
If pushed to GitHub or GitLab:
```bash
git clone <YOUR_REPO_URL>
cd scourmcp
```

---

### Step 3: Install Dependencies & Build in Termux
Inside the `scourmcp` folder in Termux:

1. **Install dependencies**:
   ```bash
   npm install
   ```
   *(If prompted regarding esbuild scripts: `npm install-scripts approve esbuild`)*

2. **Build the bundles**:
   ```bash
   npm run build
   ```
   > **Tip for low-RAM phones:** If `npm run build` is killed due to memory limits:
   > - You can pre-build `dist/` on your PC first and copy the whole folder including `dist/` over to your phone.
   > - Alternatively, allocate swap memory in Termux or run:
   >   `NODE_OPTIONS="--max-old-space-size=512" npm run build`

---

### Step 4: Start the Scanner in Termux
Run the production server:
```bash
PORT=8080 npm start
```

You should see:
```text
ScourMCP listening on http://localhost:8080
```

---

### Step 5: Open the App on Your Phone
1. Switch to your phone's browser (Google Chrome, Firefox, Brave, etc.).
2. Navigate to:
   ```
   http://localhost:8080
   ```
3. The full scanner UI is active and self-contained on your device!
   - Paste or upload any MCP manifest JSON.
   - Click **Scan Manifest** to view the findings and risk score.

---

### Useful Termux Tips
- **Keep Termux alive in the background**: Pull down the Android notification shade and tap **Acquire Wakelock** on the Termux notification, or disable Android Battery Optimization for Termux so Android doesn't kill the background Node process.
- **Stop the server**: Press `Ctrl + C` in Termux.
- **Port Choice**: Ports > 1024 (like `8080`) work without root permissions on Android.
