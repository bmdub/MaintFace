using System;
using System.Collections;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace BW.Diagnostics
{
	[EditorBrowsable(EditorBrowsableState.Never)]
	public class ManualStatCounters : IEnumerable<Stat>
	{
		private ConcurrentDictionary<string, ManualStat> _stats = new ConcurrentDictionary<string, ManualStat>();

		internal ManualStatCounters() { }

        public ManualStat GetIfExists(string key)
        {
            ManualStat counter;
            if (_stats.TryGetValue(key, out counter) == false)
                return null;
            return counter;
        }

		public ManualStat this[string key]
		{
			get
			{
				ManualStat counter;
				if (_stats.TryGetValue(key, out counter) == false)
				{
					counter = new ManualStat(key);
					_stats[key] = counter;
				}
				return counter;
			}
		}

		public bool TryRemove(string key)
		{
			ManualStat temp;
			return _stats.TryRemove(key, out temp);
		}

		public void Clear()
		{
			_stats.Clear();
		}

		internal List<Stat> GetStats()
		{
			List<Stat> stats = new List<Stat>();
			var kvps = _stats.ToList();
			kvps.Sort((x, y) => x.Key.CompareTo(y.Key));
			foreach (var kvp in kvps)
			{
				stats.Add(kvp.Value);
			}
			return stats;
		}

		internal void ResetStats()
		{
			foreach(var value in _stats.Values)
				value.Reset();
		}

		public IEnumerator<Stat> GetEnumerator()
		{
			return GetStats().GetEnumerator();
		}

		IEnumerator IEnumerable.GetEnumerator()
		{
			return GetStats().GetEnumerator();
		}
	}
}
