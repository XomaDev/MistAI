// ==UserScript==
// @name Mist Language Integrator
// @match https://*.appinventor.mit.edu/*
// @match http://localhost/*
// ==/UserScript==

console.log('Happy developing ✨')

const FRAME_URL = "https://mist-playground.vercel.app/"
const WASM_EXEC = "http://localhost:8000/wasm_exec.js"

const FILTER_BLOCKS = ["component_event", "global_declaration", "procedures_defreturn", "procedures_defnoreturn"]

let editorCode = ""
let codeSpaceShown = false
let resizing = false // user is resizing code editor
let blocklyRegistered = false

let selectedBlockIds: Set<string> = new Set();

// == wasam.go ==
declare var Go: any;
declare function xmlToMist(xmlContent: string): string;
// == wasam.go

// == BEGIN UI ==
function addMistButton() {
  const button = document.createElement("div")
  button.classList.add("ode-TextButton")
  button.id = "mistToggle"
  button.innerText = "Mist"

  const panels = document.querySelectorAll(".right")
  if (panels == null) return false;
  const container = panels[panels.length - 1]
  container.appendChild(button)

  button.addEventListener("click", () => {
    const codeSpace = document.getElementById("codeSpace")
    if (codeSpace == null) return
    codeSpace.style.display = codeSpaceShown ? "none" : "block"
    codeSpaceShown = !codeSpaceShown
  })

  return true
}

function addCodeSpace() {
  const workColumns = document.querySelector(".ode-WorkColumns")
  if (workColumns == undefined) return

  // parent
  const codeSpace = document.createElement("div")
  codeSpace.id = "codeSpace"
  codeSpace.style.width = "35%"
  codeSpace.style.position = "relative"
  codeSpace.style.height = "100%"
  codeSpace.classList.add("ode-Box")

  // resizing handle
  const resizer = document.createElement("div")
  resizer.id = "mist-resizer"
  resizer.style.position = "absolute"
  resizer.style.top = "0"
  resizer.style.left = "0"
  resizer.style.width = "5px"
  resizer.style.height = "100%"
  resizer.style.cursor = "ew-resize"
  resizer.style.backgroundColor = "#EFEFEF"

  codeSpace.appendChild(resizer)

  // contains real stuff
  const content = document.createElement("div")
  content.classList.add("ode-Box-content")
  content.style.height = "100%"
  codeSpace.appendChild(content)

  // title
  const header = document.createElement("div")
  header.classList.add("ode-Box-header")
  const caption = document.createElement("div")
  caption.classList.add("ode-Box-header-caption")
  caption.innerText = "Mist"
  header.appendChild(caption)

  // run button
  const button = document.createElement("div")
  button.classList.add("ode-TextButton")
  button.id = "mistRun"
  button.innerText = "Run Code"
  button.style.marginBottom = "20px"

  button.addEventListener("click", () => {
    (window as any).main.mist(editorCode)
  })

  content.appendChild(header)
  content.appendChild(button)

  // the code editor!
  const frame = document.createElement("iframe")
  frame.id = "mistFrame"
  frame.src = FRAME_URL
  frame.style.width = "100%"
  frame.style.height = "100%"
  frame.style.border = "none"
  frame.style.overflow = "hidden"
  frame.scrolling = "no"

  // add resize listeners
  resizer.addEventListener("mousedown", (e) => {
    console.log("resizing started!")
    resizing = true
    document.body.style.userSelect = "none"
  })
  window.addEventListener("mousemove", doResize)
  window.addEventListener("mouseup", (e) => {
    console.log("resizing stopped")
    resizing = false
    document.body.style.userSelect = "";
    document.removeEventListener("mousemove", doResize)
  })

  content.appendChild(frame)
  workColumns.appendChild(codeSpace);
  codeSpaceShown = true
  return true;
}

function doResize(e: MouseEvent) {
  if (resizing) {
    const codeSpace = document.getElementById("codeSpace");
    if (!codeSpace || !codeSpace.parentElement) return;

    const parent = codeSpace.parentElement;
    const parentRect = parent.getBoundingClientRect();
    const parentWidth = parentRect.width;

    const newPixelWidth = parentRect.right - e.clientX;
    let newPercent = (newPixelWidth / parentWidth) * 100;
    newPercent = Math.min(Math.max(newPercent, 10), 90);
    codeSpace.style.width = `${newPercent}%`;
  }
}

// == END UI ==
// == START BLOCKLY CODE ==

function getBlock(blockId: string) {
  return (window as any).Blockly?.getMainWorkspace()?.getBlockById(blockId);
}

function getManyXmlCodes(blockIds: string[]) {
  const xml = document.createElement('xml');
  for (const blockId of blockIds) {
    xml.appendChild((window as any).Blockly.Xml.blockToDom(getBlock(blockId), true));
  }
  return (window as any).Blockly.Xml.domToText(xml);
}

function monitorBlockly() {
  const workspace = (window as any).Blockly?.getMainWorkspace?.();
  if (workspace) {
    workspace.addChangeListener((event: any) => {
      generateMistAll()
    });
    blocklyRegistered = true
  }
}

function generateMistAll() {
  const allXmlBlockIds = (window as any).Blockly?.getMainWorkspace()
    .getTopBlocks()
    .filter((block: any) => FILTER_BLOCKS.indexOf(block.type) > -1)
    .map((block: any) => block.id);
  translateToMist(getManyXmlCodes(allXmlBlockIds))
}

function translateToMist(xmlContent: string) {
  try {
    const mistCode = xmlToMist(xmlContent)
    console.log(mistCode)

    const mistFrame = document.getElementById("mistFrame") as HTMLIFrameElement | null
    if (mistFrame == null) {
      console.log("Mist frame is null!")
    } else {
      editorCode = mistCode
      mistFrame.contentWindow?.postMessage({type: "mistCode", value: mistCode}, '*')
    }
  } catch (error) {
    console.log(error)
  }
}

function loadWasm() {
  if (!WebAssembly.instantiateStreaming) { // polyfill
    WebAssembly.instantiateStreaming = async (resp, importObject) => {
      const source = await (await resp).arrayBuffer();
      return await WebAssembly.instantiate(source, importObject);
    };
  }

  const go = new Go();
  let mod, inst;
  WebAssembly.instantiateStreaming(fetch("http://localhost:8000/main.wasm"), go.importObject).then((result) => {
    mod = result.module;
    inst = result.instance;

    console.clear()
    go.run(inst);
    inst = WebAssembly.instantiate(mod, go.importObject);
  }).catch((err) => {
    console.error(err);
  });
}

// == END BLOCKLY CODE ==

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

// keep attempting to add the code workspace, sometimes project may not be fully loaded
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