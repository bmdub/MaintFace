using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BW.Diagnostics
{
	internal class TraceLink
	{
		public readonly TraceNode Caller;
		public readonly TraceNode Callee;
		private object _lock = new object();
		private ManualStat _durationStat;
		private int _maxThreads;
		private ConcurrentDictionary<int, bool> _threadDictionary = new ConcurrentDictionary<int, bool>();

		public TraceLink(TraceNode caller, TraceNode callee)
		{
			Caller = caller;
			Callee = callee;
			_durationStat = new ManualStat("Duration - " + Caller.Name + " TO " + Callee.Name + "");
			_durationStat.NumberFormatAction = (value) => value.ToString("#,##0") + "ms";

			if (Caller.ExpectedDuration != default(TimeSpan))
				_durationStat.ExpectedMaxNumber = (double)Caller.ExpectedDuration.Ticks / (double)TimeSpan.TicksPerMillisecond;
		}

		public Stat DurationStat { get { lock (_lock) return _durationStat; } }
		public int MaxThreads { get { lock (_lock) return _maxThreads; } }

		public void Update(double deltaMs, int threadID)
		{
			lock (_lock)
			{
				_durationStat.Update(deltaMs);

				bool threadSeen;
				bool entryFound = _threadDictionary.TryGetValue(threadID, out threadSeen);
				if (!threadSeen || !entryFound)
				{
					_threadDictionary[threadID] = true;
					_maxThreads++;
				}
			}
		}

		public void Reset()
		{
			lock (_lock)
			{
				_durationStat.Reset();
				_maxThreads = 0;
				foreach (var key in _threadDictionary.Keys)
					_threadDictionary[key] = false;
			}
		}

		public static long Hash(string callerName, string calleName)
		{
			long hc1 = (uint)callerName.GetHashCode();
			long hc2 = (uint)calleName.GetHashCode();
			hc2 = hc2 << 32;
			return hc1 | hc2;
		}
	}
}
