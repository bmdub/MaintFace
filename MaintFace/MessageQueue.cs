using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BW.Diagnostics
{
	internal class MessageQueue
	{
		private ConcurrentQueue<MessageContext> _queue = new ConcurrentQueue<MessageContext>();
		private readonly int _maxQueueCount;
		private DateTime _latestMessageTimeStamp = DateTime.MinValue;

		private struct MessageContext
		{
			public DateTime TimeStamp;
			public string Message;
		}

		public MessageQueue(int maxQueueCount)
		{
			_maxQueueCount = maxQueueCount;
		}
		
		public void Enqueue(string message)
		{
			_latestMessageTimeStamp = DateTime.UtcNow;
			_queue.Enqueue(new MessageContext() { TimeStamp = _latestMessageTimeStamp, Message = message });

			while (_queue.Count > _maxQueueCount)
			{
				MessageContext temp;
				_queue.TryDequeue(out temp);
			}
		}

		internal List<string> GetMessagesSince(DateTime utcTime)
		{
			List<string> messages = new List<string>();

			// Optimization
			if (utcTime > _latestMessageTimeStamp)
				return messages;

			foreach(var ctx in _queue)
			{
				if (utcTime < ctx.TimeStamp)
					messages.Add(ctx.Message);
			}

			return messages;
		}
	}
}
