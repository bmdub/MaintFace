using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.WebSockets;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Concurrent;
using Newtonsoft.Json;

// See for enabling ssl: http://stackoverflow.com/questions/11403333/httplistener-with-https-support

namespace BW.Diagnostics
{
    public static partial class MaintFace
    {
        private const int _messageRate = 1000;
        private const int _openPageAfterDuration = 5000;
        /// <summary>The endpoint at which to listen for incoming browser connections.</summary>
        public static string Url { get; private set; }
        /// <summary>Set of auth schemes to be used.</summary>
        public static AuthenticationSchemes AuthSchemes { get; private set; }
        /// <summary>An event that allows you to authenticate a user's username/password.</summary>
        public static event EventHandler<AuthEventArgs> AuthenticateUser;
        private static string _clientJS, _clientHTML;
        private static byte[] _clientHtmlRaw;
        private static ConcurrentDictionary<WebSocket, WebSocketInfo> _sockets = new ConcurrentDictionary<WebSocket, WebSocketInfo>();

        private class WebSocketInfo
        {
            public WebSocket Socket { get; private set; }
            public volatile bool PausedFlowGraph = false;
            private SemaphoreSlim _lockSem = new SemaphoreSlim(1, 1);

            public WebSocketInfo(WebSocket socket)
            {
                Socket = socket;
            }

            public async Task SendAsync(ArraySegment<byte> buffer)
            {
                // SendAsync is not thread-safe.  How ridiculous is that?
                await _lockSem.WaitAsync();
                try
                {
                    await Socket.SendAsync(buffer, WebSocketMessageType.Text, true, CancellationToken.None);
                }
                finally
                {
                    _lockSem.Release();
                }
            }
        }

        private static int _connectedCount;
        /// <summary>Gets the active number of users connected to the interface.</summary>
        public static int ConnectedCount
        {
            get { return Interlocked.CompareExchange(ref _connectedCount, 0, 0); }
        }

        private static void RunServer(string url, AuthenticationSchemes authSchemes)
        {
            AuthSchemes = authSchemes;

            // Listen to trace messages, and record the last N.
            Trace.Listeners.Add(_traceListener);
            //Debug.Listeners.Add(traceListener);

            // Get the client html and js from the project.
            // A resource is prefixed by the default namespace.
            //var temp = typeof(MaintFace).Assembly.GetManifestResourceNames();
            var assembly = Assembly.GetExecutingAssembly();
            _clientJS = GetTextResource(assembly, "MaintFace.web.Common.js") + "\r\n";
            _clientJS += GetTextResource(assembly, "MaintFace.web.CustomLayout.js") + "\r\n";
            _clientJS += GetTextResource(assembly, "MaintFace.web.CustomPopup.js") + "\r\n";
            _clientJS += GetTextResource(assembly, "MaintFace.web.DirectedGraph.js") + "\r\n";
            _clientJS += GetTextResource(assembly, "MaintFace.web.Graph.js") + "\r\n";
            _clientJS += GetTextResource(assembly, "MaintFace.web.Panes.js") + "\r\n";
            _clientJS += GetTextResource(assembly, "MaintFace.web.AsyncWebSocket.js") + "\r\n";
            _clientJS += GetTextResource(assembly, "MaintFace.web.Client.js") + "\r\n";
            _clientHTML = GetTextResource(assembly, "MaintFace.web.Client.html") + "\r\n";
            _clientHTML = _clientHTML.Replace("<!--SCRIPT-->", "<script>" + _clientJS + "</script>") + "\r\n";
            _clientHtmlRaw = System.Text.Encoding.UTF8.GetBytes(_clientHTML);

            // Todo: for this, need elevated priveleges or url reservation using netsh.
            // http://stackoverflow.com/questions/2564669/net-httplistener-prefix-issue-with-anything-other-than-localhost
            //prefix = "http://*:12121/MaintFace/";
            //prefix = "http://localhost:12121/MaintFace/";
            //s.Prefixes.Add(prefix);
            HttpListener listener;

            try
            {
                listener = new HttpListener();
                listener.AuthenticationSchemes = authSchemes;
                listener.Prefixes.Add(url);
                listener.Start();
                Url = url;
            }
            catch (HttpListenerException ex)
            {
                if (url.Contains("*"))
                {
                    // The endpoint may contain a wildcard for the domain, but we may not be 
                    // running with the right permissions.  Fall back to localhost.
                    var newUrl = url.Replace("*", "localhost");

                    listener = new HttpListener();
                    listener.AuthenticationSchemes = authSchemes;
                    listener.Prefixes.Add(newUrl);
                    listener.Start();
                    Url = newUrl;

                    Trace.WriteLine($"{nameof(MaintFace)} Warning: Insufficient permission to use endpoint with wildcard \"*\". Using \"localhost\" instead.");
                }
                else
                {
                    // The endpoint may be taken by another instance; randomize the path
                    var newUrl = url.TrimEnd('/') + Guid.NewGuid().ToString() + "/";

                    listener = new HttpListener();
                    listener.AuthenticationSchemes = authSchemes;
                    listener.Prefixes.Add(newUrl);
                    listener.Start();
                    Url = newUrl;

                    Trace.WriteLine($"{nameof(MaintFace)} Warning: Desired endpoint is in use. Randomized path.");
                }
            }

            Task.Run(() => SendLoop());

            Task.Run(() => RunServer(listener));

            Trace.WriteLine($"{nameof(MaintFace)} (v{typeof(MaintFace).Assembly.GetName().Version}) started at: {Url}");
        }

