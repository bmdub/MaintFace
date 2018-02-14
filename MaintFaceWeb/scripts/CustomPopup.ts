
class CustomPopup {
	tag: any;
	inputoutside: (ev: Event) => any;
	clickoutside: (ev: Event) => any;
    MainDiv: HTMLDivElement = null;
	MouseX: number = 0;
	MouseY: number = 0;
	Disposed: boolean = false;
    private _contentDiv: HTMLDivElement = null;
	private _headerElem: HTMLDivElement = null;
	private _titleElem: HTMLSpanElement = null;
	private _xElem: HTMLDivElement = null;
    private _textElem: HTMLDivElement = null;
    private _listContainerElem: HTMLDivElement = null;
    private _textareaElem: HTMLTextAreaElement = null;
	private _inputElem: HTMLInputElement = null;
    private _buttonContainerElem: HTMLDivElement = null;
	private _innerElemPadding: number = 5;
	private _xPadding: number = 5;
    private _mouseIsDown: boolean = false;
    private _dragging: boolean = false;
    private _resizing: boolean = false;
    private _dragOffsetX: number = 0;
    private _dragOffsetY: number = 0;
    private _resizeL: boolean = false;
    private _resizeR: boolean = false;
    private _resizeT: boolean = false;
    private _resizeB: boolean = false;
    private _contentPadding: number;
	private _events: Array<EventWrapper> = [];

    constructor(titleText: string, color: string, backgroundColor: string, z: number, x: number, y: number, width: number, height: number, padding: number = 10) {

		this._contentPadding = padding;
		this._innerElemPadding = this._contentPadding;// / 2;

        // Main Div
        this.MainDiv = document.createElement("div");
        this.MainDiv.style.position = "fixed";
		this.MainDiv.style.overflow = "none";
		this.MainDiv.style.whiteSpace = "nowrap";
        this.MainDiv.style.zIndex = z.toString();
        this.MainDiv.style.borderRadius = "10px";
		this.MainDiv.style.touchAction = "none";
        if (window.navigator.pointerEnabled) {
			// Microsoft
			this._events.push(new EventWrapper(document.body, "pointermove", (evt) => this.HandleGlobalMouseMove(evt, evt.pageX, evt.pageY)));
			this._events.push(new EventWrapper(document.body, "pointerdown", (evt) => this.HandleGlobalMouseDown(evt, evt.pageX, evt.pageY)));
			this._events.push(new EventWrapper(document.body, "pointerup", (evt) => this.HandleGlobalMouseUp()));
		}
		else {
			this._events.push(new EventWrapper(document.body, "mousedown", (evt) => this.HandleGlobalMouseDown(evt, evt.pageX, evt.pageY)));
			this._events.push(new EventWrapper(document.body, "mouseup", (evt) => this.HandleGlobalMouseUp()));
			this._events.push(new EventWrapper(document.body, "mousemove", (evt) => this.HandleGlobalMouseMove(evt, evt.pageX, evt.pageY)));
			this._events.push(new EventWrapper(document.body, "touchmove", (evt) => this.HandleGlobalMouseMove(evt, evt.targetTouches[0].pageX, evt.targetTouches[0].pageY)));
			this._events.push(new EventWrapper(document.body, "touchstart", (evt) => this.HandleGlobalMouseDown(evt, evt.targetTouches[0].pageX, evt.targetTouches[0].pageY)));
			this._events.push(new EventWrapper(document.body, "touchend", (evt) => this.HandleGlobalMouseUp()));
		}
        document.body.appendChild(this.MainDiv);

		this.MainDiv.style.color = color;
		this.MainDiv.style.backgroundColor = backgroundColor;
		this.MainDiv.style.left = x + "px";
		this.MainDiv.style.top = y + "px";
		this.MainDiv.style.width = width.toString() + "px";
		this.MainDiv.style.height = height.toString() + "px";

        // Content
        this._contentDiv = document.createElement("div");
        this._contentDiv.style.margin = this._contentPadding + "px";
		this._contentDiv.style.whiteSpace = "nowrap";
        this.MainDiv.appendChild(this._contentDiv);

        // Header
        this._headerElem = document.createElement("div");
        this._headerElem.style.position = "relative";
        this._headerElem.style.textAlign = "center";
        this._headerElem.style.marginTop = "-5px";
        if (window.navigator.pointerEnabled)
			this._headerElem.onpointerdown = (evt) => this.HandleHeaderMouseDown(evt, evt.pageX, evt.pageY);
		else {
			this._headerElem.onmousedown = (evt) => this.HandleHeaderMouseDown(evt, evt.pageX, evt.pageY);
			this._headerElem.ontouchstart = (evt) => this.HandleHeaderMouseDown(evt, evt.targetTouches[0].pageX, evt.targetTouches[0].pageY);
		}
		this._headerElem.onmouseenter = (evt) => this._headerElem.style.cursor = "pointer";
		this._headerElem.onmouseleave = (evt) => this._headerElem.style.cursor = "default";
        this._titleElem = document.createElement("span");
		this._titleElem.style.textAlign = "center";
		//this._titleElem.style.fontSize = "14pt";
		this._titleElem.textContent = titleText;
		this._xElem = document.createElement("div");
		this._xElem.style.position = "absolute";
		this._xElem.style.right = "0px";
		this._xElem.style.top = "0px";
		//this._xElem.style.cssFloat = "right";
		this._xElem.style.fontFamily = "Verdana";
		this._xElem.style.fontSize = "14pt";
		this._xElem.style.marginTop = "-5px";
		this._xElem.style.marginLeft = this._xPadding.toString() + "px";
		this._xElem.onclick = (evt) => this.HandleXClick();
		this._xElem.textContent = "x";
		this._xElem.hidden = true;
		this._headerElem.appendChild(this._titleElem);
		this._headerElem.appendChild(this._xElem);
		if (titleText.length == 0)
			this._headerElem.hidden = true;
		this._contentDiv.appendChild(this._headerElem);

		if (titleText.length > 0) {
			var p = document.createElement("p");
			p.style.margin = "10px";
			this._contentDiv.appendChild(p);
		}

		this._textElem = document.createElement("div");
		this._textElem.style.paddingBottom = this._innerElemPadding.toString() + "px";
		this._textElem.hidden = true;
		this._contentDiv.appendChild(this._textElem);

		this._listContainerElem = document.createElement("div");
		this._listContainerElem.style.paddingBottom = this._innerElemPadding.toString() + "px";
		this._listContainerElem.hidden = true;
		this._contentDiv.appendChild(this._listContainerElem);

		this._inputElem = document.createElement("input");
		this._inputElem.spellcheck = false;
		this._inputElem.hidden = true;
		this._contentDiv.appendChild(this._inputElem);

		this._textareaElem = document.createElement("textarea");
		this._textareaElem.style.paddingBottom = this._innerElemPadding.toString() + "px";
		this._textareaElem.spellcheck = false;
		this._textareaElem.style.overflowY = "auto";
		this._textareaElem.hidden = true;
		this._contentDiv.appendChild(this._textareaElem);

		this._buttonContainerElem = document.createElement("div");
		this._buttonContainerElem.style.position = "absolute";
		this._buttonContainerElem.style.textAlign = "right";
		this._buttonContainerElem.style.bottom = this._contentPadding + "px";
		this._buttonContainerElem.style.right = this._contentPadding + "px";
		this._buttonContainerElem.hidden = true;
		this._contentDiv.appendChild(this._buttonContainerElem);

		this.OnResize();
    }

