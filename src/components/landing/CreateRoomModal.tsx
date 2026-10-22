"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { TextField, NumberStepper, Toggle, SegmentedControl } from "@/components/ui/Controls";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { RoomChannel, DEFAULT_SETTINGS } from "@/lib/room-channel";
import { getSessionId, getStoredNickname, setStoredNickname } from "@/lib/session";
import type { HouseRules, RoomSettings } from "@/lib/types";

const HOUSE_RULE_INFO: { key: keyof HouseRules; label: string; desc: string }[] = [
  { key: "crossStacking", label: "Cross Stacking", desc: "Tumpuk kartu +2 atau +4, termasuk silang." },
  { key: "jumpIn", label: "Jump-In", desc: "Punya kartu identik? Main di luar giliran!" },
  { key: "drawUntilPlayable", label: "Draw Until Playable", desc: "Ambil kartu terus sampai dapat yang bisa dimainkan." },
];

export function CreateRoomModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [nickname, setNickname] = useState(getStoredNickname());
  const [roomName, setRoomName] = useState("");
  const [settings, setSettings] = useState<RoomSettings>(DEFAULT_SETTINGS);
  const [showRules, setShowRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const updateRule = (key: keyof HouseRules, value: boolean) => {
    setSettings((s) => {
      const houseRules = { ...s.houseRules, [key]: value };
      if (key === "crossStacking") {
        houseRules.stackingDrawTwo = value;
        houseRules.stackingDrawFour = value;
      }
      return { ...s, houseRules };
    });
  };

  const submit = () => {
    const trimmed = nickname.trim();
    if (trimmed.length < 2) {
      toast.show("Nama minimal 2 karakter ya.", "warning");
      return;
    }
    if (trimmed.length > 18) {
      toast.show("Nama maksimal 18 karakter.", "warning");
      return;
    }
    setSubmitting(true);
    setStoredNickname(trimmed);
    const selfId = getSessionId();
    const code = RoomChannel.createRoom(trimmed, roomName, settings, selfId);
    toast.show("Room berhasil dibuat!", "success");
    router.push(`/room/${code}`);
  };

  return (
    <Modal open={open} onClose={onClose} title="Buat Room Baru" subtitle="Atur room sesuai selera tongkronganmu." maxWidth="max-w-lg">
      <div className="space-y-4">
        <TextField
          label="Nickname Kamu"
          icon="user"
          placeholder="Contoh: Raka"
          value={nickname}
          maxLength={18}
          onChange={(e) => setNickname(e.target.value)}
        />
        <TextField
          label="Nama Room (opsional)"
          icon="comment-alt"
          placeholder="Tongkrongan Malam Minggu"
          value={roomName}
          maxLength={30}
          onChange={(e) => setRoomName(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <NumberStepper
            label="Kapasitas Pemain"
            value={settings.maxPlayers}
            min={2}
            max={10}
            onChange={(v) => setSettings((s) => ({ ...s, maxPlayers: v }))}
          />
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">Durasi Giliran</span>
            <SegmentedControl
              value={String(settings.turnDurationSeconds)}
              onChange={(v) => setSettings((s) => ({ ...s, turnDurationSeconds: Number(v) as RoomSettings["turnDurationSeconds"] }))}
              options={[
                { value: "15", label: "15s" },
                { value: "30", label: "30s" },
                { value: "45", label: "45s" },
                { value: "60", label: "60s" },
              ]}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Icon name="comment-dots" size={16} className="text-white/60" />
            <span className="text-sm font-semibold text-white">Room Chat</span>
          </div>
          <Toggle checked={settings.chatEnabled} onChange={(v) => setSettings((s) => ({ ...s, chatEnabled: v }))} />
        </div>

        <button
          type="button"
          onClick={() => setShowRules((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          <span className="flex items-center gap-2">
            <Icon name="settings-sliders" size={15} /> House Rules Tongkrongan
          </span>
          <Icon name={showRules ? "angle-small-up" : "angle-small-down"} size={16} />
        </button>

        {showRules && (
          <div className="grid gap-2 sm:grid-cols-2">
            {HOUSE_RULE_INFO.map((rule) => (
                <div key={rule.key} className="flex items-start justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">{rule.label}</p>
                    <p className="mt-0.5 text-[0.68rem] leading-snug text-white/45">{rule.desc}</p>
                  </div>
                  <Toggle checked={settings.houseRules[rule.key]} onChange={(v) => updateRule(rule.key, v)} />
                </div>
            ))}
          </div>
        )}

        <Button fullWidth size="lg" loading={submitting} icon={<Icon name="plus" size={16} />} onClick={submit}>
          Buat Room
        </Button>
      </div>
    </Modal>
  );
}
