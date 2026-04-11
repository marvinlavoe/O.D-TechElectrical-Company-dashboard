import { useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Paperclip,
  Search,
  Send,
  UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import useAuthStore from "../../store/useAuthStore";
import Avatar from "../../components/ui/Avatar";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import {
  appendUniqueMessage,
  buildDirectMessageName,
  buildJobChannelName,
  formatMessageTimestamp,
  getChatUserLabel,
  mapMessageWithProfiles,
} from "../../lib/chat";

async function ensureGeneralChannel(userId) {
  const { data: existingChannel, error } = await supabase
    .from("channels")
    .select("id, name, type, job_id, created_at")
    .eq("type", "channel")
    .eq("name", "General")
    .is("job_id", null)
    .maybeSingle();

  if (error) throw error;
  if (existingChannel) return existingChannel;

  const { data: createdChannel, error: createError } = await supabase
    .from("channels")
    .insert([{ name: "General", type: "channel", created_by: userId }])
    .select("id, name, type, job_id, created_at")
    .single();

  if (!createError) return createdChannel;

  const { data: retryChannel, error: retryError } = await supabase
    .from("channels")
    .select("id, name, type, job_id, created_at")
    .eq("type", "channel")
    .eq("name", "General")
    .is("job_id", null)
    .maybeSingle();

  if (retryError) throw retryError;
  return retryChannel;
}

async function ensureJobChannels(userId) {
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id, title, status, customers(name)")
    .order("created_at", { ascending: false });

  if (jobsError) throw jobsError;

  const { data: existingChannels, error: channelsError } = await supabase
    .from("channels")
    .select("id, name, type, job_id, created_at")
    .eq("type", "job");

  if (channelsError) throw channelsError;

  const channelMap = new Map(
    (existingChannels || []).map((channel) => [String(channel.job_id), channel]),
  );

  const missingJobs = (jobs || []).filter((job) => !channelMap.has(String(job.id)));

  if (missingJobs.length) {
    const { data: insertedChannels } = await supabase
      .from("channels")
      .insert(
        missingJobs.map((job) => ({
          name: buildJobChannelName(job),
          type: "job",
          job_id: job.id,
          created_by: userId,
        })),
      )
      .select("id, name, type, job_id, created_at");

    for (const channel of insertedChannels || []) {
      channelMap.set(String(channel.job_id), channel);
    }
  }

  return (jobs || [])
    .map((job) => {
      const channel = channelMap.get(String(job.id));
      if (!channel) return null;

      return {
        ...channel,
        name: buildJobChannelName(job),
        customerName: job.customers?.name || "",
        jobTitle: job.title || `Job #${job.id}`,
        jobStatus: job.status || "Pending",
      };
    })
    .filter(Boolean);
}

async function fetchDirectMessageChannels(userId, profiles) {
  const { data: membershipRows, error: membershipError } = await supabase
    .from("channel_members")
    .select("channel_id")
    .eq("user_id", userId);

  if (membershipError) throw membershipError;

  const channelIds = [...new Set((membershipRows || []).map((row) => row.channel_id))];
  if (!channelIds.length) return [];

  const { data: channels, error: channelsError } = await supabase
    .from("channels")
    .select("id, name, type, created_at")
    .eq("type", "dm")
    .in("id", channelIds)
    .order("created_at", { ascending: false });

  if (channelsError) throw channelsError;
  if (!channels?.length) return [];

  const { data: members, error: membersError } = await supabase
    .from("channel_members")
    .select("channel_id, user_id")
    .in(
      "channel_id",
      channels.map((channel) => channel.id),
    );

  if (membersError) throw membersError;

  const profilesById = Object.fromEntries(
    (profiles || []).map((profileItem) => [profileItem.id, profileItem]),
  );

  return channels.map((channel) => {
    const otherMemberId = (members || [])
      .filter((member) => member.channel_id === channel.id)
      .map((member) => member.user_id)
      .find((memberId) => memberId !== userId);

    const otherProfile = profilesById[otherMemberId] || null;

    return {
      ...channel,
      directUserId: otherMemberId || null,
      directUser: otherProfile,
      name: buildDirectMessageName(otherProfile),
    };
  });
}

function getChatErrorMessage(error) {
  if (error?.code === "42P01") {
    return "Chat tables are missing. Run the chat migration first.";
  }

  if (error?.code === "PGRST202") {
    return "Chat setup is incomplete. Run the latest chat migration first.";
  }

  return error?.message || "Unable to load chat right now.";
}

function getChannelMeta(channel) {
  if (channel.type === "channel") {
    return "Company-wide updates and coordination";
  }

  if (channel.type === "job") {
    const customer = channel.customerName || "No customer linked";
    return `${customer} - ${channel.jobStatus || "Pending"}`;
  }

  return channel.directUser?.role || "Direct message";
}

function getChannelTag(channel) {
  if (channel.type === "channel") return "Team";
  if (channel.type === "job") return "Job";
  return "Direct";
}

function getChannelAvatarName(channel) {
  return channel.type === "dm"
    ? buildDirectMessageName(channel.directUser)
    : channel.name || "Chat";
}

function getChannelAvatarSrc(channel) {
  return channel.type === "dm" ? channel.directUser?.avatar_url : null;
}

function channelMatchesQuery(channel, query) {
  if (!query) return true;

  return [channel.name, getChannelMeta(channel), channel.customerName, channel.jobTitle]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(query));
}

