const scenes = window.CAREER_SCENES;
const routeColors = {
  Messi: "#48c7ff",
  Ronaldo: "#f5b84b"
};

const els = {
  counter: document.querySelector("#scene-counter"),
  person: document.querySelector("#scene-person"),
  year: document.querySelector("#scene-year"),
  title: document.querySelector("#scene-title"),
  place: document.querySelector("#scene-place"),
  description: document.querySelector("#scene-description"),
  progress: document.querySelector("#timeline-progress"),
  previous: document.querySelector("#previous"),
  playToggle: document.querySelector("#play-toggle"),
  next: document.querySelector("#next")
};

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
  pitch: 58,
  bearing: scenes[0].bearing - 95,
  attributionControl: true,
  antialias: true,
  maxPitch: 75
});

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
map.scrollZoom.disable();

let currentIndex = 0;
let playing = true;
let runToken = 0;
let currentPopup = null;
let segmentAnimation = null;
const markers = new Map();

function personClass(scene) {
  return scene.person === "Ronaldo" ? "ronaldo" : "messi";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updatePanel(index) {
  const scene = scenes[index];
  els.counter.textContent = `${String(index + 1).padStart(2, "0")} / ${scenes.length}`;
  els.person.textContent = scene.person;
  els.person.classList.toggle("ronaldo", scene.person === "Ronaldo");
  els.year.textContent = scene.year;
  els.title.textContent = scene.title;
  els.place.textContent = `${scene.city}, ${scene.country}`;
  els.place.classList.toggle("ronaldo", scene.person === "Ronaldo");
  els.description.textContent = scene.description;
  els.playToggle.classList.toggle("ronaldo", scene.person === "Ronaldo");
  els.progress.style.width = `${((index + 1) / scenes.length) * 100}%`;
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

function buildRoute(person, throughIndex = scenes.length - 1) {
  return scenes
    .slice(0, throughIndex + 1)
    .filter((scene) => scene.person === person)
    .map((scene) => scene.coordinates);
}

function routeFeature(person, throughIndex = scenes.length - 1) {
  const coords = buildRoute(person, throughIndex);
  return {
    type: "FeatureCollection",
    features:
      coords.length > 1
        ? [
            {
              type: "Feature",
              properties: { person },
              geometry: {
                type: "LineString",
                coordinates: coords
              }
            }
          ]
        : []
  };
}

function emptyCollection() {
  return { type: "FeatureCollection", features: [] };
}

function setSourceData(id, data) {
  const source = map.getSource(id);
  if (source) {
    source.setData(data);
  }
}

function updateCompletedRoutes(index) {
  setSourceData("messi-progress", routeFeature("Messi", index));
  setSourceData("ronaldo-progress", routeFeature("Ronaldo", index));
}

function updateActiveMarker(index) {
  markers.forEach((marker, sceneId) => {
    marker.getElement().classList.toggle("active", sceneId === scenes[index].id);
  });
}

function popupHtml(scene) {
  const klass = personClass(scene);
  return `
    <p class="popup-person ${klass}">${scene.person} / ${scene.year}</p>
    <h3 class="popup-title">${scene.title}</h3>
    <p class="popup-copy">${scene.description}</p>
  `;
}

function showPopup(scene) {
  if (currentPopup) {
    currentPopup.remove();
  }
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

function waitForMove(token, fallbackMs) {
  return new Promise((resolve) => {
    if (token !== runToken) {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    window.setTimeout(finish, fallbackMs + 500);
    map.once("moveend", finish);
  });
}

function sleep(ms, token) {
  return new Promise((resolve) => {
    const started = performance.now();
    const tick = () => {
      if (token !== runToken || !playing) {
        resolve();
        return;
      }
      if (performance.now() - started >= ms) {
        resolve();
        return;
      }
      window.setTimeout(tick, 120);
    };
    tick();
  });
}

function interpolateCoordinates(a, b, progress) {
  return [
    a[0] + (b[0] - a[0]) * progress,
    a[1] + (b[1] - a[1]) * progress
  ];
}

function animateSegment(previous, next, duration, token) {
  if (segmentAnimation) {
    cancelAnimationFrame(segmentAnimation);
  }

  const start = performance.now();
  const person = next.person;
  const baseCoords = buildRoute(person, currentIndex - 1);
  const sourceId = person === "Messi" ? "messi-progress" : "ronaldo-progress";

  const frame = (now) => {
    if (token !== runToken || !playing) {
      return;
    }
    const progress = clamp((now - start) / duration, 0, 1);
    const coords = [...baseCoords, interpolateCoordinates(previous.coordinates, next.coordinates, progress)];
    setSourceData(sourceId, {
      type: "FeatureCollection",
      features:
        coords.length > 1
          ? [
              {
                type: "Feature",
                properties: { person },
                geometry: {
                  type: "LineString",
                  coordinates: coords
                }
              }
            ]
          : []
    });
    if (progress < 1) {
      segmentAnimation = requestAnimationFrame(frame);
    }
  };

  segmentAnimation = requestAnimationFrame(frame);
}

function addThreeDimensionalBuildings() {
  const style = map.getStyle();
  const sourceId = style.sources.openmaptiles ? "openmaptiles" : Object.keys(style.sources).find((id) => style.sources[id].type === "vector");
  if (!sourceId || map.getLayer("career-3d-buildings")) {
    return;
  }

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
          "rgba(42, 68, 95, 0.58)",
          16,
          "rgba(124, 184, 220, 0.72)"
        ],
        "fill-extrusion-height": [
          "interpolate",
          ["linear"],
          ["zoom"],
          13,
          0,
          16,
          28
        ],
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": 0.68,
        "fill-extrusion-vertical-gradient": true
      }
    },
    labelLayer ? labelLayer.id : undefined
  );
}

