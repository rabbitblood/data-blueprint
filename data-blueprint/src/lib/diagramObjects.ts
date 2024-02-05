import { attributeBaseHeight, staticDataSize } from "../blueprintConsts";

interface clickable {
  onClick: () => void;
  checkMouseOver: (mousePos: position, cam: camera) => boolean;
}

class diagramObject implements clickable{
  id: number;
  name?: string;
  position: position;
  size: size;
  highlight?: boolean;
  attributes: attribute[];

  constructor(id: number, position: position, size: size, name?: string){
    this.id = id;
    this.position = position;
    this.size = size;
    this.name = name;
    this.attributes = [];
  }

  
  addAttribute(){
    const newAttr = new attribute("newAttribute")
    newAttr.inputPort = new inputPort(newAttr);
    newAttr.outputPort = new outputPort(newAttr);
    newAttr.size.width = this.size.width;
    newAttr.size.height = attributeBaseHeight;
    this.attributes.push(newAttr);
  }

  addExistingAttribute(attribute: attribute){
    attribute.size.width = this.size.width;
    attribute.size.height = attributeBaseHeight;
    this.attributes.push(attribute);
  }

  onClick(){
    console.log("clicked");
  }

  checkMouseOver(mousePos: position, cam: camera): boolean{
    if(mousePos.x > this.position.x && mousePos.x < this.position.x + this.size.width * cam.zoom &&
      mousePos.y > this.position.y && mousePos.y < this.position.y + this.size.height * cam.zoom){
        return true;
      }
      return false;

  }
}

class calculationObject extends diagramObject {
  //
}

class staticDataObject extends diagramObject {
  constructor(id?:number, position?: position, name?: string){
    super(
      id?id:0,
      position?position: { x: 0, y: 0 },
      {width: staticDataSize,height: staticDataSize},
      name
      );

      this.addAttribute();
  }

  addAttribute(){
    const newAttr = new attribute("newAttribute")
    newAttr.outputPort = new outputPort(newAttr);
    newAttr.size.width = this.size.width;
    newAttr.size.height = attributeBaseHeight;
    this.attributes.push(newAttr);
  }
}



class attribute implements clickable{
  name: string;
  value: number;
  inputPort?: inputPort;
  outputPort?: outputPort;
  highlight?: boolean;
  position: position;
  size: size;

  constructor(name: string, value?: number, position?: position){
    this.name = name;
    this.value = value? value : 0;
    this.position = position? position : {x: 0, y: 0};
    this.size = {width: 100, height: 20};
  }

  onClick(){
    console.log(" attribute clicked " + this.name);

    const popForm = () => {
      const form = document.createElement("form");
      form.style.position = "absolute";
      form.style.left = window.innerWidth/2 + "px";
      form.style.top = 0 + "px";
      form.style.backgroundColor = "white";
      form.style.border = "1px solid black";
      form.style.zIndex = "100";
      form.style.padding = "10px";

      const nameLabel = document.createElement("label");
      nameLabel.textContent = "Name";
      form.appendChild(nameLabel);

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = this.name;
      form.appendChild(nameInput);

      form.appendChild(document.createElement("br"));

      const valueLabel = document.createElement("label");
      valueLabel.textContent = "Value";
      form.appendChild(valueLabel);

      const valueInput = document.createElement("input");
      valueInput.type = "number";
      valueInput.value = this.value.toString();
      form.appendChild(valueInput);

      form.appendChild(document.createElement("br"));

      const submit = document.createElement("input");
      submit.type = "submit";
      form.appendChild(submit);

      document.body.appendChild(form);

      form.onsubmit = (e) => {
        e.preventDefault();
        this.name = nameInput.value;
        this.value = parseFloat(valueInput.value);
        document.body.removeChild(form);
      }
    }

    popForm();
  }

  checkMouseOver(mousePos: position, cam: camera): boolean{
    if(mousePos.x > this.position.x && mousePos.x < this.position.x + this.size.width*cam.zoom &&
      mousePos.y > this.position.y && mousePos.y < this.position.y + this.size.height*cam.zoom){
        return true;
      }
      return false;

  }
}


class port{
  type: "input" | "output";
  position: position;
  highlight?: boolean;
  parentAttribute: attribute;

  constructor(parentAttribute: attribute, type: "input" | "output", position?: position ){
    this.type = type;
    this.position = position? position : {x: 0, y: 0};
    this.parentAttribute = parentAttribute;
  }
}

class inputPort extends port {
  connectedOutput?: outputPort;

  constructor(parentAttribute: attribute, position?: position)
  {
    super(parentAttribute ,"input", position);
  }
}

class outputPort extends port  {
  connectedInput?: inputPort;

  constructor(parentAttribute: attribute, position?: position)
  {
    super(parentAttribute ,"output", position);
  }
}

export type {clickable};
export {diagramObject, calculationObject, inputPort, outputPort, port,attribute,staticDataObject};