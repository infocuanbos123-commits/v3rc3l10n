'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  User,
  Shield,
  Download,
  Upload,
  LogOut,
  Bookmark,
  Clock,
  Film,
  Check,
  AlertCircle,
  Database,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, logout, openAuthModal } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [watchlistCount, setWatchlistCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [successNotice, setSuccessNotice] = useState('');
  const [errorNotice, setErrorNotice] = useState('');

  useEffect(() => {
    try {
      const watchlist = JSON.parse(
        localStorage.getItem('metromovies_watchlist') ||
        localStorage.getItem('kisskh_watchlist') ||
        '{}'
      );
      setWatchlistCount(Object.keys(watchlist).length);
      const history = JSON.parse(
        localStorage.getItem('metromovies_history') ||
        localStorage.getItem('kisskh_history') ||
        '{}'
      );
      setHistoryCount(Object.keys(history).length);
    } catch {
      // Ignore
    }
  }, []);

  const handleExportBackup = () => {
    try {
      const backupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        user: user || null,
        watchlist: JSON.parse(
          localStorage.getItem('metromovies_watchlist') ||
          localStorage.getItem('kisskh_watchlist') ||
          '{}'
        ),
        history: JSON.parse(
          localStorage.getItem('metromovies_history') ||
          localStorage.getItem('kisskh_history') ||
          '{}'
        ),
        registeredUsers: JSON.parse(
          localStorage.getItem('metromovies_registered_users') ||
          localStorage.getItem('kisskh_registered_users') ||
          '{}'
        ),
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `metromovies-backup-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessNotice('Backup file downloaded successfully!');
      setTimeout(() => setSuccessNotice(''), 3000);
    } catch (err) {
      console.error(err);
      setErrorNotice('Failed to generate backup file.');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (parsed.watchlist) {
          localStorage.setItem('metromovies_watchlist', JSON.stringify(parsed.watchlist));
          setWatchlistCount(Object.keys(parsed.watchlist).length);
        }
        if (parsed.history) {
          localStorage.setItem('metromovies_history', JSON.stringify(parsed.history));
          setHistoryCount(Object.keys(parsed.history).length);
        }
        if (parsed.registeredUsers) {
          localStorage.setItem('metromovies_registered_users', JSON.stringify(parsed.registeredUsers));
        }

        setSuccessNotice('Backup restored successfully! All data has been synchronized.');
        setTimeout(() => setSuccessNotice(''), 4000);
      } catch (err) {
        console.error(err);
        setErrorNotice('Invalid backup file format.');
        setTimeout(() => setErrorNotice(''), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
          <User className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">Sign In Required</h1>
        <p className="text-sm text-zinc-400">
          Please sign in to view your profile and manage backup files.
        </p>
        <button
          onClick={openAuthModal}
          className="px-6 py-2.5 rounded-xl bg-[#e50914] text-white font-bold text-sm shadow-md"
        >
          Open Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Notifications */}
      {successNotice && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm p-4 rounded-xl flex items-center gap-2">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {errorNotice && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-400 text-sm p-4 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* User Card */}
      <div className="bg-[#242424] rounded-2xl p-6 sm:p-8 border border-white/5 shadow-xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="relative w-20 h-20 rounded-2xl bg-zinc-800 overflow-hidden border border-amber-500/30 flex-shrink-0" style={{ position: 'relative' }}>
            <Image
              src={user.avatar}
              alt={user.username}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl font-black text-white">{user.username}</h1>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                user.role === 'admin'
                  ? 'bg-amber-500/20 text-red-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {user.role}
              </span>
            </div>
            <p className="text-xs text-zinc-400">{user.email}</p>
            <p className="text-[11px] text-zinc-500 pt-1">
              Member since {new Date(user.joinedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            logout();
            router.push('/');
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-red-400 hover:text-red-300 text-xs font-bold transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-[#242424] rounded-2xl p-5 border border-white/5 space-y-1">
          <Bookmark className="w-5 h-5 text-red-500 mb-2" />
          <div className="text-2xl font-black text-white">{watchlistCount}</div>
          <div className="text-xs text-zinc-400">Saved in Watchlist</div>
        </div>

        <div className="bg-[#242424] rounded-2xl p-5 border border-white/5 space-y-1">
          <Clock className="w-5 h-5 text-emerald-500 mb-2" />
          <div className="text-2xl font-black text-white">{historyCount}</div>
          <div className="text-xs text-zinc-400">Episodes Watched</div>
        </div>

        <div className="bg-[#242424] rounded-2xl p-5 border border-white/5 space-y-1 col-span-2 sm:col-span-1">
          <Shield className="w-5 h-5 text-blue-500 mb-2" />
          <div className="text-2xl font-black text-white">Local Sync</div>
          <div className="text-xs text-zinc-400">Offline Backup Ready</div>
        </div>
      </div>

      {/* Local Backup & Data Migration Section */}
      <div className="bg-[#242424] rounded-2xl p-6 sm:p-8 border border-white/5 shadow-xl space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
          <Database className="w-6 h-6 text-[#e50914]" />
          <div>
            <h2 className="text-lg font-bold text-white">Local Backup &amp; Migration</h2>
            <p className="text-xs text-zinc-400">
              Download all your local watch history, watchlist, and user data as JSON to move to your other devices.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Export Backup Card */}
          <div className="bg-[#141414] p-5 rounded-xl border border-white/5 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-red-500" />
                Export Backup File
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Save your watchlist, bookmarks, and episode watch progress into a JSON backup file.
              </p>
            </div>
            <button
              onClick={handleExportBackup}
              className="w-full py-2.5 rounded-lg bg-[#e50914] hover:bg-[#b20710] text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Backup (.json)
            </button>
          </div>

          {/* Import Backup Card */}
          <div className="bg-[#141414] p-5 rounded-xl border border-white/5 flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-500" />
                Restore / Import Backup
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Restore previously exported JSON backup files into your current device.
              </p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportBackup}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs border border-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload &amp; Restore Backup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
