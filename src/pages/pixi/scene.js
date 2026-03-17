import { Container, TilingSprite, Texture, Sprite, Graphics } from 'pixi.js'
import Matter from 'matter-js'
import { useCounterStore } from '@/store/counter'

const user = useCounterStore()

const DESIGN_HEIGHT = 847
const FLOOR_RATIO = 0.15
const PLAYER_HEIGHT_VH = 0.26
const PLAYER_ASPECT = 0.4

/* ================= CREATE SCENE ================= */

export function createScene(screenW, screenH) {

  /* ========== PIXI ROOT ========== */
  const view = new Container()
  const scale = screenH / DESIGN_HEIGHT
  view.scale.set(scale)

  const designW = screenW / scale
  const designH = DESIGN_HEIGHT
  const FLOOR_HEIGHT = designH * FLOOR_RATIO

  /* ========== BACKGROUND ========== */
  const bg = new Graphics()
  bg.beginFill(0xf5f5f5)
  bg.drawRect(0, 0, designW * 2, designH - FLOOR_HEIGHT)
  bg.endFill()
  view.addChild(bg)

  const floor = new Graphics()
  floor.beginFill(0x000000)
  floor.drawRect(0, designH - FLOOR_HEIGHT, designW * 2, FLOOR_HEIGHT)
  floor.endFill()
  view.addChild(floor)

  /* ========== WORLD CONTAINER ========== */
  const worldWidth = designW * 3
  const worldHeight = designH

  const world = new Container()
  view.addChild(world)

  const camera = new Container()
  world.addChild(camera)

  /* ================= MATTER ================= */
  const engine = Matter.Engine.create()
  const physicsWorld = engine.world
  physicsWorld.gravity.y = 1.2

  const runner = Matter.Runner.create()
  Matter.Runner.run(runner, engine)

  /* ========== STATIC BODIES ========== */
  const groundY = worldHeight - FLOOR_HEIGHT

  const ground = Matter.Bodies.rectangle(
    worldWidth / 2,
    groundY + FLOOR_HEIGHT / 2,
    worldWidth,
    FLOOR_HEIGHT,
    { isStatic: true }
  )

  const leftWall = Matter.Bodies.rectangle(
    -50,
    worldHeight / 2,
    100,
    worldHeight,
    { isStatic: true }
  )

  const rightWall = Matter.Bodies.rectangle(
    worldWidth + 50,
    worldHeight / 2,
    100,
    worldHeight,
    { isStatic: true }
  )

  Matter.World.add(physicsWorld, [ground, leftWall, rightWall])

  /* ========== PLAYER ========== */
  const player = new Sprite(Texture.WHITE)
  player.anchor.set(0.5, 1)
  player.height = designH * PLAYER_HEIGHT_VH
  player.width = player.height * PLAYER_ASPECT
  camera.addChild(player)

  const playerBody = Matter.Bodies.rectangle(
    designW / 2,
    groundY - player.height / 2,
    player.width,
    player.height,
    {
      inertia: Infinity,      // 不旋转
      friction: 0,
      restitution: 0,
    }
  )

  Matter.World.add(physicsWorld, playerBody)

  /* ===== 保留原 playerRect（用于旧逻辑兼容）===== */
  const playerRect = {
    x: 0, y: 0,
    width: player.width,
    height: player.height
  }

  /* ================= CAMERA ================= */
  const screenCenterX = designW / 2
  const minCameraX = designW - worldWidth
  const maxCameraX = 0

  function updateCameraFollow() {
    let targetX = screenCenterX - player.x
    targetX = Math.min(maxCameraX, targetX)
    targetX = Math.max(minCameraX, targetX)
    camera.x = Math.round(targetX)
  }

  /* ================= PLAYER MOVE ================= */

  function movePlayerX(dx) {
    Matter.Body.setVelocity(playerBody, {
      x: dx,
      y: playerBody.velocity.y
    })
  }

  function movePlayerY() {
    // Matter 自动重力，这里保留接口但不处理
    return {
      onGround: Math.abs(playerBody.velocity.y) < 0.01,
      vy: playerBody.velocity.y
    }
  }

  /* ================= TICK ================= */
  function syncPlayer() {
    player.x = playerBody.position.x
    player.y = playerBody.position.y + player.height / 2

    playerRect.x = player.x - playerRect.width / 2
    playerRect.y = player.y - playerRect.height

    updateCameraFollow()
  }

  Matter.Events.on(engine, 'afterUpdate', syncPlayer)

  /* ================= RETURN ================= */
  return {
    view,
    scale,
    player,
    camera,
    worldWidth,
    floorHeight: FLOOR_HEIGHT,
    floor,
    playerRect,

    movePlayerX,
    movePlayerY,

    // 保留接口（你后面可逐步迁移）
    fireBullet() {},
    updateBullets() {},
    scDrone() {},
    destroyDrone() {},
    updateDrone() {},
    updateNPCFacingPlayer() {},
    updateDroneAttack() {},
    findNearestNPC() {},
    initBulletPool() {},
    updateCharacters() {},
    npcs: []
  }
}
