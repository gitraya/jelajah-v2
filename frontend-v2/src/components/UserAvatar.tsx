import { useState, type CSSProperties } from "react";

import { colorFor, memberInitials } from "@/lib/adapters";
import { cn } from "@/lib/utils";

interface Props {
  /** A user, or a trip member (whose `user` holds the profile). */
  person: any;
  className?: string;
  style?: CSSProperties;
}

/** Uploaded avatar when there is one, otherwise the colored-initials tile. */
export function UserAvatar({ person, className, style }: Props) {
  const user = person?.user || person || {};
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = user.avatar && user.avatar !== failedSrc ? user.avatar : null;

  return (
    <div
      className={cn(
        "flex items-center justify-center text-white shrink-0 overflow-hidden",
        className
      )}
      style={{
        background: src ? undefined : colorFor(user.email || String(person?.id)),
        fontWeight: 700,
        ...style,
      }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        memberInitials(person || {})
      )}
    </div>
  );
}
