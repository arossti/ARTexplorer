// ========================================================================
// RT-INFO-MODAL.JS - Info Modal Component
// ========================================================================
// Extracted from rt-init.js - Self-contained modal with no dependencies
// Handles first-visit display, open/close, keyboard and click-outside events

/**
 * Initialize the info modal component
 * Shows on first visit (per session), can be reopened via info icon
 */
export function initInfoModal() {
  const infoModalOverlay = document.getElementById("info-modal-overlay");
  const infoModalCloseBtn = document.getElementById("info-modal-close");
  const infoIconBtn = document.getElementById("info-icon-btn");

  // Show modal on first load (check sessionStorage)
  if (!sessionStorage.getItem("artexplorer-info-seen")) {
    infoModalOverlay.classList.remove("hidden");
  }

  // Open modal handler
  function openInfoModal() {
    infoModalOverlay.classList.remove("hidden");
  }

  // Close button handler
  function closeInfoModal() {
    infoModalOverlay.classList.add("hidden");
    sessionStorage.setItem("artexplorer-info-seen", "true");
  }

  // Info icon button to reopen modal
  infoIconBtn.addEventListener("click", openInfoModal);

  // Close button
  infoModalCloseBtn.addEventListener("click", closeInfoModal);

  // ESC key closes modal
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !infoModalOverlay.classList.contains("hidden")) {
      closeInfoModal();
    }
  });

  // Click outside modal to close
  infoModalOverlay.addEventListener("click", e => {
    if (e.target === infoModalOverlay) {
      closeInfoModal();
    }
  });
}