        private static async void RunServer(HttpListener listener)
        {
            for (; ; )
            {
                try
                {
                    var context = await listener.GetContextAsync();

                    if (context.Request.QueryString["ping"] == "1")
                    {
                        context.Response.Close();
                        continue;
                    }

                    // Do user u/p check, optional (but necessary for basic auth)
                    if (AuthenticateUser == null)
                    {
                        if (context.User?.Identity is HttpListenerBasicIdentity)
                        {
                            Trace.WriteLine(nameof(MaintFace) + " Warning: Basic Authentication failed; " + nameof(AuthenticateUser) + " event not handled.");

                            context.Response.StatusCode = 401;
                            byte[] message = new UTF8Encoding().GetBytes("Access denied");
                            context.Response.ContentLength64 = message.Length;
                            context.Response.OutputStream.Write(message, 0, message.Length);
                            context.Response.Close();
                            continue;
                        }
                    }
                    else
                    {
                        var args = new AuthEventArgs(context.User);
                        AuthenticateUser(null, args);
                        if (args.Authenticated == false)
                        {
                            context.Response.StatusCode = 401;
                            byte[] message = new UTF8Encoding().GetBytes("Access denied");
                            context.Response.ContentLength64 = message.Length;
                            context.Response.OutputStream.Write(message, 0, message.Length);
                            context.Response.Close();
                            continue;
                        }
                    }

                    if (!context.Request.IsWebSocketRequest)
                        HandleInitialRequest(context);
                    else
                        HandleWebSocketRequest(context);
                }
                catch (Exception ex)
                {
                    Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(RunServer) + ": " + ex.Message);

                    // Avoid spinning too fast
                    Thread.Sleep(500);
                }
            }
        }

        private static string GetTextResource(Assembly executingAssembly, string resourceName)
        {
            //var asdf = executingAssembly.GetManifestResourceNames();
            Stream stream = executingAssembly.GetManifestResourceStream(resourceName);

            using (StreamReader reader = new StreamReader(stream))
            {
                return reader.ReadToEnd();
            }
        }

