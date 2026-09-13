// =========================================
// WEATHER DASHBOARD
// STEP 4 — API SETUP
// =========================================


// =========================================
// 1. API ENDPOINTS
// =========================================

const GEOCODING_API =
    "https://geocoding-api.open-meteo.com/v1/search";

const WEATHER_API =
    "https://api.open-meteo.com/v1/forecast";


// =========================================
// 2. DOM ELEMENTS
// =========================================

const weatherForm =
    document.getElementById("weather-form");

const cityInput =
    document.getElementById("city-input");

const searchButton =
    document.getElementById("search-button");

const statusMessage =
    document.getElementById("status-message");

const loading =
    document.getElementById("loading");

const errorMessage =
    document.getElementById("error-message");


// Weather output elements

const weatherLocation =
    document.getElementById("weather-location");

const weatherIcon =
    document.getElementById("weather-icon");

const lastUpdated =
    document.getElementById("last-updated");

const temperature =
    document.getElementById("temperature");

const humidity =
    document.getElementById("humidity");

const windSpeed =
    document.getElementById("wind-speed");

const weatherCondition =
    document.getElementById("weather-condition");

const feelsLike =
    document.getElementById("feels-like");

const pressure =
    document.getElementById("pressure");


// =========================================
// 3. WEATHER CODE MAPPING
// =========================================

const weatherCodes = {

    0: "Clear sky",

    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",

    45: "Fog",
    48: "Depositing rime fog",

    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",

    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",

    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",

    66: "Light freezing rain",
    67: "Heavy freezing rain",

    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",

    77: "Snow grains",

    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",

    85: "Slight snow showers",
    86: "Heavy snow showers",

    95: "Thunderstorm",

    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
};

// =========================================
// WEATHER ICON MAPPING
// =========================================

const weatherIcons = {

    0: "☀️",

    1: "🌤️",
    2: "⛅",
    3: "☁️",

    45: "🌫️",
    48: "🌫️",

    51: "🌦️",
    53: "🌦️",
    55: "🌧️",

    56: "🌧️",
    57: "🌧️",

    61: "🌧️",
    63: "🌧️",
    65: "🌧️",

    66: "🌧️",
    67: "🌧️",

    71: "🌨️",
    73: "🌨️",
    75: "❄️",

    77: "❄️",

    80: "🌦️",
    81: "🌧️",
    82: "⛈️",

    85: "🌨️",
    86: "❄️",

    95: "⛈️",
    96: "⛈️",
    99: "⛈️"
};

// =========================================
// 4. HELPER FUNCTIONS
// =========================================

function showLoading() {

    loading.hidden = false;

    errorMessage.hidden = true;

    statusMessage.textContent =
        "Fetching weather data...";

    searchButton.disabled = true;

    searchButton.textContent =
        "Searching...";
}


function hideLoading() {

    loading.hidden = true;

    searchButton.disabled = false;

    searchButton.textContent =
        "Search";

    cityInput.focus();
}


function showError(message) {

    errorMessage.hidden = false;

    errorMessage.querySelector("p").textContent =
        message;

    statusMessage.textContent = "";

}


function hideError() {

    errorMessage.hidden = true;
}


// =========================================
// 5. GET WEATHER DESCRIPTION
// =========================================

function getWeatherDescription(code) {

    return weatherCodes[code] ||
        "Unknown weather condition";
}


// =========================================
// 6. FORM EVENT
// =========================================

weatherForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        // Get and clean city name

        const city =
            cityInput.value.trim();


        // Validate input

        if (!city) {

            showError(
                "Please enter a city name."
            );

            cityInput.focus();

            return;
        }


        try {

            // Start loading

            showLoading();

            hideError();


            // Clear previous status

            statusMessage.textContent =
                "Searching for weather information...";


            // Get coordinates

            const location =
                await getCityCoordinates(city);


            // Get weather

            const weather =
                await getWeatherData(
                    location.latitude,
                    location.longitude
                );


            // Display result

            displayWeather(
                location,
                weather
            );


        } catch (error) {

            console.error(
                "Weather request failed:",
                error
            );


            showError(
                error.message ||
                "Unable to fetch weather information."
            );


        } finally {

            // Always restore the UI

            hideLoading();

        }

    }
);

// =========================================
// FETCH WITH TIMEOUT
// =========================================

async function fetchWithTimeout(
    url,
    timeout = 10000
) {

    const controller =
        new AbortController();

    const timeoutId =
        setTimeout(
            () => controller.abort(),
            timeout
        );

    try {

        const response =
            await fetch(
                url,
                {
                    signal: controller.signal
                }
            );

        return response;

    } finally {

        clearTimeout(timeoutId);

    }
}
// =========================================
// 7. GET CITY COORDINATES
// =========================================

