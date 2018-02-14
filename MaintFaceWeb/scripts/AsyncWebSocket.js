class AsyncWebSocketMessage {
}
class AsyncWebSocket {
    constructor(url, reconnectOnClose) {
        this.Connected = false;
        this._socket = null;
        this._ct = 0;
        this._reconnect = false;
        this._responseHandlers = {};
        this._url = url;
        this._reconnect = reconnectOnClose;
        this.ConnectionCheckLoop();
    }
    //todo: map the id to an ass array to a function (passed as param)
    //on recieve, function gets called.  need to handle orphans - timer for each send?
    send(value, onrecv = null) {
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
    AttachEvents() {
        this._socket.onopen = (evt) => {
            if (this.Open != null)
                this.Open();
        };
        this._socket.onmessage = (args) => {
            var serverMessage;
            try {
                serverMessage = JSON.parse(args.data);
                var responseHandler = this._responseHandlers[serverMessage.MessageId];
                if (responseHandler != null) {
                    delete this._responseHandlers[serverMessage.MessageId];
                    responseHandler(serverMessage);
                }
                else if (this.Message != null)
                    this.Message(serverMessage);
            }
            catch (error) {
                console.error(error);
            }
        };
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
        else {
            this.Connected = false;
            if (this._reconnect == false)
                return;
            this._socket = new WebSocket(this._url); // Closed; reconnect
            this.AttachEvents();
        }
    }
}
//# sourceMappingURL=AsyncWebSocket.js.map