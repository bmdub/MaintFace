﻿
var mouseX = 0, mouseY = 0;

document.body.addEventListener('mousemove', function (evt) {
    mouseX = evt.pageX;
    mouseY = evt.pageY;
}, false);

class EventWrapper {
	constructor(private _node: HTMLElement, private _event, private _handler, private _capture?) {
		this._node.addEventListener(this._event, this._handler, this._capture);
	}

	Destroy() {
		this._node.removeEventListener(this._event, this._handler, this._capture);
	}
}

// Heirarchical cursor setter
var cursorMouseX = 0, cursorMouseY = 0;
var cursorZIndex = 0;

function ApplyCursor(cursor: string, zindex: string) {
	var z: number = parseInt(zindex);

	if (cursorMouseX != mouseX || cursorMouseY != mouseY) {
		cursorMouseX = mouseX;
		cursorMouseY = mouseY;
		document.body.style.cursor = cursor;
		cursorZIndex = z;
	}
	else if (z >= cursorZIndex) {
		document.body.style.cursor = cursor;
		cursorZIndex = z;
	}
}

var regexNonSharedIndicator = new RegExp(" \\(\\*[^\\)]*\\)+");

function EscapeEdgeName(name: string) {
	return name.replace(regexNonSharedIndicator, ""); // Remove the last node reference
}

function RemoveFromArray<T>(arr: Array<T>, value: T) {
	for (var i = 0; i < arr.length; i++) {
		if (arr[i] == value)
			arr.splice(i, 1);
	}
}

function FindAncestorWithClass(element: HTMLElement, className: string) {
    while ((element = element.parentElement) && !element.classList.contains(className));
    return element;
}

interface ICanvasPresentation {
    Scale: number;
    HandleMouseLeave();
    HandleMouse(x: number, y: number, isDown: boolean, clicked: boolean);
    IncrementScale(delta: number, screenX: number, screenY: number);
    ChangeScale(scale: number, screenX: number, screenY: number);
}

class Stat {
    Name: string;
    Samples: number;
    MinNumber: number;
    MaxNumber: number;
    AvgNumber: number;
    ExpectedMinNumber: number;
    ExpectedMaxNumber: number;
    ValueNumber: number;
    ValueString: string;
    ValueOverride: string;

    SamplesFormatted: string;
    MinValueFormatted: string;
    MaxValueFormatted: string;
    AvgValueFormatted: string;
    ValueFormatted: string;
}

class StatSeriesEntry {
    constructor(public _stat: Stat, public _timeStamp: number) { }
}

class StatSeries {
    _statEntries: Array<StatSeriesEntry> = [];
    _maxStats: number = 86400; // Keep 1 day of stats.  TODO: test

    AddStat(stat: Stat, timeStamp: number) {
        this._statEntries.push(new StatSeriesEntry(stat, timeStamp));
        if (this._statEntries.length > this._maxStats)
            this._statEntries.splice(0, 1);
    }

    GetLatestStat() {
        if (this._statEntries.length > 0)
            return this._statEntries[this._statEntries.length - 1];
    }
}

class StatCollection {
    _seriesList: { [index: string]: StatSeries } = {};

    AddStat(stat: Stat, timeStamp: number) {
        var series = this._seriesList[stat.Name];

        if (series == null) {
            series = new StatSeries();
            this._seriesList[stat.Name] = series;
        }

        series.AddStat(stat, timeStamp);
    }

    GetSeries(name: string) {
        return this._seriesList[name];
    }
}

function AddCommas(nStr) {
    nStr += '';
    var x = nStr.split('.');
    var x1 = x[0];
    var x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
}

function GetColorForValue(value: number, expectedMax: number, expectedMin: number) {
	
	if (expectedMax == Number.MAX_VALUE && expectedMin == Number.MAX_VALUE * -1)
		return "white";
	
	if (expectedMin == Number.MAX_VALUE * -1) {
		expectedMin = expectedMax * -1; // guessing 0 for mid point
	}

	if (expectedMax == Number.MAX_VALUE) {
		expectedMax = expectedMin * -1; // guessing 0 for mid point
	}
	var expectedRange = expectedMax - expectedMin;
	var colorValue = (value - expectedMin) / expectedRange;
	
	var g = Math.max(50, Math.min(255, Math.floor((2 - (Math.abs(.5 - colorValue) * 4)) * 255))); //.5 - 1, .5 - 0, .25-.75 max
	var r = Math.max(0, Math.min(255, Math.floor((colorValue - .5) * 4 * 255))); //.5 - .75+
	var b = Math.max(0, Math.min(255, Math.floor(((1 - colorValue) - .5)  * 4) * 255)); //.5 - .25-

	return "rgba(" + r + "," + g + "," + b + ",1)";
}

class InputHandler {

    mouseIsDown: boolean = false;
    mouseDragged: boolean = false;
    mouseXGraph: number = 0;
    mouseYGraph: number = 0;

    touchIsDown: boolean = false;
    touchXGraph: number = 0;
    touchYGraph: number = 0;
    pinching: boolean = false;
    touchX2: number = 0;
    touchY2: number = 0;
    pinchDist: number = 0;
    pinchDistLast: number = 0;
    pinchMidX: number = 0;
    pinchMidY: number = 0;
    touchDragged: boolean = false;

