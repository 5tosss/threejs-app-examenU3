import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let camara, escenario, renderizador, cronometro, mezclador, modelo, animaciones, animacionActiva, animacionAnterior, controles, pointerLockControls;
const teclado = {};
const velocidadMovimiento = 150;
const objetosColisionables = [];
const estadisticas = new Stats();


iniciarEscenario();
animarEscena();

function iniciarEscenario() {
    const contenedor = document.createElement('div');
    document.body.appendChild(contenedor);

    camara = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 2000);
    camara.position.set(0, 300, 350);
    camara.screenSpacePanning = false;

    escenario = new THREE.Scene();

    establecerFondoCielo('Models/background/background.jpg');

    escenario.fog = new THREE.Fog(0x093d42, 200, 1500);

    const luzHemisferica = new THREE.HemisphereLight(0x199e3b, 0x199e3b);
    luzHemisferica.position.set(0, 300, 0);
    escenario.add(luzHemisferica);

    const luzDireccional = new THREE.DirectionalLight(0xffffff);
    luzDireccional.position.set(0, 100, 100);
    luzDireccional.castShadow = true;
    luzDireccional.shadow.camera.top = 280;
    luzDireccional.shadow.camera.bottom = -100;
    luzDireccional.shadow.camera.left = -120;
    luzDireccional.shadow.camera.right = 120;
    escenario.add(luzDireccional);

    const suelo = new THREE.Mesh(
        new THREE.PlaneGeometry(4000, 4000),
        new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
    );
    suelo.rotation.x = -Math.PI / 2;
    suelo.receiveShadow = true;
    escenario.add(suelo);
    establecerFondoConImagen('Models/background/floor.jpg');

    pointerLockControls = new PointerLockControls(camara, document.body);



    const cargadorFBX = new FBXLoader();

    cargadorFBX.load('Models/fbx/Erika.fbx', function (objeto) {
        modelo = objeto;
        modelo.scale.set(1, 1, 1);
        modelo.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        escenario.add(modelo);

        mezclador = new THREE.AnimationMixer(modelo);
        animaciones = {};

        cargarAnimaciones(cargadorFBX, mezclador, animaciones);
        crearCubosColisionablesFBX('Models/fbx/source/Tree.fbx', escenario, objetosColisionables);


        window.addEventListener('keydown', manejarTeclaPresionada);
        window.addEventListener('keyup', manejarTeclaSoltada);
    });

    renderizador = new THREE.WebGLRenderer({ antialias: true });
    renderizador.setPixelRatio(window.devicePixelRatio);
    renderizador.setSize(window.innerWidth, window.innerHeight);
    renderizador.shadowMap.enabled = true;
    contenedor.appendChild(renderizador.domElement);

    controles = new OrbitControls(camara, renderizador.domElement);
    controles.target.set(0, 100, 0);
    controles.update();

    window.addEventListener('resize', ajustarVentana);

    cronometro = new THREE.Clock();
    contenedor.appendChild(estadisticas.dom);

    const gui = new GUI({ position: { x: window.innerWidth - 300, y: 10 } });
    const carpetaLuz = gui.addFolder('Iluminación');
    const carpetaNiebla = gui.addFolder('Neblina');

    carpetaLuz.add(luzDireccional, 'intensity', 0, 2, 0.01).name('Intensidad Dirección');
    carpetaLuz.add(luzHemisferica, 'intensity', 0, 2, 0.01).name('Intensidad Hemisferio');
    carpetaNiebla.add(escenario.fog, 'far', 500, 3000, 1).name('Distancia');
}

function establecerFondoCielo(imagenRuta) {
    const loader = new THREE.TextureLoader();

    loader.load(imagenRuta, function (texture) {
        // Aplica la textura del fondo como color de cielo
        escenario.background = texture;
    });
}
function establecerFondoConImagen(imagenRuta) {
    const loader = new THREE.TextureLoader();
    loader.load(imagenRuta, function (texture) {
        // Crear un plano para usar como fondo
        const geometry = new THREE.PlaneGeometry(5000, 5000);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide // Asegura que la textura se vea desde ambos lados
        });
        const fondo = new THREE.Mesh(geometry, material);

        // Ajustar la posición para que esté detrás de la escena
        fondo.position.set(0, 0, -500);  // Coloca el fondo en el fondo de la cámara
        fondo.rotation.x = Math.PI / 2;  // Asegura que el fondo esté paralelo a la cámara
        escenario.add(fondo);
    });
}



function cargarAnimaciones(cargador, mezclador, animaciones) {
    cargador.load('Models/fbx/combatidle.fbx', function (anim) {
        const accionIdle = mezclador.clipAction(anim.animations[0]);
        animaciones.idle = accionIdle;
        if (!animacionActiva) {
            animacionActiva = accionIdle;
            animacionActiva.play();
        }
    });

    cargador.load('Models/fbx/Walk.fbx', function (anim) {
        const accionCaminar = mezclador.clipAction(anim.animations[0]);
        animaciones.walk = accionCaminar;
    });

    cargador.load('Models/fbx/Standing Draw Arrow.fbx', function (anim) {
        const accionAtaque1 = mezclador.clipAction(anim.animations[0]);
        animaciones.attack1 = accionAtaque1;
    });

    cargador.load('Models/fbx/Standing Melee Kick.fbx', function (anim) {
        const accionAtaque2 = mezclador.clipAction(anim.animations[0]);
        animaciones.attack2 = accionAtaque2;
    });

    cargador.load('Models/fbx/Standing Disarm Bow.fbx', function (anim) {
        const accionDefensa = mezclador.clipAction(anim.animations[0]);
        animaciones.defense = accionDefensa;
    });

    cargador.load('Models/fbx/Standing Equip Bow.fbx', function (anim) {
        const accionEmocion = mezclador.clipAction(anim.animations[0]);
        animaciones.emote = accionEmocion;
    });

    cargador.load('Models/fbx/standing_Jump.fbx', function (anim) {
        const accionPatada = mezclador.clipAction(anim.animations[0]);
        animaciones.kick = accionPatada;
    });
}

