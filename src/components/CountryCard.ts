// =============================================================================
// COMPONENTE: TARJETA DE PAÍS - Country Explorer
// =============================================================================

import type { Country } from '../types/country';
import { formatNumber, formatCapitals } from '../utils/format';
import { createElement } from '../utils/dom';
import { isFavorite, toggleFavoriteStorage } from '../utils/Storage'; // <-- NUEVO: Importamos el storage

export function createCountryCard(
  country: Country,
  onClick: (country: Country) => void
): HTMLElement {
  const card = createElement('article', 'country-card', 'cursor-pointer', 'relative');

  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Ver detalles de ${country.name.common}`);

  // Verificamos si este país ya está en favoritos usando su código único (cca3)
  const isFav = isFavorite(country.cca3);

  // =========================================================================
  // CONSTRUCCIÓN DEL HTML
  // =========================================================================
  card.innerHTML = `
    <div class="relative">
      <img
        src="${country.flags.svg}"
        alt="${country.flags.alt ?? `Bandera de ${country.name.common}`}"
        class="w-full h-48 object-cover"
        loading="lazy"
      />
      
      <button 
        type="button" 
        class="favorite-btn absolute top-3 left-3 p-2 bg-slate-900/80 rounded-full backdrop-blur-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 z-10"
        aria-label="${isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}"
      >
        <svg 
          class="w-5 h-5 transition-colors ${isFav ? 'text-red-500 fill-current' : 'text-slate-300 stroke-current fill-none'}" 
          viewBox="0 0 24 24" 
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>

      <span class="absolute top-3 right-3 px-3 py-1 bg-slate-900/80 text-slate-200 text-xs font-medium rounded-full backdrop-blur-sm">
        ${country.region}
      </span>
    </div>

    <div class="p-5">
      <h2 class="text-xl font-bold text-white mb-2 truncate">
        ${country.name.common}
      </h2>

      ${
        country.name.official !== country.name.common
          ? `<p class="text-slate-400 text-sm mb-3 truncate" title="${country.name.official}">
          ${country.name.official}
        </p>`
          : ''
      }

      <div class="space-y-2 text-sm">
        <div class="flex items-center gap-2 text-slate-300">
          <span class="text-slate-500">Capital:</span>
          <span class="truncate">${formatCapitals(country.capital)}</span>
        </div>

        <div class="flex items-center gap-2 text-slate-300">
          <span class="text-slate-500">Población:</span>
          <span>${formatNumber(country.population)}</span>
        </div>

        <div class="flex items-center gap-2 text-slate-300">
          <span class="text-slate-500">Subregión:</span>
          <span class="truncate">${country.subregion ?? country.region}</span>
        </div>
      </div>

      <div class="mt-4 flex items-center gap-2 text-blue-400 text-sm font-medium">
        <span>Ver más detalles</span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  `;

  // =========================================================================
  // EVENT LISTENERS
  // =========================================================================
  
  // Lógica para el botón de favoritos
  const favoriteBtn = card.querySelector('.favorite-btn');
  const favoriteSvg = favoriteBtn?.querySelector('svg');

  if (favoriteBtn && favoriteSvg) {
    favoriteBtn.addEventListener('click', (event) => {
      // EVITA que el click en el corazón dispare el evento de la tarjeta (abrir modal)
      event.stopPropagation(); 
      
      // Cambiamos el estado en el LocalStorage
      const nowFavorite = toggleFavoriteStorage(country.cca3);

      // Actualizamos las clases del SVG para pintar o despintar el corazón
      if (nowFavorite) {
        favoriteSvg.classList.remove('text-slate-300', 'stroke-current', 'fill-none');
        favoriteSvg.classList.add('text-red-500', 'fill-current');
        favoriteBtn.setAttribute('aria-label', 'Quitar de favoritos');
      } else {
        favoriteSvg.classList.remove('text-red-500', 'fill-current');
        favoriteSvg.classList.add('text-slate-300', 'stroke-current', 'fill-none');
        favoriteBtn.setAttribute('aria-label', 'Añadir a favoritos');
      }

      // Disparamos un evento personalizado por si queremos escuchar este cambio en main.ts
      // (muy útil si tenemos activo el filtro de "Solo Favoritos" y quitamos uno)
      card.dispatchEvent(new CustomEvent('favorite-changed', { 
        bubbles: true, 
        detail: { countryId: country.cca3, isFavorite: nowFavorite } 
      }));
    });
  }

  // Manejador de click principal (abre detalles)
  card.addEventListener('click', () => {
    onClick(country);
  });

  // Manejador de teclado para accesibilidad
  card.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      // Solo abrimos si el foco está en la tarjeta, no si está en el botón de favorito
      if (document.activeElement === card) {
        event.preventDefault();
        onClick(country);
      }
    }
  });

  return card;
}

export function renderCountryList(
  countries: Country[],
  container: HTMLElement,
  onCardClick: (country: Country) => void
): void {
  container.replaceChildren();

  const fragment = document.createDocumentFragment();

  for (const country of countries) {
    const card = createCountryCard(country, onCardClick);
    fragment.appendChild(card);
  }

  container.appendChild(fragment);
}