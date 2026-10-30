/**
 * Nurul Ngaeni Portfolio - CMS Admin Dashboard Logic
 * Handles form population, real-time live-sync, exporting, importing, and resetting.
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof CMSManager === 'undefined') {
    console.error('CMSManager tidak ditemukan. Pastikan cms-manager.js dimuat.');
    return;
  }

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

  // Populate Form Fields from CMS Data
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
      const confirmReset = window.confirm('Apakah Anda yakin ingin mengembalikan semua data teks ke format awal bawaan? Perubahan yang belum disimpan sebagai cadangan akan dihapus.');
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
      // Reset input value so same file can be re-imported
      importInput.value = '';
    });
  }

  // Initialize
  populateForm();
});
