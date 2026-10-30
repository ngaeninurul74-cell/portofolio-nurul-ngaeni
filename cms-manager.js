/**
 * Nurul Ngaeni Portfolio CMS & Content Manager
 * Features:
 * 1. Admin Authentication (SHA-256 password hashing, session management)
  * 3. Photo Upload with automatic Canvas compression (max 1200px, WebP/JPEG)
 * 4. Multi-content photo management (Profile, Services, Projects, Achievements, Quote, Gallery)
 * 5. Real-time multi-tab synchronization via localStorage and BroadcastChannel
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CMSManager = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY = 'nurul_portfolio_data';
  const AUTH_KEY = 'nurul_admin_auth_state';
  const PW_HASH_KEY = 'nurul_admin_pw_hash';
  const LOCKOUT_KEY = 'nurul_auth_lockout';
  const ATTEMPTS_KEY = 'nurul_auth_failed_attempts';

  function getRemainingLockoutSeconds() {
    try {
      const lockUntil = parseInt(sessionStorage.getItem(LOCKOUT_KEY) || '0', 10);
      if (Date.now() < lockUntil) {
        return Math.ceil((lockUntil - Date.now()) / 1000);
      }
      return 0;
    } catch (e) {
      return 0;
    }
  }

  function recordFailedAttempt() {
    try {
      const attempts = parseInt(sessionStorage.getItem(ATTEMPTS_KEY) || '0', 10) + 1;
      sessionStorage.setItem(ATTEMPTS_KEY, String(attempts));
      if (attempts >= 5) {
        sessionStorage.setItem(LOCKOUT_KEY, String(Date.now() + 30000));
        sessionStorage.removeItem(ATTEMPTS_KEY);
      }
    } catch (e) {}
  }

  function clearFailedAttempts() {
    try {
      sessionStorage.removeItem(ATTEMPTS_KEY);
      sessionStorage.removeItem(LOCKOUT_KEY);
    } catch (e) {}
  }

  const broadcast = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('nurul_cms_sync') : null;

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }

  function getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      current = current[key];
    }
    return current;
  }

  function setNestedValue(obj, path, value) {
    if (!obj || !path) return;
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = isNaN(Number(keys[i + 1])) ? {} : [];
      }
      current = current[key];
    }
    const lastKey = keys[keys.length - 1];
    if (lastKey === '__proto__' || lastKey === 'constructor' || lastKey === 'prototype') return;
    current[lastKey] = value;
  }

  function getDefaultData() {
    if (typeof window !== 'undefined' && window.DEFAULT_PORTFOLIO_DATA) {
      return deepClone(window.DEFAULT_PORTFOLIO_DATA);
    }
    return {};
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('data:image/')) {
      const cleaned = trimmed.replace(/\s+/g, '');
      if (/^data:image\/[a-zA-Z0-9.+_-]+;base64,[A-Za-z0-9+/=]+$/i.test(cleaned)) {
        return cleaned;
      }
    }
    // Allow relative paths, landing_page_assets/, http:, https:, mailto:, tel:
    if (/^(https?:|mailto:|tel:|\/|\.\/|landing_page_assets\/|[a-zA-Z0-9_-]+\/)/i.test(trimmed)) {
      return encodeURI(trimmed).replace(/["'<>]/g, '');
    }
    return '';
  }

  async function computeSha256(str) {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const CMS = {
    escapeHtml: escapeHtml,
    sanitizeUrl: sanitizeUrl,

    // --- Authentication System ---
    /**
     * Check if current session is authenticated as admin
     */
    isAuthenticated: function () {
      try {
        return sessionStorage.getItem(AUTH_KEY) === 'true' || localStorage.getItem(AUTH_KEY) === 'true';
      } catch (e) {
        return false;
      }
    },

    /**
     * Check if admin password has been set up in localStorage
     */
    hasPassword: function () {
      try {
        return !!localStorage.getItem(PW_HASH_KEY);
      } catch (e) {
        return false;
      }
    },

    /**
     * Set or initialize admin password
     */
    setPassword: async function (newPassword) {
      if (!newPassword || newPassword.length < 6) {
        return { success: false, message: 'Password baru minimal harus 6 karakter.' };
      }
      try {
        const newHash = await computeSha256(newPassword);
        localStorage.setItem(PW_HASH_KEY, newHash);
        return { success: true, message: 'Password admin berhasil disetel.' };
      } catch (e) {
        return { success: false, message: 'Gagal mengenkripsi password.' };
      }
    },

    /**
     * Authenticate admin with username & password
     */
    login: async function (username, password, remember = false) {
      const lockedSec = getRemainingLockoutSeconds();
      if (lockedSec > 0) {
        return { success: false, message: `Terlalu banyak percobaan gagal. Silakan tunggu ${lockedSec} detik sebelum mencoba lagi.` };
      }

      const u = (username || '').trim().toLowerCase();
      if (u !== 'admin' && u !== 'nurul' && u !== 'nurulngaeni') {
        recordFailedAttempt();
        return { success: false, message: 'Username tidak terdaftar.' };
      }

      const activeHash = localStorage.getItem(PW_HASH_KEY);

      // If no password set yet, first login establishes the master password
      if (!activeHash) {
        if (!password || password.length < 6) {
          return {
            success: false,
            needsSetup: true,
            message: 'Belum ada sandi yang terdaftar. Masukkan password baru (minimal 6 karakter) untuk mengamankan akses admin.'
          };
        }
        const initialHash = await computeSha256(password);
        localStorage.setItem(PW_HASH_KEY, initialHash);
        sessionStorage.setItem(AUTH_KEY, 'true');
        if (remember) {
          localStorage.setItem(AUTH_KEY, 'true');
        }
        clearFailedAttempts();
        return { success: true, isInitialSetup: true };
      }

      const enteredHash = await computeSha256(password || '');

      if (enteredHash === activeHash) {
        clearFailedAttempts();
        sessionStorage.setItem(AUTH_KEY, 'true');
        if (remember) {
          localStorage.setItem(AUTH_KEY, 'true');
        }
        return { success: true };
      } else {
        recordFailedAttempt();
        const currentLock = getRemainingLockoutSeconds();
        if (currentLock > 0) {
          return { success: false, message: `Terlalu banyak percobaan gagal. Akses terkunci selama ${currentLock} detik.` };
        }
        return { success: false, message: 'Password salah. Silakan coba lagi.' };
      }
    },

    /**
     * Logout admin
     */
    logout: function () {
      try {
        sessionStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(AUTH_KEY);
      } catch (e) {}
    },

    /**
     * Change admin password
     */
    changePassword: async function (oldPassword, newPassword) {
      const activeHash = localStorage.getItem(PW_HASH_KEY);

      if (activeHash) {
        const oldHash = await computeSha256(oldPassword || '');
        if (oldHash !== activeHash) {
          return { success: false, message: 'Password lama salah.' };
        }
      }

      if (!newPassword || newPassword.length < 6) {
        return { success: false, message: 'Password baru minimal harus 6 karakter.' };
      }

      const newHash = await computeSha256(newPassword);
      localStorage.setItem(PW_HASH_KEY, newHash);
      return { success: true, message: 'Password admin berhasil diperbarui!' };
    },

    // --- Image Processing ---
    /**
     * Compress and resize an image file using HTML5 Canvas
     * Keeps images under ~150KB to preserve localStorage quota
     */
    compressImage: function (file, maxWidth = 1200, maxHeight = 1200, quality = 0.82) {
      return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
          reject(new Error('File yang diunggah bukan gambar valid.'));
          return;
        }
        if (file.size > 15 * 1024 * 1024) {
          reject(new Error('Ukuran file terlalu besar. Maksimal 15MB.'));
          return;
        }
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type.toLowerCase())) {
          reject(new Error('Format gambar tidak didukung. Gunakan JPG, PNG, atau WebP.'));
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
              if (width / height > maxWidth / maxHeight) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              } else {
                width = Math.round((width * maxHeight) / height);
                maxHeight = height = maxHeight;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
          };
          img.onerror = () => reject(new Error('Gagal memuat gambar ke canvas.'));
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
        reader.readAsDataURL(file);
      });
    },

    // --- Data Storage Operations ---
    /**
     * Get active portfolio data (localStorage or fallback to default)
     */
    getData: function () {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const defaults = getDefaultData();
          return Object.assign({}, defaults, parsed);
        }
      } catch (e) {
        console.warn('Failed to parse stored portfolio data:', e);
      }
      return getDefaultData();
    },

    /**
     * Save portfolio data to localStorage and broadcast updates
     */
    saveData: function (data) {
      try {
        const jsonStr = JSON.stringify(data, null, 2);
        localStorage.setItem(STORAGE_KEY, jsonStr);
        if (broadcast) {
          broadcast.postMessage({ type: 'PORTFOLIO_UPDATED', timestamp: Date.now() });
        }
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('portfolioDataUpdated', { detail: data }));
        }
        return true;
      } catch (e) {
        console.error('Error saving portfolio data:', e);
        if (e.name === 'QuotaExceededError' || e.code === 22) {
          alert('Penyimpanan browser penuh. Coba kurangi foto atau bersihkan cache.');
        }
        return false;
      }
    },

    /**
     * Reset to default initial portfolio data
     */
    resetData: function () {
      try {
        localStorage.removeItem(STORAGE_KEY);
        if (broadcast) {
          broadcast.postMessage({ type: 'PORTFOLIO_RESET', timestamp: Date.now() });
        }
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('portfolioDataUpdated', { detail: getDefaultData() }));
        }
        return true;
      } catch (e) {
        console.error('Error resetting portfolio data:', e);
        return false;
      }
    },

    // --- Photo Management across ALL Content Sections ---
    /**
     * Update Service Photo
     */
    updateServicePhoto: function (serviceIdx, dataUrl) {
      const data = this.getData();
      if (!Array.isArray(data.services) || !data.services[serviceIdx]) return false;
      data.services[serviceIdx].image = dataUrl;
      return this.saveData(data);
    },

    /**
     * Reset Service Photo
     */
    resetServicePhoto: function (serviceIdx) {
      const data = this.getData();
      const defaults = getDefaultData();
      if (data.services && data.services[serviceIdx]) {
        data.services[serviceIdx].image = (defaults.services && defaults.services[serviceIdx]) ? defaults.services[serviceIdx].image : '';
        return this.saveData(data);
      }
      return false;
    },

    /**
     * Update Project Cover Photo
     */
    updateProjectPhoto: function (projectIdx, dataUrl) {
      const data = this.getData();
      if (!Array.isArray(data.projects) || !data.projects[projectIdx]) return false;
      data.projects[projectIdx].image = dataUrl;
      return this.saveData(data);
    },

    /**
     * Reset Project Cover Photo
     */
    resetProjectPhoto: function (projectIdx) {
      const data = this.getData();
      const defaults = getDefaultData();
      if (data.projects && data.projects[projectIdx]) {
        data.projects[projectIdx].image = (defaults.projects && defaults.projects[projectIdx]) ? defaults.projects[projectIdx].image : '';
        return this.saveData(data);
      }
      return false;
    },

    /**
     * Update Achievement / Award Photo
     */
    updateAchievementPhoto: function (achIdx, dataUrl) {
      const data = this.getData();
      if (!Array.isArray(data.achievements) || !data.achievements[achIdx]) return false;
      data.achievements[achIdx].image = dataUrl;
      return this.saveData(data);
    },

    /**
     * Reset Achievement / Award Photo
     */
    resetAchievementPhoto: function (achIdx) {
      const data = this.getData();
      const defaults = getDefaultData();
      if (data.achievements && data.achievements[achIdx]) {
        data.achievements[achIdx].image = (defaults.achievements && defaults.achievements[achIdx]) ? defaults.achievements[achIdx].image : '';
        return this.saveData(data);
      }
      return false;
    },

    /**
     * Update Quote Backdrop Photo
     */
    updateQuoteBg: function (dataUrl) {
      const data = this.getData();
      if (!data.quote) data.quote = {};
      data.quote.bgImage = dataUrl;
      return this.saveData(data);
    },

    /**
     * Reset Quote Backdrop Photo
     */
    resetQuoteBg: function () {
      const data = this.getData();
      if (data.quote) {
        delete data.quote.bgImage;
        return this.saveData(data);
      }
      return false;
    },

    /**
     * Add a photo to the gallery
     */
    addGalleryPhoto: function (photoObj) {
      const data = this.getData();
      if (!Array.isArray(data.gallery)) {
        data.gallery = getDefaultData().gallery || [];
      }

      const newPhoto = {
        id: 'photo-' + Date.now(),
        category: photoObj.category || 'mc',
        categoryLabel: photoObj.categoryLabel || 'Galeri',
        categoryIcon: photoObj.categoryIcon || 'bi bi-image',
        title: photoObj.title || 'Foto Baru',
        desc: photoObj.desc || '',
        image: photoObj.image
      };

      data.gallery.unshift(newPhoto);
      return this.saveData(data);
    },

    /**
     * Delete a photo from the gallery by ID
     */
    deleteGalleryPhoto: function (photoId) {
      const data = this.getData();
      if (!Array.isArray(data.gallery)) return false;

      data.gallery = data.gallery.filter(p => p.id !== photoId);
      return this.saveData(data);
    },

    /**
     * Update a profile photo (hero, about, closing)
     */
    updateProfilePhoto: function (type, dataUrl) {
      const data = this.getData();
      if (!data.personal) data.personal = {};
      data.personal[type] = dataUrl;
      data.personal[type + 'Webp'] = dataUrl;
      return this.saveData(data);
    },

    /**
     * Reset a profile photo to default
     */
    resetProfilePhoto: function (type) {
      const defaults = getDefaultData();
      const data = this.getData();
      if (defaults.personal && defaults.personal[type]) {
        data.personal[type] = defaults.personal[type];
        if (defaults.personal[type + 'Webp']) {
          data.personal[type + 'Webp'] = defaults.personal[type + 'Webp'];
        }
        return this.saveData(data);
      }
      return false;
    },

    /**
     * Export active data as a downloadable JSON file
     */
    exportJSON: function (filename) {
      const data = this.getData();
      const str = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', str);
      downloadAnchor.setAttribute('download', filename || 'portfolio-content.json');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    },

    /**
     * Import JSON string into active data
     */
    importJSON: function (jsonStr) {
      try {
        if (typeof jsonStr !== 'string' || jsonStr.length > 5 * 1024 * 1024) {
          throw new Error('Ukuran berkas JSON melebihi batas aman (maksimal 5MB).');
        }
        const parsed = JSON.parse(jsonStr);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Format JSON harus berupa objek valid.');
        }
        if (!parsed.personal || !parsed.personal.name) {
          throw new Error('Format data JSON tidak valid: tidak ditemukan entitas personal.');
        }

        const sanitizeObject = (obj) => {
          if (!obj || typeof obj !== 'object') return obj;
          const cleaned = Array.isArray(obj) ? [] : {};
          for (const key of Object.keys(obj)) {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
            const val = obj[key];
            if (typeof val === 'string') {
              if (key.toLowerCase().includes('image') || key.toLowerCase().includes('link') || key.toLowerCase().includes('url')) {
                cleaned[key] = sanitizeUrl(val);
              } else {
                cleaned[key] = val;
              }
            } else if (typeof val === 'object' && val !== null) {
              cleaned[key] = sanitizeObject(val);
            } else {
              cleaned[key] = val;
            }
          }
          return cleaned;
        };

        const safeData = sanitizeObject(parsed);
        this.saveData(safeData);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    /**
     * Publish active portfolio data directly to GitHub Pages repository (Internet Live)
     */
    publishToGitHub: async function (token, repoOwner = 'ngaeninurul74-cell', repoName = 'portofolio-nurul-ngaeni', branch = 'gh-pages') {
      if (!token || !token.trim()) {
        throw new Error('Token GitHub diperlukan untuk mempublikasikan ke internet.');
      }

      const activeData = this.getData();
      const jsonStr = JSON.stringify(activeData, null, 2);
      const jsStr = `/**\n * Nurul Ngaeni Portfolio Structured Data\n * Updated online via CMS Manager\n */\nconst portfolioData = ${jsonStr};\n\nif (typeof window !== 'undefined') {\n  window.DEFAULT_PORTFOLIO_DATA = portfolioData;\n}\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = portfolioData;\n}\n`;

      const commitFile = async (path, contentUtf8, commitMsg) => {
        const getUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}?ref=${branch}`;
        const getRes = await fetch(getUrl, {
          headers: {
            'Authorization': `Bearer ${token.trim()}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        let sha = null;
        if (getRes.ok) {
          const fileInfo = await getRes.json();
          sha = fileInfo.sha;
        }

        const utf8Bytes = new TextEncoder().encode(contentUtf8);
        let binaryStr = '';
        for (let i = 0; i < utf8Bytes.length; i++) {
          binaryStr += String.fromCharCode(utf8Bytes[i]);
        }
        const b64 = btoa(binaryStr);

        const putUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`;
        const putRes = await fetch(putUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token.trim()}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: commitMsg,
            content: b64,
            branch: branch,
            sha: sha || undefined
          })
        });

        if (!putRes.ok) {
          const err = await putRes.json().catch(() => ({}));
          throw new Error(err.message || `Gagal memperbarui berkas ${path} di GitHub.`);
        }

        return await putRes.json();
      };

      const jsonRes = await commitFile('landing_page_assets/portfolio-content.json', jsonStr, 'chore(cms): update portfolio content online (JSON)');
      const jsRes = await commitFile('landing_page_assets/portfolio-content.js', jsStr, 'chore(cms): update portfolio content online (JS)');

      return { success: true, jsonRes, jsRes };
    },

    /**
     * Fetch live internet content from GitHub Pages / Web server (Cache-busted)
     */
    fetchLiveInternetContent: async function () {
      try {
        const res = await fetch('landing_page_assets/portfolio-content.json?t=' + Date.now());
        if (res.ok) {
          const liveData = await res.json();
          if (liveData && liveData.personal) {
            const localStored = localStorage.getItem(STORAGE_KEY);
            if (localStored) {
              try {
                const localData = JSON.parse(localStored);
                const merged = Object.assign({}, liveData, localData);
                if (localData.personal) {
                  merged.personal = Object.assign({}, liveData.personal, localData.personal);
                }
                this.hydrateLandingPage(merged);
                return merged;
              } catch (e) {}
            }
            this.hydrateLandingPage(liveData);
            return liveData;
          }
        }
      } catch (err) {
        // Fallback silently to bundled data
      }
      return null;
    },

    /**
     * Export JS data file for native repository usage
     */
    exportJS: function (filename) {
      const data = this.getData();
      const jsonStr = JSON.stringify(data, null, 2);
      const jsStr = `/**\n * Nurul Ngaeni Portfolio Structured Data\n * Exported from CMS Manager\n */\nconst portfolioData = ${jsonStr};\n\nif (typeof window !== 'undefined') {\n  window.DEFAULT_PORTFOLIO_DATA = portfolioData;\n}\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = portfolioData;\n}\n`;
      const blob = new Blob([jsStr], { type: 'text/javascript;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'portfolio-content.js';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },

    /**
     * Hydrate DOM elements with active CMS data (Text, Stats, Photos across sections)
     */
    hydrateLandingPage: function () {
      const data = this.getData();
      if (!data || !data.personal) return;

      // 1. Elements with data-cms-key
      const cmsElements = document.querySelectorAll('[data-cms-key]');
      cmsElements.forEach(el => {
        const key = el.getAttribute('data-cms-key');
        const val = getNestedValue(data, key);
        if (val !== undefined && val !== null) {
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.value = val;
          } else if (el.hasAttribute('data-cms-attr')) {
            const attr = el.getAttribute('data-cms-attr');
            el.setAttribute(attr, val);
          } else {
            el.textContent = val;
          }
        }
      });

      // 2. Personal Profile Photos & Links (Sanitized)
      if (data.personal) {
        const p = data.personal;
        const applyPictureSource = (imgEl, url) => {
          if (!imgEl || !url) return;
          const safeUrl = sanitizeUrl(url);
          if (!safeUrl) return;
          imgEl.src = safeUrl;
          const pic = imgEl.closest('picture');
          if (pic) {
            if (safeUrl.startsWith('data:') || safeUrl.startsWith('blob:')) {
              pic.querySelectorAll('source').forEach(s => s.remove());
            } else {
              const srcEl = pic.querySelector('source');
              if (srcEl) srcEl.srcset = safeUrl;
            }
          }
        };

        const heroImg = document.getElementById('heroImage');
        applyPictureSource(heroImg, p.heroImage);

        const aboutImg = document.getElementById('aboutImage') || document.querySelector('.about-photo-card img');
        applyPictureSource(aboutImg, p.aboutImage);

        const closingImg = document.getElementById('closingImage') || document.querySelector('.contact-photo-side img');
        applyPictureSource(closingImg, p.closingImage);

        // WhatsApp links (Sanitized)
        if (p.whatsappLink || p.whatsapp) {
          const rawWa = p.whatsappLink || `https://wa.me/${p.whatsapp.replace(/[^0-9]/g, '')}`;
          const safeWa = sanitizeUrl(rawWa);
          if (safeWa) {
            const waLinks = document.querySelectorAll('a[href*="wa.me"]');
            waLinks.forEach(a => a.setAttribute('href', safeWa));
          }
        }

        // Email links (Sanitized)
        if (p.email) {
          const safeEmail = sanitizeUrl(`mailto:${p.email.trim()}`);
          if (safeEmail) {
            const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
            emailLinks.forEach(a => a.setAttribute('href', safeEmail));
          }
        }

        // LinkedIn links (Sanitized)
        if (p.linkedin) {
          const safeLinkedin = sanitizeUrl(p.linkedin);
          if (safeLinkedin) {
            const linkedinLinks = document.querySelectorAll('a[href*="linkedin.com"]');
            linkedinLinks.forEach(a => a.setAttribute('href', safeLinkedin));
          }
        }
      }

      // 3. Stats update
      if (Array.isArray(data.stats)) {
        const statBoxes = document.querySelectorAll('.stats-counter-bar .stat-box');
        data.stats.forEach((st, idx) => {
          if (statBoxes[idx]) {
            const num = statBoxes[idx].querySelector('.stat-number');
            const title = statBoxes[idx].querySelector('.stat-title');
            const sub = statBoxes[idx].querySelector('.stat-sub');
            if (num) num.textContent = st.value;
            if (title) title.textContent = st.label;
            if (sub) sub.textContent = st.desc;
          }
        });
      }

      // 4. Services update (Text & Optional Custom Photos)
      if (Array.isArray(data.services)) {
        const serviceCards = document.querySelectorAll('.services-grid .service-card');
        data.services.forEach((srv, idx) => {
          if (serviceCards[idx]) {
            const title = serviceCards[idx].querySelector('.service-title');
            const badge = serviceCards[idx].querySelector('.service-badge');
            const desc = serviceCards[idx].querySelector('.service-desc, .service-text');
            if (title) title.textContent = srv.title;
            if (badge) badge.textContent = srv.badge || srv.count;
            if (desc) desc.textContent = srv.desc;

            // Optional service photo banner
            let photoBox = serviceCards[idx].querySelector('.service-photo-cover');
            if (srv.image) {
              const safeSrvImg = sanitizeUrl(srv.image);
              if (!photoBox) {
                photoBox = document.createElement('div');
                photoBox.className = 'service-photo-cover';
                serviceCards[idx].prepend(photoBox);
              }
              photoBox.innerHTML = `<img src="${safeSrvImg}" alt="${escapeHtml(srv.title)}" loading="lazy">`;
            } else if (photoBox) {
              photoBox.remove();
            }
          }
        });
      }

      // 5. Quote Background Wallpaper
      if (data.quote && data.quote.bgImage) {
        const quoteBackdrop = document.querySelector('.quote-banner .quote-backdrop');
        if (quoteBackdrop) {
          const safeBg = sanitizeUrl(data.quote.bgImage);
          quoteBackdrop.style.backgroundImage = `url("${safeBg}")`;
          quoteBackdrop.style.backgroundSize = 'cover';
          quoteBackdrop.style.backgroundPosition = 'center';
          quoteBackdrop.style.opacity = '0.35';
        }
      }

      // 6. Projects update (Text & Cover Photos)
      if (Array.isArray(data.projects)) {
        const projectCards = document.querySelectorAll('.projects-grid .project-card');
        data.projects.forEach((proj, idx) => {
          if (projectCards[idx]) {
            const cat = projectCards[idx].querySelector('.project-tag');
            const title = projectCards[idx].querySelector('.project-title');
            const desc = projectCards[idx].querySelector('.project-desc');
            const role = projectCards[idx].querySelector('.project-role');
            if (cat && proj.category) cat.textContent = proj.category;
            if (title) title.textContent = proj.title;
            if (role && proj.role) role.textContent = proj.role;
            if (desc) desc.textContent = proj.description;

            // Project Cover photo
            if (proj.image) {
              const projImg = projectCards[idx].querySelector('.project-image-box img');
              const safeProjImg = sanitizeUrl(proj.image);
              if (projImg && safeProjImg) {
                projImg.src = safeProjImg;
                const srcSet = projectCards[idx].querySelector('.project-image-box source');
                if (srcSet) srcSet.srcset = safeProjImg;
              }
            }
          }
        });
      }

      // 7. Achievements / Awards Photos
      if (Array.isArray(data.achievements)) {
        const awardCards = document.querySelectorAll('.achievements-grid .award-card');
        data.achievements.forEach((ach, idx) => {
          if (awardCards[idx]) {
            const h4 = awardCards[idx].querySelector('h4');
            const p = awardCards[idx].querySelector('p');
            if (h4) h4.textContent = ach.title;
            if (p) p.textContent = ach.issuer;

            // Achievement image preview if uploaded
            let achThumb = awardCards[idx].querySelector('.award-photo-thumb');
            if (ach.image) {
              const safeAchImg = sanitizeUrl(ach.image);
              if (!achThumb) {
                achThumb = document.createElement('div');
                achThumb.className = 'award-photo-thumb';
                awardCards[idx].prepend(achThumb);
              }
              achThumb.innerHTML = `<img src="${safeAchImg}" alt="${escapeHtml(ach.title)}" loading="lazy">`;
            } else if (achThumb) {
              achThumb.remove();
            }
          }
        });
      }

      // 8. Dynamic Gallery Hydration
      const galleryGrid = document.getElementById('galleryGrid');
      if (galleryGrid && Array.isArray(data.gallery) && data.gallery.length > 0) {
        const activeFilterBtn = document.querySelector('.filter-btn.active');
        const activeFilter = activeFilterBtn ? activeFilterBtn.getAttribute('data-filter') : 'all';

        let html = '';
        data.gallery.forEach(item => {
          const isHidden = (activeFilter !== 'all' && item.category !== activeFilter);
          const hideClass = isHidden ? ' hide' : '';
          const safeImage = sanitizeUrl(item.image);
          const safeWebp = item.imageWebp ? sanitizeUrl(item.imageWebp) : '';
          const safeTitle = escapeHtml(item.title);
          const safeDesc = escapeHtml(item.desc || '');
          const safeCategory = escapeHtml(item.category);
          const safeCatLabel = escapeHtml(item.categoryLabel || item.category);
          const safeCatIcon = escapeHtml(item.categoryIcon || 'bi bi-image');

          const pictureHtml = safeWebp
            ? `<picture><source srcset="${safeWebp}" type="image/webp"><img src="${safeImage}" alt="${safeTitle}" loading="lazy"></picture>`
            : `<img src="${safeImage}" alt="${safeTitle}" loading="lazy">`;

          html += `
            <div class="gallery-item${hideClass}" data-category="${safeCategory}">
              <div class="gallery-card">
                ${pictureHtml}
                <div class="gallery-overlay">
                  <span class="cat-pill"><i class="${safeCatIcon}"></i> ${safeCatLabel}</span>
                  <h4>${safeTitle}</h4>
                  <p>${safeDesc}</p>
                </div>
              </div>
            </div>
          `;
        });
        galleryGrid.innerHTML = html;

        // Re-attach lightbox handlers
        const lightboxModal = document.getElementById('lightboxModal');
        const lightboxImage = document.getElementById('lightboxImage');
        const lightboxCaption = document.getElementById('lightboxCaption');

        if (lightboxModal && lightboxImage && lightboxCaption) {
          const cards = galleryGrid.querySelectorAll('.gallery-card');
          cards.forEach(card => {
            card.addEventListener('click', () => {
              const img = card.querySelector('img');
              const title = card.querySelector('h4');
              if (img) {
                lightboxImage.src = img.src;
                lightboxCaption.textContent = title ? title.textContent : '';
                lightboxModal.classList.add('active');
                document.body.style.overflow = 'hidden';
              }
            });
          });
        }
      }
    },

    /**
     * Listen for external updates (e.g., changes made in admin.html or across browser tabs)
     */
    initSyncListener: function () {
      const self = this;
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          self.hydrateLandingPage();
        }
      });

      if (broadcast) {
        broadcast.onmessage = () => {
          self.hydrateLandingPage();
        };
      }

      window.addEventListener('portfolioDataUpdated', () => {
        self.hydrateLandingPage();
      });

      window.addEventListener('focus', () => {
        self.hydrateLandingPage();
      });

      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          self.hydrateLandingPage();
        }
      });
    },

    /**
     * Show modern toast message
     */
    showToast: function (message, type) {
      let toastContainer = document.getElementById('cmsToastContainer');
      if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'cmsToastContainer';
        toastContainer.className = 'cms-toast-container';
        document.body.appendChild(toastContainer);
      }

      const toast = document.createElement('div');
      toast.className = `cms-toast cms-toast-${type || 'success'}`;
      const icon = type === 'error' ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill';
      
      const iconEl = document.createElement('i');
      iconEl.className = `bi ${icon}`;
      
      const spanEl = document.createElement('span');
      spanEl.textContent = message;

      toast.appendChild(iconEl);
      toast.appendChild(spanEl);
      toastContainer.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('show');
      }, 10);

      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    }
  };

  return CMS;
}));
