// =========================================
// WEATHER DASHBOARD
// DYNAMIC WEATHER + DAY/NIGHT BACKGROUND
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
// 4. WEATHER ICON MAPPING
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
// 5. BACKGROUND STATE
// =========================================

let currentWeatherData = null;

let backgroundTimer = null;


// =========================================
// 6. HELPER FUNCTIONS
// =========================================

function showLoading() {

    loading.hidden = false;

    errorMessage.hidden = true;

    statusMessage.textContent =
        "Fetching weather data...";

    searchButton.disabled = true;
}


function hideLoading() {

    loading.hidden = true;

    searchButton.disabled = false;
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
// 7. GET WEATHER DESCRIPTION
// =========================================

function getWeatherDescription(code) {

    return weatherCodes[code] ||
        "Unknown weather condition";
}


// =========================================
// 8. FETCH WITH TIMEOUT
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
// 9. GET CITY COORDINATES
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
// 10. GET WEATHER DATA
// =========================================

async function getWeatherData(
    latitude,
    longitude
) {

    /*
     * Added:
     *
     * daily=sunrise,sunset
     *
     * This allows the application to determine
     * the actual day/night cycle for the searched city.
     */

    const url =
        `${WEATHER_API}?latitude=${latitude}&longitude=${longitude}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure,is_day` +
        `&daily=sunrise,sunset` +
        `&wind_speed_unit=kmh` +
        `&timezone=auto`;

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
// 11. FORM EVENT
// =========================================

weatherForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        const city =
            cityInput.value.trim();


        // Prevent empty searches

        if (!city) {

            showError(
                "Please enter a city name."
            );

            return;
        }


        try {

            showLoading();

            hideError();


            // Step 1:
            // Find city coordinates

            const location =
                await getCityCoordinates(city);


            // Step 2:
            // Fetch weather using coordinates

            const weather =
                await getWeatherData(
                    location.latitude,
                    location.longitude
                );


            // Step 3:
            // Display weather

            displayWeather(
                location,
                weather
            );


            // Step 4:
            // Update dynamic background

            updateWeatherBackground(weather);

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

            hideLoading();
        }
    }
);


// =========================================
// 12. DISPLAY WEATHER
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
// 13. GET WEATHER ICON
// =========================================

function getWeatherIcon(code) {

    return weatherIcons[code] ||
        "🌡️";
}


// =========================================================
// 14. DYNAMIC WEATHER + DAY/NIGHT BACKGROUND
// =========================================================

function updateWeatherBackground(data) {

    if (!data || !data.current) {
        return;
    }


    // Save latest weather data

    currentWeatherData = data;


    const weatherCode =
        Number(data.current.weather_code);


    /*
     * Remove every previous background state.
     */

    document.body.classList.remove(

        "weather-clear",
        "weather-clouds",
        "weather-rain",
        "weather-drizzle",
        "weather-snow",
        "weather-storm",
        "weather-fog",
        "weather-mist",
        "weather-haze",

        "weather-day",
        "weather-night"
    );


    // =====================================
    // DETERMINE DAY / NIGHT
    // =====================================

    const isNight =
        determineNightState(data);


    if (isNight) {

        document.body.classList.add(
            "weather-night"
        );

    } else {

        document.body.classList.add(
            "weather-day"
        );
    }


    // =====================================
    // DETERMINE WEATHER TYPE
    // =====================================

    const weatherType =
        getWeatherBackgroundType(
            weatherCode
        );


    document.body.classList.add(
        `weather-${weatherType}`
    );


    /*
     * Add a data attribute too.
     *
     * This is useful if you later want CSS such as:
     *
     * body[data-weather="rain"]
     */

    document.body.dataset.weather =
        weatherType;


    document.body.dataset.time =
        isNight
            ? "night"
            : "day";


    // =====================================
    // UPDATE PARTICLES
    // =====================================

    updateWeatherParticles(
        weatherType
    );


    // =====================================
    // CHECK AGAIN LATER
    // =====================================

    scheduleBackgroundUpdate();
}


// =========================================================
// 15. DETERMINE DAY / NIGHT
// =========================================================

