using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace BW.Diagnostics
{	
	[EditorBrowsable(EditorBrowsableState.Never)]
	public class PerfStatCounters
	{
		private ConcurrentDictionary<string, PerfStat> _stats = new ConcurrentDictionary<string, PerfStat>();

		internal PerfStatCounters()
		{
			var theProcess = Process.GetCurrentProcess();

			this["Elapsed Time"].PerfCounter = new PerformanceCounter("Process", "Elapsed Time", theProcess.ProcessName);
			this["Elapsed Time"].NumberFormatAction = (value) => TimeSpan.FromSeconds(value).ToString(@"hh\:mm\:ss");

			this["% Processor Time"].PerfCounter = new PerformanceCounter("Process", "% Processor Time", theProcess.ProcessName);			
			this["Private Bytes"].PerfCounter = new PerformanceCounter("Process", "Private Bytes", theProcess.ProcessName);
			this["Thread Count"].PerfCounter = new PerformanceCounter("Process", "Thread Count", theProcess.ProcessName);
			this["IO Read Bytes/sec"].PerfCounter = new PerformanceCounter("Process", "IO Read Bytes/sec", theProcess.ProcessName);
			this["IO Write Bytes/sec"].PerfCounter = new PerformanceCounter("Process", "IO Write Bytes/sec", theProcess.ProcessName);
			this["Lock Contention Rate / sec"].PerfCounter = new PerformanceCounter(".NET CLR LocksAndThreads", "Contention Rate / sec", theProcess.ProcessName);
			this["% Time in GC"].PerfCounter = new PerformanceCounter(".NET CLR Memory", "% Time in GC", theProcess.ProcessName);
		}

		public PerfStat this[string key]
		{
			get
			{
				PerfStat counter;
				if (_stats.TryGetValue(key, out counter) == false)
				{
					counter = new PerfStat(key);
					_stats[key] = counter;
				}
				return counter;
			}
		}

		public bool TryRemove(string key)
		{
			PerfStat temp;
			return _stats.TryRemove(key, out temp);
		}

		public void Clear()
		{
			_stats.Clear();
		}

		internal List<Stat> BuildStats()
		{
			List<Stat> stats = new List<Stat>();
			var kvps = _stats.ToList();
			kvps.Sort((x, y) => x.Key.CompareTo(y.Key));
			foreach (var kvp in kvps)
			{
				//if (kvp.Value != null)
				kvp.Value.UpdateValue(); // Get perf counter value
				stats.Add(kvp.Value);
			}
			return stats;
		}

		internal void ResetStats()
		{
			foreach (var value in _stats.Values)
				value.Reset();
		}
	}
}