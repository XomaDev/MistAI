"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // build/cat_frame.js
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
    if (workColumns == void 0)
      return;
    const codeSpace = document.createElement("div");
    codeSpace.id = "codeSpace";
    codeSpace.style.width = "35%";
    codeSpace.style.position = "relative";
    codeSpace.style.height = "100%";
    codeSpace.classList.add("ode-Box");
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
    const content = document.createElement("div");
    content.classList.add("ode-Box-content");
    content.style.height = "100%";
    codeSpace.appendChild(content);
    const header = document.createElement("div");
    header.classList.add("ode-Box-header");
    const caption = document.createElement("div");
    caption.classList.add("ode-Box-header-caption");
    caption.innerText = "Mist";
    header.appendChild(caption);
    content.appendChild(header);
    const frame = document.createElement("iframe");
    frame.id = "mistFrame";
    frame.src = FRAME_URL;
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.border = "none";
    frame.style.overflow = "hidden";
    frame.scrolling = "no";
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
      let newPercent = newPixelWidth / parentWidth * 100;
      newPercent = Math.min(Math.max(newPercent, 10), 90);
      codeSpace.style.width = `${newPercent}%`;
    }
  }
  var FRAME_URL, codeSpaceShown, resizing;
  var init_cat_frame = __esm({
    "build/cat_frame.js"() {
      "use strict";
      FRAME_URL = "https://mist-playground.vercel.app/";
      codeSpaceShown = false;
      resizing = false;
    }
  });

  // build/cat_blockly.js
  function getBlock(blockId) {
    var _a, _b;
    return (_b = (_a = window.Blockly) === null || _a === void 0 ? void 0 : _a.getMainWorkspace()) === null || _b === void 0 ? void 0 : _b.getBlockById(blockId);
  }
  function getManyXmlCodes(blockIds) {
    const xml = document.createElement("xml");
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
    }
  }
  function generateMistAll() {
    var _a;
    const allXmlBlockIds = (_a = window.Blockly) === null || _a === void 0 ? void 0 : _a.getMainWorkspace().getTopBlocks().filter((block) => FILTER_BLOCKS.indexOf(block.type) > -1).map((block) => block.id);
    translateToMist(getManyXmlCodes(allXmlBlockIds));
  }
  function translateToMist(xmlContent) {
    var _a;
    try {
      const mistCode = xmlToMist(xmlContent).trim();
      console.log(mistCode);
      const mistFrame = document.getElementById("mistFrame");
      if (mistFrame == null) {
        console.log("Mist frame is null!");
      } else {
        const mergedCode = mergeSyntaxDiff(currentEditorCode, mistCode);
        console.log("MergedCode: ", mergedCode);
        (_a = mistFrame.contentWindow) === null || _a === void 0 ? void 0 : _a.postMessage({ type: "mistCode", value: mergedCode }, "*");
        currentEditorCode = mergedCode;
      }
    } catch (error) {
      console.log(error);
    }
  }
  function translateToBlocks(mistCode) {
    currentEditorCode = mistCode;
    try {
      const xmlCode = mistToXml(mistCode);
      console.log("Generated XML Code:", xmlCode);
      renderBlocks(xmlCode);
      skipBlockChanges = true;
    } catch (error) {
      console.log(error);
    }
  }
  function renderBlocks(xmlGenerated) {
    var _a, _b, _c, _d, _e;
    const xmlStrings = xmlGenerated.split("\0");
    const workspace = (_a = window.Blockly) === null || _a === void 0 ? void 0 : _a.getMainWorkspace();
    workspace.clear();
    const blocks = [];
    for (let i = 0; i < xmlStrings.length; i++) {
      const xmlString = xmlStrings[i].trim();
      if (!xmlString || xmlString.replace(/\0/g, "").trim() === "") {
        continue;
      }
      console.log(xmlString);
      const xml = (_b = window.Blockly) === null || _b === void 0 ? void 0 : _b.utils.xml.textToDom(xmlString);
      const xmlBlock = xml.firstElementChild;
      const block = (_c = window.Blockly) === null || _c === void 0 ? void 0 : _c.Xml.domToBlock(xmlBlock, workspace);
      block.initSvg();
      blocks.push(block);
    }
    for (const block of blocks) {
      workspace.requestRender(block);
    }
    const item = (_d = window.Blockly) === null || _d === void 0 ? void 0 : _d.ContextMenuRegistry.registry.getItem("appinventor_arrange_vertical");
    if (item && typeof item.callback === "function") {
      const workspace2 = (_e = window.Blockly) === null || _e === void 0 ? void 0 : _e.getMainWorkspace();
      const fakeScope = { workspace: workspace2 };
      item.callback(fakeScope, null);
    } else {
      console.error("Callback not found or item is invalid");
    }
  }
  var FILTER_BLOCKS, skipBlockChanges, currentEditorCode;
  var init_cat_blockly = __esm({
    "build/cat_blockly.js"() {
      "use strict";
      FILTER_BLOCKS = ["component_event", "global_declaration", "procedures_defreturn", "procedures_defnoreturn"];
      skipBlockChanges = false;
      currentEditorCode = "";
      window.addEventListener("message", (event) => {
        translateToBlocks(event.data.text);
      });
    }
  });

  // build/index.js
  var require_index = __commonJS({
    "build/index.js"(exports) {
      init_cat_frame();
      init_cat_blockly();
      var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
        function adopt(value) {
          return value instanceof P ? value : new P(function(resolve) {
            resolve(value);
          });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
          function fulfilled(value) {
            try {
              step(generator.next(value));
            } catch (e) {
              reject(e);
            }
          }
          function rejected(value) {
            try {
              step(generator["throw"](value));
            } catch (e) {
              reject(e);
            }
          }
          function step(result) {
            result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
          }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
      };
      console.log("Happy developing \u2728");
      var WASM_EXEC = "http://localhost:8000/wasm_exec.js";
      function loadWasm() {
        if (!WebAssembly.instantiateStreaming) {
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
      var script = document.createElement("script");
      script.src = WASM_EXEC;
      script.async = true;
      script.onload = (e) => {
        console.log("Mist JS was Loaded!");
        loadWasm();
      };
      document.head.appendChild(script);
      var intervalId = setInterval(() => {
        if (addCodeSpace()) {
          addMistButton();
          monitorBlockly();
          clearInterval(intervalId);
          console.log("Code space was added!");
        }
      }, 1700);
      window.addEventListener("hashchange", (event) => {
        monitorBlockly();
      });
    }
  });
  require_index();
})();
