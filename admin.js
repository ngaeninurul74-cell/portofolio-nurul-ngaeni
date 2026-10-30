/**
 * Nurul Ngaeni Portfolio - CMS Admin Dashboard Logic
 * Handles form population, real-time live-sync, photo management, exporting, importing, and resetting.
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

  // Populate Form Fields & Photos from CMS Data
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
    }

    // 5. Services
    if (Array.isArray(data.services)) {
      data.services.forEach((srv, idx) => {
        setVal(`service_${idx}_title`, srv.title);
        setVal(`service_${idx}_badge`, srv.badge || srv.count);
        setVal(`service_${idx}_desc`, srv.desc);
      });
    }

    // 6. Projects
    if (Array.isArray(data.projects)) {
      data.projects.forEach((proj, idx) => {
        setVal(`project_${idx}_title`, proj.title);
        setVal(`project_${idx}_category`, proj.category);
        setVal(`project_${idx}_subtitle`, proj.subtitle);
        setVal(`project_${idx}_role`, proj.role);
        setVal(`project_${idx}_desc`, proj.description);
      });
    }

    // 7. Contact
    if (data.contact) {
      setVal('contact_tag', data.contact.tag);
      setVal('contact_title', data.contact.title);
      setVal('contact_subtitle', data.contact.subtitle);
    }

    // 8. Gallery List
    renderGalleryList();
  }

  // Render the gallery photo collection in admin
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

  // Collect Current Form Values into structured Data object
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
    data.personal.whatsappLink = `https://wa.me/${data.personal.whatsapp.replace(/[^0-9]/g, '')}`;

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

    // 7. Contact
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

  // --- Photo Upload Handlers ---
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

    // 2. Add New Gallery Photo
    const newGalleryFileInput = document.getElementById('newGalleryFile');
    const newPhotoPreviewBox = document.getElementById('newPhotoPreviewBox');
    const newPhotoPreviewImg = document.getElementById('newPhotoPreviewImg');
    const btnAddPhoto = document.getElementById('btnAddPhotoToGallery');
    let selectedGalleryImageDataUrl = null;

    if (newGalleryFileInput) {
      newGalleryFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
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

  // Initialize
  populateForm();
  setupPhotoManagement();
});
