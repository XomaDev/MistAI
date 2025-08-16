"use strict";
// ==UserScript==
// @name Mist Language Integrator
// @match https://*.appinventor.mit.edu/*
// @match http://localhost/*
// ==/UserScript==
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
console.log('Happy developing ✨');
const FRAME_URL = "https://mist-playground.vercel.app/";
const WASM_EXEC = "http://localhost:8000/wasm_exec.js";
const FILTER_BLOCKS = ["component_event", "global_declaration", "procedures_defreturn", "procedures_defnoreturn"];
let editorCode = "";
let codeSpaceShown = false;
let resizing = false; // user is resizing code editor
let blocklyRegistered = false;
let skipBlockChanges = false;
// == wasam.go
// == BEGIN UI ==
function addMistButton() {
    const button = document.createElement("div");
    button.classList.add("ode-TextButton");
    button.id = "mistToggle";
    button.innerText = "Mist";
    const panels = document.querySelectorAll(".right");
    if (panels == null)
        return false;
    const container = panels[panels.length - 1];
    container.appendChild(button);
    button.addEventListener("click", () => {
        const codeSpace = document.getElementById("codeSpace");
        if (codeSpace == null)
            return;
        codeSpace.style.display = codeSpaceShown ? "none" : "block";
        codeSpaceShown = !codeSpaceShown;
    });
    return true;
}
function addCodeSpace() {
    const workColumns = document.querySelector(".ode-WorkColumns");
    if (workColumns == undefined)
        return;
    // parent
    const codeSpace = document.createElement("div");
    codeSpace.id = "codeSpace";
    codeSpace.style.width = "35%";
    codeSpace.style.position = "relative";
    codeSpace.style.height = "100%";
    codeSpace.classList.add("ode-Box");
    // resizing handle
    const resizer = document.createElement("div");
    resizer.id = "mist-resizer";
    resizer.style.position = "absolute";
    resizer.style.top = "0";
    resizer.style.left = "0";
    resizer.style.width = "5px";
    resizer.style.height = "100%";
    resizer.style.cursor = "ew-resize";
    resizer.style.backgroundColor = "#EFEFEF";
    codeSpace.appendChild(resizer);
    // contains real stuff
    const content = document.createElement("div");
    content.classList.add("ode-Box-content");
    content.style.height = "100%";
    codeSpace.appendChild(content);
    // title
    const header = document.createElement("div");
    header.classList.add("ode-Box-header");
    const caption = document.createElement("div");
    caption.classList.add("ode-Box-header-caption");
    caption.innerText = "Mist";
    header.appendChild(caption);
    // run button
    // const button = document.createElement("div")
    // button.classList.add("ode-TextButton")
    // button.id = "mistRun"
    // button.innerText = "Run Code"
    // button.style.marginBottom = "20px"
    //
    // button.addEventListener("click", () => {
    //   (window as any).main.mist(editorCode)
    // })
    content.appendChild(header);
    //content.appendChild(button)
    // the code editor!
    const frame = document.createElement("iframe");
    frame.id = "mistFrame";
    frame.src = FRAME_URL;
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.border = "none";
    frame.style.overflow = "hidden";
    frame.scrolling = "no";
    // add resize listeners
    resizer.addEventListener("mousedown", (e) => {
        console.log("resizing started!");
        resizing = true;
        document.body.style.userSelect = "none";
    });
    window.addEventListener("mousemove", doResize);
    window.addEventListener("mouseup", (e) => {
        console.log("resizing stopped");
        resizing = false;
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", doResize);
    });
    content.appendChild(frame);
    workColumns.appendChild(codeSpace);
    codeSpaceShown = true;
    return true;
}
function doResize(e) {
    if (resizing) {
        const codeSpace = document.getElementById("codeSpace");
        if (!codeSpace || !codeSpace.parentElement)
            return;
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
function getBlock(blockId) {
    var _a, _b;
    return (_b = (_a = window.Blockly) === null || _a === void 0 ? void 0 : _a.getMainWorkspace()) === null || _b === void 0 ? void 0 : _b.getBlockById(blockId);
}
function getManyXmlCodes(blockIds) {
    const xml = document.createElement('xml');
    for (const blockId of blockIds) {
        xml.appendChild(window.Blockly.Xml.blockToDom(getBlock(blockId), true));
    }
    return window.Blockly.Xml.domToText(xml);
}
function monitorBlockly() {
    var _a, _b;
    const workspace = (_b = (_a = window.Blockly) === null || _a === void 0 ? void 0 : _a.getMainWorkspace) === null || _b === void 0 ? void 0 : _b.call(_a);
    if (workspace) {
        workspace.addChangeListener((event) => {
            console.log("Blockly event " + event.type);
            if (!skipBlockChanges) {
                generateMistAll();
            }
            if (event.type == "blocks.arrange.end") {
                skipBlockChanges = false;
            }
        });
        blocklyRegistered = true;
    }
}
function generateMistAll() {
    var _a;
    const allXmlBlockIds = (_a = window.Blockly) === null || _a === void 0 ? void 0 : _a.getMainWorkspace().getTopBlocks().filter((block) => FILTER_BLOCKS.indexOf(block.type) > -1).map((block) => block.id);
    translateToMist(getManyXmlCodes(allXmlBlockIds));
}
// Blocks -> Mist
function translateToMist(xmlContent) {
    var _a;
    try {
        const mistCode = xmlToMist(xmlContent).trim();
        console.log(mistCode);
        const mistFrame = document.getElementById("mistFrame");
        if (mistFrame == null) {
            console.log("Mist frame is null!");
        }
        else {
            editorCode = mistCode;
            (_a = mistFrame.contentWindow) === null || _a === void 0 ? void 0 : _a.postMessage({ type: "mistCode", value: mistCode }, '*');
        }
    }
    catch (error) {
        console.log(error);
    }
}
// Mist -> XML
function translateToBlocks(mistCode) {
    try {
        const xmlCode = mistToXml(mistCode);
        console.log("Generated XML Code:", xmlCode);
        renderBlocks(xmlCode);
        skipBlockChanges = true;
    }
    catch (error) {
        console.log(error);
    }
}
function renderBlocks(xmlGenerated) {
    var _a, _b, _c, _d, _e;
    // First clear the existing workspace, and inject the new blocks
    const xmlStrings = xmlGenerated.split("\u0000");
    const workspace = (_a = window.Blockly) === null || _a === void 0 ? void 0 : _a.getMainWorkspace();
    workspace.clear();
    const blocks = [];
    for (let i = 0; i < xmlStrings.length; i++) {
        const xmlString = xmlStrings[i].trim();
        if (!xmlString || xmlString.replace(/\0/g, '').trim() === '') {
            continue;
        }
        console.log(xmlString);
        const xml = (_b = window.Blockly) === null || _b === void 0 ? void 0 : _b.utils.xml.textToDom(xmlString);
        const xmlBlock = xml.firstElementChild;
        const block = (_c = window.Blockly) === null || _c === void 0 ? void 0 : _c.Xml.domToBlock(xmlBlock, workspace);
        block.initSvg(); // Init all blocks first
        blocks.push(block); // Save for rendering later
    }
    for (const block of blocks) {
        workspace.requestRender(block);
    }
    // Sort all the blocks in order
    const item = (_d = window.Blockly) === null || _d === void 0 ? void 0 : _d.ContextMenuRegistry.registry.getItem("appinventor_arrange_vertical");
    if (item && typeof item.callback === "function") {
        const workspace = (_e = window.Blockly) === null || _e === void 0 ? void 0 : _e.getMainWorkspace();
        const fakeScope = { workspace: workspace, };
        item.callback(fakeScope, null);
    }
    else {
        console.error("Callback not found or item is invalid");
    }
}
function loadWasm() {
    if (!WebAssembly.instantiateStreaming) { // polyfill
        WebAssembly.instantiateStreaming = (resp, importObject) => __awaiter(this, void 0, void 0, function* () {
            const source = yield (yield resp).arrayBuffer();
            return yield WebAssembly.instantiate(source, importObject);
        });
    }
    const go = new Go();
    let mod, inst;
    WebAssembly.instantiateStreaming(fetch("http://localhost:8000/falcon.wasm"), go.importObject).then((result) => {
        mod = result.module;
        inst = result.instance;
        console.clear();
        go.run(inst);
        inst = WebAssembly.instantiate(mod, go.importObject);
    }).catch((err) => {
        console.error(err);
    });
}
// == END BLOCKLY CODE ==
// == BEGIN PRELOAD
const script = document.createElement("script");
script.src = WASM_EXEC;
script.async = true;
script.onload = (e) => {
    console.log("Mist JS was Loaded!");
    loadWasm();
};
document.head.appendChild(script);
// == END PRELOAD
// keep attempting to add the code workspace, sometimes project may not be fully loaded
const intervalId = setInterval(() => {
    if (addCodeSpace()) {
        addMistButton();
        monitorBlockly();
        clearInterval(intervalId);
        console.log("Code space was added!");
    }
}, 1700);
window.addEventListener('hashchange', (event) => {
    monitorBlockly();
});
// Listen for code editor changes
window.addEventListener("message", (event) => {
    // Perform Mist -> XML conversion
    translateToBlocks(event.data.text);
});
