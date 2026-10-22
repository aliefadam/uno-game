import { RoomApp } from "@/components/room/RoomApp";

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalized = decodeURIComponent(code).toUpperCase();
  return <RoomApp code={normalized} />;
}
