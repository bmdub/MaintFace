using System;
using System.Diagnostics;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Concurrent;
using System.ComponentModel;
using System.Runtime.InteropServices;

namespace BW.Diagnostics
{
    [Flags]
	public enum MaintFaceOptions
	{
		None = 0,
		/// <summary>Allow the use of buttons on the UI.</summary>
		EnableButtons = 1,
		/// <summary>Allow the use of console commands from the UI.</summary>
		EnableCommands = 2,
		/// <summary>Allow users to override program variables from the UI.</summary>
		EnableVariableOverride = 4,
		/// <summary>Allow users to inject code at certain points in the program.</summary>
		EnableCodeInjection = 8,
		All = ~0,
	}

	/// <summary>
	/// Provides a web-based maintenance interface.
	/// </summary>
	public static partial class MaintFace
	{
		/// <summary>The display name associated with this program instance.</summary>
		public static string Name { get; private set; }
		/// <summary>The set of options used to instantiate the interface.</summary>
		public static MaintFaceOptions Options { get; private set; }
		/// <summary>The set of user-updated values to be displayed on the UI.</summary>
		public static ManualStatCounters Stats { get; private set; }
		/// <summary>The set of buttons to be displayed on the UI, corresponding to actions.</summary>
		public static CustomButtonEvents Buttons { get; private set; }
		/// <summary>An event that signals that a console message has arrived from the UI.</summary>
		public static event EventHandler<CommandReceivedEventArgs> CommandReceived;

		private static Stopwatch _stopwatch = new Stopwatch();
		private static MaintFaceTraceListener _traceListener;
		private static MessageQueue _consoleMessageQueue = new MessageQueue(100);
		private static ConcurrentDictionary<Int64, TraceLink> _links = new ConcurrentDictionary<Int64, TraceLink>();
		private static ConcurrentDictionary<string, TraceNode> _nodes = new ConcurrentDictionary<string, TraceNode>();
		private static volatile bool _running = false;

		static MaintFace()
		{
			Stats = new ManualStatCounters();
			Buttons = new CustomButtonEvents();
			_traceListener = new MaintFaceTraceListener(_consoleMessageQueue);
			_stopwatch.Start();
		}

        private static void OpenBrowser(string url)
        {
            url = url.Replace("*", "localhost");

            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                Process.Start(new ProcessStartInfo("cmd", $"/c start {url.Replace("&", "^&")}") { CreateNoWindow = true });
            else if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
                Process.Start("xdg-open", url);
            else if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
                Process.Start("open", url);
        }

        /// <summary>
        /// If no browser connections are detected after a period of time, open a browser page to this instance.
        /// </summary>
        /// <param name="timeout">Time to wait for browser connections.</param>
        public static async void OpenBrowserAfter(TimeSpan timeout)
		{
			await Task.Delay(timeout);

            if (ConnectedCount < 1)
                if (Url != null)
                    OpenBrowser(Url);
		}

		[EditorBrowsable(EditorBrowsableState.Never)]
		public sealed class TracePointRegionEnd : IDisposable
		{
			private readonly string _label;
			private readonly bool _isEndPoint;
			private readonly bool _isSharedNode;

			internal TracePointRegionEnd(string label, bool isEndPoint, bool isSharedNode)
			{
				_label = label;
				_isEndPoint = isEndPoint;
				_isSharedNode = isSharedNode;
			}

			public void Dispose()
			{
				MaintFace.TracePoint(_label, isEndPoint: _isEndPoint, isSharedNode: _isSharedNode);
			}
		}

		/// <summary>
		/// Defines a visual point in execution flow, and returns a disposable object that can be used in a 'using' block to represent a region with 'start' and 'end' points.
		/// </summary>
		/// <param name="label">Unique name for this point.</param>
		/// <param name="isEndPoint">Directs visual execution flow to stop here.</param>
		/// <param name="isSharedNode">Indicates that execution flow from multiple paths can visually converge to this same point.</param>
		/// <param name="expectedMaxDuration">The duration from this point to the next point that is considered 'too slow'.</param>
		/// <returns>A disposable object that can be used in a 'using' block to represent a region with 'start' and 'end' points.</returns>
		public static IDisposable TracePointRegion(string label,
			bool isEndPoint = false,
			bool isSharedNode = true,
			TimeSpan expectedMaxDuration = default(TimeSpan))
		{
			TracePoint(label + " {", false, isSharedNode, expectedMaxDuration);

			return new TracePointRegionEnd(label + " }", isEndPoint, isSharedNode);
		}

