// src/Login.jsx
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase'; // This connects to your specific database!

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault(); // Prevents the page from refreshing
    try {
      // This is the actual Firebase command to log a student in:
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in user:", userCredential.user.email);
      alert("¡Acceso concedido! Welcome to the Gym.");
    } catch (err) {
      setError("Credenciales incorrectas. Please check your email/password.");
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', fontFamily: 'sans-serif', border: '2px solid #ccc', borderRadius: '10px' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>Acceso Estudiante 🔑</h2>
      
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Email</label>
          <input 
            type="email" 
            placeholder="estudiante@gym.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Contraseña</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
          />
        </div>

        {error && <p style={{ color: 'red', fontSize: '14px', fontWeight: 'bold' }}>{error}</p>}

        <button 
          type="submit"
          style={{ backgroundColor: '#2c3e50', color: 'white', padding: '12px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '5px' }}
        >
          ENTRAR AL GIMNASIO ➔
        </button>
      </form>
    </div>
  );
};

export default Login;