async function getCityCoordinates(city) {

    const url =
        `${GEOCODING_API}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

    try {

        const response =
            await fetchWithTimeout(url);

        if (!response.ok) {

            throw new Error(
                `Location service returned error ${response.status}.`
            );
        }

        const data =
            await response.json();

        if (
            !data.results ||
            data.results.length === 0
        ) {

            throw new Error(
                `No location found for "${city}". Please check the city name.`
            );
        }

        return data.results[0];

    } catch (error) {

        if (error.name === "AbortError") {

            throw new Error(
                "The location request took too long. Please try again."
            );
        }

        if (error instanceof TypeError) {

            throw new Error(
                "Network error. Please check your internet connection."
            );
        }

        throw error;
    }
}

// =========================================
// 8. GET WEATHER DATA
// =========================================

async function getWeatherData(
    latitude,
    longitude
) {

    const url =
        `${WEATHER_API}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure&wind_speed_unit=kmh&timezone=auto`;

    try {

        const response =
            await fetchWithTimeout(url);

        if (!response.ok) {

            throw new Error(
                `Weather service returned error ${response.status}.`
            );
        }

        const data =
            await response.json();

        if (!data.current) {

            throw new Error(
                "The weather service returned incomplete data."
            );
        }

        return data;

    } catch (error) {

        if (error.name === "AbortError") {

            throw new Error(
                "The weather request timed out. Please try again."
            );
        }

        if (error instanceof TypeError) {

            throw new Error(
                "Network error. Please check your internet connection."
            );
        }

        throw error;
    }
}


// =========================================
// 9. DISPLAY WEATHER
// =========================================

function displayWeather(
    location,
    data
) {

    const current =
        data.current;


    // =====================================
    // LOCATION
    // =====================================

    weatherLocation.textContent =
        `${location.name}, ${location.country}`;


    // =====================================
    // WEATHER ICON
    // =====================================

    weatherIcon.textContent =
        getWeatherIcon(
            current.weather_code
        );


    // =====================================
    // TEMPERATURE
    // =====================================

    temperature.textContent =
        `${Math.round(
            current.temperature_2m
        )} °C`;


    // =====================================
    // HUMIDITY
    // =====================================

    humidity.textContent =
        `${current.relative_humidity_2m} %`;


    // =====================================
    // WIND SPEED
    // =====================================

    windSpeed.textContent =
        `${Math.round(
            current.wind_speed_10m
        )} km/h`;


    // =====================================
    // WEATHER CONDITION
    // =====================================

    weatherCondition.textContent =
        getWeatherDescription(
            current.weather_code
        );


    // =====================================
    // FEELS LIKE
    // =====================================

    feelsLike.textContent =
        `${Math.round(
            current.apparent_temperature
        )} °C`;


    // =====================================
    // PRESSURE
    // =====================================

    pressure.textContent =
        `${Math.round(
            current.surface_pressure
        )} hPa`;


    // =====================================
    // LAST UPDATED
    // =====================================

    const updatedTime =
        new Date().toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );


    lastUpdated.textContent =
        `Last updated: ${updatedTime}`;


    // =====================================
    // STATUS
    // =====================================

    statusMessage.textContent =
        `Weather updated for ${location.name}.`;
}
// =========================================
// GET WEATHER ICON
// =========================================

function getWeatherIcon(code) {

    return weatherIcons[code] || "🌡️";

}

/* =========================================================
   DYNAMIC WEATHER + DAY/NIGHT BACKGROUND
   ========================================================= */

function updateWeatherBackground(weatherData) {
    if (!weatherData) return;

    /*
     * Get weather condition from OpenWeatherMap response.
     * Example:
     * Clear, Clouds, Rain, Drizzle, Thunderstorm, Snow, Mist
     */
    const weatherCondition =
        weatherData.weather?.[0]?.main?.toLowerCase() || 'clear';

    /*
     * OpenWeatherMap provides Unix timestamps
     * for sunrise and sunset.
     */
    const sunrise = weatherData.sys?.sunrise;
    const sunset = weatherData.sys?.sunset;

    /*
     * Current time in seconds.
     */
    const currentTime = Math.floor(Date.now() / 1000);

    /*
     * Determine whether it is currently night.
     */
    const isNight =
        sunrise &&
        sunset &&
        (currentTime < sunrise || currentTime >= sunset);

    /*
     * Remove old weather classes.
     */
    document.body.classList.remove(
        'weather-clear',
        'weather-clouds',
        'weather-rain',
        'weather-drizzle',
        'weather-storm',
        'weather-snow',
        'weather-mist',
        'weather-fog',
        'weather-haze',
        'weather-day',
        'weather-night'
    );

    /*
     * Add day/night class.
     */
    document.body.classList.add(
        isNight ? 'weather-night' : 'weather-day'
    );

    /*
     * Add weather-specific class.
     */
    switch (weatherCondition) {

        case 'clear':
            document.body.classList.add('weather-clear');
            break;

        case 'clouds':
            document.body.classList.add('weather-clouds');
            break;

        case 'rain':
            document.body.classList.add('weather-rain');
            break;

        case 'drizzle':
            document.body.classList.add('weather-drizzle');
            break;

        case 'thunderstorm':
            document.body.classList.add('weather-storm');
            break;

        case 'snow':
            document.body.classList.add('weather-snow');
            break;

        case 'mist':
            document.body.classList.add('weather-mist');
            break;

        case 'fog':
            document.body.classList.add('weather-fog');
            break;

        case 'haze':
            document.body.classList.add('weather-haze');
            break;

        default:
            document.body.classList.add('weather-clear');
            break;
    }

    /*
     * Update background periodically.
     *
     * This allows the application to automatically switch
     * from day → night without refreshing the page.
     */
    scheduleDayNightUpdate(weatherData);
}


/* =========================================================
   AUTOMATIC DAY/NIGHT UPDATE
   ========================================================= */

let backgroundTimer = null;

function scheduleDayNightUpdate(weatherData) {

    if (backgroundTimer) {
        clearTimeout(backgroundTimer);
    }

    /*
     * Re-check the day/night state every minute.
     */
    backgroundTimer = setTimeout(() => {

        updateWeatherBackground(weatherData);

    }, 60 * 1000);
}


/* =========================================================
   OPTIONAL: ADD ATMOSPHERIC PARTICLES
   ========================================================= */

function createWeatherParticles() {

    /*
     * Prevent duplicate particle containers.
     */
    if (document.querySelector('.weather-particles')) {
        return;
    }

    const particles = document.createElement('div');

    particles.className = 'weather-particles';

    particles.setAttribute('aria-hidden', 'true');

    document.body.appendChild(particles);
}

createWeatherParticles();