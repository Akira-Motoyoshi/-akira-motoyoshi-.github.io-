const scenes = window.CAREER_SCENES || [];
const routeColor = "#56e2a6";
const activeColor = "#f5c85b";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const els = {
  counter: document.querySelector("#scene-counter"),
  year: document.querySelector("#scene-year"),
  title: document.querySelector("#scene-title"),
  place: document.querySelector("#scene-place"),
  photo: document.querySelector("#scene-photo"),
  photoCredit: document.querySelector("#photo-credit"),
  kitCard: document.querySelector("#kit-card"),
  kitShirt: document.querySelector("#kit-shirt"),
  kitLabel: document.querySelector("#kit-label"),
  distance: document.querySelector("#scene-distance"),
  coordinates: document.querySelector("#scene-coordinates"),
  progress: document.querySelector("#timeline-progress"),
  previous: document.querySelector("#previous"),
  playToggle: document.querySelector("#play-toggle"),
  next: document.querySelector("#next"),
  overview: document.querySelector("#overview"),
  copyCoordinates: document.querySelector("#copy-coordinates"),
  dock: document.querySelector("#scene-dock")
};

if (!scenes.length) {
  throw new Error("No career scenes found.");
}

maplibregl.setRTLTextPlugin(
  "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js",
  null,
  true
);

const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/liberty",
  center: scenes[0].coordinates,
  zoom: 4.2,
  pitch: 56,
  bearing: scenes[0].bearing - 80,
  attributionControl: true,
  antialias: false,
  maxPitch: 75
});

map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: false }), "top-left");
map.scrollZoom.disable();

let currentIndex = 0;
let playing = true;
let runToken = 0;
let autoTimer = 0;
let currentPopup = null;

const cumulativeDistances = scenes.reduce((totals, scene, index) => {
  if (index === 0) return [0];
  totals.push(totals[index - 1] + distanceKm(scenes[index - 1].coordinates, scene.coordinates));
  return totals;
}, []);

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatCoordinates([lon, lat]) {
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

function commonsImageUrl(file, width = 520) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
}

function setCredit(photo) {
  els.photoCredit.textContent = "";
  const source = document.createElement("a");
  source.href = photo.source;
  source.target = "_blank";
  source.rel = "noopener";
  source.textContent = photo.credit;
  const license = document.createElement("a");
  license.href = photo.licenseUrl;
  license.target = "_blank";
  license.rel = "noopener";
  license.textContent = photo.license;
  els.photoCredit.append("Photo: ", source, " / ", license);
}

function updateVisuals(scene) {
  if (scene.photo) {
    els.photo.src = commonsImageUrl(scene.photo.file);
    els.photo.alt = scene.photo.alt;
    setCredit(scene.photo);
  }

  if (scene.kit) {
    els.kitCard.hidden = false;
    els.kitCard.setAttribute("aria-label", `${scene.kit.label} kit`);
    els.kitLabel.textContent = scene.kit.label;
    els.kitShirt.className = `kit-shirt ${scene.kit.pattern}`;
    els.kitShirt.style.setProperty("--kit-a", scene.kit.primary);
    els.kitShirt.style.setProperty("--kit-b", scene.kit.secondary);
    els.kitShirt.style.setProperty("--kit-c", scene.kit.accent || "#ffffff");
  } else {
    els.kitCard.hidden = true;
  }
}

function distanceKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const lon1 = toRad(a[0]);
  const lat1 = toRad(a[1]);
  const lon2 = toRad(b[0]);
  const lat2 = toRad(b[1]);
  const dLon = lon2 - lon1;
  const dLat = lat2 - lat1;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function emptyCollection() {
  return { type: "FeatureCollection", features: [] };
}

function routeFeature(throughIndex = scenes.length - 1) {
  const coordinates = scenes.slice(0, throughIndex + 1).map((scene) => scene.coordinates);
  return {
    type: "FeatureCollection",
    features:
      coordinates.length > 1
        ? [
            {
              type: "Feature",
              properties: { name: "Messi route" },
              geometry: { type: "LineString", coordinates }
            }
          ]
        : []
  };
}

function pointFeatures() {
  return {
    type: "FeatureCollection",
    features: scenes.map((scene, index) => ({
      type: "Feature",
      properties: {
        id: scene.id,
        index,
        title: scene.title,
        year: scene.year
      },
      geometry: { type: "Point", coordinates: scene.coordinates }
    }))
  };
}

function setSourceData(id, data) {
  const source = map.getSource(id);
  if (source) source.setData(data);
}

function setPlayButton() {
  els.playToggle.textContent = playing ? "Pause" : "Play";
  els.playToggle.setAttribute("aria-label", playing ? "Pause autoplay" : "Play autoplay");
}

