const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const grpc = require('@grpc/grpc-js');
const { connect, signers } = require('@hyperledger/fabric-gateway');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { verifyRole, JWT_SECRET } = require('./authMiddleware');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Temporary Off-Chain Database for Users
// (In production, this would be MongoDB or PostgreSQL)
const usersDB = []; 

// 2. Configure the Email Sender
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


// --- Fabric Network Configuration ---
const channelName = 'tenderchannel';
const chaincodeName = 'btms';
const mspId = 'Org1MSP';

// --- Cryptographic Paths ---
const cryptoPath = path.resolve(__dirname, '../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com');
const certPath = path.resolve(cryptoPath, 'users/User1@org1.example.com/msp/signcerts/cert.pem');
const keyDirectoryPath = path.resolve(cryptoPath, 'users/User1@org1.example.com/msp/keystore');
const tlsCertPath = path.resolve(cryptoPath, 'peers/peer0.org1.example.com/tls/ca.crt');
const peerEndpoint = 'localhost:7051';
const peerHostAlias = 'peer0.org1.example.com';

// --- Helper Functions to Connect to Fabric ---
async function newGrpcConnection() {
    const tlsRootCert = await fs.promises.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

async function newIdentity() {
    const credentials = await fs.promises.readFile(certPath);
    return { mspId, credentials };
}

async function newSigner() {
    const files = await fs.promises.readdir(keyDirectoryPath);
    const keyPath = path.resolve(keyDirectoryPath, files[0]);
    const privateKeyPem = await fs.promises.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

async function getContract() {
    const client = await newGrpcConnection();
    const gateway = connect({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
        // evaluateOptions: () => { return { deadline: Date.now() + 5000 }; },
        // endorseOptions: () => { return { deadline: Date.now() + 15000 }; },
        // submitOptions: () => { return { deadline: Date.now() + 5000 }; },
        evaluateOptions: () => { return { deadline: Date.now() + 60000 }; },
        endorseOptions: () => { return { deadline: Date.now() + 60000 }; }, 
        submitOptions: () => { return { deadline: Date.now() + 60000 }; },
        commitStatusOptions: () => { return { deadline: Date.now() + 60000 }; },
    });
    const network = gateway.getNetwork(channelName);
    return { contract: network.getContract(chaincodeName), gateway, client };
}

// ==========================================
//                 API ROUTES
// ==========================================

// 3. REGISTRATION ROUTE
app.post('/api/auth/register', async (req, res) => {
  const { companyName, email, password } = req.body;

  // Check if user already exists
  if (usersDB.find(u => u.email === email)) {
    return res.status(400).json({ success: false, message: "Email already registered" });
  }

  // Cryptographically hash the password (never store plain text!)
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Save to database with UNVERIFIED status
  const newUser = {
    companyName,
    email,
    password: hashedPassword,
    role: 'vendor',
    status: 'UNVERIFIED', 
    otp: otp,
    docHash: null
  };
  usersDB.push(newUser);

  // Send the verification email
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'BTMS: Verify Your Vendor Account',
    text: `Welcome to BTMS, ${companyName}! Your registration verification code is: ${otp}`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Registration successful. Please check your email for the OTP." });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ success: false, message: "Failed to send verification email." });
  }
});

// 4. OTP VERIFICATION ROUTE
app.post('/api/auth/verify-email', (req, res) => {
  const { email, otp } = req.body;

  const user = usersDB.find(u => u.email === email);
  
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  if (user.otp !== otp) return res.status(400).json({ success: false, message: "Invalid OTP" });

  // Update status and clear the OTP
  user.status = 'PENDING_DOCS';
  user.otp = null;

  res.json({ success: true, message: "Email verified successfully! Please upload your compliance documents." });
});

// Login Route to generate the JWT Badge
app.post('/api/auth/login', (req, res) => {
  const { role } = req.body; // 'admin' or 'vendor'
  
  // Issue a token containing their role that expires in 2 hours
  const token = jwt.sign({ role: role }, JWT_SECRET, { expiresIn: '2h' });
  
  res.json({ success: true, token, role });
});

// 1. Publish a new Tender (Writes to Ledger)
app.post('/api/tenders', verifyRole('admin'), async (req, res) => {
        try {
        const { tenderId, title, budget, deadline, docHash } = req.body;
        console.log(`[API] Received request to publish tender: ${tenderId}`);

        const { contract, gateway, client } = await getContract();

        try {
            console.log(`[Fabric] Submitting transaction...`);
            await contract.submitTransaction('PublishTender', tenderId, title, budget, deadline, docHash);
            
            res.status(201).json({ 
                success: true, 
                message: `Tender ${tenderId} successfully committed to the blockchain.` 
            });
        } finally {
            gateway.close();
            client.close();
        }
    } catch (error) {
        console.error('Error submitting transaction:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Check if a Tender Exists (Reads from Ledger)
// app.get('/api/tenders/:id', async (req, res) => {
//     try {
//         const tenderId = req.params.id;
//         const { contract, gateway, client } = await getContract();

//         try {
//             const resultBytes = await contract.evaluateTransaction('TenderExists', tenderId);
//             const resultString = new TextDecoder().decode(resultBytes);
            
//             res.status(200).json({ 
//                 success: true, 
//                 exists: resultString === 'true' 
//             });
//         } finally {
//             gateway.close();
//             client.close();
//         }
//     } catch (error) {
//         console.error('Error evaluating transaction:', error);
//         res.status(500).json({ success: false, error: error.message });
//     }
// });

// 2. Get Full Tender Details (Reads from Ledger)
app.get('/api/tenders/:id', async (req, res) => {
    try {
        const tenderId = req.params.id;
        const { contract, gateway, client } = await getContract();

        try {
            const resultBytes = await contract.evaluateTransaction('GetTender', tenderId);
            const resultString = new TextDecoder().decode(resultBytes);
            
            res.status(200).json({ success: true, tender: JSON.parse(resultString) });
        } finally {
            gateway.close();
            client.close();
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Tender not found or error reading ledger." });
    }
});

// 3. Submit a Bid (Writes to Ledger)
app.post('/api/bids', verifyRole('vendor'), async (req, res) => {
        try {
        const { bidId, tenderId, vendorId, bidAmount, docHash } = req.body;
        const timestamp = new Date().toISOString();
        console.log(`[API] Received bid ${bidId} for tender ${tenderId}`);

        const { contract, gateway, client } = await getContract();

        try {
            // We pass the numbers as strings because Fabric arguments must be strings
            await contract.submitTransaction('SubmitBid', bidId, tenderId, vendorId, bidAmount.toString(), docHash, timestamp);
            
            res.status(201).json({ 
                success: true, 
                message: `Bid ${bidId} successfully submitted for Tender ${tenderId}.` 
            });
        } finally {
            gateway.close();
            client.close();
        }
    } catch (error) {
        console.error('Error submitting bid:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Get all Bids for a Tender (Reads from Ledger via CouchDB)
app.get('/api/tenders/:id/bids', async (req, res) => {
    try {
        const tenderId = req.params.id;
        const { contract, gateway, client } = await getContract();

        try {
            const resultBytes = await contract.evaluateTransaction('GetBidsForTender', tenderId);
            const resultString = new TextDecoder().decode(resultBytes);
            
            // Handle empty results cleanly
            const bids = resultString ? JSON.parse(resultString) : [];
            
            res.status(200).json({ success: true, count: bids.length, bids: bids });
        } finally {
            gateway.close();
            client.close();
        }
    } catch (error) {
        console.error('Error fetching bids:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 5. Evaluate Bids and Award Contract (Writes to Ledger)
app.post('/api/tenders/:id/evaluate', verifyRole('admin'), async (req, res) => {
        try {
        const tenderId = req.params.id;
        console.log(`[API] Triggering smart contract evaluation for: ${tenderId}`);

        const { contract, gateway, client } = await getContract();

        try {
            await contract.submitTransaction('EvaluateBids', tenderId);
            
            res.status(200).json({ 
                success: true, 
                message: `Smart Contract successfully evaluated and awarded Tender ${tenderId}.` 
            });
        } finally {
            gateway.close();
            client.close();
        }
    } catch (error) {
        console.error('Error evaluating tender:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 6. Get All Tenders (Reads from Ledger)
app.get('/api/tenders', async (req, res) => {
    try {
        console.log(`[API] Fetching all active tenders from the ledger...`);
        const { contract, gateway, client } = await getContract();

        try {
            const resultBytes = await contract.evaluateTransaction('GetAllTenders');
            const resultString = new TextDecoder().decode(resultBytes);
            
            // Handle cases where the ledger might be completely empty
            const tenders = resultString ? JSON.parse(resultString) : [];
            
            res.status(200).json({ 
                success: true, 
                count: tenders.length, 
                tenders: tenders 
            });
        } finally {
            gateway.close();
            client.close();
        }
    } catch (error) {
        console.error('Error fetching all tenders:', error);
        res.status(500).json({ success: false, error: "Failed to read from the blockchain ledger." });
    }
});

// --- Start the Server ---
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`✅ BTMS Backend API is running on http://localhost:${PORT}`);
});