using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BW.Diagnostics
{
	[EditorBrowsable(EditorBrowsableState.Never)]
	public class CommandReceivedEventArgs : EventArgs
	{
		/// <summary>The incoming console command string.</summary>
		public string Command { get; }
		/// <summary>Optional response to display on the console.</summary>
		public string Response { get; set; }

		internal CommandReceivedEventArgs(string command)
		{
			Command = command;
		}
	}
}
