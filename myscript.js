// Mobilni izbornik
// Shared across index.html, privatnost.html and uvjeti.html — guarded with
// null-checks so a single script file works on every page without throwing,
// even though not every page has every element (gallery, form, etc.).
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const navBackdrop = document.getElementById("navBackdrop");

if (menuToggle && navLinks && navBackdrop) {
  function openMenu() {
    navLinks.classList.add("open");
    menuToggle.classList.add("open");
    navBackdrop.classList.add("open");
    menuToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    // Move focus into the menu for keyboard/screen-reader users
    const firstLink = navLinks.querySelector("a");
    if (firstLink) firstLink.focus();
  }
  function closeMenu() {
    navLinks.classList.remove("open");
    menuToggle.classList.remove("open");
    navBackdrop.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
  menuToggle.addEventListener("click", () => {
    navLinks.classList.contains("open") ? closeMenu() : openMenu();
  });
  navBackdrop.addEventListener("click", closeMenu);
  navLinks
    .querySelectorAll("a")
    .forEach((a) => a.addEventListener("click", closeMenu));
  window.addEventListener("resize", () => {
    if (window.innerWidth > 680) closeMenu();
  });
  // ESC closes the mobile menu too, not just the gallery modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navLinks.classList.contains("open")) {
      closeMenu();
      menuToggle.focus();
    }
  });
}

// Footer year — always current, never goes stale
const footYear = document.getElementById("footYear");
if (footYear) {
  footYear.textContent = new Date().getFullYear();
}

// Scroll reveal
// Guarded: if IntersectionObserver isn't supported (very old browsers) or
// something above throws, we still reveal everything immediately instead of
// leaving content permanently invisible. A <noscript> CSS rule in styles.css
// covers the "JS never runs at all" case.
const reveals = document.querySelectorAll(".reveal");
if (reveals.length) {
  if ("IntersectionObserver" in window) {
    try {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 },
      );
      reveals.forEach((el) => io.observe(el));
    } catch (err) {
      reveals.forEach((el) => el.classList.add("in"));
    }
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }
}

// POPUP GALERIJA S VIŠE SLIKA
// Only present on index.html — guarded so this file can also load on
// privatnost.html / uvjeti.html without throwing.
const galleryModal = document.getElementById("galleryModal");
const modalImg = document.getElementById("modalImg");
const modalCaption = document.getElementById("modalCaption");
const closeGalleryBtn = document.getElementById("closeGallery");
const prevBtn = document.getElementById("prevGallery");
const nextBtn = document.getElementById("nextGallery");
const portfolioImages = document.querySelectorAll(".pf-img img");

if (
  galleryModal &&
  modalImg &&
  modalCaption &&
  closeGalleryBtn &&
  prevBtn &&
  nextBtn
) {
  let currentGalleryImages = [];
  let currentImageIndex = 0;
  let currentAltText = "";
  let lastFocusedTrigger = null;

  function updateModalView() {
    modalImg.src = currentGalleryImages[currentImageIndex];
    // Keep the alt text meaningful per-image instead of the static markup default
    modalImg.alt = currentAltText;
    if (currentGalleryImages.length > 1) {
      modalCaption.textContent = `${currentAltText} (${currentImageIndex + 1} / ${currentGalleryImages.length})`;
      prevBtn.style.display = "block";
      nextBtn.style.display = "block";
    } else {
      modalCaption.textContent = currentAltText;
      prevBtn.style.display = "none";
      nextBtn.style.display = "none";
    }
  }

  portfolioImages.forEach((img) => {
    img.addEventListener("click", () => {
      const src = img.getAttribute("src");
      if (!src) return; // nothing to show — bad markup, fail quietly instead of breaking the modal

      currentGalleryImages = [src];
      const extraData = img.getAttribute("data-extra");
      if (extraData) {
        const extras = extraData
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        currentGalleryImages = currentGalleryImages.concat(extras);
      }
      currentImageIndex = 0;
      currentAltText = img.alt || "Prikaz portfolija";
      lastFocusedTrigger = img;

      updateModalView();

      galleryModal.style.display = "flex";
      galleryModal.setAttribute("aria-hidden", "false");
      setTimeout(() => {
        galleryModal.classList.add("show");
      }, 10);
      document.body.style.overflow = "hidden";
      closeGalleryBtn.focus();
    });
  });

  function showNextImage() {
    if (currentGalleryImages.length <= 1) return;
    currentImageIndex = (currentImageIndex + 1) % currentGalleryImages.length;
    updateModalView();
  }
  function showPrevImage() {
    if (currentGalleryImages.length <= 1) return;
    currentImageIndex =
      (currentImageIndex - 1 + currentGalleryImages.length) %
      currentGalleryImages.length;
    updateModalView();
  }

  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showNextImage();
  });
  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showPrevImage();
  });

  function closeGallery() {
    galleryModal.classList.remove("show");
    galleryModal.setAttribute("aria-hidden", "true");
    setTimeout(() => {
      galleryModal.style.display = "none";
      document.body.style.overflow = "";
    }, 300);
    // Return focus to whatever thumbnail opened the modal
    if (lastFocusedTrigger) lastFocusedTrigger.focus();
  }

  // role="button" spans don't get native Enter/Space activation like a real
  // <button> does, so wire it up manually for keyboard users
  [closeGalleryBtn, prevBtn, nextBtn].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.click();
      }
    });
  });

  closeGalleryBtn.addEventListener("click", closeGallery);
  galleryModal.addEventListener("click", (e) => {
    if (e.target === galleryModal) closeGallery();
  });

  // Basic focus trap: keep Tab cycling within the modal's controls while open
  galleryModal.addEventListener("keydown", (e) => {
    if (!galleryModal.classList.contains("show") || e.key !== "Tab") return;
    const focusable = [prevBtn, nextBtn, closeGalleryBtn].filter(
      (el) => el.offsetParent !== null,
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!galleryModal.classList.contains("show")) return;
    if (e.key === "Escape") closeGallery();
    if (e.key === "ArrowRight") showNextImage();
    if (e.key === "ArrowLeft") showPrevImage();
  });
}

// Kontakt forma
// Only present on index.html — guarded so this file can also load on
// privatnost.html / uvjeti.html without throwing.
const form = document.getElementById("kontaktForm");
const status = document.getElementById("form-status");
const submitBtn = document.getElementById("submit-btn");

if (form && status && submitBtn) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Honeypot check: if the hidden "_gotcha" field got filled in, it's almost certainly a bot.
    // Silently pretend success instead of submitting, so bots don't learn to adapt.
    const honeypot = form.querySelector('input[name="_gotcha"]');
    if (honeypot && honeypot.value.trim() !== "") {
      status.textContent = "Hvala! Poruka je uspješno poslana.";
      status.style.color = "green";
      form.reset();
      return;
    }

    submitBtn.disabled = true;
    status.textContent = "";

    const data = new FormData(form);

    try {
      const response = await fetch("https://formspree.io/f/meeydqgd", {
        method: "POST",
        body: data,
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        status.textContent = "Hvala! Poruka je uspješno poslana.";
        status.style.color = "green";
        form.reset();
      } else {
        const result = await response.json();
        if (result.errors) {
          status.textContent = result.errors
            .map((err) => err.message)
            .join(", ");
        } else {
          status.textContent = "Došlo je do greške. Pokušaj ponovno.";
        }
        status.style.color = "red";
      }
    } catch (error) {
      status.textContent = "Greška u mreži. Provjeri internetsku vezu.";
      status.style.color = "red";
    } finally {
      submitBtn.disabled = false;
    }
  });
}
