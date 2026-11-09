"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/Controls";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { getStoredNickname, setStoredNickname } from "@/lib/session";

export function JoinRoomModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [nickname, setNickname] = useState(getStoredNickname());
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);

  const submit = () => {
    const trimmedName = nickname.trim();
    if (trimmedName.length < 2) {
      toast.show("Nama minimal 2 karakter ya.", "warning");
      return;
    }
    const normalized = code.trim();
    if (!/^\d{4}$/.test(normalized)) {
      toast.show("Kode room harus terdiri dari 4 angka.", "warning");
      return;
    }
    setChecking(true);
    setStoredNickname(trimmedName);
    router.push(`/room/${normalized}`);
  };

  return (
    <Modal open={open} onClose={onClose} title="Gabung Room" subtitle="Masukkan kode undangan dari temanmu.">
      <div className="space-y-4">
        <TextField label="Nickname Kamu" icon="user" placeholder="Contoh: Dina" value={nickname} maxLength={18} onChange={(e) => setNickname(e.target.value)} />
        <TextField
          label="Kode Room"
          icon="key"
          placeholder="1234"
          value={code}
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <Button fullWidth size="lg" loading={checking} icon={<Icon name="door-open" size={16} />} onClick={submit}>
          Gabung Sekarang
        </Button>
      </div>
    </Modal>
  );
}