		/// <summary>
		/// Defines a visual point in execution flow.
		/// </summary>
		/// <param name="label">Unique name for this point.</param>
		/// <param name="isEndPoint">Directs visual execution flow to stop here.</param>
		/// <param name="isSharedNode">Indicates that execution flow from multiple paths can visually converge to this same point.</param>
		/// <param name="expectedMaxDuration">The duration from this point to the next point that is considered 'too slow'.</param>
		public static void TracePoint(string label,
			bool isEndPoint = false,
			bool isSharedNode = true,
			TimeSpan expectedMaxDuration = default(TimeSpan))
		{
			if (_running == false) return;
			TracePoint(label, new object[0], false, isEndPoint, isSharedNode, expectedMaxDuration);
		}

		/// <summary>
		/// Defines a visual point in execution flow.
		/// </summary>
		/// <param name="label">Unique name for this point.</param>
		/// <param name="var1">Provided variable for monitoring.</param>
		/// <param name="isEndPoint">Directs visual execution flow to stop here.</param>
		/// <param name="isSharedNode">Indicates that execution flow from multiple paths can visually converge to this same point.</param>
		/// <param name="expectedMaxDuration">The duration from this point to the next point that is considered 'too slow'.</param>
		public static void TracePoint<VAR1TYPE>(string label,
			VAR1TYPE var1,
			bool isEndPoint = false,
			bool isSharedNode = true,
			TimeSpan expectedMaxDuration = default(TimeSpan))
		{
			if (_running == false) return;
			var objects = new object[] { var1 };
			TracePoint(label, objects, false, isEndPoint, isSharedNode, expectedMaxDuration);
		}

		/// <summary>
		/// Defines a visual point in execution flow.
		/// </summary>
		/// <param name="label">Unique name for this point.</param>
		/// <param name="var1">Provided variable for monitoring.</param>
		/// <param name="var2">Provided variable for monitoring.</param>
		/// <param name="isEndPoint">Directs visual execution flow to stop here.</param>
		/// <param name="isSharedNode">Indicates that execution flow from multiple paths can visually converge to this same point.</param>
		/// <param name="expectedMaxDuration">The duration from this point to the next point that is considered 'too slow'.</param>
		public static void TracePoint<VAR1TYPE, VAR2TYPE>(string label,
			VAR1TYPE var1,
			VAR2TYPE var2,
			bool isEndPoint = false,
			bool isSharedNode = true,
			TimeSpan expectedMaxDuration = default(TimeSpan))
		{
			if (_running == false) return;
			var objects = new object[] { var1, var2 };
			TracePoint(label, objects, false, isEndPoint, isSharedNode, expectedMaxDuration);
		}

		/// <summary>
		/// Defines a visual point in execution flow.
		/// </summary>
		/// <param name="label">Unique name for this point.</param>
		/// <param name="var1">Provided variable for monitoring.</param>
		/// <param name="var2">Provided variable for monitoring.</param>
		/// <param name="var3">Provided variable for monitoring.</param>
		/// <param name="isEndPoint">Directs visual execution flow to stop here.</param>
		/// <param name="isSharedNode">Indicates that execution flow from multiple paths can visually converge to this same point.</param>
		/// <param name="expectedMaxDuration">The duration from this point to the next point that is considered 'too slow'.</param>
		public static void TracePoint<VAR1TYPE, VAR2TYPE, VAR3TYPE>(string label,
			VAR1TYPE var1,
			VAR2TYPE var2,
			VAR3TYPE var3,
			bool isEndPoint = false,
			bool isSharedNode = true,
			TimeSpan expectedMaxDuration = default(TimeSpan))
		{
			if (_running == false) return;
			var objects = new object[] { var1, var2, var3 };
			TracePoint(label, objects, false, isEndPoint, isSharedNode, expectedMaxDuration);
		}

		/// <summary>
		/// Defines a visual point in execution flow.
		/// </summary>
		/// <param name="label">Unique name for this point.</param>
		/// <param name="var1">Provided variable for monitoring.</param>
		/// <param name="var2">Provided variable for monitoring.</param>
		/// <param name="var3">Provided variable for monitoring.</param>
		/// <param name="var4">Provided variable for monitoring.</param>
		/// <param name="isEndPoint">Directs visual execution flow to stop here.</param>
		/// <param name="isSharedNode">Indicates that execution flow from multiple paths can visually converge to this same point.</param>
		/// <param name="expectedMaxDuration">The duration from this point to the next point that is considered 'too slow'.</param>
		public static void TracePoint<VAR1TYPE, VAR2TYPE, VAR3TYPE, VAR4TYPE>(string label,
			VAR1TYPE var1,
			VAR2TYPE var2,
			VAR3TYPE var3,
			VAR4TYPE var4,
			bool isEndPoint = false,
			bool isSharedNode = true,
			TimeSpan expectedMaxDuration = default(TimeSpan))
		{
			if (_running == false) return;
			var objects = new object[] { var1, var2, var3, var4 };
			TracePoint(label, objects, false, isEndPoint, isSharedNode, expectedMaxDuration);
		}

