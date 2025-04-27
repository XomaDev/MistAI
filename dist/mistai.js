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
const MIST_ENDPOINT = "http://localhost:2103/mist";
const FRAME_URL = "https://mist-playground.vercel.app/";
const MIST_JS = "https://cdn.jsdelivr.net/gh/XomaDev/compiled-bins/mist-x.js";
const FILTER_BLOCKS = ["component_event", "global_declaration", "procedures_defreturn", "procedures_defnoreturn"];
let editorCode = "";
let codeSpaceShown = false;
let resizing = false; // user is resizing code editor
let blocklyRegistered = false;
let selectedBlockIds = new Set();
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
    const button = document.createElement("div");
    button.classList.add("ode-TextButton");
    button.id = "mistRun";
    button.innerText = "Run Code";
    button.style.marginBottom = "20px";
    button.addEventListener("click", () => {
        window.main.mist(editorCode);
    });
    content.appendChild(header);
    content.appendChild(button);
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
function registerListeners() {
}
// == END UI ==
// == START BLOCKLY CODE ==
function getBlock(blockId) {
    var _a, _b;
    return (_b = (_a = window.Blockly) === null || _a === void 0 ? void 0 : _a.getMainWorkspace()) === null || _b === void 0 ? void 0 : _b.getBlockById(blockId);
}
function getXmlCode(blockId) {
    const xml = document.createElement('xml');
    xml.appendChild(window.Blockly.Xml.blockToDom(getBlock(blockId), true));
    return window.Blockly.Xml.domToText(xml);
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
            const blockId = event.newElementId;
            if (event.type == window.Blockly.Events.SELECTED) {
                if (blockId != null) {
                    selectedBlockIds.add(blockId);
                    translateToMist(getManyXmlCodes(Array.from(selectedBlockIds)));
                    return;
                }
                else {
                    selectedBlockIds = new Set();
                    console.log("Unselected!");
                    generateMistAll();
                }
            }
            else if (event.type == "screen.switch") {
                generateMistAll();
            }
            else {
                console.log("Event Not Handled: " + event.type);
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
function translateToMist(xmlContent) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const response = yield fetch(MIST_ENDPOINT, {
                method: 'POST',
                headers: { "Content-Type": "text/plain" },
                body: xmlContent,
            });
            const mistCode = yield response.text();
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
    });
}
/**
 * Called by Mist JS
 */
function mistOutput(output) {
    var _a;
    console.log(output);
    const mistFrame = document.getElementById("mistFrame");
    if (mistFrame == null) {
        console.log("Mist frame is null!");
    }
    else {
        console.log("Mist output: " + output);
        (_a = mistFrame.contentWindow) === null || _a === void 0 ? void 0 : _a.postMessage({ type: "mistResult", value: output }, '*');
    }
}
// == END BLOCKLY CODE ==
// == BEGIN PRELOAD
const script = document.createElement("script");
script.src = MIST_JS;
script.async = true;
script.onload = (e) => {
    console.log("Mist JS was Loaded!");
    window.main(); // starts Mist JS
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
