// script.js

// Ruta de la imagen
const IMAGE_SRC = "MapaBeta.webp";

// Dimensiones del canvas (ajustadas al tamaño real del contenedor)
const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 1400;

// Variables principales
let canvas, ctx;
let mapImage = new Image();
let points = [];
let scale = 1.0;
let offsetX = 0, offsetY = 0;
let isDragging = false;
let lastX, lastY;
let savedRoutes = [];

// Rango de zoom permitido
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;

// Inicializar el canvas
window.addEventListener("load", () => {
  canvas = document.getElementById("myCanvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  ctx = canvas.getContext("2d");

  // Cargar imagen y dibujar
  mapImage.src = IMAGE_SRC;
  mapImage.onload = () => redrawAll();

  // Eventos
  canvas.addEventListener("click", onCanvasClick);
  canvas.addEventListener("wheel", onZoom);
  canvas.addEventListener("mousedown", startPan);
  canvas.addEventListener("mousemove", pan);
  canvas.addEventListener("mouseup", endPan);
  
  // Sliders
  document.getElementById("horizontalSlider").addEventListener("input", moveHorizontally);
  document.getElementById("verticalSlider").addEventListener("input", moveVertically);
  document.getElementById("zoomSlider").addEventListener("input", handleZoomSlider);

  // Botones
  document.getElementById("btnSaveRoute").addEventListener("click", saveRouteToJSON);
  document.getElementById("btnDownloadRoutes").addEventListener("click", downloadRoutes);
  document.getElementById("btnUndo").addEventListener("click", undoLastPoint);
  document.getElementById("btnClear").addEventListener("click", clearCanvas);

  // Cargar rutas previas
  loadSavedRoutes();
});

function onCanvasClick(e) {
  const { x, y } = getMousePosition(e);
  points.push({ x, y });
  redrawAll();
}

function getMousePosition(e) {
  const rect = canvas.getBoundingClientRect();
  
  // Obtener la posición real del mouse en el canvas
  const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  
  // Ajustar por el zoom y offset
  const x = (mouseX - offsetX) / scale;
  const y = (mouseY - offsetY) / scale;
  
  return { x, y };
}

function redrawAll() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  
  // Dibujar el mapa
  ctx.drawImage(mapImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Dibujar las líneas
  if (points.length > 1) {
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2 / scale;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  }
  
  // Dibujar los puntos
  ctx.fillStyle = "blue";
  for (let p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 / scale, 0, 2 * Math.PI);
    ctx.fill();
  }
  
  ctx.restore();
}

function handleZoomSlider(e) {
  scale = parseFloat(e.target.value);
  redrawAll();
}

function onZoom(e) {
  e.preventDefault();
  const scaleFactor = 1.1;
  let newScale = scale * (e.deltaY < 0 ? scaleFactor : 1 / scaleFactor);

  scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
  document.getElementById("zoomSlider").value = scale;

  redrawAll();
}

function startPan(e) {
  isDragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
}

function pan(e) {
  if (!isDragging) return;
  
  offsetX += e.clientX - lastX;
  offsetY += e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;

  redrawAll();
}

function endPan() {
  isDragging = false;
}

function moveHorizontally(e) {
  offsetX = parseInt(e.target.value);
  redrawAll();
}

function moveVertically(e) {
  offsetY = parseInt(e.target.value);
  redrawAll();
}

function saveRouteToJSON() {
  if (points.length < 2) {
    alert("Debes agregar al menos 2 puntos.");
    return;
  }

  const routeName = prompt("Nombre de la ruta:");
  if (!routeName) return;

  const newRoute = {
    name: routeName,
    coordinates: points.map(p => [p.x, p.y])
  };

  savedRoutes.push(newRoute);
  localStorage.setItem("savedRoutes", JSON.stringify(savedRoutes));

  points = [];
  redrawAll();
  
  alert(`Ruta "${routeName}" guardada.`);
  updateRoutesList();
}

function loadSavedRoutes() {
  const storedRoutes = localStorage.getItem("savedRoutes");
  if (storedRoutes) {
    savedRoutes = JSON.parse(storedRoutes);
    updateRoutesList();
  }
}

function downloadRoutes() {
  if (savedRoutes.length === 0) {
    alert("No hay rutas guardadas.");
    return;
  }

  const jsonContent = JSON.stringify({ routes: savedRoutes }, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "rutas.json";
  link.click();

  alert("Archivo JSON descargado.");
}

function undoLastPoint() {
  if (points.length > 0) {
    points.pop();
    redrawAll();
  } else {
    alert("No hay puntos para deshacer.");
  }
}

function clearCanvas() {
  points = [];
  redrawAll();
}

function updateRoutesList() {
  const routesContainer = document.getElementById("routesList");
  routesContainer.innerHTML = "";
  
  savedRoutes.forEach((route, index) => {
    const routeElement = document.createElement("div");
    routeElement.innerHTML = `<strong>${route.name}</strong> (${route.coordinates.length} puntos)`;
    routesContainer.appendChild(routeElement);
  });
}