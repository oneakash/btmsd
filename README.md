# ⛓️ BTMS: Blockchain Tender Management System

**BTMS** is an enterprise-grade, decentralized application (DApp) designed to eliminate fraud, enhance transparency, and automate the evaluation process in public procurement. Built as a proof-of-concept for **Shahjalal University of Science & Technology (SUST)**.

By leveraging a permissioned blockchain network, BTMS ensures that once a tender is published or a vendor's pricing proposal is submitted, the data becomes mathematically immutable and entirely tamper-proof.

## ✨ Key Features

* **Cryptographic Anti-Tampering:** Utilizes client-side `CryptoJS` to generate SHA-256 digital fingerprints of proposal documents directly in the browser. Only the mathematical hash is anchored to the blockchain, ensuring zero cloud-storage bloat and ultimate data privacy.
* **Automated Smart Contract Evaluation:** Written in Go, the chaincode autonomously evaluates all submitted bids and legally awards the tender to the lowest bidder without human intervention or bias.
* **Bilingual Dashboard:** A React.js frontend featuring seamless, real-time toggling between English and Bangla (বাংলা) to support diverse user accessibility.
* **Enterprise Identity Management:** Operates on a Hyperledger Fabric network utilizing Certificate Authorities (CAs) to strictly manage Procuring Entity and Vendor identities.

## 🏗️ System Architecture

1. **Presentation Layer (Frontend):** `React.js`
* Handles user input, state management, and client-side document hashing.


2. **Middleware Layer (API):** `Node.js & Express`
* Acts as the secure bridge using the `@hyperledger/fabric-gateway` SDK to process gRPC transactions between the web and the blockchain.


3. **Execution Layer (Smart Contracts):** `Go (Golang)`
* Contains the strict business logic (Publishing, Bidding, Evaluating) and enforces data schema integrity.


4. **Consensus & Ledger Layer:** `Hyperledger Fabric & CouchDB`
* Maintains the immutable ledger and rich query state database.



## 🚀 Getting Started

### Prerequisites

* WSL2 (Ubuntu) / Linux Environment
* Docker & Docker Compose
* Go (v1.20+)
* Node.js (v18+) & npm

### 1. Spin up the Blockchain Network

Navigate to the test network directory, start the containers, and create the channel:

```bash
cd fabric-samples/test-network
MAX_RETRY=15 CLI_DELAY=5 ./network.sh up createChannel -c tenderchannel -ca -s couchdb

```

Deploy the Go Smart Contract to the channel:

```bash
CORE_PEER_CLIENT_CONNTIMEOUT=1200s ./network.sh deployCC -ccn btms -ccp ../../chaincode-tender/ -ccl go -c tenderchannel -ccv 1.0 -ccs 1

```

### 2. Configure Environment Variables

You must create `.env` files locally, as they are not tracked in version control.

**Backend (`backend/.env`):**

```env
PORT=5000
JWT_SECRET=your_super_secret_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

```

**Frontend (`frontend/.env`):**

```env
REACT_APP_PINATA_API_KEY=your_pinata_api_key
REACT_APP_PINATA_SECRET_API_KEY=your_pinata_secret_key

```

### 3. Build and Launch the Containers

Navigate to the root of this project (`fabric-btms`) and spin up the bridged network:

```bash
docker-compose up --build -d

```

*The backend API will mount the Fabric wallet volumes, and the React UI will be served statically via an internal Nginx container on port 3000.*

---

#### Start the Backend API

Open a new terminal, install the dependencies, and start the Express server:

```bash
cd backend
npm install
node server.js

```

*(The API will run on `http://localhost:5000`)*

#### Start the Frontend Dashboard

Open a final terminal, install the React dependencies, and fire up the UI:

```bash
cd frontend
npm install
npm start

```

*(The UI will run on `http://localhost:3000`)*

## 🔄 Core Workflow

1. **Publish Tender:** The Procuring Entity defines the tender ID, budget, deadline, and uploads the requirement document (which is instantly hashed).
2. **Submit Bid:** Vendors upload their secret pricing proposals. The browser calculates the document hash and secures the bid amount on the ledger.
3. **Evaluate & Award:** The Procuring Entity triggers the smart contract. The chaincode reads all bids, compares them against the budget, finds the lowest valid bid, and permanently writes the winner to the ledger.
4. **View Tenders:** Anyone can view the live, immutable state of all tenders on the network.

## 🛡️ License & Acknowledgements

Developed by **Tazbir Hossain Akash**. Built on the Hyperledger Fabric open-source framework.
