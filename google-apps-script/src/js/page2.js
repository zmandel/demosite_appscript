/**
 * This is a 2nd sample front page for a Google Apps Script web app, where it does a few things a little differently,
 * to demonstrate the flexibility of the framework by making several asynchronous calls to maximize the first load time. It:
 * - initializes the session
 * - During that initialization, and before the DOM is ready, it waits in parallel for:
 *    - external library "library1" (Three.js) to load
 *    - external library "library2" (GSAP) to load
 *    - a backend call (simulated in this demo) to respond.
 * - waits for the DOM to be ready
 * - calls "postSiteInited" but with a parameter to avoid stopping the website parent progress bar.
 * - it then waits for all the 3 promises to resolve
 * - loads a 3d scene with both libraries (Three.js and GSAP).
 * - sends a custom event to the parent website to notify that the site is fully loaded (so it stops its progress bar).
 * - sends a custom event to change the page title to "page 2 - new title" to demonstrate how the framework can modify the page title.
 * - sends a custom analytics event "customEvent2"
 */

/** helper */
const waitForEvent = (eventName) => {
  return new Promise((resolve) => {
    if (eventName in window && window[eventName]) {
      resolve();
      return;
    }
    const listener = () => {
      document.removeEventListener(eventName, listener);
      resolve();
    };

    document.addEventListener(eventName, listener);
  });
};


initializeSession(() => {
  //call the backend the earliest possible, before content loaded
  const library1Promise = waitForEvent('library1Loaded');
  const library2Promise = waitForEvent('library2Loaded');
  const backendPromise = new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(); //note it also resolves on errors
    }, 3000);
  });


  if (document.readyState !== "loading")
    onDomContentLoaded();
  else
    document.addEventListener('DOMContentLoaded', () => onDomContentLoaded());

  function onDomContentLoaded() {
    postSiteInited({ dontStopProgress: true });
    Promise.all([backendPromise, library1Promise, library2Promise])
      .then(startSession)
      .catch((error) => {
        console.error('Error loading resources:', error);
        alert(error.message);
      });
  }
});

function startSession() {
  postSiteMessage("siteFullyLoaded"); //tell the website to stop the "loading" progress
  loadScene();
  postSiteMessage("titleChange", { title: "page 2 - new title" }); //demo a page title change
  setTimeout(() => {
    analytics("customEvent2"); //demo an analytics event
  }, 1000);
}

function loadScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x17026b);

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1.5, 4);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  const div = document.createElement('div');
  div.textContent = 'Section visible second, after having loaded remote libraries and backend data.';
  document.body.appendChild(div);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const ambientLight = new THREE.AmbientLight(0x404040, 1.2);
  scene.add(ambientLight);

  const spotLight = new THREE.SpotLight(0xffffff, 1);
  spotLight.position.set(5, 5, 5);
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  scene.add(spotLight);

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0x1abc9c,
    metalness: 0.8,
    roughness: 0.2,
  });
  const cube = new THREE.Mesh(geometry, material);
  cube.castShadow = true;
  scene.add(cube);

  // Crear un piso para recibir sombras
  const floorGeometry = new THREE.PlaneGeometry(10, 10);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    metalness: 0.1,
    roughness: 0.9,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const tl = gsap.timeline({
    repeat: -1,
    yoyo: true,
    defaults: { duration: 1.5, ease: "power2.inOut" },
  });

  tl.to(cube.rotation, { y: "+=" + Math.PI * 2, duration: 3, ease: "none" }, 0);
  tl.to(cube.scale, { x: 1.4, y: 0.6, z: 1.4, duration: 0.8 }, 0);
  tl.to(cube.scale, { x: 1, y: 1, z: 1, duration: 0.8 }, 0.8);
  tl.to(
    material.color,
    {
      r: 0.9,
      g: 0.2,
      b: 0.5,
      duration: 0.8,
      onUpdate: () => (material.needsUpdate = true),
    },
    0
  );
  tl.to(
    material.color,
    {
      r: 0.2,
      g: 0.8,
      b: 0.6,
      duration: 0.8,
      onUpdate: () => (material.needsUpdate = true),
    },
    0.8
  );

  // Movimiento de la cámara alrededor del cubo
  tl.to(
    camera.position,
    {
      x: 3 * Math.sin(Math.PI / 2),
      z: 3 * Math.cos(Math.PI / 2),
      duration: 1.5,
      ease: "power1.inOut",
      onUpdate: () => camera.lookAt(cube.position),
    },
    0.2
  );
  tl.to(
    camera.position,
    {
      x: 3 * Math.sin(Math.PI),
      z: 3 * Math.cos(Math.PI),
      duration: 1.5,
      ease: "power1.inOut",
      onUpdate: () => camera.lookAt(cube.position),
    },
    1.7
  );
  tl.to(
    camera.position,
    {
      x: 3 * Math.sin((3 * Math.PI) / 2),
      z: 3 * Math.cos((3 * Math.PI) / 2),
      duration: 1.5,
      ease: "power1.inOut",
      onUpdate: () => camera.lookAt(cube.position),
    },
    3.2
  );
  tl.to(
    camera.position,
    {
      x: 3 * Math.sin(2 * Math.PI),
      z: 3 * Math.cos(2 * Math.PI),
      duration: 1.5,
      ease: "power1.inOut",
      onUpdate: () => camera.lookAt(cube.position),
    },
    4.7
  );

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();
}
