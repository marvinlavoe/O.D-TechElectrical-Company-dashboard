export function getChatUserLabel(profile = null, fallback = "Unknown user") {
  return profile?.full_name || profile?.email || fallback;
}

export function buildJobChannelName(job = {}) {
  const customerName = job.customers?.name ? ` - ${job.customers.name}` : "";
  return `Job #${job.id}${customerName}`;
}

export function buildDirectMessageName(profile = null) {
  return getChatUserLabel(profile, "Direct message");
}

export function formatMessageTimestamp(value) {
  if (!value) return "";

  const date = new Date(value);
  const now = new Date();
  const isSameDay = date.toDateString() === now.toDateString();

  if (isSameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function mapMessageWithProfiles(message, profilesById = {}, currentUser = null) {
  const senderProfile = profilesById[message.sender_id];

  return {
    ...message,
    senderName: getChatUserLabel(senderProfile, currentUser?.email || "Unknown user"),
    senderAvatar: senderProfile?.avatar_url || null,
  };
}

export function appendUniqueMessage(messages = [], nextMessage) {
  if (messages.some((message) => message.id === nextMessage.id)) {
    return messages;
  }

  return [...messages, nextMessage];
}