function updatePanel(index) {
  const scene = scenes[index];
  els.counter.textContent = `${String(index + 1).padStart(2, "0")} / ${scenes.length}`;
  els.year.textContent = scene.year;
  els.title.textContent = scene.title;
  els.place.textContent = `${scene.city}, ${scene.country}`;
  els.coordinates.textContent = formatCoordinates(scene.coordinates);
  els.distance.textContent = `${Math.round(cumulativeDistances[index]).toLocaleString()} km route`;
  updateVisuals(scene);
  els.progress.style.width = `${((index + 1) / scenes.length) * 100}%`;
  document.querySelectorAll(".scene-dot").forEach((button, buttonIndex) => {
    const active = buttonIndex === index;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "step" : "false");
  });
  if (map.getStyle()?.layers?.length && map.getLayer("career-point-active")) {
    map.setFilter("career-point-active", ["==", ["get", "index"], index]);
  }
}

function popupHtml(scene) {
  return `
    <p class="popup-year">${scene.year}</p>
    <h3 class="popup-title">${scene.title}</h3>
    <p class="popup-copy">${scene.city}, ${scene.country}</p>
  `;
}

function showPopup(scene) {
  if (currentPopup) currentPopup.remove();
  currentPopup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 24,
    anchor: "bottom"
  })
    .setLngLat(scene.coordinates)
    .setHTML(popupHtml(scene))
    .addTo(map);
}

function clearPopup() {
  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }
}

function waitForMove(token, fallbackMs) {
  return new Promise((resolve) => {
    if (token !== runToken || reduceMotion) {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    window.setTimeout(finish, fallbackMs + 350);
    map.once("moveend", finish);
  });
}

function routeBounds() {
  const bounds = new maplibregl.LngLatBounds(scenes[0].coordinates, scenes[0].coordinates);
  scenes.forEach((scene) => bounds.extend(scene.coordinates));
  return bounds;
}

function addThreeDimensionalBuildings() {
  const style = map.getStyle();
  const sourceId = style.sources.openmaptiles
    ? "openmaptiles"
    : Object.keys(style.sources).find((id) => style.sources[id].type === "vector");
  if (!sourceId || map.getLayer("career-3d-buildings")) return;

  const labelLayer = style.layers.find((layer) => layer.type === "symbol" && layer.layout && layer.layout["text-field"]);
  map.addLayer(
    {
      id: "career-3d-buildings",
      source: sourceId,
      "source-layer": "building",
      type: "fill-extrusion",
      minzoom: 13,
      paint: {
        "fill-extrusion-color": [
          "interpolate",
          ["linear"],
          ["zoom"],
          13,
          "rgba(35, 49, 44, 0.48)",
          16,
          "rgba(86, 226, 166, 0.54)"
        ],
        "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 13, 0, 16, 28],
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": 0.64,
        "fill-extrusion-vertical-gradient": true
      }
    },
    labelLayer ? labelLayer.id : undefined
  );
}

function addRoutesAndPoints() {
  map.addSource("route-full", { type: "geojson", data: routeFeature() });
  map.addSource("route-progress", { type: "geojson", data: emptyCollection() });
  map.addSource("career-points", { type: "geojson", data: pointFeatures() });

  map.addLayer({
    id: "route-full-line",
    type: "line",
    source: "route-full",
    paint: {
      "line-color": routeColor,
      "line-width": ["interpolate", ["linear"], ["zoom"], 2, 1.2, 14, 4],
      "line-opacity": 0.24
    }
  });

  map.addLayer({
    id: "route-progress-line",
    type: "line",
    source: "route-progress",
    paint: {
      "line-color": routeColor,
      "line-width": ["interpolate", ["linear"], ["zoom"], 2, 2.4, 14, 7],
      "line-opacity": 0.9,
      "line-blur": 0.6
    }
  });

  map.addLayer({
    id: "career-point-halos",
    type: "circle",
    source: "career-points",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 5, 14, 14],
      "circle-color": routeColor,
      "circle-opacity": 0.18,
      "circle-stroke-width": 1,
      "circle-stroke-color": "rgba(255,255,255,0.7)"
    }
  });

  map.addLayer({
    id: "career-point-dots",
    type: "circle",
    source: "career-points",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2.8, 14, 6],
      "circle-color": "#101511",
      "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 2, 1.8, 14, 3],
      "circle-stroke-color": routeColor
    }
  });

  map.addLayer({
    id: "career-point-active",
    type: "circle",
    source: "career-points",
    filter: ["==", ["get", "index"], 0],
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 7, 14, 16],
      "circle-color": activeColor,
      "circle-stroke-width": 3,
      "circle-stroke-color": "#fff8df"
    }
  });

  map.on("click", "career-point-dots", (event) => {
    const feature = event.features && event.features[0];
    if (!feature) return;
    jumpTo(Number(feature.properties.index));
  });
  map.on("mouseenter", "career-point-dots", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "career-point-dots", () => {
    map.getCanvas().style.cursor = "";
  });
}

