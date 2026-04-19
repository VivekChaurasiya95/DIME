export const getUserDisplayName = (
  name?: string | null,
  email?: string | null,
) => {
  if (name && name.trim()) {
    return name.trim();
  }

  if (email && email.trim()) {
    return email.trim().split("@")[0];
  }

  return "User";
};

export const getUserInitials = (value?: string | null) => {
  if (!value) {
    return "U";
  }

  const words = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (words.length === 0) {
    return "U";
  }

  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
};

export const getUserAvatarUrl = (
  image?: string | null,
  email?: string | null,
  name?: string | null,
) => {
  if (image && image.trim()) {
    return image;
  }

  const seed = (email ?? name ?? "user").trim().toLowerCase();
  return `https://avatar.vercel.sh/${encodeURIComponent(seed)}?size=128`;
};