		/// <summary>
		/// Defines a visual point in execution flow.
		/// </summary>
		/// <param name="label">Unique name for this point.</param>
		/// <param name="var1">Provided variable for monitoring or editing.</param>
		/// <param name="isEndPoint">Directs visual execution flow to stop here.</param>
		/// <param name="isSharedNode">Indicates that execution flow from multiple paths can visually converge to this same point.</param>
		/// <param name="expectedMaxDuration">The duration from this point to the next point that is considered 'too slow'.</param>
		public static void TracePointByRef<VAR1TYPE>(string label,
			ref VAR1TYPE var1,
			bool isEndPoint = false,
			bool isSharedNode = true,
			TimeSpan expectedMaxDuration = default(TimeSpan))
		{
			if (_running == false) return;
			var objects = new object[] { var1 };
			TracePoint(label, objects, true, isEndPoint, isSharedNode, expectedMaxDuration);
			var1 = (VAR1TYPE)objects[0];
		}

		/// <summary>
		/// Defines a visual point in execution flow.
		/// </summary>
		/// <param name="label">Unique name for this point.</param>
		/// <param name="var1">Provided variable for monitoring or editing.</param>
		/// <param name="var2">Provided variable for monitoring or editing.</param>
		/// <param name="isEndPoint">Directs visual execution flow to stop here.</param>
		/// <param name="isSharedNode">Indicates that execution flow from multiple paths can visually converge to this same point.</param>
		/// <param name="expectedMaxDuration">The duration from this point to the next point that is considered 'too slow'.</param>
		public static void TracePointByRef<VAR1TYPE, VAR2TYPE>(string label,
			ref VAR1TYPE var1,
			ref VAR2TYPE var2,
			bool isEndPoint = false,
			bool isSharedNode = true,
			TimeSpan expectedMaxDuration = default(TimeSpan))
		{
			if (_running == false) return;
			var objects = new object[] { var1, var2 };
			TracePoint(label, objects, true, isEndPoint, isSharedNode, expectedMaxDuration);
			var1 = (VAR1TYPE)objects[0];
			var2 = (VAR2TYPE)objects[1];
		}

		/// <summary>
		/// Defines a visual point in execution flow.
		/// </summary>
		/// <param name="label">Unique name for this point.</param>
		/// <param name="var1">Provided variable for monitoring or editing.</param>
		/// <param name="var2">Provided variable for monitoring or editing.</param>
		/// <param name="var3">Provided variable for monitoring or editing.</param>
		/// <param name="isEndPoint">Directs visual execution flow to stop here.</param>
		/// <param name="isSharedNode">Indicates that execution flow from multiple paths can visually converge to this same point.</param>
		/// <param name="expectedMaxDuration">The duration from this point to the next point that is considered 'too slow'.</param>
		public static void TracePointByRef<VAR1TYPE, VAR2TYPE, VAR3TYPE>(string label,
			ref VAR1TYPE var1,
			ref VAR2TYPE var2,
			ref VAR3TYPE var3,
			bool isEndPoint = false,
			bool isSharedNode = true,
			TimeSpan expectedMaxDuration = default(TimeSpan))
		{
			if (_running == false) return;
			var objects = new object[] { var1, var2, var3 };
			TracePoint(label, objects, true, isEndPoint, isSharedNode, expectedMaxDuration);
			var1 = (VAR1TYPE)objects[0];
			var2 = (VAR2TYPE)objects[1];
			var3 = (VAR3TYPE)objects[2];
		}

		/// <summary>
		/// Defines a visual point in execution flow.
		/// </summary>
		/// <param name="label">Unique name for this point.</param>
		/// <param name="var1">Provided variable for monitoring or editing.</param>
		/// <param name="var2">Provided variable for monitoring or editing.</param>
		/// <param name="var3">Provided variable for monitoring or editing.</param>
		/// <param name="var4">Provided variable for monitoring or editing.</param>
		/// <param name="isEndPoint">Directs visual execution flow to stop here.</param>
		/// <param name="isSharedNode">Indicates that execution flow from multiple paths can visually converge to this same point.</param>
		/// <param name="expectedMaxDuration">The duration from this point to the next point that is considered 'too slow'.</param>
		public static void TracePointByRef<VAR1TYPE, VAR2TYPE, VAR3TYPE, VAR4TYPE>(string label,
			ref VAR1TYPE var1,
			ref VAR2TYPE var2,
			ref VAR3TYPE var3,
			ref VAR4TYPE var4,
			bool isEndPoint = false,
			bool isSharedNode = true,
			TimeSpan expectedMaxDuration = default(TimeSpan))
		{
			if (_running == false) return;
			var objects = new object[] { var1, var2, var3, var4 };
			TracePoint(label, objects, true, isEndPoint, isSharedNode, expectedMaxDuration);
			var1 = (VAR1TYPE)objects[0];
			var2 = (VAR2TYPE)objects[1];
			var3 = (VAR3TYPE)objects[2];
			var4 = (VAR4TYPE)objects[3];
		}
        
