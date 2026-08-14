/**
 * Espaço de Acolhimento - Jaqueline Camila
 * Landing Page Scripts (js/script.js)
 * Mobile menu, carousel, modal, smooth scroll
 */

document.addEventListener('DOMContentLoaded', () => {

  // ===== Mobile Menu Toggle =====
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  // ===== Carousel =====
  const track = document.getElementById('carouselTrack');
  const slides = document.querySelectorAll('.carousel-slide');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const dots = document.querySelectorAll('.carousel-dot');

  if (track && slides.length > 0) {
    let currentSlide = 0;
    const totalSlides = slides.length;

    function updateCarousel() {
      track.style.transform = `translateX(-${currentSlide * 100}%)`;
      dots.forEach((dot, index) => {
        if (index === currentSlide) {
          dot.classList.remove('bg-gray-300');
          dot.classList.add('bg-yellow-600');
        } else {
          dot.classList.remove('bg-yellow-600');
          dot.classList.add('bg-gray-300');
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        updateCarousel();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentSlide = (currentSlide + 1) % totalSlides;
        updateCarousel();
      });
    }

    dots.forEach((dot) => {
      dot.addEventListener('click', (e) => {
        currentSlide = parseInt(e.target.dataset.slide);
        updateCarousel();
      });
    });

    // Auto-advance carousel
    setInterval(() => {
      currentSlide = (currentSlide + 1) % totalSlides;
      updateCarousel();
    }, 5000);
  }

  // ===== Transtorno Cards — Modal Balão =====
  const modalOverlay = document.getElementById('modalOverlay');
  const modalClose = document.getElementById('modalClose');
  const modalTitulo = document.getElementById('modalTitulo');
  const modalDesc = document.getElementById('modalDesc');
  const modalDetalhes = document.getElementById('modalDetalhes');
  const modalIcon = document.getElementById('modalIcon');

  if (modalOverlay) {
    document.querySelectorAll('.transtorno-card').forEach(card => {
      card.addEventListener('click', () => {
        if (modalTitulo) modalTitulo.textContent = card.dataset.titulo || '';
        if (modalDesc) modalDesc.textContent = card.dataset.desc || '';
        if (modalDetalhes) modalDetalhes.textContent = card.dataset.detalhes || '';
        if (modalIcon) modalIcon.className = (card.dataset.icon || 'fas fa-info-circle') + ' text-2xl';
        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });

    function closeModal() {
      modalOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }

    if (modalClose) {
      modalClose.addEventListener('click', closeModal);
    }

    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeModal();
    });
  }

  // ===== Smooth Scroll =====
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
        if (mobileMenu) mobileMenu.classList.add('hidden');
      }
    });
  });

});
