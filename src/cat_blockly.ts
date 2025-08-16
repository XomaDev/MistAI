const FILTER_BLOCKS = ["component_event", "global_declaration", "procedures_defreturn", "procedures_defnoreturn"]
export let skipBlockChanges = false

// == falcon.go ==
declare function xmlToMist(xmlContent: string): string;
declare function mistToXml(mistCode: string): string;
// == falcon.go ==

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

export function monitorBlockly() {
    const workspace = (window as any).Blockly?.getMainWorkspace?.();
    if (workspace) {
        workspace.addChangeListener((event: any) => {
            console.log("Blockly event " + event.type)
            if (!skipBlockChanges) {
                generateMistAll()
            }
            if (event.type == "blocks.arrange.end") {
                skipBlockChanges = false
            }
        });
    }
}

function generateMistAll() {
    const allXmlBlockIds = (window as any).Blockly?.getMainWorkspace()
        .getTopBlocks()
        .filter((block: any) => FILTER_BLOCKS.indexOf(block.type) > -1)
        .map((block: any) => block.id);
    translateToMist(getManyXmlCodes(allXmlBlockIds))
}

// Blocks -> Mist
function translateToMist(xmlContent: string) {
    try {
        const mistCode = xmlToMist(xmlContent).trim()
        console.log(mistCode)

        const mistFrame = document.getElementById("mistFrame") as HTMLIFrameElement | null
        if (mistFrame == null) {
            console.log("Mist frame is null!")
        } else {
            mistFrame.contentWindow?.postMessage({type: "mistCode", value: mistCode}, '*')
        }
    } catch (error) {
        console.log(error)
    }
}

// Mist -> XML
export function translateToBlocks(mistCode: string) {
    try {
        const xmlCode = mistToXml(mistCode)
        console.log("Generated XML Code:", xmlCode)
        renderBlocks(xmlCode)
        skipBlockChanges = true
    } catch (error) {
        console.log(error)
    }
}

function renderBlocks(xmlGenerated: string) {
    // First clear the existing workspace, and inject the new blocks
    const xmlStrings = xmlGenerated.split("\u0000");
    const workspace = (window as any).Blockly?.getMainWorkspace();
    workspace.clear()

    const blocks = [];

    for (let i = 0; i < xmlStrings.length; i++) {
        const xmlString = xmlStrings[i].trim();
        if (!xmlString || xmlString.replace(/\0/g, '').trim() === '') {
            continue;
        }

        console.log(xmlString);
        const xml = (window as any).Blockly?.utils.xml.textToDom(xmlString);
        const xmlBlock = xml.firstElementChild;
        const block = (window as any).Blockly?.Xml.domToBlock(xmlBlock, workspace);
        block.initSvg(); // Init all blocks first
        blocks.push(block); // Save for rendering later
    }

    for (const block of blocks) {
        workspace.requestRender(block);
    }

    // Sort all the blocks in order
    const item = (window as any).Blockly?.ContextMenuRegistry.registry.getItem("appinventor_arrange_vertical");

    if (item && typeof item.callback === "function") {
        const workspace = (window as any).Blockly?.getMainWorkspace();

        const fakeScope = {workspace: workspace,};
        item.callback(fakeScope, null);
    } else {
        console.error("Callback not found or item is invalid");
    }
}