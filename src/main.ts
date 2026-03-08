// =============================================================================
// PUNTO DE ENTRADA - Country Explorer
// =============================================================================

import type { Country, UiState } from './types/country';
import { searchCountries, getAllCountries, ApiError } from './services/countryApi'; // Asegúrate de tener getAllCountries si lo necesitas para mostrar favoritos sin buscar
import { renderCountryList } from './components/CountryCard';
import { openModal } from './components/CountryModal';
import { getRequiredElement, showElement, hideElement, onDOMReady, debounce } from './utils/dom';
import { clearAllFavorites, isFavorite } from './utils/Storage'; // <-- Importamos utilidades de Storage

// =============================================================================
// ESTADO DE LA APLICACIÓN
// =============================================================================

let currentState: UiState = { status: 'idle' };
let lastSearchQuery = '';
let currentData: Country[] = []; // Guardamos los datos actuales para poder filtrarlos sin volver a llamar a la API

// =============================================================================
// REFERENCIAS A ELEMENTOS DEL DOM
// =============================================================================

let searchInput: HTMLInputElement;
let regionFilter: HTMLSelectElement;
let searchButton: HTMLButtonElement;
let retryButton: HTMLButtonElement;
let loadingState: HTMLElement;
let errorState: HTMLElement;
let errorMessage: HTMLElement;
let emptyState: HTMLElement;
let noResultsState: HTMLElement;
let noResultsMessage: HTMLElement;
let countriesList: HTMLElement;
// Nuevos elementos
let favoritesToggle: HTMLInputElement;
let clearFavoritesBtn: HTMLButtonElement;

function initializeElements(): void {
  searchInput = getRequiredElement<HTMLInputElement>('#searchInput');
  regionFilter = getRequiredElement<HTMLSelectElement>('#regionFilter');
  searchButton = getRequiredElement<HTMLButtonElement>('#searchButton');
  retryButton = getRequiredElement<HTMLButtonElement>('#retryButton');
  loadingState = getRequiredElement<HTMLElement>('#loadingState');
  errorState = getRequiredElement<HTMLElement>('#errorState');
  errorMessage = getRequiredElement<HTMLElement>('#errorMessage');
  emptyState = getRequiredElement<HTMLElement>('#emptyState');
  noResultsState = getRequiredElement<HTMLElement>('#noResultsState');
  noResultsMessage = getRequiredElement<HTMLElement>('#noResultsMessage');
  countriesList = getRequiredElement<HTMLElement>('#countriesList');
  
  // Elementos de favoritos
  favoritesToggle = getRequiredElement<HTMLInputElement>('#favoritesToggle');
  clearFavoritesBtn = getRequiredElement<HTMLButtonElement>('#clearFavoritesBtn');
}

// =============================================================================
// FUNCIONES DE RENDERIZADO DE ESTADO
// =============================================================================

function hideAllStates(): void {
  hideElement(loadingState);
  hideElement(errorState);
  hideElement(emptyState);
  hideElement(noResultsState);
  hideElement(countriesList);
}

function render(state: UiState): void {
  currentState = state;
  hideAllStates();

  switch (state.status) {
    case 'idle':
      showElement(emptyState);
      break;

    case 'loading':
      showElement(loadingState);
      break;

    case 'success':
      if (state.data.length === 0) {
        showElement(noResultsState);
        noResultsMessage.textContent = '😕 No se encontraron países con los filtros actuales.';
      } else {
        showElement(countriesList);
        renderCountryList(state.data, countriesList, handleCountryClick);
      }
      break;

    case 'error':
      showElement(errorState);
      errorMessage.textContent = state.message;
      break;

    case 'empty':
      showElement(noResultsState);
      noResultsMessage.textContent = '😕 No se encontraron países.';
      break;

    default: {
      const _exhaustiveCheck: never = state;
      console.error('Estado no manejado:', _exhaustiveCheck);
    }
  }
}

// =============================================================================
// LÓGICA DE BÚSQUEDA Y FILTRADO
// =============================================================================

/**
 * Aplica los filtros locales (región y favoritos) a los datos que ya tenemos.
 */
function applyLocalFilters(countries: Country[]): void {
  const selectedRegion = regionFilter.value;
  const showOnlyFavorites = favoritesToggle.checked;

  let filtered = countries;

  // Filtro por región
  if (selectedRegion) {
    filtered = filtered.filter(c => c.region === selectedRegion);
  }

  // Filtro por favoritos
  if (showOnlyFavorites) {
    filtered = filtered.filter(c => isFavorite(c.cca3));
  }

  if (filtered.length === 0) {
    render({ status: 'success', data: [] }); // Mostramos mensaje de no resultados pero sin error
  } else {
    render({ status: 'success', data: filtered });
  }
}