function buildSceneDock() {
  els.dock.innerHTML = "";
  scenes.forEach((scene, index) => {
    const button = document.createElement("button");
    button.className = "scene-dot";
    button.type = "button";
    button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><b>${scene.title}</b>`;
    button.setAttribute("aria-label", `Go to ${scene.title}`);
    button.addEventListener("click", () => jumpTo(index));
    els.dock.append(button);
  });
}

async function playScene(index, options = {}) {
  currentIndex = (index + scenes.length) % scenes.length;
  const token = ++runToken;
  const scene = scenes[currentIndex];
  const previous = scenes[(currentIndex - 1 + scenes.length) % scenes.length];
  const jump = options.jump === true;

  window.clearTimeout(autoTimer);
  clearPopup();
  map.stop();
  updatePanel(currentIndex);
  setSourceData("route-progress", currentIndex === 0 ? emptyCollection() : routeFeature(currentIndex));

  const km = distanceKm(previous.coordinates, scene.coordinates);
  const approachZoom = clamp(km > 6000 ? 2.35 : km > 1400 ? 4.2 : km > 180 ? 7.5 : scene.zoom - 2.1, 2.2, 12.7);
  const approachDuration = reduceMotion ? 0 : jump ? 750 : scene.duration;
  const revealDuration = reduceMotion ? 0 : jump ? 800 : clamp(scene.duration * 0.62, 1800, 3200);
  const orbitDuration = reduceMotion ? 0 : jump ? 900 : scene.orbitDuration;

  map.flyTo({
    center: scene.coordinates,
    zoom: approachZoom,
    pitch: clamp(scene.pitch - 7, 50, 72),
    bearing: scene.bearing - 118,
    duration: approachDuration,
    curve: km > 5000 ? 2.25 : 1.7,
    easing: (t) => t * t * (3 - 2 * t),
    essential: true
  });
  await waitForMove(token, approachDuration);
  if (token !== runToken) return;

  map.easeTo({
    center: scene.coordinates,
    zoom: scene.zoom,
    pitch: clamp(scene.pitch, 54, 75),
    bearing: scene.bearing,
    duration: revealDuration,
    easing: (t) => 1 - Math.pow(1 - t, 3),
    essential: true
  });
  await waitForMove(token, revealDuration);
  if (token !== runToken) return;

  showPopup(scene);

  map.easeTo({
    center: scene.coordinates,
    zoom: scene.zoom + 0.12,
    pitch: clamp(scene.pitch + 2, 54, 75),
    bearing: scene.bearing + scene.orbitBearingDelta,
    duration: orbitDuration,
    easing: (t) => t,
    essential: true
  });
  await waitForMove(token, orbitDuration);
  if (token !== runToken || !playing) return;

  autoTimer = window.setTimeout(() => {
    if (token === runToken && playing) playScene(currentIndex + 1);
  }, reduceMotion ? 900 : 1200);
}

function jumpTo(index) {
  playing = false;
  setPlayButton();
  playScene(index, { jump: true });
}

function setPlaying(nextPlaying) {
  playing = nextPlaying;
  setPlayButton();
  if (!playing) {
    ++runToken;
    window.clearTimeout(autoTimer);
    map.stop();
    return;
  }
  playScene(currentIndex, { jump: true });
}

function showOverview() {
  playing = false;
  setPlayButton();
  ++runToken;
  window.clearTimeout(autoTimer);
  clearPopup();
  setSourceData("route-progress", routeFeature());
  map.fitBounds(routeBounds(), {
    padding: { top: 120, right: 120, bottom: 120, left: 460 },
    duration: reduceMotion ? 0 : 1000,
    pitch: 0,
    bearing: 0
  });
}

async function copyCoordinates() {
  const text = formatCoordinates(scenes[currentIndex].coordinates);
  try {
    await navigator.clipboard.writeText(text);
    els.copyCoordinates.textContent = "Copied";
    window.setTimeout(() => {
      els.copyCoordinates.textContent = "Copy coords";
    }, 1200);
  } catch {
    els.copyCoordinates.textContent = text;
  }
}

els.playToggle.addEventListener("click", () => setPlaying(!playing));
els.next.addEventListener("click", () => jumpTo(currentIndex + 1));
els.previous.addEventListener("click", () => jumpTo(currentIndex - 1));
els.overview.addEventListener("click", showOverview);
els.copyCoordinates.addEventListener("click", copyCoordinates);

document.addEventListener("keydown", (event) => {
  if (event.key === " ") {
    event.preventDefault();
    setPlaying(!playing);
  }
  if (event.key === "ArrowRight") jumpTo(currentIndex + 1);
  if (event.key === "ArrowLeft") jumpTo(currentIndex - 1);
});

buildSceneDock();
updatePanel(0);
setPlayButton();

map.on("load", () => {
  addThreeDimensionalBuildings();
  addRoutesAndPoints();
  updatePanel(currentIndex);
  window.setTimeout(() => playScene(0), reduceMotion ? 0 : 450);
});

map.on("error", (event) => {
  console.warn("MapLibre error", event.error || event);
});
