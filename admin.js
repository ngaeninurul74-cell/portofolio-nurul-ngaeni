/**
 * Nurul Ngaeni Portfolio - CMS Admin Dashboard Logic
 * Features:
 * 1. Admin Authentication Gate (Login Screen, Client-side Key Hash, Logout, Password Change)
 * 2. Multi-Content Photo Management across all sections:
 *    - Profile (Hero, About, Closing)
 *    - Services (MC, Moderator, Speaker, Modeling)
 *    - Projects (IKANURA, APIK, Nurova.Style)
 *    - Achievements (7 awards with certificates / trophies)
 *    - Quote (Backdrop wallpaper)
 *    - Gallery (Event documentation photo uploads with categories)
 * 3. Real-time form synchronization, JSON Export/Import, and Factory Reset
 * 
 * Strict Constraint: ZERO EMOJIS - Bootstrap Icons ONLY (bi bi-*)
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof CMSManager === 'undefined') {
    console.error('CMSManager tidak ditemukan. Pastikan cms-manager.js dimuat.');
    return;
  }

  const categoryMeta = {
    mc: { label: 'MC Event', icon: 'bi bi-mic' },
    moderator: { label: 'Moderator', icon: 'bi bi-chat-square-quote' },
    speaker: { label: 'Narasumber', icon: 'bi bi-mortarboard' },
    modeling: { label: 'Runway Model', icon: 'bi bi-camera' },
    organizations: { label: 'Organisasi', icon: 'bi bi-people' }
  };

  // DOM Elements - Login & Main App Shell
  const loginScreen = document.getElementById('adminLoginScreen');
  const appContent = document.getElementById('adminAppContent');
  const loginUsername = document.getElementById('loginUsername');
  const loginPassword = document.getElementById('loginPassword');
  const loginRememberMe = document.getElementById('loginRememberMe');
  const btnSubmitLogin = document.getElementById('btnSubmitLogin');
  const toggleLoginPwBtn = document.getElementById('toggleLoginPwBtn');
  const loginErrorAlert = document.getElementById('loginErrorAlert');
  const loginErrorText = document.getElementById('loginErrorText');
  const btnLogoutAdmin = document.getElementById('btnLogoutAdmin');

  // DOM Elements - Tab Switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const panel = document.getElementById(targetTab);
      if (panel) panel.classList.add('active');
    });
  });

  // --- Authentication Gate ---
  function updateLoginUI() {
    const hasPw = CMSManager.hasPassword();
    const loginTitle = document.getElementById('loginTitle');
    const loginSubtitle = document.getElementById('loginSubtitle');
    const hintText = document.getElementById('loginHintText');

    if (!hasPw) {
      if (loginTitle) loginTitle.textContent = 'Registrasi Sandi Admin';
      if (loginSubtitle) loginSubtitle.textContent = 'Belum ada sandi yang terdaftar. Masukkan username dan buat sandi baru untuk mengamankan akses admin.';
      if (btnSubmitLogin) {
        btnSubmitLogin.innerHTML = '<i class="bi bi-shield-plus"></i><span>Buat Sandi & Masuk</span>';
      }
      if (hintText) {
        hintText.textContent = 'Sandi baru (min. 6 karakter) akan dienkripsi dan disimpan di browser ini.';
      }
    } else {
      if (loginTitle) loginTitle.textContent = 'Portal Admin Portofolio';
      if (loginSubtitle) loginSubtitle.textContent = 'Nurul Ngaeni — Panel Kontrol Konten & Galeri';
      if (btnSubmitLogin) {
        btnSubmitLogin.innerHTML = '<i class="bi bi-box-arrow-in-right"></i><span>Masuk ke Panel Admin</span>';
      }
      if (hintText) {
        hintText.textContent = 'Panel admin terproteksi keamanan sandi.';
      }
    }
  }

  function showLoginError(msg) {
    if (loginErrorAlert && loginErrorText) {
      loginErrorText.textContent = msg;
      loginErrorAlert.style.display = 'flex';
    }
  }

  function hideLoginError() {
    if (loginErrorAlert) {
      loginErrorAlert.style.display = 'none';
    }
  }

  async function performLogin() {
    hideLoginError();
    const username = loginUsername ? loginUsername.value.trim() : '';
    const password = loginPassword ? loginPassword.value : '';
    const remember = loginRememberMe ? loginRememberMe.checked : false;

    if (!username || !password) {
      showLoginError('Silakan masukkan username dan password.');
      return;
    }

    if (btnSubmitLogin) {
      btnSubmitLogin.disabled = true;
      btnSubmitLogin.innerHTML = '<i class="bi bi-arrow-repeat"></i><span>Memverifikasi...</span>';
    }

    try {
      const result = await CMSManager.login(username, password, remember);
      if (result.success) {
        if (loginScreen) loginScreen.style.display = 'none';
        if (appContent) appContent.style.display = 'block';
        populateForm();
        setupPhotoManagement();
        if (result.isInitialSetup) {
          CMSManager.showToast('Sandi admin baru berhasil dibuat dan disimpan untuk browser ini!');
        } else {
          CMSManager.showToast('Selamat datang di Panel Admin Portofolio Nurul Ngaeni!');
        }
      } else {
        showLoginError(result.message || 'Username atau password salah.');
      }
    } catch (err) {
      showLoginError('Terjadi kesalahan saat memproses login.');
    } finally {
      if (btnSubmitLogin) {
        btnSubmitLogin.disabled = false;
        updateLoginUI();
      }
    }
  }

  // Toggle Password Visibility
  if (toggleLoginPwBtn && loginPassword) {
    toggleLoginPwBtn.addEventListener('click', () => {
      const isPw = loginPassword.type === 'password';
      loginPassword.type = isPw ? 'text' : 'password';
      toggleLoginPwBtn.innerHTML = isPw ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
    });
  }

  // Bind Login Triggers
  if (btnSubmitLogin) {
    btnSubmitLogin.addEventListener('click', performLogin);
  }

  [loginUsername, loginPassword].forEach(input => {
    if (input) {
      input.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
          performLogin();
        }
      });
    }
  });

  // Bind Logout
  if (btnLogoutAdmin) {
    btnLogoutAdmin.addEventListener('click', () => {
      const confirmLogout = window.confirm('Apakah Anda yakin ingin keluar dari Panel Admin?');
      if (confirmLogout) {
        CMSManager.logout();
        if (loginPassword) loginPassword.value = '';
        if (appContent) appContent.style.display = 'none';
        if (loginScreen) loginScreen.style.display = 'flex';
        updateLoginUI();
        CMSManager.showToast('Anda telah keluar dari Panel Admin.');
      }
    });
  }

  // Bind Change Password
  const btnSubmitChangePw = document.getElementById('btnSubmitChangePw');
  if (btnSubmitChangePw) {
    btnSubmitChangePw.addEventListener('click', async () => {
      const oldPwInput = document.getElementById('changePwOld');
      const newPwInput = document.getElementById('changePwNew');
      const confirmPwInput = document.getElementById('changePwConfirm');

      const oldPw = oldPwInput ? oldPwInput.value : '';
      const newPw = newPwInput ? newPwInput.value : '';
      const confirmPw = confirmPwInput ? confirmPwInput.value : '';

      if (!oldPw) {
        CMSManager.showToast('Silakan masukkan password lama.', 'error');
        return;
      }
      if (!newPw || newPw.length < 6) {
        CMSManager.showToast('Password baru minimal harus 6 karakter.', 'error');
        return;
      }
      if (newPw !== confirmPw) {
        CMSManager.showToast('Konfirmasi password baru tidak cocok.', 'error');
        return;
      }

      btnSubmitChangePw.disabled = true;
      try {
        const res = await CMSManager.changePassword(oldPw, newPw);
        if (res.success) {
          CMSManager.showToast(res.message);
          if (oldPwInput) oldPwInput.value = '';
          if (newPwInput) newPwInput.value = '';
          if (confirmPwInput) confirmPwInput.value = '';
        } else {
          CMSManager.showToast(res.message, 'error');
        }
      } catch (err) {
        CMSManager.showToast('Gagal mengubah password.', 'error');
      } finally {
        btnSubmitChangePw.disabled = false;
      }
    });
  }

  // --- Populate Form Fields & Photos from CMS Data ---
  function populateForm() {
    const data = CMSManager.getData();
    if (!data) return;

    // Helper to safely set input value
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val !== undefined && val !== null ? val : '';
    };

    // 1. Personal & Hero
    if (data.personal) {
      setVal('personal_name', data.personal.name);
      setVal('personal_badge', data.personal.badge);
      setVal('personal_headline', data.personal.headline);
      setVal('personal_subheadline', data.personal.subheadline);
      setVal('personal_location', data.personal.location);
      setVal('personal_campus', data.personal.campus);
      setVal('personal_whatsapp', data.personal.whatsapp);
      setVal('personal_email', data.personal.email);
      setVal('personal_linkedin', data.personal.linkedin);

      // Profile photo previews
      const heroPreview = document.getElementById('preview_heroImage');
      if (heroPreview && data.personal.heroImage) {
        heroPreview.src = data.personal.heroImage;
      }

      const aboutPreview = document.getElementById('preview_aboutImage');
      if (aboutPreview && data.personal.aboutImage) {
        aboutPreview.src = data.personal.aboutImage;
      }

      const closingPreview = document.getElementById('preview_closingImage');
      if (closingPreview && data.personal.closingImage) {
        closingPreview.src = data.personal.closingImage;
      }
    }

    // 2. About
    if (data.about) {
      setVal('about_tag', data.about.tag);
      setVal('about_headline', data.about.headline);
      setVal('about_text', data.about.text);
      setVal('about_card1Title', data.about.card1Title);
      setVal('about_card1Desc', data.about.card1Desc);
      setVal('about_card2Title', data.about.card2Title);
      setVal('about_card2Desc', data.about.card2Desc);
    }

    // 3. Stats Counter
    if (Array.isArray(data.stats)) {
      data.stats.forEach((st, idx) => {
        setVal(`stat_${idx}_value`, st.value);
        setVal(`stat_${idx}_label`, st.label);
        setVal(`stat_${idx}_desc`, st.desc);
      });
    }

    // 4. Quote
    if (data.quote) {
      setVal('quote_headline', data.quote.headline || data.quote.text);
      setVal('quote_subtext', data.quote.subtext);
      setVal('quote_author', data.quote.author);
      setVal('quote_role', data.quote.role);

      // Quote backdrop wallpaper preview
      const previewQuoteBg = document.getElementById('preview_quoteBg');
      const iconQuoteBg = document.getElementById('icon_quoteBg');
      if (previewQuoteBg && iconQuoteBg) {
        if (data.quote.bgImage) {
          previewQuoteBg.src = data.quote.bgImage;
          previewQuoteBg.style.display = 'block';
          iconQuoteBg.style.display = 'none';
        } else {
          previewQuoteBg.style.display = 'none';
          iconQuoteBg.style.display = 'block';
        }
      }
    }

    // 5. Services & Photos
    if (Array.isArray(data.services)) {
      data.services.forEach((srv, idx) => {
        setVal(`service_${idx}_title`, srv.title);
        setVal(`service_${idx}_badge`, srv.badge || srv.count);
        setVal(`service_${idx}_desc`, srv.desc);

        // Service photo preview
        const prevImg = document.getElementById(`preview_service_${idx}`);
        const iconNoImg = document.getElementById(`icon_service_${idx}`);
        if (prevImg && iconNoImg) {
          if (srv.image) {
            prevImg.src = srv.image;
            prevImg.style.display = 'block';
            iconNoImg.style.display = 'none';
          } else {
            prevImg.style.display = 'none';
            iconNoImg.style.display = 'block';
          }
        }
      });
    }

    // 6. Projects & Covers
    if (Array.isArray(data.projects)) {
      data.projects.forEach((proj, idx) => {
        setVal(`project_${idx}_title`, proj.title);
        setVal(`project_${idx}_category`, proj.category);
        setVal(`project_${idx}_subtitle`, proj.subtitle);
        setVal(`project_${idx}_role`, proj.role);
        setVal(`project_${idx}_desc`, proj.description);

        // Project cover preview
        const prevImg = document.getElementById(`preview_project_${idx}`);
        if (prevImg) {
          const cover = proj.image || (proj.images && proj.images[0]) || '';
          if (cover) {
            prevImg.src = cover;
          }
        }
      });
    }

    // 7. Achievements & Certificates List
    renderAchievementsList();

    // 8. Contact
    if (data.contact) {
      setVal('contact_tag', data.contact.tag);
      setVal('contact_title', data.contact.title);
      setVal('contact_subtitle', data.contact.subtitle);
    }

    // 9. Gallery List
    renderGalleryList();
  }

  // --- Render Achievements List with Photo Uploaders ---
  function renderAchievementsList() {
    const data = CMSManager.getData();
    const container = document.getElementById('achievementsAdminList');
    if (!container) return;

    const achievements = Array.isArray(data.achievements) ? data.achievements : [];
    let html = '';

    achievements.forEach((ach, idx) => {
      const safeTitle = CMSManager.escapeHtml(ach.title || '');
      const safeIssuer = CMSManager.escapeHtml(ach.issuer || '');
      const hasImage = Boolean(ach.image);
      const safeImage = hasImage ? CMSManager.sanitizeUrl(ach.image) : '';
      const iconClass = CMSManager.escapeHtml(ach.icon || 'bi bi-trophy');

      html += `
        <div class="sub-card" data-ach-index="${idx}">
          <div class="sub-card-header">
            <span class="sub-card-title">
              <i class="${iconClass}"></i> Prestasi ${idx + 1}: ${safeTitle}
            </span>
          </div>

          <div class="form-grid">
            <!-- Photo Piagam/Trofi Uploader -->
            <div class="form-group span-2">
              <div class="section-photo-card">
                <div class="section-photo-thumb" style="width: 100px; height: 90px;">
                  <img id="preview_ach_${idx}" src="${safeImage}" alt="${safeTitle}" style="${hasImage ? 'display: block;' : 'display: none;'}">
                  <i id="icon_ach_${idx}" class="bi bi-award no-img" style="${hasImage ? 'display: none;' : 'display: block;'}"></i>
                </div>
                <div class="section-photo-meta">
                  <strong>Foto Piagam / Sertifikat / Trofi</strong>
                  <span>Tampil sebagai thumbnail pada kartu prestasi di landing page.</span>
                  <div class="section-photo-actions" style="margin-top: 6px;">
                    <label for="file_ach_${idx}" class="btn btn-primary btn-sm" style="cursor: pointer;">
                      <i class="bi bi-upload"></i> Unggah Piagam
                    </label>
                    <input type="file" id="file_ach_${idx}" class="input-ach-file" data-idx="${idx}" accept="image/*" style="display: none;">
                    <button type="button" class="btn btn-outline btn-sm btn-reset-ach-img" data-idx="${idx}" title="Kembalikan foto bawaan">
                      <i class="bi bi-arrow-counterclockwise"></i> Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="ach_${idx}_title">Nama Prestasi / Penghargaan</label>
              <input type="text" id="ach_${idx}_title" class="form-input" value="${safeTitle}">
            </div>

            <div class="form-group">
              <label class="form-label" for="ach_${idx}_issuer">Penyelenggara / Kategori & Tahun</label>
              <input type="text" id="ach_${idx}_issuer" class="form-input" value="${safeIssuer}">
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Attach File Upload Handlers for Achievements
    const achFileInputs = container.querySelectorAll('.input-ach-file');
    achFileInputs.forEach(input => {
      input.addEventListener('change', async (e) => {
        const idx = parseInt(input.getAttribute('data-idx'), 10);
        const file = e.target.files[0];
        if (!file) return;

        try {
          CMSManager.showToast('Mengompres dan memproses foto piagam...', 'info');
          const dataUrl = await CMSManager.compressImage(file, 1200, 1200, 0.82);
          const previewImg = document.getElementById(`preview_ach_${idx}`);
          const iconImg = document.getElementById(`icon_ach_${idx}`);
          if (previewImg && iconImg) {
            previewImg.src = dataUrl;
            previewImg.style.display = 'block';
            iconImg.style.display = 'none';
          }
          CMSManager.updateAchievementPhoto(idx, dataUrl);
          CMSManager.showToast(`Foto piagam prestasi ${idx + 1} berhasil diperbarui!`);
        } catch (err) {
          CMSManager.showToast(err.message, 'error');
        }
        input.value = '';
      });
    });

    // Attach Reset Handlers for Achievements
    const achResetButtons = container.querySelectorAll('.btn-reset-ach-img');
    achResetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        CMSManager.resetAchievementPhoto(idx);
        const updated = CMSManager.getData();
        const previewImg = document.getElementById(`preview_ach_${idx}`);
        const iconImg = document.getElementById(`icon_ach_${idx}`);
        if (updated.achievements && updated.achievements[idx]) {
          const ach = updated.achievements[idx];
          if (ach.image && previewImg && iconImg) {
            previewImg.src = ach.image;
            previewImg.style.display = 'block';
            iconImg.style.display = 'none';
          } else if (previewImg && iconImg) {
            previewImg.style.display = 'none';
            iconImg.style.display = 'block';
          }
        }
        CMSManager.showToast(`Foto piagam prestasi ${idx + 1} dikembalikan ke versi bawaan.`);
      });
    });
  }

  // --- Render Gallery List ---
  function renderGalleryList() {
    const data = CMSManager.getData();
    const grid = document.getElementById('adminGalleryGrid');
    const countSubtitle = document.getElementById('galleryCountSubtitle');
    if (!grid) return;

    const gallery = Array.isArray(data.gallery) ? data.gallery : [];
    if (countSubtitle) {
      countSubtitle.textContent = `Total Koleksi: ${gallery.length} Foto dokumentasi acara`;
    }

    if (gallery.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 30px; color: var(--text-muted);">
          <i class="bi bi-images" style="font-size: 2.5rem; color: var(--accent-gold); display: block; margin-bottom: 8px;"></i>
          <p>Belum ada foto di galeri. Gunakan formulir di atas untuk menambahkan foto baru.</p>
        </div>
      `;
      return;
    }

    let html = '';
    gallery.forEach(item => {
      const meta = categoryMeta[item.category] || { label: item.category, icon: 'bi bi-image' };
      const safeTitle = CMSManager.escapeHtml(item.title);
      const safeDesc = CMSManager.escapeHtml(item.desc || 'Tanpa keterangan');
      const safeImage = CMSManager.sanitizeUrl(item.image);
      const safeId = CMSManager.escapeHtml(item.id);
      const safeIcon = CMSManager.escapeHtml(meta.icon);
      const safeLabel = CMSManager.escapeHtml(meta.label);

      html += `
        <div class="gallery-admin-card" data-id="${safeId}">
          <div class="gallery-admin-thumb">
            <img src="${safeImage}" alt="${safeTitle}" loading="lazy">
            <span class="gallery-admin-cat">
              <i class="${safeIcon}"></i>
              <span>${safeLabel}</span>
            </span>
          </div>
          <div class="gallery-admin-info">
            <h4 class="gallery-admin-title">${safeTitle}</h4>
            <p class="gallery-admin-desc">${safeDesc}</p>
          </div>
          <div class="gallery-admin-footer">
            <button type="button" class="btn btn-danger-soft btn-delete-photo" data-id="${safeId}" title="Hapus foto dari galeri">
              <i class="bi bi-trash3-fill"></i>
              <span>Hapus</span>
            </button>
          </div>
        </div>
      `;
    });

    grid.innerHTML = html;

    // Attach Delete Handlers
    const deleteButtons = grid.querySelectorAll('.btn-delete-photo');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const confirmDelete = window.confirm('Apakah Anda yakin ingin menghapus foto ini dari galeri portofolio?');
        if (confirmDelete) {
          const success = CMSManager.deleteGalleryPhoto(id);
          if (success) {
            CMSManager.showToast('Foto berhasil dihapus dari galeri.');
            renderGalleryList();
          } else {
            CMSManager.showToast('Gagal menghapus foto.', 'error');
          }
        }
      });
    });
  }

  // --- Collect Current Form Values into Structured Data Object ---
  function collectFormData() {
    const original = CMSManager.getData();
    const data = JSON.parse(JSON.stringify(original));

    const getVal = (id, fallback) => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : fallback;
    };

    // 1. Personal
    if (!data.personal) data.personal = {};
    data.personal.name = getVal('personal_name', data.personal.name);
    data.personal.badge = getVal('personal_badge', data.personal.badge);
    data.personal.headline = getVal('personal_headline', data.personal.headline);
    data.personal.subheadline = getVal('personal_subheadline', data.personal.subheadline);
    data.personal.location = getVal('personal_location', data.personal.location);
    data.personal.campus = getVal('personal_campus', data.personal.campus);
    data.personal.whatsapp = getVal('personal_whatsapp', data.personal.whatsapp);
    data.personal.email = getVal('personal_email', data.personal.email);
    data.personal.linkedin = getVal('personal_linkedin', data.personal.linkedin);
    if (data.personal.whatsapp) {
      data.personal.whatsappLink = `https://wa.me/${data.personal.whatsapp.replace(/[^0-9]/g, '')}`;
    }

    // 2. About
    if (!data.about) data.about = {};
    data.about.tag = getVal('about_tag', data.about.tag);
    data.about.headline = getVal('about_headline', data.about.headline);
    data.about.text = getVal('about_text', data.about.text);
    data.about.card1Title = getVal('about_card1Title', data.about.card1Title);
    data.about.card1Desc = getVal('about_card1Desc', data.about.card1Desc);
    data.about.card2Title = getVal('about_card2Title', data.about.card2Title);
    data.about.card2Desc = getVal('about_card2Desc', data.about.card2Desc);

    // 3. Stats
    if (Array.isArray(data.stats)) {
      data.stats.forEach((st, idx) => {
        st.value = getVal(`stat_${idx}_value`, st.value);
        st.label = getVal(`stat_${idx}_label`, st.label);
        st.desc = getVal(`stat_${idx}_desc`, st.desc);
      });
    }

    // 4. Quote
    if (!data.quote) data.quote = {};
    data.quote.headline = getVal('quote_headline', data.quote.headline);
    data.quote.text = data.quote.headline;
    data.quote.subtext = getVal('quote_subtext', data.quote.subtext);
    data.quote.author = getVal('quote_author', data.quote.author);
    data.quote.role = getVal('quote_role', data.quote.role);

    // 5. Services
    if (Array.isArray(data.services)) {
      data.services.forEach((srv, idx) => {
        srv.title = getVal(`service_${idx}_title`, srv.title);
        srv.badge = getVal(`service_${idx}_badge`, srv.badge);
        srv.count = srv.badge;
        srv.desc = getVal(`service_${idx}_desc`, srv.desc);
      });
    }

    // 6. Projects
    if (Array.isArray(data.projects)) {
      data.projects.forEach((proj, idx) => {
        proj.title = getVal(`project_${idx}_title`, proj.title);
        proj.category = getVal(`project_${idx}_category`, proj.category);
        proj.subtitle = getVal(`project_${idx}_subtitle`, proj.subtitle);
        proj.role = getVal(`project_${idx}_role`, proj.role);
        proj.description = getVal(`project_${idx}_desc`, proj.description);
      });
    }

    // 7. Achievements Text
    if (Array.isArray(data.achievements)) {
      data.achievements.forEach((ach, idx) => {
        ach.title = getVal(`ach_${idx}_title`, ach.title);
        ach.issuer = getVal(`ach_${idx}_issuer`, ach.issuer);
      });
    }

    // 8. Contact
    if (!data.contact) data.contact = {};
    data.contact.tag = getVal('contact_tag', data.contact.tag);
    data.contact.title = getVal('contact_title', data.contact.title);
    data.contact.subtitle = getVal('contact_subtitle', data.contact.subtitle);

    return data;
  }

  // Handle Save Action
  const handleSave = () => {
    const updated = collectFormData();
    const success = CMSManager.saveData(updated);
    if (success) {
      CMSManager.showToast('Perubahan berhasil disimpan! Landing page telah diperbarui seketika.');
    } else {
      CMSManager.showToast('Gagal menyimpan data.', 'error');
    }
  };

  // Bind Save Buttons
  const saveBtn = document.getElementById('btnSaveAll');
  const bottomSaveBtn = document.getElementById('btnBottomSave');
  if (saveBtn) saveBtn.addEventListener('click', handleSave);
  if (bottomSaveBtn) bottomSaveBtn.addEventListener('click', handleSave);

  // Handle Reset to Default
  const resetBtn = document.getElementById('btnResetDefault');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const confirmReset = window.confirm('Apakah Anda yakin ingin mengembalikan semua data teks dan foto ke format awal bawaan?');
      if (confirmReset) {
        CMSManager.resetData();
        populateForm();
        CMSManager.showToast('Data portofolio telah di-reset ke format awal.');
      }
    });
  }

  // Handle Export JSON
  const exportBtn = document.getElementById('btnExportJSON');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      CMSManager.exportJSON('portfolio-content.json');
      CMSManager.showToast('File portfolio-content.json berhasil diunduh.');
    });
  }


  // --- Internet Publishing via GitHub Pages API ---
  const publishModal = document.getElementById('publishInternetModal');
  const btnPublishInternet = document.getElementById('btnPublishInternet');
  const btnTriggerModalFromSettings = document.getElementById('btnTriggerModalFromSettings');
  const btnCancelPublish = document.getElementById('btnCancelPublish');
  const btnConfirmPublish = document.getElementById('btnConfirmPublish');
  const ghTokenInput = document.getElementById('ghTokenInput');
  const toggleGhTokenBtn = document.getElementById('toggleGhTokenBtn');
  const rememberGhToken = document.getElementById('rememberGhToken');
  const publishAlertError = document.getElementById('publishAlertError');
  const publishAlertErrorText = document.getElementById('publishAlertErrorText');

  const GH_TOKEN_KEY = 'nurul_admin_gh_token';

  const showPublishModal = () => {
    if (!publishModal) return;
    if (publishAlertError) publishAlertError.style.display = 'none';
    const savedToken = localStorage.getItem(GH_TOKEN_KEY);
    if (savedToken && ghTokenInput) {
      ghTokenInput.value = savedToken;
    }
    publishModal.style.display = 'flex';
    if (ghTokenInput && !savedToken) ghTokenInput.focus();
  };

  const hidePublishModal = () => {
    if (publishModal) publishModal.style.display = 'none';
  };

  if (btnPublishInternet) btnPublishInternet.addEventListener('click', showPublishModal);
  if (btnTriggerModalFromSettings) btnTriggerModalFromSettings.addEventListener('click', showPublishModal);
  if (btnCancelPublish) btnCancelPublish.addEventListener('click', hidePublishModal);

  if (toggleGhTokenBtn && ghTokenInput) {
    toggleGhTokenBtn.addEventListener('click', () => {
      const isPw = ghTokenInput.type === 'password';
      ghTokenInput.type = isPw ? 'text' : 'password';
      toggleGhTokenBtn.innerHTML = isPw ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
    });
  }

  if (btnConfirmPublish) {
    btnConfirmPublish.addEventListener('click', async () => {
      const token = ghTokenInput ? ghTokenInput.value.trim() : '';
      if (!token) {
        if (publishAlertError && publishAlertErrorText) {
          publishAlertErrorText.textContent = 'Silakan masukkan GitHub Personal Access Token.';
          publishAlertError.style.display = 'flex';
        }
        return;
      }

      // Save form data first to ensure latest edits are captured
      handleSave();

      btnConfirmPublish.disabled = true;
      btnConfirmPublish.innerHTML = '<i class="bi bi-arrow-repeat"></i><span>Sedang Mempublikasikan ke GitHub...</span>';
      if (publishAlertError) publishAlertError.style.display = 'none';

      try {
        const result = await CMSManager.publishToGitHub(token, 'ngaeninurul74-cell', 'portofolio-nurul-ngaeni', 'gh-pages');
        if (result.success) {
          if (rememberGhToken && rememberGhToken.checked) {
            localStorage.setItem(GH_TOKEN_KEY, token);
          } else {
            localStorage.removeItem(GH_TOKEN_KEY);
          }
          hidePublishModal();
          CMSManager.showToast('Sukses! Konten berhasil dipublikasikan langsung ke GitHub Pages (Internet Live)! Website akan live untuk seluruh pengunjung dalam ~30 detik.');
        }
      } catch (err) {
        if (publishAlertError && publishAlertErrorText) {
          publishAlertErrorText.textContent = err.message || 'Gagal mempublikasikan ke GitHub API. Periksa token dan izin repositori Anda.';
          publishAlertError.style.display = 'flex';
        }
      } finally {
        btnConfirmPublish.disabled = false;
        btnConfirmPublish.innerHTML = '<i class="bi bi-send-check-fill"></i><span>Publikasikan Sekarang</span>';
      }
    });
  }

  // Handle Native File Exports for Manual Git Push
  const btnExportNativeJS = document.getElementById('btnExportNativeJS');
  const btnExportNativeJSON = document.getElementById('btnExportNativeJSON');

  if (btnExportNativeJS) {
    btnExportNativeJS.addEventListener('click', () => {
      CMSManager.exportJS('portfolio-content.js');
      CMSManager.showToast('Berkas native portfolio-content.js berhasil diunduh!');
    });
  }

  if (btnExportNativeJSON) {
    btnExportNativeJSON.addEventListener('click', () => {
      CMSManager.exportJSON('portfolio-content.json');
      CMSManager.showToast('Berkas native portfolio-content.json berhasil diunduh!');
    });
  }

  // Handle Import JSON
  const importInput = document.getElementById('importJsonInput');
  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        const res = CMSManager.importJSON(content);
        if (res.success) {
          populateForm();
          CMSManager.showToast('Data JSON berhasil dimuat dan disimpan!');
        } else {
          CMSManager.showToast(`Gagal mengimpor file: ${res.error}`, 'error');
        }
      };
      reader.readAsText(file);
      importInput.value = '';
    });
  }

  // --- Photo Management Handlers across All Content Sections ---
  function setupPhotoManagement() {
    // 1. Profile Photos Upload (Hero, About, Closing)
    const handleProfileUpload = (inputId, previewId, photoType) => {
      const input = document.getElementById(inputId);
      const preview = document.getElementById(previewId);
      if (!input || !preview) return;

      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          CMSManager.showToast('Mengompres dan memproses gambar...', 'info');
          const dataUrl = await CMSManager.compressImage(file, 1200, 1200, 0.85);
          preview.src = dataUrl;
          CMSManager.updateProfilePhoto(photoType, dataUrl);
          CMSManager.showToast('Foto profil berhasil diperbarui!');
        } catch (err) {
          CMSManager.showToast(err.message, 'error');
        }
        input.value = '';
      });
    };

    handleProfileUpload('file_heroImage', 'preview_heroImage', 'heroImage');
    handleProfileUpload('file_aboutImage', 'preview_aboutImage', 'aboutImage');
    handleProfileUpload('file_closingImage', 'preview_closingImage', 'closingImage');

    // Reset profile photos to default
    const bindResetPhoto = (btnId, previewId, photoType) => {
      const btn = document.getElementById(btnId);
      const preview = document.getElementById(previewId);
      if (btn && preview) {
        btn.addEventListener('click', () => {
          CMSManager.resetProfilePhoto(photoType);
          const data = CMSManager.getData();
          if (data.personal && data.personal[photoType]) {
            preview.src = data.personal[photoType];
          }
          CMSManager.showToast('Foto dikembalikan ke versi bawaan.');
        });
      }
    };

    bindResetPhoto('btnResetHeroImg', 'preview_heroImage', 'heroImage');
    bindResetPhoto('btnResetAboutImg', 'preview_aboutImage', 'aboutImage');
    bindResetPhoto('btnResetClosingImg', 'preview_closingImage', 'closingImage');

    // 2. Services Photos Upload (4 services: 0..3)
    [0, 1, 2, 3].forEach(idx => {
      const fileInput = document.getElementById(`file_service_${idx}`);
      const previewImg = document.getElementById(`preview_service_${idx}`);
      const iconNoImg = document.getElementById(`icon_service_${idx}`);
      const resetBtn = document.querySelector(`.btn-reset-service-img[data-idx="${idx}"]`);

      if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          try {
            CMSManager.showToast('Mengompres foto layanan...', 'info');
            const dataUrl = await CMSManager.compressImage(file, 1200, 1200, 0.82);
            if (previewImg && iconNoImg) {
              previewImg.src = dataUrl;
              previewImg.style.display = 'block';
              iconNoImg.style.display = 'none';
            }
            CMSManager.updateServicePhoto(idx, dataUrl);
            CMSManager.showToast(`Foto layanan ${idx + 1} berhasil diperbarui!`);
          } catch (err) {
            CMSManager.showToast(err.message, 'error');
          }
          fileInput.value = '';
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          CMSManager.resetServicePhoto(idx);
          if (previewImg && iconNoImg) {
            previewImg.style.display = 'none';
            iconNoImg.style.display = 'block';
          }
          CMSManager.showToast(`Foto layanan ${idx + 1} dihapus.`);
        });
      }
    });

    // 3. Projects Photos Upload (3 projects: 0..2)
    [0, 1, 2].forEach(idx => {
      const fileInput = document.getElementById(`file_project_${idx}`);
      const previewImg = document.getElementById(`preview_project_${idx}`);
      const resetBtn = document.querySelector(`.btn-reset-project-img[data-idx="${idx}"]`);

      if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          try {
            CMSManager.showToast('Mengompres foto sampul proyek...', 'info');
            const dataUrl = await CMSManager.compressImage(file, 1200, 1200, 0.82);
            if (previewImg) {
              previewImg.src = dataUrl;
            }
            CMSManager.updateProjectPhoto(idx, dataUrl);
            CMSManager.showToast(`Foto sampul proyek ${idx + 1} berhasil diperbarui!`);
          } catch (err) {
            CMSManager.showToast(err.message, 'error');
          }
          fileInput.value = '';
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          CMSManager.resetProjectPhoto(idx);
          const updated = CMSManager.getData();
          if (previewImg && updated.projects && updated.projects[idx]) {
            const p = updated.projects[idx];
            previewImg.src = p.image || (p.images && p.images[0]) || '';
          }
          CMSManager.showToast(`Foto sampul proyek ${idx + 1} dikembalikan ke versi bawaan.`);
        });
      }
    });

    // 4. Quote Wallpaper Backdrop Upload
    const fileQuoteBg = document.getElementById('file_quoteBg');
    const previewQuoteBg = document.getElementById('preview_quoteBg');
    const iconQuoteBg = document.getElementById('icon_quoteBg');
    const btnResetQuoteBg = document.getElementById('btnResetQuoteBg');

    if (fileQuoteBg) {
      fileQuoteBg.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          CMSManager.showToast('Mengompres foto wallpaper latar...', 'info');
          const dataUrl = await CMSManager.compressImage(file, 1600, 1200, 0.82);
          if (previewQuoteBg && iconQuoteBg) {
            previewQuoteBg.src = dataUrl;
            previewQuoteBg.style.display = 'block';
            iconQuoteBg.style.display = 'none';
          }
          CMSManager.updateQuoteBg(dataUrl);
          CMSManager.showToast('Foto latar banner filosofi berhasil diperbarui!');
        } catch (err) {
          CMSManager.showToast(err.message, 'error');
        }
        fileQuoteBg.value = '';
      });
    }

    if (btnResetQuoteBg) {
      btnResetQuoteBg.addEventListener('click', () => {
        CMSManager.resetQuoteBg();
        if (previewQuoteBg && iconQuoteBg) {
          previewQuoteBg.style.display = 'none';
          iconQuoteBg.style.display = 'block';
        }
        CMSManager.showToast('Foto latar banner filosofi dihapus.');
      });
    }

    // 5. Add New Gallery Photo
    const newGalleryFileInput = document.getElementById('newGalleryFile');
    const galleryDropzone = document.getElementById('galleryDropzone');
    const newPhotoPreviewBox = document.getElementById('newPhotoPreviewBox');
    const newPhotoPreviewImg = document.getElementById('newPhotoPreviewImg');
    const btnAddPhoto = document.getElementById('btnAddPhotoToGallery');
    let selectedGalleryImageDataUrl = null;

    const processGalleryFile = async (file) => {
      if (!file) return;
      try {
        CMSManager.showToast('Mengoptimalkan pratinjau gambar...', 'info');
        selectedGalleryImageDataUrl = await CMSManager.compressImage(file, 1200, 1200, 0.82);
        if (newPhotoPreviewImg && newPhotoPreviewBox) {
          newPhotoPreviewImg.src = selectedGalleryImageDataUrl;
          newPhotoPreviewBox.style.display = 'block';
        }
      } catch (err) {
        CMSManager.showToast(err.message, 'error');
        selectedGalleryImageDataUrl = null;
      }
    };

    if (newGalleryFileInput) {
      newGalleryFileInput.addEventListener('change', (e) => {
        processGalleryFile(e.target.files[0]);
      });
    }

    if (galleryDropzone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        galleryDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          galleryDropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        galleryDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          galleryDropzone.classList.remove('dragover');
        });
      });

      galleryDropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files[0]) {
          processGalleryFile(dt.files[0]);
        }
      });
    }

    if (btnAddPhoto) {
      btnAddPhoto.addEventListener('click', () => {
        const titleInput = document.getElementById('newPhotoTitle');
        const descInput = document.getElementById('newPhotoDesc');
        const catSelect = document.getElementById('newPhotoCategory');

        const title = titleInput ? titleInput.value.trim() : '';
        const desc = descInput ? descInput.value.trim() : '';
        const category = catSelect ? catSelect.value : 'mc';

        if (!selectedGalleryImageDataUrl) {
          CMSManager.showToast('Silakan pilih berkas foto terlebih dahulu.', 'error');
          return;
        }

        if (!title) {
          CMSManager.showToast('Silakan isi judul atau nama kegiatan untuk foto ini.', 'error');
          if (titleInput) titleInput.focus();
          return;
        }

        const meta = categoryMeta[category] || { label: 'Galeri', icon: 'bi bi-image' };

        const photoObj = {
          category: category,
          categoryLabel: meta.label,
          categoryIcon: meta.icon,
          title: title,
          desc: desc,
          image: selectedGalleryImageDataUrl
        };

        const success = CMSManager.addGalleryPhoto(photoObj);
        if (success) {
          CMSManager.showToast('Foto baru berhasil ditambahkan ke galeri portofolio!');
          // Reset form
          if (titleInput) titleInput.value = '';
          if (descInput) descInput.value = '';
          if (newGalleryFileInput) newGalleryFileInput.value = '';
          if (newPhotoPreviewBox) newPhotoPreviewBox.style.display = 'none';
          selectedGalleryImageDataUrl = null;

          // Re-render gallery list
          renderGalleryList();
        } else {
          CMSManager.showToast('Gagal menambahkan foto ke galeri.', 'error');
        }
      });
    }
  }

  // --- Initialize App State ---
  function init() {
    const isAuth = CMSManager.isAuthenticated();
    if (isAuth) {
      if (loginScreen) loginScreen.style.display = 'none';
      if (appContent) appContent.style.display = 'block';
      populateForm();
      setupPhotoManagement();
    } else {
      if (loginScreen) loginScreen.style.display = 'flex';
      if (appContent) appContent.style.display = 'none';
      updateLoginUI();
    }
  }

  init();
});