function addRoutesAndMarkers() {
  const messiRoute = routeFeature("Messi");
  const ronaldoRoute = routeFeature("Ronaldo");
  const pointFeatures = scenes.map((scene, index) => ({
    type: "Feature",
    properties: {
      id: scene.id,
      person: scene.person,
      title: scene.title,
      order: index + 1
    },
    geometry: {
      type: "Point",
      coordinates: scene.coordinates
    }
  }));

  map.addSource("messi-route", { type: "geojson", data: messiRoute });
  map.addSource("ronaldo-route", { type: "geojson", data: ronaldoRoute });
  map.addSource("messi-progress", { type: "geojson", data: routeFeature("Messi", 0) });
  map.addSource("ronaldo-progress", { type: "geojson", data: routeFeature("Ronaldo", 0) });
  map.addSource("career-points", {
    type: "geojson",
    data: { type: "FeatureCollection", features: pointFeatures }
  });

  map.addLayer({
    id: "messi-route-line",
    type: "line",
    source: "messi-route",
    paint: {
      "line-color": routeColors.Messi,
      "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.5, 14, 5],
      "line-opacity": 0.34
    }
  });

  map.addLayer({
    id: "ronaldo-route-line",
    type: "line",
    source: "ronaldo-route",
    paint: {
      "line-color": routeColors.Ronaldo,
      "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.5, 14, 5],
      "line-opacity": 0.3
    }
  });

  map.addLayer({
    id: "messi-progress-line",
    type: "line",
    source: "messi-progress",
    paint: {
      "line-color": routeColors.Messi,
      "line-width": ["interpolate", ["linear"], ["zoom"], 3, 3, 14, 8],
      "line-opacity": 0.9,
      "line-blur": 1.1
    }
  });

  map.addLayer({
    id: "ronaldo-progress-line",
    type: "line",
    source: "ronaldo-progress",
    paint: {
      "line-color": routeColors.Ronaldo,
      "line-width": ["interpolate", ["linear"], ["zoom"], 3, 3, 14, 8],
      "line-opacity": 0.9,
      "line-blur": 1.1
    }
  });

  map.addLayer({
    id: "career-point-halos",
    type: "circle",
    source: "career-points",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 3, 14, 12],
      "circle-color": [
        "match",
        ["get", "person"],
        "Ronaldo",
        routeColors.Ronaldo,
        routeColors.Messi
      ],
      "circle-opacity": 0.18,
      "circle-stroke-width": 1,
      "circle-stroke-color": "rgba(255,255,255,0.52)"
    }
  });

  scenes.forEach((scene) => {
    const el = document.createElement("div");
    el.className = `career-marker ${personClass(scene)}`;
    const marker = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat(scene.coordinates)
      .addTo(map);
    markers.set(scene.id, marker);
  });
}