function determineNightState(data) {

    /*
     * Open-Meteo provides is_day:
     *
     * 1 = day
     * 0 = night
     *
     * Use it first because it directly describes
     * the current weather observation.
     */

    if (
        data.current &&
        typeof data.current.is_day !== "undefined"
    ) {

        return Number(
            data.current.is_day
        ) === 0;
    }


    /*
     * Fallback:
     *
     * Compare current time with sunrise/sunset.
     */

    if (
        data.daily &&
        data.daily.sunrise &&
        data.daily.sunset
    ) {

        const sunrise =
            new Date(
                data.daily.sunrise[0]
            );

        const sunset =
            new Date(
                data.daily.sunset[0]
            );

        const now =
            new Date();

        return (
            now < sunrise ||
            now >= sunset
        );
    }


    /*
     * Final fallback:
     *
     * Use the browser's local clock.
     */

    const hour =
        new Date().getHours();

    return (
        hour < 6 ||
        hour >= 18
    );
}


// =========================================================
// 16. WEATHER TYPE CLASSIFICATION
// =========================================================

function getWeatherBackgroundType(code) {

    /*
     * CLEAR
     */

    if (code === 0) {

        return "clear";
    }


    /*
     * CLOUDS
     */

    if (
        code === 1 ||
        code === 2 ||
        code === 3
    ) {

        return "clouds";
    }


    /*
     * FOG / MIST
     */

    if (
        code === 45 ||
        code === 48
    ) {

        return "fog";
    }


    /*
     * DRIZZLE
     */

    if (
        code === 51 ||
        code === 53 ||
        code === 55 ||
        code === 56 ||
        code === 57
    ) {

        return "drizzle";
    }


    /*
     * RAIN
     */

    if (
        code === 61 ||
        code === 63 ||
        code === 65 ||
        code === 66 ||
        code === 67 ||
        code === 80 ||
        code === 81 ||
        code === 82
    ) {

        return "rain";
    }


    /*
     * SNOW
     */

    if (
        code === 71 ||
        code === 73 ||
        code === 75 ||
        code === 77 ||
        code === 85 ||
        code === 86
    ) {

        return "snow";
    }


    /*
     * THUNDERSTORM
     */

    if (
        code === 95 ||
        code === 96 ||
        code === 99
    ) {

        return "storm";
    }


    /*
     * DEFAULT
     */

    return "clear";
}


// =========================================================
// 17. WEATHER PARTICLES
// =========================================================

function updateWeatherParticles(
    weatherType
) {

    let particles =
        document.querySelector(
            ".weather-particles"
        );


    /*
     * Create particle layer only once.
     */

    if (!particles) {

        particles =
            document.createElement(
                "div"
            );

        particles.className =
            "weather-particles";

        particles.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.appendChild(
            particles
        );
    }


    /*
     * Clear previous particle type.
     */

    particles.className =
        "weather-particles";


    /*
     * Add weather-specific particle class.
     */

    if (
        weatherType === "rain" ||
        weatherType === "drizzle"
    ) {

        particles.classList.add(
            "rain-particles"
        );
    }


    if (
        weatherType === "snow"
    ) {

        particles.classList.add(
            "snow-particles"
        );
    }


    if (
        weatherType === "storm"
    ) {

        particles.classList.add(
            "storm-particles"
        );
    }
}


// =========================================================
// 18. AUTOMATIC DAY/NIGHT CHECK
// =========================================================

function scheduleBackgroundUpdate() {

    /*
     * Cancel previous timer.
     */

    if (backgroundTimer) {

        clearTimeout(
            backgroundTimer
        );
    }


    /*
     * Check again every minute.
     *
     * This allows the interface to transition
     * from day → night without refreshing.
     */

    backgroundTimer =
        setTimeout(
            () => {

                if (
                    currentWeatherData
                ) {

                    updateWeatherBackground(
                        currentWeatherData
                    );
                }

            },
            60 * 1000
        );
}


// =========================================================
// 19. INITIAL PARTICLE LAYER
// =========================================================

function initializeWeatherBackground() {

    if (
        !document.querySelector(
            ".weather-particles"
        )
    ) {

        const particles =
            document.createElement(
                "div"
            );

        particles.className =
            "weather-particles";

        particles.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.appendChild(
            particles
        );
    }
}


initializeWeatherBackground();


// =========================================================
// 20. INITIAL DEFAULT BACKGROUND
// =========================================================

/*
 * Before the user searches for a city,
 * give the application a neutral daytime
 * weather state.
 */

document.body.classList.add(
    "weather-day",
    "weather-clear"
);


// =========================================================
// 21. CONSOLE CONFIRMATION
// =========================================================

console.log(
    "Weather Dashboard JavaScript loaded successfully."
);

