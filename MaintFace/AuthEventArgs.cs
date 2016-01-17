using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BW.Diagnostics
{
	[EditorBrowsable(EditorBrowsableState.Never)]
	public class AuthEventArgs : EventArgs
	{
		/// <summary>The information of the connecting user.</summary>
		public System.Security.Principal.IPrincipal User { get; }
		/// <summary>Response flag indicating that the user credentials have been authenticated.</summary>
		public bool Authenticated { get; set; } = false;

		internal AuthEventArgs(System.Security.Principal.IPrincipal user)
		{
			User = user;
		}
	}
}
