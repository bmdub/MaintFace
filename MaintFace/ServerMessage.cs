using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BW.Diagnostics
{
	internal class ServerMessage : AsyncWebSocketMessage
	{
		public string Name { get; set; }
		public List<Stat> PerfStats { get; set; } = new List<Stat>();
		public List<Stat> ManualStats { get; set; } = new List<Stat>();
		public List<string> ConsoleMessages { get; set; } = new List<string>();
		public List<string> CustomButtons { get; set; } = new List<string>();
		public List<Traffic> Traffics { get; set; } = new List<Traffic>();
	}

	internal class ServerVarDumpMessage : AsyncWebSocketMessage
	{
		public VariableDump VarDump { get; set; }
	}

	internal class ServerSourceMessage : AsyncWebSocketMessage
	{
		public string Source { get; set; }
	}

	internal struct Traffic
	{
		public readonly string CallerName;
		public readonly bool CallerVarOv;
		public readonly bool CallerScript;
		public readonly string CalleeName;
		public readonly bool CalleeVarOv;
		public readonly bool CalleeScript;
		public readonly Stat DurationStat;
		public readonly int MaxThreads;
		public readonly bool IsRoot;
		public readonly bool IsLeaf;

		public Traffic(string callerName, bool callerVarsOverridden, bool callerScript, 
			string calleeName, bool calleeVarsOverridden, bool calleeScript,
			Stat durationStat, int maxThreads, bool isRoot, bool isLeaf)
			: this()
		{
			CallerName = callerName;
			CallerVarOv = callerVarsOverridden;
			CallerScript = callerScript;
			CalleeName = calleeName;
			CalleeVarOv = calleeVarsOverridden;
			CalleeScript = calleeScript;
			DurationStat = durationStat;
			MaxThreads = maxThreads;
			IsRoot = isRoot;
			IsLeaf = isLeaf;
		}
	}

	internal struct DumpedVariable
	{
		public int RootIndex { get; set; }
		public int VarIndex { get; set; }
		public string Name { get; set; }
		public string Value { get; set; }
		public int Depth { get; set; }
		public bool Overridden { get; set; }
		public bool Overridable { get; set; }
	}

	internal class VariableDump
	{
		public string Name { get; set; }
		public List<DumpedVariable> DumpedVariables { get; set; }

		public VariableDump(string name)
		{
			Name = name;
			DumpedVariables = new List<DumpedVariable>();
		}
	}
}