/* =========================================================
   CURRENT LOCATION WEATHER
   ========================================================= */

const locationButton =
    document.getElementById("location-button");


/*
 * Get weather using the user's current
 * browser/device location.
 */
function getCurrentLocationWeather() {

    if (!navigator.geolocation) {

        showLocationError(
            "Geolocation is not supported by your browser."
        );

        return;
    }


    locationButton.disabled = true;

    locationButton.textContent =
        "📍 Locating...";


    if (statusMessage) {

        statusMessage.textContent =
            "Getting your current location...";
    }


    navigator.geolocation.getCurrentPosition(

        async function (position) {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;


            console.log(
                "Current coordinates:",
                latitude,
                longitude
            );


            try {

                /*
                 * IMPORTANT:
                 *
                 * This uses the Open-Meteo API,
                 * which matches your existing
                 * weather application.
                 */

                const weatherURL =
                    `${WEATHER_API}` +
                    `?latitude=${latitude}` +
                    `&longitude=${longitude}` +
                    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure,is_day` +
                    `&daily=sunrise,sunset` +
                    `&wind_speed_unit=kmh` +
                    `&timezone=auto`;


                const response =
                    await fetchWithTimeout(
                        weatherURL
                    );


                if (!response.ok) {

                    throw new Error(
                        "Unable to fetch weather for your location."
                    );
                }


                const weather =
                    await response.json();


                /*
                 * Get city name from coordinates.
                 *
                 * Open-Meteo's reverse geocoding
                 * endpoint is used here.
                 */

                const locationURL =
                    `https://geocoding-api.open-meteo.com/v1/reverse` +
                    `?latitude=${latitude}` +
                    `&longitude=${longitude}` +
                    `&language=en` +
                    `&format=json`;


                let location = {

                    name: "Your Location",

                    country: ""
                };


                try {

                    const locationResponse =
                        await fetchWithTimeout(
                            locationURL
                        );


                    if (locationResponse.ok) {

                        const locationData =
                            await locationResponse.json();


                        if (
                            locationData.results &&
                            locationData.results.length > 0
                        ) {

                            const result =
                                locationData.results[0];


                            location = {

                                name:
                                    result.name ||
                                    result.city ||
                                    result.town ||
                                    result.village ||
                                    "Your Location",

                                country:
                                    result.country ||
                                    ""
                            };
                        }
                    }

                } catch (locationError) {

                    console.warn(
                        "Could not determine city name:",
                        locationError
                    );
                }


                /*
                 * Use the SAME display system
                 * as your city search.
                 */

                displayWeather(
                    location,
                    weather
                );


                /*
                 * Update your dynamic
                 * weather/day-night background.
                 */

                updateWeatherBackground(
                    weather
                );


                if (statusMessage) {

                    statusMessage.textContent =
                        `Showing weather for your current location.`;
                }


            } catch (error) {

                console.error(
                    "Current location weather error:",
                    error
                );


                showLocationError(
                    error.message ||
                    "Unable to fetch weather for your current location."
                );

            } finally {

                locationButton.disabled =
                    false;

                locationButton.textContent =
                    "📍 My Location";
            }
        },


        function (error) {

            console.error(
                "Geolocation error:",
                error
            );


            let message;


            switch (error.code) {

                case error.PERMISSION_DENIED:

                    message =
                        "Location permission was denied. Please allow location access in your browser.";

                    break;


                case error.POSITION_UNAVAILABLE:

                    message =
                        "Your current location could not be determined.";

                    break;


                case error.TIMEOUT:

                    message =
                        "Location request timed out. Please try again.";

                    break;


                default:

                    message =
                        "Unable to determine your current location.";
            }


            showLocationError(message);


            locationButton.disabled =
                false;

            locationButton.textContent =
                "📍 My Location";
        },


        {
            enableHighAccuracy: true,

            timeout: 10000,

            maximumAge: 300000
        }
    );
}


/* =========================================================
   LOCATION ERROR
   ========================================================= */

function showLocationError(message) {

    if (
        typeof showError === "function"
    ) {

        showError(message);

    } else if (errorMessage) {

        errorMessage.hidden =
            false;

        const errorText =
            errorMessage.querySelector("p");

        if (errorText) {

            errorText.textContent =
                message;
        }
    }
}


/* =========================================================
   LOCATION BUTTON EVENT
   ========================================================= */

if (locationButton) {

    locationButton.addEventListener(
        "click",
        getCurrentLocationWeather
    );
}