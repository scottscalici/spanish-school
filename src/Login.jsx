// src/Login.jsx
import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase'; 

const Login = ({ isEnglish }) => {
  // State to manage which form is showing: 'login', 'register', or 'reset'
  const [view, setView] = useState('login'); 
  
  // Form input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Feedback states
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null); 

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      if (view === 'login') {
        // --- LOGIN FLOW ---
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Logged in user:", userCredential.user.email);
        alert(isEnglish ? "Access granted! Welcome." : "¡Acceso concedido! Welcome to the Gym.");
        
      } else if (view === 'register') {
        // --- REGISTRATION FLOW ---
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Immediately create a document in Firestore to assign the "student" role
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          role: 'student', 
          createdAt: new Date().toISOString()
        });

        console.log("New user registered and role assigned:", user.email);
        alert(isEnglish ? "Account created! You are officially enrolled." : "¡Cuenta creada! You are officially enrolled.");
        
      } else if (view === 'reset') {
        // --- PASSWORD RESET FLOW ---
        await sendPasswordResetEmail(auth, email);
        setMessage(isEnglish ? "Check your email! We sent a password reset link." : "¡Revisa tu correo! We sent a password reset link to your email.");
      }
    } catch (err) {
      console.error(err);
      // Bilingual error messages
      if (err.code === 'auth/email-already-in-use') {
        setError(isEnglish ? "That email is already registered. Please log in or reset your password." : "Ese correo ya está registrado. Por favor, inicia sesión o recupera tu contraseña.");
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError(isEnglish ? "Incorrect credentials." : "Credenciales incorrectas.");
      } else if (err.code === 'auth/weak-password') {
        setError(isEnglish ? "Password must be at least 6 characters." : "La contraseña debe tener al menos 6 caracteres.");
      } else {
        setError(isEnglish ? "There was an error. Please try again." : "Hubo un error. Please try again.");
      }
    }
  };

  const switchView = (newView) => {
    setView(newView);
    setError(null);
    setMessage(null);
    setPassword(''); 
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', fontFamily: 'sans-serif', border: '2px solid #ccc', borderRadius: '10px', backgroundColor: 'white' }}>
      
      {/* Dynamic Header */}
      <h2 style={{ textAlign: 'center', color: '#333' }}>
        {view === 'login' && (isEnglish ? 'Student Login 🔑' : 'Acceso Estudiante 🔑')}
        {view === 'register' && (isEnglish ? 'Create an Account 📝' : 'Crear Cuenta Nueva 📝')}
        {view === 'reset' && (isEnglish ? 'Reset Password 🔄' : 'Recuperar Contraseña 🔄')}
      </h2>
      
      <form onSubmit={handleAuthAction} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* Email Input */}
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Email</label>
          <input 
            type="email" 
            placeholder={isEnglish ? "student@school.edu" : "estudiante@escuela.edu"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
          />
        </div>

        {/* Password Input (Hidden on Reset View) */}
        {view !== 'reset' && (
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
              {isEnglish ? 'Password' : 'Contraseña'}
            </label>
            <input 
              type="password" 
              placeholder={view === 'register' ? (isEnglish ? "Minimum 6 characters" : "Mínimo 6 caracteres") : ""}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
            />
          </div>
        )}

        {/* Feedback Messages */}
        {error && <p style={{ color: 'red', fontSize: '14px', fontWeight: 'bold', margin: 0 }}>{error}</p>}
        {message && <p style={{ color: 'green', fontSize: '14px', fontWeight: 'bold', margin: 0 }}>{message}</p>}

        {/* Dynamic Submit Button */}
        <button 
          type="submit"
          style={{ backgroundColor: '#2c3e50', color: 'white', padding: '12px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '5px' }}
        >
          {view === 'login' && (isEnglish ? 'LOG IN ➔' : 'ENTRAR AL GIMNASIO ➔')}
          {view === 'register' && (isEnglish ? 'REGISTER ➔' : 'REGISTRARSE ➔')}
          {view === 'reset' && (isEnglish ? 'SEND LINK ➔' : 'ENVIAR ENLACE ➔')}
        </button>
      </form>

      {/* Navigation Links */}
      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {view === 'login' ? (
          <>
            <a href="#" onClick={(e) => { e.preventDefault(); switchView('register'); }} style={{ color: '#2980b9', textDecoration: 'none' }}>
              {isEnglish ? "Don't have an account? Register here." : "¿No tienes cuenta? Regístrate aquí."}
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); switchView('reset'); }} style={{ color: '#7f8c8d', textDecoration: 'none' }}>
              {isEnglish ? "Forgot your password?" : "¿Olvidaste tu contraseña?"}
            </a>
          </>
        ) : (
          <a href="#" onClick={(e) => { e.preventDefault(); switchView('login'); }} style={{ color: '#2980b9', textDecoration: 'none' }}>
            {isEnglish ? "Back to login" : "Volver al inicio de sesión"}
          </a>
        )}
      </div>

    </div>
  );
};

export default Login;