		private static AsyncLocal<string> _lastTracePointName = new AsyncLocal<string>();
		private static AsyncLocal<long> _lastTimeStamp = new AsyncLocal<long>();

		private static void TracePoint(string label,
			object[] vars,
			bool overridable,
			bool isEndPoint = false,
			bool isSharedNode = true,
			TimeSpan expectedMaxDuration = default(TimeSpan))
		{
			if (label == null)
				throw new ArgumentNullException(nameof(label));

			try
			{
				long timeStamp = _stopwatch.ElapsedTicks;
                
				string lastTracePointName = _lastTracePointName.Value;
				_lastTracePointName.Value = label;
				long lastTimeStamp = _lastTimeStamp.Value;
				_lastTimeStamp.Value = timeStamp;

				if (lastTracePointName == null)
				{
					TraceNode callee;
					if (_nodes.TryGetValue(label, out callee) == false)
					{
						Type[] types = new Type[vars.Length];
						for (int i = 0; i < vars.Length; i++)
							types[i] = vars[i].GetType();

						callee = new TraceNode(label, types, overridable, true, isEndPoint, expectedMaxDuration);
						_nodes.TryAdd(label, callee);
					}

					return;
				}

				if (isSharedNode == false)
				{
					label = label + " (*" + lastTracePointName + ")";
					_lastTracePointName.Value = label;
				}

				long hash = TraceLink.Hash(lastTracePointName, label);

				TraceLink link;
				if (_links.TryGetValue(hash, out link) == false)
				{
					TraceNode caller, callee;
					if (_nodes.TryGetValue(lastTracePointName, out caller) == false)
					{
						Debug.Assert(false, "Calling trace point does not exist.");
					}
					if (_nodes.TryGetValue(label, out callee) == false)
					{
						Type[] types = new Type[vars.Length];
						for (int i = 0; i < vars.Length; i++)
							types[i] = vars[i].GetType();

						callee = new TraceNode(label, types, overridable, false, isEndPoint, expectedMaxDuration);
						_nodes.TryAdd(label, callee);
					}

					link = new TraceLink(caller, callee);
					_links.TryAdd(hash, link);
				}

				// Note: StopWatch Ticks are not standard ticks.
			    double delta = (timeStamp - lastTimeStamp) / (Stopwatch.Frequency / 1000);

				link.Update(delta, Thread.CurrentThread.ManagedThreadId);

				// Apply variable overrides
				link.Callee.ApplyOverrides(vars);

				// Dump variables if requested
				link.Callee.DumpVariables(vars);

				// Run script hook
				link.Callee.RunScript(vars);
			}
			catch (Exception ex)
			{
				Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(TracePoint) + ": " + ex.Message);
			}
		}

		/// <summary>
		/// Writes a message to the UI console.
		/// </summary>
		public static void WriteConsoleMessage(string message)
		{
			if (_running == false) return;
			_consoleMessageQueue.Enqueue(message);
		}

		/// <summary>
		/// Start the maintenance interface on the specified endpoint.
		/// </summary>
		/// <param name="name">The display name associated with this program instance.</param>
		/// <param name="url">The endpoint at which to listen for incoming browser connections.
		/// Ex. "http://localhost:22222/MyAppName/" </param>
		/// <param name="options">Flags which can be used to selectively enable certain features.</param>
		/// <param name="authSchemes">Set of auth schemes to be used.</param>
		public static void Start(string name, string url,
			MaintFaceOptions options = MaintFaceOptions.All,
			AuthenticationSchemes authSchemes = AuthenticationSchemes.Anonymous)
		{
			if (string.IsNullOrEmpty(name))
				throw new ArgumentException("Cannot be empty", nameof(name));
			if (_running)
				throw new InvalidOperationException(nameof(MaintFace) + " has already been started.");
			_running = true;
			Name = name;
			Options = options;
			RunServer(url, authSchemes);
		}
	}
}


