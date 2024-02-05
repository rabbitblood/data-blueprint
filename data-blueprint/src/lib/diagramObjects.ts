class diagramObject {
  id: number;
  name?: string;
  position: position;
  size: size;
  highlight?: boolean;
  attributes?: attribute[];

  constructor(id: number, position: position, size: size, name?: string){
    this.id = id;
    this.position = position;
    this.size = size;
    this.name = name;
  }
}

class calculationObject extends diagramObject {
  //
}



class attribute{
  name: string;
  value?: number;
  inputPort?: inputPort;
  outputPort?: outputPort;
  highlight?: boolean;
  position?: position;

  constructor(name: string, value?: number, position?: position){
    this.name = name;
    this.value = value? value : 0;
    this.position = position? position : {x: 0, y: 0};
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
export {diagramObject, calculationObject, inputPort, outputPort, port,attribute};