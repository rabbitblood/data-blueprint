import { useEffect, useRef } from "react";
import "./css/main.css";
import { drawText } from "canvas-txt";
import {
  attributeBaseHeight,
  baseDiagramHeight,
  attributeMargin,
  portSize,
} from "./blueprintConsts";

import {
  diagramObject,
  inputPort,
  outputPort,
  port,
  attribute,
  staticDataObject,
  uiElement,
} from "./lib/diagramObjects";

function App() {
  const isDebug = false; // set to true to show debug info and text bounding boxes
  const appName = "Data Blueprint";

  const canvas = useRef<HTMLCanvasElement>(null);
  const cam: camera = { position: { x: 0, y: 0 }, zoom: 1 };

  let currentDataFlowPercentage: number = useRef(0).current;

  let beginDrag: boolean = useRef(false).current;
  let lastFrameMousePos: position = useRef({ x: 0, y: 0 }).current;

  let beginObjectDrag: boolean = useRef(false).current;
  let dragingObject: diagramObject | null = useRef(null).current;

  let beginAttributeConnection: boolean = useRef(false).current;
  let currentPort: port | undefined = useRef(undefined).current;

  //test data
  const testAttribute1: attribute = new attribute("bigtime", 20);
  testAttribute1.inputPort = new inputPort(testAttribute1);
  testAttribute1.outputPort = new outputPort(testAttribute1);

  const testAttribute2: attribute = new attribute("token");
  testAttribute2.inputPort = new inputPort(testAttribute2);
  testAttribute2.outputPort = new outputPort(testAttribute2);

  const testAttribute3: attribute = new attribute("player");
  testAttribute3.inputPort = new inputPort(testAttribute3);
  testAttribute3.outputPort = new outputPort(testAttribute3);

  const testObject: diagramObject = new diagramObject(
    1,
    { x: 200, y: 200 },
    { width: 100, height: 100 }
  );
  testObject.addExistingAttribute(testAttribute1);
  testObject.addExistingAttribute(testAttribute2);

  const testObject2: diagramObject = new diagramObject(
    2,
    { x: 500, y: 500 },
    { width: 100, height: 100 }
  );
  testObject2.addExistingAttribute(testAttribute3);

  const testData: staticDataObject = new staticDataObject();

  const testObjects: diagramObject[] = [testObject, testObject2, testData];

  //--------------ui elements----------------
  const newDiagramObjectButton: uiElement = new uiElement(
    { x: window.innerWidth - 100, y: 50 },
    { width: 50, height: 50 }
  );
  const uiElements: uiElement[] = [newDiagramObjectButton];

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    canvas.current!.width = window.innerWidth;
    canvas.current!.height = window.innerHeight;

    if (ctx) {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      testObjects.forEach((obj) => {
        drawObject(ctx!, obj, cam);
      });
    }

    setInterval(() => {
      if (ctx) {
        updateAttributeValues();

        drawBackground(ctx);
        testObjects.forEach((obj) => {
          drawObject(ctx!, obj, cam);
          drawPortConnections(ctx, obj);
          drawDataFlow(ctx, obj, currentDataFlowPercentage);
        });
        drawUI(ctx);

        //draw attribute connection line
        if (beginAttributeConnection) {
          if (currentPort) {
            ctx.strokeStyle = "white";
            ctx.beginPath();
            ctx.moveTo(currentPort.position.x, currentPort.position.y);
            ctx.lineTo(lastFrameMousePos.x, lastFrameMousePos.y);
            ctx.stroke();
          }
        }

        //update data flow percentage
        currentDataFlowPercentage += 0.01;
        if (currentDataFlowPercentage > 1) {
          currentDataFlowPercentage = 0;
        }
      }
    }, 1000 / 60);

    //window resize
    addEventListener("resize", () => {
      canvas.current!.width = window.innerWidth;
      canvas.current!.height = window.innerHeight;
    });

    //-------------------------------------mouse input------------------------------------
    addEventListener("mousedown", (e: MouseEvent) => {
      lastFrameMousePos = { x: e.clientX, y: e.clientY };
      //check if mouse is over a ui element
      for (const uiElement of uiElements) {
        if (uiElement.checkMouseOver({ x: e.clientX, y: e.clientY }, cam)) {
          console.log("clicked ui element");
          const newDiagram = uiElement.onClick();
          testObjects.push(newDiagram);
        }
      }

      //check if mouse is over an object
      for (const obj of testObjects) {
        if (isMouseOnObject({ x: e.clientX, y: e.clientY }, obj, cam)) {
          //check if mouse is over a port
          if (obj.attributes) {
            for (let i = 0; i < obj.attributes.length; i++) {
              if (
                obj.attributes[i].checkMouseOver(
                  { x: e.clientX, y: e.clientY },
                  cam
                )
              ) {
                currentPort = isMouseOnPort(
                  { x: e.clientX, y: e.clientY },
                  obj,
                  cam
                );
                if (currentPort) {
                  beginAttributeConnection = true;
                  break;
                } else {
                  obj.attributes[i].onClick();
                }
              }
            }
          }
          if (beginAttributeConnection) {
            break;
          }

          beginObjectDrag = true;
          dragingObject = obj;
          break;
        }
      }

      if (!beginObjectDrag && !beginAttributeConnection) {
        beginDrag = true;
      } else {
        beginDrag = false;
      }
    });

    addEventListener("mousemove", (e: MouseEvent) => {
      if (beginDrag) {
        cam.position.x += (e.clientX - lastFrameMousePos.x) / cam.zoom;
        cam.position.y += (e.clientY - lastFrameMousePos.y) / cam.zoom;
      } else if (beginObjectDrag) {
        dragingObject!.position.x += e.clientX - lastFrameMousePos.x;
        dragingObject!.position.y += e.clientY - lastFrameMousePos.y;
      } else if (beginAttributeConnection) {
        //draw line from port to mouse position
        const portPos = currentPort?.position;
        ctx!.strokeStyle = "white";
        if (portPos) {
          ctx!.beginPath();
          ctx!.moveTo(portPos.x, portPos.y);
          ctx!.lineTo(e.clientX, e.clientY);
          ctx!.stroke();
        }

        //if current port is input, highlight output ports when mouse is over them
        for (const obj of testObjects) {
          if (!obj.attributes) continue;

          if (currentPort?.type === "input") {
            for (let i = 0; i < obj.attributes.length; i++) {
              const outputPort = obj.attributes[i].outputPort;
              if (!outputPort) continue;

              outputPort.highlight = false;

              const port = isMouseOnPort(
                { x: e.clientX, y: e.clientY },
                obj,
                cam
              );

              if (port && port.type === "output" && port !== currentPort) {
                port.highlight = true;
              }
            }
          }
          //if current port is output, highlight input ports when mouse is over them
          else {
            for (let i = 0; i < obj.attributes.length; i++) {
              const inputPort = obj.attributes[i].inputPort;
              if (!inputPort) continue;

              inputPort.highlight = false;

              const port = isMouseOnPort(
                { x: e.clientX, y: e.clientY },
                obj,
                cam
              );

              if (port && port.type === "input" && port !== currentPort) {
                port.highlight = true;
              }
            }
          }
        }
      } else {
        for (const obj of testObjects) {
          obj.highlight = false;
          obj.attributes?.forEach((attr) => {
            attr.highlight = false;
            if (attr.inputPort) {
              attr.inputPort.highlight = false;
            }

            if (attr.outputPort) {
              attr.outputPort.highlight = false;
            }
          });

          if (isMouseOnObject({ x: e.clientX, y: e.clientY }, obj, cam)) {
            for (let i = 0; i < obj.attributes.length; i++) {
              if (
                obj.attributes[i].checkMouseOver(
                  { x: e.clientX, y: e.clientY },
                  cam
                )
              ) {
                const port = isMouseOnPort(
                  { x: e.clientX, y: e.clientY },
                  obj,
                  cam
                );
                if (port) {
                  port.highlight = true;
                  obj.highlight = false;
                  break;
                } else {
                  obj.attributes[i].highlight = true;
                  obj.highlight = false;
                  break;
                }
              } else {
                obj.highlight = true;
              }
            }
          }
        }
      }

      lastFrameMousePos = { x: e.clientX, y: e.clientY };
    });

    addEventListener("mouseup", (e) => {
      lastFrameMousePos = { x: e.clientX, y: e.clientY };

      if (beginAttributeConnection) {
        //if current port is input, connect to output port if mouse is over it
        if (currentPort?.type === "input") {
          for (const obj of testObjects) {
            if (!obj.attributes) continue;

            for (let i = 0; i < obj.attributes.length; i++) {
              const outputPort = obj.attributes[i].outputPort;
              if (!outputPort) continue;
              outputPort.highlight = false;

              const port = isMouseOnPort(
                { x: lastFrameMousePos.x, y: lastFrameMousePos.y },
                obj,
                cam
              );

              if (port && port.type === "output") {
                (currentPort as inputPort).connectedOutput = port as outputPort;
                (port as outputPort).connectedInput = currentPort as inputPort;
                continue;
              }
            }
          }
        }
        //if current port is output, connect to input port if mouse is over it
        else {
          for (const obj of testObjects) {
            if (!obj.attributes) continue;

            for (let i = 0; i < obj.attributes.length; i++) {
              const inputPort = obj.attributes[i].inputPort;
              if (!inputPort) continue;

              inputPort.highlight = false;

              const port = isMouseOnPort(
                { x: lastFrameMousePos.x, y: lastFrameMousePos.y },
                obj,
                cam
              );

              if (port && port.type === "input") {
                (currentPort as outputPort).connectedInput = port as inputPort;
                (port as inputPort).connectedOutput = currentPort as outputPort;
                continue;
              }
            }
          }
        }
        console.log(currentPort);
      }

      //reset highlights
      beginDrag = false;
      beginObjectDrag = false;
      dragingObject = null;
      beginAttributeConnection = false;
    });

    addEventListener("wheel", (e: WheelEvent) => {
      if (e.deltaY > 0) {
        cam.zoom *= 0.9;
        cam.position.x += 10 / cam.zoom;
        cam.position.y += 10 / cam.zoom;
      } else {
        cam.zoom *= 1.1;
        cam.position.x -= 10 / cam.zoom;
        cam.position.y -= 10 / cam.zoom;
      }
    });

    //----------------------------------keyboard input-----------------------------------
    // addEventListener("keypress", (e: KeyboardEvent) => {
    //   if (e.key === "w") {
    //     cam.position.y += 20 / cam.zoom;
    //   }
    //   if (e.key === "s") {
    //     cam.position.y -= 20 / cam.zoom;
    //   }
    //   if (e.key === "a") {
    //     cam.position.x += 20 / cam.zoom;
    //   }
    //   if (e.key === "d") {
    //     cam.position.x -= 20 / cam.zoom;
    //   }
    // });
  }, []);

  function drawBackground(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  function drawUI(ctx: CanvasRenderingContext2D) {
    //draw app name
    ctx.fillStyle = "white";
    drawText(ctx, appName, {
      x: 0,
      y: 20,
      width: window.innerWidth,
      height: 100,
      align: "center",
      justify: true,
      fontSize: 50,
      debug: isDebug,
    });

    //draw zoom level
    ctx.fillStyle = "white";
    drawText(ctx, `Zoom: ${cam.zoom.toFixed(2)}`, {
      x: 0,
      y: 50,
      width: window.innerWidth,
      height: 100,
      align: "center",
      justify: true,
      fontSize: 20,
      debug: isDebug,
    });

    //draw current mouse position
    ctx.fillStyle = "white";
    drawText(ctx, `Mouse: ${lastFrameMousePos.x}, ${lastFrameMousePos.y}`, {
      x: 0,
      y: 80,
      width: window.innerWidth,
      height: 100,
      align: "center",
      justify: true,
      fontSize: 20,
      debug: isDebug,
    });

    //draw icon for instantiate new diagram object
    ctx.fillStyle = "cyan";
    ctx.fillRect(
      window.innerWidth - newDiagramObjectButton.size.width * 2,
      newDiagramObjectButton.size.height,
      newDiagramObjectButton.size.width,
      newDiagramObjectButton.size.height
    );
    ctx.fillStyle = "black";
    drawText(ctx, "+", {
      x: window.innerWidth - newDiagramObjectButton.size.width * 2,
      y: newDiagramObjectButton.size.height,
      width: newDiagramObjectButton.size.width,
      height: newDiagramObjectButton.size.height,
      align: "center",
      justify: true,
      fontSize: 50,
      debug: isDebug,
    });
  }

  function drawObject(
    ctx: CanvasRenderingContext2D,
    obj: diagramObject,
    cam: camera
  ) {
    ctx.fillStyle = obj.highlight ? "yellow" : "white";
    ctx.fillRect(
      cam.position.x + obj.position.x,
      cam.position.y + obj.position.y,
      obj.size.width * cam.zoom,
      obj.size.height * cam.zoom
    );

    const currentHeight = drawObjAttributes(ctx, obj);

    if (currentHeight > obj.size.height * cam.zoom) {
      obj.size.height = currentHeight + baseDiagramHeight;
    }
  }

  function drawObjAttributes(
    ctx: CanvasRenderingContext2D,
    obj: diagramObject
  ): number {
    let currentHeight = 0 + (baseDiagramHeight / 2) * cam.zoom;

    if (obj.attributes && obj.attributes.length > 0) {
      for (let i = 0; i < obj.attributes.length; i++) {
        const attributDisplay = `${obj.attributes[i].name}: ${obj.attributes[i].value}`;

        //update attribute world position
        obj.attributes[i].position = {
          x: obj.position.x + cam.position.x,
          y: obj.position.y + currentHeight + cam.position.y,
        };

        //draw attribute box
        ctx.fillStyle = obj.attributes[i].highlight ? "yellow" : "silver";
        ctx.fillRect(
          obj.attributes[i].position.x,
          obj.attributes[i].position.y,
          obj.size.width * cam.zoom,
          attributeBaseHeight * cam.zoom
        );

        //draw attribute text
        ctx.fillStyle = "black";
        const th = drawText(ctx, attributDisplay, {
          x: obj.attributes[i].position.x,
          y: obj.attributes[i].position.y,
          width: obj.size.width * cam.zoom,
          height: attributeBaseHeight * cam.zoom,
          align: "center",
          justify: true,
          fontSize: 10 * cam.zoom,
          debug: isDebug,
        }).height;

        drawAttributePorts(
          ctx,
          obj.attributes[i],
          cam,
          { x: obj.position.x, y: currentHeight + obj.position.y + th / 2 },
          obj
        );

        currentHeight += th * 2 + attributeMargin * cam.zoom;
      }
    }

    return currentHeight;
  }

  function drawAttributePorts(
    ctx: CanvasRenderingContext2D,
    attr: attribute,
    cam: camera,
    pos: position,
    obj: diagramObject
  ) {
    if (attr.inputPort) {
      //set ports world position
      attr.inputPort.position = {
        x: cam.position.x + pos.x,
        y: cam.position.y + pos.y + (portSize / 2) * cam.zoom,
      };

      //draw input port
      ctx.fillStyle = attr.inputPort.highlight ? "yellow" : "blue";
      ctx.fillRect(
        cam.position.x + pos.x,
        cam.position.y + pos.y + (portSize / 2) * cam.zoom,
        portSize * cam.zoom,
        portSize * cam.zoom
      );
    }

    if (attr.outputPort) {
      attr.outputPort.position = {
        x:
          cam.position.x +
          pos.x +
          obj.size.width * cam.zoom -
          portSize * cam.zoom,
        y: cam.position.y + pos.y + (portSize / 2) * cam.zoom,
      };

      //draw output port
      ctx.fillStyle = attr.outputPort.highlight ? "yellow" : "red";
      ctx.fillRect(
        cam.position.x +
          pos.x +
          obj.size.width * cam.zoom -
          portSize * cam.zoom,
        cam.position.y + pos.y + (portSize / 2) * cam.zoom,
        portSize * cam.zoom,
        portSize * cam.zoom
      );
    }
  }

  function drawPortConnections(
    ctx: CanvasRenderingContext2D,
    obj: diagramObject
  ) {
    if (!obj.attributes) return;

    for (let i = 0; i < obj.attributes.length; i++) {
      const inputPort = obj.attributes[i].inputPort;
      if (!inputPort) return;

      if (inputPort.connectedOutput) {
        ctx.strokeStyle = "white";
        ctx.beginPath();
        ctx.moveTo(inputPort.position.x, inputPort.position.y);
        ctx.lineTo(
          inputPort.connectedOutput.position.x,
          inputPort.connectedOutput.position.y
        );
        ctx.stroke();
      }
    }
  }

  function drawDataFlow(
    ctx: CanvasRenderingContext2D,
    obj: diagramObject,
    percentage: number
  ) {
    ctx.fillStyle = "white";
    obj.attributes?.forEach((attr) => {
      if (attr.inputPort && attr.inputPort.connectedOutput) {
        const outputPort = attr.inputPort.connectedOutput;
        const inputPort = attr.inputPort;

        const x1 = outputPort.position.x;
        const y1 = outputPort.position.y;
        const x2 = inputPort.position.x;
        const y2 = inputPort.position.y;

        const dx = x2 - x1;
        const dy = y2 - y1;

        const x = x1 + dx * percentage;
        const y = y1 + dy * percentage;

        ctx.fillRect(x - 5, y - 5, 10, 10);
      }
    });
  }

  function updateAttributeValues() {
    for (const obj of testObjects) {
      if (!obj.attributes) continue;

      for (let i = 0; i < obj.attributes.length; i++) {
        const inputPort = obj.attributes[i].inputPort;
        if (!inputPort) return;

        if (inputPort.connectedOutput) {
          obj.attributes[i].value =
            inputPort.connectedOutput.parentAttribute.value;
        }
      }
    }
  }

  function isMouseOnObject(
    mousePos: position,
    obj: diagramObject,
    cam: camera
  ) {
    return (
      mousePos.x > cam.position.x + obj.position.x &&
      mousePos.x <
        cam.position.x + obj.position.x + obj.size.width * cam.zoom &&
      mousePos.y > cam.position.y + obj.position.y &&
      mousePos.y < cam.position.y + obj.position.y + obj.size.height * cam.zoom
    );
  }

  function isMouseOnPort(
    mousePos: position,
    obj: diagramObject,
    cam: camera
  ): port | undefined {
    if (!obj || !obj.attributes) return;

    for (let i = 0; i < obj.attributes.length; i++) {
      //check input port
      const inputPort = obj.attributes[i].inputPort;
      if (inputPort) {
        if (
          mousePos.x > inputPort.position.x &&
          mousePos.x < inputPort.position.x + portSize * cam.zoom &&
          mousePos.y > inputPort.position.y &&
          mousePos.y < inputPort.position.y + portSize * cam.zoom
        ) {
          return obj.attributes[i].inputPort;
        }
      }

      //check output port
      const outputPort = obj.attributes[i].outputPort;
      if (outputPort) {
        if (
          mousePos.x > outputPort.position.x &&
          mousePos.x < outputPort.position.x + portSize * cam.zoom &&
          mousePos.y > outputPort.position.y &&
          mousePos.y < outputPort.position.y + portSize * cam.zoom
        ) {
          return obj.attributes[i].outputPort;
        }
      }
    }

    return;
  }

  return (
    <>
      <canvas className="blueprint-screen" ref={canvas}></canvas>
    </>
  );
}

export default App;
