import "./styles/main.scss";

const cityForm = document.querySelector("#cityForm");
const cityInput = document.querySelector("#city");
const countryInput = document.querySelector("#country");

const latInput = document.querySelector("#lat");
const lngInput = document.querySelector("#lng");
const coordsBtn = document.querySelector("#coordsBtn");

const placeEl = document.querySelector("#place");
const tempEl = document.querySelector("#temp");
const feelsEl = document.querySelector("#feels");
const rainEl = document.querySelector("#rain");
const errorEl = document.querySelector("#error");

const appEl = document.querySelector(".app");

// Startwaarde
cityInput.value = "Antwerpen";
countryInput.value = "BE";

function isRainingFromCode(code) {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
}

function setTheme({ weather_code, isDay, precipitation }) {
  appEl.classList.remove("theme--sun", "theme--cloud", "theme--rain", "theme--night");

  const raining = precipitation > 0 || isRainingFromCode(weather_code);

  if (!isDay) return appEl.classList.add("theme--night");
  if (raining) return appEl.classList.add("theme--rain");

  if ((weather_code >= 1 && weather_code <= 3) || (weather_code >= 45 && weather_code <= 48)) {
    return appEl.classList.add("theme--cloud");
  }

  appEl.classList.add("theme--sun");
}

function getWeatherVisual(code, isDay) {
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { emoji: "🌧️", text: "Regen (nu)" };
  }

  if ((code >= 45 && code <= 48) || code === 3) {
    return { emoji: "☁️", text: "Bewolkt" };
  }

  if (code === 1 || code === 2) {
    return { emoji: "🌤️", text: "Licht bewolkt" };
  }

  if (code === 0) {
    return isDay ? { emoji: "☀️", text: "Zonnig" } : { emoji: "🌙", text: "Helder (nacht)" };
  }

  return { emoji: "☁️", text: "Onbekend weer" };
}

async function geocodeCity(city, country) {
  const cleanCity = city.trim();
  const cleanCountry = country.trim().toUpperCase();

  // ✅ Hard fix: Belgische Hoboken is ambigu in free geocoding
  if (cleanCity.toLowerCase() === "hoboken" && cleanCountry === "BE") {
    return {
      lat: 51.171,
      lng: 4.348,
      label: "Hoboken, Antwerpen, België",
      country_code: "BE",
    };
  }

  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(cleanCity)}` +
    `&count=5&language=nl&format=json` +
    (cleanCountry ? `&country=${encodeURIComponent(cleanCountry)}` : "");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding error: ${res.status}`);

  const data = await res.json();
  if (!data.results || data.results.length === 0) throw new Error("Geen stad gevonden.");

  let r = data.results[0];
  if (cleanCountry) {
    const match = data.results.find((x) => x.country_code === cleanCountry);
    if (!match) throw new Error(`Geen stad gevonden in ${cleanCountry}.`);
    r = match;
  }

  return {
    lat: r.latitude,
    lng: r.longitude,
    label: `${r.name}${r.admin1 ? ", " + r.admin1 : ""}${r.country ? ", " + r.country : ""}`,
    country_code: r.country_code,
  };
}

async function fetchWeather(lat, lng) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,apparent_temperature,precipitation,weather_code,is_day` +
    `&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather error: ${res.status}`);

  const data = await res.json();
  return data.current;
}

async function updateByCity(city, country) {
  errorEl.textContent = "";
  tempEl.textContent = "-- °C";
  feelsEl.textContent = "Voelt als: -- °C";
  rainEl.textContent = "Laden...";

  try {
    if (/^\d{4}$/.test(city.trim())) {
      throw new Error("Gebruik een plaatsnaam (bv. Hoboken), geen postcode.");
    }

    const geo = await geocodeCity(city, country);

    placeEl.textContent = geo.label;

    // Alleen automatisch invullen als gebruiker niets heeft ingevuld
    if (!countryInput.value.trim() && geo.country_code) {
      countryInput.value = geo.country_code;
    }

    // lat/lng tonen (en gebruiker kan ze daarna nog manueel aanpassen)
    latInput.value = geo.lat.toFixed(4);
    lngInput.value = geo.lng.toFixed(4);

    const current = await fetchWeather(geo.lat, geo.lng);

    const temp = Math.round(current.temperature_2m);
    const feels = Math.round(current.apparent_temperature);

    const precipitation = current.precipitation;
    const code = current.weather_code;
    const isDay = current.is_day === 1;

    tempEl.textContent = `${temp} °C`;
    feelsEl.textContent = `Voelt als: ${feels} °C`;

    const visual = getWeatherVisual(code, isDay);
    rainEl.textContent = `${visual.emoji} ${visual.text}`;

    setTheme({ weather_code: code, isDay, precipitation });
  } catch (err) {
    errorEl.textContent = err.message;
    rainEl.textContent = "--";
  }
}

async function updateByCoords(latRaw, lngRaw) {
  errorEl.textContent = "";
  tempEl.textContent = "-- °C";
  feelsEl.textContent = "Voelt als: -- °C";
  rainEl.textContent = "Laden...";

  try {
    const lat = Number(latRaw);
    const lng = Number(lngRaw);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new Error("Vul geldige latitude en longitude in.");
    }

    placeEl.textContent = `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    const current = await fetchWeather(lat, lng);

    const temp = Math.round(current.temperature_2m);
    const feels = Math.round(current.apparent_temperature);

    const precipitation = current.precipitation;
    const code = current.weather_code;
    const isDay = current.is_day === 1;

    tempEl.textContent = `${temp} °C`;
    feelsEl.textContent = `Voelt als: ${feels} °C`;

    const visual = getWeatherVisual(code, isDay);
    rainEl.textContent = `${visual.emoji} ${visual.text}`;

    setTheme({ weather_code: code, isDay, precipitation });
  } catch (err) {
    errorEl.textContent = err.message;
    rainEl.textContent = "--";
  }
}

cityForm.addEventListener("submit", (e) => {
  e.preventDefault();
  updateByCity(cityInput.value.trim(), countryInput.value.trim());
});

coordsBtn.addEventListener("click", () => {
  updateByCoords(latInput.value, lngInput.value);
});

// init
updateByCity("Antwerpen", "BE");