	SetCloseX() {
		this._xElem.hidden = false;
		this._headerElem.hidden = false;
		return this._xElem;
	}

	SetText(text: string) {
		this._textElem.textContent = text;
		this._textElem.hidden = false;
		this.OnResize();
		return this._textElem;
	}

	SetTextHtml(html: string) {
		this._textElem.innerHTML = html;
		this._textElem.hidden = false;
		this.OnResize();
		return this._textElem;
	}

	AddListItem(text: string, hoverColor: string = null, hoverBackgroundColor: string = null) {
		var listItem = document.createElement("div");
		listItem.textContent = text;
		if (hoverColor == null)
			hoverColor = this.MainDiv.style.color;
		if (hoverBackgroundColor == null)
			hoverBackgroundColor = this.MainDiv.style.backgroundColor;
		if (window.navigator.pointerEnabled) {
			listItem.onpointerenter = (evt) => {
				listItem.style.color = hoverColor;
				listItem.style.backgroundColor = hoverBackgroundColor;
			}
			listItem.onpointerleave = (evt) => {
				listItem.style.color = "";
				listItem.style.backgroundColor = "";
			}
		}
		else {
			listItem.onmouseenter = (evt) => {
				listItem.style.color = hoverColor;
				listItem.style.backgroundColor = hoverBackgroundColor;
			}
			listItem.onmouseleave = (evt) => {
				listItem.style.color = "";
				listItem.style.backgroundColor = "";
			}
		}
		this._listContainerElem.appendChild(listItem);
		//if (this.MouseX >= this.MainDiv.offsetLeft + listItem.offsetLeft && this.MouseX <= this.MainDiv.offsetLeft + listItem.offsetLeft + listItem.offsetWidth &&
		//	this.MouseY >= this.MainDiv.offsetTop + listItem.offsetTop && this.MouseY <= this.MainDiv.offsetTop + listItem.offsetTop + listItem.offsetHeight) {
		//	listItem.style.color = hoverColor;
		//	listItem.style.backgroundColor = hoverBackgroundColor;
		//}
		this._listContainerElem.hidden = false;
		this.OnResize();
		return listItem;
	}