function crearCubosColisionablesFBX(rutaModelo, escenario, objetosColisionables) {
    const cargadorFBX = new FBXLoader();
    const posicionInicialPersonaje = new THREE.Vector3(0, 0, 0);
    const distanciaMinima = 300;

    cargadorFBX.load(rutaModelo, function (objeto) {
        // Escalar el modelo base si es necesario
        objeto.scale.set(1, 1, 1); // Ajusta a tu escena

        for (let i = 0; i < 80; i++) {
            let instancia;
            let distancia;

            do {
                // Posición aleatoria
                const posicionX = Math.random() * 2000 - 1000;
                const posicionZ = Math.random() * 2000 - 1000;

                instancia = objeto.clone(); // Clona el modelo
                instancia.position.set(posicionX, 0, posicionZ);
                distancia = instancia.position.distanceTo(posicionInicialPersonaje);
            } while (distancia < distanciaMinima);


            // Asegura que las sombras se apliquen
            instancia.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            escenario.add(instancia);
            objetosColisionables.push(instancia);
        }
    });
}



function ajustarVentana() {
    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();
    renderizador.setSize(window.innerWidth, window.innerHeight);
}

function manejarTeclaPresionada(evento) {
    teclado[evento.key.toLowerCase()] = true;
    gestionarAnimacion();
}

function manejarTeclaSoltada(evento) {
    teclado[evento.key.toLowerCase()] = false;
    gestionarAnimacion();
}

function gestionarAnimacion() {
    if (teclado['w'] || teclado['s'] || teclado['a'] || teclado['d']) {
        if (animacionActiva !== animaciones.walk) {
            cambiarAnimacion(animaciones.walk);
        }
    } else if (teclado['f']) {
        if (animacionActiva !== animaciones.attack1) {
            cambiarAnimacion(animaciones.attack1);
        }
    } else if (teclado['shift']) {
        if (animacionActiva !== animaciones.attack2) {
            cambiarAnimacion(animaciones.attack2);
        }
    } else if (teclado['q']) {
        if (animacionActiva !== animaciones.defense) {
            cambiarAnimacion(animaciones.defense);
        }
    } else if (teclado['e']) {
        if (animacionActiva !== animaciones.emote) {
            cambiarAnimacion(animaciones.emote);
        }
    } else if (teclado[' ']) {
        if (animacionActiva !== animaciones.kick) {
            cambiarAnimacion(animaciones.kick);
        }
    } else {
        if (animacionActiva !== animaciones.idle) {
            cambiarAnimacion(animaciones.idle);
        }
    }
}

function cambiarAnimacion(nuevaAnimacion) {
    if (animacionActiva !== nuevaAnimacion) {
        animacionAnterior = animacionActiva;
        animacionActiva = nuevaAnimacion;

        animacionAnterior.fadeOut(0.5);
        animacionActiva.reset().fadeIn(0.5).play();
    }
}

function animarEscena() {
    requestAnimationFrame(animarEscena);

    const delta = cronometro.getDelta();
    const distanciaMovimiento = velocidadMovimiento * delta;

    if (mezclador) mezclador.update(delta);

    let moverX = 0;
    let moverZ = 0;

    if (teclado['w']) {
        moverZ = -distanciaMovimiento;
    }
    if (teclado['s']) {
        moverZ = distanciaMovimiento;
    }
    if (teclado['a']) {
        moverX = -distanciaMovimiento;
    }
    if (teclado['d']) {
        moverX = distanciaMovimiento;
    }

    if (moverX !== 0 || moverZ !== 0) {
        const vectorMovimiento = new THREE.Vector3(moverX, 0, moverZ);
        const direccion = vectorMovimiento.clone().applyQuaternion(camara.quaternion);
        direccion.y = 0;
        modelo.lookAt(modelo.position.clone().add(direccion));
        if (!verificarColision(modelo.position.clone().add(direccion))) {
            modelo.position.add(direccion);
        }
    }

    renderizador.render(escenario, camara);
    estadisticas.update();
}

function verificarColision(nuevaPosicion) {
    const caja = new THREE.Box3().setFromObject(modelo);
    const boundingBoxModelo = caja.clone().translate(nuevaPosicion.sub(modelo.position));

    for (let i = 0; i < objetosColisionables.length; i++) {
        const boundingBoxObjeto = new THREE.Box3().setFromObject(objetosColisionables[i]);
        if (boundingBoxModelo.intersectsBox(boundingBoxObjeto)) {
            return true;
        }
    }
    return false;
}
