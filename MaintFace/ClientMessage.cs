using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BW.Diagnostics
{
	internal class ClientMessage : AsyncWebSocketMessage
	{
		public string CustomButton { get; set; }
		public string Command { get; set; }
        public StatOverrideMessage StatOverride { get; set; }
        public string DumpTracePointName { get; set; }
        public VarOverrideMessage VarOverride { get; set; }
        public ScriptMessage Script { get; set; }
        public string DumpSourceName { get; set; }
		public string TrafficCommand { get; set; }
    }

    internal class StatOverrideMessage
    {
        public string Name { get; set; }
        public string Value { get; set; }
    }

    internal class VarOverrideMessage
    {
        public string NodeName { get; set; }
        public int RootIndex { get; set; }
        public int VarIndex { get; set; }
        public string Value { get; set; }
    }

    internal class ScriptMessage
    {
        public string NodeName { get; set; }
        public string Source { get; set; }
    }
}
