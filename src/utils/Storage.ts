const FAVORITES_KEY = 'country_explorer_favorites';

// Obtiene la lista de favoritos actuales
export const getFavorites = (): string[] => {
  const favorites = localStorage.getItem(FAVORITES_KEY);
  return favorites ? JSON.parse(favorites) : [];
};

// Guarda la lista de favoritos
export const saveFavorites = (favorites: string[]): void => {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
};

// Añade o quita un país de favoritos (devuelve true si se añadió, false si se quitó)
export const toggleFavoriteStorage = (countryId: string): boolean => {
  const favorites = getFavorites();
  const index = favorites.indexOf(countryId);
  let isNowFavorite = false;

  if (index === -1) {
    // No está en favoritos, lo agregamos
    favorites.push(countryId);
    isNowFavorite = true;
  } else {
    // Ya está en favoritos, lo quitamos
    favorites.splice(index, 1);
    isNowFavorite = false;
  }

  saveFavorites(favorites);
  return isNowFavorite;
};

// Verifica si un país específico es favorito
export const isFavorite = (countryId: string): boolean => {
  const favorites = getFavorites();
  return favorites.includes(countryId);
};

// Limpia todos los favoritos
export const clearAllFavorites = (): void => {
  localStorage.removeItem(FAVORITES_KEY);
};