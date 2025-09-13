import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function MobileWallet() {
  const navigate = useNavigate();
  
  const [walletData] = useState({
    balance: 0.00,
    equity: 0.00,
    freeMargin: 0.00,
    marginLevel: 0.00
  });

  const handleBack = () => {
    navigate('/markets');
  };

  const handleDeposit = () => {
    navigate('/deposit');
  };

  const handleWithdraw = () => {
    navigate('/withdrawal');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1a1a1a', color: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#2d2d2d', padding: '15px 20px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #333' }}>
        <button style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '18px', marginRight: '15px', cursor: 'pointer' }} onClick={handleBack}>
          ←
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0' }}>Wallet</h1>
      </div>

      {/* Content */}
      <div style={{ padding: '20px', paddingBottom: '100px' }}>
        {/* Balance Card */}
        <div style={{ backgroundColor: '#2d2d2d', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid #333' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <span style={{ color: '#cccccc', fontSize: '14px' }}>Account Balance</span>
            <span style={{ color: '#4CAF50', fontSize: '24px', fontWeight: 'bold' }}>${walletData.balance.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <span style={{ color: '#cccccc', fontSize: '14px' }}>Equity</span>
            <span style={{ color: '#ffffff', fontSize: '16px', fontWeight: 'bold' }}>${walletData.equity.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <span style={{ color: '#cccccc', fontSize: '14px' }}>Free Margin</span>
            <span style={{ color: '#ffffff', fontSize: '16px', fontWeight: 'bold' }}>${walletData.freeMargin.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#cccccc', fontSize: '14px' }}>Margin Level</span>
            <span style={{ color: '#ffffff', fontSize: '16px', fontWeight: 'bold' }}>{walletData.marginLevel}%</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
          <button style={{ flex: 1, backgroundColor: '#4CAF50', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '15px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }} onClick={handleDeposit}>
            Deposit
          </button>
          <button style={{ flex: 1, backgroundColor: '#f44336', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '15px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }} onClick={handleWithdraw}>
            Withdraw
          </button>
        </div>

        {/* Quick Actions */}
        <div style={{ marginTop: '30px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#ffffff' }}>Quick Actions</h2>
          
          <div style={{ backgroundColor: '#2d2d2d', borderRadius: '8px', padding: '15px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #333', cursor: 'pointer' }} onClick={() => navigate('/trade-history')}>
            <span style={{ color: '#ffffff', fontSize: '16px' }}>Trade History</span>
            <span style={{ color: '#cccccc', fontSize: '18px' }}>→</span>
          </div>

          <div style={{ backgroundColor: '#2d2d2d', borderRadius: '8px', padding: '15px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #333', cursor: 'pointer' }} onClick={() => navigate('/open-orders')}>
            <span style={{ color: '#ffffff', fontSize: '16px' }}>Open Orders</span>
            <span style={{ color: '#cccccc', fontSize: '18px' }}>→</span>
          </div>

          <div style={{ backgroundColor: '#2d2d2d', borderRadius: '8px', padding: '15px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #333', cursor: 'pointer' }} onClick={() => navigate('/pending-orders')}>
            <span style={{ color: '#ffffff', fontSize: '16px' }}>Pending Orders</span>
            <span style={{ color: '#cccccc', fontSize: '18px' }}>→</span>
          </div>

          <div style={{ backgroundColor: '#2d2d2d', borderRadius: '8px', padding: '15px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #333', cursor: 'pointer' }} onClick={() => navigate('/account-settings')}>
            <span style={{ color: '#ffffff', fontSize: '16px' }}>Account Settings</span>
            <span style={{ color: '#cccccc', fontSize: '18px' }}>→</span>
          </div>
        </div>
      </div>
    </div>
  );
}