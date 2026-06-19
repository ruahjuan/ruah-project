function handleNavigation() {
  // Ajuste: limpiar posibles barras finales para evitar errores de matching
  const path = location.pathname.replace(/\/$/, "");
  const pathMatch = path.match(/^\/cancion\/(.+)$/);
  const hashMatch = location.hash.match(/^#(?:cancion\/)?(.+)$/);
  
  const songId = pathMatch ? decodeURIComponent(pathMatch[1].trim())
               : hashMatch ? decodeURIComponent(hashMatch[1].trim())
               : null;
               
  if (songId) {
    const exists = songs.find(s => s.id === songId);
    if (exists) { 
      showView('songs'); 
      openSong(songId); 
      return; 
    }
  }
  showView('home');
}