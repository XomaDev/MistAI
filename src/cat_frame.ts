const FRAME_URL = "https://mist-playground.vercel.app/"
let codeSpaceShown = false
let resizing = false // user resizing the iframe

export function addMistButton() {
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

export function addCodeSpace() {
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

    //run button
    // const button = document.createElement("div")
    // button.classList.add("ode-TextButton")
    // button.id = "mistRun"
    // button.innerText = "Run Code"
    // button.style.marginBottom = "20px"
    //
    // button.addEventListener("click", () => {
    //   (window as any).main.mist(editorCode)
    // })

    content.appendChild(header)
    //content.appendChild(button)

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