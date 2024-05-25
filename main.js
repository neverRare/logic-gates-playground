"use strict";
document.addEventListener("DOMContentLoaded", () => {
  const textSize = 20;
  const textMargin = 10;
  const offset = 10;
  const thickness = 6;
  const gateSize = 50;
  const margin = 20;
  const dead = "black";
  const live = "red";
  const tableBox = document.getElementById("table-box");
  const table = document.getElementById("table");
  const canvas = document.getElementById("canvas");
  const context = canvas.getContext("2d");
  function resize() {
    canvas.width = document.body.clientWidth * devicePixelRatio;
    canvas.height = document.body.clientHeight * devicePixelRatio;
  }
  resize();
  window.addEventListener("resize", resize);
  function draw(f, ...rest) {
    context[f](...rest.map((x) => x * devicePixelRatio));
  }
  function circle(x, y, radius) {
    context.arc(
      x * devicePixelRatio,
      y * devicePixelRatio,
      radius * devicePixelRatio,
      0,
      2 * Math.PI,
    );
  }
  class Wire {
    constructor(x1, y1, x2, y2, isVertical) {
      this.x1 = x1;
      this.y1 = y1;
      this.x2 = x2;
      this.y2 = y2;
      this.isVertical = isVertical;

      this.input = null;
      this.output = null;
      this.active = false;
    }
    update() {
      this.active = this.input?.active ?? false;
      this.output?.update();
    }
    draw() {
      if (this.active) {
        context.strokeStyle = live;
        context.setLineDash([
          devicePixelRatio * thickness * 2,
          devicePixelRatio * thickness,
        ]);
      } else {
        context.strokeStyle = dead;
      }
      context.beginPath();
      draw("moveTo", this.x1, this.y1);
      const midline = (this.x1 + this.x2) / 2;
      if (this.isVertical) {
        draw(
          "bezierCurveTo",
          midline,
          this.y1,
          this.x2,
          this.y2 + gateSize * 3,
          this.x2,
          this.y2,
        );
      } else {
        draw(
          "bezierCurveTo",
          midline,
          this.y1,
          midline,
          this.y2,
          this.x2,
          this.y2,
        );
      }
      context.stroke();
      context.setLineDash([]);
    }
    detach() {
      wires.splice(wires.indexOf(this), 1);
      for (const gate of gates) {
        for (const [i, wire] of gate.input.entries()) {
          if (wire === this) {
            gate.input[i] = null;
          }
        }
        if (gate.output != null) {
          let i;
          while (((i = gate.output.indexOf(this)), i !== -1)) {
            gate.output.splice(i, 1);
          }
        }
        gate.update();
      }
    }
  }
  class Gate {
    constructor(kind, x, y) {
      this.kind = kind;
      this.x = x;
      this.y = y;
      switch (kind) {
        case "switch":
          this.input = [];
          break;
        case "bulb":
        case "not":
          this.input = [null];
          break;
        case "and":
        case "or":
        case "implies":
        case "xor":
        case "xnor":
          this.input = [null, null];
      }
      switch (kind) {
        case "bulb":
          this.output = null;
          break;
        case "switch":
        case "not":
        case "and":
        case "or":
        case "implies":
        case "xor":
        case "xnor":
          this.output = [];
      }
      this.active = false;
      this.label = null;
    }
    collide(x, y) {
      return (
        this.x <= x &&
        x <= this.x + gateSize &&
        this.y <= y &&
        y <= this.y + gateSize
      );
    }
    collideOutput(x, y) {
      return (
        this.x + gateSize <= x &&
        x <= this.x + gateSize * 2 &&
        this.y <= y &&
        y <= this.y + gateSize
      );
    }
    collideInput(x, y) {
      return (
        this.x - gateSize <= x &&
        x <= this.x + gateSize &&
        this.y <= y &&
        y <= this.y + gateSize
      );
    }
    update() {
      const left = this.input[0]?.active ?? false;
      const right = this.input[1]?.active ?? false;
      switch (this.kind) {
        case "switch":
          break;
        case "bulb":
          this.active = left;
          break;
        case "not":
          this.active = !left;
          break;
        case "and":
          this.active = left && right;
          break;
        case "or":
          this.active = left || right;
          break;
        case "implies":
          this.active = !left || right;
          break;
        case "xor":
          this.active = left !== right;
          break;
        case "xnor":
          this.active = left === right;
          break;
      }
      if (this.output != null) {
        for (const gate of this.output) {
          gate.update();
        }
      }
    }
    drawWire() {
      context.strokeStyle = dead;
      if (this.kind !== "bulb") {
        for (const [i, wire] of this.input.entries()) {
          if (wire == null) {
            context.beginPath();
            const y = this.y + ((i + 1) * gateSize) / (this.input.length + 1);
            draw("moveTo", this.x - gateSize, y);
            draw("lineTo", this.x + gateSize / 2, y);
            context.stroke();
          }
        }
      }
      if (this.output != null) {
        if (this.output.length === 0) {
          context.beginPath();
          draw("moveTo", this.x + gateSize / 2, this.y + gateSize / 2);
          draw("lineTo", this.x + gateSize * 2, this.y + gateSize / 2);
          context.stroke();
        } else if (this.collideOutput(x, y) && selected == null) {
          context.beginPath();
          draw("moveTo", this.x + gateSize / 2, this.y + gateSize / 2);
          draw("lineTo", this.x + gateSize * 2, this.y + gateSize);
          context.stroke();
        }
      }
    }
    draw() {
      if (this.active) {
        context.strokeStyle = live;
      } else {
        context.strokeStyle = dead;
      }
      switch (this.kind) {
        case "switch": {
          const outer = [
            this.x + gateSize / 8,
            this.y,
            (gateSize * 3) / 4,
            gateSize,
          ];
          draw("fillRect", ...outer);
          draw("strokeRect", ...outer);
          draw(
            "strokeRect",
            this.x + (gateSize * 3) / 8,
            this.y + gateSize / 4,
            gateSize / 4,
            gateSize / 2,
          );
          context.beginPath();
          draw("moveTo", this.x + (gateSize * 3) / 8, this.y + gateSize / 2);
          draw("lineTo", this.x + (gateSize * 5) / 8, this.y + gateSize / 2);
          context.stroke();
          break;
        }
        case "bulb": {
          const circleArgs = [
            this.x + gateSize / 2,
            this.y + (gateSize * 3) / 8,
            (gateSize * 3) / 8,
          ];
          const rectangle = [
            this.x + (gateSize * 3) / 8,
            this.y + (gateSize * 3) / 8,
            gateSize / 4,
            (gateSize * 5) / 8,
          ];
          context.beginPath();
          circle(...circleArgs);
          context.fill();
          draw("fillRect", ...rectangle);
          context.beginPath();
          circle(...circleArgs);
          context.stroke();
          draw("strokeRect", ...rectangle);
          break;
        }
        case "not":
          context.beginPath();
          draw("moveTo", this.x, this.y);
          draw("lineTo", this.x + (gateSize * 3) / 4, this.y + gateSize / 2);
          draw("lineTo", this.x, this.y + gateSize);
          context.closePath();
          context.fill();
          context.stroke();
          context.beginPath();
          circle(
            this.x + (gateSize * 3) / 4,
            this.y + gateSize / 2,
            (gateSize * 3) / 16,
          );
          context.fill();
          context.stroke();
          break;
        case "and":
          context.beginPath();
          draw("moveTo", this.x, this.y);
          draw(
            "quadraticCurveTo",
            this.x + gateSize,
            this.y,
            this.x + gateSize,
            this.y + gateSize / 2,
          );
          draw(
            "quadraticCurveTo",
            this.x + gateSize,
            this.y + gateSize,
            this.x,
            this.y + gateSize,
          );
          context.closePath();
          context.fill();
          context.stroke();
          break;
        case "or":
        case "implies":
          context.beginPath();
          draw("moveTo", this.x, this.y);
          draw(
            "quadraticCurveTo",
            this.x + gateSize / 2,
            this.y,
            this.x + gateSize,
            this.y + gateSize / 2,
          );
          draw(
            "quadraticCurveTo",
            this.x + gateSize / 2,
            this.y + gateSize,
            this.x,
            this.y + gateSize,
          );
          draw(
            "quadraticCurveTo",
            this.x + gateSize / 2,
            this.y + gateSize / 2,
            this.x,
            this.y,
          );
          context.closePath();
          context.fill();
          context.stroke();
          if (this.kind === "implies") {
            context.beginPath();
            circle(
              this.x + gateSize / 8,
              this.y + (gateSize * 3) / 8,
              (gateSize * 3) / 16,
            );
            context.fill();
            context.stroke();
          }
          break;
        case "xor":
        case "xnor":
          context.beginPath();
          draw("moveTo", this.x, this.y);
          draw(
            "quadraticCurveTo",
            this.x + gateSize / 4,
            this.y + gateSize / 2,
            this.x,
            this.y + gateSize,
          );
          context.stroke();
          context.beginPath();
          draw("moveTo", this.x + gateSize / 4, this.y);
          draw(
            "quadraticCurveTo",
            this.x + gateSize / 2,
            this.y,
            this.x + gateSize,
            this.y + gateSize / 2,
          );
          draw(
            "quadraticCurveTo",
            this.x + gateSize / 2,
            this.y + gateSize,
            this.x + gateSize / 4,
            this.y + gateSize,
          );
          draw(
            "quadraticCurveTo",
            this.x + gateSize / 2,
            this.y + gateSize / 2,
            this.x + gateSize / 4,
            this.y,
          );
          context.closePath();
          context.fill();
          context.stroke();
          if (this.kind === "xnor") {
            context.beginPath();
            circle(
              this.x + gateSize,
              this.y + gateSize / 2,
              (gateSize * 3) / 16,
            );
            context.fill();
            context.stroke();
          }
          break;
      }
      if (this.label != null) {
        context.fillStyle = "black";
        context.font = `${(gateSize / 2) * devicePixelRatio}px monospace`;
        context.fillText(
          this.label,
          (this.x - gateSize) * devicePixelRatio,
          (this.y + (gateSize * 3) / 4) * devicePixelRatio,
        );
        context.fillStyle = "white";
      }
    }
  }
  let tableShown = false;
  let fromNew = false;
  let selected = null;
  let startX = 0;
  let startY = 0;
  let x = 0;
  let y = 0;
  let dragX = 0;
  let dragY = 0;
  const wires = [];
  const gates = [];
  const toolBox = [
    "switch",
    "bulb",
    "not",
    "and",
    "or",
    "implies",
    "xor",
    "xnor",
  ].map((value, i) => new Gate(value, margin * (i + 1) + gateSize * i, margin));
  function updateTable() {
    const switches = gates
      .filter((gate) => gate.type === "switch")
      .sort((a, b) => a.y - b.y);
    if (switches.length > 26) {
      // do what?
    }
    for (const [i, gate] of switches.entries()) {
      const letter = String.fromCharCode(
        (i + "P".charCodeAt(0) - "A".charCodeAt(0)) %
            ("Z".charCodeAt(0) - "A".charCodeAt(0)) + "A".charCodeAt(0),
      );
      gate.label = letter;
    }
  }
  function getWidth() {
    if (tableShown) {
      return document.body.clientWidth / 2;
    } else {
      return document.body.clientWidth;
    }
  }
  canvas.addEventListener("click", (event) => {
    if (
      (startX - event.x) ** 2 + (startY - event.y) ** 2 <
        (gateSize / 4) ** 2
    ) {
      const width = getWidth();
      const height = document.body.clientHeight;
      if (
        width - gateSize - margin <= event.x &&
        event.x <= width - margin &&
        height - gateSize - margin <= event.y &&
        event.y <= height - margin
      ) {
        tableShown = !tableShown;
        let moveBy = document.body.clientWidth / 4;
        if (tableShown) {
          tableBox.classList.remove("hide");
          moveBy *= -1;
        } else {
          tableBox.classList.add("hide");
        }
        for (const gate of gates) {
          gate.x += moveBy;
        }
        for (const wire of wires) {
          wire.x1 += moveBy;
          wire.x2 += moveBy;
        }
      }
      for (const gate of gates) {
        if (gate.kind === "switch" && gate.collide(event.x, event.y)) {
          gate.active = !gate.active;
          gate.update();
          updateTable();
        }
      }
      event.preventDefault();
    }
  });
  canvas.addEventListener("mousedown", (event) => {
    startX = event.x;
    startY = event.y;
    if (event.button !== 0) {
      return;
    }
    let hit = false;
    for (const gate of gates) {
      if (gate.collide(event.x, event.y)) {
        hit = true;
        selected = gate;
        break;
      }
    }
    if (!hit) {
      for (const tool of toolBox) {
        if (tool.collide(event.x, event.y)) {
          fromNew = true;
          hit = true;
          selected = new Gate(
            tool.kind,
            event.x - gateSize / 2,
            event.y - gateSize / 2,
          );
          gates.push(selected);
          break;
        }
      }
    }
    if (!hit) {
      for (const gate of gates) {
        if (gate.output != null && gate.collideOutput(event.x, event.y)) {
          hit = true;
          selected = new Wire(
            gate.x + gateSize / 2,
            gate.y + gateSize / 2,
            event.x,
            event.y,
          );
          gate.output.push(selected);
          selected.input = gate;
          wires.push(selected);
          selected.update();
          break;
        }
      }
    }
    if (!hit) {
      dragX = event.x;
      dragY = event.y;
    }
    event.preventDefault();
  });
  canvas.addEventListener("mousemove", (event) => {
    x = event.x;
    y = event.y;
    if (event.buttons % 2 !== 1) {
      return;
    }
    if (selected != null) {
      if (selected instanceof Gate) {
        selected.x = event.x - gateSize / 2;
        selected.y = event.y - gateSize / 2;
        for (const [i, wire] of selected.input.entries()) {
          if (wire != null) {
            wire.x2 = event.x;
            wire.y2 = event.y -
              gateSize / 2 +
              ((i + 1) * gateSize) / (selected.input.length + 1);
          }
        }
        if (selected.output != null) {
          for (const wire of selected.output) {
            wire.x1 = event.x;
            wire.y1 = event.y;
          }
        }
      }
      if (selected instanceof Wire) {
        selected.x2 = event.x;
        selected.y2 = event.y;
      }
    } else {
      const moveX = event.x - dragX;
      const moveY = event.y - dragY;
      dragX = event.x;
      dragY = event.y;
      for (const wire of wires) {
        wire.x1 += moveX;
        wire.x2 += moveX;
        wire.y1 += moveY;
        wire.y2 += moveY;
      }
      for (const gate of gates) {
        gate.x += moveX;
        gate.y += moveY;
      }
    }
    event.preventDefault();
  });
  canvas.addEventListener("mouseup", (event) => {
    const width = getWidth();
    if (fromNew) {
      selected.update();
      fromNew = false;
      updateTable();
    }
    if (
      selected instanceof Gate &&
      width - margin - gateSize <= event.x &&
      event.x <= width - margin &&
      margin <= event.y &&
      event.y <= margin + gateSize
    ) {
      for (const wire of [...selected.input, ...(selected.output ?? [])]) {
        wire?.detach();
      }
      gates.splice(gates.indexOf(selected), 1);
    }
    if (selected instanceof Wire) {
      let attached = false;
      for (const gate of gates) {
        if (gate.collideInput(event.x, event.y)) {
          let i;
          const indices = [...gate.input.entries()]
            .filter(([_, input]) => input == null)
            .map(([i, _]) => i);
          switch (indices.length) {
            case 1:
              i = indices[0];
              break;
            case 2:
              if (event.y < gate.y + gateSize / 2) {
                i = indices[0];
              } else {
                i = indices[1];
              }
              break;
            case 0:
              continue;
          }
          attached = true;
          gate.input[i] = selected;
          selected.output = gate;
          selected.x2 = gate.x + gateSize / 2;
          selected.y2 = gate.y + ((i + 1) * gateSize) / (gate.input.length + 1);
          if (gate.kind === "bulb") {
            selected.isVertical = true;
          }
          gate.update();
          updateTable();
          break;
        }
      }
      if (!attached) {
        selected.detach();
      }
    }
    selected = null;
  });
  function callback() {
    const width = getWidth();
    const height = document.body.clientHeight;
    context.font = `${textSize * devicePixelRatio}px monospace`;
    context.fillStyle = "white";
    context.lineWidth = thickness * devicePixelRatio;
    context.lineDashOffset = (Date.now() * devicePixelRatio) %
      (devicePixelRatio * thickness * 3);
    context.clearRect(0, 0, canvas.width, canvas.height);
    {
      context.strokeStyle = "red";
      context.beginPath();
      draw("moveTo", width - margin - gateSize, margin);
      draw("lineTo", width - margin, margin + gateSize);
      context.stroke();
      context.beginPath();
      draw("moveTo", width - margin, margin);
      draw("lineTo", width - margin - gateSize, margin + gateSize);
      context.stroke();
    }
    {
      const left = width - margin * 2 - gateSize * 2;
      const top = height - margin - gateSize;
      context.strokeStyle = "black";
      context.fillStyle = "black";
      context.beginPath();
      context.arc(
        (left + gateSize / 2) * devicePixelRatio,
        (top + gateSize / 4) * devicePixelRatio,
        gateSize / 4,
        -Math.PI,
        Math.PI / 2,
      );
      draw("lineTo", left + gateSize / 2, top + (gateSize * 3) / 4);
      context.stroke();
      context.beginPath();
      circle(left + gateSize / 2, top + gateSize, thickness);
      context.fill();
      context.fillStyle = "white";
    }
    {
      context.strokeStyle = "black";
      draw(
        "strokeRect",
        width - margin - gateSize,
        height - margin - gateSize,
        gateSize,
        gateSize,
      );
      context.beginPath();
      draw("moveTo", width - margin - gateSize / 2, height - margin - gateSize);
      draw("lineTo", width - margin - gateSize / 2, height - margin);
      context.stroke();
      context.beginPath();
      draw("moveTo", width - margin - gateSize, height - margin - gateSize / 2);
      draw("lineTo", width - margin, height - margin - gateSize / 2);
      context.stroke();
    }
    for (const tool of toolBox) {
      tool.draw();
    }
    for (const wire of wires) {
      wire.draw();
    }
    for (const gate of gates) {
      gate.drawWire();
      gate.draw();
    }
    for (const tool of toolBox) {
      if (tool.collide(x, y)) {
        let text;
        switch (tool.kind) {
          case "switch":
            text = "Light Switch";
            break;
          case "bulb":
            text = "Light Bulb";
            break;
          case "not":
            text = "NOT Gate";
            break;
          case "and":
            text = "AND Gate";
            break;
          case "or":
            text = "OR Gate";
            break;
          case "implies":
            text = "IMPLIES Gate";
            break;
          case "xor":
            text = "XOR Gate";
            break;
          case "xnor":
            text = "XNOR/IFF Gate";
            break;
        }
        let width = context.measureText(text).width / devicePixelRatio;
        context.fillStyle = "rgba(255,255,255,.8)";
        draw(
          "fillRect",
          x + offset,
          y + offset,
          width + textMargin * 2,
          textSize + textMargin * 2,
        );
        context.fillStyle = "black";
        context.fillText(
          text,
          (x + offset + textMargin) * devicePixelRatio,
          (y + offset + textMargin + textSize) * devicePixelRatio,
        );
      }
    }
    requestAnimationFrame(callback);
  }
  requestAnimationFrame(callback);
});