        private static async void HandleInitialRequest(HttpListenerContext hc)
        {
            try
            {
                hc.Response.ContentType = "text/HTML";
                await hc.Response.OutputStream.WriteAsync(_clientHtmlRaw, 0, _clientHtmlRaw.Length);
                hc.Response.Close();
            }
            catch (Exception ex)
            {
                Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(HandleInitialRequest) + ": " + ex.Message);
            }
        }

        private static async void HandleWebSocketRequest(HttpListenerContext hc)
        {
            HttpListenerWebSocketContext connectionCtx;
            try
            {
                connectionCtx = await hc.AcceptWebSocketAsync(null);

                var webSocketInfo = new WebSocketInfo(connectionCtx.WebSocket);
                _sockets[webSocketInfo.Socket] = webSocketInfo;
                CommandListener(webSocketInfo);
            }
            catch (Exception ex)
            {
                Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(HandleWebSocketRequest) + ": " + ex.Message);

                return;
            }
        }

        private static async void SendLoop()
        {
            DateTime lastSendTime = DateTime.MinValue;

            for (; ; )
            {
                try
                {
                    if (_sockets.Count > 0)
                    {
                        ServerMessage message = new ServerMessage();
                        message.Name = Name;
                        message.ManualStats = Stats.GetStats();
                        foreach (var button in Buttons.GetButtons())
                            message.CustomButtons.Add(button);
                        message.ConsoleMessages = _consoleMessageQueue.GetMessagesSince(lastSendTime);

                        var serializedResult = JsonConvert.SerializeObject(message);
                        var buffer = Encoding.UTF8.GetBytes(serializedResult);
                        var segment = new ArraySegment<byte>(buffer);

                        foreach (var link in _links)
                        {
                            if (link.Value.DurationStat.Samples == 0)
                                continue;

                            message.Traffics.Add(new Traffic(
                                link.Value.Caller.Name,
                                link.Value.Caller.OverrideCount > 0,
                                link.Value.Caller.HasUserScript,
                                link.Value.Callee.Name,
                                link.Value.Callee.OverrideCount > 0,
                                link.Value.Callee.HasUserScript,
                                link.Value.DurationStat,
                                link.Value.MaxThreads,
                                link.Value.Caller.IsRoot,
                                link.Value.Callee.IsLeaf));
                        }

                        lastSendTime = DateTime.UtcNow;

                        serializedResult = JsonConvert.SerializeObject(message);
                        buffer = Encoding.UTF8.GetBytes(serializedResult);
                        var segmentWithTraffic = new ArraySegment<byte>(buffer);

                        foreach (var kvp in _sockets)
                        {
                            SendServerResponse(kvp.Key, segment, segmentWithTraffic);
                        }
                    }

                    // Flush traffic / reset stats
                    Stats.ResetStats();
                    foreach (var link in _links)
                    {
                        if (link.Value.DurationStat.Samples == 0)
                            continue;

                        link.Value.Reset();
                    }
                }
                catch (Exception ex)
                {
                    Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(SendLoop) + ": " + ex.Message);
                }

                await Task.Delay(_messageRate);
            }
        }

        private static async void SendServerResponse(WebSocket webSocket,
            ArraySegment<byte> segment,
            ArraySegment<byte> segmentWithTraffic)
        {
            try
            {
                WebSocketInfo webSocketInfo;
                if (_sockets.TryRemove(webSocket, out webSocketInfo))
                {
                    if (webSocket.State == WebSocketState.Open)
                    {
                        var segmentToUse = segmentWithTraffic;
                        if (webSocketInfo.PausedFlowGraph)
                            segmentToUse = segment;

                        await webSocketInfo.SendAsync(segmentToUse);

                        _sockets[webSocket] = webSocketInfo;
                    }
                }
            }
            catch (Exception ex)
            {
                Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(SendServerResponse) + ": " + ex.Message);
            }
        }

        private static async void CommandListener(WebSocketInfo webSocketInfo)
        {
            ArraySegment<byte> arr = new ArraySegment<byte>(new byte[1024]);
            CancellationToken ct = new CancellationToken();

            Interlocked.Increment(ref _connectedCount);

            try
            {
                for (; ; )
                {
                    try
                    {
                        using (MemoryStream ms = new MemoryStream())
                        {
                            for (; ; )
                            {
                                if (webSocketInfo.Socket.State != WebSocketState.Open)
                                    return;
                                var res = await webSocketInfo.Socket.ReceiveAsync(arr, ct);
                                ms.Write(arr.Array, 0, res.Count);
                                if (res.EndOfMessage)
                                    break;
                            }

                            var messageSerialized = System.Text.Encoding.Default.GetString(ms.ToArray());

                            var message = JsonConvert.DeserializeObject<ClientMessage>(messageSerialized);
                            if (message == null)
                                continue;

                            if (!string.IsNullOrEmpty(message.CustomButton))
                            {
#pragma warning disable 4014
                                if (!Options.HasFlag(MaintFaceOptions.EnableButtons))
                                {
                                    Trace.WriteLine(nameof(MaintFace) + ": Button use is disabled.");
                                }
                                else
                                {
                                    CustomButtonEvent evt;
                                    if (Buttons.TryGetEvent(message.CustomButton, out evt))
                                        Task.Run(() =>
                                        {
                                            try
                                            {
                                                evt.Trigger(message.CustomButton);
                                            }
                                            catch (Exception ex)
                                            {
                                                Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(evt.Trigger) + ": " + ex.Message);
                                            }
                                        });
                                }
#pragma warning restore 4014
                            }
                            if (!string.IsNullOrEmpty(message.Command))
                            {
                                if (!Options.HasFlag(MaintFaceOptions.EnableCommands))
                                {
                                    Trace.WriteLine(nameof(MaintFace) + ": Command use is disabled.");
                                }
                                else
                                {
                                    if (CommandReceived != null)
                                    {
#pragma warning disable 4014
                                        _consoleMessageQueue.Enqueue(">" + message.Command);
                                        var args = new CommandReceivedEventArgs(message.Command);

                                        Task.Run(() =>
                                        {
                                            try
                                            {
                                                CommandReceived(null, args);
                                            }
                                            catch (Exception ex)
                                            {
                                                Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(CommandReceived) + ": " + ex.Message);
                                            }
                                        }).ContinueWith((task) =>
                                        {
                                            if (args.Response != null)
                                                _consoleMessageQueue.Enqueue(args.Response);
                                        });
                                    }
                                }
#pragma warning restore 4014
                            }
                            if (message.DumpTracePointName != null)
                            {
                                TraceNode traceNode;
                                if (_nodes.TryGetValue(message.DumpTracePointName, out traceNode))
                                {
                                    AwaitableObject<VariableDump> dumpRequest =
                                        new AwaitableObject<VariableDump>();
                                    traceNode.VarDumpRequests.Enqueue(dumpRequest);
                                    var dump = await dumpRequest.WaitForValue();

                                    ServerVarDumpMessage response = new ServerVarDumpMessage();
                                    response.MessageId = message.MessageId;
                                    response.VarDump = dump;
                                    var serializedResult = JsonConvert.SerializeObject(response);
                                    var buffer = Encoding.UTF8.GetBytes(serializedResult);
                                    var segment = new ArraySegment<byte>(buffer);
                                    if (webSocketInfo.Socket.State != WebSocketState.Open)
                                        return;

                                    await webSocketInfo.SendAsync(segment);
                                }
                            }
                            if (message.StatOverride != null)
                            {
                                if (!Options.HasFlag(MaintFaceOptions.EnableVariableOverride))
                                {
                                    Trace.WriteLine(nameof(MaintFace) + ": Variable overrides are disabled.");
                                }
                                else
                                {
                                    var counter = Stats.GetIfExists(message.StatOverride.Name);
                                    if (counter != null)
                                        counter.ValueOverride = message.StatOverride.Value;
                                }
                            }
                            if (message.VarOverride != null)
                            {
                                if (!Options.HasFlag(MaintFaceOptions.EnableVariableOverride))
                                {
                                    Trace.WriteLine(nameof(MaintFace) + ": Variable overrides are disabled.");
                                }
                                else
                                {
                                    TraceNode traceNode;
                                    if (_nodes.TryGetValue(message.VarOverride.NodeName, out traceNode))
                                        traceNode.SetOverride(
                                            message.VarOverride.RootIndex,
                                            message.VarOverride.VarIndex,
                                            message.VarOverride.Value);
                                }
                            }
                            if (message.Script != null)
                            {
                                if (!Options.HasFlag(MaintFaceOptions.EnableCodeInjection))
                                {
                                    Trace.WriteLine(nameof(MaintFace) + ": Code injection is disabled.");
                                }
                                else
                                {
                                    TraceNode traceNode;
                                    if (_nodes.TryGetValue(message.Script.NodeName, out traceNode))
                                        traceNode.SetScript(message.Script.Source);
                                }
                            }
                            if (message.DumpSourceName != null)
                            {
                                TraceNode traceNode;
                                if (_nodes.TryGetValue(message.DumpSourceName, out traceNode))
                                {
                                    ServerSourceMessage response = new ServerSourceMessage();
                                    response.MessageId = message.MessageId;
                                    response.Source = traceNode.ScriptSource;
                                    var serializedResult = JsonConvert.SerializeObject(response);
                                    var buffer = Encoding.UTF8.GetBytes(serializedResult);
                                    var segment = new ArraySegment<byte>(buffer);
                                    if (webSocketInfo.Socket.State != WebSocketState.Open)
                                        return;

                                    await webSocketInfo.SendAsync(segment);
                                }
                            }
                            if (message.TrafficCommand != null)
                            {
                                if (message.TrafficCommand == "Pause")
                                    webSocketInfo.PausedFlowGraph = true;
                                else if (message.TrafficCommand == "Continue")
                                    webSocketInfo.PausedFlowGraph = false;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(CommandListener) + ": " + ex.Message);

                        // Avoid spinning too fast
                        Thread.Sleep(500);
                    }
                }
            }
            finally
            {
                Interlocked.Decrement(ref _connectedCount);
            }
        }
    }
}