using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BW.Diagnostics
{
	public static partial class MaintFace
	{
		private static volatile List<Instance> _instances = null;

		[Serializable]
		private class Instance
		{
			public DateTime TimeStamp { get; set; }
			public string Name { get; set; }
			public Guid Guid { get; set; }
			public string Url { get; set; }
			[NonSerialized]
			public bool IsThis;
		}

		private static async void InstanceListLoop()
		{
			SharedMemoryBlock block;

			try
			{
				block = new SharedMemoryBlock("__" + nameof(MaintFace), 65536, true);
			}
			catch (Exception)
			{
				// could not create memory segment, possibly because of security.  we don't know.
#if DEBUG
				Trace.WriteLine(nameof(MaintFace) + " Warning: Cannot view local " + nameof(MaintFace)
					+ " instances; Could not create/read shared memory segment.");
#endif
				return;
			}

			Guid instanceGuid = Guid.NewGuid();

			for (;;)
			{
				try
				{
					using (block.AcquireExclusiveAccess())
					{
						List<Instance> newList;
						try
						{
							newList = block.ReadSerializable<List<Instance>>();
						}
						catch (Exception)
						{
							// Corrupt or non-existent; Create a new list.
							newList = new List<Instance>();
						}

						// Find and update the timestamp; recreate if necessary
						bool found = false;
						for (int i = 0; i < newList.Count; i++)
						{
							if (newList[i].Guid == instanceGuid)
							{
								newList[i].TimeStamp = DateTime.UtcNow;
								newList[i].IsThis = true;
								found = true;
								break;
							}
						}

						if (!found)
						{
							var newInstance = new Instance()
							{
								Name = Name,
								Guid = instanceGuid,
								Url = Url,
								TimeStamp = DateTime.UtcNow,
								IsThis = true,
							};

							// Make sure the name is unique
							for (int ct = 0; ; ct++)
							{
								if (ct == 0) newInstance.Name = Name;
								else
									newInstance.Name = Name + $" ({ct})";

								bool unique = true;
								for (int i = 0; i < newList.Count; i++)
									if (newList[i].Name == newInstance.Name)
									{
										unique = false;
										break;
									}
								if (unique)
									break;
							}
							
							newList.Add(newInstance);
						}

						// Check other timestamps for age; delete if necessary
						var now = DateTime.UtcNow;
						for (int i = 0; i < newList.Count; i++)
							if ((now - newList[i].TimeStamp) > TimeSpan.FromSeconds(3))
								newList.RemoveAt(i--);

						block.WriteSerializable(newList);

						_instances = newList;
					}
				}
				catch (Exception ex)
				{
					Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(InstanceListLoop) + ": " + ex.Message);
				}

				await Task.Delay(_messageRate);
			}
		}
	}
}
