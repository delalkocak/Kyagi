import React, { useMemo } from "react";
import { colors } from "./data";
import { avatarColor } from "./FeedScreen";
import { useMyCircle } from "@/hooks/use-circle";

interface CircleMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

// Renders text with @mentions as inline avatar chips
export function MentionText({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const { data: circleData } = useMyCircle();
  const members: CircleMember[] = useMemo(
    () => [...(circleData?.active || []), ...(circleData?.inactive || [])],
    [circleData]
  );

  const membersByLongestName = useMemo(
    () => [...members].sort((a, b) => b.display_name.length - a.display_name.length),
    [members]
  );

  const segments = useMemo(() => {
    const parsed: Array<{ type: "text"; value: string } | { type: "mention"; value: string; member?: CircleMember }> = [];
    let i = 0;

    while (i < text.length) {
      if (text[i] !== "@") {
        const nextAt = text.indexOf("@", i);
        const end = nextAt === -1 ? text.length : nextAt;
        parsed.push({ type: "text", value: text.slice(i, end) });
        i = end;
        continue;
      }

      const rest = text.slice(i + 1);
      const matchedMember = membersByLongestName.find((member) => {
        if (!rest.toLowerCase().startsWith(member.display_name.toLowerCase())) return false;
        const boundary = rest[member.display_name.length];
        return boundary === undefined || /[\s.,!?;:)\]}]/.test(boundary);
      });

      if (matchedMember) {
        const rawMention = text.slice(i, i + 1 + matchedMember.display_name.length);
        parsed.push({ type: "mention", value: rawMention, member: matchedMember });
        i += rawMention.length;
        continue;
      }

      const fallback = rest.match(/^([^\s.,!?;:)\]}]+)/);
      if (fallback) {
        const rawMention = `@${fallback[1]}`;
        parsed.push({ type: "text", value: rawMention });
        i += rawMention.length;
        continue;
      }

      parsed.push({ type: "text", value: "@" });
      i += 1;
    }

    return parsed;
  }, [text, membersByLongestName]);

  return (
    <span className={className} style={style}>
      {segments.map((segment, i) => {
        if (segment.type === "mention") {
          if (segment.member) {
            return (
              <span key={i} className="font-sans text-[13px] font-semibold" style={{ color: colors.electricIndigo }}>
                @{segment.member.display_name}
              </span>
            );
          }

          return (
            <span key={i} style={style}>
              {segment.value}
            </span>
          );
        }

        return (
          <span key={i} style={style}>
            {segment.value}
          </span>
        );
      })}
    </span>
  );
}