    constructor(public _canvasPresenter: ICanvasPresentation, public _elem: HTMLElement) {

		//todo: these should be destroyed if this canvas is ever destroyed
        if (window.navigator.pointerEnabled) {
			// Microsoft
			this._elem.addEventListener("pointermove", (evt) => this.HandleMouseMove(evt));
			this._elem.addEventListener("pointerdown", (evt) => this.HandleMouseDown(evt));
			this._elem.addEventListener("pointerup", (evt) => this.HandleMouseUp(evt));
			this._elem.addEventListener("pointerleave", (evt) => this.HandleMouseLeave(evt));
		}
		else {
			this._elem.addEventListener('mousedown', (evt) => this.HandleMouseDown(evt));
			this._elem.addEventListener('mouseup', (evt) => this.HandleMouseUp(evt));
			this._elem.addEventListener('mousemove', (evt) => this.HandleMouseMove(evt));
			this._elem.addEventListener('mouseleave', (evt) => this.HandleMouseLeave(evt));
			this._elem.addEventListener('touchstart', (evt) => this.HandleTouchStart(evt));
			this._elem.addEventListener('touchend', (evt) => this.HandleTouchUp(evt));
			this._elem.addEventListener('touchmove', (evt) => this.HandleTouchMove(evt));
		}
		this._elem.addEventListener('DOMMouseScroll', (evt) => this.HandleScroll(evt)); // for Firefox
		this._elem.addEventListener('mousewheel', (evt) => this.HandleScroll(evt)); // for everyone else
    }

	HandleMouseDown(evt) {
		if (evt.button == 0) {
			this.mouseIsDown = true;
			this.mouseDragged = false;
			this.GetMouseCoords(evt);
			this._canvasPresenter.HandleMouse(this.mouseXGraph, this.mouseYGraph, this.mouseIsDown, false);
			evt.preventDefault();
		}
	}

	HandleMouseUp(evt) {
		if (evt.button == 0) {
			var mouseClicked = this.mouseDragged == false && this.mouseIsDown;
			this.mouseIsDown = false;
			this.GetMouseCoords(evt);
			this._canvasPresenter.HandleMouse(this.mouseXGraph, this.mouseYGraph, this.mouseIsDown, mouseClicked);
			this.mouseDragged = false;
		}
	}

	HandleMouseMove(evt) {
		if (this.mouseIsDown) {
			this.mouseDragged = true;
			evt.preventDefault();
		}
		this.GetMouseCoords(evt);
		this._canvasPresenter.HandleMouse(this.mouseXGraph, this.mouseYGraph, this.mouseIsDown, false);
	}

	HandleMouseLeave(evt) {
		this.mouseIsDown = false;
		this.mouseDragged = false;
		this._canvasPresenter.HandleMouseLeave();
	}

	HandleScroll(evt) {
		//evt = evt ? evt : window.event;
		var direction = (evt.detail < 0 || evt.wheelDelta > 0) ? 1 : -1;
		this._canvasPresenter.IncrementScale(direction * 0.1, this.mouseXGraph, this.mouseYGraph);
	}

	HandleTouchStart(evt) {
		this.touchIsDown = true;
		this.touchDragged = false;
		this.GetTouchCoords(evt);
		this._canvasPresenter.HandleMouse(this.touchXGraph, this.touchYGraph, this.touchIsDown, false);
		evt.preventDefault();
	}

	HandleTouchUp(evt) {
		var tapped = this.touchDragged == false && this.touchIsDown;
		this.touchIsDown = false;
		this.pinching = false;
		this._canvasPresenter.HandleMouse(this.touchXGraph, this.touchYGraph, this.touchIsDown, tapped);
		this.touchDragged = false;
	}

	HandleTouchMove(evt) {
		if (this.touchIsDown) {
			this.touchDragged = true;
			evt.preventDefault();
		}
		this.GetTouchCoords(evt);
		if (this.pinching) {
			if (this.pinchDistLast > 0) {
				this._canvasPresenter.ChangeScale(this._canvasPresenter.Scale * (this.pinchDist / this.pinchDistLast), this.pinchMidX, this.pinchMidY);
			}
		}
		else
			this._canvasPresenter.HandleMouse(this.touchXGraph, this.touchYGraph, this.touchIsDown, false);
	}

    GetMouseCoords(evt) {
        var rect = this._elem.getBoundingClientRect();
        this.mouseXGraph = evt.pageX - rect.left;
        this.mouseYGraph = evt.pageY - rect.top;
    }

    GetTouchCoords(evt) {
        var rect = this._elem.getBoundingClientRect();
        var uievt = <TouchEvent>evt;
        if (uievt.targetTouches.length > 0) {
            this.touchXGraph = uievt.targetTouches[0].pageX - rect.left;
            this.touchYGraph = uievt.targetTouches[0].pageY - rect.top;

            if (uievt.targetTouches.length > 1) {
                this.touchX2 = uievt.targetTouches[1].pageX - rect.left;
                this.touchY2 = uievt.targetTouches[1].pageY - rect.top;
                this.pinchDistLast = this.pinchDist;
                this.pinchDist = Math.sqrt(
                    ((this.touchXGraph - this.touchX2) * (this.touchXGraph - this.touchX2)) +
                    ((this.touchYGraph - this.touchY2) * (this.touchYGraph - this.touchY2)));
                this.pinchMidX = (this.touchXGraph + this.touchX2) / 2;
                this.pinchMidY = (this.touchYGraph + this.touchY2) / 2;
                if (this.pinching == false)
                    this.pinchDistLast = this.pinchDist;
                this.pinching = true;
            }
        }
    }
}