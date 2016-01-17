using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BW.Diagnostics
{
	internal class AwaitableObject<T>
	{
		private volatile TaskCompletionSource<bool> _tcs = new TaskCompletionSource<bool>();

		private T _object;
		public T Value
		{
			get { return _object; }
			set
			{
				_object = value;
				_tcs.TrySetResult(true);
			}
		}

		public async Task<T> WaitForValue()
		{
			await _tcs.Task;
			return _object;
		}
	}
}
