using System;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BW.Diagnostics
{
	internal class MaintFaceTraceListener : TraceListener
	{
		private MessageQueue _messageQueue;

		public MaintFaceTraceListener(MessageQueue messageQueue)
		{
			_messageQueue = messageQueue;
		}

		public override void Write(string message)
		{
			WriteLine(message);
		}

		public override void WriteLine(string message)
		{
			_messageQueue.Enqueue(message);
		}
	}
}
