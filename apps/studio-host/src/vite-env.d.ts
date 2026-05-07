/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __HOP_VERSION__: string;

declare module '@wasm/rhwp.js' {
  export * from '@rhwp/core';
  export { default } from '@rhwp/core';
}

interface Window {
  __wasm?: import('@/core/wasm-bridge').WasmBridge;
  __eventBus?: import('@/core/event-bus').EventBus;
  __inputHandler?: import('@/engine/input-handler').InputHandler;
  __canvasView?: import('@/view/canvas-view').CanvasView;
}
