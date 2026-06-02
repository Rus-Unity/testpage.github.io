import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const app = document.querySelector('#app')

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
// ACES Filmic tone mapping maps the HDR environment's wide range into the
// display range with filmic rolloff, so highlights don't blow out to white.
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1
app.appendChild(renderer.domElement)

// Scene & camera
const scene = new THREE.Scene()

// Environment map for reflections + background, loaded from an HDRI in hdrs/.
// The PMREMGenerator and loader are reused so the dropdown can swap HDRIs live;
// the previous prefiltered env texture is disposed on each swap.
const pmrem = new THREE.PMREMGenerator(renderer)
const rgbeLoader = new RGBELoader()
let currentEnv = null

function loadEnvironment(name) {
  rgbeLoader.load(import.meta.env.BASE_URL + `hdrs/${name}.hdr`, (hdr) => {
    const envMap = pmrem.fromEquirectangular(hdr).texture
    hdr.dispose()
    currentEnv?.dispose()
    currentEnv = envMap
    scene.environment = envMap
    scene.background = envMap
  })
}

loadEnvironment('museum_of_ethnography_2k')

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
)
camera.position.set(2.5, 2, 3.5)

// Mouse-drag to orbit the view
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 1.5, 0)

// Marble bust loaded from a glTF model. It loads async, so `spinTarget` (the
// turntable pivot) and `material` (target of the live controls) start null and
// are filled in once the model arrives.
const TARGET_HEIGHT = 3 // world units to scale the model to, base resting on y=0
let spinTarget = null
let material = null

new GLTFLoader().load(
  import.meta.env.BASE_URL + 'models/marble_bust_01_2k.gltf/marble_bust_01_2k.gltf',
  (gltf) => {
    const model = gltf.scene

    // Cast shadows and grab the first mesh material for the live controls.
    model.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true
        material ??= obj.material
      }
    })

    // Normalize size/position: scale to TARGET_HEIGHT, then offset the model so
    // its center sits at the pivot's origin (pivot is lifted to TARGET_HEIGHT/2).
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const scale = TARGET_HEIGHT / size.y
    model.scale.setScalar(scale)
    model.position.set(-center.x * scale, -center.y * scale, -center.z * scale)

    // Pivot spins the model on its vertical axis (turntable) about its center.
    const pivot = new THREE.Group()
    pivot.position.y = TARGET_HEIGHT / 2
    pivot.add(model)
    scene.add(pivot)
    spinTarget = pivot

    controls.target.set(0, TARGET_HEIGHT / 2, 0)

    // The material controls depend on the loaded material, so wire them now.
    bindColor('color', material.color)
    bindSlider('metalness', material.metalness, (v) => (material.metalness = v))
    bindSlider('roughness', material.roughness, (v) => (material.roughness = v))
    bindSlider('envMapIntensity', material.envMapIntensity, (v) => (material.envMapIntensity = v))
    bindColor('emissive', material.emissive)
    bindSlider('emissiveIntensity', material.emissiveIntensity, (v) => (material.emissiveIntensity = v))
    // normalScale is a Vector2; drive both axes together.
    bindSlider('normalScale', material.normalScale.x, (v) => material.normalScale.set(v, v))
    bindSlider('opacity', material.opacity, (v) => {
      material.opacity = v
      material.transparent = v < 1
    })
    // Map on/off toggles. Capture the loaded textures so they can be restored;
    // nulling a map and recompiling (needsUpdate) drops it from the material.
    const maps = { map: material.map, roughnessMap: material.roughnessMap, normalMap: material.normalMap }
    const bindMap = (id, slot) =>
      bindToggle(id, !!maps[slot], (v) => {
        material[slot] = v ? maps[slot] : null
        material.needsUpdate = true
      })
    bindMap('albedoMap', 'map')
    bindMap('roughnessMap', 'roughnessMap')
    bindMap('normalMap', 'normalMap')
    bindToggle('wireframe', material.wireframe, (v) => (material.wireframe = v))
    // flatShading changes the compiled shader, so it needs a recompile.
    bindToggle('flatShading', material.flatShading, (v) => {
      material.flatShading = v
      material.needsUpdate = true
    })
  },
)

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.6))
const keyLight = new THREE.DirectionalLight(0xffffff, 1.2)
keyLight.position.set(5, 5, 5)
keyLight.castShadow = true
keyLight.shadow.mapSize.set(2048, 2048)
keyLight.shadow.camera.near = 1
keyLight.shadow.camera.far = 20
keyLight.shadow.camera.left = -5
keyLight.shadow.camera.right = 5
keyLight.shadow.camera.top = 5
keyLight.shadow.camera.bottom = -5
scene.add(keyLight)
const fillLight = new THREE.DirectionalLight(0x88aaff, 0.5)
fillLight.position.set(-5, -2, -3)
scene.add(fillLight)

// Control helpers
function bindSlider(id, initial, apply) {
  const slider = document.querySelector(`#${id}`)
  const readout = document.querySelector(`#${id}-value`)
  const sync = () => {
    apply(Number(slider.value))
    readout.textContent = Number(slider.value).toFixed(2)
  }
  slider.value = initial
  slider.addEventListener('input', sync)
  sync()
}

// Drives a THREE.Color in place from an <input type="color">.
function bindColor(id, color) {
  const input = document.querySelector(`#${id}`)
  input.value = '#' + color.getHexString()
  input.addEventListener('input', () => color.set(input.value))
}

function bindToggle(id, initial, apply) {
  const box = document.querySelector(`#${id}`)
  box.checked = initial
  box.addEventListener('change', () => apply(box.checked))
  apply(box.checked)
}

// Exposure is a renderer setting, independent of the (async) model material,
// so it's wired immediately. Metalness/roughness/color are wired once the
// model loads (see the GLTFLoader callback above).
bindSlider('exposure', renderer.toneMappingExposure, (v) => (renderer.toneMappingExposure = v))

// HDRI switcher — swaps the scene environment/background live.
const envSelect = document.querySelector('#envMap')
envSelect.addEventListener('change', () => loadEnvironment(envSelect.value))

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Render loop
renderer.setAnimationLoop(() => {
  if (spinTarget) spinTarget.rotation.y += 0.01
  controls.update()
  renderer.render(scene, camera)
})
