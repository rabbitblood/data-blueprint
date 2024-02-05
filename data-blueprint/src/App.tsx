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
} from "./lib/diagramObjects";

function App() {
  const isDebug = false; // set to true to show debug info and text bounding boxes
  const appName = "Data Blueprint";

  const canvas = useRef<HTMLCanvasElement>(null);
  const cam: camera = { position: { x: 0, y: 0 }, zoom: 1 };

  let currentDataFlowPercentage: number = useRef(0).current;

  let beginDrag: boolean = useRef(false).current;
  let lastDragPos: position = useRef({ x: 0, y: 0 }).current;

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

  const testObject: diagramObject = {
    id: 1,
    position: { x: 5, y: 5 },
    size: { width: 100, height: 100 },
    attributes: [testAttribute1, testAttribute2],
  };

  const testObject2: diagramObject = {
    id: 2,
    position: { x: 500, y: 500 },
    size: { width: 100, height: 100 },
    attributes: [testAttribute3],
  };

  const testObjects: diagramObject[] = [testObject, testObject2];

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
            ctx.lineTo(lastDragPos.x, lastDragPos.y);
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
      lastDragPos = { x: e.clientX, y: e.clientY };
      //check if mouse is over an object
      for (const obj of testObjects) {
        if (isMouseOnObject({ x: e.clientX, y: e.clientY }, obj, cam)) {
          //check if mouse is over a port
          if (obj.attributes) {
            for (let i = 0; i < obj.attributes.length; i++) {
              currentPort = isMouseOnPort(
                { x: e.clientX, y: e.clientY },
                obj,
                cam
              );
              if (currentPort) {
                beginAttributeConnection = true;
                break;
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
        cam.position.x += (e.clientX - lastDragPos.x) / cam.zoom;
        cam.position.y += (e.clientY - lastDragPos.y) / cam.zoom;
        lastDragPos = { x: e.clientX, y: e.clientY };
      } else if (beginObjectDrag) {
        dragingObject!.position.x += e.clientX - lastDragPos.x;
        dragingObject!.position.y += e.clientY - lastDragPos.y;
        lastDragPos = { x: e.clientX, y: e.clientY };
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
        lastDragPos = { x: e.clientX, y: e.clientY };

        //if current port is input, highlight output ports when mouse is over them
        for (const obj of testObjects) {
          if (!obj.attributes) continue;

          if (currentPort?.type === "input") {
            for (let i = 0; i < obj.attributes.length; i++) {
              const outputPort = obj.attributes[i].outputPort;
              if (!outputPort) return;

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
              if (!inputPort) return;

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
            if (attr.inputPort) {
              attr.inputPort.highlight = false;
            }

            if (attr.outputPort) {
              attr.outputPort.highlight = false;
            }
          });

          if (isMouseOnObject({ x: e.clientX, y: e.clientY }, obj, cam)) {
            const port = isMouseOnPort(
              { x: e.clientX, y: e.clientY },
              obj,
              cam
            );
            if (port) {
              port.highlight = true;
            } else {
              obj.highlight = true;
            }
          }
        }
      }
    });

    addEventListener("mouseup", () => {
      if (beginAttributeConnection) {
        //if current port is input, connect to output port if mouse is over it
        if (currentPort?.type === "input") {
          for (const obj of testObjects) {
            if (!obj.attributes) continue;

            for (let i = 0; i < obj.attributes.length; i++) {
              const outputPort = obj.attributes[i].outputPort;
              if (!outputPort) return;
              outputPort.highlight = false;

              const port = isMouseOnPort(
                { x: lastDragPos.x, y: lastDragPos.y },
                obj,
                cam
              );

              if (port && port.type === "output" && port !== currentPort) {
                (currentPort as inputPort).connectedOutput = port;
                (port as outputPort).connectedInput = currentPort as inputPort;
                break;
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
              if (!inputPort) return;

              inputPort.highlight = false;

              const port = isMouseOnPort(
                { x: lastDragPos.x, y: lastDragPos.y },
                obj,
                cam
              );

              if (port && port.type === "input" && port !== currentPort) {
                (currentPort as outputPort).connectedInput = port;
                (port as inputPort).connectedOutput = currentPort as outputPort;
                break;
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
    addEventListener("keypress", (e: KeyboardEvent) => {
      if (e.key === "w") {
        cam.position.y += 20 / cam.zoom;
      }
      if (e.key === "s") {
        cam.position.y -= 20 / cam.zoom;
      }
      if (e.key === "a") {
        cam.position.x += 20 / cam.zoom;
      }
      if (e.key === "d") {
        cam.position.x -= 20 / cam.zoom;
      }
    });
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
        ctx.fillStyle = "black";
        const th = drawText(ctx, attributDisplay, {
          x: cam.position.x + obj.position.x,
          y: cam.position.y + obj.position.y + currentHeight,
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
    if (!attr.inputPort || !attr.outputPort) return;

    //set ports world position
    attr.inputPort.position = {
      x: cam.position.x + pos.x,
      y: cam.position.y + pos.y + (portSize / 2) * cam.zoom,
    };

    attr.outputPort.position = {
      x:
        cam.position.x +
        pos.x +
        obj.size.width * cam.zoom -
        portSize * cam.zoom,
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

    //draw output port
    ctx.fillStyle = attr.outputPort.highlight ? "yellow" : "red";
    ctx.fillRect(
      cam.position.x + pos.x + obj.size.width * cam.zoom - portSize * cam.zoom,
      cam.position.y + pos.y + (portSize / 2) * cam.zoom,
      portSize * cam.zoom,
      portSize * cam.zoom
    );
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
      if (!inputPort) return;

      if (
        mousePos.x > inputPort.position.x &&
        mousePos.x < inputPort.position.x + portSize * cam.zoom &&
        mousePos.y > inputPort.position.y &&
        mousePos.y < inputPort.position.y + portSize * cam.zoom
      ) {
        return obj.attributes[i].inputPort;
      }

      //check output port
      const outputPort = obj.attributes[i].outputPort;
      if (!outputPort) return;

      if (
        mousePos.x > outputPort.position.x &&
        mousePos.x < outputPort.position.x + portSize * cam.zoom &&
        mousePos.y > outputPort.position.y &&
        mousePos.y < outputPort.position.y + portSize * cam.zoom
      ) {
        return obj.attributes[i].outputPort;
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
