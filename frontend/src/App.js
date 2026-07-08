import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const translations = {
  en: {
    title: "BTMS: Blockchain Tender Management",
    subtitle: "Shahjalal University of Science & Technology",
    loginTitle: "Select Your Role to Continue",
    roleAdmin: "Procuring Entity (Admin)",
    roleVendor: "Registered Vendor",
    logout: "Logout",
    tabPublish: "Publish Tender",
    tabBid: "Submit Bid",
    tabEvaluate: "Evaluate & Award",
    tabView: "View Tenders",
    tenderId: "Tender ID",
    tenderTitle: "Tender Title",
    budget: "Budget (BDT)",
    deadline: "Deadline",
    uploadDoc: "Upload Document (PDF/Doc)",
    vendorId: "Vendor ID",
    bidAmount: "Bid Amount (BDT)",
    submitPublish: "Publish to Blockchain",
    submitBid: "Secure Bid on Ledger",
    submitEvaluate: "Trigger Smart Contract Evaluation",
    success: "Transaction Successful!",
    error: "Transaction Failed.",
    tableStatus: "Status",
    tableWinner: "Winner",
    refresh: "Refresh Data"
  },
  bn: {
    title: "BTMS: ব্লকচেইন টেন্ডার ম্যানেজমেন্ট",
    subtitle: "শাহজালাল বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়",
    loginTitle: "অবিরত রাখতে আপনার ভূমিকা নির্বাচন করুন",
    roleAdmin: "ক্রয়কারী সত্তা (অ্যাডমিন)",
    roleVendor: "নিবন্ধিত ভেন্ডর",
    logout: "লগআউট",
    tabPublish: "টেন্ডার প্রকাশ করুন",
    tabBid: "বিড জমা দিন",
    tabEvaluate: "মূল্যায়ন এবং পুরস্কার",
    tabView: "টেন্ডার তালিকা",
    tenderId: "টেন্ডার আইডি",
    tenderTitle: "টেন্ডারের শিরোনাম",
    budget: "বাজেট (BDT)",
    deadline: "শেষ তারিখ",
    uploadDoc: "ডকুমেন্ট আপলোড করুন (PDF/Doc)",
    vendorId: "ভেন্ডর আইডি",
    bidAmount: "বিডের পরিমাণ (BDT)",
    submitPublish: "ব্লকচেইনে প্রকাশ করুন",
    submitBid: "লেজারে বিড সুরক্ষিত করুন",
    submitEvaluate: "স্মার্ট কন্ট্রাক্ট মূল্যায়ন শুরু করুন",
    success: "লেনদেন সফল হয়েছে!",
    error: "লেনদেন ব্যর্থ হয়েছে।",
    tableStatus: "স্ট্যাটাস",
    tableWinner: "বিজয়ী",
    refresh: "ডেটা রিফ্রেশ করুন"
  }
};

