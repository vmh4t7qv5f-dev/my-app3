"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";

export function CreateTeamForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setHasFailed(false);
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("team_create_failed");
      const { id }: { id: string } = await response.json();
      router.push(`/teams/${id}`);
    } catch {
      setHasFailed(true);
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="team-name" className="font-semibold">
        새 팀 만들기
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="team-name"
          required
          maxLength={40}
          value={name}
          disabled={isSaving}
          onChange={(event) => setName(event.target.value)}
          placeholder="팀 이름"
          className="h-11 flex-1 rounded-[10px] border border-input bg-white/95 px-3 text-sm"
        />
        <Button type="submit" size="lg" disabled={isSaving || !name.trim()}>
          {isSaving ? "만드는 중..." : "팀 만들기"}
        </Button>
      </div>
      {hasFailed && (
        <p role="alert" className="text-sm text-destructive">
          팀을 만들지 못했습니다. 팀 이름을 확인하고 다시 시도해 주세요.
        </p>
      )}
    </form>
  );
}