async function playScene(index, options = {}) {
  currentIndex = (index + scenes.length) % scenes.length;
  const token = ++runToken;
  const scene = scenes[currentIndex];
  const previous = scenes[(currentIndex - 1 + scenes.length) % scenes.length];
  const jump = options.jump === true;
  playing = options.keepPaused ? false : playing;

  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }
  map.stop();
  updatePanel(currentIndex);
  updateActiveMarker(currentIndex);
  updateCompletedRoutes(currentIndex - 1);

  const km = distanceKm(previous.coordinates, scene.coordinates);
  const approachZoom = clamp(km > 6000 ? 2.25 : km > 1400 ? 4.1 : km > 180 ? 7.4 : scene.zoom - 2.2, 2.2, 12.6);
  const approachDuration = jump ? 900 : scene.duration;
  const revealDuration = jump ? 900 : clamp(scene.duration * 0.72, 2400, 4200);
  const orbitDuration = jump ? 1300 : scene.orbitDuration;

  if (previous.person === scene.person && currentIndex > 0) {
    animateSegment(previous, scene, approachDuration + revealDuration, token);
  }

  map.flyTo({
    center: scene.coordinates,
    zoom: approachZoom,
    pitch: clamp(scene.pitch - 6, 55, 75),
    bearing: scene.bearing - 128,
    duration: approachDuration,
    curve: km > 5000 ? 2.4 : 1.8,
    easing: (t) => t * t * (3 - 2 * t),
    essential: true
  });
  await waitForMove(token, approachDuration);
  if (token !== runToken || !playing) return;

  map.easeTo({
    center: scene.coordinates,
    zoom: scene.zoom,
    pitch: clamp(scene.pitch, 55, 75),
    bearing: scene.bearing,
    duration: revealDuration,
    easing: (t) => 1 - Math.pow(1 - t, 3),
    essential: true
  });
  await waitForMove(token, revealDuration);
  if (token !== runToken || !playing) return;

  showPopup(scene);
  updateCompletedRoutes(currentIndex);

  map.easeTo({
    center: scene.coordinates,
    zoom: scene.zoom + 0.18,
    pitch: clamp(scene.pitch + 2, 55, 75),
    bearing: scene.bearing + scene.orbitBearingDelta,
    duration: orbitDuration,
    easing: (t) => t,
    essential: true
  });
  await waitForMove(token, orbitDuration);
  if (token !== runToken || !playing) return;

  await sleep(1100, token);
  if (token === runToken && playing) {
    playScene(currentIndex + 1);
  }
}

function setPlaying(nextPlaying) {
  playing = nextPlaying;
  els.playToggle.textContent = playing ? "Pause" : "Play";
  els.playToggle.setAttribute("aria-label", playing ? "Pause autoplay" : "Play autoplay");
  if (!playing) {
    ++runToken;
    map.stop();
    return;
  }
  playScene(currentIndex, { jump: true });
}

els.playToggle.addEventListener("click", () => setPlaying(!playing));
els.next.addEventListener("click", () => {
  playing = true;
  els.playToggle.textContent = "Pause";
  playScene(currentIndex + 1, { jump: true });
});
els.previous.addEventListener("click", () => {
  playing = true;
  els.playToggle.textContent = "Pause";
  playScene(currentIndex - 1, { jump: true });
});

document.addEventListener("keydown", (event) => {
  if (event.key === " ") {
    event.preventDefault();
    setPlaying(!playing);
  }
  if (event.key === "ArrowRight") {
    playScene(currentIndex + 1, { jump: true });
  }
  if (event.key === "ArrowLeft") {
    playScene(currentIndex - 1, { jump: true });
  }
});

map.on("load", () => {
  addThreeDimensionalBuildings();
  addRoutesAndMarkers();
  updatePanel(0);
  updateActiveMarker(0);
  setSourceData("messi-progress", emptyCollection());
  setSourceData("ronaldo-progress", emptyCollection());
  window.setTimeout(() => playScene(0), 550);
});

map.on("error", (event) => {
  console.warn("MapLibre error", event.error || event);
});
