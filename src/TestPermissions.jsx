// src/TestPermissions.jsx
import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const TestPermissions = () => {
  const [result, setResult] = useState('Waiting for test...');

  const testStudentWrite = async () => {
    try {
      // Attempting to write to the open 'studentData' folder
      await setDoc(doc(db, 'studentData', 'testDoc'), {
        timestamp: new Date().toISOString(),
        message: 'This should work for ANY logged-in user.'
      });
      setResult('✅ SUCCESS: Wrote to /studentData. Your rules allowed this!');
    } catch (error) {
      setResult('❌ FAILED: Could not write to /studentData. Error: ' + error.message);
    }
  };

  const testAdminWrite = async () => {
    try {
      // Attempting to write to a locked folder
      await setDoc(doc(db, 'curriculum', 'testDoc'), {
        timestamp: new Date().toISOString(),
        message: 'This should ONLY work for an Admin.'
      });
      setResult('👑 SUCCESS: Wrote to /curriculum. You have Admin privileges!');
    } catch (error) {
      // If a student clicks this, Firebase will throw an error, which we catch here
      setResult('⛔ BLOCKED: Could not write to /curriculum. (Expected if you are a student!)');
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '20px auto', padding: '20px', border: '2px dashed #e67e22', borderRadius: '8px', fontFamily: 'sans-serif' }}>
      <h3 style={{ marginTop: 0 }}>Security Rules Tester 🕵️‍♂️</h3>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button 
          onClick={testStudentWrite} 
          style={{ padding: '10px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Test Student Write
        </button>
        <button 
          onClick={testAdminWrite} 
          style={{ padding: '10px', backgroundColor: '#c0392b', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Test Admin Write
        </button>
      </div>

      <div style={{ padding: '10px', backgroundColor: '#f1f2f6', borderRadius: '5px' }}>
        <strong>Result:</strong> {result}
      </div>
    </div>
  );
};

export default TestPermissions;