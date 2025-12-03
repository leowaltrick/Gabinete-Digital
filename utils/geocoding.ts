
export const getCoordinates = async (address: string): Promise<{ lat: number; lon: number } | null> => {
  try {
    // Basic validation to avoid useless requests
    if (!address || address.length < 5) return null;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const response = await fetch(url, { 
        headers: { 'User-Agent': 'GabineteDigitalApp/1.0' } 
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data && data.length > 0) {
      return { 
          lat: parseFloat(data[0].lat), 
          lon: parseFloat(data[0].lon) 
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};
