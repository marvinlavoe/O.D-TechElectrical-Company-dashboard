import { useEffect, useRef, useState } from "react";
import {
  Briefcase,
  Hash,
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
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
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

  const missingJobs = (jobs || []).filter(
    (job) => !channelMap.has(String(job.id)),
  );

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
        name: channel.name || buildJobChannelName(job),
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
    (profiles || []).map((profile) => [profile.id, profile]),
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

  return error?.message || "Unable to load chat right now.";
}

function ChannelListButton({ channel, selected, onClick, icon, meta }) {
  const Icon = icon;

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
        selected
          ? "border-primary bg-primary/10 text-text-primary"
          : "border-transparent bg-surface text-text-secondary hover:border-surface-border hover:bg-surface-hover"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${
            selected ? "bg-primary/15 text-primary" : "bg-surface-card text-text-muted"
          }`}
        >
          <Icon size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{channel.name}</p>
          {meta && <p className="mt-0.5 truncate text-xs text-text-muted">{meta}</p>}
        </div>
      </div>
    </button>
  );
}

export default function ChatPage() {
  const { session, profile } = useAuthStore();
  const currentUser = session?.user || null;
  const currentUserId = currentUser?.id || null;

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

  const endRef = useRef(null);

  const profilesById = Object.fromEntries(
    profiles.map((entry) => [entry.id, entry]),
  );
  const allChannels = [...teamChannels, ...jobChannels, ...dmChannels];
  const selectedChannel =
    allChannels.find((channel) => channel.id === selectedChannelId) || null;
  const visiblePeople = profiles
    .filter((entry) => entry.id !== currentUserId)
    .filter((entry) => {
      const query = peopleSearch.trim().toLowerCase();
      if (!query) return true;

      return (
        getChatUserLabel(entry).toLowerCase().includes(query) ||
        (entry.role || "").toLowerCase().includes(query)
      );
    })
    .slice(0, 8);

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
      return;
    }

    let ignore = false;

    async function loadMessages() {
      setMessagesLoading(true);

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
            mapMessageWithProfiles(message, profilesById, currentUser),
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
  }, [selectedChannelId, currentUserId, currentUser, profilesById]);

  useEffect(() => {
    if (!selectedChannelId || !currentUser) return undefined;

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
          const nextMessage = mapMessageWithProfiles(
            payload.new,
            profilesById,
            currentUser,
          );

          setMessages((previous) => appendUniqueMessage(previous, nextMessage));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedChannelId, currentUser, profilesById]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedChannelId]);

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const content = messageDraft.trim();
    if (!content || !selectedChannelId || !currentUserId || sending) return;

    setSending(true);

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
          mapMessageWithProfiles(data, profilesById, currentUser),
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
      setSelectedChannelId(existingChannel.id);
      return;
    }

    setStartingDmId(person.id);

    try {
      const { data: channel, error: channelError } = await supabase
        .from("channels")
        .insert([{ type: "dm", created_by: currentUserId }])
        .select("id, name, type, created_at")
        .single();

      if (channelError) throw channelError;

      const { error: membersError } = await supabase
        .from("channel_members")
        .upsert(
          [
            { channel_id: channel.id, user_id: currentUserId },
            { channel_id: channel.id, user_id: person.id },
          ],
          { onConflict: "channel_id,user_id" },
        );

      if (membersError) throw membersError;

      const nextChannel = {
        ...channel,
        directUserId: person.id,
        directUser: person,
        name: buildDirectMessageName(person),
      };

      setDmChannels((previous) => [nextChannel, ...previous]);
      setSelectedChannelId(channel.id);
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
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center rounded-2xl border border-surface-border bg-surface-card">
        <div className="flex flex-col items-center gap-3 text-text-muted">
          <LoadingSpinner size="lg" />
          <p className="text-sm">Loading your conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-4 xl:grid-cols-[320px,1fr]">
      <aside className="flex min-h-0 flex-col rounded-2xl border border-surface-border bg-surface-card">
        <div className="border-b border-surface-border px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text-primary">Workspace Chat</p>
              <p className="mt-1 text-xs text-text-muted">
                Signed in as {getChatUserLabel(profile, currentUser?.email || "User")}
              </p>
            </div>
            <Badge label="Live" color="success" />
          </div>

          <div className="relative mt-4">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              value={peopleSearch}
              onChange={(event) => setPeopleSearch(event.target.value)}
              placeholder="Start a direct message..."
              className="w-full rounded-lg border border-surface-border bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          {workspaceError && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {workspaceError}
            </div>
          )}

          <section className="space-y-2">
            <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              <Hash size={13} />
              Team Space
            </div>
            {teamChannels.map((channel) => (
              <ChannelListButton
                key={channel.id}
                channel={channel}
                selected={channel.id === selectedChannelId}
                onClick={() => setSelectedChannelId(channel.id)}
                icon={Hash}
                meta="Company-wide coordination"
              />
            ))}
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              <Briefcase size={13} />
              Job Chats
            </div>
            <div className="space-y-2">
              {jobChannels.length ? (
                jobChannels.map((channel) => (
                  <ChannelListButton
                    key={channel.id}
                    channel={channel}
                    selected={channel.id === selectedChannelId}
                    onClick={() => setSelectedChannelId(channel.id)}
                    icon={Briefcase}
                    meta={`${channel.jobTitle} • ${channel.jobStatus}`}
                  />
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-surface-border px-3 py-4 text-sm text-text-muted">
                  Job chats will appear here once jobs exist.
                </p>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              <MessageSquare size={13} />
              Direct Messages
            </div>
            <div className="space-y-2">
              {dmChannels.length ? (
                dmChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannelId(channel.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      channel.id === selectedChannelId
                        ? "border-primary bg-primary/10"
                        : "border-transparent bg-surface hover:border-surface-border hover:bg-surface-hover"
                    }`}
                  >
                    <Avatar
                      name={buildDirectMessageName(channel.directUser)}
                      src={channel.directUser?.avatar_url}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {channel.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-text-muted">
                        {channel.directUser?.role || "Direct message"}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-surface-border px-3 py-4 text-sm text-text-muted">
                  No direct messages yet. Start one below.
                </p>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              <UserPlus size={13} />
              People
            </div>
            <div className="space-y-2">
              {visiblePeople.length ? (
                visiblePeople.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => handleStartDirectMessage(person)}
                    disabled={startingDmId === person.id}
                    className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-surface px-3 py-2.5 text-left transition-colors hover:border-surface-border hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Avatar
                      name={getChatUserLabel(person)}
                      src={person.avatar_url}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {getChatUserLabel(person)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-text-muted">
                        {person.role || "Team member"}
                      </p>
                    </div>
                    {startingDmId === person.id && (
                      <LoadingSpinner size="sm" className="text-primary" />
                    )}
                  </button>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-surface-border px-3 py-4 text-sm text-text-muted">
                  No matching teammates found.
                </p>
              )}
            </div>
          </section>
        </div>
      </aside>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface-card">
        {selectedChannel ? (
          <>
            <div className="border-b border-surface-border px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    {selectedChannel.type === "job" ? "# " : ""}
                    {selectedChannel.name}
                  </h2>
                  <p className="mt-1 text-sm text-text-muted">
                    {selectedChannel.type === "channel" &&
                      "Company-wide updates and coordination"}
                    {selectedChannel.type === "job" &&
                      `${selectedChannel.jobTitle} • ${
                        selectedChannel.customerName || "No customer linked"
                      }`}
                    {selectedChannel.type === "dm" &&
                      `Private conversation with ${selectedChannel.name}`}
                  </p>
                </div>
                <Badge
                  label={
                    selectedChannel.type === "job"
                      ? selectedChannel.jobStatus || "Job"
                      : selectedChannel.type === "dm"
                        ? "Direct"
                        : "Channel"
                  }
                  color={selectedChannel.type === "job" ? "warning" : "info"}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-surface/40 px-6 py-5">
              {messagesLoading ? (
                <div className="flex h-full items-center justify-center text-text-muted">
                  <div className="flex flex-col items-center gap-3">
                    <LoadingSpinner size="lg" />
                    <p className="text-sm">Loading messages...</p>
                  </div>
                </div>
              ) : messages.length ? (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isOwnMessage = message.sender_id === currentUserId;

                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          isOwnMessage ? "justify-end" : "justify-start"
                        }`}
                      >
                        {!isOwnMessage && (
                          <Avatar
                            name={message.senderName}
                            src={message.senderAvatar}
                            size="sm"
                          />
                        )}

                        <div className="max-w-[min(40rem,85%)]">
                          <div
                            className={`mb-1 flex items-baseline gap-2 ${
                              isOwnMessage ? "justify-end" : "justify-start"
                            }`}
                          >
                            <span className="text-sm font-semibold text-text-primary">
                              {isOwnMessage ? "You" : message.senderName}
                            </span>
                            <span className="text-xs text-text-muted">
                              {formatMessageTimestamp(message.created_at)}
                            </span>
                          </div>
                          <div
                            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                              isOwnMessage
                                ? "bg-primary text-white"
                                : "border border-surface-border bg-surface-card text-text-secondary"
                            }`}
                          >
                            {message.content}
                          </div>
                        </div>

                        {isOwnMessage && (
                          <Avatar
                            name={getChatUserLabel(profile, currentUser?.email || "You")}
                            src={profile?.avatar_url}
                            size="sm"
                          />
                        )}
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-sm text-center">
                    <MessageSquare className="mx-auto mb-3 text-text-muted" size={28} />
                    <p className="text-base font-semibold text-text-primary">
                      No messages yet
                    </p>
                    <p className="mt-2 text-sm text-text-muted">
                      Start the conversation in {selectedChannel.name} and the rest of the team
                      will see new messages in real time.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={handleSendMessage}
              className="border-t border-surface-border bg-surface-card px-4 py-4"
            >
              <div className="flex items-end gap-3">
                <button
                  type="button"
                  disabled
                  title="Attachments are the next chat upgrade"
                  className="rounded-xl border border-surface-border bg-surface p-3 text-text-muted opacity-60"
                >
                  <Paperclip size={18} />
                </button>
                <div className="flex-1">
                  <Input
                    placeholder={`Message ${selectedChannel.name}`}
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    className="w-full"
                  />
                </div>
                <Button type="submit" loading={sending} disabled={!messageDraft.trim()}>
                  <Send size={16} />
                  Send
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-md text-center">
              <MessageSquare className="mx-auto mb-4 text-text-muted" size={30} />
              <p className="text-lg font-semibold text-text-primary">
                Your chat workspace is ready
              </p>
              <p className="mt-2 text-sm text-text-muted">
                Choose a team channel, a job chat, or start a direct message from the
                left panel.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
