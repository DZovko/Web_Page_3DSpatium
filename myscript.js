// Mobilni izbornik
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const navBackdrop = document.getElementById("navBackdrop");

function openMenu() {
  navLinks.classList.add("open");
  menuToggle.classList.add("open");
  navBackdrop.classList.add("open");
  menuToggle.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
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

// Scroll reveal
const reveals = document.querySelectorAll(".reveal");
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

// POPUP GALERIJA S VIŠE SLIKA
const galleryModal = document.getElementById("galleryModal");
const modalImg = document.getElementById("modalImg");
const modalCaption = document.getElementById("modalCaption");
const closeGalleryBtn = document.getElementById("closeGallery");
const prevBtn = document.getElementById("prevGallery");
const nextBtn = document.getElementById("nextGallery");
const portfolioImages = document.querySelectorAll(".pf-img img");

let currentGalleryImages = [];
let currentImageIndex = 0;
let currentAltText = "";

function updateModalView() {
  modalImg.src = currentGalleryImages[currentImageIndex];
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
    currentGalleryImages = [img.getAttribute("src")];
    const extraData = img.getAttribute("data-extra");
    if (extraData) {
      currentGalleryImages = currentGalleryImages.concat(extraData.split(","));
    }
    currentImageIndex = 0;
    currentAltText = img.alt;

    updateModalView();

    galleryModal.style.display = "flex";
    setTimeout(() => {
      galleryModal.classList.add("show");
    }, 10);
    document.body.style.overflow = "hidden";
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
  setTimeout(() => {
    galleryModal.style.display = "none";
    document.body.style.overflow = "";
  }, 300);
}

closeGalleryBtn.addEventListener("click", closeGallery);
galleryModal.addEventListener("click", (e) => {
  if (e.target === galleryModal) closeGallery();
});

document.addEventListener("keydown", (e) => {
  if (!galleryModal.classList.contains("show")) return;
  if (e.key === "Escape") closeGallery();
  if (e.key === "ArrowRight") showNextImage();
  if (e.key === "ArrowLeft") showPrevImage();
});

//forma test
const form = document.getElementById("kontaktForm");
const status = document.getElementById("form-status");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

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
        status.textContent = result.errors.map((err) => err.message).join(", ");
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
