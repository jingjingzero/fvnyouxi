import { Viewport } from "pixi-viewport";

export function createViewport(app,WORLD_WIDTH,WORLD_HEIGHT) { 
  
  return new Viewport({
    screenWidth: app.screen.width,
    screenHeight: app.screen.height,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    events: app.renderer.events,
  });
}