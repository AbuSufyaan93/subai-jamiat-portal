/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Subai Jamiat Ahle Hadees Mumbai — Admin Workspace Adaptive Controller
 * Seamlessly manages layout, touch gestures, drawers, modals, quickbars & tabs
 * across Mobile, Tablet, Laptop, Desktop, and Large Screen Viewports.
 * ══════════════════════════════════════════════════════════════════════════════
 */
(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const mainContainer = document.querySelector('.main-container');
    const menuToggle = document.querySelector('.main-container .right header .menu') || document.getElementById('admMenuToggle');
    const sidebar = document.querySelector('.main-container .left') || document.getElementById('adminSidebar');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const mobileDashboard = document.querySelector('.main-container .mobile-dashboard');
    const expand = document.querySelector('.main-container .right header .expand') || document.getElementById('admFullscreenBtn');
    const profile = document.querySelector('.main-container .right header .profile') || document.getElementById('admProfilePill');
    const logout = document.querySelector('.main-container .right header .profile .logout');
    const dropOpen = document.querySelectorAll('.main-container .left .dropdown .drop-open');
    const dashboardLinks = document.querySelectorAll('[data-page]');
    const body = document.querySelector('body');

    // ─── 1. Active Navigation Highlighting ───
    if (body) {
      const currentPage = body.getAttribute('data-page');
      if (currentPage) {
        dashboardLinks.forEach(link => {
          const dataAttr = link.getAttribute('data-page');
          if (dataAttr && dataAttr.toLowerCase() === currentPage.toLowerCase()) {
            link.classList.add('active');
            const dropdownMenu = link.parentElement;
            if (dropdownMenu && dropdownMenu.classList.contains('dropdown-menu')) {
              const dLink = dropdownMenu.previousElementSibling;
              if (dLink) {
                dLink.classList.add('active');
                if (dLink.parentElement) dLink.parentElement.classList.add('active');
              }
            }
          }
        });
      }
    }

    // ─── 2. Sidebar Dropdown Accordion Toggle ───
    dropOpen.forEach(drop => {
      drop.addEventListener('click', (e) => {
        e.preventDefault();
        const dropdown = drop.parentElement;
        if (dropdown) {
          dropdown.classList.toggle('active');
        }
      });
    });

    // ─── 3. Mobile / Desktop Sidebar Drawer Control ───
    if (menuToggle && mainContainer) {
      menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        mainContainer.classList.toggle('active');
      });
    }

    if (sidebarCloseBtn && mainContainer) {
      sidebarCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mainContainer.classList.remove('active');
      });
    }

    if (mobileDashboard && mainContainer) {
      mobileDashboard.addEventListener('click', () => {
        mainContainer.classList.remove('active');
      });
    }

    // ─── 4. Touch Gestures: Swipe Drawer to Dismiss on Mobile ───
    if (sidebar) {
      let touchStartX = 0;
      let touchCurrentX = 0;
      sidebar.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
      }, { passive: true });

      sidebar.addEventListener('touchmove', (e) => {
        touchCurrentX = e.touches[0].clientX;
      }, { passive: true });

      sidebar.addEventListener('touchend', () => {
        const isRtl = document.dir === 'rtl' || document.documentElement.dir === 'rtl';
        const diffX = touchCurrentX - touchStartX;
        // In RTL, swipe right (positive diffX) dismisses sidebar drawer
        // In LTR, swipe left (negative diffX) dismisses sidebar drawer
        if (isRtl && diffX > 60 && mainContainer) {
          mainContainer.classList.remove('active');
        } else if (!isRtl && diffX < -60 && mainContainer) {
          mainContainer.classList.remove('active');
        }
      });
    }

    // ─── 5. Profile Dropdown Toggle & Click-Away ───
    if (profile) {
      profile.addEventListener('click', (e) => {
        e.stopPropagation();
        profile.classList.toggle('active');
      });
    }

    document.addEventListener('click', (e) => {
      if (profile && !profile.contains(e.target)) {
        profile.classList.remove('active');
      }
    });

    // ─── 6. Logout Handler ───
    if (logout) {
      logout.addEventListener('click', (e) => {
        e.preventDefault();
        fetch('/admin-logout', {
          method: 'post',
          body: JSON.stringify({ logout: true }),
          headers: { 'Content-Type': 'application/json' }
        })
          .then(res => res.json())
          .then(data => {
            location.href = data.url || '/adminLogin';
          })
          .catch(() => {
            location.href = '/adminLogin';
          });
      });
    }

    // ─── 7. Fullscreen Toggle ───
    if (expand) {
      expand.addEventListener('click', () => {
        const html = document.querySelector('html');
        if (html.classList.contains('no-fs')) {
          const elem = document.documentElement;
          if (elem.requestFullscreen) elem.requestFullscreen();
          else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
          else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
          html.classList.replace('no-fs', 'fs');
        } else if (html.classList.contains('fs')) {
          if (document.exitFullscreen) document.exitFullscreen();
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
          else if (document.msExitFullscreen) document.msExitFullscreen();
          html.classList.replace('fs', 'no-fs');
        }
      });
    }

    // ─── 8. Global Keyboard Shortcuts ───
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Close sidebar if open on mobile
        if (mainContainer && mainContainer.classList.contains('active') && window.innerWidth <= 768) {
          mainContainer.classList.remove('active');
        }
        // Close profile dropdown
        if (profile) profile.classList.remove('active');
        // Close any active modal
        const activeModal = document.querySelector('.adm-modal-backdrop.active, .adm-modal-backdrop[style*="display: flex"]');
        if (activeModal) {
          activeModal.classList.remove('active');
          activeModal.style.display = 'none';
          document.body.style.overflow = '';
        }
      }
    });

    // ─── 9. Auto-Center Active Workflow Tab in Horizontal Scroll ───
    const workflowNav = document.querySelector('.adm-workflow-nav');
    if (workflowNav) {
      const activeTab = workflowNav.querySelector('.adm-workflow-tab.active');
      if (activeTab) {
        setTimeout(() => {
          const navRect = workflowNav.getBoundingClientRect();
          const tabRect = activeTab.getBoundingClientRect();
          const offset = tabRect.left - navRect.left - (navRect.width / 2) + (tabRect.width / 2);
          workflowNav.scrollBy({ left: offset, behavior: 'smooth' });
        }, 150);
      }
    }

    // ─── 10. Auto Bottom-Sheet Grab Handle on Mobile Modals ───
    const modals = document.querySelectorAll('.adm-modal-container, .adm-modal-card');
    modals.forEach(m => {
      if (!m.querySelector('.adm-sheet-handle')) {
        const handle = document.createElement('div');
        handle.className = 'adm-sheet-handle';
        m.insertBefore(handle, m.firstChild);
      }
    });

    // ─── 11. Mobile Quickbar Intelligent Context Detection ───
    detectMobilePrimaryAction();
  });

  // ─── Context-Aware Mobile Primary Action Detection ───
  function detectMobilePrimaryAction() {
    const labelEl = document.getElementById('mobileQuickPrimaryLabel');
    const btnEl = document.getElementById('mobileQuickPrimary');
    if (!labelEl || !btnEl) return;

    // Check for prominent forms or actions on current page
    const submitBtn = document.querySelector('button[type="submit"], input[type="submit"], #btnSaveDraft, #btnSaveDuplicateSettings, .adm-btn-primary');
    if (submitBtn) {
      const text = submitBtn.innerText || submitBtn.value || '';
      if (text.includes('محفوظ') || text.includes('Save')) {
        labelEl.innerText = 'محفوظ';
      } else if (text.includes('شائع') || text.includes('Publish')) {
        labelEl.innerText = 'شائع';
      } else if (text.includes('ارسال') || text.includes('Submit')) {
        labelEl.innerText = 'ارسال';
      } else if (text.includes('جواب') || text.includes('فتویٰ')) {
        labelEl.innerText = 'فتویٰ';
      } else {
        labelEl.innerText = 'ایکشن';
      }
    } else {
      labelEl.innerText = 'ایکشن';
    }
  }

  // ─── Global Helper: Quick Search ───
  window.triggerAdminQuickSearch = function() {
    const searchInput = document.querySelector('#searchInput, #reportSearchInput, #fatawaFilterSearch, .adm-search-input, input[type="search"]');
    if (searchInput) {
      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => searchInput.focus(), 300);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ─── Global Helper: Primary Action Trigger ───
  window.triggerAdminPrimaryAction = function() {
    const primaryBtn = document.querySelector('button[type="submit"], input[type="submit"], #btnSaveDuplicateSettings, #btnSaveDraft, .adm-btn-primary');
    if (primaryBtn) {
      primaryBtn.click();
    } else {
      window.triggerAdminQuickSearch();
    }
  };

})();