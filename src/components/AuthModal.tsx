'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { X, Lock, User, Mail, LogIn, UserPlus, KeyRound, Check } from 'lucide-react';

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (tab === 'login') {
      const res = await login(username, password);
      if (res.success) {
        closeAuthModal();
      } else {
        setErrorMsg(res.message || 'Login failed.');
      }
    } else {
      const res = await register(username, email, password);
      if (res.success) {
        closeAuthModal();
      } else {
        setErrorMsg(res.message || 'Registration failed.');
      }
    }
    setLoading(false);
  };

  const handleFillAdmin = () => {
    setUsername('admin');
    setPassword('admin123');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#242424] border border-zinc-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#e50914]/20 text-[#e50914] mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            {tab === 'login' ? 'Sign In to MetroMovies' : 'Create an Account'}
          </h2>
          <p className="text-xs text-zinc-400">
            {tab === 'login'
              ? 'Access your watchlist, watch history, and local backup'
              : 'Save and synchronize your streaming data locally'}
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-[#1a1a1a] p-1 rounded-xl">
          <button
            onClick={() => {
              setTab('login');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'login'
                ? 'bg-[#e50914] text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setTab('register');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'register'
                ? 'bg-[#e50914] text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Demo Credentials Box */}
        {tab === 'login' && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between text-xs text-amber-300">
            <div>
              <span className="font-bold">Default Admin:</span> <code className="bg-black/30 px-1 py-0.5 rounded">admin</code> / <code className="bg-black/30 px-1 py-0.5 rounded">admin123</code>
            </div>
            <button
              type="button"
              onClick={handleFillAdmin}
              className="px-2.5 py-1 rounded bg-[#e50914] text-white font-bold text-[11px] hover:bg-[#b20710] transition-colors"
            >
              Fill Admin
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300">Username</label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-[#1a1a1a] text-zinc-100 placeholder-zinc-500 text-sm rounded-xl pl-10 pr-4 py-2.5 border border-zinc-700/60 focus:outline-none focus:ring-1 focus:ring-[#e50914]"
              />
              <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {tab === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">Email (Optional)</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#1a1a1a] text-zinc-100 placeholder-zinc-500 text-sm rounded-xl pl-10 pr-4 py-2.5 border border-zinc-700/60 focus:outline-none focus:ring-1 focus:ring-[#e50914]"
                />
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1a1a1a] text-zinc-100 placeholder-zinc-500 text-sm rounded-xl pl-10 pr-4 py-2.5 border border-zinc-700/60 focus:outline-none focus:ring-1 focus:ring-[#e50914]"
              />
              <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#e50914] hover:bg-[#b20710] text-white font-bold text-sm shadow-lg shadow-[#e50914]/20 transition-all flex items-center justify-center gap-2 mt-2"
          >
            {tab === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                {loading ? 'Signing in...' : 'Sign In'}
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                {loading ? 'Creating account...' : 'Create Account'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
