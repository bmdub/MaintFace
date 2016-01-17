using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BW.Diagnostics
{
	[EditorBrowsable(EditorBrowsableState.Never)]
	public class ButtonPressedEventArgs : EventArgs
	{
		/// <summary>The name of the button that was pressed.</summary>
		public string ButtonName { get; }

		internal ButtonPressedEventArgs(string buttonName)
		{
			ButtonName = buttonName;
		}
	}

	[EditorBrowsable(EditorBrowsableState.Never)]
	public class CustomButtonEvent
	{
		/// <summary>Event that fires when a UI button is pressed.</summary>
		public event EventHandler<ButtonPressedEventArgs> Pressed;

		internal CustomButtonEvent() { }

		internal void Trigger(string button)
		{
			if (Pressed != null)
				Pressed(null, new ButtonPressedEventArgs(button));
		}
	}

	[EditorBrowsable(EditorBrowsableState.Never)]
	public class CustomButtonEvents
	{
		private ConcurrentDictionary<string, CustomButtonEvent> _customButtonEvents = new ConcurrentDictionary<string, CustomButtonEvent>();

		internal CustomButtonEvents() { }

		public CustomButtonEvent this[string button]
		{
			get
			{
				CustomButtonEvent evt;

				if (_customButtonEvents.TryGetValue(button, out evt) == false)
				{
					evt = new CustomButtonEvent();
					_customButtonEvents[button] = evt;
				}

				return evt;
			}
		}

		internal bool TryGetEvent(string button, out CustomButtonEvent evt)
		{
			evt = null;

			return _customButtonEvents.TryGetValue(button, out evt);
		}

		internal List<string> GetButtons()
		{
			List<string> buttons = new List<string>();

			foreach (var kvp in _customButtonEvents)
				buttons.Add(kvp.Key);

			return buttons;
		}
	}
}
