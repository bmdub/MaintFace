class AsyncWebSocketMessage {
	MessageId: number;
}

class AsyncWebSocket {
	Open: () => any;
	Message: (serverMessage: any) => any;
	Close: () => any;
	Connected: boolean = false;
	private _socket: WebSocket = null;
	private _url: string;
	private _ct: number = 0;
	private _reconnect: boolean = false;
    private _responseHandlers: { [index: number]: (serverMessage) => any } = {};

	constructor(url, reconnectOnClose: boolean) {
		this._url = url;
		this._reconnect = reconnectOnClose;
		this.ConnectionCheckLoop();
	}

	//todo: map the id to an ass array to a function (passed as param)
	//on recieve, function gets called.  need to handle orphans - timer for each send?
	send(value: AsyncWebSocketMessage, onrecv: (serverMessage) => any = null) {
		if (this.Connected == false)
			return;

		value.MessageId = this._ct++;

		try {
			var message = JSON.stringify(value);
			this._socket.send(message);
			if (onrecv != null)
				this._responseHandlers[value.MessageId] = onrecv;
		}
		catch (error) {
			console.error(error);
		}
	}

	private AttachEvents() {
		this._socket.onopen = (evt: Event) => {
			if (this.Open != null)
				this.Open();
		}

		this._socket.onmessage = (args: MessageEvent) => {
			var serverMessage: AsyncWebSocketMessage;

			try {
				serverMessage = <AsyncWebSocketMessage>JSON.parse(<string>args.data);

				var responseHandler = this._responseHandlers[serverMessage.MessageId];
				if (responseHandler != null) {
					delete this._responseHandlers[serverMessage.MessageId];
					responseHandler(serverMessage);
				}
				else
					if (this.Message != null)
						this.Message(serverMessage);
			}
			catch (error) {
				console.error(error);
			}
		}

		this._socket.onclose = (evt) => {
			if (this.Close != null)
				this.Close();
		};

		this._socket.onerror = (evt) => {
			console.log("WebSocket Error");
		};
	}

	ConnectionCheckLoop() {
		setTimeout(() => {
			this.ConnectionCheckLoop();
		}, 500);

		if (this._socket == null) {
			this._socket = new WebSocket(this._url); // Not yet created; connect
			this.AttachEvents();
		}
		else if (this._socket.readyState == this._socket.CONNECTING)
			return; // Connecting; wait
		else if (this._socket.readyState == this._socket.OPEN) {
			this.Connected = true;
		}
		else if (this._socket.readyState == this._socket.CLOSING)
			return; // Closing; wait
		else { // this._socket.readyStat == this._socket.CLOSED
			this.Connected = false;

			if (this._reconnect == false)
				return;

			this._socket = new WebSocket(this._url); // Closed; reconnect
			this.AttachEvents();
		}
	}
}