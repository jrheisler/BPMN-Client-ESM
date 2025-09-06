document.addEventListener('DOMContentLoaded', function() {
  const palette = document.getElementById('palette');
  const btn = document.getElementById('toggle-palette');
  if (palette && btn) {
    btn.addEventListener('click', function() {
      palette.classList.toggle('open');
    });
  }
});
