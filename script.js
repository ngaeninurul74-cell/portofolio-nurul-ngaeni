/**
 * Nurul Ngaeni Portfolio Landing Page Interactive Script
 * Features: Mobile menu, Smooth active nav, Gallery filtering, Lightbox modal, Stats counter animation
 */

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Navigation Toggle
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      const icon = navToggle.querySelector('i');
      if (icon) {
        if (navMenu.classList.contains('active')) {
          icon.classList.remove('bi-list');
          icon.classList.add('bi-x-lg');
        } else {
          icon.classList.remove('bi-x-lg');
          icon.classList.add('bi-list');
        }
      }
    });

    // Close menu when clicking link
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        const icon = navToggle.querySelector('i');
        if (icon) {
          icon.classList.remove('bi-x-lg');
          icon.classList.add('bi-list');
        }
      });
    });
  }

  // Active Navigation on Scroll
  const sections = document.querySelectorAll('section[id]');
  const handleScroll = () => {
    const scrollY = window.pageYOffset;
    sections.forEach(section => {
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 100;
      const sectionId = section.getAttribute('id');
      const targetLink = document.querySelector(`.nav-link[href*="${sectionId}"]`);

      if (targetLink) {
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
          targetLink.classList.add('active');
        } else {
          targetLink.classList.remove('active');
        }
      }
    });
  };
  window.addEventListener('scroll', handleScroll);

  // Gallery Filter Tabs
  const filterButtons = document.querySelectorAll('.filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');
      const currentGalleryItems = document.querySelectorAll('.gallery-item');

      currentGalleryItems.forEach(item => {
        const itemCategory = item.getAttribute('data-category');
        if (filterValue === 'all' || itemCategory === filterValue) {
          item.classList.remove('hide');
        } else {
          item.classList.add('hide');
        }
      });
    });
  });

  // Lightbox Modal for Photo Preview
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxBackdrop = document.getElementById('lightboxBackdrop');
  const galleryCards = document.querySelectorAll('.gallery-card');

  const openLightbox = (imgSrc, captionText) => {
    if (lightboxModal && lightboxImage && lightboxCaption) {
      lightboxImage.src = imgSrc;
      lightboxCaption.textContent = captionText;
      lightboxModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  };

  const closeLightbox = () => {
    if (lightboxModal) {
      lightboxModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  galleryCards.forEach(card => {
    card.addEventListener('click', () => {
      const img = card.querySelector('img');
      const title = card.querySelector('h4');
      if (img) {
        const caption = title ? title.textContent : '';
        openLightbox(img.src, caption);
      }
    });
  });

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closeLightbox);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightboxModal && lightboxModal.classList.contains('active')) {
      closeLightbox();
    }
  });

  // Stats Counter Animation
  const statNumbers = document.querySelectorAll('.stat-number');
  let animated = false;

  const animateCounters = () => {
    const statsBar = document.querySelector('.stats-counter-bar');
    if (!statsBar) return;

    const rect = statsBar.getBoundingClientRect();
    if (rect.top <= window.innerHeight && rect.bottom >= 0 && !animated) {
      animated = true;
      statNumbers.forEach(stat => {
        const text = stat.textContent.trim();
        const target = parseInt(text.replace('+', ''), 10);
        if (isNaN(target)) return;

        let count = 0;
        const duration = 1200;
        const increment = target / (duration / 25);

        const counterInterval = setInterval(() => {
          count += increment;
          if (count >= target) {
            stat.textContent = `${target}+`;
            clearInterval(counterInterval);
          } else {
            stat.textContent = `${Math.floor(count)}+`;
          }
        }, 25);
      });
    }
  };

  window.addEventListener('scroll', animateCounters);
  animateCounters(); // run once on load

  // CMS Manager Initialization (Hydration, Multi-tab Live Sync & Inline Editor)
  if (typeof CMSManager !== 'undefined') {
    CMSManager.hydrateLandingPage();
    CMSManager.initSyncListener();
    CMSManager.initInlineEditor();
  }
});