async function handleSearch(): Promise<void> {
  const query = searchInput.value.trim();
  const showOnlyFavorites = favoritesToggle.checked;

  // Si la búsqueda está vacía pero queremos ver favoritos, 
  // idealmente deberías llamar a una función que traiga todos los países
  // Como no sé si tienes `getAllCountries` en tu API, si está vacía la mandamos a 'idle'
  // A MENOS que estemos mostrando favoritos, ahí podríamos necesitar manejarlo diferente.
  // Por ahora, mantendremos tu lógica: si no hay query, vamos a idle.
  if (query.length === 0 && !showOnlyFavorites) {
    render({ status: 'idle' });
    lastSearchQuery = '';
    currentData = [];
    return;
  }

  const currentSearchKey = `${query}`;
  
  // Si la búsqueda no ha cambiado, solo reaplicamos filtros locales
  if (currentSearchKey === lastSearchQuery && currentData.length > 0) {
    applyLocalFilters(currentData);
    return;
  }

  lastSearchQuery = currentSearchKey;
  render({ status: 'loading' });

  try {
    // Si la búsqueda está vacía pero queremos favoritos, asumimos que necesitas todos
    // Nota: Si no tienes getAllCountries en countryApi.ts, puede que necesites modificar esta parte
    let countries = [];
    if (query.length > 0) {
      countries = await searchCountries(query);
    } else {
      // Si llegamos aquí es porque query está vacío pero showOnlyFavorites es true.
      // Sería ideal tener un método para obtener todos. Por ahora, dejamos la alerta visual.
      render({ status: 'empty' });
      noResultsMessage.textContent = 'Debes buscar algo para ver resultados.';
      return;
    }

    currentData = countries;
    applyLocalFilters(currentData);

  } catch (error) {
    let message = 'Error desconocido al buscar países';
    if (error instanceof ApiError) {
      message = error.message;
    } else if (error instanceof Error) {
      message = error.message;
    }
    render({ status: 'error', message });
    console.error('Error en búsqueda:', error);
  }
}

// =============================================================================
// MANEJADORES DE EVENTOS
// =============================================================================

function handleCountryClick(country: Country): void {
  openModal(country);
}

function handleRetry(): void {
  handleSearch();
}

function handleClearFavorites(): void {
  if (confirm('¿Estás seguro de que quieres limpiar todos tus favoritos?')) {
    clearAllFavorites();
    // Re-renderizamos los datos actuales para actualizar la vista de los corazones
    if (currentState.status === 'success' || currentData.length > 0) {
      applyLocalFilters(currentData);
    }
  }
}

// Escuchamos el evento personalizado del corazón que creamos en CountryCard.ts
function handleFavoriteChanged(): void {
  // Si estamos en la vista de "Solo favoritos" y desmarcamos uno, debemos actualizar la lista
  if (favoritesToggle.checked && currentData.length > 0) {
    applyLocalFilters(currentData);
  }
}

function setupEventListeners(): void {
  const debouncedSearch = debounce(() => {
    void handleSearch();
  }, 400);

  searchInput.addEventListener('input', debouncedSearch);
  searchButton.addEventListener('click', () => { void handleSearch(); });
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { void handleSearch(); }
  });
  
  // Eventos para los filtros
  regionFilter.addEventListener('change', () => {
    if (currentData.length > 0) applyLocalFilters(currentData);
  });

  favoritesToggle.addEventListener('change', () => {
    // Si hay datos, filtramos; si no, forzamos búsqueda
    if (currentData.length > 0 || searchInput.value.trim().length > 0) {
      void handleSearch();
    } else {
      // Si no hay búsqueda previa y tocas favoritos, se queda en idle
      // a menos que cambies el API para traer todos los favoritos
      alert("Busca un país primero para filtrar entre tus favoritos.");
      favoritesToggle.checked = false;
    }
  });

  clearFavoritesBtn.addEventListener('click', handleClearFavorites);
  retryButton.addEventListener('click', handleRetry);

  // Escuchar evento personalizado de cambio de favorito
  document.addEventListener('favorite-changed', handleFavoriteChanged as EventListener);
}

function initializeApp(): void {
  try {
    initializeElements();
    setupEventListeners();
    render({ status: 'idle' });
    searchInput.focus();
    console.log('Country Explorer inicializado correctamente');
  } catch (error) {
    console.error('Error al inicializar la aplicación:', error);
  }
}

onDOMReady(initializeApp);