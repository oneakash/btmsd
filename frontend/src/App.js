import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CryptoJS from 'crypto-js'; // NEW: Cryptography library
import './App.css';

const translations = {
  en: {
    title: "BTMS: Blockchain Tender Management",
    subtitle: "Shahjalal University of Science & Technology",
    tabPublish: "Publish Tender",
    tabBid: "Submit Bid",
    tabEvaluate: "Evaluate & Award",
    tabView: "View Tenders",
    tenderId: "Tender ID",
    tenderTitle: "Tender Title",
    budget: "Budget (BDT)",
    deadline: "Deadline",
    uploadDoc: "Upload Document (PDF/Doc)", // NEW
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
    tabPublish: "টেন্ডার প্রকাশ করুন",
    tabBid: "বিড জমা দিন",
    tabEvaluate: "মূল্যায়ন এবং পুরস্কার",
    tabView: "টেন্ডার তালিকা",
    tenderId: "টেন্ডার আইডি",
    tenderTitle: "টেন্ডারের শিরোনাম",
    budget: "বাজেট (BDT)",
    deadline: "শেষ তারিখ",
    uploadDoc: "ডকুমেন্ট আপলোড করুন (PDF/Doc)", // NEW
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
  const [activeTab, setActiveTab] = useState('publish'); 
  const [status, setStatus] = useState({ message: '', isError: false });
  const [tenders, setTenders] = useState([]);

  const [tenderForm, setTenderForm] = useState({ tenderId: '', title: '', budget: '', deadline: '', docHash: '' });
  const [bidForm, setBidForm] = useState({ bidId: '', tenderId: '', vendorId: '', bidAmount: '', docHash: '' });
  const [evalForm, setEvalForm] = useState({ tenderId: '' });

  const t = translations[lang];

  // NEW: Cryptographic File Hashing Function
  const handleFileUpload = (e, formType) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus({ message: 'Calculating cryptographic hash...', isError: false });

    const reader = new FileReader();
    reader.onload = (event) => {
      // 1. Read the file into memory as an ArrayBuffer
      const arrayBuffer = event.target.result;
      // 2. Convert to a format CryptoJS understands
      const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
      // 3. Calculate the mathematical SHA-256 hash
      const hash = CryptoJS.SHA256(wordArray).toString(CryptoJS.enc.Hex);

      // 4. Update the forms with the calculated hash
      if (formType === 'tender') {
        setTenderForm({ ...tenderForm, docHash: hash });
      } else if (formType === 'bid') {
        setBidForm({ ...bidForm, docHash: hash });
      }
      
      setStatus({ message: `Hash generated successfully: ${hash.substring(0, 15)}...`, isError: false });
    };
    reader.readAsArrayBuffer(file);
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
    if (activeTab === 'view') fetchTenders();
  }, [activeTab]);

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!tenderForm.docHash) {
      setStatus({ message: "Error: Please upload a document to generate a hash.", isError: true });
      return;
    }
    setStatus({ message: 'Processing on ledger...', isError: false });
    try {
      const res = await axios.post('http://localhost:5000/api/tenders', tenderForm);
      setStatus({ message: `${t.success} ${res.data.message}`, isError: false });
    } catch (err) {
      setStatus({ message: `${t.error} ${err.message}`, isError: true });
    }
  };

  const handleBid = async (e) => {
    e.preventDefault();
    if (!bidForm.docHash) {
      setStatus({ message: "Error: Please upload your bid document to generate a hash.", isError: true });
      return;
    }
    setStatus({ message: 'Processing on ledger...', isError: false });
    try {
      const res = await axios.post('http://localhost:5000/api/bids', bidForm);
      setStatus({ message: `${t.success} ${res.data.message}`, isError: false });
    } catch (err) {
      setStatus({ message: `${t.error} ${err.message}`, isError: true });
    }
  };

  const handleEvaluate = async (e) => {
    e.preventDefault();
    setStatus({ message: 'Smart Contract executing...', isError: false });
    try {
      const res = await axios.post(`http://localhost:5000/api/tenders/${evalForm.tenderId}/evaluate`);
      const tenderRes = await axios.get(`http://localhost:5000/api/tenders/${evalForm.tenderId}`);
      const winner = tenderRes.data.tender.winnerId;
      setStatus({ message: `${t.success} ${res.data.message} Winner: ${winner}`, isError: false });
    } catch (err) {
      setStatus({ message: `${t.error} ${err.message}`, isError: true });
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: 'auto' }}>
      
      <button onClick={() => setLang(lang === 'en' ? 'bn' : 'en')} style={{ float: 'right', padding: '8px', cursor: 'pointer' }}>
        {lang === 'en' ? 'বাংলা' : 'English'}
      </button>

      <h2>{t.title}</h2>
      <h4 style={{ color: 'gray', marginTop: '-10px' }}>{t.subtitle}</h4>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={() => {setActiveTab('view'); setStatus({message:''})}} style={{ padding: '10px', flex: 1, background: activeTab === 'view' ? '#0056b3' : '#ccc', color: activeTab === 'view' ? '#fff' : '#000', cursor: 'pointer', minWidth: '120px' }}>{t.tabView}</button>
        <button onClick={() => {setActiveTab('publish'); setStatus({message:''})}} style={{ padding: '10px', flex: 1, background: activeTab === 'publish' ? '#0056b3' : '#ccc', color: activeTab === 'publish' ? '#fff' : '#000', cursor: 'pointer', minWidth: '120px' }}>{t.tabPublish}</button>
        <button onClick={() => {setActiveTab('bid'); setStatus({message:''})}} style={{ padding: '10px', flex: 1, background: activeTab === 'bid' ? '#0056b3' : '#ccc', color: activeTab === 'bid' ? '#fff' : '#000', cursor: 'pointer', minWidth: '120px' }}>{t.tabBid}</button>
        <button onClick={() => {setActiveTab('evaluate'); setStatus({message:''})}} style={{ padding: '10px', flex: 1, background: activeTab === 'evaluate' ? '#0056b3' : '#ccc', color: activeTab === 'evaluate' ? '#fff' : '#000', cursor: 'pointer', minWidth: '120px' }}>{t.tabEvaluate}</button>
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
              </tr>
            </thead>
            <tbody>
              {tenders.map((tender, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px' }}>{tender.tenderId}</td>
                  <td style={{ padding: '12px' }}>{tender.title}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', background: tender.status === 'Awarded' ? '#d4edda' : '#fff3cd', color: tender.status === 'Awarded' ? '#155724' : '#856404', fontSize: '14px', fontWeight: 'bold' }}>{tender.status}</span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#0056b3' }}>{tender.winnerId || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'publish' && (
        <form onSubmit={handlePublish} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input placeholder={t.tenderId} onChange={e => setTenderForm({...tenderForm, tenderId: e.target.value})} required style={{ padding: '10px' }} />
          <input placeholder={t.tenderTitle} onChange={e => setTenderForm({...tenderForm, title: e.target.value})} required style={{ padding: '10px' }} />
          <input type="number" placeholder={t.budget} onChange={e => setTenderForm({...tenderForm, budget: e.target.value})} required style={{ padding: '10px' }} />
          <input type="date" onChange={e => setTenderForm({...tenderForm, deadline: e.target.value})} required style={{ padding: '10px' }} />
          
          {/* NEW: File Input for Hashing */}
          <div style={{ padding: '10px', border: '1px solid #ccc', background: '#f9f9f9' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t.uploadDoc}:</label>
            <input type="file" onChange={(e) => handleFileUpload(e, 'tender')} required />
            {tenderForm.docHash && <div style={{ fontSize: '12px', color: 'green', marginTop: '5px' }}>Hash Locked: {tenderForm.docHash.substring(0, 20)}...</div>}
          </div>

          <button type="submit" style={{ padding: '15px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>{t.submitPublish}</button>
        </form>
      )}

      {activeTab === 'bid' && (
        <form onSubmit={handleBid} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input placeholder="Bid ID (e.g. BID-001)" onChange={e => setBidForm({...bidForm, bidId: e.target.value})} required style={{ padding: '10px' }} />
          <input placeholder={t.tenderId} onChange={e => setBidForm({...bidForm, tenderId: e.target.value})} required style={{ padding: '10px' }} />
          <input placeholder={t.vendorId} onChange={e => setBidForm({...bidForm, vendorId: e.target.value})} required style={{ padding: '10px' }} />
          <input type="number" placeholder={t.bidAmount} onChange={e => setBidForm({...bidForm, bidAmount: e.target.value})} required style={{ padding: '10px' }} />
          
          {/* NEW: File Input for Hashing */}
          <div style={{ padding: '10px', border: '1px solid #ccc', background: '#f9f9f9' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{t.uploadDoc}:</label>
            <input type="file" onChange={(e) => handleFileUpload(e, 'bid')} required />
            {bidForm.docHash && <div style={{ fontSize: '12px', color: 'green', marginTop: '5px' }}>Hash Locked: {bidForm.docHash.substring(0, 20)}...</div>}
          </div>

          <button type="submit" style={{ padding: '15px', background: '#17a2b8', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>{t.submitBid}</button>
        </form>
      )}

      {activeTab === 'evaluate' && (
        <form onSubmit={handleEvaluate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input placeholder={t.tenderId} onChange={e => setEvalForm({tenderId: e.target.value})} required style={{ padding: '10px' }} />
          <button type="submit" style={{ padding: '15px', background: '#dc3545', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>{t.submitEvaluate}</button>
        </form>
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