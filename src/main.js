import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'

const app = document.querySelector('#app')

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
app.appendChild(renderer.domElement)

// Scene & camera
const scene = new THREE.Scene()

// Environment map for reflections + background, loaded from an HDRI
const pmrem = new THREE.PMREMGenerator(renderer)
new RGBELoader().load('/suburban_garden_2k.hdr', (hdr) => {
  const envMap = pmrem.fromEquirectangular(hdr).texture
  scene.environment = envMap
  scene.background = envMap
  hdr.dispose()
  pmrem.dispose()
})

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

// Metallic torus knot — reflects the environment map
const geometry = new THREE.TorusKnotGeometry(0.7, 0.25, 220, 32)
const material = new THREE.MeshStandardMaterial({
  color: 0xaa3bff,
  metalness: 1,
  roughness: 0.15,
})
const knot = new THREE.Mesh(geometry, material)
knot.position.y = 1.5
knot.castShadow = true
scene.add(knot)

// Ground plane to catch the shadow
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0x2a2c36, roughness: 0.9 }),
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

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

// Material controls
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

bindSlider('metalness', material.metalness, (v) => (material.metalness = v))
bindSlider('roughness', material.roughness, (v) => (material.roughness = v))

// Color picker
const colorInput = document.querySelector('#color')
colorInput.value = '#' + material.color.getHexString()
colorInput.addEventListener('input', () => material.color.set(colorInput.value))

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Render loop
renderer.setAnimationLoop(() => {
  knot.rotation.x += 0.005
  knot.rotation.y += 0.01
  controls.update()
  renderer.render(scene, camera)
})
