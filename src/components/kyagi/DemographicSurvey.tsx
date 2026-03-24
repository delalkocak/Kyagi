import React, { useState } from "react";
import { colors } from "./data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const GENDER_OPTIONS = ["female", "male", "non-binary", "prefer not to say"];
const LOCATION_TYPE_OPTIONS = ["urban", "suburban", "rural"];
const REFERRAL_OPTIONS = ["friend invite", "social media", "app store", "word of mouth", "other"];
const SOCIAL_MEDIA_OPTIONS = ["rarely", "1-2 hrs/day", "3-4 hrs/day", "5+ hrs/day"];

interface DemographicSurveyProps {
  onComplete: () => void;
  isModal?: boolean;
}

export function DemographicSurvey({ onComplete, isModal = false }: DemographicSurveyProps) {
  const { user } = useAuth();
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [locationType, setLocationType] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [socialMediaUsage, setSocialMediaUsage] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = age.trim() !== "" || gender !== "" || city.trim() !== "";

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = {};
      if (age.trim()) updates.age = parseInt(age.trim(), 10) || null;
      if (gender) updates.gender = gender;
      if (city.trim()) updates.city = city.trim();
      if (locationType) updates.location_type = locationType;
      if (referralSource) updates.referral_source = referralSource;
      if (socialMediaUsage) updates.social_media_usage = socialMediaUsage;

      if (Object.keys(updates).length > 0) {
        await supabase
          .from("profiles")
          .update(updates as any)
          .eq("user_id", user.id);
      }
      onComplete();
    } catch {
      setSaving(false);
    }
  };

  const chipStyle = (selected: boolean): React.CSSProperties => ({
    background: selected ? "#7A1F2E" : "#F4EDD8",
    color: selected ? "#FEFCF6" : colors.text,
    border: "none",
    borderRadius: 20,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 150ms",
  });

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: colors.text,
    marginBottom: 6,
    display: "block",
  };

  return (
    <div
      className={isModal ? "fixed inset-0 z-[101] flex items-end justify-center" : "flex-1 flex flex-col"}
      style={isModal ? { background: "rgba(0,0,0,0.4)" } : {}}
    >
      <div
        className={isModal ? "w-full overflow-y-auto" : "flex-1 overflow-y-auto"}
        style={{
          background: colors.bg,
          ...(isModal ? { maxHeight: "85dvh", borderRadius: "20px 20px 0 0", paddingBottom: "env(safe-area-inset-bottom, 20px)" } : {}),
        }}
      >
        <div style={{ padding: "24px 20px 20px" }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 20, color: colors.text, marginBottom: 4 }}>
            tell us a bit about you
          </div>
          <div className="font-sans" style={{ fontSize: 13, color: colors.textMuted, marginBottom: 20, lineHeight: 1.5 }}>
            helps us make kyagi better for you. all optional.
          </div>

          {/* Age */}
          <label className="font-sans" style={labelStyle}>age</label>
          <input
            type="number"
            inputMode="numeric"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="e.g. 27"
            maxLength={3}
            className="font-sans w-full mb-4"
            style={{
              background: "#FEFCF6",
              border: "1px solid rgba(122,31,46,0.12)",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 14,
              color: colors.text,
              outline: "none",
            }}
          />

          {/* Gender */}
          <label className="font-sans" style={labelStyle}>gender</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {GENDER_OPTIONS.map((g) => (
              <button key={g} onClick={() => setGender(gender === g ? "" : g)} className="font-sans" style={chipStyle(gender === g)}>
                {g}
              </button>
            ))}
          </div>

          {/* City */}
          <label className="font-sans" style={labelStyle}>city</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. brooklyn"
            maxLength={100}
            className="font-sans w-full mb-4"
            style={{
              background: "#FEFCF6",
              border: "1px solid rgba(122,31,46,0.12)",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 14,
              color: colors.text,
              outline: "none",
            }}
          />

          {/* Location type */}
          <label className="font-sans" style={labelStyle}>location type</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {LOCATION_TYPE_OPTIONS.map((l) => (
              <button key={l} onClick={() => setLocationType(locationType === l ? "" : l)} className="font-sans" style={chipStyle(locationType === l)}>
                {l}
              </button>
            ))}
          </div>

          {/* Referral source */}
          <label className="font-sans" style={labelStyle}>how did you hear about kyagi?</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {REFERRAL_OPTIONS.map((r) => (
              <button key={r} onClick={() => setReferralSource(referralSource === r ? "" : r)} className="font-sans" style={chipStyle(referralSource === r)}>
                {r}
              </button>
            ))}
          </div>

          {/* Social media usage */}
          <label className="font-sans" style={labelStyle}>daily social media usage</label>
          <div className="flex flex-wrap gap-2 mb-6">
            {SOCIAL_MEDIA_OPTIONS.map((s) => (
              <button key={s} onClick={() => setSocialMediaUsage(socialMediaUsage === s ? "" : s)} className="font-sans" style={chipStyle(socialMediaUsage === s)}>
                {s}
              </button>
            ))}
          </div>

          {/* Submit */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full border-0 cursor-pointer font-sans font-medium"
            style={{
              background: "#7A1F2E",
              color: "#FEFCF6",
              fontSize: 15,
              fontWeight: 500,
              borderRadius: 14,
              padding: 14,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "saving..." : "continue"}
          </button>

          {/* Skip */}
          <button
            onClick={onComplete}
            className="w-full bg-transparent border-0 cursor-pointer font-sans mt-2 pb-2"
            style={{ fontSize: 12, color: colors.blueGray }}
          >
            skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