function App() {
  const [lang, setLang] = useState('en');
  // NEW: Authentication State
  const [userRole, setUserRole] = useState(null); // 'admin' or 'vendor'
  // NEW: Registration & OTP State
  const [authView, setAuthView] = useState('login'); // Can be 'login', 'register', or 'otp'
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [userStatus, setUserStatus] = useState(null); // Tracks if they are PENDING_DOCS
  const [complianceHash, setComplianceHash] = useState(''); // Holds the IPFS CID for their Trade License
  const [regForm, setRegForm] = useState({ companyName: '', email: '', password: '' });
  const [verifyEmail, setVerifyEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [activeTab, setActiveTab] = useState('view'); 
  const [status, setStatus] = useState({ message: '', isError: false });
  const [tenders, setTenders] = useState([]);

  const [tenderForm, setTenderForm] = useState({ tenderId: '', title: '', budget: '', deadline: '', docHash: '' });
  const [bidForm, setBidForm] = useState({ bidId: '', tenderId: '', vendorId: '', bidAmount: '', docHash: '' });
  const [evalForm, setEvalForm] = useState({ tenderId: '' });

  const t = translations[lang];

  // NEW: Registration Functions
  const handleRegister = async (e) => {
    e.preventDefault();
    setStatus({ message: 'Registering and sending OTP to your email...', isError: false });
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', regForm);
      setVerifyEmail(regForm.email); // Save the email so we know who to verify
      setAuthView('otp');            // Switch the screen to the OTP view
      setStatus({ message: res.data.message, isError: false });
    } catch (err) {
      setStatus({ message: err.response?.data?.message || err.message, isError: true });
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setStatus({ message: 'Verifying OTP...', isError: false });
    try {
      const res = await axios.post('http://localhost:5000/api/auth/verify-email', { email: verifyEmail, otp: otpCode });
      setAuthView('login');          // Send them back to login once verified
      setStatus({ message: res.data.message, isError: false });
    } catch (err) {
      setStatus({ message: err.response?.data?.message || err.message, isError: true });
    }
  };

  // LOGIN LOGIC (Unified for Admins and Vendors)
  const handleServerLogin = async (e) => {
    e.preventDefault();
    setStatus({ message: 'Authenticating...', isError: false });

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', loginForm);
      
      localStorage.setItem('btms_token', res.data.token);
      setUserRole(res.data.role);
      setUserStatus(res.data.status); 
      setActiveTab('view');
      setStatus({ message: '' });
    } catch (err) {
      setStatus({ message: err.response?.data?.message || err.message, isError: true });
    }
  };

  // COMPLIANCE SUBMISSION LOGIC
  const handleSubmitCompliance = async (e) => {
    e.preventDefault();
    if (!complianceHash) return setStatus({ message: "Please upload your Trade License to IPFS.", isError: true });
    
    setStatus({ message: 'Locking compliance document to profile...', isError: false });
    const token = localStorage.getItem('btms_token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      const res = await axios.post('http://localhost:5000/api/auth/compliance', { docHash: complianceHash }, config);
      setUserStatus('FULLY_VERIFIED'); // Unlocks the UI!
      setStatus({ message: res.data.message, isError: false });
    } catch (err) {
      setStatus({ message: err.response?.data?.message || err.message, isError: true });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('btms_token');
    setUserRole(null);
    setStatus({message:''});
  };  

  // IPFS Web3 File Upload Function
  const handleFileUpload = async (e, formType) => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus({ message: 'Uploading document to global IPFS network...', isError: false });
    const formData = new FormData();
    formData.append('file', file);
    const pinataOptions = JSON.stringify({ cidVersion: 0 });
    formData.append('pinataOptions', pinataOptions);

    try {
      const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        maxBodyLength: "Infinity",
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          'pinata_api_key': process.env.REACT_APP_PINATA_API_KEY,
          'pinata_secret_api_key': process.env.REACT_APP_PINATA_SECRET_API_KEY,
        }
      });
      const ipfsCID = res.data.IpfsHash; 
      if (formType === 'tender') setTenderForm({ ...tenderForm, docHash: ipfsCID });
      else if (formType === 'bid') setBidForm({ ...bidForm, docHash: ipfsCID });
      else if (formType === 'compliance') {
        setComplianceHash(ipfsCID);
      }
      setStatus({ message: `Secured on IPFS! CID: ${ipfsCID.substring(0, 15)}...`, isError: false });
    } catch (error) {
      console.error("IPFS Upload Error:", error);
      setStatus({ message: "Failed to upload to IPFS. Check your Pinata API keys.", isError: true });
    }
  };

  const fetchTenders = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/tenders');
      if (res.data.success) setTenders(res.data.tenders);
    } catch (err) {
      console.error("Failed to load tenders", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'view' && userRole) fetchTenders();
  }, [activeTab, userRole]);

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!tenderForm.docHash) return setStatus({ message: "Please upload a document.", isError: true });
    setStatus({ message: 'Processing on ledger...', isError: false });
    const token = localStorage.getItem('btms_token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      const res = await axios.post('http://localhost:5000/api/tenders', tenderForm, config);
      setStatus({ message: `${t.success} ${res.data.message}`, isError: false });
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setStatus({ message: `${t.error} ${errorMsg}`, isError: true });
    }
  };

  const handleBid = async (e) => {
    e.preventDefault();
    if (!bidForm.docHash) return setStatus({ message: "Please upload your bid document.", isError: true });
    setStatus({ message: 'Processing on ledger...', isError: false });
    const token = localStorage.getItem('btms_token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      const res = await axios.post('http://localhost:5000/api/bids', bidForm, config);
      setStatus({ message: `${t.success} ${res.data.message}`, isError: false });
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setStatus({ message: `${t.error} ${errorMsg}`, isError: true });
    }
  };

  const handleEvaluate = async (e) => {
    e.preventDefault();
    setStatus({ message: 'Smart Contract executing...', isError: false });
    const token = localStorage.getItem('btms_token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      const res = await axios.post(`http://localhost:5000/api/tenders/${evalForm.tenderId}/evaluate`, {}, config);
      const tenderRes = await axios.get(`http://localhost:5000/api/tenders/${evalForm.tenderId}`, config);
      setStatus({ message: `${t.success} ${res.data.message} Winner: ${tenderRes.data.tender.winnerId}`, isError: false });
    } catch (err) {
      setStatus({ message: `${t.error} ${err.message}`, isError: true });
    }
  };

  // SECURED DYNAMIC AUTHENTICATION SCREEN
  if (!userRole) {
    return (
      <div style={{ padding: '60px 40px', fontFamily: 'Arial, sans-serif', maxWidth: '500px', margin: 'auto', textAlign: 'center', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px', marginTop: '50px' }}>
        <h2 style={{ color: '#0056b3', marginBottom: '5px' }}>{t.title}</h2>
        <p style={{ color: 'gray', marginBottom: '20px' }}>Security & Authentication Portal</p>

        {status.message && (
          <div style={{ marginBottom: '20px', padding: '10px', background: status.isError ? '#f8d7da' : '#d4edda', color: status.isError ? '#721c24' : '#155724', borderRadius: '5px', fontSize: '14px' }}>
            {status.message}
          </div>
        )}

        {/* VIEW 1: UNIFIED LOGIN FORM */}
        {authView === 'login' && (
          <form onSubmit={handleServerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', marginTop: '20px' }}>
            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Email Address</label>
            <input type="email" required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
            
            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Password</label>
            <input type="password" required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            
            <button type="submit" style={{ padding: '15px', background: '#17a2b8', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '5px' }}>Login</button>

            <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px' }}>
              New Vendor? <span style={{ color: '#0056b3', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }} onClick={() => { setAuthView('register'); setStatus({message:''}); }}>Register Here</span>
            </p>
          </form>
        )}

        {/* VIEW 2: REGISTRATION */}
        {authView === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Vendor Registration</h3>
            
            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Company Name</label>
            <input required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} onChange={e => setRegForm({...regForm, companyName: e.target.value})} />
            
            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Email Address</label>
            <input type="email" required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} onChange={e => setRegForm({...regForm, email: e.target.value})} />
            
            <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Password</label>
            <input type="password" required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} onChange={e => setRegForm({...regForm, password: e.target.value})} />
            
            <button type="submit" style={{ padding: '15px', background: '#17a2b8', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '5px', marginTop: '10px' }}>Register & Get OTP</button>
            
            <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px' }}>
              Already registered? <span style={{ color: '#0056b3', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }} onClick={() => { setAuthView('login'); setStatus({message:''}); }}>Back to Login</span>
            </p>
          </form>
        )}

        {/* VIEW 3: OTP VERIFICATION */}
        {authView === 'otp' && (
          <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'center' }}>
            <h3>Verify Your Identity</h3>
            <p style={{ color: 'gray', fontSize: '14px', marginBottom: '10px' }}>We sent a 6-digit verification code to<br/><b>{verifyEmail}</b></p>
            
            <input required maxLength="6" placeholder="000000" style={{ padding: '15px', fontSize: '24px', textAlign: 'center', letterSpacing: '8px', border: '2px solid #17a2b8', borderRadius: '5px', fontWeight: 'bold' }} onChange={e => setOtpCode(e.target.value)} />
            
            <button type="submit" style={{ padding: '15px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '5px', marginTop: '10px' }}>Verify Account</button>
          </form>
        )}
      </div>
    );
  }

  // MAIN DASHBOARD RENDER
  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: 'auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>{t.title}</h2>
          <h4 style={{ color: 'gray', marginTop: '-10px' }}>{t.subtitle}</h4>
          <p style={{ fontWeight: 'bold', color: userRole === 'admin' ? '#28a745' : '#17a2b8' }}>
            Logged in as: {userRole === 'admin' ? t.roleAdmin : t.roleVendor}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => setLang(lang === 'en' ? 'bn' : 'en')} style={{ padding: '8px', cursor: 'pointer' }}>{lang === 'en' ? 'বাংলা' : 'English'}</button>
          <button onClick={handleLogout} style={{ padding: '8px', background: '#dc3545', color: 'white', border: 'none', cursor: 'pointer' }}>{t.logout}</button>
        </div>
      </div>

      {/* THE COMPLIANCE JAIL SCREEN */}
      {userRole === 'vendor' && userStatus === 'PENDING_DOCS' && (
        <div style={{ marginTop: '30px', padding: '30px', border: '2px dashed #dc3545', borderRadius: '8px', background: '#fff' }}>
          <h3 style={{ color: '#dc3545', marginTop: 0 }}>⚠️ Action Required: Mandatory Documents</h3>
          <p>Your email is verified, but you must securely upload your Company Trade License before you can view or bid on tenders.</p>
          
          <form onSubmit={handleSubmitCompliance} style={{ marginTop: '20px' }}>
            <div style={{ padding: '15px', border: '1px solid #ccc', background: '#f9f9f9', marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Upload Valid Trade License (PDF/JPG):</label>
              <input type="file" onChange={(e) => handleFileUpload(e, 'compliance')} required />
              {complianceHash && <div style={{ color: 'green', marginTop: '10px', fontWeight: 'bold' }}>✓ Secured on IPFS: {complianceHash.substring(0,20)}...</div>}
            </div>
            <button type="submit" style={{ padding: '15px 25px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '5px' }}>Submit & Unlock Account</button>
          </form>
        </div>
      )}
      
      <hr style={{ margin: '20px 0' }}/>

      {/* Tabs - Conditionally Rendered based on Role */}
      {/* Show the dashboard ONLY if fully verified */}
      {userStatus === 'FULLY_VERIFIED' && (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button onClick={() => {setActiveTab('view'); setStatus({message:''})}} style={{ padding: '10px', flex: 1, background: activeTab === 'view' ? '#0056b3' : '#ccc', color: activeTab === 'view' ? '#fff' : '#000', cursor: 'pointer' }}>{t.tabView}</button>
            
            {userRole === 'admin' && (
              <>
                <button onClick={() => {setActiveTab('publish'); setStatus({message:''})}} style={{ padding: '10px', flex: 1, background: activeTab === 'publish' ? '#0056b3' : '#ccc', color: activeTab === 'publish' ? '#fff' : '#000', cursor: 'pointer' }}>{t.tabPublish}</button>
                <button onClick={() => {setActiveTab('evaluate'); setStatus({message:''})}} style={{ padding: '10px', flex: 1, background: activeTab === 'evaluate' ? '#0056b3' : '#ccc', color: activeTab === 'evaluate' ? '#fff' : '#000', cursor: 'pointer' }}>{t.tabEvaluate}</button>
              </>
            )}

            {userRole === 'vendor' && (
              <button onClick={() => {setActiveTab('bid'); setStatus({message:''})}} style={{ padding: '10px', flex: 1, background: activeTab === 'bid' ? '#0056b3' : '#ccc', color: activeTab === 'bid' ? '#fff' : '#000', cursor: 'pointer' }}>{t.tabBid}</button>
            )}
          </div>

          {activeTab === 'view' && (
            <div>
              <button onClick={fetchTenders} style={{ padding: '8px 15px', marginBottom: '15px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}>↻ {t.refresh}</button>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>{t.tenderId}</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>{t.tenderTitle}</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>{t.tableStatus}</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>{t.tableWinner}</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Document</th>
                  </tr>
                </thead>
                <tbody>
                  {tenders.map((tender, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px' }}>{tender.tenderId}</td>
                      <td style={{ padding: '12px' }}>{tender.title}</td>
                      <td style={{ padding: '12px' }}><span style={{ padding: '4px 8px', borderRadius: '4px', background: tender.status === 'Awarded' ? '#d4edda' : '#fff3cd', color: tender.status === 'Awarded' ? '#155724' : '#856404', fontSize: '14px', fontWeight: 'bold' }}>{tender.status}</span></td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#0056b3' }}>{tender.winnerId || '-'}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <a href={`https://gateway.pinata.cloud/ipfs/${tender.docHash}`} target="_blank" rel="noopener noreferrer" style={{ background: '#6c757d', color: 'white', padding: '5px 10px', textDecoration: 'none', borderRadius: '4px', fontSize: '12px' }}>View PDF</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'publish' && userRole === 'admin' && (
            <form onSubmit={handlePublish} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input placeholder={t.tenderId} onChange={e => setTenderForm({...tenderForm, tenderId: e.target.value})} required style={{ padding: '10px' }} />
              <input placeholder={t.tenderTitle} onChange={e => setTenderForm({...tenderForm, title: e.target.value})} required style={{ padding: '10px' }} />
              <input type="number" placeholder={t.budget} onChange={e => setTenderForm({...tenderForm, budget: e.target.value})} required style={{ padding: '10px' }} />
              <input type="date" onChange={e => setTenderForm({...tenderForm, deadline: e.target.value})} required style={{ padding: '10px' }} />
              <div style={{ padding: '10px', border: '1px solid #ccc', background: '#f9f9f9' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t.uploadDoc}:</label>
                <input type="file" onChange={(e) => handleFileUpload(e, 'tender')} required />
                {tenderForm.docHash && <div style={{ fontSize: '12px', color: 'green', marginTop: '5px' }}>Secured on IPFS</div>}
              </div>
              <button type="submit" style={{ padding: '15px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>{t.submitPublish}</button>
            </form>
          )}

          {activeTab === 'bid' && userRole === 'vendor' && (
            <form onSubmit={handleBid} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input placeholder="Bid ID (e.g. BID-001)" onChange={e => setBidForm({...bidForm, bidId: e.target.value})} required style={{ padding: '10px' }} />
              <input placeholder={t.tenderId} onChange={e => setBidForm({...bidForm, tenderId: e.target.value})} required style={{ padding: '10px' }} />
              <input placeholder={t.vendorId} onChange={e => setBidForm({...bidForm, vendorId: e.target.value})} required style={{ padding: '10px' }} />
              <input type="number" placeholder={t.bidAmount} onChange={e => setBidForm({...bidForm, bidAmount: e.target.value})} required style={{ padding: '10px' }} />
              <div style={{ padding: '10px', border: '1px solid #ccc', background: '#f9f9f9' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t.uploadDoc}:</label>
                <input type="file" onChange={(e) => handleFileUpload(e, 'bid')} required />
                {bidForm.docHash && <div style={{ fontSize: '12px', color: 'green', marginTop: '5px' }}>Secured on IPFS</div>}
              </div>
              <button type="submit" style={{ padding: '15px', background: '#17a2b8', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>{t.submitBid}</button>
            </form>
          )}

          {activeTab === 'evaluate' && userRole === 'admin' && (
            <form onSubmit={handleEvaluate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input placeholder={t.tenderId} onChange={e => setEvalForm({tenderId: e.target.value})} required style={{ padding: '10px' }} />
              <button type="submit" style={{ padding: '15px', background: '#dc3545', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>{t.submitEvaluate}</button>
            </form>
          )}
      </>
      )}

      {status.message && (
        <div style={{ marginTop: '20px', padding: '15px', background: status.isError ? '#f8d7da' : '#d4edda', color: status.isError ? '#721c24' : '#155724', borderRadius: '5px' }}>
          {status.message}
        </div>
      )}
    </div>
  );
}

export default App;