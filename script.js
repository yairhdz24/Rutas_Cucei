// Ruta de la imagen
const IMAGE_SRC = "Mapa.webp";

// Dimensiones del canvas
const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 1400;

// Variables principales
let canvas, ctx;
let mapImage = new Image();
let points = [];
let scale = 1.0;
let offsetX = 0, offsetY = 0;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let dragged = false;
let savedRoutes = [];

// Variable para controlar el modo actual: "draw" o "move"
let currentMode = "draw";

// Rango de zoom permitido
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;

window.addEventListener("load", () => {
  canvas = document.getElementById("myCanvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  ctx = canvas.getContext("2d");

  // Establecer cursor según el modo inicial ("draw")
  canvas.style.cursor = "crosshair";

  // Cargar imagen y dibujar
  mapImage.src = IMAGE_SRC;
  mapImage.onload = () => redrawAll();

  // Eventos para agregar puntos (sólo en modo "draw") y zoom
  canvas.addEventListener("click", onCanvasClick);
  canvas.addEventListener("wheel", onZoom);

  // Eventos para panning (sólo se activan en modo "move")
  canvas.addEventListener("mousedown", startPan);
  canvas.addEventListener("mousemove", pan);
  canvas.addEventListener("mouseup", endPan);
  canvas.addEventListener("mouseleave", endPan);

  // Sliders
  document.getElementById("horizontalSlider").addEventListener("input", moveHorizontally);
  document.getElementById("verticalSlider").addEventListener("input", moveVertically);
  document.getElementById("zoomSlider").addEventListener("input", handleZoomSlider);

  // Botones de modo
  document.getElementById("btnMoveMode").addEventListener("click", () => {
    currentMode = "move";
    canvas.style.cursor = "grab";
    alert("Modo Mover activado. Ahora puedes arrastrar el mapa sin agregar puntos.");
  });
  document.getElementById("btnDrawMode").addEventListener("click", () => {
    currentMode = "draw";
    canvas.style.cursor = "crosshair";
    alert("Modo Pintar Ruta activado. Ahora puedes hacer clic para agregar puntos.");
  });

  // Botones de control
  document.getElementById("btnSaveRoute").addEventListener("click", saveRouteToJSON);
  document.getElementById("btnDownloadRoutes").addEventListener("click", downloadRoutes);
  document.getElementById("btnUndo").addEventListener("click", undoLastPoint);
  document.getElementById("btnClear").addEventListener("click", clearCanvas);

  // Cargar rutas previas
  loadSavedRoutes();
});

function onCanvasClick(e) {
  // Solo se agregan puntos en modo "draw"
  if (currentMode !== "draw") return;
  // Si se detectó arrastre, no se agrega el punto
  if (dragged) {
    dragged = false;
    return;
  }
  const { x, y } = getMousePosition(e);
  points.push({ x, y });
  redrawAll();
}

function getMousePosition(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
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

  // Dibujar las líneas de la ruta (si hay más de un punto)
  if (points.length > 1) {
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2 / scale;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
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
  let newScale = parseFloat(e.target.value);
  // Centrar el zoom en el centro del canvas
  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT / 2;
  const worldX = (centerX - offsetX) / scale;
  const worldY = (centerY - offsetY) / scale;
  offsetX = centerX - worldX * newScale;
  offsetY = centerY - worldY * newScale;
  scale = newScale;
  redrawAll();
}

function onZoom(e) {
  e.preventDefault();
  const scaleFactor = 1.1;
  let newScale = scale * (e.deltaY < 0 ? scaleFactor : 1 / scaleFactor);
  newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  // Coordenadas en el "mundo" antes del zoom
  const worldX = (mouseX - offsetX) / scale;
  const worldY = (mouseY - offsetY) / scale;
  // Actualizar offset para centrar el zoom en el puntero
  offsetX = mouseX - worldX * newScale;
  offsetY = mouseY - worldY * newScale;
  scale = newScale;
  document.getElementById("zoomSlider").value = scale;
  redrawAll();
}

function startPan(e) {
  // Solo se activa el panning en modo "move"
  if (currentMode !== "move") return;
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragged = false;
  canvas.style.cursor = "grabbing";
}

function pan(e) {
  if (!isDragging || currentMode !== "move") return;
  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;
  if (Math.sqrt(dx * dx + dy * dy) > 5) {
    dragged = true;
  }
  offsetX += dx;
  offsetY += dy;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  // Actualizar sliders para reflejar el movimiento
  document.getElementById("horizontalSlider").value = offsetX;
  document.getElementById("verticalSlider").value = offsetY;
  redrawAll();
}

function endPan() {
  if (currentMode !== "move") return;
  isDragging = false;
  canvas.style.cursor = "grab";
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
    coordinates: points.map((p) => [p.x, p.y]),
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
  savedRoutes.forEach((route) => {
    const routeElement = document.createElement("div");
    routeElement.innerHTML = `<strong>${route.name}</strong> (${route.coordinates.length} puntos)`;
    routesContainer.appendChild(routeElement);
  });
}