	ClearListItems() {
		this._listContainerElem.innerHTML = "";
	}

	getValue() {
		if (this._inputElem.hidden == false)
			return this._inputElem.value;
		else
			return this._textareaElem.value;
	}
	setValue(value: string) {
		if (this._inputElem.hidden == false)
			this._inputElem.value = value;
		else
			this._textareaElem.value = value;
	}

	SetInput(text: string, placeholder: string) {
		this._inputElem.textContent = text;
		this._inputElem.placeholder = placeholder;
		this._inputElem.hidden = false;
		this._inputElem.focus();
		this.OnResize();
		return this._inputElem;
	}

	SetTextArea(text: string, placeholder: string) {
		this._textareaElem.textContent = text;
		this._textareaElem.placeholder = placeholder;
		this._textareaElem.hidden = false;
		this._textareaElem.focus();
		this.OnResize();
		return this._textareaElem;
	}

	AddButton(text: string) {
		var button = document.createElement("button");
		button.style.marginLeft = "5px";
		button.textContent = text;
		this._buttonContainerElem.appendChild(button);
		this._buttonContainerElem.hidden = false;
		this.OnResize();
		return button;
	}

	Center(offsetX: number = 0, offsetY: number = 0) {
		var centerX = window.innerWidth * .5;
		var centerY = window.innerHeight * .5;
		var centerXPopup = this.MainDiv.offsetLeft + (this.MainDiv.offsetWidth * .5);
		var centerYPopup = this.MainDiv.offsetTop + (this.MainDiv.offsetHeight * .5);
		this.MainDiv.style.left = (this.MainDiv.offsetLeft + (centerX - centerXPopup) + offsetX).toString() + "px";
		this.MainDiv.style.top = (this.MainDiv.offsetTop + (centerY - centerYPopup) + offsetY).toString() + "px";
	}

	SizeToContent(allowShrink: boolean = true) {
		var oldWidth = this.MainDiv.offsetWidth;
		var oldHeight = this.MainDiv.offsetHeight;

		this.MainDiv.style.width = "1px";
		this.MainDiv.style.height = "4096px";
		var newWidth = this.MainDiv.scrollWidth + this._contentPadding * 2 + this._xElem.offsetWidth + this._xPadding;

		this.MainDiv.style.width = "4096px";
		this.MainDiv.style.height = "1px";
		var newHeight = this.MainDiv.scrollHeight;

		if (!allowShrink) {
			newWidth = Math.max(oldWidth, newWidth);
			newHeight = Math.max(oldHeight, newHeight);
		}

		if (this._buttonContainerElem.hidden == false)
			newHeight += 40;

		newHeight -= this._contentPadding;

		this.MainDiv.style.width = newWidth.toString() + "px";
		this.MainDiv.style.height = newHeight.toString() + "px";

		this.OnResize();
	}

	BoundToScreen() {
		var excessX = (this.MainDiv.offsetLeft + this.MainDiv.offsetWidth) - window.innerWidth;
		if (excessX > 0) this.MainDiv.style.left = Math.max(0, this.MainDiv.offsetLeft - excessX).toString() + "px";
		var excessY = (this.MainDiv.offsetTop + this.MainDiv.offsetHeight) - window.innerHeight;
		if (excessY > 0) this.MainDiv.style.top = Math.max(0, this.MainDiv.offsetTop - excessY).toString() + "px";
	}

	Destroy() {
		this.inputoutside = null;
		this.clickoutside = null;
		for (var i = 0; i < this._events.length; i++)
			this._events[i].Destroy();

		document.body.removeChild(this.MainDiv);
		this.Disposed = true;
	}

    private OnResize() {
		this._textareaElem.style.height = (this.MainDiv.offsetHeight - this._textareaElem.offsetTop - 40 - (this._contentPadding * 1.5)).toString() + "px";
		this._textareaElem.style.width = (this.MainDiv.offsetWidth - this._textareaElem.offsetLeft - (this._contentPadding * 1.5)).toString() + "px";
		this._inputElem.style.width = (this.MainDiv.offsetWidth - this._inputElem.offsetLeft - (this._contentPadding * 1.5)).toString() + "px";
	}

	private HandleXClick() {
		this.Destroy();
	}

	private IsWithinPopup(x: number, y: number) {
		if (x >= this.MainDiv.offsetLeft && x <= this.MainDiv.offsetLeft + this.MainDiv.offsetWidth &&
			y >= this.MainDiv.offsetTop && y <= this.MainDiv.offsetTop + this.MainDiv.offsetHeight)
			return true;
	}

