/// <reference path="Common.ts"/>

class GraphLine {
    constructor(public Series: StatSeries, public Color: string) { }
}

class Graph implements ICanvasPresentation {
    _inputHandler: InputHandler = null;
    _canvasCtx: CanvasRenderingContext2D = null;
    _graphLine: Array<GraphLine> = [];
    _graphStepSize: number = 10;
    _verticalPadding: number = 60;
    _closeButtonWidth: number = 16;
    MouseX: number = 0;
    MouseY: number = 0;
    MouseDown: boolean = false;
    CameraX: number = 0;
    Scale: number = 1.0;
    DebugStat: string = null;
    _colorTable: Array<string> = [
        "rgba(128,255,232,1)",
        "rgba(255,180,128,1)",
        "rgba(130,255,128,1)",
        "rgba(255,128,255,1)",
        "rgba(255,128,128,1)",
        "rgba(240,255,128,1)",
        "rgba(128,128,255,1)"];
    _colorTableIndex: number = 0;

    constructor(public _canvas: HTMLCanvasElement) {
        this._inputHandler = new InputHandler(this, this._canvas);
        this._canvasCtx = this._canvas.getContext('2d');
    }

    GetSeriesColor(statSeries: StatSeries) {
        for (var s = 0; s < this._graphLine.length; s++)
            if (this._graphLine[s].Series == statSeries) {
                return this._graphLine[s].Color;
            }
    }

    SeriesExists(statSeries: StatSeries) {
        for (var s = 0; s < this._graphLine.length; s++)
            if (this._graphLine[s].Series == statSeries)
                return true;
        return false;
    }

    AddSeries(statSeries: StatSeries) {
        if (this.SeriesExists(statSeries))
            return;

        // Grab a color that isn't being used.
        var color;
        for (; ;) {
            color = this._colorTable[this._colorTableIndex++ % this._colorTable.length];
            if (this._graphLine.length >= this._colorTable.length) break;
            var found = false;
            for (var i = 0; i < this._graphLine.length; i++)
                if (this._graphLine[i].Color == color) {
                    found = true;
                    break;
                }
            if (!found) break;
        }

        this._graphLine.push(new GraphLine(statSeries, color));
    }

    RemoveSeries(statSeries: StatSeries) {
        for (var s = 0; s < this._graphLine.length; s++)
            if (this._graphLine[s].Series == statSeries) {
                this._graphLine.splice(s, 1);
                return;
            }
    }

    ScreenToWorld(x: number, y: number) {
        x += this.CameraX;
        //x /= this.Scale;

        return { x: x, y: y };
    }

    WorldToScreen(x: number, y: number) {
        //x *= this.Scale;
        x -= this.CameraX;

        return { x: x, y: y };
    }

    HandleMouseLeave() {
	}

    HandleMouse(x: number, y: number, isDown: boolean, clicked: boolean) {
		
		if (isDown)
			ApplyCursor("move", this._canvas.style.zIndex);

        var coords = this.ScreenToWorld(x, y);
        var deltaX = coords.x - this.MouseX;
        var mouseWasDown = this.MouseDown;
        this.MouseX = coords.x;
        this.MouseY = coords.y;
        this.MouseDown = isDown;

        // Move the screen
        if (mouseWasDown && isDown) {
            // Lock the right edge of the graph.
            deltaX += Math.max(0, (this.CameraX - deltaX));

            this.CameraX -= deltaX;
            this.MouseX -= deltaX;
        }

        // Check for line close
        if (clicked) {
            for (var s = 0; s < this._graphLine.length; s++) {
                var box = this.GetBoxForLine(s);
                if (this.MouseX >= box.X && this.MouseX <= box.X2 &&
                    this.MouseY >= box.Y && this.MouseY <= box.Y2) {
                    this.RemoveSeries(this._graphLine[s].Series);
                    break;
                }
            }
        }
    }

    // ensure world coord lines up with screen coord (move camera)
    LineUpPointToScreen(worldX: number, worldY: number, screenX: number, screenY: number) {
        var worldAtScreen = this.ScreenToWorld(screenX, screenY);
        //this.CameraX += (worldX - worldAtScreen.x) * this.Scale;
        //if (this.CameraX > 0) this.CameraX = 0;
        //this.CameraY += (worldY - worldAtScreen.y) * this.Scale;
    }

