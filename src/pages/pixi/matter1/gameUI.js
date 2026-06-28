import { Container, Graphics, Text } from "pixi.js";
import { watch, toRef } from "vue"; // ✅ 新增导入
// ==========================
// PIXI UI 全局变量（抽离后内部管理）
// ==========================
let uiContainer;
let fpsText, posText, jumpButton;
let joystick = null;

// ==========================
// 初始化全部 PIXI UI
// ==========================
export function initGameUI(app, onJump, Sprite, user) {
  uiContainer = new Container();
  app.stage.addChild(uiContainer);

  const style = {
    fontSize: 22,
    fill: 0x000000,
    fontFamily: "Arial",
  };

  fpsText = new Text({
    text: "FPS: 60",
    style,
  });
  fpsText.position.set(20, 50);

  posText = new Text({
    text: "x: 0\ny: 0",
    style,
  });
  posText.position.set(120, 10);

  // ==========================
  // 跳跃按钮创建逻辑不变
  // ==========================
  const buttonRadius = app.screen.height * 0.07;
  const jumpBtnWrap = new Container();
  jumpBtnWrap.position.set(
    app.screen.width - buttonRadius - app.screen.width * 0.06,
    app.screen.height - buttonRadius - app.screen.height * 0.15
  );
  jumpBtnWrap.eventMode = "static";
  const jumpBg = new Graphics()
    .circle(0, 0, buttonRadius)
    .fill({ color: 0xffffff, alpha: 0.3 });
  const jumpIcon = Sprite.from("jump");
  jumpIcon.anchor.set(0.5);
  jumpIcon.width = buttonRadius * 1.25;
  jumpIcon.height = buttonRadius * 1.25;
  jumpIcon.x = -2;
  jumpBtnWrap.addChild(jumpBg, jumpIcon);
  jumpBtnWrap.on("pointerdown", (e) => {
    e.stopPropagation();
    onJump();
  });
  jumpButton = jumpBtnWrap;

  // 添加所有UI元素到容器
  uiContainer.addChild(
    fpsText,
    posText,
    jumpBtnWrap
  );

  // 创建摇杆
  createJoystick(app);

  // ==============================================
  // ✅ 把watch移到这里！所有UI元素都创建完了，不会有undefined问题
  // ==============================================
  const fightRef = toRef(user.pixi, 'gameUi');
  watch(fightRef, (isFight) => {
    // 1. 隐藏左上角文本
    // fpsText.visible = posText.visible = !isFight;
    // 2. 隐藏跳跃按钮
    jumpButton.visible = !isFight;
    // 3. 隐藏摇杆（加可选链，绝对不会报错）
if (joystick?.container) joystick.container.visible = !isFight;

    // ✅ 【可选懒人写法】如果战斗场景不需要任何游戏UI，直接写这一行就行，上面三行都可以删掉
    // uiContainer.visible = !isFight;
  }, { immediate: true });
}


// ==========================
// 摇杆
function createJoystick(app) {

  const baseRadius = app.screen.height * 0.1;   // base 半径 8vh
  const knobRadius = app.screen.height * 0.05;  // knob 半径 4vh
  const bottomMargin = app.screen.height * 0.18; // 底部间距 5vh
  const leftMargin = app.screen.width * 0.08;   // 左边间距 5vw

  // 用 Container 作为摇杆根节点
  const joystickContainer = new Container();
  joystickContainer.position.set(
    leftMargin + baseRadius,
    app.screen.height - bottomMargin - baseRadius
  );

  // base —— v8 写法：circle() + fill()，不用 beginFill/endFill
  const base = new Graphics()
    .circle(0, 0, baseRadius)
    .fill({ color: 0xffffff, alpha: 0.2 });

  // knob —— 同上
  const knob = new Graphics()
    .circle(0, 0, knobRadius)
    .fill({ color: 0xffffff, alpha: 0.5 });

  joystick = {
    container: joystickContainer,
    base,
    knob,
    x: 0,
    y: 0,
    active: false,
    pointerId: null,
    max: baseRadius * 0.75
  };

  // 都挂到 container 上，消除 addChild 警告
  joystickContainer.addChild(base);
  joystickContainer.addChild(knob);
  uiContainer.addChild(joystickContainer);

  joystickContainer.eventMode = 'static';

  // 摇杆按下
  joystickContainer.on('pointerdown', (e) => {
    e.stopPropagation();
    joystick.active = true;
    joystick.pointerId = e.pointerId;
    const pos = e.global;
    joystick.x = pos.x - joystickContainer.x;
    joystick.y = pos.y - joystickContainer.y;
    updateKnobPosition();
  });

  // 摇杆拖动
  joystickContainer.on('pointermove', (e) => {
    if (!joystick.active || joystick.pointerId !== e.pointerId) return;
    const pos = e.global;
    let dx = pos.x - joystickContainer.x;
    let dy = pos.y - joystickContainer.y;

    // 限制最大半径
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > joystick.max) {
      const scale = joystick.max / distance;
      dx *= scale;
      dy *= scale;
    }

    joystick.x = dx;
    joystick.y = dy;
    updateKnobPosition();
  });

  // 松手
  const resetJoystick = (e) => {
    if (!joystick.active || joystick.pointerId !== e.pointerId) return;
    joystick.active = false;
    joystick.pointerId = null;
    joystick.x = 0;
    joystick.y = 0;
    updateKnobPosition();
  };

  joystickContainer.on('pointerup', resetJoystick);
  joystickContainer.on('pointerupoutside', resetJoystick);

  function updateKnobPosition() {
    knob.position.set(joystick.x, joystick.y);
  }
}
// ==========================
// UI 更新
// ==========================
let fpsCounter = 0;
export function updateGameUI(fps, activePlayer) {
  fpsCounter++;

  if (fpsCounter % 5 !== 0) return;

  fpsText.text = `FPS: ${fps.value}`;
  posText.text =
    `x:${activePlayer.body.position.x.toFixed(0)}
   y:${activePlayer.body.position.y.toFixed(0)}`;
}

// ==========================
// 给外部访问 joystick
// ==========================
export function getJoystick() {
  return joystick;
}