	private HandleHeaderMouseDown(evt: Event, x: number, y: number) {
		if (this.IsWithinPopup(x, y)) {
			this._dragging = true;
			this._dragOffsetX = x - this.MainDiv.offsetLeft;
			this._dragOffsetY = y - this.MainDiv.offsetTop;
		}
	}

    private HandleGlobalMouseDown(evt: Event, x: number, y: number) {
		this._mouseIsDown = true;

		if (x >= this.MainDiv.offsetLeft - 5 && x <= this.MainDiv.offsetLeft + this.MainDiv.offsetWidth + 5 &&
			y >= this.MainDiv.offsetTop - 5 && y <= this.MainDiv.offsetTop + this.MainDiv.offsetHeight + 5) {
			if (x <= this.MainDiv.offsetLeft + 5)
				this._resizeL = true;
			else if (x >= this.MainDiv.offsetLeft + this.MainDiv.offsetWidth - 5)
				this._resizeR = true;
			if (y <= this.MainDiv.offsetTop + 5)
				this._resizeT = true;
			else if (y >= this.MainDiv.offsetTop + this.MainDiv.offsetHeight - 5)
				this._resizeB = true;
			if (this._resizeL || this._resizeR || this._resizeB || this._resizeT)
				this._resizing = true;
		}

		if (!this.IsWithinPopup(x, y)) {
			if (this.clickoutside != null) {
				this.clickoutside(evt);
				evt.preventDefault();
			}
		}

		if (this._resizing || this._dragging)
			evt.preventDefault();
	}

    private HandleGlobalMouseUp() {
		this._mouseIsDown = false;
		this._resizeL = false;
		this._resizeR = false;
		this._resizeT = false;
		this._resizeB = false;
		this._dragging = false;
		this._resizing = false;
	}

    private HandleGlobalMouseMove(evt: Event, x: number, y: number) {

		this.MouseX = x;
		this.MouseY = y;

		if (this.inputoutside != null) {
			if (!this.IsWithinPopup(x, y))
				this.inputoutside(evt);
		}

		var hoverL = false;
		var hoverR = false;
		var hoverT = false;
		var hoverB = false;

		if (x >= this.MainDiv.offsetLeft - 5 && x <= this.MainDiv.offsetLeft + this.MainDiv.offsetWidth + 5 &&
			y >= this.MainDiv.offsetTop - 5 && y <= this.MainDiv.offsetTop + this.MainDiv.offsetHeight + 5) {
			if (x <= this.MainDiv.offsetLeft + 5)
				hoverL = true;
			else if (x >= this.MainDiv.offsetLeft + this.MainDiv.offsetWidth - 5)
				hoverR = true;
			if (y <= this.MainDiv.offsetTop + 5)
				hoverT = true;
			else if (y >= this.MainDiv.offsetTop + this.MainDiv.offsetHeight - 5)
				hoverB = true;
		}

		this.MainDiv.style.cursor = "default";
		if ((hoverL && hoverT) ||
			(hoverR && hoverB))
			this.MainDiv.style.cursor = "nwse-resize";
		else if ((hoverL && hoverB) ||
			(hoverR && hoverT))
			this.MainDiv.style.cursor = "nesw-resize";
		else if (hoverL || hoverR)
			this.MainDiv.style.cursor = "ew-resize";
		else if (hoverT || hoverB)
			this.MainDiv.style.cursor = "ns-resize";

		if (this._resizing) {
			if (this._resizeL) {
				var oldLeft = this.MainDiv.offsetLeft;
				this.MainDiv.style.left = x.toString() + "px";
				var styleWidth = parseInt(this.MainDiv.style.width.replace("px", ""));
				this.MainDiv.style.width = (styleWidth + (oldLeft - this.MainDiv.offsetLeft)).toString() + "px";
			}
			else if (this._resizeR) {
				this.MainDiv.style.width = (x - this.MainDiv.offsetLeft).toString() + "px";
			}
			if (this._resizeT) {
				var oldTop = this.MainDiv.offsetTop;
				this.MainDiv.style.top = y.toString() + "px";
				var styleHeight = parseInt(this.MainDiv.style.height.replace("px", ""));
				this.MainDiv.style.height = (styleHeight + (oldTop - this.MainDiv.offsetTop)).toString() + "px";
			}
			else if (this._resizeB) {
				this.MainDiv.style.height = (y - this.MainDiv.offsetTop).toString() + "px";
			}
			this.OnResize();
			evt.preventDefault();
		}
		else if (this._dragging) {
			this.MainDiv.style.left = (x - this._dragOffsetX).toString() + "px";
			this.MainDiv.style.top = (y - this._dragOffsetY).toString() + "px";
			evt.preventDefault();
		}
	}
}