function ChannelListButton({ channel, selected, onClick }) {
  const meta = getChannelMeta(channel);
  const timestamp = channel.created_at ? formatMessageTimestamp(channel.created_at) : "";

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${
        selected ? "bg-[#2a3942]" : "hover:bg-[#1f2c34]"
      }`}
    >
      <Avatar
        name={getChannelAvatarName(channel)}
        src={getChannelAvatarSrc(channel)}
        size="md"
        className={selected ? "ring-2 ring-[#25d366]/35 ring-offset-2 ring-offset-[#2a3942]" : ""}
      />
      <div className="min-w-0 flex-1 border-b border-[#22313a] pb-1">
        <div className="flex items-start gap-3">
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-[#e9edef]">
            {channel.name}
          </p>
          <span className="shrink-0 text-[11px] text-[#8696a0]">{timestamp}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-xs text-[#8696a0]">{meta}</p>
          <span className="rounded-full bg-[#0f3b33] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#25d366]">
            {getChannelTag(channel)}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function ChatPage() {
  const { session, profile } = useAuthStore();
  const currentUser = session?.user || null;
  const currentUserId = currentUser?.id || null;
  const currentUserEmail = currentUser?.email || "";
  const conversationTabs = ["general", "jobs", "direct", "people"];

  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [teamChannels, setTeamChannels] = useState([]);
  const [jobChannels, setJobChannels] = useState([]);
  const [dmChannels, setDmChannels] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [startingDmId, setStartingDmId] = useState(null);
  const [activeConversationTab, setActiveConversationTab] = useState("general");

  const endRef = useRef(null);

  const allChannels = [...teamChannels, ...jobChannels, ...dmChannels];
  const selectedChannel =
    allChannels.find((channel) => channel.id === selectedChannelId) || null;
  const searchQuery = peopleSearch.trim().toLowerCase();
  const filteredTeamChannels = teamChannels.filter((channel) =>
    channelMatchesQuery(channel, searchQuery),
  );
  const filteredJobChannels = jobChannels.filter((channel) =>
    channelMatchesQuery(channel, searchQuery),
  );
  const filteredDmChannels = dmChannels.filter((channel) =>
    channelMatchesQuery(channel, searchQuery),
  );
  const visiblePeople = profiles
    .filter((entry) => entry.id !== currentUserId)
    .filter((entry) => {
      if (!searchQuery) return true;

      return (
        getChatUserLabel(entry).toLowerCase().includes(searchQuery) ||
        (entry.role || "").toLowerCase().includes(searchQuery)
      );
    })
    .slice(0, 8);
  const selectedChannelDescription = selectedChannel ? getChannelMeta(selectedChannel) : "";
  const selectedChannelTag = selectedChannel ? getChannelTag(selectedChannel) : "";
  const selectedChannelAvatarName = selectedChannel
    ? getChannelAvatarName(selectedChannel)
    : "Chat";
  const selectedChannelAvatarSrc = selectedChannel
    ? getChannelAvatarSrc(selectedChannel)
    : null;
  const tabLabels = {
    general: "General",
    jobs: "Jobs",
    direct: "Direct",
    people: "People",
  };
  const searchPlaceholder =
    activeConversationTab === "people" ? "Find a teammate to message" : `Search ${tabLabels[activeConversationTab].toLowerCase()} chats`;

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      setWorkspaceError("Please sign in to use the chat module.");
      return;
    }

    let ignore = false;

    async function loadWorkspace() {
      setLoading(true);
      setWorkspaceError("");

      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email, role, avatar_url")
          .order("full_name", { ascending: true });

        if (profilesError) throw profilesError;

        const directory = profilesData || [];
        const generalChannel = await ensureGeneralChannel(currentUserId);
        const jobChatChannels = await ensureJobChannels(currentUserId);
        const directMessageChannels = await fetchDirectMessageChannels(
          currentUserId,
          directory,
        );

        if (ignore) return;

        setProfiles(directory);
        setTeamChannels(generalChannel ? [generalChannel] : []);
        setJobChannels(jobChatChannels);
        setDmChannels(directMessageChannels);

        const availableChannels = [
          ...(generalChannel ? [generalChannel] : []),
          ...jobChatChannels,
          ...directMessageChannels,
        ];

        setSelectedChannelId((previous) => {
          if (previous && availableChannels.some((channel) => channel.id === previous)) {
            return previous;
          }

          return generalChannel?.id || availableChannels[0]?.id || null;
        });
      } catch (error) {
        if (ignore) return;

        const message = getChatErrorMessage(error);
        setWorkspaceError(message);
        toast.error(message);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadWorkspace();

    return () => {
      ignore = true;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!selectedChannelId || !currentUserId) {
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    let ignore = false;

    async function loadMessages() {
      setMessagesLoading(true);
      const profilesById = Object.fromEntries(profiles.map((entry) => [entry.id, entry]));

      try {
        const { data, error } = await supabase
          .from("messages")
          .select("id, channel_id, sender_id, content, attachment_url, created_at")
          .eq("channel_id", selectedChannelId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (ignore) return;

        setMessages(
          (data || []).map((message) =>
            mapMessageWithProfiles(message, profilesById, { email: currentUserEmail }),
          ),
        );
      } catch (error) {
        if (ignore) return;
        toast.error(getChatErrorMessage(error));
      } finally {
        if (!ignore) {
          setMessagesLoading(false);
        }
      }
    }

    loadMessages();

    return () => {
      ignore = true;
    };
  }, [selectedChannelId, currentUserId, currentUserEmail, profiles]);

  useEffect(() => {
    if (!selectedChannelId || !currentUserId) return undefined;

    const profilesById = Object.fromEntries(profiles.map((entry) => [entry.id, entry]));

    const subscription = supabase
      .channel(`messages:${selectedChannelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${selectedChannelId}`,
        },
        (payload) => {
          const nextMessage = mapMessageWithProfiles(payload.new, profilesById, {
            email: currentUserEmail,
          });

          setMessages((previous) => appendUniqueMessage(previous, nextMessage));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedChannelId, currentUserEmail, currentUserId, profiles]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedChannelId]);

  const handleSelectChannel = (channel, tab = "general") => {
    setActiveConversationTab(tab);
    setSelectedChannelId(channel.id);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const content = messageDraft.trim();
    if (!content || !selectedChannelId || !currentUserId || sending) return;

    setSending(true);
    const profilesById = Object.fromEntries(profiles.map((entry) => [entry.id, entry]));

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            channel_id: selectedChannelId,
            sender_id: currentUserId,
            content,
            seen_by: [currentUserId],
          },
        ])
        .select("id, channel_id, sender_id, content, attachment_url, created_at")
        .single();

      if (error) throw error;

      setMessageDraft("");
      setMessages((previous) =>
        appendUniqueMessage(
          previous,
          mapMessageWithProfiles(data, profilesById, { email: currentUserEmail }),
        ),
      );
    } catch (error) {
      toast.error(getChatErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const handleStartDirectMessage = async (person) => {
    if (!currentUserId || !person?.id) return;

    const existingChannel = dmChannels.find(
      (channel) => channel.directUserId === person.id,
    );

    if (existingChannel) {
      handleSelectChannel(existingChannel, "direct");
      return;
    }

    setStartingDmId(person.id);

    try {
      const { data: channelData, error: channelError } = await supabase.rpc(
        "create_direct_message_channel",
        {
          target_user_id: person.id,
        },
      );

      if (channelError) throw channelError;

      const channel = Array.isArray(channelData) ? channelData[0] : channelData;

      if (!channel?.id) {
        throw new Error("Unable to create a direct message channel.");
      }

      const nextChannel = {
        ...channel,
        directUserId: person.id,
        directUser: person,
        name: buildDirectMessageName(person),
      };

      setDmChannels((previous) => [nextChannel, ...previous]);
      handleSelectChannel(nextChannel, "direct");
      setPeopleSearch("");
      toast.success(`Conversation started with ${buildDirectMessageName(person)}`);
    } catch (error) {
      toast.error(getChatErrorMessage(error));
    } finally {
      setStartingDmId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center rounded-[28px] border border-[#20352f] bg-[#111b21]">
        <div className="flex flex-col items-center gap-3 text-[#8696a0]">
          <LoadingSpinner size="lg" />
          <p className="text-sm">Loading your conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#20352f] bg-[#111b21] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="grid h-[calc(100vh-8rem)] grid-cols-1 xl:grid-cols-[360px,1fr]">
        <aside className="flex min-h-0 flex-col border-r border-[#2a3942] bg-[#111b21]">
          <div className="border-b border-[#2a3942] bg-[#202c33] px-4 py-4">
            <div className="flex items-center gap-3">
              <Avatar
                name={getChatUserLabel(profile, currentUser?.email || "User")}
                src={profile?.avatar_url}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#e9edef]">Chats</p>
                <p className="truncate text-xs text-[#8696a0]">
                  Signed in as {getChatUserLabel(profile, currentUser?.email || "User")}
                </p>
              </div>
              <span className="rounded-full bg-[#0f3b33] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#25d366]">
                Live
              </span>
            </div>

            <div className="relative mt-4">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]"
              />
              <input
                value={peopleSearch}
                onChange={(event) => setPeopleSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-full border border-[#2a3942] bg-[#111b21] py-2.5 pl-10 pr-4 text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#25d366] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {workspaceError && (
              <div className="border-b border-[#472322] bg-[#2b1a19] px-4 py-3 text-sm text-[#ffb4ab]">
                {workspaceError}
              </div>
            )}

            <div className="border-b border-[#2a3942] px-3 py-3">
              <div className="grid grid-cols-2 gap-2">
                {conversationTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveConversationTab(tab)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                      activeConversationTab === tab
                        ? "bg-[#25d366] text-[#0b141a]"
                        : "bg-[#1b2730] text-[#8696a0] hover:bg-[#22313a] hover:text-[#e9edef]"
                    }`}
                  >
                    {tabLabels[tab]}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-2 py-2">
              {activeConversationTab === "general" && (
                <>
                  <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#25d366]">
                    General
                  </p>
                  <div className="space-y-1">
                    {filteredTeamChannels.length ? (
                      filteredTeamChannels.map((channel) => (
                        <ChannelListButton
                          key={channel.id}
                          channel={channel}
                          selected={channel.id === selectedChannelId}
                          onClick={() => handleSelectChannel(channel, "general")}
                        />
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-[#2a3942] px-4 py-5 text-sm text-[#8696a0]">
                        No general chats match your search.
                      </p>
                    )}
                  </div>
                </>
              )}

              {activeConversationTab === "jobs" && (
                <>
                  <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#25d366]">
                    Job Chats
                  </p>
                  <div className="space-y-1">
                    {filteredJobChannels.length ? (
                      filteredJobChannels.map((channel) => (
                        <ChannelListButton
                          key={channel.id}
                          channel={channel}
                          selected={channel.id === selectedChannelId}
                          onClick={() => handleSelectChannel(channel, "jobs")}
                        />
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-[#2a3942] px-4 py-5 text-sm text-[#8696a0]">
                        No job chats match your search.
                      </p>
                    )}
                  </div>
                </>
              )}

              {activeConversationTab === "direct" && (
                <>
                  <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#25d366]">
                    Direct Messages
                  </p>
                  <div className="space-y-1">
                    {filteredDmChannels.length ? (
                      filteredDmChannels.map((channel) => (
                        <ChannelListButton
                          key={channel.id}
                          channel={channel}
                          selected={channel.id === selectedChannelId}
                          onClick={() => handleSelectChannel(channel, "direct")}
                        />
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-[#2a3942] px-4 py-5 text-sm text-[#8696a0]">
                        No direct messages match your search.
                      </p>
                    )}
                  </div>
                </>
              )}

              {activeConversationTab === "people" && (
                <>
                  <div className="mb-3 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#8696a0]">
                    <UserPlus size={13} />
                    Start new chat
                  </div>
                  <div className="space-y-1">
                    {visiblePeople.length ? (
                      visiblePeople.map((person) => (
                        <button
                          key={person.id}
                          onClick={() => handleStartDirectMessage(person)}
                          disabled={startingDmId === person.id}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-[#1f2c34] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Avatar
                            name={getChatUserLabel(person)}
                            src={person.avatar_url}
                            size="md"
                          />
                          <div className="min-w-0 flex-1 border-b border-[#22313a] pb-1">
                            <p className="truncate text-sm font-medium text-[#e9edef]">
                              {getChatUserLabel(person)}
                            </p>
                            <p className="mt-1 truncate text-xs text-[#8696a0]">
                              {person.role || "Team member"}
                            </p>
                          </div>
                          {startingDmId === person.id ? (
                            <LoadingSpinner size="sm" className="text-[#25d366]" />
                          ) : (
                            <span className="rounded-full bg-[#0f3b33] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#25d366]">
                              New
                            </span>
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-[#2a3942] px-4 py-5 text-sm text-[#8696a0]">
                        No teammates match your search yet.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden bg-[#0b141a]">
          {selectedChannel ? (
            <>
              <div className="border-b border-[#2a3942] bg-[#202c33] px-4 py-3 sm:px-6">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={selectedChannelAvatarName}
                    src={selectedChannelAvatarSrc}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-medium text-[#e9edef]">
                      {selectedChannel.name}
                    </h2>
                    <p className="truncate text-xs text-[#8696a0]">
                      {selectedChannelDescription}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#111b21] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#25d366]">
                    {selectedChannelTag}
                  </span>
                </div>
              </div>

              <div
                className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
                style={{
                  backgroundColor: "#efeae2",
                  backgroundImage:
                    "radial-gradient(circle at 20px 20px, rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 2px, transparent 2px), radial-gradient(circle at 80px 60px, rgba(17,27,33,0.04) 0, rgba(17,27,33,0.04) 1px, transparent 1px), radial-gradient(circle at 140px 120px, rgba(255,255,255,0.35) 0, rgba(255,255,255,0.35) 2px, transparent 2px)",
                  backgroundSize: "160px 160px",
                }}
              >
                {messagesLoading ? (
                  <div className="flex h-full items-center justify-center text-[#54656f]">
                    <div className="flex flex-col items-center gap-3 rounded-3xl bg-white/75 px-8 py-8 shadow-[0_12px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                      <LoadingSpinner size="lg" />
                      <p className="text-sm">Loading messages...</p>
                    </div>
                  </div>
                ) : messages.length ? (
                  <div className="space-y-2">
                    {messages.map((message) => {
                      const isOwnMessage = message.sender_id === currentUserId;

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[min(40rem,88%)] rounded-2xl px-4 py-2.5 shadow-[0_2px_10px_rgba(17,27,33,0.08)] ${
                              isOwnMessage
                                ? "rounded-br-md bg-[#d9fdd3] text-[#111b21]"
                                : "rounded-bl-md bg-white text-[#111b21]"
                            }`}
                          >
                            {!isOwnMessage && (
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#667781]">
                                {message.senderName}
                              </p>
                            )}
                            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                              {message.content}
                            </p>
                            <div className="mt-1 flex justify-end text-[11px] text-[#667781]">
                              {formatMessageTimestamp(message.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={endRef} />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="max-w-sm rounded-[28px] bg-white/85 px-8 py-10 text-center text-[#54656f] shadow-[0_12px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                      <MessageSquare className="mx-auto mb-3 text-[#25d366]" size={30} />
                      <p className="text-base font-semibold text-[#111b21]">No messages yet</p>
                      <p className="mt-2 text-sm leading-6">
                        Start the conversation in {selectedChannel.name}. New messages will
                        appear here live for everyone in this chat.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <form
                onSubmit={handleSendMessage}
                className="border-t border-[#2a3942] bg-[#202c33] px-3 py-3 sm:px-4"
              >
                <div className="flex items-center gap-3 rounded-[26px] bg-[#2a3942] px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.16)]">
                  <button
                    type="button"
                    disabled
                    title="Attachments are the next chat upgrade"
                    className="flex h-11 w-11 items-center justify-center rounded-full text-[#8696a0] opacity-60"
                  >
                    <Paperclip size={18} />
                  </button>
                  <input
                    placeholder={`Message ${selectedChannel.name}`}
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    className="h-11 flex-1 bg-transparent text-sm text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!messageDraft.trim() || sending}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25d366] text-[#0b141a] transition hover:bg-[#47dd7a] disabled:cursor-not-allowed disabled:bg-[#1f5f45] disabled:text-[#9fb7a8]"
                  >
                    {sending ? (
                      <LoadingSpinner size="sm" className="text-[#0b141a]" />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex h-full items-center justify-center px-6">
              <div className="max-w-md rounded-[30px] bg-[#202c33] px-8 py-10 text-center">
                <MessageSquare className="mx-auto mb-4 text-[#25d366]" size={32} />
                <p className="text-lg font-semibold text-[#e9edef]">Your chat workspace is ready</p>
                <p className="mt-2 text-sm leading-6 text-[#8696a0]">
                  Choose a conversation from the left side or start a new direct message to
                  begin chatting.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
