/**
 * Nurul Ngaeni Portfolio CMS & Content Manager
 * Provides dual-mode editing:
 * 1. Admin Dashboard (admin.html) with structured forms
 * 2. Visual Inline Quick-Editor directly on the landing page (index.html)
 * 3. Real-time multi-tab synchronization via localStorage and BroadcastChannel
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
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = isNaN(Number(keys[i + 1])) ? {} : [];
      }
      current = current[key];
    }
    current[keys[keys.length - 1]] = value;
  }

  function getDefaultData() {
    if (typeof window !== 'undefined' && window.DEFAULT_PORTFOLIO_DATA) {
      return deepClone(window.DEFAULT_PORTFOLIO_DATA);
    }
    return {};
  }

  const CMS = {
    /**
     * Get active portfolio data (localStorage or fallback to default)
     */
    getData: function () {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const defaults = getDefaultData();
          // Merge to ensure no missing structure
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
        window.dispatchEvent(new CustomEvent('portfolioDataUpdated', { detail: data }));
        return true;
      } catch (e) {
        console.error('Error saving portfolio data:', e);
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
        window.dispatchEvent(new CustomEvent('portfolioDataUpdated', { detail: getDefaultData() }));
        return true;
      } catch (e) {
        console.error('Error resetting portfolio data:', e);
        return false;
      }
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
        const parsed = JSON.parse(jsonStr);
        if (!parsed.personal || !parsed.personal.name) {
          throw new Error('Format data JSON tidak valid: tidak ditemukan entitas personal.');
        }
        this.saveData(parsed);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    /**
     * Hydrate DOM elements with active CMS data
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

      // 2. Personal Links
      if (data.personal) {
        const p = data.personal;
        // WhatsApp links
        if (p.whatsappLink || p.whatsapp) {
          const waLinks = document.querySelectorAll('a[href*="wa.me"]');
          waLinks.forEach(a => {
            const href = p.whatsappLink || `https://wa.me/${p.whatsapp.replace(/[^0-9]/g, '')}`;
            a.setAttribute('href', href);
          });
        }

        // Email links
        if (p.email) {
          const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
          emailLinks.forEach(a => {
            a.setAttribute('href', `mailto:${p.email}`);
          });
        }

        // LinkedIn links
        if (p.linkedin) {
          const linkedinLinks = document.querySelectorAll('a[href*="linkedin.com"]');
          linkedinLinks.forEach(a => {
            a.setAttribute('href', p.linkedin);
          });
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

      // 4. Services update
      if (Array.isArray(data.services)) {
        const serviceCards = document.querySelectorAll('.services-grid .service-card');
        data.services.forEach((srv, idx) => {
          if (serviceCards[idx]) {
            const title = serviceCards[idx].querySelector('.service-title');
            const badge = serviceCards[idx].querySelector('.service-badge');
            const desc = serviceCards[idx].querySelector('.service-desc');
            if (title) title.textContent = srv.title;
            if (badge) badge.textContent = srv.badge || srv.count;
            if (desc) desc.textContent = srv.desc;
          }
        });
      }

      // 5. Projects update
      if (Array.isArray(data.projects)) {
        const projectCards = document.querySelectorAll('.projects-grid .project-card');
        data.projects.forEach((proj, idx) => {
          if (projectCards[idx]) {
            const cat = projectCards[idx].querySelector('.project-cat');
            const title = projectCards[idx].querySelector('.project-title');
            const sub = projectCards[idx].querySelector('.project-subtitle');
            const role = projectCards[idx].querySelector('.project-role strong');
            const desc = projectCards[idx].querySelector('.project-desc');
            if (cat) cat.textContent = proj.category;
            if (title) title.textContent = proj.title;
            if (sub) sub.textContent = proj.subtitle;
            if (role) role.textContent = proj.role;
            if (desc) desc.textContent = proj.description;
          }
        });
      }
    },

    /**
     * Listen for external updates (e.g., changes made in admin.html)
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
      toast.innerHTML = `<i class="bi ${icon}"></i><span>${message}</span>`;
      toastContainer.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('show');
      }, 10);

      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    },

    /**
     * Setup inline visual editor directly on index.html
     */
    initInlineEditor: function () {
      // Create Floating Quick Controls
      const floatingBar = document.createElement('div');
      floatingBar.id = 'cmsFloatingControls';
      floatingBar.className = 'cms-floating-controls';
      floatingBar.innerHTML = `
        <div class="cms-pill">
          <button id="cmsToggleEditBtn" class="cms-action-btn edit-mode-btn" title="Aktifkan Mode Edit Langsung di Halaman">
            <i class="bi bi-pencil-square"></i>
            <span>Mode Edit Cepat</span>
          </button>
          <a href="admin.html" class="cms-action-btn admin-link-btn" title="Buka Panel CMS Lengkap">
            <i class="bi bi-sliders"></i>
            <span>Panel Admin (CMS)</span>
          </a>
        </div>
      `;
      document.body.appendChild(floatingBar);

      // Create Top Floating Banner for Active Edit Mode
      const topBanner = document.createElement('div');
      topBanner.id = 'cmsEditorBanner';
      topBanner.className = 'cms-editor-banner';
      topBanner.innerHTML = `
        <div class="cms-banner-content">
          <div class="cms-banner-badge">
            <i class="bi bi-record-circle-fill pulse"></i>
            <strong>Mode Edit Langsung Aktif</strong>
          </div>
          <span class="cms-banner-help">Klik langsung pada teks manapun untuk mengubah isi.</span>
          <div class="cms-banner-actions">
            <button id="cmsSaveInlineBtn" class="btn btn-save">
              <i class="bi bi-floppy-fill"></i>
              <span>Simpan Perubahan</span>
            </button>
            <button id="cmsCancelInlineBtn" class="btn btn-cancel">
              <i class="bi bi-x-circle"></i>
              <span>Selesai / Tutup</span>
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(topBanner);

      let isEditing = false;
      const toggleBtn = document.getElementById('cmsToggleEditBtn');
      const saveBtn = document.getElementById('cmsSaveInlineBtn');
      const cancelBtn = document.getElementById('cmsCancelInlineBtn');

      const setInlineEditMode = (active) => {
        isEditing = active;
        const cmsElements = document.querySelectorAll('[data-cms-key]');

        if (active) {
          topBanner.classList.add('active');
          toggleBtn.classList.add('active');
          toggleBtn.querySelector('span').textContent = 'Keluar Mode Edit';
          cmsElements.forEach(el => {
            el.setAttribute('contenteditable', 'true');
            el.classList.add('cms-editable-target');
          });
          CMS.showToast('Mode Edit Aktif: Klik pada teks manapun untuk mengedit.');
        } else {
          topBanner.classList.remove('active');
          toggleBtn.classList.remove('active');
          toggleBtn.querySelector('span').textContent = 'Mode Edit Cepat';
          cmsElements.forEach(el => {
            el.removeAttribute('contenteditable');
            el.classList.remove('cms-editable-target');
          });
        }
      };

      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          setInlineEditMode(!isEditing);
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          setInlineEditMode(false);
        });
      }

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const currentData = CMS.getData();
          const cmsElements = document.querySelectorAll('[data-cms-key]');

          cmsElements.forEach(el => {
            const key = el.getAttribute('data-cms-key');
            if (key) {
              const textVal = el.textContent.trim();
              setNestedValue(currentData, key, textVal);
            }
          });

          const success = CMS.saveData(currentData);
          if (success) {
            CMS.showToast('Perubahan berhasil disimpan! Landing page telah diperbarui.');
            setInlineEditMode(false);
          } else {
            CMS.showToast('Gagal menyimpan data.', 'error');
          }
        });
      }
    }
  };

  return CMS;
}));
