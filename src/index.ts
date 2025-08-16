// ==UserScript==
// @name Mist Language Integrator
// @match https://*.appinventor.mit.edu/*
// @match http://localhost/*
// ==/UserScript==

import {addCodeSpace, addMistButton} from "./cat_frame";
import {monitorBlockly, translateToBlocks} from "./cat_blockly";

console.log('Happy developing ✨')

const WASM_EXEC = "http://localhost:8000/wasm_exec.js"

// == wasam.go ==
declare var Go: any;
// == wasam.go

function loadWasm() {
  if (!WebAssembly.instantiateStreaming) { // polyfill
    WebAssembly.instantiateStreaming = async (resp, importObject) => {
      const source = await (await resp).arrayBuffer();
      return await WebAssembly.instantiate(source, importObject);
    };
  }

  const go = new Go();
  let mod, inst;
  WebAssembly.instantiateStreaming(fetch("http://localhost:8000/falcon.wasm"), go.importObject).then((result) => {
    mod = result.module;
    inst = result.instance;

    console.clear()
    go.run(inst);
    inst = WebAssembly.instantiate(mod, go.importObject);
  }).catch((err) => {
    console.error(err);
  });
}

// == BEGIN PRELOAD
const script = document.createElement("script");
script.src = WASM_EXEC
script.async = true
script.onload = (e) => {
  console.log("Mist JS was Loaded!");
  loadWasm()
}
document.head.appendChild(script)
// == END PRELOAD

// keep attempting to add the code workspace, sometimes a project may not be fully loaded
const intervalId = setInterval(() => {
  if (addCodeSpace()) {
    addMistButton()
    monitorBlockly()
    clearInterval(intervalId)
    console.log("Code space was added!")
  }
}, 1700)

window.addEventListener('hashchange', (event) => {
  monitorBlockly()
});

// Listen for code editor changes
window.addEventListener("message", (event) => {
  // Perform Mist -> XML conversion
  translateToBlocks(event.data.text)
})