    IncrementScale(delta: number, screenX: number, screenY: number) {
        this.ChangeScale(this.Scale + delta, screenX, screenY);
    }

    ChangeScale(scale: number, screenX: number, screenY: number) {
        var worldCoords = this.ScreenToWorld(screenX, screenY);
        this.Scale = scale;
        this.LineUpPointToScreen(worldCoords.x, worldCoords.y, screenX, screenY);
    }

    GetBoxForLine(index: number) {
        var x = this._canvas.clientWidth - ((index + 1) * (this._closeButtonWidth + 10));
        var y = 10;
        return {
            X: x,
            Y: y,
            X2: x + this._closeButtonWidth,
            Y2: y + this._closeButtonWidth
        };
    }

    Draw() {

        this._canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
        this._canvasCtx.clearRect(0, 0, this._canvas.width, this._canvas.height);

        // Draw the close boxes for each line.
        this._canvasCtx.lineWidth = 1;
        this._canvasCtx.strokeStyle = "rgba(0,0,0,1)";
        for (var s = 0; s < this._graphLine.length; s++) {
            this._canvasCtx.beginPath();
            this._canvasCtx.fillStyle = this._graphLine[s].Color;
            var box = this.GetBoxForLine(s);
            this._canvasCtx.fillRect(box.X, box.Y, this._closeButtonWidth, this._closeButtonWidth);
            this._canvasCtx.fill();
            this._canvasCtx.moveTo(box.X + 2, box.Y + 2);
            this._canvasCtx.lineTo(box.X2 - 2, box.Y2 - 2);
            this._canvasCtx.stroke();
            this._canvasCtx.moveTo(box.X2 - 2, box.Y + 2);
            this._canvasCtx.lineTo(box.X + 2, box.Y2 - 2);
            this._canvasCtx.stroke();
        }
        
        this._canvasCtx.translate(this.CameraX * -1, 0);
        this._canvasCtx.scale(this.Scale, 1);

        // todo: could take this as an input as last update time
        var time = (new Date()).getTime();

        this._canvasCtx.font = "14px Arial";
        this._canvasCtx.lineWidth = .5;
            
        // Draw the scale
        this._canvasCtx.save();
        this._canvasCtx.scale(1 / this.Scale, 1);
        this._canvasCtx.strokeStyle = 'rgba(255,255,255,1)';
        var scaleLineY = this._canvas.height - this._verticalPadding + 20;
        this._canvasCtx.moveTo(this.CameraX, scaleLineY);
        this._canvasCtx.lineTo(this.CameraX + this._canvas.width, scaleLineY);
        this._canvasCtx.stroke();
        var notchSizeMs = 10000 / this.Scale;
        var startTimeStamp = time + Math.ceil(this.CameraX / this.Scale / this._graphStepSize) * 1000;
        startTimeStamp = (notchSizeMs - startTimeStamp % notchSizeMs) + startTimeStamp;
        for (var timeStamp = startTimeStamp; ; timeStamp -= notchSizeMs) {
            var x = this._canvas.clientWidth - ((time - timeStamp) / 1000 * this._graphStepSize * this.Scale);
            if (x < this.CameraX) break;
            this._canvasCtx.beginPath();
            this._canvasCtx.moveTo(x, scaleLineY);
            this._canvasCtx.lineTo(x, scaleLineY + 10);
            this._canvasCtx.stroke();
            var date = new Date(timeStamp);
            var text = date.toLocaleTimeString();
            var offset = this._canvasCtx.measureText(text).width * .5;
            this._canvasCtx.strokeText(text, x - offset, scaleLineY + 25);
        }
        this._canvasCtx.restore();
        
        for (var s = 0; s < this._graphLine.length; s++) {
            var series = this._graphLine[s].Series;

            // Find the starting/ending stat in the series based on camera location
            var startI = series._statEntries.length - 1;
            var startTimeStamp = time + Math.ceil((this.CameraX / this.Scale) / this._graphStepSize) * 1000;
            for (var i = series._statEntries.length - 1; i >= 0; i--) {
                var timeStamp = series._statEntries[i]._timeStamp;
                if (timeStamp < startTimeStamp) {
                    startI = i;
                    break;
                }
            }

            var endI = 0;
            for (var i = startI; i >= 0; i--) {
                var timeStamp = series._statEntries[i]._timeStamp;
                endI = i;
                var x = (this._canvas.clientWidth / this.Scale) - ((time - timeStamp) / 1000 * this._graphStepSize - this._graphStepSize);
                if (x < (this.CameraX / this.Scale)) break;
            }

            if (startI <= endI) continue;

            // Find the min and max points on this graph
            var min = Number.MAX_VALUE, max = Number.MAX_VALUE * -1;
            var minI = 0, maxI = 0;
            var minFormatted, maxFormatted;
            var ct = 0;
            for (var i = startI; i >= endI; i--) {
                if (series._statEntries[i]._stat.ValueNumber < min) {
                    min = series._statEntries[i]._stat.ValueNumber;
                    minI = i;
                    minFormatted = series._statEntries[i]._stat.ValueFormatted;
                }
                if (series._statEntries[i]._stat.ValueNumber > max) {
                    max = series._statEntries[i]._stat.ValueNumber;
                    maxI = i;
                    maxFormatted = series._statEntries[i]._stat.ValueFormatted;
                }
            }
            if (max == min) max++;

            var yMult = (this._canvas.clientHeight - this._verticalPadding * 2) / (max - min);
            var yOffset = min * -1 * yMult + this._verticalPadding;
            this._canvasCtx.strokeStyle = this._graphLine[s].Color;
            this._canvasCtx.fillStyle = 'rgba(0,0,0,.8)';
            this._canvasCtx.translate(0.5, 0.5); //Makes lines look better
            for (var i = endI + 1; i <= startI; i++) {
                var timeStamp = series._statEntries[i]._timeStamp;
                var stat = series._statEntries[i]._stat;
                var x = (this._canvas.clientWidth / this.Scale) - ((time - timeStamp) / 1000 * this._graphStepSize);
                var y = stat.ValueNumber * yMult + yOffset;
                y = this._canvas.clientHeight - y;
                if (i - 1 >= 0) {
                    this._canvasCtx.beginPath();
                    this._canvasCtx.moveTo(x, y);
                    var timeStamp2 = series._statEntries[i - 1]._timeStamp;
                    var stat2 = series._statEntries[i - 1]._stat;
                    var x2 = (this._canvas.clientWidth / this.Scale) - ((time - timeStamp2) / 1000 * this._graphStepSize);
                    var y2 = stat2.ValueNumber * yMult + yOffset;
                    var y2 = this._canvas.clientHeight - y2;
                    this._canvasCtx.lineTo(x2, y2);
                    this._canvasCtx.stroke();
                }
                if (i == minI)
                    this.DrawText(minFormatted, x, y + 14, false);
                else if (i == maxI)
                    this.DrawText(maxFormatted, x, y - 14, false);
                if (i == startI) {
                    var name = EscapeEdgeName(stat.Name);
                    this.DrawText(name + ": " + stat.ValueFormatted, x, y, true);
                }
            }
            this._canvasCtx.translate(-0.5, -0.5);
        }

        if (this.DebugStat != null) {
            this._canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
            this._canvasCtx.fillStyle = 'rgba(255,255,255,1)';
            this._canvasCtx.strokeStyle = 'rgba(255,255,255,1)';
            this._canvasCtx.fillText(this.DebugStat, 0, 20);
        }
    }

    DrawText(text: string, x: number, y: number, drawBox: boolean) {
        
        // Ignore scale for text
        x *= this.Scale;
        this._canvasCtx.save();
        this._canvasCtx.scale(1 / this.Scale, 1);

        var textWidth = this._canvasCtx.measureText(text).width;
        x -= textWidth * .5;
        var offset = Math.max(0, (x + textWidth) - this._canvas.clientWidth) * -1;
        if (drawBox) 
            this._canvasCtx.fillRect(x + offset, y + 2, textWidth, -16);
        this._canvasCtx.strokeText(text, x + offset, y);

        // Restore scale
        this._canvasCtx.restore();
    }
}